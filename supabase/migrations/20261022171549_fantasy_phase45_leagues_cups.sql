-- Fantasy, phases 4 and 5: friend leagues (classic and head-to-head, invite
-- by code, chat), monthly cups with late-join averages, divisions of ~100
-- with promotion and relegation, the season's prestige ranking. Standings
-- are kept per scope and period and rebuilt by scoring, so nobody is ever
-- "too late": a newcomer gets the average for what they missed.

create or replace function private.fantasy_league_policy()
returns table (max_size int, division_size int, promote_pct int, relegate_pct int, min_league_size_prizes int, chat_max int, top_prizes int)
language sql immutable as $$ select 50, 100, 20, 20, 20, 500, 3 $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.fantasy_leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  format text not null check (format in ('classic', 'h2h')),
  owner_id uuid not null references auth.users (id) on delete cascade,
  invite_code text not null unique,
  is_public boolean not null default false,
  max_size int not null default 50,
  created_at timestamptz not null default now()
);
create table if not exists public.fantasy_league_members (
  league_id uuid not null references public.fantasy_leagues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);
create index if not exists fantasy_league_members_user on public.fantasy_league_members (user_id);
create table if not exists public.fantasy_h2h (
  league_id uuid not null references public.fantasy_leagues (id) on delete cascade,
  matchday_id int not null references public.fantasy_matchdays (id) on delete cascade,
  user_a uuid not null,
  user_b uuid,
  points_a int not null default 0,
  points_b int not null default 0,
  result text check (result in ('a', 'b', 'draw')),
  primary key (league_id, matchday_id, user_a)
);
create table if not exists public.fantasy_league_posts (
  id bigint generated always as identity primary key,
  league_id uuid not null references public.fantasy_leagues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  hidden boolean not null default false,
  reports uuid[] not null default '{}'
);
create index if not exists fantasy_league_posts_league on public.fantasy_league_posts (league_id, created_at desc);
create table if not exists public.fantasy_standings (
  scope text not null check (scope in ('league', 'division', 'overall', 'season')),
  scope_id text not null,
  period text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  points int not null default 0,
  played int not null default 0,
  avg_filled int not null default 0,
  wins int not null default 0,
  draws int not null default 0,
  losses int not null default 0,
  h2h_pts int not null default 0,
  primary key (scope, scope_id, period, user_id)
);
create index if not exists fantasy_standings_rank on public.fantasy_standings (scope, scope_id, period, h2h_pts desc, points desc);
create table if not exists public.fantasy_divisions (
  id serial primary key,
  cup_id int not null references public.fantasy_cups (id) on delete cascade,
  number int not null,
  unique (cup_id, number)
);
create table if not exists public.fantasy_division_members (
  division_id int not null references public.fantasy_divisions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (division_id, user_id)
);
create index if not exists fantasy_division_members_user on public.fantasy_division_members (user_id);

alter table public.fantasy_leagues enable row level security;
alter table public.fantasy_league_members enable row level security;
alter table public.fantasy_h2h enable row level security;
alter table public.fantasy_league_posts enable row level security;
alter table public.fantasy_standings enable row level security;
alter table public.fantasy_divisions enable row level security;
alter table public.fantasy_division_members enable row level security;
create policy fantasy_leagues_read on public.fantasy_leagues for select to anon, authenticated using (true);
create policy fantasy_league_members_read on public.fantasy_league_members for select to anon, authenticated using (true);
create policy fantasy_h2h_read on public.fantasy_h2h for select to anon, authenticated using (true);
create policy fantasy_league_posts_read on public.fantasy_league_posts for select to anon, authenticated using (not hidden);
create policy fantasy_standings_read on public.fantasy_standings for select to anon, authenticated using (true);
create policy fantasy_divisions_read on public.fantasy_divisions for select to anon, authenticated using (true);
create policy fantasy_division_members_read on public.fantasy_division_members for select to anon, authenticated using (true);
grant select on public.fantasy_leagues, public.fantasy_league_members, public.fantasy_h2h, public.fantasy_league_posts, public.fantasy_standings, public.fantasy_divisions, public.fantasy_division_members to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Standings helpers
-- ---------------------------------------------------------------------------
create or replace function private.fantasy_add_standing(p_scope text, p_scope_id text, p_period text, p_user uuid, p_points int, p_avg boolean default false)
returns void language sql as $$
  insert into public.fantasy_standings (scope, scope_id, period, user_id, points, played, avg_filled)
  values (p_scope, p_scope_id, p_period, p_user, p_points, 1, case when p_avg then 1 else 0 end)
  on conflict (scope, scope_id, period, user_id) do update
    set points = public.fantasy_standings.points + excluded.points,
        played = public.fantasy_standings.played + 1,
        avg_filled = public.fantasy_standings.avg_filled + excluded.avg_filled
$$;

-- The average a group scored in a matchday (members with a locked line-up).
create or replace function private.fantasy_avg_points(p_users uuid[], p_md int)
returns int language sql stable as $$
  select coalesce(round(avg(l.points))::int, 0) from public.fantasy_lineups l where l.matchday_id = p_md and l.locked and l.user_id = any (p_users)
$$;

-- ---------------------------------------------------------------------------
-- Leagues
-- ---------------------------------------------------------------------------
create or replace function private.fantasy_invite_code()
returns text language sql volatile as $$
  select upper(substr(translate(encode(extensions.gen_random_bytes(6), 'base64'), '+/=01', 'ABCDE'), 1, 8))
$$;

create or replace function public.fantasy_create_league(p_name text, p_format text, p_public boolean default false)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); lid uuid; code text;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.hit('fantasy:league:' || uid, 5, interval '1 day');
  if p_format not in ('classic', 'h2h') then raise exception 'format' using errcode = 'P0480'; end if;
  loop
    code := private.fantasy_invite_code();
    exit when not exists (select 1 from public.fantasy_leagues where invite_code = code);
  end loop;
  insert into public.fantasy_leagues (name, format, owner_id, invite_code, is_public, max_size)
  values (trim(p_name), p_format, uid, code, p_public, (select max_size from private.fantasy_league_policy()))
  returning id into lid;
  perform public.fantasy_join_league(code);
  return lid;
end $$;
revoke all on function public.fantasy_create_league(text, text, boolean) from public;
grant execute on function public.fantasy_create_league(text, text, boolean) to authenticated;

-- Joining mid-cup: the league's average for every matchday of the cup already scored.
create or replace function public.fantasy_join_league(p_code text)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); lg public.fantasy_leagues; r record; members uuid[]; cup int;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.hit('fantasy:join:' || uid, 20, interval '1 hour');
  select * into lg from public.fantasy_leagues where invite_code = upper(trim(p_code));
  if lg.id is null then raise exception 'league_not_found' using errcode = 'P0481'; end if;
  if exists (select 1 from public.fantasy_league_members where league_id = lg.id and user_id = uid) then return lg.id; end if;
  if (select count(*) from public.fantasy_league_members where league_id = lg.id) >= lg.max_size then raise exception 'league_full' using errcode = 'P0482'; end if;
  select array_agg(user_id) into members from public.fantasy_league_members where league_id = lg.id;
  insert into public.fantasy_league_members (league_id, user_id) values (lg.id, uid);
  if lg.format = 'classic' and members is not null then
    cup := (select m.cup_id from public.fantasy_matchdays m where m.id = private.fantasy_current_matchday());
    for r in select m.id from public.fantasy_matchdays m where m.cup_id = cup and m.status = 'scored' loop
      perform private.fantasy_add_standing('league', lg.id::text, cup::text, uid, private.fantasy_avg_points(members, r.id), true);
    end loop;
  end if;
  return lg.id;
end $$;
revoke all on function public.fantasy_join_league(text) from public;
grant execute on function public.fantasy_join_league(text) to authenticated;

create or replace function public.fantasy_leave_league(p_league uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  delete from public.fantasy_league_members where league_id = p_league and user_id = uid;
  -- The last one out closes the league.
  delete from public.fantasy_leagues l where l.id = p_league and not exists (select 1 from public.fantasy_league_members m where m.league_id = l.id);
  -- An owner who leaves hands the league to the longest-standing member.
  update public.fantasy_leagues l set owner_id = (select m.user_id from public.fantasy_league_members m where m.league_id = l.id order by m.joined_at limit 1)
   where l.id = p_league and l.owner_id = uid;
end $$;
revoke all on function public.fantasy_leave_league(uuid) from public;
grant execute on function public.fantasy_leave_league(uuid) to authenticated;

create or replace function public.fantasy_league_post(p_league uuid, p_body text)
returns bigint language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); pid bigint;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not exists (select 1 from public.fantasy_league_members where league_id = p_league and user_id = uid) then raise exception 'not_member' using errcode = 'P0483'; end if;
  perform private.hit('fantasy:post:' || uid, 60, interval '1 hour');
  insert into public.fantasy_league_posts (league_id, user_id, body) values (p_league, uid, left(trim(p_body), (select chat_max from private.fantasy_league_policy()))) returning id into pid;
  return pid;
end $$;
revoke all on function public.fantasy_league_post(uuid, text) from public;
grant execute on function public.fantasy_league_post(uuid, text) to authenticated;

-- Report a post (three reports hide it); the league's owner or an admin hides at once.
create or replace function public.fantasy_report_post(p_post bigint)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); p public.fantasy_league_posts;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into p from public.fantasy_league_posts where id = p_post;
  if p.id is null then return; end if;
  if public.is_admin() or (select owner_id from public.fantasy_leagues where id = p.league_id) = uid then
    update public.fantasy_league_posts set hidden = true where id = p_post;
  else
    update public.fantasy_league_posts set reports = array_append(array_remove(reports, uid), uid), hidden = hidden or cardinality(array_append(array_remove(reports, uid), uid)) >= 3 where id = p_post;
  end if;
end $$;
revoke all on function public.fantasy_report_post(bigint) from public;
grant execute on function public.fantasy_report_post(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Divisions: a newcomer joins the lowest division with room when their first line-up locks.
-- ---------------------------------------------------------------------------
create or replace function private.fantasy_assign_division(p_user uuid, p_cup int)
returns int language plpgsql as $$
declare pol record; did int; members uuid[]; r record;
begin
  select * into pol from private.fantasy_league_policy();
  select dm.division_id into did from public.fantasy_division_members dm join public.fantasy_divisions d on d.id = dm.division_id where dm.user_id = p_user and d.cup_id = p_cup;
  if did is not null then return did; end if;
  select d.id into did from public.fantasy_divisions d
   where d.cup_id = p_cup and (select count(*) from public.fantasy_division_members m where m.division_id = d.id) < pol.division_size
   order by d.number desc limit 1;
  if did is null then
    insert into public.fantasy_divisions (cup_id, number) values (p_cup, coalesce((select max(number) from public.fantasy_divisions where cup_id = p_cup), 0) + 1) returning id into did;
  end if;
  select array_agg(user_id) into members from public.fantasy_division_members where division_id = did;
  insert into public.fantasy_division_members (division_id, user_id) values (did, p_user) on conflict do nothing;
  -- Mid-cup: the division's average for the matchdays already scored.
  if members is not null then
    for r in select m.id from public.fantasy_matchdays m where m.cup_id = p_cup and m.status = 'scored' loop
      perform private.fantasy_add_standing('division', did::text, p_cup::text, p_user, private.fantasy_avg_points(members, r.id), true);
    end loop;
  end if;
  return did;
end $$;

-- At the deadline: divisions for everyone playing, and head-to-head pairings in every h2h league.
create or replace function private.fantasy_after_locked(p_md int)
returns void language plpgsql as $$
declare md public.fantasy_matchdays; r record; lg record; ids uuid[]; i int;
begin
  select * into md from public.fantasy_matchdays where id = p_md;
  for r in select user_id from public.fantasy_lineups where matchday_id = p_md and locked loop
    perform private.fantasy_assign_division(r.user_id, md.cup_id);
  end loop;
  for lg in select * from public.fantasy_leagues where format = 'h2h' loop
    select array_agg(m.user_id order by md5(lg.id::text || p_md::text || m.user_id::text)) into ids
      from public.fantasy_league_members m
     where m.league_id = lg.id and exists (select 1 from public.fantasy_lineups l where l.user_id = m.user_id and l.matchday_id = p_md and l.locked);
    if ids is null then continue; end if;
    i := 1;
    while i <= array_length(ids, 1) loop
      insert into public.fantasy_h2h (league_id, matchday_id, user_a, user_b) values (lg.id, p_md, ids[i], ids[i + 1]) on conflict do nothing;
      i := i + 2;
    end loop;
  end loop;
end $$;

-- After the final score: every table moves, the matchday's manager is crowned,
-- and the month's last matchday closes the cup.
create or replace function private.fantasy_after_scored(p_md int)
returns void language plpgsql as $$
declare md public.fantasy_matchdays; r record; lg record; h record; pb int; res text; members uuid[]; top uuid;
begin
  select * into md from public.fantasy_matchdays where id = p_md;
  -- Classic leagues, divisions, the cup overall, the season.
  for r in select l.user_id, l.points from public.fantasy_lineups l where l.matchday_id = p_md and l.locked loop
    for lg in select m.league_id from public.fantasy_league_members m join public.fantasy_leagues g on g.id = m.league_id where m.user_id = r.user_id and g.format = 'classic' loop
      perform private.fantasy_add_standing('league', lg.league_id::text, md.cup_id::text, r.user_id, r.points);
    end loop;
    perform private.fantasy_add_standing('division', private.fantasy_assign_division(r.user_id, md.cup_id)::text, md.cup_id::text, r.user_id, r.points);
    perform private.fantasy_add_standing('overall', 'all', md.cup_id::text, r.user_id, r.points);
    perform private.fantasy_add_standing('season', md.season_id::text, md.season_id::text, r.user_id, r.points);
  end loop;
  -- Head-to-head: the pairings' results and tables.
  for h in select * from public.fantasy_h2h where matchday_id = p_md loop
    select array_agg(user_id) into members from public.fantasy_league_members where league_id = h.league_id;
    pb := case when h.user_b is null then private.fantasy_avg_points(members, p_md)
               else coalesce((select points from public.fantasy_lineups where user_id = h.user_b and matchday_id = p_md), 0) end;
    update public.fantasy_h2h set points_a = coalesce((select points from public.fantasy_lineups where user_id = h.user_a and matchday_id = p_md), 0), points_b = pb
     where league_id = h.league_id and matchday_id = p_md and user_a = h.user_a
     returning case when points_a > points_b then 'a' when points_a < points_b then 'b' else 'draw' end into res;
    update public.fantasy_h2h set result = res where league_id = h.league_id and matchday_id = p_md and user_a = h.user_a;
    insert into public.fantasy_standings (scope, scope_id, period, user_id, points, played, wins, draws, losses, h2h_pts)
    values ('league', h.league_id::text, md.cup_id::text, h.user_a, coalesce((select points from public.fantasy_lineups where user_id = h.user_a and matchday_id = p_md), 0), 1,
            (res = 'a')::int, (res = 'draw')::int, (res = 'b')::int, case res when 'a' then 3 when 'draw' then 1 else 0 end)
    on conflict (scope, scope_id, period, user_id) do update
      set points = public.fantasy_standings.points + excluded.points, played = public.fantasy_standings.played + 1,
          wins = public.fantasy_standings.wins + excluded.wins, draws = public.fantasy_standings.draws + excluded.draws, losses = public.fantasy_standings.losses + excluded.losses,
          h2h_pts = public.fantasy_standings.h2h_pts + excluded.h2h_pts;
    if h.user_b is not null then
      insert into public.fantasy_standings (scope, scope_id, period, user_id, points, played, wins, draws, losses, h2h_pts)
      values ('league', h.league_id::text, md.cup_id::text, h.user_b, pb, 1, (res = 'b')::int, (res = 'draw')::int, (res = 'a')::int, case res when 'b' then 3 when 'draw' then 1 else 0 end)
      on conflict (scope, scope_id, period, user_id) do update
        set points = public.fantasy_standings.points + excluded.points, played = public.fantasy_standings.played + 1,
            wins = public.fantasy_standings.wins + excluded.wins, draws = public.fantasy_standings.draws + excluded.draws, losses = public.fantasy_standings.losses + excluded.losses,
            h2h_pts = public.fantasy_standings.h2h_pts + excluded.h2h_pts;
    end if;
  end loop;
  -- Manager of the Matchday.
  select user_id into top from public.fantasy_lineups where matchday_id = p_md and locked order by points desc, updated_at limit 1;
  if top is not null then
    insert into public.fantasy_badges (user_id, key, data) values (top, 'motm:' || p_md, jsonb_build_object('matchday', md.number, 'points', (select points from public.fantasy_lineups where user_id = top and matchday_id = p_md))) on conflict do nothing;
  end if;
  perform private.fantasy_notify_scored(p_md);
  -- The last matchday of the month closes the cup.
  if not exists (select 1 from public.fantasy_matchdays m where m.cup_id = md.cup_id and m.window_start > md.window_start) then
    perform private.fantasy_close_cup(md.cup_id);
  end if;
end $$;

-- Hooks filled in by later phases (notifications, prizes).
create or replace function private.fantasy_notify_scored(p_md int) returns void language sql as $$ select null $$;
create or replace function private.fantasy_award_prizes(p_cup int) returns void language sql as $$ select null $$;
create or replace function private.fantasy_notify_cup_closed(p_cup int) returns void language sql as $$ select null $$;

-- Cup over: promotion and relegation into next month's divisions, winners' badges, prizes.
create or replace function private.fantasy_close_cup(p_cup int)
returns void language plpgsql as $$
declare pol record; cup public.fantasy_cups; nxt int; d record; n int; up int; down int; r record; nd int; lg record;
begin
  select * into cup from public.fantasy_cups where id = p_cup for update;
  if cup.id is null or cup.closed_at is not null then return; end if;
  select * into pol from private.fantasy_league_policy();
  nxt := private.fantasy_cup_for((cup.month + interval '1 month')::date);
  for d in select * from public.fantasy_divisions where cup_id = p_cup order by number loop
    select count(*) into n from public.fantasy_division_members where division_id = d.id;
    up := case when d.number = 1 then 0 else ceil(n * pol.promote_pct / 100.0)::int end;
    down := floor(n * pol.relegate_pct / 100.0)::int;
    for r in
      select m.user_id, row_number() over (order by coalesce(s.points, 0) desc, m.user_id) rn
        from public.fantasy_division_members m
        left join public.fantasy_standings s on s.scope = 'division' and s.scope_id = d.id::text and s.period = p_cup::text and s.user_id = m.user_id
       where m.division_id = d.id
    loop
      nd := case when r.rn <= up then d.number - 1 when r.rn > n - down then d.number + 1 else d.number end;
      insert into public.fantasy_divisions (cup_id, number) values (nxt, nd) on conflict do nothing;
      insert into public.fantasy_division_members (division_id, user_id)
      select id, r.user_id from public.fantasy_divisions where cup_id = nxt and number = nd on conflict do nothing;
      if nd < d.number then
        insert into public.fantasy_badges (user_id, key, data) values (r.user_id, 'promoted:' || p_cup, jsonb_build_object('cup', cup.name, 'to', nd)) on conflict do nothing;
      end if;
      if r.rn = 1 then
        insert into public.fantasy_badges (user_id, key, data) values (r.user_id, 'division-winner:' || p_cup, jsonb_build_object('cup', cup.name, 'division', d.number)) on conflict do nothing;
      end if;
    end loop;
  end loop;
  -- League winners of the month.
  for lg in select l.id, l.name, l.format from public.fantasy_leagues l loop
    select s.user_id into r from public.fantasy_standings s where s.scope = 'league' and s.scope_id = lg.id::text and s.period = p_cup::text order by s.h2h_pts desc, s.points desc limit 1;
    if r.user_id is not null then
      insert into public.fantasy_badges (user_id, key, data) values (r.user_id, 'league-winner:' || lg.id || ':' || p_cup, jsonb_build_object('cup', cup.name, 'league', lg.name)) on conflict do nothing;
    end if;
  end loop;
  update public.fantasy_cups set closed_at = now() where id = p_cup;
  perform private.fantasy_award_prizes(p_cup);
  perform private.fantasy_notify_cup_closed(p_cup);
end $$;

-- ---------------------------------------------------------------------------
-- What the app reads
-- ---------------------------------------------------------------------------
create or replace function public.fantasy_my_leagues()
returns table (id uuid, name text, format text, is_public boolean, members int, rank int, points int, h2h_pts int, is_owner boolean, invite_code text)
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as id),
  cup as (select m.cup_id from public.fantasy_matchdays m where m.id = private.fantasy_current_matchday())
  select l.id, l.name, l.format, l.is_public,
         (select count(*)::int from public.fantasy_league_members m where m.league_id = l.id),
         (select r.rn::int from (select s.user_id, row_number() over (order by s.h2h_pts desc, s.points desc) rn from public.fantasy_standings s, cup where s.scope = 'league' and s.scope_id = l.id::text and s.period = cup.cup_id::text) r, me where r.user_id = me.id),
         coalesce((select s.points from public.fantasy_standings s, cup, me where s.scope = 'league' and s.scope_id = l.id::text and s.period = cup.cup_id::text and s.user_id = me.id), 0),
         coalesce((select s.h2h_pts from public.fantasy_standings s, cup, me where s.scope = 'league' and s.scope_id = l.id::text and s.period = cup.cup_id::text and s.user_id = me.id), 0),
         l.owner_id = me.id, l.invite_code
    from public.fantasy_leagues l join public.fantasy_league_members mm on mm.league_id = l.id, me
   where mm.user_id = me.id
   order by l.created_at
$$;
revoke all on function public.fantasy_my_leagues() from public;
grant execute on function public.fantasy_my_leagues() to authenticated;

create or replace function public.fantasy_league(p_id uuid)
returns table (id uuid, name text, format text, is_public boolean, owner_handle text, members int, is_member boolean, is_owner boolean, invite_code text, cup_name text, cup_id int, matchday_id int, matchday_status text)
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as id),
  md as (select m.* from public.fantasy_matchdays m where m.id = private.fantasy_current_matchday())
  select l.id, l.name, l.format, l.is_public, (select p.handle from public.profiles p where p.id = l.owner_id),
         (select count(*)::int from public.fantasy_league_members m where m.league_id = l.id),
         exists (select 1 from public.fantasy_league_members m, me where m.league_id = l.id and m.user_id = me.id),
         l.owner_id = me.id,
         case when exists (select 1 from public.fantasy_league_members m, me where m.league_id = l.id and m.user_id = me.id) or l.is_public then l.invite_code end,
         (select c.name from public.fantasy_cups c, md where c.id = md.cup_id), (select md.cup_id from md), (select md.id from md), (select md.status from md)
    from public.fantasy_leagues l, me where l.id = p_id
$$;
revoke all on function public.fantasy_league(uuid) from public;
grant execute on function public.fantasy_league(uuid) to anon, authenticated;

-- A table: league (this cup), division (this cup), overall (this cup) or season.
create or replace function public.fantasy_table(p_scope text, p_scope_id text, p_period text, p_limit int default 100)
returns table (rank int, user_id uuid, handle text, avatar text, points int, played int, avg_filled int, wins int, draws int, losses int, h2h_pts int, is_me boolean, this_md int)
language sql stable security definer set search_path = '' as $$
  select row_number() over (order by s.h2h_pts desc, s.points desc, s.user_id)::int, s.user_id, p.handle, p.avatar, s.points, s.played, s.avg_filled, s.wins, s.draws, s.losses, s.h2h_pts,
         s.user_id = (select auth.uid()),
         (select l.points from public.fantasy_lineups l where l.user_id = s.user_id and l.matchday_id = private.fantasy_current_matchday() and l.locked)
    from public.fantasy_standings s join public.profiles p on p.id = s.user_id
   where s.scope = p_scope and s.scope_id = p_scope_id and s.period = p_period
   order by s.h2h_pts desc, s.points desc, s.user_id
   limit p_limit
$$;
revoke all on function public.fantasy_table(text, text, text, int) from public;
grant execute on function public.fantasy_table(text, text, text, int) to anon, authenticated;

-- The members of a league who have no standing yet (joined, nothing scored).
create or replace function public.fantasy_league_members(p_id uuid)
returns table (user_id uuid, handle text, avatar text, joined_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.user_id, p.handle, p.avatar, m.joined_at from public.fantasy_league_members m join public.profiles p on p.id = m.user_id where m.league_id = p_id order by m.joined_at
$$;
revoke all on function public.fantasy_league_members(uuid) from public;
grant execute on function public.fantasy_league_members(uuid) to anon, authenticated;

-- This matchday's head-to-head pairings in a league, with live points.
create or replace function public.fantasy_league_pairings(p_id uuid, p_md int)
returns table (user_a uuid, handle_a text, avatar_a text, user_b uuid, handle_b text, avatar_b text, points_a int, points_b int, result text)
language sql stable security definer set search_path = '' as $$
  select h.user_a, pa.handle, pa.avatar, h.user_b, pb.handle, pb.avatar,
         case when (select status from public.fantasy_matchdays where id = p_md) = 'scored' then h.points_a else coalesce((select points from public.fantasy_lineups l where l.user_id = h.user_a and l.matchday_id = p_md), 0) end,
         case when (select status from public.fantasy_matchdays where id = p_md) = 'scored' then h.points_b else coalesce((select points from public.fantasy_lineups l where l.user_id = h.user_b and l.matchday_id = p_md), 0) end,
         h.result
    from public.fantasy_h2h h join public.profiles pa on pa.id = h.user_a left join public.profiles pb on pb.id = h.user_b
   where h.league_id = p_id and h.matchday_id = p_md
$$;
revoke all on function public.fantasy_league_pairings(uuid, int) from public;
grant execute on function public.fantasy_league_pairings(uuid, int) to anon, authenticated;

create or replace function public.fantasy_league_posts(p_id uuid, p_limit int default 50)
returns table (id bigint, user_id uuid, handle text, avatar text, body text, created_at timestamptz, is_me boolean)
language sql stable security definer set search_path = '' as $$
  select x.id, x.user_id, p.handle, p.avatar, x.body, x.created_at, x.user_id = (select auth.uid())
    from public.fantasy_league_posts x join public.profiles p on p.id = x.user_id
   where x.league_id = p_id and not x.hidden
   order by x.created_at desc limit p_limit
$$;
revoke all on function public.fantasy_league_posts(uuid, int) from public;
grant execute on function public.fantasy_league_posts(uuid, int) to anon, authenticated;

-- Public leagues anyone can join.
create or replace function public.fantasy_public_leagues(p_limit int default 30)
returns table (id uuid, name text, format text, members int, owner_handle text)
language sql stable security definer set search_path = '' as $$
  select l.id, l.name, l.format, (select count(*)::int from public.fantasy_league_members m where m.league_id = l.id), (select p.handle from public.profiles p where p.id = l.owner_id)
    from public.fantasy_leagues l where l.is_public order by 4 desc, l.created_at limit p_limit
$$;
revoke all on function public.fantasy_public_leagues(int) from public;
grant execute on function public.fantasy_public_leagues(int) to anon, authenticated;

-- Where I stand: my division and rank in it, the cup overall, the season.
create or replace function public.fantasy_my_standing()
returns table (cup_id int, cup_name text, season_id int, season_name text, division_id int, division_number int, division_rank int, division_size int, overall_rank int, overall_players int, season_rank int, season_players int, cup_points int, season_points int)
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as id),
  md as (select m.* from public.fantasy_matchdays m where m.id = private.fantasy_current_matchday()),
  dv as (select d.id, d.number from public.fantasy_divisions d join public.fantasy_division_members dm on dm.division_id = d.id, md, me where d.cup_id = md.cup_id and dm.user_id = me.id)
  select md.cup_id, c.name, md.season_id, s.name, dv.id, dv.number,
         (select r.rn::int from (select st.user_id, row_number() over (order by st.points desc, st.user_id) rn from public.fantasy_standings st, dv where st.scope = 'division' and st.scope_id = dv.id::text and st.period = md.cup_id::text) r, me where r.user_id = me.id),
         (select count(*)::int from public.fantasy_division_members dm, dv where dm.division_id = dv.id),
         (select r.rn::int from (select st.user_id, row_number() over (order by st.points desc, st.user_id) rn from public.fantasy_standings st where st.scope = 'overall' and st.scope_id = 'all' and st.period = md.cup_id::text) r, me where r.user_id = me.id),
         (select count(*)::int from public.fantasy_standings st where st.scope = 'overall' and st.scope_id = 'all' and st.period = md.cup_id::text),
         (select r.rn::int from (select st.user_id, row_number() over (order by st.points desc, st.user_id) rn from public.fantasy_standings st where st.scope = 'season' and st.scope_id = md.season_id::text) r, me where r.user_id = me.id),
         (select count(*)::int from public.fantasy_standings st where st.scope = 'season' and st.scope_id = md.season_id::text),
         coalesce((select st.points from public.fantasy_standings st, me where st.scope = 'overall' and st.scope_id = 'all' and st.period = md.cup_id::text and st.user_id = me.id), 0),
         coalesce((select st.points from public.fantasy_standings st, me where st.scope = 'season' and st.scope_id = md.season_id::text and st.user_id = me.id), 0)
    from md join public.fantasy_cups c on c.id = md.cup_id join public.fantasy_seasons s on s.id = md.season_id left join dv on true
$$;
revoke all on function public.fantasy_my_standing() from public;
grant execute on function public.fantasy_my_standing() to anon, authenticated;
