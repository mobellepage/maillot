-- The daily puzzle uses real kits from the library. A fixed schedule (one
-- kit a day, a year ahead) so everybody gets the same shirt and it never
-- changes when kits are added. Home and away kits of the top five leagues,
-- the Swiss Super League and the national teams; three in five from 2010
-- on, two in five from 1980-2009, so it stays guessable. Each day has its
-- own sharper picture under a neutral name (/library/daily/…), so the file
-- name doesn't give the answer away.
create table if not exists private.daily_kits (
  day date primary key,
  kit_id uuid not null references public.kits (id) on delete cascade,
  image text check (image ~ '^/library/daily/[a-f0-9]{16}\.webp$')
);

with pool as (
  select k.id, k.season_year >= 2010 as recent, md5(k.id::text || ':maillot-daily') as h
    from public.kits k
    join public.kit_clubs c on c.id = k.club_id
   where k.status = 'approved' and k.image_path is not null and k.variant = '' and k.kind in ('home', 'away')
     and k.season_year between 1980 and 2026
     and (c.top5 or c.league in ('Swiss Super League', 'National Teams'))
), a as (select id, row_number() over (order by h) as r from pool where recent),
   b as (select id, row_number() over (order by h) as r from pool where not recent),
days as (
  select g as i, date '2026-10-13' + g as day,
         case when g % 5 in (0, 2, 4) then 'a' else 'b' end as src,
         case when g % 5 in (0, 2, 4) then (g / 5) * 3 + (g % 5) / 2 + 1 else (g / 5) * 2 + (g % 5 + 1) / 2 end as r
    from generate_series(0, 364) g
)
insert into private.daily_kits (day, kit_id, image)
select d.day, coalesce(a.id, b.id), '/library/daily/' || left(md5(d.day::text || coalesce(a.id, b.id)::text || ':mll'), 16) || '.webp'
  from days d
  left join a on d.src = 'a' and a.r = d.r
  left join b on d.src = 'b' and b.r = d.r
on conflict (day) do nothing;

-- Today's kit (or an earlier day's): never a day ahead.
create or replace function public.daily_kit(p_day date)
returns table (day date, image text, club_id text, club_name text, league text, country text, season text, season_year int, kind text, library_image text)
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Europe/Zurich')::date;
begin
  perform private.throttle('daily', 300, 1500);
  if p_day is null or p_day > v_today or p_day < date '2026-10-13' then
    raise exception 'no puzzle for that day' using errcode = '22023';
  end if;
  return query
    select d.day, coalesce(d.image, k.image_path), k.club_id, c.name, c.league, c.country, k.season, k.season_year, k.kind, k.image_path
      from private.daily_kits d
      join public.kits k on k.id = d.kit_id
      join public.kit_clubs c on c.id = k.club_id
     where d.day = p_day;
end $$;
revoke execute on function public.daily_kit(date) from public;
grant execute on function public.daily_kit(date) to anon, authenticated;
