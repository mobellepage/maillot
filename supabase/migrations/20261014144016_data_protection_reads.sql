-- Protect Maillot's data against bulk copying (phase 1). The app reads the
-- public data (catalogue, market values, value history, comparables, the
-- order book, the kit library) through functions that return one page or one
-- shirt at a time and are throttled per visitor (IP) or member: normal
-- browsing never notices, a scraper hits the limit within minutes. Phase 2
-- (data_protection_close) then closes the direct table reads.

-- Who is asking: the member, else the visitor's IP (Cloudflare / proxy header).
create or replace function private.client_key()
returns text language sql stable set search_path = '' as $$
  select coalesce(
    (select auth.uid())::text,
    nullif(trim(split_part(coalesce(
      nullif(current_setting('request.headers', true), '')::json ->> 'cf-connecting-ip',
      nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for',
      ''), ',', 1)), ''),
    'anon')
$$;

-- p_anon / p_member: requests per hour for visitors / signed-in members.
create or replace function private.throttle(p_bucket text, p_anon int, p_member int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.hit('read:' || p_bucket || ':' || private.client_key(),
                      case when (select auth.uid()) is null then p_anon else p_member end, interval '1 hour');
end $$;

create or replace function public.public_catalog()
returns setof public.catalog_shirts language plpgsql security definer set search_path = '' as $$
begin
  perform private.throttle('catalog', 120, 600);
  return query select * from public.catalog_shirts where active order by added_at desc limit 5000;
end $$;

create or replace function public.public_valuations()
returns setof public.shirt_valuations language plpgsql security definer set search_path = '' as $$
begin
  perform private.throttle('valuations', 120, 600);
  return query select * from public.shirt_valuations limit 5000;
end $$;

-- The comparables behind one shirt's value (newest 12, last two weeks).
create or replace function public.shirt_comps(p_shirt text)
returns setof public.market_comps language plpgsql security definer set search_path = '' as $$
begin
  perform private.throttle('comps', 200, 1000);
  return query select * from public.market_comps
                where catalog_id = p_shirt and seen_at >= now() - interval '14 days'
                order by match, seen_at desc limit 12;
end $$;

-- Daily values of some shirts. Visitors: a month and few shirts; members: about a year.
create or replace function public.value_history(p_ids text[], p_days int)
returns setof public.shirt_value_history language plpgsql security definer set search_path = '' as $$
declare v_member boolean := (select auth.uid()) is not null;
begin
  perform private.throttle('history', 120, 600);
  return query select * from public.shirt_value_history
                where catalog_id = any (p_ids[1:case when v_member then 300 else 50 end])
                  and day >= current_date - least(greatest(coalesce(p_days, 30), 1), case when v_member then 400 else 35 end)
                order by day;
end $$;

-- The open order book of one shirt and size.
create or replace function public.open_bids(p_shirt text, p_size text)
returns setof public.bids language plpgsql security definer set search_path = '' as $$
begin
  perform private.throttle('book', 600, 3000);
  return query select * from public.bids
                where shirt_id = p_shirt and size = p_size and status = 'open' and (expires_at is null or expires_at > now())
                order by amount desc limit 50;
end $$;

create or replace function public.open_asks(p_shirt text, p_size text)
returns setof public.asks language plpgsql security definer set search_path = '' as $$
begin
  perform private.throttle('book', 600, 3000);
  return query select * from public.asks
                where shirt_id = p_shirt and size = p_size and status = 'open'
                order by amount asc limit 50;
end $$;

-- Kit library.
create or replace function public.library_clubs()
returns setof public.kit_clubs language plpgsql security definer set search_path = '' as $$
begin
  perform private.throttle('library', 300, 1500);
  return query select * from public.kit_clubs order by name limit 500;
end $$;

create or replace function public.library_kit_counts()
returns table (club_id text, n int) language plpgsql security definer set search_path = '' as $$
begin
  perform private.throttle('library', 300, 1500);
  return query select k.club_id, count(*)::int from public.kits k where k.status = 'approved' group by k.club_id;
end $$;

create or replace function public.library_kits(p_club text)
returns setof public.kits language plpgsql security definer set search_path = '' as $$
begin
  perform private.throttle('library', 300, 1500);
  return query select * from public.kits where club_id = p_club and status = 'approved' order by season_year desc limit 1000;
end $$;

do $$
declare f text;
begin
  foreach f in array array['public_catalog()', 'public_valuations()', 'shirt_comps(text)', 'value_history(text[], int)', 'open_bids(text, text)',
                           'open_asks(text, text)', 'library_clubs()', 'library_kit_counts()', 'library_kits(text)'] loop
    execute format('revoke execute on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

-- Trap entries ("mountweazels"): a few invented kits in the library, kept
-- in a private list. If they ever show up elsewhere, the data was copied.
create table if not exists private.canaries (
  kit_id uuid primary key,
  note text not null,
  created_at timestamptz not null default now()
);
with c as (
  insert into public.kits (club_id, season, season_year, kind, brand, sponsor, pattern, colors, note, source, status)
  values
    ('cremonese', '1979/80', 1979, 'training', 'Lanzera', 'Molino Verdesca', 'hoops', '{#C8102E,#A7A8AA}', null, 'import', 'approved'),
    ('heidenheim', '1984/85', 1984, 'special', 'Aldersee', 'Brunnfeld Optik', 'sash', '{#E2001A,#003B79}', null, 'import', 'approved'),
    ('le-havre', '1977/78', 1977, 'training', 'Marivel', 'Quai Lebrasse', 'pinstripes', '{#8EC6E8,#1D3765}', null, 'import', 'approved')
  on conflict do nothing
  returning id, club_id || ' ' || season || ' ' || kind || ' / ' || sponsor as note
)
insert into private.canaries (kit_id, note) select id, note from c;
