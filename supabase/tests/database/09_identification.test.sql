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
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', 'aal1')::text, true);
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

select tests.create_user('00000000-0000-4000-a000-00000000a11c', 'alice@test.local');
select tests.create_user('00000000-0000-4000-a000-000000000b0b', 'bob@test.local');
insert into shirt_identifications (user_id, catalog_id, confidence, result, model)
values ('00000000-0000-4000-a000-00000000a11c', 'ned-88', 0.92, '{"club":"Netherlands"}', 'test');

select plan(6);

select tests.login('00000000-0000-4000-a000-00000000a11c');
select lives_ok($$ select consume_identify_quota() $$, 'a member can identify a shirt');
select is((select count(*)::int from shirt_identifications), 1, 'members see their own identifications');
select throws_ok($$ insert into shirt_identifications (user_id, result, model) values ('00000000-0000-4000-a000-00000000a11c', '{}', 'x') $$, '42501', null, '…but cannot write them (only the edge function does)');
select tests.login('00000000-0000-4000-a000-000000000b0b');
select is((select count(*)::int from shirt_identifications), 0, 'nobody sees other members’ identifications');
select tests.logout();

set local role anon;
select throws_ok($$ select consume_identify_quota() $$, '42501', null, 'signed-out visitors cannot identify');
reset role;

-- the 21st identification within the hour is refused
select tests.login('00000000-0000-4000-a000-000000000b0b');
select throws_ok($$ do $b$ begin for i in 1..21 loop perform consume_identify_quota(); end loop; end $b$ $$, 'P0429', null, 'identifications are rate-limited per member');
select tests.logout();

select * from finish();
rollback;
