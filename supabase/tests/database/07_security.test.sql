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
-- p_aal: 'aal1' = password only, 'aal2' = verified second factor
create or replace function tests.login(p_user uuid, p_aal text default 'aal2')
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
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
select tests.create_user('00000000-0000-4000-a000-0000000ad111', 'admin@test.local', true);

select plan(10);

select ok(exists (select 1 from audit_log where action = 'admin.grant' and target = '00000000-0000-4000-a000-0000000ad111'), 'granting admin rights is audit-logged');

-- admin rights need the second factor
select tests.login('00000000-0000-4000-a000-0000000ad111', 'aal1');
select throws_ok($$ select list_disputes_for_admin() $$, null, 'not authorized', 'a password-only admin session has no admin rights');
select is(my_admin_flag(), true, '…but the app can tell it to ask for the second factor');
select is((select count(*)::int from audit_log), 0, 'and it cannot read the audit log');
select tests.login('00000000-0000-4000-a000-0000000ad111', 'aal2');
select lives_ok($$ select * from create_api_key('audit test') $$, 'with the second factor, admin actions work');
select ok(exists (select 1 from audit_log where action = 'api_key.create' and actor = '00000000-0000-4000-a000-0000000ad111' and details->>'label' = 'audit test'), 'admin actions are audit-logged with who did them');

-- rate limits
select tests.login('00000000-0000-4000-a000-00000000a11c');
select lives_ok($$ do $b$ begin for i in 1..30 loop insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000a11c', 'mia-26', 'XS', i); end loop; end $b$ $$, '30 bids in 10 minutes are fine');
select throws_ok($$ insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000a11c', 'mia-26', 'XS', 31) $$, 'P0429', null, 'the 31st is refused');
select lives_ok($$ do $b$ begin for i in 1..30 loop perform handle_available('someone' || i); end loop; end $b$ $$, 'username checks while typing are fine');
select throws_ok($$ select handle_available('one_more') $$, 'P0429', null, 'username lookups are capped (no member enumeration)');

select * from finish();
rollback;
