-- Kit news on Discover, from SoccerBible's football apparel page: headline,
-- date and link only (their text and photos stay on their site; the card
-- shows the matching kit from our library). Fetched by the fetch-news edge
-- function every six hours; each headline is matched to a library club and,
-- where possible, the kit it is about.
-- Plus BSC Young Boys Women's first own third shirt (2026/27), from the club.

insert into public.kits (club_id, season, season_year, kind, variant, pattern, colors, image_path, image_credit, image_credit_url, source, status)
values ('young-boys', '2026/27', 2026, 'third', 'Women', 'graphic', '{#6F4E97,#563A84}', '/library/yb/2026-27-third-women-kit.webp',
        'BSC Young Boys', 'https://shop.bscyb.ch/products/yb-frauen-trikot-third-26-27-herrenschnitt', 'import', 'approved')
on conflict (club_id, season, kind, variant) where status = 'approved' do nothing;

create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('SoccerBible')),
  url text not null unique check (url ~ '^https://www\.soccerbible\.com/[a-z0-9/_-]+/$'),
  title text not null check (char_length(title) between 1 and 240),
  published_on date not null,
  club_id text references public.kit_clubs (id) on delete set null,
  kit_id uuid references public.kits (id) on delete set null,
  fetched_at timestamptz not null default now()
);
create index if not exists news_items_published_idx on public.news_items (published_on desc, fetched_at desc);
alter table public.news_items enable row level security;
revoke all on public.news_items from anon, authenticated;

-- The library club a headline is about (the longest name or short name in
-- it, as a whole word), and its kit: the season named ("26/27") or the
-- season of the article, the kind named (third, away …), women's kits for
-- women's teams.
create or replace function private.news_match(p_title text, p_published date, out club_id text, out kit_id uuid)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_t text := lower(p_title);
  v_season text;
  v_year int;
  v_kind text;
  v_women boolean := v_t ~ '\m(women|womens|women''s|frauen|féminines)\M';
  m text[];
begin
  select c.id into club_id
    from public.kit_clubs c
    cross join lateral unnest(array[c.name] || c.aliases) as n (name)
   where char_length(n.name) >= 3
     and v_t ~ ('\m' || regexp_replace(lower(n.name), '([.^$*+?()\[\]{}|\\-])', '\\\1', 'g') || '\M')
     and exists (select 1 from public.kits k where k.club_id = c.id and k.status = 'approved' and k.image_path is not null)
   order by char_length(n.name) desc, c.top5 desc
   limit 1;
  if club_id is null then return; end if;

  m := regexp_match(v_t, '\m(\d{2})/(\d{2})\M');
  if m is not null then
    v_year := 2000 + m[1]::int;
  else
    v_year := extract(year from p_published)::int - case when extract(month from p_published) < 7 then 1 else 0 end;
  end if;
  v_season := v_year || '/' || lpad(((v_year + 1) % 100)::text, 2, '0');
  v_kind := case
    when v_t ~ '\mthird\M' then 'third'
    when v_t ~ '\mfourth\M' then 'fourth'
    when v_t ~ '\maway\M' then 'away'
    when v_t ~ '\m(goalkeeper|gk)\M' then 'goalkeeper'
    when v_t ~ '\mhome\M' then 'home'
    when v_t ~ '\m(special|anniversary|celebrate|honour|honor|tribute|edition)\M' then 'special'
  end;
  select k.id into kit_id
    from public.kits k
   where k.club_id = news_match.club_id and k.status = 'approved' and k.image_path is not null
     and (k.season = v_season or k.season = v_year::text)
   order by (k.kind = v_kind) desc nulls last, (v_women and k.variant = 'Women') desc, (k.variant = '') desc,
            array_position(array['home', 'away', 'third', 'fourth', 'special', 'cup', 'european', 'goalkeeper', 'training'], k.kind)
   limit 1;
end $$;
revoke execute on function private.news_match(text, date) from public;

-- For the edge function (service role): at most one fetch an hour.
create or replace function public.start_news_fetch()
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('news_fetch'));
  if exists (select 1 from private.app_settings where key = 'news_fetched_at' and value::timestamptz > now() - interval '50 minutes') then
    return false;
  end if;
  insert into private.app_settings (key, value) values ('news_fetched_at', now()::text)
  on conflict (key) do update set value = excluded.value;
  return true;
end $$;
revoke all on function public.start_news_fetch() from public, anon, authenticated;
grant execute on function public.start_news_fetch() to service_role;

-- Stores the headlines (new ones added, known ones refreshed and re-matched).
create or replace function public.store_news(p_items jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0; mt record;
begin
  for r in select * from jsonb_to_recordset(p_items) as x (url text, title text, published_on date) limit 60 loop
    select * into mt from private.news_match(r.title, r.published_on);
    insert into public.news_items (source, url, title, published_on, club_id, kit_id)
    values ('SoccerBible', r.url, left(r.title, 240), r.published_on, mt.club_id, mt.kit_id)
    on conflict (url) do update set title = excluded.title, club_id = excluded.club_id, kit_id = excluded.kit_id, fetched_at = now();
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.store_news(jsonb) from public, anon, authenticated;
grant execute on function public.store_news(jsonb) to service_role;

-- The newest kit news for Discover.
create or replace function public.latest_news(p_limit int default 5)
returns table (id uuid, source text, url text, title text, published_on date, club_id text, club_name text, kit_season text, kit_image text)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.throttle('library', 300, 1500);
  return query
    select n.id, n.source, n.url, n.title, n.published_on, n.club_id, c.name, k.season, k.image_path
      from public.news_items n
      left join public.kit_clubs c on c.id = n.club_id
      left join public.kits k on k.id = n.kit_id
     order by n.published_on desc, n.fetched_at desc
     limit least(greatest(coalesce(p_limit, 5), 1), 20);
end $$;
revoke execute on function public.latest_news(int) from public;
grant execute on function public.latest_news(int) to anon, authenticated;

create or replace function private.request_news()
returns void language plpgsql security definer set search_path = '' as $$
declare v_url text;
begin
  select value into v_url from private.app_settings where key = 'functions_url';
  if v_url is null then return; end if;
  perform net.http_post(url := v_url || '/fetch-news', headers := '{"Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);
end $$;
revoke all on function private.request_news() from public, anon, authenticated;
select cron.schedule('kit-news', '20 */6 * * *', 'select private.request_news()');
