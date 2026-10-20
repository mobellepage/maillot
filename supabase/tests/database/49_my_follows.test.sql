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

-- My own profile lists whom I follow and who follows me; nobody else's.
select plan(4);

select tests.create_user('00000000-0000-4000-a000-0000000fa001', 'me@follows.test');
select tests.create_user('00000000-0000-4000-a000-0000000fa002', 'friend@follows.test');
select tests.create_user('00000000-0000-4000-a000-0000000fa003', 'fan@follows.test');
update profiles set handle = 'fol_me' where id = '00000000-0000-4000-a000-0000000fa001';
update profiles set handle = 'fol_friend' where id = '00000000-0000-4000-a000-0000000fa002';
update profiles set handle = 'fol_fan' where id = '00000000-0000-4000-a000-0000000fa003';
insert into follows (follower_id, followee_id) values
  ('00000000-0000-4000-a000-0000000fa001', '00000000-0000-4000-a000-0000000fa002'),
  ('00000000-0000-4000-a000-0000000fa003', '00000000-0000-4000-a000-0000000fa001');

select tests.login('00000000-0000-4000-a000-0000000fa001');
select is((select handle from my_follows() where direction = 'following'), 'fol_friend', 'whom I follow');
select is((select handle from my_follows() where direction = 'follower'), 'fol_fan', 'who follows me');
select is((select count(*)::int from my_follows()), 2, 'nothing else');
select tests.logout();

set local role anon;
select throws_ok($$select * from my_follows()$$, '42501', null, 'visitors can''t ask');
reset role;

select * from finish();
rollback;
