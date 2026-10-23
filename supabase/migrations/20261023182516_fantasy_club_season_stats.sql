-- Fantasy statistics: every club's season so far — played, won, drawn, lost,
-- goals and the points it would have brought (win 3, draw 1), refreshed
-- from the football feeds every three hours (fantasy-fixtures, standings).
create table if not exists public.fantasy_club_season (
  club_id text not null references public.kit_clubs (id) on delete cascade,
  season text not null,
  played int not null default 0,
  won int not null default 0,
  drawn int not null default 0,
  lost int not null default 0,
  goals_for int not null default 0,
  goals_against int not null default 0,
  points int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (club_id, season)
);
alter table public.fantasy_club_season enable row level security;
create policy fantasy_club_season_read on public.fantasy_club_season for select to anon, authenticated using (true);
grant select on public.fantasy_club_season to anon, authenticated;

create or replace function private.fantasy_request_standings()
returns void language plpgsql set search_path = '' as $$
declare v_url text;
begin
  select value into v_url from private.app_settings where key = 'functions_url';
  if v_url is null then return; end if;
  perform net.http_post(url := v_url || '/fantasy-fixtures', headers := '{"Content-Type": "application/json"}'::jsonb, body := '{"standings": true}'::jsonb, timeout_milliseconds := 60000);
end $$;
select cron.schedule('fantasy-standings', '17 */3 * * *', 'select private.fantasy_request_standings()')
 where not exists (select 1 from cron.job where jobname = 'fantasy-standings');

-- The statistics page: every jersey of the game with its season so far, its
-- price and last move, and how many squads hold it.
create or replace function public.fantasy_club_stats()
returns table (club_id text, name text, league text, image_path text, price numeric, delta numeric, picked_pct int,
               played int, won int, drawn int, lost int, goals_for int, goals_against int, points int, ppg numeric, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with season as (select (private.fantasy_season_year()::text || '/' || right((private.fantasy_season_year() + 1)::text, 2)) s),
  n as (select greatest(1, count(*)) n from public.fantasy_squads where cardinality(clubs) = (select squad_size from private.fantasy_md_policy()))
  select c.id, c.name, c.league, (select image_path from private.fantasy_jersey(c.id)), private.fantasy_club_price(c.id),
         (select m.delta from public.fantasy_price_moves m where m.club_id = c.id order by m.created_at desc limit 1),
         coalesce((select (count(*) * 100 / n.n)::int from public.fantasy_squads s, n where c.id = any (s.clubs) and cardinality(s.clubs) = (select squad_size from private.fantasy_md_policy()) group by n.n), 0),
         coalesce(x.played, 0), coalesce(x.won, 0), coalesce(x.drawn, 0), coalesce(x.lost, 0), coalesce(x.goals_for, 0), coalesce(x.goals_against, 0), coalesce(x.points, 0),
         case when coalesce(x.played, 0) > 0 then round(x.points::numeric / x.played, 2) else 0 end,
         x.updated_at
    from public.kit_clubs c
    cross join season
    left join public.fantasy_club_season x on x.club_id = c.id and x.season = season.s
   where private.fantasy_pickable(c) and c.league <> 'National Teams'
   order by coalesce(x.points, 0) desc, c.name
$$;
revoke all on function public.fantasy_club_stats() from public;
grant execute on function public.fantasy_club_stats() to anon, authenticated;
