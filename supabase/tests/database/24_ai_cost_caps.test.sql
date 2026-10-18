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

select tests.create_user('00000000-0000-4000-a000-0000000ca901', 'busy@test.local');
select tests.create_user('00000000-0000-4000-a000-0000000ca902', 'late@test.local');
-- This member has already used today's allowance (hourly windows are fresh).
insert into private.rate_limits (key, window_start, hits) values
  ('identify:day:00000000-0000-4000-a000-0000000ca901', now(), 500),
  ('studio:day:00000000-0000-4000-a000-0000000ca901', now(), 60)
on conflict (key) do update set window_start = excluded.window_start, hits = excluded.hits;

select plan(4);

select tests.login('00000000-0000-4000-a000-0000000ca901');
select throws_ok($$select consume_identify_quota()$$, 'P0429', null, 'recognitions stop for the day after 500');
select throws_ok($$select consume_studio_quota()$$, 'P0429', null, 'cut-outs stop for the day after 60');
select tests.logout();

-- Everyone together: 20000 a day.
insert into private.rate_limits (key, window_start, hits) values ('identify:all:day', now(), 20000)
on conflict (key) do update set window_start = excluded.window_start, hits = excluded.hits;
select tests.login('00000000-0000-4000-a000-0000000ca902');
select throws_ok($$select consume_identify_quota()$$, 'P0429', null, 'the overall daily ceiling holds for everyone');
select lives_ok($$select consume_studio_quota()$$, 'other services are unaffected');
select tests.logout();

select * from finish();
rollback;
