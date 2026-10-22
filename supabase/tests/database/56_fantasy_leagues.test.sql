begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- ---- helpers (inlined so every file is self-contained) --------------------
create schema if not exists tests;
create or replace function tests.create_user(p_id uuid, p_email text)
returns uuid language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email);
  return p_id;
end $$;
create or replace function tests.login(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  execute 'set local role authenticated';
end $$;
create or replace function tests.logout()
returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

-- Leagues and cups: a head-to-head league by invite code, pairings at the deadline,
-- divisions, and every table moving when the Gameweek is scored.
select plan(10);

select tests.create_user('00000000-0000-4000-a000-0000000c1001', 'a@league.test');
select tests.create_user('00000000-0000-4000-a000-0000000c1002', 'b@league.test');
select tests.create_user('00000000-0000-4000-a000-0000000c1003', 'c@league.test');
update profiles set handle = 'lg_a' where id = '00000000-0000-4000-a000-0000000c1001';
update profiles set handle = 'lg_b' where id = '00000000-0000-4000-a000-0000000c1002';
update profiles set handle = 'lg_c' where id = '00000000-0000-4000-a000-0000000c1003';
-- The only open Gameweek, two days out; the same cheap squad for A and B; A owns club 1's shirt.
update fantasy_matchdays set status = 'scored' where status = 'upcoming';
insert into fantasy_matchdays (season_id, cup_id, number, window_start, window_end, deadline)
values (private.fantasy_season_for(current_date), private.fantasy_cup_for(current_date), 991, now() + interval '2 days', now() + interval '3 days', now() + interval '2 days');
create temp table t_md as select id, cup_id from fantasy_matchdays where number = 991;
grant select on t_md to authenticated;
create temp table t_sq as
  select club_id, league, price, row_number() over (order by price, club_id) n from (
    select distinct on (c.league) c.id club_id, c.league, private.fantasy_club_price(c.id) price
      from kit_clubs c where private.fantasy_pickable(c) and c.league <> 'National Teams'
     order by c.league, private.fantasy_club_price(c.id), c.id) x limit 8;
grant select on t_sq to authenticated;
insert into fantasy_fixtures (matchday_id, provider_fixture_id, home_club_id, away_club_id, home_name, away_name, kickoff, status, home_goals, away_goals)
select id, 'test:x', (select club_id from t_sq where n = 1), null, 'Club A', 'Someone', now() + interval '2 days', 'finished', 3, 0 from t_md;
insert into custom_items (id, user_id, kit_id, size, visibility)
select 't-own-a', '00000000-0000-4000-a000-0000000c1001', k.id, 'M', 'public' from kits k where k.club_id = (select club_id from t_sq where n = 1) limit 1;

-- A creates a head-to-head league, B joins by code.
select tests.login('00000000-0000-4000-a000-0000000c1001');
create temp table t_lg as select fantasy_create_league('Freunde', 'h2h') id;
grant select on t_lg to authenticated;
select is((select count(*)::int from fantasy_league_members where league_id = (select id from t_lg)), 1, 'the creator is the first member');
select fantasy_save_squad((select array_agg(club_id order by n) from t_sq));
select fantasy_save_lineup((select id from t_md), (select array_agg(club_id) from t_sq where n <= 5), (select club_id from t_sq where n = 1));
select tests.logout();
select tests.login('00000000-0000-4000-a000-0000000c1002');
select is((select fantasy_join_league((select invite_code from fantasy_leagues where id = (select id from t_lg)))), (select id from t_lg), 'a friend joins with the code');
select throws_ok($$select fantasy_join_league('NOPE1234')$$, 'P0481', null, 'an unknown code is refused');
select fantasy_save_squad((select array_agg(club_id order by n) from t_sq));
select fantasy_save_lineup((select id from t_md), (select array_agg(club_id) from t_sq where n <= 5), null);
select tests.logout();

-- Deadline: pairings and divisions; window end: scored.
select private.fantasy_lock_matchday((select id from t_md));
select is((select count(*)::int from fantasy_h2h where league_id = (select id from t_lg)), 1, 'two members are paired head-to-head');
select is((select count(*)::int from fantasy_division_members dm join fantasy_divisions d on d.id = dm.division_id where d.cup_id = (select cup_id from t_md) and dm.user_id in ('00000000-0000-4000-a000-0000000c1001', '00000000-0000-4000-a000-0000000c1002')), 2, 'both got a division');
select private.fantasy_score((select id from t_md), true);
select is((select points from fantasy_lineups where user_id = '00000000-0000-4000-a000-0000000c1001' and matchday_id = (select id from t_md)), 6, 'A: captain club A won → 3 × 2');
select is((select points from fantasy_lineups where user_id = '00000000-0000-4000-a000-0000000c1002' and matchday_id = (select id from t_md)), 3, 'B: same club, no captain → 3');
select is((select h2h_pts from fantasy_standings where scope = 'league' and scope_id = (select id::text from t_lg) and user_id = '00000000-0000-4000-a000-0000000c1001'), 3, 'A wins the head-to-head: 3 points');
select is((select points from fantasy_standings where scope = 'overall' and scope_id = 'all' and period = (select cup_id::text from t_md) and user_id = '00000000-0000-4000-a000-0000000c1001'), 6, 'the cup overall counts the points');
select ok(exists (select 1 from fantasy_badges where user_id = '00000000-0000-4000-a000-0000000c1001' and key = 'motm:' || (select id from t_md)), 'A is Manager of the Gameweek');

select * from finish();
rollback;
