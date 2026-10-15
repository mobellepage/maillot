begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

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

select tests.create_user('00000000-0000-4000-a000-0000000da111', 'player@daily.test');
select tests.create_user('00000000-0000-4000-a000-0000000da222', 'other@daily.test');

select plan(10);

select tests.login('00000000-0000-4000-a000-0000000da111');
select lives_ok($$insert into daily_game_results (user_id, day, won, tries) values ('00000000-0000-4000-a000-0000000da111', (now() at time zone 'Europe/Zurich')::date, true, 3)$$, 'today''s result is saved');
select throws_ok($$insert into daily_game_results (user_id, day, won, tries) values ('00000000-0000-4000-a000-0000000da111', (now() at time zone 'Europe/Zurich')::date, true, 1)$$, '23505', null, 'only one result per day');
select throws_ok($$insert into daily_game_results (user_id, day, won, tries) values ('00000000-0000-4000-a000-0000000da111', (now() at time zone 'Europe/Zurich')::date - 5, true, 1)$$, '42501', null, 'no backfilling old days');
select throws_ok($$update daily_game_results set tries = 1$$, '42501', null, 'results cannot be changed');
select tests.logout();

select tests.login('00000000-0000-4000-a000-0000000da222');
select is((select count(*)::int from daily_game_results), 0, 'members see only their own results');
select throws_ok($$insert into daily_game_results (user_id, day, won, tries) values ('00000000-0000-4000-a000-0000000da111', (now() at time zone 'Europe/Zurich')::date - 1, true, 1)$$, '42501', null, 'nobody records results for someone else');
select tests.logout();

set local role anon;
select is((select count(*)::int from daily_kit((now() at time zone 'Europe/Zurich')::date)), 1, 'everyone gets today''s kit from the library');
select ok((select kind in ('home', 'away') and image like '/library/%' from daily_kit((now() at time zone 'Europe/Zurich')::date)), 'a home or away kit with its picture');
select throws_ok($$select * from daily_kit((now() at time zone 'Europe/Zurich')::date + 1)$$, '22023', null, 'tomorrow''s kit stays secret');
reset role;
select is((select count(distinct kit_id)::int from private.daily_kits), (select count(*)::int from private.daily_kits), 'no kit twice in the schedule');

select * from finish();
rollback;
