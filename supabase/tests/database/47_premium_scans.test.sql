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

-- Premium, second version: every account starts with a 7-day trial, then
-- 20 AI scans a month; paid premium scans on (fair use) at 6 % commission.
select plan(14);

select tests.create_user('00000000-0000-4000-a000-0000000bb001', 'trial@plan.test');
select tests.create_user('00000000-0000-4000-a000-0000000bb002', 'free@plan.test');
select tests.create_user('00000000-0000-4000-a000-0000000bb003', 'pro@plan.test');
select tests.create_user('00000000-0000-4000-a000-0000000bb004', 'dealer@plan.test');
update profiles set trial_until = now() - interval '1 day' where id in ('00000000-0000-4000-a000-0000000bb002', '00000000-0000-4000-a000-0000000bb003', '00000000-0000-4000-a000-0000000bb004');
update profiles set premium_until = now() + interval '1 year' where id = '00000000-0000-4000-a000-0000000bb003';
update profiles set commission_rate = 0.05 where id = '00000000-0000-4000-a000-0000000bb004';

select ok((select trial_until between now() + interval '6 days 23 hours' and now() + interval '7 days 1 hour' from profiles where id = '00000000-0000-4000-a000-0000000bb001'), 'a new account gets 7 days of premium');

select tests.login('00000000-0000-4000-a000-0000000bb001');
select is((select plan || ' ' || scans_limit from my_plan()), 'trial 500', 'the trial scans on (fair use)');
select lives_ok($$select consume_identify_quota() from generate_series(1, 25)$$, 'more than 20 scans in the trial');
select is((select scans_used from my_plan()), 25, 'the trial counts its scans');
select lives_ok($$select consume_studio_quota()$$, 'the studio look comes with the trial');
select throws_ok($$update profiles set trial_until = now() + interval '1 year' where id = '00000000-0000-4000-a000-0000000bb001'$$, '42501', null, 'members can''t lengthen their trial');
select tests.logout();

select tests.login('00000000-0000-4000-a000-0000000bb002');
select lives_ok($$select consume_identify_quota() from generate_series(1, 20)$$, 'after the trial: 20 free scans');
select throws_ok($$select consume_identify_quota()$$, 'P0402', 'scan_quota', 'the 21st scan of the month asks for premium');
select is((select plan || ' ' || scans_used || '/' || scans_limit from my_plan()), 'free 20/20', 'the app sees the used allowance');
select throws_ok($$select consume_studio_quota()$$, 'P0402', 'premium_only', 'the studio look is premium');
select tests.logout();

select tests.login('00000000-0000-4000-a000-0000000bb003');
select lives_ok($$select consume_identify_quota() from generate_series(1, 30)$$, 'premium scans on');
select tests.logout();

select is(private.commission_for('00000000-0000-4000-a000-0000000bb002', 1000), 80::numeric, 'free: 8 % commission');
select is(private.commission_for('00000000-0000-4000-a000-0000000bb003', 1000), 60::numeric, 'premium: 6 %');
select is(private.commission_for('00000000-0000-4000-a000-0000000bb004', 1000), 50::numeric, 'a dealer keeps their own rate');

select * from finish();
rollback;
