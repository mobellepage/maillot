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

-- The squad game: eight jerseys for 100 M (two per league), five play, the captain (an owned
-- club) counts double, win 3 / draw 1, transfers beyond the free one cost 4, prices move.
select plan(17);

select tests.create_user('00000000-0000-4000-a000-0000000c0001', 'manager@fantasy.test');
-- A Gameweek two days out, the only open one.
update fantasy_matchdays set status = 'scored' where status = 'upcoming';
insert into fantasy_matchdays (season_id, cup_id, number, window_start, window_end, deadline)
values (private.fantasy_season_for(current_date), private.fantasy_cup_for(current_date), 990, now() + interval '2 days', now() + interval '3 days', now() + interval '2 days');
create temp table t_md as select id from fantasy_matchdays where number = 990;
grant select on t_md to authenticated;
-- Eight pickable clubs from eight different leagues, the cheapest of each (so the budget holds).
create temp table t_sq as
  select club_id, league, price, row_number() over (order by price, club_id) n from (
    select distinct on (c.league) c.id club_id, c.league, private.fantasy_club_price(c.id) price
      from kit_clubs c where private.fantasy_pickable(c) and c.league <> 'National Teams'
     order by c.league, private.fantasy_club_price(c.id), c.id) x limit 8;
grant select on t_sq to authenticated;
-- Club 1 wins 2–0, club 2 draws 1–1, club 3 loses 0–1.
insert into fantasy_fixtures (matchday_id, provider_fixture_id, home_club_id, away_club_id, home_name, away_name, kickoff, status, home_goals, away_goals)
select id, 'test:a', (select club_id from t_sq where n = 1), null, 'Club A', 'Someone', now() + interval '2 days', 'finished', 2, 0 from t_md;
insert into fantasy_fixtures (matchday_id, provider_fixture_id, home_club_id, away_club_id, home_name, away_name, kickoff, status, home_goals, away_goals)
select id, 'test:b', null, (select club_id from t_sq where n = 2), 'Someone', 'Club B', now() + interval '2 days', 'finished', 1, 1 from t_md;
insert into fantasy_fixtures (matchday_id, provider_fixture_id, home_club_id, away_club_id, home_name, away_name, kickoff, status, home_goals, away_goals)
select id, 'test:c', (select club_id from t_sq where n = 3), null, 'Club C', 'Someone', now() + interval '2 days', 'finished', 0, 1 from t_md;
-- The manager owns a shirt of club 1 (any season's kit of it).
insert into custom_items (id, user_id, kit_id, size, visibility)
select 't-own-1', '00000000-0000-4000-a000-0000000c0001', k.id, 'M', 'public' from kits k where k.club_id = (select club_id from t_sq where n = 1) limit 1;

select is((select count(*)::int from fantasy_jerseys((select id from t_md))) > 100, true, 'the market lists the season''s jerseys');

select tests.login('00000000-0000-4000-a000-0000000c0001');
select throws_ok($$select fantasy_save_squad((select array_agg(club_id) from t_sq where n <= 7))$$, 'P0471', null, 'seven jerseys are refused');
select throws_ok($$select fantasy_save_squad((select array_agg(club_id) from t_sq where n <= 7) || array['man-city'] || '{}'::text[])$$, 'P0477', null, 'a third club of one league is refused')
 where exists (select 1 from t_sq where league = 'Premier League' and n <= 7);
select lives_ok($$select fantasy_save_squad((select array_agg(club_id order by n) from t_sq))$$, 'eight jerseys of eight leagues save');
select is((select cardinality(clubs) from fantasy_squads where user_id = '00000000-0000-4000-a000-0000000c0001'), 8, 'the squad holds eight');
select is((select (squad ->> 'bank')::numeric from fantasy_matchday((select id from t_md))), 100 - (select sum(price) from t_sq), 'what is left of the 100 M is in the bank');
select is((select count(*)::int from fantasy_squad_clubs((select id from t_md)) where starter), 5, 'the game picked five starters');
select throws_ok($$select fantasy_save_lineup((select id from t_md), (select array_agg(club_id) from t_sq where n <= 5), (select club_id from t_sq where n = 2))$$, 'P0472', null, 'a club whose shirt you do not own cannot be captain');
select lives_ok($$select fantasy_save_lineup((select id from t_md), (select array_agg(club_id) from t_sq where n <= 5), (select club_id from t_sq where n = 1))$$, 'an owned club can');
select lives_ok($$select fantasy_play_chip((select id from t_md), 'bench_boost')$$, 'a chip is played once');
select tests.logout();

-- The deadline passes: lock, then the window ends: score.
select private.fantasy_lock_matchday((select id from t_md));
select is((select status from fantasy_matchdays where id = (select id from t_md)), 'locked', 'the Gameweek locks');
select is((select free_transfers from fantasy_squads where user_id = '00000000-0000-4000-a000-0000000c0001'), 1, 'one free transfer for next week');
select private.fantasy_score((select id from t_md), true);
select is((select total from fantasy_club_scores where matchday_id = (select id from t_md) and club_id = (select club_id from t_sq where n = 1)), 6, 'the captain: a win is 3, doubled');
select is((select total from fantasy_club_scores where matchday_id = (select id from t_md) and club_id = (select club_id from t_sq where n = 2)), 1, 'a draw is 1');
select is((select points from fantasy_lineups where matchday_id = (select id from t_md)), 7, '6 + 1 + 0 and nothing from the bench');
select ok((select price > (select price from t_sq where n = 1) from fantasy_club_prices where club_id = (select club_id from t_sq where n = 1)), 'a cheap winner rises in price');

-- Next week: two transfers with one free one cost four points.
insert into fantasy_matchdays (season_id, cup_id, number, window_start, window_end, deadline)
values (private.fantasy_season_for(current_date), private.fantasy_cup_for(current_date), 991, now() + interval '9 days', now() + interval '10 days', now() + interval '9 days');
create temp table t_in as
  select c.id club_id from kit_clubs c where private.fantasy_pickable(c) and c.league <> 'National Teams'
     and c.id not in (select club_id from t_sq) and c.league not in (select league from t_sq)
   order by private.fantasy_club_price(c.id) limit 2;
grant select on t_in to authenticated;
select tests.login('00000000-0000-4000-a000-0000000c0001');
select lives_ok($$select fantasy_save_squad((select array_agg(club_id) from t_sq where n >= 3) || (select array_agg(club_id) from t_in))$$, 'two transfers save')
 where (select count(*) from t_in) = 2;
select is((select hits from fantasy_lineups where matchday_id = (select id from fantasy_matchdays where number = 991)), 4, 'the second transfer costs four points');
select tests.logout();

select * from finish();
rollback;
