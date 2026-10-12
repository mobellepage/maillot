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

select tests.create_user('00000000-0000-4000-a000-00000002b001', 'star@test.local');
select tests.create_user('00000000-0000-4000-a000-00000002b002', 'quiet@test.local');
select tests.create_user('00000000-0000-4000-a000-00000002b003', 'hidden@test.local');
update profiles set handle = 'top_star' where id = '00000000-0000-4000-a000-00000002b001';
update profiles set handle = 'top_quiet' where id = '00000000-0000-4000-a000-00000002b002';
update profiles set handle = 'top_hidden', collection_private = true where id = '00000000-0000-4000-a000-00000002b003';
insert into custom_items (id, user_id, catalog_id, size, visibility) values
  ('t-top-1', '00000000-0000-4000-a000-00000002b001', 'ned-88', 'M', 'public'),
  ('t-top-2', '00000000-0000-4000-a000-00000002b001', 'ajx-95', 'L', 'private'),
  ('t-top-3', '00000000-0000-4000-a000-00000002b002', 'sui-26', 'M', 'private'),
  ('t-top-4', '00000000-0000-4000-a000-00000002b003', 'bra-70', 'M', 'public');
insert into follows (follower_id, followee_id) values
  ('00000000-0000-4000-a000-00000002b002', '00000000-0000-4000-a000-00000002b001'),
  ('00000000-0000-4000-a000-00000002b003', '00000000-0000-4000-a000-00000002b001');

select plan(3);

set local role anon;
select is((select row(shirts, followers)::text from top_collectors(20) where handle = 'top_star'), '(1,2)', 'counts shown shirts and followers');
select is((select count(*)::int from top_collectors(20) where handle = 'top_quiet'), 0, 'members who show nothing are not listed');
select is((select count(*)::int from top_collectors(20) where handle = 'top_hidden'), 0, 'private collections never appear');
reset role;

select * from finish();
rollback;
