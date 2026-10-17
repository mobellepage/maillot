-- Discover: kits popular today, kits by era and the kits of football's
-- legends, plus national teams grouped by continent. All from the library
-- (home, away and third kits with a picture), throttled like every read.

alter table public.kit_clubs add column if not exists region text
  check (region in ('Europe', 'South America', 'North & Central America', 'Africa', 'Asia', 'Oceania'));
update public.kit_clubs c set region = v.region
from (values
  ('brazil','South America'),('argentina','South America'),('uruguay','South America'),('colombia','South America'),('ecuador','South America'),('paraguay','South America'),
  ('mexico','North & Central America'),('usa','North & Central America'),('canada','North & Central America'),('panama','North & Central America'),('haiti','North & Central America'),('curacao','North & Central America'),
  ('germany','Europe'),('france','Europe'),('england','Europe'),('spain','Europe'),('portugal','Europe'),('scotland','Europe'),('netherlands','Europe'),('belgium','Europe'),
  ('sweden','Europe'),('austria','Europe'),('switzerland','Europe'),('norway','Europe'),('croatia','Europe'),('czech-republic','Europe'),('bosnia-and-herzegovina','Europe'),('turkiye','Europe'),
  ('egypt','Africa'),('tunisia','Africa'),('morocco','Africa'),('algeria','Africa'),('ivory-coast','Africa'),('south-africa','Africa'),('senegal','Africa'),('ghana','Africa'),('dr-congo','Africa'),('cape-verde','Africa'),
  ('iraq','Asia'),('japan','Asia'),('south-korea','Asia'),('iran','Asia'),('saudi-arabia','Asia'),('qatar','Asia'),('jordan','Asia'),('uzbekistan','Asia'),('australia','Asia'),
  ('new-zealand','Oceania')
) as v (id, region)
where c.id = v.id;

-- Today's popular kits: liked and added most lately; the rest of the nine
-- are current kits of big clubs and nations, a different mix every day.
create or replace function public.popular_kits(p_limit int default 9)
returns table (id uuid, club_id text, club_name text, season text, kind text, variant text, image_path text)
language plpgsql security definer set search_path = '' as $$
declare v_year int := extract(year from (now() at time zone 'Europe/Zurich'))::int;
begin
  perform private.throttle('library', 300, 1500);
  return query
    with activity as (
      select l.kit_id, count(*) * 3 as score from public.kit_likes l where l.created_at > now() - interval '14 days' group by 1
      union all
      select ci.kit_id, count(*) * 5 from public.custom_items ci where ci.kit_id is not null and ci.created_at > now() - interval '30 days' group by 1
    ), scored as (select a.kit_id, sum(a.score) as score from activity a group by 1)
    select k.id, k.club_id, c.name, k.season, k.kind, k.variant, k.image_path
      from public.kits k
      join public.kit_clubs c on c.id = k.club_id
      left join scored s on s.kit_id = k.id
     where k.status = 'approved' and k.image_path is not null and k.variant = '' and k.kind in ('home', 'away', 'third')
       and (c.top5 or c.league in ('Swiss Super League', 'National Teams'))
       and (s.score is not null or k.season_year >= v_year - 1)
     order by coalesce(s.score, 0) desc, md5(k.id::text || current_date::text)
     limit least(greatest(coalesce(p_limit, 9), 1), 30);
end $$;

-- Kits of one decade (1970 = the 70s), optionally of one league, in a fixed shuffled order.
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
       and (c.top5 or c.league in ('Swiss Super League', 'National Teams'))
       and k.season_year between p_decade and p_decade + 9
       and (p_league is null or c.league = p_league)
     order by md5(k.id::text || ':era')
     offset greatest(coalesce(p_offset, 0), 0)
     limit least(greatest(coalesce(p_limit, 48), 1), 96);
end $$;

-- A legend's kits: the clubs and national team they played for, season by season.
create or replace function public.legend_kits(p_clubs text[], p_from int[], p_to int[])
returns table (id uuid, club_id text, club_name text, season text, season_year int, kind text, variant text, image_path text)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.throttle('library', 300, 1500);
  if coalesce(array_length(p_clubs, 1), 0) = 0 or array_length(p_clubs, 1) > 12
     or array_length(p_clubs, 1) <> array_length(p_from, 1) or array_length(p_clubs, 1) <> array_length(p_to, 1) then
    raise exception 'clubs and years must match' using errcode = '22023';
  end if;
  return query
    select k.id, k.club_id, c.name, k.season, k.season_year, k.kind, k.variant, k.image_path
      from unnest(p_clubs, p_from, p_to) as s (club, y_from, y_to)
      join public.kits k on k.club_id = s.club and k.season_year between s.y_from and s.y_to
      join public.kit_clubs c on c.id = k.club_id
     where k.status = 'approved' and k.image_path is not null and k.variant = '' and k.kind in ('home', 'away', 'third')
     order by k.season_year, c.league = 'National Teams', c.name, array_position(array['home', 'away', 'third'], k.kind)
     limit 400;
end $$;

do $$
declare f text;
begin
  foreach f in array array['popular_kits(int)', 'era_kits(int, text, int, int)', 'legend_kits(text[], int[], int[])'] loop
    execute format('revoke execute on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;
