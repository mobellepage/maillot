-- Fantasy becomes the squad game. Each manager builds a squad of eight
-- jerseys — clubs, represented by their current-season kit — for 100 M,
-- at most two from one league, and lines up five of them every Gameweek
-- (three on the bench). The deadline is Friday 18:00 Swiss time, so no
-- league's early kick-off is missed; the window runs until Tuesday morning.
-- A club scores its real results that weekend: win 3, draw 1, defeat 0.
-- The captain counts double — and only a club whose shirt the manager owns
-- can be captain. One free transfer a Gameweek (unused ones roll over, five
-- at most), every further one costs 4 points. Three chips a season: Bench
-- Boost, Wildcard, Free Hit. Prices move with form: over-performers rise,
-- under-performers fall. Nations may only be bought for an international
-- Gameweek, and only when they actually play.
--
-- The card game (packs, Kit Points, missions, albums, the shop) is gone;
-- leagues, cups, divisions, prizes and notifications stay.

-- ---------------------------------------------------------------------------
-- Out with the card game
-- ---------------------------------------------------------------------------
drop trigger if exists fantasy_play_daily on public.daily_game_results;
drop trigger if exists fantasy_wishlist_add on public.kit_likes;
drop trigger if exists fantasy_like_shirt on public.item_likes;
drop trigger if exists fantasy_follow on public.follows;
drop trigger if exists fantasy_cards_albums on public.fantasy_cards;
drop trigger if exists fantasy_item_albums on public.custom_items;
drop trigger if exists kits_rarity on public.kits;
drop function if exists
  public.fantasy_state(), public.fantasy_open_pack(boolean), public.fantasy_convert_duplicates(uuid), public.fantasy_event(text),
  public.fantasy_my_cards(), public.fantasy_gold_todo(), public.fantasy_odds(), public.fantasy_albums(), public.fantasy_album(text),
  public.fantasy_shop(), public.fantasy_buy_card(uuid), public.fantasy_admin_set_rarity(uuid, text), public.fantasy_squad_cards(int),
  public.fantasy_lineup_cards(int, uuid), public.fantasy_save_lineup(int, uuid[], uuid, text, bigint, int, int),
  public.fantasy_matchday(int), public.fantasy_matchday_table(int, int), public.fantasy_public_profile(text);
drop function if exists
  private.fantasy_policy(), private.fantasy_rarity(int, text, boolean), private.kits_set_rarity(), private.fantasy_day(), private.fantasy_player(uuid),
  private.fantasy_add_points(uuid, int, text, text), private.fantasy_assign_missions(uuid), private.fantasy_mission_event(uuid, text),
  private.fantasy_draw(uuid, text), private.fantasy_pick_rarity(), private.fantasy_gold_ok(public.custom_items), private.fantasy_owned_kits(uuid),
  private.fantasy_check_albums(uuid), private.fantasy_shop_policy(), private.fantasy_week(), private.fantasy_shop_kits(date),
  private.fantasy_cards_added(), private.fantasy_item_changed(), private.fantasy_on_event(), private.fantasy_on_follow(),
  private.fantasy_kit_value(public.kits), private.fantasy_md_policy(), private.fantasy_club_result(text, int, boolean),
  private.fantasy_score(int, boolean), private.fantasy_lock_matchday(int);
drop table if exists
  public.fantasy_card_scores, public.fantasy_lineups, public.fantasy_daily_missions, public.fantasy_missions, public.fantasy_album_done,
  public.fantasy_album_slots, public.fantasy_albums, public.fantasy_shop_buys, public.fantasy_packs, public.fantasy_points_ledger,
  public.fantasy_cards, public.fantasy_players cascade;
alter table public.kits drop column if exists rarity;

-- The game starts over: nothing played yet counts (the first Gameweek is this Friday).
truncate public.fantasy_fixtures, public.fantasy_h2h, public.fantasy_standings, public.fantasy_division_members, public.fantasy_divisions,
  public.fantasy_chips_used, public.fantasy_badges, public.fantasy_prizes, public.fantasy_matchdays, private.fantasy_notified;
delete from public.notifications where type like 'fantasy_%';
insert into private.app_settings (key, value) values ('fantasy_start', '2026-10-23') on conflict (key) do update set value = excluded.value;

-- Prizes are shirts and vouchers now (Kit Points no longer exist).
update public.fantasy_prize_pool set active = false where type = 'points';

-- ---------------------------------------------------------------------------
-- Policy (src/config/fantasy.ts mirrors it)
-- ---------------------------------------------------------------------------
create or replace function private.fantasy_md_policy()
returns table (
  squad_size int, starters int, budget numeric, max_per_league int,
  free_transfers_max int, hit_points int,
  win int, draw int, captain_mult int,
  window_hours int, international_every int,
  price_min numeric, price_max numeric
)
language sql immutable as $$
  select 8, 5, 100, 2,
         5, 4,
         3, 1, 2,
         84, 5,
         3, 30
$$;

-- The season's start year: a jersey must be of this season (2026 → 2026/27, nations' 2026).
create or replace function private.fantasy_season_year()
returns int language sql stable set search_path = '' as $$
  select case when extract(month from current_date) >= 8 then extract(year from current_date) else extract(year from current_date) - 1 end::int
$$;

-- A club's jersey this season: its current kit with a picture (home first).
create or replace function private.fantasy_jersey(p_club text)
returns table (kit_id uuid, season text, kind text, image_path text)
language sql stable set search_path = '' as $$
  select k.id, k.season, k.kind, k.image_path from public.kits k
   where k.club_id = p_club and k.season_year = private.fantasy_season_year() and k.image_path is not null and coalesce(k.status, '') <> 'rejected'
   order by case k.kind when 'home' then 0 when 'away' then 1 when 'third' then 2 else 3 end, k.id
   limit 1
$$;

create or replace function private.fantasy_pickable(c public.kit_clubs)
returns boolean language sql stable set search_path = '' as $$
  select private.fantasy_pool_club(c) and exists (select 1 from private.fantasy_jersey(c.id))
$$;

-- The clubs whose shirt a member owns (any season): captains come from here.
create or replace function private.fantasy_owned_clubs(p_user uuid)
returns setof text language sql stable set search_path = '' as $$
  select distinct k.club_id from public.custom_items ci join public.kits k on k.id = private.fantasy_item_kit(ci) where ci.user_id = p_user
$$;

-- ---------------------------------------------------------------------------
-- Prices (M), moving with form
-- ---------------------------------------------------------------------------
create table if not exists public.fantasy_club_prices (
  club_id text primary key references public.kit_clubs (id) on delete cascade,
  price numeric not null,
  base_price numeric not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.fantasy_price_moves (
  id bigserial primary key,
  club_id text not null references public.kit_clubs (id) on delete cascade,
  matchday_id int not null references public.fantasy_matchdays (id) on delete cascade,
  delta numeric not null,
  price numeric not null,
  created_at timestamptz not null default now(),
  unique (club_id, matchday_id)
);
create index if not exists fantasy_price_moves_md on public.fantasy_price_moves (matchday_id);
alter table public.fantasy_club_prices enable row level security;
alter table public.fantasy_price_moves enable row level security;
create policy fantasy_club_prices_read on public.fantasy_club_prices for select to anon, authenticated using (true);
create policy fantasy_price_moves_read on public.fantasy_price_moves for select to anon, authenticated using (true);
grant select on public.fantasy_club_prices, public.fantasy_price_moves to anon, authenticated;

-- The starting prices: the big clubs of the big leagues are dear (five of
-- them don't fit in 100 M), the rest of those leagues in the middle, the
-- other leagues and the nations cheaper. Unlisted clubs get a floor price.
insert into public.fantasy_club_prices (club_id, price, base_price)
select v.id, v.p, v.p from (values
  ('man-city', 22), ('real-madrid', 22), ('bayern', 22), ('barcelona', 21), ('psg', 21), ('liverpool', 21), ('arsenal', 21), ('inter', 20),
  ('chelsea', 18), ('napoli', 18), ('atletico', 17), ('dortmund', 17), ('juventus', 17), ('milan', 17), ('leverkusen', 16),
  ('tottenham', 15), ('atalanta', 15), ('roma', 15), ('leipzig', 15), ('man-united', 14), ('newcastle', 14), ('marseille', 14), ('monaco', 14), ('frankfurt', 14),
  ('aston-villa', 13), ('athletic', 13), ('villarreal', 13), ('lazio', 13), ('lyon', 13), ('lille', 13), ('stuttgart', 13),
  ('real-sociedad', 12), ('betis', 12), ('fiorentina', 12), ('bologna', 12),
  ('brighton', 11), ('nottingham-forest', 11), ('sevilla', 11), ('nice', 11), ('lens', 11), ('rennes', 11), ('freiburg', 11),
  ('crystal-palace', 10), ('west-ham', 10), ('fulham', 10), ('bournemouth', 10), ('strasbourg', 10),
  ('everton', 9), ('brentford', 9), ('celta', 9), ('girona', 9), ('valencia', 9), ('torino', 9), ('como', 9), ('brest', 9), ('gladbach', 9), ('wolfsburg', 9), ('hoffenheim', 9), ('bremen', 9), ('mainz', 9),
  ('wolves', 8), ('leeds', 8), ('osasuna', 8), ('getafe', 8), ('rayo', 8), ('espanyol', 8), ('mallorca', 8), ('udinese', 8), ('genoa', 8), ('toulouse', 8), ('union-berlin', 8), ('augsburg', 8), ('koeln', 8), ('hamburg', 8),
  ('alaves', 7), ('parma', 7), ('cagliari', 7), ('sassuolo', 7), ('nantes', 7), ('auxerre', 7), ('st-pauli', 7),
  ('burnley', 6), ('sunderland', 6), ('elche', 6), ('levante', 6), ('verona', 6), ('lecce', 6), ('angers', 6), ('lorient', 6), ('le-havre', 6), ('paris-fc', 6), ('heidenheim', 6),
  ('oviedo', 5), ('cremonese', 5), ('pisa', 5), ('metz', 5),
  ('ajax', 12), ('psv', 12), ('feyenoord', 11), ('az-alkmaar', 9), ('twente', 8), ('utrecht', 8),
  ('benfica', 13), ('porto', 13), ('sporting', 13), ('braga', 9), ('vitoria-guimaraes', 7),
  ('galatasaray', 13), ('fenerbahce', 13), ('besiktas', 10), ('trabzonspor', 8), ('basaksehir', 6),
  ('young-boys', 10), ('basel', 10), ('servette', 8), ('lugano', 8), ('zurich', 8), ('st-gallen', 8), ('luzern', 7), ('lausanne', 7), ('sion', 6), ('thun', 6), ('grasshoppers', 6), ('winterthur', 5),
  ('france', 16), ('spain', 16), ('argentina', 16), ('england', 15), ('brazil', 15), ('germany', 14), ('portugal', 14), ('netherlands', 13), ('italy', 13), ('belgium', 11),
  ('switzerland', 10), ('croatia', 10), ('morocco', 10), ('uruguay', 10), ('colombia', 9), ('usa', 8), ('mexico', 8), ('japan', 8), ('senegal', 8), ('denmark', 8), ('austria', 8), ('turkiye', 8), ('nigeria', 7)
) v (id, p)
where exists (select 1 from public.kit_clubs c where c.id = v.id)
on conflict (club_id) do nothing;
insert into public.fantasy_club_prices (club_id, price, base_price)
select c.id, case when c.league = 'National Teams' then 6 when c.top5 then 5 else 4.5 end, case when c.league = 'National Teams' then 6 when c.top5 then 5 else 4.5 end
  from public.kit_clubs c where private.fantasy_pool_club(c)
on conflict (club_id) do nothing;

create or replace function private.fantasy_club_price(p_club text)
returns numeric language sql stable set search_path = '' as $$
  select coalesce((select price from public.fantasy_club_prices where club_id = p_club), 5)
$$;

-- ---------------------------------------------------------------------------
-- Squads and line-ups
-- ---------------------------------------------------------------------------
create table if not exists public.fantasy_squads (
  user_id uuid primary key references auth.users (id) on delete cascade,
  season_id int not null references public.fantasy_seasons (id),
  clubs text[] not null default '{}',           -- the eight, as they stand now
  bank numeric not null default 100,            -- what's left of the budget now
  locked_clubs text[] not null default '{}',    -- the squad at the last deadline (transfers count against it)
  bank_locked numeric not null default 100,
  free_transfers int not null default 1,
  first_locked_md int references public.fantasy_matchdays (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fantasy_squads_season on public.fantasy_squads (season_id);
create index if not exists fantasy_squads_first_md on public.fantasy_squads (first_locked_md);
create table if not exists public.fantasy_lineups (
  user_id uuid not null references auth.users (id) on delete cascade,
  matchday_id int not null references public.fantasy_matchdays (id) on delete cascade,
  clubs text[] not null default '{}',           -- the squad at the deadline
  starters text[] not null default '{}',        -- five of them
  bench text[] not null default '{}',           -- the other three
  captain text,
  chip text check (chip in ('bench_boost', 'wildcard', 'free_hit')),
  transfers int not null default 0,
  hits int not null default 0,
  points int not null default 0,
  locked boolean not null default false,
  carried boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, matchday_id)
);
create index if not exists fantasy_lineups_md on public.fantasy_lineups (matchday_id, points desc);
create table if not exists public.fantasy_club_scores (
  user_id uuid not null,
  matchday_id int not null,
  club_id text not null,
  starter boolean not null default true,
  captain boolean not null default false,
  played boolean not null default false,
  base int not null default 0,
  multiplier int not null default 1,
  total int not null default 0,
  detail jsonb not null default '{}'::jsonb,
  primary key (user_id, matchday_id, club_id),
  foreign key (user_id, matchday_id) references public.fantasy_lineups (user_id, matchday_id) on delete cascade
);
alter table public.fantasy_squads enable row level security;
alter table public.fantasy_lineups enable row level security;
alter table public.fantasy_club_scores enable row level security;
create policy fantasy_squads_own on public.fantasy_squads for select to authenticated using (user_id = (select auth.uid()));
create policy fantasy_lineups_read on public.fantasy_lineups for select to anon, authenticated using (locked or user_id = (select auth.uid()));
create policy fantasy_club_scores_read on public.fantasy_club_scores for select to anon, authenticated using (true);
grant select on public.fantasy_squads to authenticated;
grant select on public.fantasy_lineups, public.fantasy_club_scores to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Calendar: a Gameweek runs from Friday 18:00 Swiss time (the deadline) to
-- Tuesday morning, so every league's weekend counts, early or late.
-- ---------------------------------------------------------------------------
create or replace function private.fantasy_ensure_matchdays()
returns void language plpgsql set search_path = '' as $$
declare
  pol record;
  fri date;
  d date;
  ws timestamptz;
  first_day date := (select value::date from private.app_settings where key = 'fantasy_start');
  sid int; cid int; n int;
begin
  select * into pol from private.fantasy_md_policy();
  -- The coming Friday (today if Friday).
  fri := current_date + ((5 - extract(dow from current_date)::int + 7) % 7);
  for i in 0..7 loop
    d := fri + i * 7;
    if first_day is not null and d < first_day then continue; end if;
    ws := (d::timestamp + interval '18 hours') at time zone 'Europe/Zurich';
    if exists (select 1 from public.fantasy_matchdays where window_start = ws) then continue; end if;
    sid := private.fantasy_season_for(d);
    cid := private.fantasy_cup_for(d);
    select coalesce(max(number), 0) + 1 into n from public.fantasy_matchdays where season_id = sid;
    insert into public.fantasy_matchdays (season_id, cup_id, number, window_start, window_end, deadline, international)
    values (sid, cid, n, ws, ws + make_interval(hours => pol.window_hours), ws, n % pol.international_every = 0);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Rules, checked in one place
-- ---------------------------------------------------------------------------
-- Does this club have a match in the Gameweek?
create or replace function private.fantasy_club_plays(p_club text, p_md int)
returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.fantasy_fixtures f where f.matchday_id = p_md and (f.home_club_id = p_club or f.away_club_id = p_club))
$$;

-- A squad of eight: pickable clubs, two per league at most, nations only
-- bought for an international Gameweek in which they play.
create or replace function private.fantasy_check_squad(p_clubs text[], p_added text[], p_md int)
returns void language plpgsql stable set search_path = '' as $$
declare pol record; md public.fantasy_matchdays; bad text;
begin
  select * into pol from private.fantasy_md_policy();
  select * into md from public.fantasy_matchdays where id = p_md;
  if coalesce(array_length(p_clubs, 1), 0) <> pol.squad_size or (select count(distinct c) from unnest(p_clubs) c) <> pol.squad_size then
    raise exception 'squad_size' using errcode = 'P0471';
  end if;
  select x.c into bad from unnest(p_clubs) x (c) left join public.kit_clubs k on k.id = x.c where k.id is null or not private.fantasy_pickable(k) limit 1;
  if bad is not null then raise exception 'club_not_pickable: %', bad using errcode = 'P0473'; end if;
  select k.league into bad from unnest(p_clubs) x (c) join public.kit_clubs k on k.id = x.c
   where k.league <> 'National Teams' group by k.league having count(*) > pol.max_per_league limit 1;
  if bad is not null then raise exception 'league_limit: %', bad using errcode = 'P0477'; end if;
  select x.c into bad from unnest(p_added) x (c) join public.kit_clubs k on k.id = x.c
   where k.league = 'National Teams' and (not md.international or not private.fantasy_club_plays(x.c, p_md)) limit 1;
  if bad is not null then raise exception 'national_not_playing: %', bad using errcode = 'P0478'; end if;
end $$;

-- Five starters out of the squad: nations only when they play this Gameweek.
create or replace function private.fantasy_check_starters(p_clubs text[], p_starters text[], p_md int)
returns void language plpgsql stable set search_path = '' as $$
declare pol record; md public.fantasy_matchdays; bad text;
begin
  select * into pol from private.fantasy_md_policy();
  select * into md from public.fantasy_matchdays where id = p_md;
  if coalesce(array_length(p_starters, 1), 0) <> pol.starters or (select count(distinct c) from unnest(p_starters) c) <> pol.starters or not (p_starters <@ p_clubs) then
    raise exception 'lineup_size' using errcode = 'P0471';
  end if;
  select x.c into bad from unnest(p_starters) x (c) join public.kit_clubs k on k.id = x.c
   where k.league = 'National Teams' and (not md.international or not private.fantasy_club_plays(x.c, p_md)) limit 1;
  if bad is not null then raise exception 'national_not_playing: %', bad using errcode = 'P0478'; end if;
end $$;

-- The line-up the game picks when the manager hasn't: the clubs that play,
-- dearest first; the captain the dearest starter whose shirt they own.
create or replace function private.fantasy_auto_lineup(p_user uuid, p_md int, p_clubs text[])
returns table (starters text[], captain text)
language sql stable set search_path = '' as $$
  with md as (select * from public.fantasy_matchdays where id = p_md),
  ranked as (
    select x.c, k.league = 'National Teams' nat, private.fantasy_club_plays(x.c, p_md) plays, private.fantasy_club_price(x.c) price
      from unnest(p_clubs) x (c) join public.kit_clubs k on k.id = x.c
  ),
  picked as (
    select c, price from ranked, md
     where not (nat and not (md.international and plays))
     order by plays desc, price desc limit (select starters from private.fantasy_md_policy())
  )
  select (select array_agg(c order by price desc) from picked),
         (select c from picked where c in (select private.fantasy_owned_clubs(p_user)) order by price desc limit 1)
$$;

-- What the transfers of the Gameweek cost: the ones beyond the free ones, unless a chip is played.
create or replace function private.fantasy_hits(p_transfers int, p_free int, p_chip text, p_first_locked boolean)
returns int language sql immutable as $$
  select case when not p_first_locked or p_chip in ('wildcard', 'free_hit') then 0
              else greatest(0, p_transfers - p_free) * (select hit_points from private.fantasy_md_policy()) end
$$;

-- The line-up row of a Gameweek, made from the previous one or from scratch when missing.
create or replace function private.fantasy_ensure_lineup(p_user uuid, p_md int)
returns public.fantasy_lineups language plpgsql set search_path = '' as $$
declare sq public.fantasy_squads; l public.fantasy_lineups; prev public.fantasy_lineups; auto record; st text[]; cap text; md public.fantasy_matchdays;
begin
  select * into l from public.fantasy_lineups where user_id = p_user and matchday_id = p_md;
  if l.user_id is not null then return l; end if;
  select * into sq from public.fantasy_squads where user_id = p_user;
  select * into md from public.fantasy_matchdays where id = p_md;
  select x.* into prev from public.fantasy_lineups x join public.fantasy_matchdays m on m.id = x.matchday_id
   where x.user_id = p_user and m.window_start < md.window_start order by m.window_start desc limit 1;
  -- Last week's five, if they are all still in the squad and allowed this week; else the game's pick.
  if prev.user_id is not null and prev.starters <@ sq.clubs then
    begin
      perform private.fantasy_check_starters(sq.clubs, prev.starters, p_md);
      st := prev.starters;
      cap := case when prev.captain = any (st) and prev.captain in (select private.fantasy_owned_clubs(p_user)) then prev.captain end;
    exception when others then st := null;
    end;
  end if;
  if st is null then
    select * into auto from private.fantasy_auto_lineup(p_user, p_md, sq.clubs);
    st := coalesce(auto.starters, '{}');
    cap := auto.captain;
  end if;
  insert into public.fantasy_lineups (user_id, matchday_id, clubs, starters, bench, captain, carried)
  values (p_user, p_md, sq.clubs, st, (select coalesce(array_agg(c), '{}') from unnest(sq.clubs) c where not (c = any (st))), cap, prev.user_id is not null)
  on conflict (user_id, matchday_id) do nothing;
  select * into l from public.fantasy_lineups where user_id = p_user and matchday_id = p_md;
  return l;
end $$;

-- ---------------------------------------------------------------------------
-- What the manager does: the squad, the line-up, a chip
-- ---------------------------------------------------------------------------
-- The open Gameweek (upcoming, before the deadline; the next one when none is named), or an error.
create or replace function private.fantasy_open_matchday(p_md int)
returns public.fantasy_matchdays language plpgsql stable set search_path = '' as $$
declare md public.fantasy_matchdays;
begin
  select * into md from public.fantasy_matchdays
   where id = coalesce(p_md, (select m.id from public.fantasy_matchdays m where m.status = 'upcoming' and m.deadline > now() order by m.window_start limit 1));
  if md.id is null or md.status <> 'upcoming' or now() >= md.deadline then raise exception 'deadline_passed' using errcode = 'P0470'; end if;
  return md;
end $$;

-- The squad of eight (first build or transfers), for the open Gameweek (the next one when none is named).
-- Errors: P0470 deadline, P0471 size, P0473 not pickable, P0474 over budget, P0477 league limit, P0478 nation not playing.
create or replace function public.fantasy_save_squad(p_clubs text[], p_md int default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  md public.fantasy_matchdays;
  pol record;
  sq public.fantasy_squads;
  l public.fantasy_lineups;
  added text[]; removed text[];
  v_bank numeric; n int; st text[]; cap text; auto record;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.hit('fantasy:squad:' || uid, 120, interval '1 hour');
  select * into pol from private.fantasy_md_policy();
  md := private.fantasy_open_matchday(p_md);
  insert into public.fantasy_squads (user_id, season_id) values (uid, md.season_id) on conflict (user_id) do nothing;
  select * into sq from public.fantasy_squads where user_id = uid for update;
  select coalesce(array_agg(c), '{}') into added from unnest(p_clubs) c where not (c = any (sq.locked_clubs));
  select coalesce(array_agg(c), '{}') into removed from unnest(sq.locked_clubs) c where not (c = any (p_clubs));
  perform private.fantasy_check_squad(p_clubs, added, md.id);
  v_bank := sq.bank_locked
        + coalesce((select sum(private.fantasy_club_price(c)) from unnest(removed) c), 0)
        - coalesce((select sum(private.fantasy_club_price(c)) from unnest(added) c), 0);
  if v_bank < 0 then raise exception 'over_budget' using errcode = 'P0474'; end if;
  n := coalesce(array_length(added, 1), 0);
  update public.fantasy_squads set clubs = p_clubs, bank = v_bank, updated_at = now() where user_id = uid;
  -- The line-up follows the squad: starters that left are replaced by the game's pick.
  l := private.fantasy_ensure_lineup(uid, md.id);
  if not (l.starters <@ p_clubs) or coalesce(array_length(l.starters, 1), 0) <> pol.starters then
    select * into auto from private.fantasy_auto_lineup(uid, md.id, p_clubs);
    st := coalesce(auto.starters, '{}');
    cap := auto.captain;
  else
    st := l.starters;
    cap := case when l.captain = any (st) then l.captain end;
  end if;
  update public.fantasy_lineups
     set clubs = p_clubs, starters = st, bench = (select coalesce(array_agg(c), '{}') from unnest(p_clubs) c where not (c = any (st))), captain = cap,
         transfers = n, hits = private.fantasy_hits(n, sq.free_transfers, l.chip, sq.first_locked_md is not null), carried = false, updated_at = now()
   where user_id = uid and matchday_id = md.id;
end $$;
revoke all on function public.fantasy_save_squad(text[], int) from public;
grant execute on function public.fantasy_save_squad(text[], int) to authenticated;

-- Five starters and the captain (a club whose shirt the manager owns, or none).
-- Errors: P0470 deadline, P0471 size, P0472 captain, P0478 nation not playing, P0479 no squad.
create or replace function public.fantasy_save_lineup(p_md int, p_starters text[], p_captain text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); md public.fantasy_matchdays; sq public.fantasy_squads; pol record;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.hit('fantasy:lineup:' || uid, 120, interval '1 hour');
  select * into pol from private.fantasy_md_policy();
  md := private.fantasy_open_matchday(p_md);
  select * into sq from public.fantasy_squads where user_id = uid;
  if sq.user_id is null or coalesce(array_length(sq.clubs, 1), 0) <> pol.squad_size then raise exception 'no_squad' using errcode = 'P0479'; end if;
  perform private.fantasy_check_starters(sq.clubs, p_starters, md.id);
  if p_captain is not null and (not (p_captain = any (p_starters)) or p_captain not in (select private.fantasy_owned_clubs(uid))) then
    raise exception 'captain_not_owned' using errcode = 'P0472';
  end if;
  perform private.fantasy_ensure_lineup(uid, md.id);
  update public.fantasy_lineups
     set clubs = sq.clubs, starters = p_starters, bench = (select coalesce(array_agg(c), '{}') from unnest(sq.clubs) c where not (c = any (p_starters))),
         captain = p_captain, carried = false, updated_at = now()
   where user_id = uid and matchday_id = md.id;
end $$;
revoke all on function public.fantasy_save_lineup(int, text[], text) from public;
grant execute on function public.fantasy_save_lineup(int, text[], text) to authenticated;

-- A chip for the Gameweek (or none). Wildcard and Free Hit can't be taken
-- back once transfers were made with them. Errors: P0470, P0475 chip used, P0476 chip locked, P0479.
create or replace function public.fantasy_play_chip(p_md int, p_chip text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); md public.fantasy_matchdays; sq public.fantasy_squads; l public.fantasy_lineups;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.hit('fantasy:chip:' || uid, 60, interval '1 hour');
  md := private.fantasy_open_matchday(p_md);
  if p_chip is not null and p_chip not in ('bench_boost', 'wildcard', 'free_hit') then raise exception 'chip' using errcode = 'P0475'; end if;
  select * into sq from public.fantasy_squads where user_id = uid;
  if sq.user_id is null then raise exception 'no_squad' using errcode = 'P0479'; end if;
  if p_chip is not null and exists (select 1 from public.fantasy_chips_used c where c.user_id = uid and c.season_id = md.season_id and c.chip = p_chip and c.matchday_id <> md.id) then
    raise exception 'chip_used' using errcode = 'P0475';
  end if;
  l := private.fantasy_ensure_lineup(uid, md.id);
  if l.chip in ('wildcard', 'free_hit') and p_chip is distinct from l.chip and l.transfers > 0 then raise exception 'chip_locked' using errcode = 'P0476'; end if;
  update public.fantasy_lineups
     set chip = p_chip, hits = private.fantasy_hits(transfers, sq.free_transfers, p_chip, sq.first_locked_md is not null), updated_at = now()
   where user_id = uid and matchday_id = md.id;
  delete from public.fantasy_chips_used where user_id = uid and season_id = md.season_id and matchday_id = md.id and chip is distinct from p_chip;
  if p_chip is not null then
    insert into public.fantasy_chips_used (user_id, season_id, chip, matchday_id) values (uid, md.season_id, p_chip, md.id) on conflict do nothing;
  end if;
end $$;
revoke all on function public.fantasy_play_chip(int, text) from public;
grant execute on function public.fantasy_play_chip(int, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The deadline: every squad plays — a line-up set, carried or picked by the
-- game; the captain must still be owned; transfers are booked and the free
-- ones roll over (two at most); the squad is the yardstick for next week.
-- ---------------------------------------------------------------------------
create or replace function private.fantasy_lock_matchday(p_md int)
returns void language plpgsql set search_path = '' as $$
declare md public.fantasy_matchdays; pol record; sq record; l public.fantasy_lineups; st text[]; cap text; auto record; consumed int; first boolean;
begin
  select * into md from public.fantasy_matchdays where id = p_md for update;
  if md.status <> 'upcoming' then return; end if;
  select * into pol from private.fantasy_md_policy();
  for sq in select * from public.fantasy_squads s where s.season_id = md.season_id and coalesce(array_length(s.clubs, 1), 0) = pol.squad_size loop
    l := private.fantasy_ensure_lineup(sq.user_id, p_md);
    st := l.starters;
    begin
      perform private.fantasy_check_starters(sq.clubs, st, p_md);
    exception when others then st := null;
    end;
    if st is null then
      select * into auto from private.fantasy_auto_lineup(sq.user_id, p_md, sq.clubs);
      st := coalesce(auto.starters, '{}');
    end if;
    cap := case when l.captain = any (st) and l.captain in (select private.fantasy_owned_clubs(sq.user_id)) then l.captain end;
    first := sq.first_locked_md is null;
    update public.fantasy_lineups
       set clubs = sq.clubs, starters = st, bench = (select coalesce(array_agg(c), '{}') from unnest(sq.clubs) c where not (c = any (st))), captain = cap,
           hits = private.fantasy_hits(transfers, sq.free_transfers, chip, not first), locked = true, updated_at = now()
     where user_id = sq.user_id and matchday_id = p_md;
    consumed := case when l.chip in ('wildcard', 'free_hit') then 0 else l.transfers end;
    update public.fantasy_squads
       set locked_clubs = case when l.chip = 'free_hit' then locked_clubs else clubs end,
           bank_locked = case when l.chip = 'free_hit' then bank_locked else bank end,
           free_transfers = case when first then 1 else least(pol.free_transfers_max, greatest(0, free_transfers - consumed) + 1) end,
           first_locked_md = coalesce(first_locked_md, p_md), updated_at = now()
     where user_id = sq.user_id;
  end loop;
  update public.fantasy_matchdays set status = 'locked', locked_at = now() where id = p_md;
  perform private.fantasy_after_locked(p_md);
end $$;

-- ---------------------------------------------------------------------------
-- Scoring: win 3, draw 1, defeat 0 per match; captain ×2; Bench Boost
-- counts the bench; transfer hits come off the total.
-- ---------------------------------------------------------------------------
create or replace function private.fantasy_club_result(p_club text, p_md int, p_final boolean)
returns table (played boolean, points int, matches int, detail jsonb)
language sql stable set search_path = '' as $$
  with pol as (select * from private.fantasy_md_policy()),
  m as (
    select f.id, f.status, f.home_name, f.away_name, f.home_goals, f.away_goals,
           case when f.home_club_id = p_club then f.home_goals else f.away_goals end gf,
           case when f.home_club_id = p_club then f.away_goals else f.home_goals end ga
      from public.fantasy_fixtures f
     where f.matchday_id = p_md and (f.home_club_id = p_club or f.away_club_id = p_club)
       and f.status in ('live', 'finished') and (not p_final or f.status = 'finished')
       and f.home_goals is not null and f.away_goals is not null
  )
  select count(*) > 0,
         coalesce(sum(case when gf > ga then pol.win when gf = ga then pol.draw else 0 end), 0)::int,
         count(*)::int,
         coalesce(jsonb_agg(jsonb_build_object('fixture', id, 'home', home_name, 'away', away_name, 'score', home_goals || '–' || away_goals, 'status', status)), '[]'::jsonb)
    from m, pol
$$;

create or replace function private.fantasy_score(p_md int, p_final boolean)
returns void language plpgsql set search_path = '' as $$
declare pol record; l record; club text; res record; mult int; total int; counts boolean;
begin
  select * into pol from private.fantasy_md_policy();
  for l in select * from public.fantasy_lineups where matchday_id = p_md and locked loop
    total := 0;
    foreach club in array l.clubs loop
      counts := club = any (l.starters) or l.chip = 'bench_boost';
      select * into res from private.fantasy_club_result(club, p_md, p_final);
      mult := case when not counts then 0 when club = l.captain then pol.captain_mult else 1 end;
      insert into public.fantasy_club_scores (user_id, matchday_id, club_id, starter, captain, played, base, multiplier, total, detail)
      values (l.user_id, p_md, club, club = any (l.starters), club is not distinct from l.captain, res.played, res.points, mult, res.points * mult, jsonb_build_object('matches', res.detail, 'chip', l.chip))
      on conflict (user_id, matchday_id, club_id) do update
        set starter = excluded.starter, captain = excluded.captain, played = excluded.played, base = excluded.base, multiplier = excluded.multiplier, total = excluded.total, detail = excluded.detail;
      total := total + res.points * mult;
    end loop;
    update public.fantasy_lineups set points = total - hits where user_id = l.user_id and matchday_id = p_md;
  end loop;
  if p_final then
    update public.fantasy_matchdays set status = 'scored', scored_at = now() where id = p_md;
    perform private.fantasy_move_prices(p_md);
    -- Free Hit: the squad from before the Gameweek comes back.
    update public.fantasy_squads s set clubs = s.locked_clubs, bank = s.bank_locked, updated_at = now()
      from public.fantasy_lineups x where x.user_id = s.user_id and x.matchday_id = p_md and x.chip = 'free_hit';
    perform private.fantasy_after_scored(p_md);
  else
    update public.fantasy_matchdays set status = 'live' where id = p_md and status = 'locked';
    perform private.fantasy_notify_live(p_md);
  end if;
end $$;

-- Prices after a Gameweek: a club that did better than its price promised
-- rises, one that did worse falls (a tenth to six tenths of a million);
-- managers hear about moves in their squad.
create or replace function private.fantasy_move_prices(p_md int)
returns void language plpgsql set search_path = '' as $$
declare pol record; pmin numeric; pmax numeric; c record; res record; expected numeric; delta numeric; np numeric; md public.fantasy_matchdays; r record;
begin
  select * into pol from private.fantasy_md_policy();
  select * into md from public.fantasy_matchdays where id = p_md;
  select min(price), max(price) into pmin, pmax from public.fantasy_club_prices;
  for c in select * from public.fantasy_club_prices p where private.fantasy_club_plays(p.club_id, p_md) loop
    select * into res from private.fantasy_club_result(c.club_id, p_md, true);
    if not res.played or res.matches = 0 then continue; end if;
    expected := 1.0 + 1.5 * (c.price - pmin) / nullif(pmax - pmin, 0);
    delta := round(((res.points::numeric / res.matches) - coalesce(expected, 1.5)) * 0.25, 1);
    delta := greatest(-0.6, least(0.6, delta));
    np := greatest(pol.price_min, least(pol.price_max, c.price + delta));
    delta := np - c.price;
    if delta = 0 then continue; end if;
    update public.fantasy_club_prices set price = np, updated_at = now() where club_id = c.club_id;
    insert into public.fantasy_price_moves (club_id, matchday_id, delta, price) values (c.club_id, p_md, delta, np) on conflict do nothing;
  end loop;
  for r in
    select s.user_id, string_agg(k.name || ' ' || case when m.delta > 0 then '+' else '' end || trim(to_char(m.delta, 'FM0.0')), ' · ' order by abs(m.delta) desc) moves
      from public.fantasy_squads s
      join public.fantasy_price_moves m on m.matchday_id = p_md and m.club_id = any (s.clubs) and abs(m.delta) >= 0.3
      join public.kit_clubs k on k.id = m.club_id
     group by s.user_id
  loop
    perform private.fantasy_notify(r.user_id, 'fantasy_price', 'price:' || p_md || ':' || r.user_id, 'Prices moved in your squad', r.moves || '.',
      jsonb_build_object('link', '/fantasy/squad', 'matchday', md.number, 'moves', r.moves), true);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Notifications: the reminders (no packs, no albums), prizes without points
-- ---------------------------------------------------------------------------
create or replace function private.fantasy_notify_tick()
returns void language plpgsql set search_path = '' as $$
declare md public.fantasy_matchdays; r record; lg record;
begin
  -- Deadline in three hours: every manager who hasn't touched this Gameweek.
  for md in select * from public.fantasy_matchdays where status = 'upcoming' and deadline between now() and now() + interval '3 hours' loop
    for r in
      select s.user_id from public.fantasy_squads s
       where cardinality(s.clubs) = (select squad_size from private.fantasy_md_policy())
         and not exists (select 1 from public.fantasy_lineups l where l.user_id = s.user_id and l.matchday_id = md.id and not l.carried)
    loop
      perform private.fantasy_notify(r.user_id, 'fantasy_deadline', 'deadline:' || md.id, 'Deadline in 3 hours – check your line-up',
        'Gameweek ' || md.number || ' locks at 18:00. Your squad plays as it stands if you do nothing.',
        jsonb_build_object('link', '/fantasy/matchday/' || md.id, 'matchday', md.number));
    end loop;
  end loop;
  -- The cup ends this weekend: where you stand in your leagues.
  for md in select m.* from public.fantasy_matchdays m where m.status = 'upcoming' and m.deadline between now() and now() + interval '3 days'
             and not exists (select 1 from public.fantasy_matchdays m2 where m2.cup_id = m.cup_id and m2.window_start > m.window_start) loop
    for lg in
      select s.user_id, g.name, row_number() over (partition by s.scope_id order by s.h2h_pts desc, s.points desc) rk
        from public.fantasy_standings s join public.fantasy_leagues g on g.id::text = s.scope_id
       where s.scope = 'league' and s.period = md.cup_id::text
    loop
      perform private.fantasy_notify(lg.user_id, 'fantasy_cup_end', 'cupend:' || md.cup_id, 'Cup ends this weekend',
        'You are ' || lg.rk || '. in ' || lg.name || '. Last Gameweek: check your line-up.',
        jsonb_build_object('link', '/fantasy/matchday/' || md.id, 'rank', lg.rk, 'league', lg.name));
    end loop;
  end loop;
end $$;

create or replace function private.fantasy_award_prizes(p_cup int)
returns void language plpgsql set search_path = '' as $$
declare pol record; cup public.fantasy_cups; d record; r record; pz record; lg record; pid uuid;
begin
  select * into pol from private.fantasy_league_policy();
  select * into cup from public.fantasy_cups where id = p_cup;
  for d in select * from public.fantasy_divisions where cup_id = p_cup loop
    for r in
      select s.user_id, row_number() over (order by s.points desc, s.user_id) rk from public.fantasy_standings s
       where s.scope = 'division' and s.scope_id = d.id::text and s.period = p_cup::text
    loop
      for pz in select * from public.fantasy_prize_pool p where p.active and p.scope = 'division' and p.rank = r.rk and (p.cup_id is null or p.cup_id = p_cup) loop
        insert into public.fantasy_prizes (pool_id, cup_id, scope, scope_id, scope_name, rank, winner_id, type, title, value, sponsor_name, sponsor_logo, status)
        values (pz.id, p_cup, 'division', d.id::text, 'Division ' || d.number, r.rk, r.user_id, pz.type, pz.title, pz.value, pz.sponsor_name, pz.sponsor_logo, 'won')
        returning id into pid;
        perform private.fantasy_notify(r.user_id, 'fantasy_prize', 'prize:' || pid, 'You won a prize', pz.title || ' – ' || cup.name || ', ' || 'Division ' || d.number || '.',
          jsonb_build_object('link', '/fantasy/prizes', 'prize', pz.title, 'cup', cup.name));
      end loop;
    end loop;
  end loop;
  for lg in select l.* from public.fantasy_leagues l where (select count(*) from public.fantasy_league_members m where m.league_id = l.id) >= pol.min_league_size_prizes loop
    for r in
      select s.user_id, row_number() over (order by s.h2h_pts desc, s.points desc, s.user_id) rk from public.fantasy_standings s
       where s.scope = 'league' and s.scope_id = lg.id::text and s.period = p_cup::text
    loop
      for pz in select * from public.fantasy_prize_pool p where p.active and p.scope = 'league' and p.rank = r.rk and (p.cup_id is null or p.cup_id = p_cup) loop
        insert into public.fantasy_prizes (pool_id, cup_id, scope, scope_id, scope_name, rank, winner_id, type, title, value, sponsor_name, sponsor_logo, status)
        values (pz.id, p_cup, 'league', lg.id::text, lg.name, r.rk, r.user_id, pz.type, pz.title, pz.value, pz.sponsor_name, pz.sponsor_logo, 'won')
        returning id into pid;
        perform private.fantasy_notify(r.user_id, 'fantasy_prize', 'prize:' || pid, 'You won a prize', pz.title || ' – ' || cup.name || ', ' || lg.name || '.',
          jsonb_build_object('link', '/fantasy/prizes', 'prize', pz.title, 'cup', cup.name));
      end loop;
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- What the app reads
-- ---------------------------------------------------------------------------
-- The Gameweek to play (or the one running / just finished), with my squad and line-up.
create or replace function public.fantasy_matchday(p_md int default null)
returns table (
  id int, number int, window_start timestamptz, window_end timestamptz, deadline timestamptz, international boolean, status text,
  cup_name text, season_name text, budget numeric, fixtures int,
  squad jsonb, lineup jsonb, chips_used text[], previous_id int, next_id int, players int, rank int
)
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as id),
  md as (select * from public.fantasy_matchdays where id = coalesce(p_md, private.fantasy_current_matchday()))
  select md.id, md.number, md.window_start, md.window_end, md.deadline, md.international, md.status,
         c.name, s.name, (select budget from private.fantasy_md_policy()),
         (select count(*)::int from public.fantasy_fixtures f where f.matchday_id = md.id),
         (select jsonb_build_object('clubs', sq.clubs, 'bank', sq.bank, 'free_transfers', sq.free_transfers, 'first_locked', sq.first_locked_md is not null,
                                    'value', (select coalesce(sum(private.fantasy_club_price(x)), 0) from unnest(sq.clubs) x))
            from public.fantasy_squads sq, me where sq.user_id = me.id),
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

-- Every jersey one can buy for a Gameweek: the club, its current kit, the
-- price and its last move, whether it plays, whether I own its shirt, how
-- many squads hold it. Nations appear only for international Gameweeks.
create or replace function public.fantasy_jerseys(p_md int default null)
returns table (club_id text, name text, league text, country text, price numeric, delta numeric, kit_id uuid, season text, kind text, image_path text, plays boolean, fixture text, kickoff timestamptz, is_national boolean, owned boolean, picked_pct int)
language sql stable security definer set search_path = '' as $$
  with md as (select * from public.fantasy_matchdays where id = coalesce(p_md, private.fantasy_current_matchday())),
  me as (select auth.uid() as id),
  n as (select greatest(1, count(*)) n from public.fantasy_squads where cardinality(clubs) = (select squad_size from private.fantasy_md_policy()))
  select c.id, c.name, c.league, c.country, private.fantasy_club_price(c.id),
         (select m.delta from public.fantasy_price_moves m where m.club_id = c.id order by m.created_at desc limit 1),
         j.kit_id, j.season, j.kind, j.image_path,
         f.id is not null, case when f.id is null then null else f.home_name || ' – ' || f.away_name end, f.kickoff,
         c.league = 'National Teams',
         c.id in (select private.fantasy_owned_clubs(me.id)),
         coalesce((select (count(*) * 100 / n.n)::int from public.fantasy_squads s, n where c.id = any (s.clubs) and cardinality(s.clubs) = (select squad_size from private.fantasy_md_policy()) group by n.n), 0)
    from public.kit_clubs c
    cross join md cross join me
    cross join lateral private.fantasy_jersey(c.id) j
    left join lateral (select x.* from public.fantasy_fixtures x where x.matchday_id = md.id and (x.home_club_id = c.id or x.away_club_id = c.id) order by x.kickoff limit 1) f on true
   where private.fantasy_pickable(c) and (c.league <> 'National Teams' or (md.international and f.id is not null))
   order by private.fantasy_club_price(c.id) desc, c.name
$$;
revoke all on function public.fantasy_jerseys(int) from public;
grant execute on function public.fantasy_jerseys(int) to anon, authenticated;

-- My squad for a Gameweek, club by club, with the line-up's flags.
create or replace function public.fantasy_squad_clubs(p_md int default null)
returns table (club_id text, name text, league text, price numeric, delta numeric, kit_id uuid, season text, image_path text, plays boolean, fixture text, kickoff timestamptz, is_national boolean, owned boolean, starter boolean, captain boolean, in_locked boolean)
language sql stable security definer set search_path = '' as $$
  with md as (select * from public.fantasy_matchdays where id = coalesce(p_md, private.fantasy_current_matchday())),
  me as (select auth.uid() as id),
  sq as (select s.* from public.fantasy_squads s, me where s.user_id = me.id),
  l as (select x.* from public.fantasy_lineups x, me, md where x.user_id = me.id and x.matchday_id = md.id)
  select c.id, c.name, c.league, private.fantasy_club_price(c.id),
         (select m.delta from public.fantasy_price_moves m where m.club_id = c.id order by m.created_at desc limit 1),
         j.kit_id, j.season, j.image_path,
         f.id is not null, case when f.id is null then null else f.home_name || ' – ' || f.away_name end, f.kickoff,
         c.league = 'National Teams',
         c.id in (select private.fantasy_owned_clubs(me.id)),
         coalesce(c.id = any (l.starters), false),
         coalesce(c.id = l.captain, false),
         c.id = any (sq.locked_clubs)
    from sq cross join md cross join me
    left join l on true
    cross join lateral unnest(sq.clubs) u (club_id)
    join public.kit_clubs c on c.id = u.club_id
    left join lateral private.fantasy_jersey(c.id) j on true
    left join lateral (select x.* from public.fantasy_fixtures x where x.matchday_id = md.id and (x.home_club_id = c.id or x.away_club_id = c.id) order by x.kickoff limit 1) f on true
   order by private.fantasy_club_price(c.id) desc, c.name
$$;
revoke all on function public.fantasy_squad_clubs(int) from public;
grant execute on function public.fantasy_squad_clubs(int) to authenticated;

-- A line-up's clubs with their points (mine, or anyone's once locked).
create or replace function public.fantasy_lineup_clubs(p_md int, p_user uuid default null)
returns table (club_id text, name text, league text, price numeric, image_path text, starter boolean, captain boolean, played boolean, base int, multiplier int, total int, detail jsonb)
language sql stable security definer set search_path = '' as $$
  with l as (select * from public.fantasy_lineups where matchday_id = p_md and user_id = coalesce(p_user, (select auth.uid())) and (locked or user_id = (select auth.uid())))
  select c.id, c.name, c.league, private.fantasy_club_price(c.id), (select image_path from private.fantasy_jersey(c.id)),
         c.id = any (l.starters), c.id is not distinct from l.captain,
         coalesce(s.played, false), coalesce(s.base, 0), coalesce(s.multiplier, case when c.id = any (l.starters) then 1 else 0 end), coalesce(s.total, 0), coalesce(s.detail, '{}'::jsonb)
    from l
    cross join lateral unnest(l.clubs) u (club_id)
    join public.kit_clubs c on c.id = u.club_id
    left join public.fantasy_club_scores s on s.user_id = l.user_id and s.matchday_id = p_md and s.club_id = c.id
   order by (c.id = any (l.starters)) desc, (c.id is not distinct from l.captain) desc, private.fantasy_club_price(c.id) desc
$$;
revoke all on function public.fantasy_lineup_clubs(int, uuid) from public;
grant execute on function public.fantasy_lineup_clubs(int, uuid) to anon, authenticated;

-- The Gameweek's table: everyone who played, best first.
create or replace function public.fantasy_matchday_table(p_md int, p_limit int default 50)
returns table (user_id uuid, handle text, avatar text, points int, hits int, captain_name text, chip text, is_me boolean)
language sql stable security definer set search_path = '' as $$
  select l.user_id, p.handle, p.avatar, l.points, l.hits, (select c.name from public.kit_clubs c where c.id = l.captain), l.chip, l.user_id = (select auth.uid())
    from public.fantasy_lineups l join public.profiles p on p.id = l.user_id
   where l.matchday_id = p_md and l.locked
   order by l.points desc, l.updated_at
   limit p_limit
$$;
revoke all on function public.fantasy_matchday_table(int, int) from public;
grant execute on function public.fantasy_matchday_table(int, int) to anon, authenticated;

-- The latest price moves (risers and fallers of the last scored Gameweek).
create or replace function public.fantasy_price_moves(p_limit int default 10)
returns table (club_id text, name text, league text, image_path text, delta numeric, price numeric, matchday int)
language sql stable security definer set search_path = '' as $$
  with last as (select m.matchday_id from public.fantasy_price_moves m order by m.created_at desc limit 1)
  select m.club_id, c.name, c.league, (select image_path from private.fantasy_jersey(c.id)), m.delta, m.price, d.number
    from public.fantasy_price_moves m join last on last.matchday_id = m.matchday_id
    join public.kit_clubs c on c.id = m.club_id join public.fantasy_matchdays d on d.id = m.matchday_id
   order by abs(m.delta) desc, m.delta desc
   limit p_limit
$$;
revoke all on function public.fantasy_price_moves(int) from public;
grant execute on function public.fantasy_price_moves(int) to anon, authenticated;

-- The game on a public profile: division, season, best Gameweek, badges, the squad.
create or replace function public.fantasy_public_profile(p_handle text)
returns table (plays boolean, division_number int, season_points int, season_rank int, best_points int, best_matchday int, played int, leagues int, badges jsonb, squad jsonb, squad_value numeric)
language sql stable security definer set search_path = '' as $$
  with who as (select p.id from public.profiles p where lower(p.handle) = lower(p_handle)),
  md as (select m.* from public.fantasy_matchdays m where m.id = private.fantasy_current_matchday()),
  sq as (select s.* from public.fantasy_squads s, who where s.user_id = who.id and s.first_locked_md is not null)
  select exists (select 1 from sq),
         (select d.number from public.fantasy_divisions d join public.fantasy_division_members dm on dm.division_id = d.id, who, md where dm.user_id = who.id and d.cup_id = md.cup_id),
         coalesce((select s.points from public.fantasy_standings s, who, md where s.scope = 'season' and s.scope_id = md.season_id::text and s.user_id = who.id), 0),
         (select r.rn::int from (select s.user_id, row_number() over (order by s.points desc, s.user_id) rn from public.fantasy_standings s, md where s.scope = 'season' and s.scope_id = md.season_id::text) r, who where r.user_id = who.id),
         (select max(l.points) from public.fantasy_lineups l, who where l.user_id = who.id and l.locked),
         (select m.number from public.fantasy_lineups l join public.fantasy_matchdays m on m.id = l.matchday_id, who where l.user_id = who.id and l.locked order by l.points desc limit 1),
         (select count(*)::int from public.fantasy_lineups l, who where l.user_id = who.id and l.locked),
         (select count(*)::int from public.fantasy_league_members m, who where m.user_id = who.id),
         (select coalesce(jsonb_agg(jsonb_build_object('key', b.key, 'data', b.data, 'at', b.earned_at) order by b.earned_at desc), '[]'::jsonb) from public.fantasy_badges b, who where b.user_id = who.id),
         (select coalesce(jsonb_agg(jsonb_build_object('club_id', c.id, 'name', c.name, 'league', c.league, 'price', private.fantasy_club_price(c.id), 'image_path', (select image_path from private.fantasy_jersey(c.id))) order by private.fantasy_club_price(c.id) desc), '[]'::jsonb)
            from sq cross join lateral unnest(sq.locked_clubs) u (club_id) join public.kit_clubs c on c.id = u.club_id),
         (select coalesce(sum(private.fantasy_club_price(x)), 0) from sq cross join lateral unnest(sq.locked_clubs) x)
    from who
$$;
revoke all on function public.fantasy_public_profile(text) from public;
grant execute on function public.fantasy_public_profile(text) to anon, authenticated;

-- Admin: a club's price by hand.
create or replace function public.fantasy_admin_set_price(p_club text, p_price numeric)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  insert into public.fantasy_club_prices (club_id, price, base_price) values (p_club, p_price, p_price)
  on conflict (club_id) do update set price = excluded.price, updated_at = now();
end $$;
revoke all on function public.fantasy_admin_set_price(text, numeric) from public;
grant execute on function public.fantasy_admin_set_price(text, numeric) to authenticated;

-- The calendar starts over with the new windows.
select private.fantasy_ensure_matchdays();
