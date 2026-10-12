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

select tests.create_user('00000000-0000-4000-a000-0000000f7e01', 'free@test.local');
select tests.create_user('00000000-0000-4000-a000-0000000f7e02', 'pro@test.local');
update profiles set handle = 'free_fan' where id = '00000000-0000-4000-a000-0000000f7e01';
update profiles set handle = 'pro_fan', premium_until = now() + interval '30 days' where id = '00000000-0000-4000-a000-0000000f7e02';
-- Seeded without a member session: 9 shirts each (not counted against anyone while seeding).
insert into custom_items (id, user_id, catalog_id, size)
select 'free-' || g, '00000000-0000-4000-a000-0000000f7e01', 'sui-26', 'M' from generate_series(1, 9) g;
insert into custom_items (id, user_id, catalog_id, size)
select 'pro-' || g, '00000000-0000-4000-a000-0000000f7e02', 'sui-26', 'M' from generate_series(1, 10) g;

select plan(8);

select is(free_shirt_limit(), 10, 'the free plan holds 10 shirts');

select tests.login('00000000-0000-4000-a000-0000000f7e01');
select lives_ok($$insert into custom_items (id, user_id, catalog_id, size) values ('free-10', '00000000-0000-4000-a000-0000000f7e01', 'ajx-95', 'L')$$, 'the 10th shirt fits the free plan');
select throws_ok($$insert into custom_items (id, user_id, catalog_id, size) values ('free-11', '00000000-0000-4000-a000-0000000f7e01', 'ajx-95', 'L')$$, 'P0402', null, 'the 11th needs Premium');
select lives_ok($$insert into custom_items (id, user_id, catalog_id, size) values ('free-3', '00000000-0000-4000-a000-0000000f7e01', 'ned-88', 'S') on conflict (id) do update set size = excluded.size$$, 'editing a shirt you have is always fine');
select throws_ok($$update profiles set premium_until = now() + interval '1 year' where id = '00000000-0000-4000-a000-0000000f7e01'$$, '42501', null, 'members can''t grant themselves Premium …');
select tests.logout();
select is((select premium_until from profiles where id = '00000000-0000-4000-a000-0000000f7e01'), null::timestamptz, '… so the free plan stays');

select tests.login('00000000-0000-4000-a000-0000000f7e02');
select lives_ok($$insert into custom_items (id, user_id, catalog_id, size) values ('pro-11', '00000000-0000-4000-a000-0000000f7e02', 'ajx-95', 'L')$$, 'Premium has no limit');
select throws_ok($$select admin_set_premium('free_fan', now() + interval '1 year')$$, '42501', null, 'only admins grant Premium by hand');
select tests.logout();

select * from finish();
rollback;
