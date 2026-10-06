begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

create schema if not exists tests;
create or replace function tests.create_user(p_id uuid, p_email text, p_admin boolean default false)
returns uuid language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email);
  if p_admin then update public.profiles set is_admin = true where id = p_id; end if;
  return p_id;
end $$;
create or replace function tests.login(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
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
select tests.create_user('00000000-0000-4000-a000-0000000ad111', 'admin@test.local', true);

select plan(9);

set local role anon;
select lives_ok($$ select report_client_error('TypeError: x is undefined (id 3f9a2c1b77)', 'at foo', '/market', 'abc123', 'test') $$, 'anyone can report a browser error');
select throws_ok($$ select count(*) from client_errors $$, '42501', null, 'error reports are not readable by the public');
reset role;
select is((select count(*)::int from client_errors where message like 'TypeError: x is undefined%'), 1, 'the report is stored');

do $$ begin for i in 1..30 loop perform report_client_error('Flood ' || i); end loop; end $$;
select is((select count(*)::int from client_errors where message like 'Flood %'), 20, 'one fingerprint is capped at 20 reports per 10 minutes');

select tests.login('00000000-0000-4000-a000-00000000a11c');
select throws_ok($$ select * from admin_health() $$, null, 'not authorized', 'only admins see health');
select tests.login('00000000-0000-4000-a000-0000000ad111');
select is((select errors_1h from admin_health()), 21, 'admins see the error count');
select tests.logout();

-- a payout that failed raises an alert to admins, once
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-000000000b0b', 'yb-2526', 'L', 80);
insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000a11c', 'yb-2526', 'L', 80);
update orders set payout_status = 'failed' where shirt_id = 'yb-2526' and size = 'L';
select ok((public.run_health_check() ->> 'alerts_sent')::int >= 1, 'a failed payout alerts the admins');
select ok(exists (select 1 from notifications where user_id = '00000000-0000-4000-a000-0000000ad111' and type = 'ops_alert' and data->>'kind' = 'settlement_failed'), 'the alert reaches the admin''s notifications');
select is((public.run_health_check() ->> 'alerts_sent')::int, 0, 'the same alert is not repeated within 6 hours');

select * from finish();
rollback;
