begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- ---- helpers (inlined so every file is self-contained) --------------------
create schema if not exists tests;
create or replace function tests.create_user(p_id uuid, p_email text, p_admin boolean default false)
returns uuid language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email);
  if p_admin then update public.profiles set is_admin = true where id = p_id; end if;
  return p_id;
end $$;
-- Act as a signed-in user for the statements that follow.
create or replace function tests.login(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
-- Back to the superuser test runner.
create or replace function tests.logout()
returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

-- alice: regular user · bob: second user · admin: is_admin
select tests.create_user('00000000-0000-4000-a000-00000000a11c', 'alice@test.local');
select tests.create_user('00000000-0000-4000-a000-000000000b0b', 'bob@test.local');
select tests.create_user('00000000-0000-4000-a000-0000000ad111', 'admin@test.local', true);

select plan(27);

-- ---- profiles: no privilege escalation -----------------------------------
select tests.login('00000000-0000-4000-a000-00000000a11c');
select throws_ok($$ update profiles set is_admin = true where id = '00000000-0000-4000-a000-00000000a11c' $$, '42501', null, 'user cannot make themselves admin');
select throws_ok($$ insert into profiles (id, handle, is_admin) values (gen_random_uuid(), 'x', true) $$, '42501', null, 'user cannot insert profiles');
select lives_ok($$ update profiles set handle = 'alice' where id = '00000000-0000-4000-a000-00000000a11c' $$, 'user can change their handle');
select is((select count(*)::int from profiles), 1, 'user only sees their own profile');

-- ---- orders / disputes / notifications: no direct writes -----------------
select throws_ok($$ insert into orders (buyer_id, seller_id, shirt_id, size, amount, status) values ('00000000-0000-4000-a000-00000000a11c', '00000000-0000-4000-a000-000000000b0b', 'ger-26', 'M', 1, 'paid_escrow') $$, '42501', null, 'user cannot create orders');
select throws_ok($$ update orders set status = 'released' $$, '42501', null, 'user cannot update orders directly');
select throws_ok($$ insert into disputes (order_id, opened_by, reason) values (gen_random_uuid(), '00000000-0000-4000-a000-00000000a11c', 'x') $$, '42501', null, 'user cannot insert disputes directly');
select throws_ok($$ insert into notifications (user_id, type, title) values ('00000000-0000-4000-a000-000000000b0b', 'x', 'phish') $$, '42501', null, 'user cannot create notifications');

-- ---- events: no spoofing --------------------------------------------------
select throws_ok($$ insert into events (user_id, shirt_id, type) values ('00000000-0000-4000-a000-000000000b0b', 'ger-26', 'buy') $$, '42501', null, 'user cannot log events as someone else');
select throws_ok($$ insert into events (user_id, shirt_id, type) values ('00000000-0000-4000-a000-00000000a11c', 'ger-26', 'hack') $$, '42501', null, 'unknown event types are rejected');
select lives_ok($$ insert into events (user_id, shirt_id, type) values ('00000000-0000-4000-a000-00000000a11c', 'ger-26', 'watch') $$, 'user can log their own events');

-- ---- photo storage: own folder only ---------------------------------------
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('vault-photos', '00000000-0000-4000-a000-00000000a11c/items/x/front.jpg') $$, 'user can upload into their own folder');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('vault-photos', '00000000-0000-4000-a000-000000000b0b/items/x/front.jpg') $$, '42501', null, 'user cannot upload into someone else''s folder');
select tests.login('00000000-0000-4000-a000-000000000b0b');
select is((select count(*)::int from storage.objects where bucket_id = 'vault-photos'), 0, 'users cannot see other users'' photos');
select tests.login('00000000-0000-4000-a000-00000000a11c');

-- ---- internal & admin functions ------------------------------------------
select throws_ok($$ select match_order_book('ger-26', 'M') $$, '42501', null, 'matching engine is not callable via API');
select throws_ok($$ select list_disputes_for_admin() $$, null, 'not authorized', 'admin RPC rejects non-admins');
select throws_ok($$ select resolve_review('x', true, null) $$, null, 'not authorized', 'resolve_review rejects non-admins');
select throws_ok($$ select * from create_api_key('x') $$, null, 'not authorized', 'create_api_key rejects non-admins');
select is((select count(*)::int from api_keys), 0, 'non-admins see no API keys');

-- ---- anon -----------------------------------------------------------------
select tests.logout();
set local role anon;
select throws_ok($$ select order_cancel(gen_random_uuid()) $$, '42501', null, 'anon cannot call order RPCs');
select lives_ok($$ insert into events (user_id, shirt_id, type) values (null, 'ger-26', 'view') $$, 'anon can log a view');
select throws_ok($$ insert into events (user_id, shirt_id, type) values (null, 'ger-26', 'buy') $$, '42501', null, 'anon can only log views');
select lives_ok($$ select * from trending_scores(14) $$, 'anon can read trending');
select lives_ok($$ select * from public_stats() $$, 'anon can read aggregate market stats');
select lives_ok($$ select * from shirt_stats('ger-26') $$, 'anon can read per-shirt stats');
reset role;

-- ---- admin ----------------------------------------------------------------
select tests.login('00000000-0000-4000-a000-0000000ad111');
select lives_ok($$ select list_disputes_for_admin() $$, 'admin can list disputes');
select lives_ok($$ select * from create_api_key('test key') $$, 'admin can create API keys');

select * from finish();
rollback;
