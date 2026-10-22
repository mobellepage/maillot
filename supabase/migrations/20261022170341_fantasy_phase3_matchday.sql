-- Fantasy, phase 3: Matchday. Each weekend a player lines up five cards
-- (one the captain) under a budget; each card scores with its club's real
-- result that weekend (win, draw, goals, clean sheet), Gold ×2, captain ×2,
-- a chip once a season, a bonus for predicting the captain's score.
--
-- Fixtures and results come from a provider through the fantasy-fixtures
-- edge function (an adapter: mock today, a real feed later), written into
-- fantasy_fixtures; an admin can override a result. Scoring is pure SQL
-- from stored fixtures, so it can be recalculated at any time.

-- ---------------------------------------------------------------------------
-- Policy (src/config/fantasy.ts mirrors it)
-- ---------------------------------------------------------------------------
create or replace function private.fantasy_md_policy()
returns table (
  lineup_size int, budget numeric,
  win int, draw int, goal int, clean_sheet int,
  gold_mult numeric, captain_mult numeric, gold_rush_mult numeric, triple_captain_mult numeric, derby_mult numeric,
  pred_exact int, pred_outcome int,
  deadline_before interval, window_hours int,
  value_common numeric, value_rare numeric, value_epic numeric, value_legendary numeric,
  international_every int
)
language sql immutable as $$
  select 5, 1000,
         3, 1, 1, 2,
         2, 2, 3, 3, 2,
         5, 2,
         interval '1 hour', 36,
         80, 150, 260, 450,
         5
$$;

-- The pool of clubs the game plays with: the big leagues, Switzerland, the nations.
create or replace function private.fantasy_pool_club(c public.kit_clubs)
returns boolean language sql immutable as $$
  select c.top5 or c.featured or c.league in ('Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1', 'Swiss Super League', 'Eredivisie', 'Primeira Liga', 'Süper Lig')
$$;

-- Packs and the shop draw from that pool (not only the Discover-featured nations).
create or replace function private.fantasy_draw(p_user uuid, p_rarity text)
returns uuid language plpgsql as $$
declare
  pol record;
  k uuid;
begin
  select * into pol from private.fantasy_policy();
  if random() < pol.interest_share then
    select kit.id into k from public.kits kit
      join public.kit_clubs c on c.id = kit.club_id
     where kit.rarity = p_rarity and kit.image_path is not null and kit.status = 'approved'
       and (
         c.league in (select jsonb_array_elements_text(coalesce(p.interests -> 'leagues', '[]'::jsonb)) from public.profiles p where p.id = p_user)
         or c.id = (select p.interests ->> 'club' from public.profiles p where p.id = p_user)
         or c.id in (select kk.club_id from public.custom_items ci join public.kits kk on kk.id = ci.kit_id where ci.user_id = p_user)
       )
     order by random() limit 1;
  end if;
  if k is null then
    select kit.id into k from public.kits kit
      join public.kit_clubs c on c.id = kit.club_id
     where kit.rarity = p_rarity and kit.image_path is not null and kit.status = 'approved' and private.fantasy_pool_club(c)
     order by random() limit 1;
  end if;
  if k is null then
    select kit.id into k from public.kits kit
     where kit.rarity = p_rarity and kit.image_path is not null and kit.status = 'approved'
     order by random() limit 1;
  end if;
  return k;
end $$;

create or replace function private.fantasy_shop_kits(p_week date)
returns table (kit_id uuid, price int)
language sql stable as $$
  with pol as (select * from private.fantasy_shop_policy())
  (select k.id, pol.price_common from public.kits k join public.kit_clubs c on c.id = k.club_id, pol
    where k.rarity = 'common' and k.image_path is not null and private.fantasy_pool_club(c)
    order by md5(p_week::text || k.id::text) limit (select n_common from pol))
  union all
  (select k.id, pol.price_rare from public.kits k join public.kit_clubs c on c.id = k.club_id, pol
    where k.rarity = 'rare' and k.image_path is not null and private.fantasy_pool_club(c)
    order by md5(p_week::text || k.id::text) limit (select n_rare from pol))
$$;

-- What a kit counts for in the squad budget: the price index's value for a
-- catalogued model, else a reference value by rarity.
create or replace function private.fantasy_kit_value(p_kit public.kits)
returns numeric language sql stable as $$
  select coalesce(
    (select v.value from public.shirt_valuations v where v.catalog_id = p_kit.catalog_id and p_kit.catalog_id is not null),
    (select case p_kit.rarity when 'legendary' then value_legendary when 'epic' then value_epic when 'rare' then value_rare else value_common end from private.fantasy_md_policy()))
$$;

-- ---------------------------------------------------------------------------
-- Seasons, cups, matchdays, fixtures
-- ---------------------------------------------------------------------------
create table if not exists public.fantasy_seasons (
  id serial primary key,
  name text not null unique,
  starts date not null,
  ends date not null
);
create table if not exists public.fantasy_cups (
  id serial primary key,
  season_id int not null references public.fantasy_seasons (id),
  month date not null unique,
  name text not null,
  closed_at timestamptz
);
create table if not exists public.fantasy_matchdays (
  id serial primary key,
  season_id int not null references public.fantasy_seasons (id),
  cup_id int not null references public.fantasy_cups (id),
  number int not null,
  window_start timestamptz not null unique,
  window_end timestamptz not null,
  deadline timestamptz not null,
  international boolean not null default false,
  status text not null default 'upcoming' check (status in ('upcoming', 'locked', 'live', 'scored')),
  locked_at timestamptz,
  scored_at timestamptz
);
create table if not exists public.fantasy_team_mappings (
  club_id text primary key references public.kit_clubs (id) on delete cascade,
  provider text not null default 'mock',
  provider_team_id text not null,
  team_name text,
  unique (provider, provider_team_id)
);
create table if not exists public.fantasy_fixtures (
  id bigserial primary key,
  matchday_id int not null references public.fantasy_matchdays (id) on delete cascade,
  provider text not null default 'mock',
  provider_fixture_id text not null,
  competition text not null default 'league',
  home_club_id text references public.kit_clubs (id),
  away_club_id text references public.kit_clubs (id),
  home_name text not null,
  away_name text not null,
  kickoff timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'finished')),
  home_goals int,
  away_goals int,
  overridden boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (provider, provider_fixture_id)
);
create index if not exists fantasy_fixtures_md on public.fantasy_fixtures (matchday_id);
create index if not exists fantasy_fixtures_clubs on public.fantasy_fixtures (matchday_id, home_club_id, away_club_id);

create table if not exists public.fantasy_lineups (
  user_id uuid not null references auth.users (id) on delete cascade,
  matchday_id int not null references public.fantasy_matchdays (id) on delete cascade,
  kits uuid[] not null,
  golds boolean[] not null,
  captain uuid not null,
  chip text check (chip in ('gold_rush', 'triple_captain', 'derby_day', 'wildcard')),
  pred_fixture bigint references public.fantasy_fixtures (id) on delete set null,
  pred_home int,
  pred_away int,
  budget_used numeric not null default 0,
  points int not null default 0,
  pred_points int not null default 0,
  locked boolean not null default false,
  carried boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, matchday_id)
);
create index if not exists fantasy_lineups_md on public.fantasy_lineups (matchday_id, points desc);
create table if not exists public.fantasy_card_scores (
  user_id uuid not null,
  matchday_id int not null,
  kit_id uuid not null,
  club_id text,
  played boolean not null default false,
  base int not null default 0,
  multiplier numeric not null default 1,
  total int not null default 0,
  detail jsonb not null default '{}'::jsonb,
  primary key (user_id, matchday_id, kit_id),
  foreign key (user_id, matchday_id) references public.fantasy_lineups (user_id, matchday_id) on delete cascade
);
create table if not exists public.fantasy_chips_used (
  user_id uuid not null references auth.users (id) on delete cascade,
  season_id int not null references public.fantasy_seasons (id),
  chip text not null,
  matchday_id int not null references public.fantasy_matchdays (id),
  primary key (user_id, season_id, chip)
);

alter table public.fantasy_seasons enable row level security;
alter table public.fantasy_cups enable row level security;
alter table public.fantasy_matchdays enable row level security;
alter table public.fantasy_team_mappings enable row level security;
alter table public.fantasy_fixtures enable row level security;
alter table public.fantasy_lineups enable row level security;
alter table public.fantasy_card_scores enable row level security;
alter table public.fantasy_chips_used enable row level security;
create policy fantasy_seasons_read on public.fantasy_seasons for select to anon, authenticated using (true);
create policy fantasy_cups_read on public.fantasy_cups for select to anon, authenticated using (true);
create policy fantasy_matchdays_read on public.fantasy_matchdays for select to anon, authenticated using (true);
create policy fantasy_team_mappings_read on public.fantasy_team_mappings for select to anon, authenticated using (true);
create policy fantasy_fixtures_read on public.fantasy_fixtures for select to anon, authenticated using (true);
-- Line-ups are public once locked (leagues show them); one's own always.
create policy fantasy_lineups_read on public.fantasy_lineups for select to anon, authenticated using (locked or user_id = (select auth.uid()));
create policy fantasy_card_scores_read on public.fantasy_card_scores for select to anon, authenticated using (true);
create policy fantasy_chips_own on public.fantasy_chips_used for select to authenticated using (user_id = (select auth.uid()));
create policy fantasy_team_mappings_admin on public.fantasy_team_mappings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy fantasy_fixtures_admin on public.fantasy_fixtures for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.fantasy_seasons, public.fantasy_cups, public.fantasy_matchdays, public.fantasy_team_mappings, public.fantasy_fixtures, public.fantasy_lineups, public.fantasy_card_scores to anon, authenticated;
grant select on public.fantasy_chips_used to authenticated;
grant insert, update, delete on public.fantasy_team_mappings to authenticated;
grant update on public.fantasy_fixtures to authenticated;

-- Team mappings: every club of the pool, mapped to the mock provider.
insert into public.fantasy_team_mappings (club_id, provider, provider_team_id, team_name)
select c.id, 'mock', 'mock:' || c.id, c.name from public.kit_clubs c where private.fantasy_pool_club(c)
on conflict (club_id) do nothing;

-- ---------------------------------------------------------------------------
-- Calendar: a season runs Aug–May; a cup is a calendar month; a matchday is
-- a weekend (Saturday 12:00 UTC for 36 hours), deadline an hour before.
-- ---------------------------------------------------------------------------
create or replace function private.fantasy_season_for(p_day date)
returns int language plpgsql as $$
declare y int := case when extract(month from p_day) >= 8 then extract(year from p_day)::int else extract(year from p_day)::int - 1 end;
        sid int;
begin
  insert into public.fantasy_seasons (name, starts, ends)
  values (y || '/' || right((y + 1)::text, 2), make_date(y, 8, 1), make_date(y + 1, 5, 31))
  on conflict (name) do nothing;
  select id into sid from public.fantasy_seasons where name = y || '/' || right((y + 1)::text, 2);
  return sid;
end $$;

create or replace function private.fantasy_cup_for(p_day date)
returns int language plpgsql as $$
declare m date := date_trunc('month', p_day)::date; cid int;
begin
  insert into public.fantasy_cups (season_id, month, name)
  values (private.fantasy_season_for(p_day), m, to_char(m, 'FMMonth YYYY'))
  on conflict (month) do nothing;
  select id into cid from public.fantasy_cups where month = m;
  return cid;
end $$;

-- Makes the next eight weekends' matchdays (idempotent).
create or replace function private.fantasy_ensure_matchdays()
returns void language plpgsql as $$
declare
  pol record;
  sat date;
  ws timestamptz;
  sid int; cid int; n int;
begin
  select * into pol from private.fantasy_md_policy();
  -- The coming Saturday (today if Saturday).
  sat := current_date + ((6 - extract(dow from current_date)::int) % 7);
  for i in 0..7 loop
    ws := (sat + i * 7)::timestamp at time zone 'UTC' + interval '12 hours';
    if exists (select 1 from public.fantasy_matchdays where window_start = ws) then continue; end if;
    sid := private.fantasy_season_for((sat + i * 7));
    cid := private.fantasy_cup_for((sat + i * 7));
    select coalesce(max(number), 0) + 1 into n from public.fantasy_matchdays where season_id = sid;
    insert into public.fantasy_matchdays (season_id, cup_id, number, window_start, window_end, deadline, international)
    values (sid, cid, n, ws, ws + make_interval(hours => pol.window_hours), ws - pol.deadline_before, n % pol.international_every = 0);
  end loop;
end $$;

-- The matchday a player is lining up for now (the next one still open), else the one running.
create or replace function private.fantasy_current_matchday()
returns int language sql stable as $$
  select id from public.fantasy_matchdays
   where window_end > now() - interval '6 hours'
   order by case status when 'upcoming' then 0 when 'locked' then 1 when 'live' then 2 else 3 end, window_start
   limit 1
$$;

-- ---------------------------------------------------------------------------
-- The line-up
-- ---------------------------------------------------------------------------
create or replace function public.fantasy_save_lineup(p_md int, p_kits uuid[], p_captain uuid, p_chip text default null, p_pred_fixture bigint default null, p_pred_home int default null, p_pred_away int default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  md public.fantasy_matchdays;
  pol record;
  owned int;
  golds boolean[];
  budget numeric;
  cap_club text;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.hit('fantasy:lineup:' || uid, 120, interval '1 hour');
  select * into pol from private.fantasy_md_policy();
  select * into md from public.fantasy_matchdays where id = p_md;
  if md.id is null or md.status <> 'upcoming' or now() >= md.deadline then raise exception 'deadline_passed' using errcode = 'P0470'; end if;
  if coalesce(array_length(p_kits, 1), 0) <> pol.lineup_size or (select count(distinct k) from unnest(p_kits) k) <> pol.lineup_size then
    raise exception 'lineup_size' using errcode = 'P0471';
  end if;
  if not (p_captain = any (p_kits)) then raise exception 'captain_not_in_lineup' using errcode = 'P0472'; end if;
  select count(*) into owned from private.fantasy_owned_kits(uid) o where o.kit_id = any (p_kits);
  if owned <> pol.lineup_size then raise exception 'card_not_owned' using errcode = 'P0473'; end if;
  select array_agg(coalesce(o.gold, false) order by x.ord) into golds
    from unnest(p_kits) with ordinality x (kit_id, ord) left join private.fantasy_owned_kits(uid) o on o.kit_id = x.kit_id;
  select sum(private.fantasy_kit_value(k)) into budget from public.kits k where k.id = any (p_kits);
  if p_chip is distinct from 'wildcard' and budget > pol.budget then raise exception 'over_budget' using errcode = 'P0474'; end if;
  if p_chip is not null and exists (select 1 from public.fantasy_chips_used c where c.user_id = uid and c.season_id = md.season_id and c.chip = p_chip and c.matchday_id <> p_md) then
    raise exception 'chip_used' using errcode = 'P0475';
  end if;
  -- The prediction must be a match of the captain's club in this matchday.
  if p_pred_fixture is not null then
    select k.club_id into cap_club from public.kits k where k.id = p_captain;
    if not exists (select 1 from public.fantasy_fixtures f where f.id = p_pred_fixture and f.matchday_id = p_md and (f.home_club_id = cap_club or f.away_club_id = cap_club)) then
      raise exception 'prediction_fixture' using errcode = 'P0476';
    end if;
  end if;
  insert into public.fantasy_lineups (user_id, matchday_id, kits, golds, captain, chip, pred_fixture, pred_home, pred_away, budget_used, updated_at)
  values (uid, p_md, p_kits, golds, p_captain, p_chip, p_pred_fixture, p_pred_home, p_pred_away, budget, now())
  on conflict (user_id, matchday_id) do update
    set kits = excluded.kits, golds = excluded.golds, captain = excluded.captain, chip = excluded.chip,
        pred_fixture = excluded.pred_fixture, pred_home = excluded.pred_home, pred_away = excluded.pred_away,
        budget_used = excluded.budget_used, carried = false, updated_at = now();
  -- The chip is booked for the season now (and freed again if the line-up drops it before the deadline).
  delete from public.fantasy_chips_used where user_id = uid and season_id = md.season_id and matchday_id = p_md and chip is distinct from p_chip;
  if p_chip is not null then
    insert into public.fantasy_chips_used (user_id, season_id, chip, matchday_id) values (uid, md.season_id, p_chip, p_md) on conflict do nothing;
  end if;
end $$;
revoke all on function public.fantasy_save_lineup(int, uuid[], uuid, text, bigint, int, int) from public;
grant execute on function public.fantasy_save_lineup(int, uuid[], uuid, text, bigint, int, int) to authenticated;

-- At the deadline: line-ups lock, Gold is evaluated now, players without a
-- line-up play their previous one again.
create or replace function private.fantasy_lock_matchday(p_md int)
returns void language plpgsql as $$
declare md public.fantasy_matchdays; r record;
begin
  select * into md from public.fantasy_matchdays where id = p_md for update;
  if md.status <> 'upcoming' then return; end if;
  -- Carry over: everyone who played the previous matchday of the season but set nothing now.
  for r in
    select l.* from public.fantasy_lineups l
     where l.matchday_id = (select m.id from public.fantasy_matchdays m where m.season_id = md.season_id and m.window_start < md.window_start order by m.window_start desc limit 1)
       and not exists (select 1 from public.fantasy_lineups x where x.user_id = l.user_id and x.matchday_id = p_md)
  loop
    insert into public.fantasy_lineups (user_id, matchday_id, kits, golds, captain, chip, budget_used, carried)
    values (r.user_id, p_md, r.kits, r.golds, r.captain, null, r.budget_used, true)
    on conflict do nothing;
  end loop;
  -- Gold is what the player owns at the deadline.
  update public.fantasy_lineups l
     set golds = (select array_agg(coalesce(o.gold, false) order by x.ord) from unnest(l.kits) with ordinality x (kit_id, ord) left join private.fantasy_owned_kits(l.user_id) o on o.kit_id = x.kit_id),
         locked = true
   where l.matchday_id = p_md;
  update public.fantasy_matchdays set status = 'locked', locked_at = now() where id = p_md;
  perform private.fantasy_after_locked(p_md);
end $$;

-- Hooks the later phases fill in (leagues' pairings, standings, notifications).
create or replace function private.fantasy_after_locked(p_md int) returns void language sql as $$ select null $$;
create or replace function private.fantasy_after_scored(p_md int) returns void language sql as $$ select null $$;

-- ---------------------------------------------------------------------------
-- Scoring
-- ---------------------------------------------------------------------------
-- A club's result in a matchday: points and the goals, over every match it played.
create or replace function private.fantasy_club_result(p_club text, p_md int, p_final boolean)
returns table (played boolean, points int, detail jsonb, opponents text[])
language sql stable as $$
  with pol as (select * from private.fantasy_md_policy()),
  m as (
    select f.id, f.status, f.home_name, f.away_name, f.home_goals, f.away_goals,
           case when f.home_club_id = p_club then f.home_goals else f.away_goals end gf,
           case when f.home_club_id = p_club then f.away_goals else f.home_goals end ga,
           case when f.home_club_id = p_club then f.away_club_id else f.home_club_id end opp
      from public.fantasy_fixtures f
     where f.matchday_id = p_md and (f.home_club_id = p_club or f.away_club_id = p_club)
       and f.status in ('live', 'finished') and (not p_final or f.status = 'finished')
       and f.home_goals is not null and f.away_goals is not null
  )
  select count(*) > 0,
         coalesce(sum(case when gf > ga then pol.win when gf = ga then pol.draw else 0 end + gf * pol.goal + case when ga = 0 then pol.clean_sheet else 0 end), 0)::int,
         coalesce(jsonb_agg(jsonb_build_object('fixture', id, 'home', home_name, 'away', away_name, 'score', home_goals || '–' || away_goals, 'status', status)), '[]'::jsonb),
         coalesce(array_agg(opp) filter (where opp is not null), '{}')
    from m, pol
$$;

-- Scores every line-up of a matchday from the stored fixtures. Provisional
-- while matches run (p_final false), final after the window.
create or replace function private.fantasy_score(p_md int, p_final boolean)
returns void language plpgsql as $$
declare
  pol record;
  l record;
  i int;
  kit uuid;
  club text;
  res record;
  mult numeric;
  total int;
  clubs text[];
  pp int;
  f public.fantasy_fixtures;
  nats boolean;
  md public.fantasy_matchdays;
begin
  select * into pol from private.fantasy_md_policy();
  select * into md from public.fantasy_matchdays where id = p_md;
  for l in select * from public.fantasy_lineups where matchday_id = p_md loop
    total := 0;
    select array_agg(k.club_id) into clubs from public.kits k where k.id = any (l.kits);
    for i in 1..coalesce(array_length(l.kits, 1), 0) loop
      kit := l.kits[i];
      select k.club_id into club from public.kits k where k.id = kit;
      select * into res from private.fantasy_club_result(club, p_md, p_final);
      mult := 1;
      if l.golds[i] then mult := mult * case when l.chip = 'gold_rush' then pol.gold_rush_mult else pol.gold_mult end; end if;
      if kit = l.captain then mult := mult * case when l.chip = 'triple_captain' then pol.triple_captain_mult else pol.captain_mult end; end if;
      if l.chip = 'derby_day' and res.opponents && clubs then mult := mult * pol.derby_mult; end if;
      insert into public.fantasy_card_scores (user_id, matchday_id, kit_id, club_id, played, base, multiplier, total, detail)
      values (l.user_id, p_md, kit, club, res.played, res.points, mult, round(res.points * mult)::int, jsonb_build_object('matches', res.detail, 'gold', l.golds[i], 'captain', kit = l.captain, 'chip', l.chip))
      on conflict (user_id, matchday_id, kit_id) do update
        set club_id = excluded.club_id, played = excluded.played, base = excluded.base, multiplier = excluded.multiplier, total = excluded.total, detail = excluded.detail;
      total := total + round(res.points * mult)::int;
    end loop;
    -- The prediction: exact score, or the right outcome.
    pp := 0;
    if l.pred_fixture is not null then
      select * into f from public.fantasy_fixtures where id = l.pred_fixture;
      if f.status = 'finished' and f.home_goals is not null then
        if f.home_goals = l.pred_home and f.away_goals = l.pred_away then pp := pol.pred_exact;
        elsif sign(f.home_goals - f.away_goals) = sign(coalesce(l.pred_home, 0) - coalesce(l.pred_away, 0)) then pp := pol.pred_outcome;
        end if;
      end if;
    end if;
    update public.fantasy_lineups set points = total + pp, pred_points = pp where user_id = l.user_id and matchday_id = p_md;
  end loop;
  if p_final then
    update public.fantasy_matchdays set status = 'scored', scored_at = now() where id = p_md;
    perform private.fantasy_after_scored(p_md);
  else
    update public.fantasy_matchdays set status = 'live' where id = p_md and status = 'locked';
  end if;
end $$;

-- Admins recalculate (after an override); the cron does the rest.
create or replace function public.fantasy_rescore(p_md int)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  perform private.fantasy_score(p_md, (select status = 'scored' from public.fantasy_matchdays where id = p_md));
end $$;
revoke all on function public.fantasy_rescore(int) from public;
grant execute on function public.fantasy_rescore(int) to authenticated;

-- ---------------------------------------------------------------------------
-- The clock: every ten minutes (pg_cron). Makes matchdays, asks the provider
-- for fixtures and results, locks at the deadline, scores live, scores final.
-- ---------------------------------------------------------------------------
create or replace function private.fantasy_request_fixtures(p_ids int[])
returns void language plpgsql as $$
declare v_url text;
begin
  if coalesce(array_length(p_ids, 1), 0) = 0 then return; end if;
  select value into v_url from private.app_settings where key = 'functions_url';
  if v_url is null then return; end if;
  perform net.http_post(url := v_url || '/fantasy-fixtures', headers := '{"Content-Type": "application/json"}'::jsonb, body := jsonb_build_object('matchdays', to_jsonb(p_ids)));
end $$;

create or replace function public.fantasy_tick()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; locked int := 0; scored int := 0; live int := 0; ids int[];
begin
  perform private.fantasy_ensure_matchdays();
  -- Fixtures for the matchdays within reach (the next two and anything still running).
  select array_agg(id) into ids from (
    select id from public.fantasy_matchdays where window_end > now() - interval '3 hours' and window_start < now() + interval '14 days' order by window_start limit 3) x;
  perform private.fantasy_request_fixtures(ids);
  for r in select id from public.fantasy_matchdays where status = 'upcoming' and deadline <= now() loop
    perform private.fantasy_lock_matchday(r.id);
    locked := locked + 1;
  end loop;
  for r in select id from public.fantasy_matchdays where status in ('locked', 'live') and window_start <= now() and window_end > now() loop
    perform private.fantasy_score(r.id, false);
    live := live + 1;
  end loop;
  for r in select id from public.fantasy_matchdays m where status in ('locked', 'live') and window_end <= now()
             and (not exists (select 1 from public.fantasy_fixtures f where f.matchday_id = m.id and f.status <> 'finished') or window_end < now() - interval '3 hours') loop
    perform private.fantasy_score(r.id, true);
    scored := scored + 1;
  end loop;
  return jsonb_build_object('locked', locked, 'live', live, 'scored', scored);
end $$;
revoke all on function public.fantasy_tick() from public;
select cron.schedule('fantasy-tick', '*/10 * * * *', 'select public.fantasy_tick()')
 where not exists (select 1 from cron.job where jobname = 'fantasy-tick');
select private.fantasy_ensure_matchdays();

-- ---------------------------------------------------------------------------
-- What the app reads
-- ---------------------------------------------------------------------------
-- The matchday to play (or the one running / just finished), with my line-up.
create or replace function public.fantasy_matchday(p_md int default null)
returns table (
  id int, number int, window_start timestamptz, window_end timestamptz, deadline timestamptz, international boolean, status text,
  cup_name text, season_name text, budget numeric, fixtures int,
  lineup jsonb, chips_used text[], previous_id int, next_id int, players int, rank int
)
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as id),
  md as (select * from public.fantasy_matchdays where id = coalesce(p_md, private.fantasy_current_matchday()))
  select md.id, md.number, md.window_start, md.window_end, md.deadline, md.international, md.status,
         c.name, s.name, (select budget from private.fantasy_md_policy()),
         (select count(*)::int from public.fantasy_fixtures f where f.matchday_id = md.id),
         (select to_jsonb(l) - 'user_id' from public.fantasy_lineups l, me where l.user_id = me.id and l.matchday_id = md.id),
         (select coalesce(array_agg(cu.chip), '{}') from public.fantasy_chips_used cu, me where cu.user_id = me.id and cu.season_id = md.season_id and cu.matchday_id <> md.id),
         (select m2.id from public.fantasy_matchdays m2 where m2.window_start < md.window_start order by m2.window_start desc limit 1),
         (select m2.id from public.fantasy_matchdays m2 where m2.window_start > md.window_start order by m2.window_start limit 1),
         (select count(*)::int from public.fantasy_lineups l where l.matchday_id = md.id and l.locked),
         (select r.rank::int from (select l.user_id, rank() over (order by l.points desc) from public.fantasy_lineups l where l.matchday_id = md.id and l.locked) r, me where r.user_id = me.id)
    from md join public.fantasy_cups c on c.id = md.cup_id join public.fantasy_seasons s on s.id = md.season_id
$$;
revoke all on function public.fantasy_matchday(int) from public;
grant execute on function public.fantasy_matchday(int) to anon, authenticated;

-- The matchday's fixtures.
create or replace function public.fantasy_fixtures(p_md int)
returns table (id bigint, competition text, home_club_id text, away_club_id text, home_name text, away_name text, kickoff timestamptz, status text, home_goals int, away_goals int, home_image text, away_image text)
language sql stable security definer set search_path = '' as $$
  select f.id, f.competition, f.home_club_id, f.away_club_id, f.home_name, f.away_name, f.kickoff, f.status, f.home_goals, f.away_goals,
         (select k.image_path from public.kits k where k.club_id = f.home_club_id and k.kind = 'home' and k.image_path is not null order by k.season_year desc limit 1),
         (select k.image_path from public.kits k where k.club_id = f.away_club_id and k.kind = 'home' and k.image_path is not null order by k.season_year desc limit 1)
    from public.fantasy_fixtures f where f.matchday_id = p_md order by f.kickoff, f.id
$$;
revoke all on function public.fantasy_fixtures(int) from public;
grant execute on function public.fantasy_fixtures(int) to anon, authenticated;

-- My cards as squad candidates: value, club, whether the club plays this matchday.
create or replace function public.fantasy_squad_cards(p_md int)
returns table (kit_id uuid, club_id text, club_name text, league text, season text, kind text, variant text, image_path text, rarity text, gold boolean, verified boolean, photo_path text, thumb_path text, value numeric, plays boolean, is_national boolean)
language sql stable security definer set search_path = '' as $$
  select c.kit_id, c.club_id, c.club_name, cl.league, c.season, c.kind, c.variant, c.image_path, c.rarity, c.gold, c.verified, c.photo_path, c.thumb_path,
         private.fantasy_kit_value(k),
         exists (select 1 from public.fantasy_fixtures f where f.matchday_id = p_md and (f.home_club_id = c.club_id or f.away_club_id = c.club_id)),
         cl.league = 'National Teams'
    from public.fantasy_my_cards() c join public.kits k on k.id = c.kit_id join public.kit_clubs cl on cl.id = c.club_id
   order by c.gold desc, private.fantasy_kit_value(k) desc
$$;
revoke all on function public.fantasy_squad_cards(int) from public;
grant execute on function public.fantasy_squad_cards(int) to authenticated;

-- A line-up's cards with their points (mine, or anyone's once locked).
create or replace function public.fantasy_lineup_cards(p_md int, p_user uuid default null)
returns table (kit_id uuid, club_id text, club_name text, season text, kind text, variant text, image_path text, rarity text, gold boolean, captain boolean, played boolean, base int, multiplier numeric, total int, detail jsonb, value numeric)
language sql stable security definer set search_path = '' as $$
  with l as (select * from public.fantasy_lineups where matchday_id = p_md and user_id = coalesce(p_user, (select auth.uid())) and (locked or user_id = (select auth.uid())))
  select k.id, k.club_id, c.name, k.season, k.kind, k.variant, k.image_path, k.rarity, l.golds[x.ord], k.id = l.captain,
         coalesce(s.played, false), coalesce(s.base, 0), coalesce(s.multiplier, 1), coalesce(s.total, 0), coalesce(s.detail, '{}'::jsonb), private.fantasy_kit_value(k)
    from l
    cross join lateral unnest(l.kits) with ordinality x (kit_id, ord)
    join public.kits k on k.id = x.kit_id
    join public.kit_clubs c on c.id = k.club_id
    left join public.fantasy_card_scores s on s.user_id = l.user_id and s.matchday_id = p_md and s.kit_id = k.id
   order by x.ord
$$;
revoke all on function public.fantasy_lineup_cards(int, uuid) from public;
grant execute on function public.fantasy_lineup_cards(int, uuid) to anon, authenticated;

-- The matchday's table: everyone who played, best first (Manager of the Matchday on top).
create or replace function public.fantasy_matchday_table(p_md int, p_limit int default 50)
returns table (user_id uuid, handle text, avatar text, points int, pred_points int, captain_name text, is_me boolean)
language sql stable security definer set search_path = '' as $$
  select l.user_id, p.handle, p.avatar, l.points, l.pred_points,
         (select c.name || ' ' || k.season from public.kits k join public.kit_clubs c on c.id = k.club_id where k.id = l.captain),
         l.user_id = (select auth.uid())
    from public.fantasy_lineups l join public.profiles p on p.id = l.user_id
   where l.matchday_id = p_md and l.locked
   order by l.points desc, l.updated_at
   limit p_limit
$$;
revoke all on function public.fantasy_matchday_table(int, int) from public;
grant execute on function public.fantasy_matchday_table(int, int) to anon, authenticated;
