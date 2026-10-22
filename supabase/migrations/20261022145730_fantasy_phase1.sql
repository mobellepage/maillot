-- Fantasy, phase 1: cards, daily packs, Kit Points and missions.
--
-- A card is a kit of the library. Digital cards come from free packs;
-- a Gold card is one of the member's own shirts (custom_items) linked to a
-- library kit, with their own front photo — never from a pack. Gold is
-- derived live from the collection (fantasy_my_cards), so it follows the
-- shirt: sold or deleted, it's gone; added, it's there.
--
-- Every number lives in private.fantasy_policy() and, for the app,
-- src/config/fantasy.ts — change both together. Nothing here can be bought
-- with money: packs come with time, Kit Points from play.

-- ---------------------------------------------------------------------------
-- Policy
-- ---------------------------------------------------------------------------
create or replace function private.fantasy_policy()
returns table (
  pack_interval interval, pack_stack int, cards_per_pack int,
  odds_common int, odds_rare int, odds_epic int, odds_legendary int,
  dup_common int, dup_rare int, dup_epic int, dup_legendary int,
  extra_pack_cost int, extra_packs_per_day int,
  mission_points int, all_missions_bonus int, streak_bonus int, streak_bonus_max int,
  interest_share numeric, gold_min_level text, missions_per_day int
)
language sql immutable as $$
  select interval '12 hours', 2, 5,
         60, 28, 10, 2,
         5, 15, 40, 120,
         150, 2,
         20, 30, 5, 50,
         0.6, 'self', 3
$$;

-- ---------------------------------------------------------------------------
-- Rarity of every kit: older, special and legends' kits are rarer. Stored so
-- an admin can override one (update kits set rarity = …).
-- ---------------------------------------------------------------------------
create or replace function private.fantasy_rarity(p_year int, p_kind text, p_legend boolean)
returns text language sql immutable as $$
  select case
    when s >= 4 then 'legendary'
    when s = 3 then 'epic'
    when s = 2 then 'rare'
    else 'common' end
  from (
    select (case when p_year < 1980 then 3 when p_year < 1995 then 2 when p_year < 2010 then 1 else 0 end)
         + (case when p_kind in ('special', 'european', 'cup') then 1 else 0 end)
         + (case when p_legend then 2 else 0 end) as s
  ) x
$$;

alter table public.kits add column if not exists rarity text not null default 'common'
  check (rarity in ('common', 'rare', 'epic', 'legendary'));
update public.kits k
   set rarity = private.fantasy_rarity(k.season_year, k.kind, exists (select 1 from public.kit_legends l where l.kit_id = k.id));
create index if not exists kits_rarity on public.kits (rarity) where image_path is not null;

create or replace function private.kits_set_rarity()
returns trigger language plpgsql as $$
begin
  new.rarity := private.fantasy_rarity(new.season_year, new.kind, false);
  return new;
end $$;
drop trigger if exists kits_rarity on public.kits;
create trigger kits_rarity before insert on public.kits
  for each row execute function private.kits_set_rarity();

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
-- One row per player: packs in hand, when the next one comes, Kit Points, streak.
create table if not exists public.fantasy_players (
  user_id uuid primary key references auth.users (id) on delete cascade,
  packs int not null default 1 check (packs >= 0),
  next_pack_at timestamptz,
  points int not null default 0 check (points >= 0),
  streak int not null default 0,
  last_open_day date,
  extra_packs_day date,
  extra_packs int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.fantasy_players enable row level security;
create policy fantasy_players_own_read on public.fantasy_players for select to authenticated using (user_id = (select auth.uid()));
grant select on public.fantasy_players to authenticated;

-- Digital cards (a duplicate is another row).
create table if not exists public.fantasy_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kit_id uuid not null references public.kits (id) on delete cascade,
  source text not null default 'pack' check (source in ('pack', 'shop', 'reward')),
  created_at timestamptz not null default now()
);
create index if not exists fantasy_cards_user_kit on public.fantasy_cards (user_id, kit_id);
alter table public.fantasy_cards enable row level security;
create policy fantasy_cards_own_read on public.fantasy_cards for select to authenticated using (user_id = (select auth.uid()));
grant select on public.fantasy_cards to authenticated;

-- Opened packs (for the history and share pictures).
create table if not exists public.fantasy_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kit_ids uuid[] not null,
  paid_points int not null default 0,
  opened_at timestamptz not null default now()
);
create index if not exists fantasy_packs_user on public.fantasy_packs (user_id, opened_at desc);
alter table public.fantasy_packs enable row level security;
create policy fantasy_packs_own_read on public.fantasy_packs for select to authenticated using (user_id = (select auth.uid()));
grant select on public.fantasy_packs to authenticated;

-- Kit Points, every change with its reason.
create table if not exists public.fantasy_points_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount int not null,
  reason text not null,
  ref text,
  created_at timestamptz not null default now()
);
create index if not exists fantasy_ledger_user on public.fantasy_points_ledger (user_id, created_at desc);
alter table public.fantasy_points_ledger enable row level security;
create policy fantasy_ledger_own_read on public.fantasy_points_ledger for select to authenticated using (user_id = (select auth.uid()));
grant select on public.fantasy_points_ledger to authenticated;

-- The missions there are (admin-editable), and each day's three per player.
create table if not exists public.fantasy_missions (
  key text primary key,
  points int not null,
  -- 'server': the game notices it; 'client': the app reports it (fantasy_event)
  how text not null check (how in ('server', 'client')),
  always boolean not null default false,
  active boolean not null default true,
  sort int not null default 100
);
insert into public.fantasy_missions (key, points, how, always, sort) values
  ('open_pack', 20, 'server', true, 10),
  ('play_daily', 20, 'server', false, 20),
  ('wishlist_add', 20, 'server', false, 30),
  ('like_shirt', 20, 'server', false, 40),
  ('follow_collector', 20, 'server', false, 50),
  ('check_value', 20, 'client', false, 60),
  ('view_library', 20, 'client', false, 70),
  ('visit_market', 20, 'client', false, 80)
on conflict (key) do nothing;
alter table public.fantasy_missions enable row level security;
create policy fantasy_missions_read on public.fantasy_missions for select to anon, authenticated using (true);
grant select on public.fantasy_missions to anon, authenticated;

create table if not exists public.fantasy_daily_missions (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  mission_key text not null references public.fantasy_missions (key),
  done_at timestamptz,
  primary key (user_id, day, mission_key)
);
alter table public.fantasy_daily_missions enable row level security;
create policy fantasy_daily_missions_own_read on public.fantasy_daily_missions for select to authenticated using (user_id = (select auth.uid()));
grant select on public.fantasy_daily_missions to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers (private)
-- ---------------------------------------------------------------------------
-- The game's day: Swiss midnight, like the puzzle.
create or replace function private.fantasy_day()
returns date language sql stable as $$ select (now() at time zone 'Europe/Zurich')::date $$;

-- The player's row, with the packs that came due since the last look.
create or replace function private.fantasy_player(p_user uuid)
returns public.fantasy_players language plpgsql as $$
declare
  pol record;
  pl public.fantasy_players;
begin
  select * into pol from private.fantasy_policy();
  insert into public.fantasy_players (user_id, packs, next_pack_at)
  values (p_user, 1, now() + pol.pack_interval)
  on conflict (user_id) do nothing;
  select * into pl from public.fantasy_players where user_id = p_user for update;
  -- Packs accrue one per interval, up to the stack; full, the clock stops.
  while pl.next_pack_at is not null and pl.next_pack_at <= now() and pl.packs < pol.pack_stack loop
    pl.packs := pl.packs + 1;
    pl.next_pack_at := pl.next_pack_at + pol.pack_interval;
  end loop;
  if pl.packs >= pol.pack_stack then pl.next_pack_at := null; end if;
  -- A new day: the extra-pack counter starts over.
  if pl.extra_packs_day is distinct from private.fantasy_day() then
    pl.extra_packs_day := private.fantasy_day();
    pl.extra_packs := 0;
  end if;
  update public.fantasy_players set packs = pl.packs, next_pack_at = pl.next_pack_at, extra_packs_day = pl.extra_packs_day, extra_packs = pl.extra_packs
   where user_id = p_user;
  return pl;
end $$;

create or replace function private.fantasy_add_points(p_user uuid, p_amount int, p_reason text, p_ref text default null)
returns void language plpgsql as $$
begin
  if p_amount = 0 then return; end if;
  insert into public.fantasy_points_ledger (user_id, amount, reason, ref) values (p_user, p_amount, p_reason, p_ref);
  update public.fantasy_players set points = points + p_amount where user_id = p_user;
end $$;

-- Today's missions for a player: "open your pack" plus two drawn for the day (made once).
create or replace function private.fantasy_assign_missions(p_user uuid)
returns void language plpgsql as $$
declare
  pol record;
  d date := private.fantasy_day();
begin
  select * into pol from private.fantasy_policy();
  if exists (select 1 from public.fantasy_daily_missions where user_id = p_user and day = d) then return; end if;
  insert into public.fantasy_daily_missions (user_id, day, mission_key)
  select p_user, d, key from (
    select key from public.fantasy_missions where active and always
    union all
    (select key from public.fantasy_missions where active and not always
      order by md5(p_user::text || d::text || key)
      limit greatest(0, pol.missions_per_day - (select count(*) from public.fantasy_missions where active and always)))
  ) m
  on conflict do nothing;
end $$;

-- Something happened that may complete one of today's missions.
create or replace function private.fantasy_mission_event(p_user uuid, p_key text)
returns int language plpgsql as $$
declare
  pol record;
  pts int := 0;
  d date := private.fantasy_day();
begin
  if p_user is null then return 0; end if;
  if not exists (select 1 from public.fantasy_players where user_id = p_user) then return 0; end if;
  select * into pol from private.fantasy_policy();
  perform private.fantasy_assign_missions(p_user);
  update public.fantasy_daily_missions dm set done_at = now()
   where dm.user_id = p_user and dm.day = d and dm.mission_key = p_key and dm.done_at is null
  returning (select m.points from public.fantasy_missions m where m.key = dm.mission_key) into pts;
  if pts is null then return 0; end if;
  perform private.fantasy_add_points(p_user, pts, 'mission', p_key);
  -- All three done: a bonus.
  if not exists (select 1 from public.fantasy_daily_missions where user_id = p_user and day = d and done_at is null) then
    perform private.fantasy_add_points(p_user, pol.all_missions_bonus, 'missions_bonus', d::text);
    pts := pts + pol.all_missions_bonus;
  end if;
  return pts;
end $$;

-- Draws one kit of a rarity: from the player's world (their leagues, their
-- clubs) with probability interest_share, else from the featured clubs.
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
     where kit.rarity = p_rarity and kit.image_path is not null and kit.status = 'approved' and c.featured
     order by random() limit 1;
  end if;
  if k is null then
    select kit.id into k from public.kits kit
     where kit.rarity = p_rarity and kit.image_path is not null and kit.status = 'approved'
     order by random() limit 1;
  end if;
  return k;
end $$;

create or replace function private.fantasy_pick_rarity()
returns text language plpgsql as $$
declare
  pol record;
  r numeric := random() * 100;
begin
  select * into pol from private.fantasy_policy();
  if r < pol.odds_legendary then return 'legendary'; end if;
  if r < pol.odds_legendary + pol.odds_epic then return 'epic'; end if;
  if r < pol.odds_legendary + pol.odds_epic + pol.odds_rare then return 'rare'; end if;
  return 'common';
end $$;

-- Which library kit one of the member's shirts is (linked, or via the catalogue model).
create or replace function private.fantasy_item_kit(p_item public.custom_items)
returns uuid language sql stable as $$
  select coalesce(p_item.kit_id, (select k.id from public.kits k where k.catalog_id = p_item.catalog_id limit 1))
$$;

-- Gold: own front photo, a library kit, and the verification the policy asks for.
create or replace function private.fantasy_gold_ok(p_item public.custom_items)
returns boolean language sql stable as $$
  select private.fantasy_item_kit(p_item) is not null
     and coalesce(p_item.photos -> 'front' ->> 'path', p_item.photos -> 'front_studio' ->> 'path') is not null
     and case (select gold_min_level from private.fantasy_policy())
           when 'expert' then p_item.verification ->> 'status' = 'verifiziert' and p_item.verification ->> 'level' = 'expert'
           when 'precheck' then (p_item.verification ->> 'status' = 'verifiziert') or (p_item.precheck ->> 'status' = 'ok')
           else true end
$$;

-- ---------------------------------------------------------------------------
-- What the app calls
-- ---------------------------------------------------------------------------
-- The player's state: packs, clock, points, streak, today's missions, cards by rarity.
create or replace function public.fantasy_state()
returns table (
  packs int, next_pack_at timestamptz, points int, streak int, extra_packs int,
  missions jsonb, cards jsonb, gold int, duplicates int, dup_points int
)
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  pl public.fantasy_players;
  pol record;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.throttle('fantasy', 60, 600);
  select * into pol from private.fantasy_policy();
  pl := private.fantasy_player(uid);
  perform private.fantasy_assign_missions(uid);
  return query
  select pl.packs, pl.next_pack_at, pl.points, pl.streak, pl.extra_packs,
    (select coalesce(jsonb_agg(jsonb_build_object('key', dm.mission_key, 'points', m.points, 'how', m.how, 'done', dm.done_at is not null) order by m.sort), '[]'::jsonb)
       from public.fantasy_daily_missions dm join public.fantasy_missions m on m.key = dm.mission_key
      where dm.user_id = uid and dm.day = private.fantasy_day()),
    (select coalesce(jsonb_object_agg(r, n), '{}'::jsonb) from (
       select k.rarity r, count(distinct c.kit_id) n from public.fantasy_cards c join public.kits k on k.id = c.kit_id where c.user_id = uid group by k.rarity) x),
    (select count(*)::int from public.custom_items ci where ci.user_id = uid and private.fantasy_gold_ok(ci)),
    (select coalesce(sum(n - 1), 0)::int from (select count(*) n from public.fantasy_cards c where c.user_id = uid group by c.kit_id) d where n > 1),
    (select coalesce(sum((n - 1) * case k.rarity when 'legendary' then pol.dup_legendary when 'epic' then pol.dup_epic when 'rare' then pol.dup_rare else pol.dup_common end), 0)::int
       from (select c.kit_id, count(*) n from public.fantasy_cards c where c.user_id = uid group by c.kit_id) d join public.kits k on k.id = d.kit_id where n > 1);
end $$;
revoke all on function public.fantasy_state() from public;
grant execute on function public.fantasy_state() to authenticated;

-- Opens one pack (or, with p_extra, buys one with Kit Points first). Returns the cards drawn.
create or replace function public.fantasy_open_pack(p_extra boolean default false)
returns table (kit_id uuid, club_id text, club_name text, season text, kind text, variant text, image_path text, rarity text, duplicate boolean)
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  pl public.fantasy_players;
  pol record;
  ids uuid[] := '{}';
  k uuid;
  i int;
  d date := private.fantasy_day();
  paid int := 0;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.hit('fantasy:open:' || uid, 40, interval '1 day');
  select * into pol from private.fantasy_policy();
  pl := private.fantasy_player(uid);
  if p_extra then
    if pl.extra_packs >= pol.extra_packs_per_day then raise exception 'extra_pack_limit' using errcode = 'P0460'; end if;
    if pl.points < pol.extra_pack_cost then raise exception 'not_enough_points' using errcode = 'P0461'; end if;
    paid := pol.extra_pack_cost;
    perform private.fantasy_add_points(uid, -paid, 'extra_pack', d::text);
    update public.fantasy_players set extra_packs = extra_packs + 1 where user_id = uid;
  else
    if pl.packs <= 0 then raise exception 'no_pack' using errcode = 'P0462'; end if;
    -- Taking a pack from a full stack starts the clock again.
    update public.fantasy_players
       set packs = packs - 1,
           next_pack_at = coalesce(next_pack_at, now() + pol.pack_interval)
     where user_id = uid;
  end if;
  for i in 1..pol.cards_per_pack loop
    k := private.fantasy_draw(uid, private.fantasy_pick_rarity());
    if k is not null then ids := ids || k; end if;
  end loop;
  insert into public.fantasy_cards (user_id, kit_id, source) select uid, unnest(ids), 'pack';
  insert into public.fantasy_packs (user_id, kit_ids, paid_points) values (uid, ids, paid);
  -- The streak: one open a day keeps it; a missed day resets it. Each day of a streak pays a little more.
  if pl.last_open_day is distinct from d then
    update public.fantasy_players
       set streak = case when last_open_day = d - 1 then streak + 1 else 1 end,
           last_open_day = d
     where user_id = uid
     returning * into pl;
    if pl.streak > 1 then
      perform private.fantasy_add_points(uid, least(pol.streak_bonus_max, pol.streak_bonus * (pl.streak - 1)), 'streak', pl.streak::text);
    end if;
  end if;
  perform private.fantasy_mission_event(uid, 'open_pack');
  -- A card is a duplicate when the player had the kit before this pack, or it came up earlier in the same pack.
  return query
  with drawn as (select x.kit_id, x.ord from unnest(ids) with ordinality as x (kit_id, ord)),
  owned as (select c.kit_id, count(*) n from public.fantasy_cards c where c.user_id = uid and c.kit_id = any (ids) group by c.kit_id),
  in_pack as (select d.kit_id, count(*) n from drawn d group by d.kit_id)
  select kit.id, kit.club_id, c.name, kit.season, kit.kind, kit.variant, kit.image_path, kit.rarity,
         (o.n - ip.n) > 0 or exists (select 1 from drawn d3 where d3.kit_id = kit.id and d3.ord < drawn.ord)
    from drawn
    join public.kits kit on kit.id = drawn.kit_id
    join public.kit_clubs c on c.id = kit.club_id
    join owned o on o.kit_id = kit.id
    join in_pack ip on ip.kit_id = kit.id
   order by drawn.ord;
end $$;
revoke all on function public.fantasy_open_pack(boolean) from public;
grant execute on function public.fantasy_open_pack(boolean) to authenticated;

-- Turns duplicates into Kit Points (all of them, or one kit's). Returns the points.
create or replace function public.fantasy_convert_duplicates(p_kit uuid default null)
returns int language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  pol record;
  total int := 0;
  r record;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.hit('fantasy:convert:' || uid, 60, interval '1 hour');
  select * into pol from private.fantasy_policy();
  for r in
    select c.kit_id, k.rarity, count(*) - 1 as extra
      from public.fantasy_cards c join public.kits k on k.id = c.kit_id
     where c.user_id = uid and (p_kit is null or c.kit_id = p_kit)
     group by c.kit_id, k.rarity having count(*) > 1
  loop
    delete from public.fantasy_cards
     where id in (select id from public.fantasy_cards where user_id = uid and kit_id = r.kit_id order by created_at desc limit r.extra);
    total := total + r.extra * case r.rarity when 'legendary' then pol.dup_legendary when 'epic' then pol.dup_epic when 'rare' then pol.dup_rare else pol.dup_common end;
  end loop;
  perform private.fantasy_add_points(uid, total, 'duplicates', p_kit::text);
  return total;
end $$;
revoke all on function public.fantasy_convert_duplicates(uuid) from public;
grant execute on function public.fantasy_convert_duplicates(uuid) to authenticated;

-- The app reports a mission it noticed (opening a shirt's value, a club page, the market).
create or replace function public.fantasy_event(p_key text)
returns int language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then return 0; end if;
  if not exists (select 1 from public.fantasy_missions where key = p_key and how = 'client' and active) then return 0; end if;
  perform private.hit('fantasy:event:' || uid, 200, interval '1 day');
  return private.fantasy_mission_event(uid, p_key);
end $$;
revoke all on function public.fantasy_event(text) from public;
grant execute on function public.fantasy_event(text) to authenticated;

-- All my cards: digital (with copies) and Gold (from my collection).
create or replace function public.fantasy_my_cards()
returns table (
  kit_id uuid, club_id text, club_name text, season text, season_year int, kind text, variant text, image_path text, rarity text,
  copies int, gold boolean, verified boolean, item_id text, photo_path text, thumb_path text, since timestamptz
)
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as id),
  digital as (
    select c.kit_id, count(*)::int copies, min(c.created_at) since from public.fantasy_cards c, me where c.user_id = me.id group by c.kit_id
  ),
  gold as (
    select distinct on (private.fantasy_item_kit(ci)) private.fantasy_item_kit(ci) kit_id, ci.id item_id,
           coalesce(ci.photos -> 'front_studio' ->> 'path', ci.photos -> 'front' ->> 'path') photo_path,
           coalesce(ci.photos -> 'front_studio' ->> 'thumbPath', ci.photos -> 'front' ->> 'thumbPath') thumb_path,
           (ci.verification ->> 'status' = 'verifiziert') or (ci.precheck ->> 'status' = 'ok') verified,
           ci.created_at since
      from public.custom_items ci, me
     where ci.user_id = me.id and private.fantasy_gold_ok(ci)
     order by private.fantasy_item_kit(ci), ci.created_at
  )
  select k.id, k.club_id, c.name, k.season, k.season_year, k.kind, k.variant, k.image_path, k.rarity,
         coalesce(d.copies, 0), g.kit_id is not null, coalesce(g.verified, false), g.item_id, g.photo_path, g.thumb_path, coalesce(g.since, d.since)
    from public.kits k
    join public.kit_clubs c on c.id = k.club_id
    left join digital d on d.kit_id = k.id
    left join gold g on g.kit_id = k.id
   where d.kit_id is not null or g.kit_id is not null
   order by (g.kit_id is not null) desc, array_position(array['legendary', 'epic', 'rare', 'common'], k.rarity), coalesce(g.since, d.since) desc
$$;
revoke all on function public.fantasy_my_cards() from public;
grant execute on function public.fantasy_my_cards() to authenticated;

-- Shirts of mine that could be Gold but aren't yet — and why (no library kit, no photo).
create or replace function public.fantasy_gold_todo()
returns table (item_id text, name text, needs text)
language sql stable security definer set search_path = '' as $$
  select ci.id,
         coalesce((select cs.name from public.catalog_shirts cs where cs.id = ci.catalog_id), nullif(concat_ws(' ', ci.proposed_club, ci.proposed_season, ci.proposed_variant), '')),
         case when private.fantasy_item_kit(ci) is null then 'kit' else 'photo' end
    from public.custom_items ci
   where ci.user_id = (select auth.uid()) and not private.fantasy_gold_ok(ci)
   order by ci.created_at desc
   limit 50
$$;
revoke all on function public.fantasy_gold_todo() from public;
grant execute on function public.fantasy_gold_todo() to authenticated;

-- Pack odds and duplicate values, for the odds page (public).
create or replace function public.fantasy_odds()
returns table (rarity text, odds int, dup_points int, kits int)
language sql stable security definer set search_path = '' as $$
  select r, o, p, (select count(*)::int from public.kits k where k.rarity = r and k.image_path is not null)
    from private.fantasy_policy() pol,
    lateral (values ('common', pol.odds_common, pol.dup_common), ('rare', pol.odds_rare, pol.dup_rare), ('epic', pol.odds_epic, pol.dup_epic), ('legendary', pol.odds_legendary, pol.dup_legendary)) v (r, o, p)
$$;
revoke all on function public.fantasy_odds() from public;
grant execute on function public.fantasy_odds() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Missions the game notices on its own
-- ---------------------------------------------------------------------------
create or replace function private.fantasy_on_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.fantasy_mission_event(new.user_id, tg_argv[0]);
  return new;
end $$;
drop trigger if exists fantasy_play_daily on public.daily_game_results;
create trigger fantasy_play_daily after insert on public.daily_game_results
  for each row execute function private.fantasy_on_event('play_daily');
drop trigger if exists fantasy_wishlist_add on public.kit_likes;
create trigger fantasy_wishlist_add after insert on public.kit_likes
  for each row execute function private.fantasy_on_event('wishlist_add');
drop trigger if exists fantasy_like_shirt on public.item_likes;
create trigger fantasy_like_shirt after insert on public.item_likes
  for each row execute function private.fantasy_on_event('like_shirt');

create or replace function private.fantasy_on_follow()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.fantasy_mission_event(new.follower_id, 'follow_collector');
  return new;
end $$;
drop trigger if exists fantasy_follow on public.follows;
create trigger fantasy_follow after insert on public.follows
  for each row execute function private.fantasy_on_follow();
