-- Legends get their kits from a curated list (kit_legends) instead of club
-- and year spans. And with every national team in the library, Discover's
-- shelves (feed, popular today, eras) keep to the well-known ones
-- (kit_clubs.featured); the library itself lists them all.

alter table public.kit_clubs add column if not exists featured boolean not null default false;
update public.kit_clubs set featured = true where league = 'National Teams';

create table if not exists public.kit_legends (
  legend text not null check (legend ~ '^[a-z0-9-]{2,40}$'),
  kit_id uuid not null references public.kits (id) on delete cascade,
  primary key (legend, kit_id)
);
alter table public.kit_legends enable row level security;
revoke all on public.kit_legends from anon, authenticated;

-- A legend's kits, season by season (clubs before the national team).
create or replace function public.legend_kits_for(p_legend text)
returns table (id uuid, club_id text, club_name text, season text, season_year int, kind text, variant text, image_path text)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.throttle('library', 300, 1500);
  return query
    select k.id, k.club_id, c.name, k.season, k.season_year, k.kind, k.variant, k.image_path
      from public.kit_legends l
      join public.kits k on k.id = l.kit_id
      join public.kit_clubs c on c.id = k.club_id
     where l.legend = p_legend and k.status = 'approved' and k.image_path is not null
     order by k.season_year, c.league = 'National Teams', c.name,
              array_position(array['home', 'away', 'third', 'fourth', 'cup', 'european', 'special', 'goalkeeper', 'training'], k.kind), k.variant
     limit 400;
end $$;
revoke execute on function public.legend_kits_for(text) from public;
grant execute on function public.legend_kits_for(text) to anon, authenticated;

-- Discover's shelves: big clubs, the Super League and featured national teams.
create or replace function private.on_discover(c public.kit_clubs)
returns boolean language sql immutable set search_path = '' as $$
  select c.top5 or c.league = 'Swiss Super League' or (c.league = 'National Teams' and c.featured)
$$;
revoke execute on function private.on_discover(public.kit_clubs) from public;

create or replace function public.feed_kits(p_clubs text[] default '{}', p_leagues text[] default '{}')
returns table (id uuid, club_id text, club_name text, league text, season text, season_year int, kind text, variant text, image_path text)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.throttle('library', 300, 1500);
  return query
    with pool as (
      select k.id, k.club_id, c.name, c.league, k.season, k.season_year, k.kind, k.variant, k.image_path
        from public.kits k
        join public.kit_clubs c on c.id = k.club_id
       where k.status = 'approved' and k.image_path is not null and k.kind in ('home', 'away', 'third')
         and (private.on_discover(c) or c.id = any (coalesce(p_clubs, '{}')))
    ), picked as (
      (select * from pool where pool.club_id = any (coalesce(p_clubs, '{}')) order by random() limit 25)
      union
      (select * from pool where pool.league = any (coalesce(p_leagues, '{}')) order by random() limit 25)
      union
      (select * from pool order by random() limit 60)
    )
    select * from picked limit 80;
end $$;

create or replace function public.popular_kits(p_limit int default 3)
returns table (id uuid, club_id text, club_name text, season text, kind text, variant text, image_path text)
language plpgsql security definer set search_path = '' as $$
declare
  v_year int := extract(year from (now() at time zone 'Europe/Zurich'))::int;
  v_day text := (now() at time zone 'Europe/Zurich')::date::text;
begin
  perform private.throttle('library', 300, 1500);
  return query
    with activity as (
      select l.kit_id, count(*) * 3 as score from public.kit_likes l where l.created_at > now() - interval '14 days' group by 1
      union all
      select ci.kit_id, count(*) * 5 from public.custom_items ci where ci.kit_id is not null and ci.created_at > now() - interval '30 days' group by 1
    ), scored as (select a.kit_id, sum(a.score) as score from activity a group by 1),
    pool as (
      select k.id, k.club_id, c.name, k.season, k.kind, k.variant, k.image_path
        from public.kits k
        join public.kit_clubs c on c.id = k.club_id
        left join scored s on s.kit_id = k.id
       where k.status = 'approved' and k.image_path is not null and k.variant = '' and k.kind in ('home', 'away', 'third')
         and private.on_discover(c)
         and (s.score is not null or k.season_year >= v_year - 1)
       order by coalesce(s.score, 0) desc, md5(k.id::text || v_day)
       limit 60
    )
    select p.id, p.club_id, p.name, p.season, p.kind, p.variant, p.image_path
      from pool p
     order by md5(p.id::text || ':' || v_day)
     limit least(greatest(coalesce(p_limit, 3), 1), 30);
end $$;

create or replace function public.era_kits(p_decade int, p_league text default null, p_offset int default 0, p_limit int default 48)
returns table (id uuid, club_id text, club_name text, league text, season text, season_year int, kind text, variant text, image_path text)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.throttle('library', 300, 1500);
  if p_decade is null or p_decade % 10 <> 0 or p_decade < 1900 or p_decade > 2100 then
    raise exception 'unknown decade' using errcode = '22023';
  end if;
  return query
    select k.id, k.club_id, c.name, c.league, k.season, k.season_year, k.kind, k.variant, k.image_path
      from public.kits k
      join public.kit_clubs c on c.id = k.club_id
     where k.status = 'approved' and k.image_path is not null and k.variant = '' and k.kind in ('home', 'away', 'third')
       and private.on_discover(c)
       and k.season_year between p_decade and p_decade + 9
       and (p_league is null or c.league = p_league)
     order by md5(k.id::text || ':era')
     offset greatest(coalesce(p_offset, 0), 0)
     limit least(greatest(coalesce(p_limit, 48), 1), 96);
end $$;
