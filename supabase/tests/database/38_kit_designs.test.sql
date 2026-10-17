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

-- Kit designs: my own to keep and change, shared ones for anyone with the link.
select plan(10);

select tests.create_user('00000000-0000-4000-a000-0000000de511', 'designer@designs.test');
select tests.create_user('00000000-0000-4000-a000-0000000de512', 'friend@designs.test');
update public.profiles set handle = 'tap_designer' where id = '00000000-0000-4000-a000-0000000de511';

select tests.login('00000000-0000-4000-a000-0000000de511');
insert into public.kit_designs (name, design) values ('Home', '{"v":1,"base":"#ffffff"}');
insert into public.kit_designs (name, design, shared) values ('Secret', '{"v":1}', false);
select is((select count(*)::int from public.kit_designs), 2, 'a member saves designs');
select is((select user_id::text from public.kit_designs where name = 'Home'), '00000000-0000-4000-a000-0000000de511', 'they are theirs');
select throws_ok($$insert into public.kit_designs (name, design) values ('Big', jsonb_build_object('x', repeat('x', 5000)))$$, '23514', null, 'designs stay small');
select throws_ok($$insert into public.kit_designs (name, design) values ('   ', '{}')$$, '23514', null, 'a design needs a name');
select set_config('tap.home', (select id::text from public.kit_designs where name = 'Home'), true);
select set_config('tap.secret', (select id::text from public.kit_designs where name = 'Secret'), true);
select tests.logout();

select tests.login('00000000-0000-4000-a000-0000000de512');
select is((select count(*)::int from public.kit_designs), 0, 'others do not list my designs');
update public.kit_designs set name = 'Mine now' where id = current_setting('tap.home')::uuid;
select is((select count(*)::int from shared_kit_design(current_setting('tap.home')::uuid) where name = 'Home'), 1, 'nor change them, but see a shared one');
select is((select handle || ':' || is_mine from shared_kit_design(current_setting('tap.home')::uuid)), 'tap_designer:false', 'with its designer');
select is((select count(*)::int from shared_kit_design(current_setting('tap.secret')::uuid)), 0, 'a design not shared stays private');
select tests.logout();

set local role anon;
select is((select count(*)::int from shared_kit_design(current_setting('tap.home')::uuid)), 1, 'visitors open a shared link too');
select throws_ok($$insert into public.kit_designs (name, design) values ('x', '{}')$$, '42501', null, 'but cannot save');
reset role;

select * from finish();
rollback;
