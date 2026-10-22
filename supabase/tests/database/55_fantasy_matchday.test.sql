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

-- Matchday: a line-up of five under the budget, locked at the deadline, scored from the fixtures
-- (win/draw/goals/clean sheet, captain ×2, prediction bonus), reproducible on rescore.
select plan(9);

select tests.create_user('00000000-0000-4000-a000-0000000c0001', 'manager@fantasy.test');
-- Five cards of five clubs (common, so the budget holds), the first two with a match this weekend.
create temp table t_sq as
  select id kit_id, club_id, row_number() over () n from (
    select distinct on (club_id) id, club_id from kits where image_path is not null and rarity = 'common' order by club_id, id) x limit 5;
grant select on t_sq to authenticated;
insert into fantasy_players (user_id) values ('00000000-0000-4000-a000-0000000c0001');
insert into fantasy_cards (user_id, kit_id) select '00000000-0000-4000-a000-0000000c0001', kit_id from t_sq;
-- A matchday two days out.
insert into fantasy_matchdays (season_id, cup_id, number, window_start, window_end, deadline)
values (private.fantasy_season_for(current_date), private.fantasy_cup_for(current_date), 990, now() + interval '2 days', now() + interval '3 days', now() + interval '1 day');
create temp table t_md as select id from fantasy_matchdays where number = 990;
grant select on t_md to authenticated;
insert into fantasy_fixtures (matchday_id, provider_fixture_id, home_club_id, away_club_id, home_name, away_name, kickoff, status, home_goals, away_goals)
select id, 'test:a', (select club_id from t_sq where n = 1), null, 'Club A', 'Someone', now() + interval '2 days', 'finished', 2, 0 from t_md;
insert into fantasy_fixtures (matchday_id, provider_fixture_id, home_club_id, away_club_id, home_name, away_name, kickoff, status, home_goals, away_goals)
select id, 'test:b', null, (select club_id from t_sq where n = 2), 'Someone', 'Club B', now() + interval '2 days', 'finished', 1, 1 from t_md;
create temp table t_fx as select id from fantasy_fixtures where provider_fixture_id = 'test:a';
grant select on t_fx to authenticated;

select tests.login('00000000-0000-4000-a000-0000000c0001');
select lives_ok($$select fantasy_save_lineup((select id from t_md), (select array_agg(kit_id order by n) from t_sq), (select kit_id from t_sq where n = 1), null, (select id from t_fx), 2, 0)$$, 'a line-up of five with a captain and a prediction saves');
select throws_ok($$select fantasy_save_lineup((select id from t_md), (select array_agg(kit_id order by n) from t_sq where n <= 4), (select kit_id from t_sq where n = 1))$$, 'P0471', null, 'four cards are refused');
select lives_ok($$select fantasy_save_lineup((select id from t_md), (select array_agg(kit_id order by n) from t_sq), (select kit_id from t_sq where n = 1), 'gold_rush', (select id from t_fx), 2, 0)$$, 'a chip saves too (it is the first use)');
select is((select budget_used from fantasy_lineups where matchday_id = (select id from t_md)), 400::numeric, 'five common cards use CHF 400 of the budget');
select tests.logout();

-- The deadline passes: lock, then the window ends: score.
select private.fantasy_lock_matchday((select id from t_md));
select is((select status from fantasy_matchdays where id = (select id from t_md)), 'locked', 'the matchday locks');
select private.fantasy_score((select id from t_md), true);
select is((select total from fantasy_card_scores where matchday_id = (select id from t_md) and kit_id = (select kit_id from t_sq where n = 1)), 14, 'the captain: 2–0 win = 3 + 2 goals + 2 clean sheet, ×2');
select is((select total from fantasy_card_scores where matchday_id = (select id from t_md) and kit_id = (select kit_id from t_sq where n = 2)), 2, 'a 1–1 draw: 1 + 1 goal');
select is((select points || '/' || pred_points from fantasy_lineups where matchday_id = (select id from t_md)), '21/5', '14 + 2 + 0 + 0 + 0 and the exact prediction +5');
select private.fantasy_score((select id from t_md), true);
select is((select points from fantasy_lineups where matchday_id = (select id from t_md)), 21, 'scoring again gives the same');

select * from finish();
rollback;
