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

select tests.create_user('00000000-0000-4000-a000-0000000a7a01', 'pele_fan@test.local');
select tests.create_user('00000000-0000-4000-a000-0000000a7a02', 'other@test.local');
update profiles set handle = 'avatar_fan' where id = '00000000-0000-4000-a000-0000000a7a01';
update profiles set handle = 'avatar_other' where id = '00000000-0000-4000-a000-0000000a7a02';
insert into follows (follower_id, followee_id) values ('00000000-0000-4000-a000-0000000a7a02', '00000000-0000-4000-a000-0000000a7a01');

select plan(8);

select tests.login('00000000-0000-4000-a000-0000000a7a01');
select lives_ok($$update profiles set avatar = 'legend-07' where id = '00000000-0000-4000-a000-0000000a7a01'$$, 'a member picks a legend avatar');
select throws_ok($$update profiles set avatar = 'legend-51' where id = '00000000-0000-4000-a000-0000000a7a01'$$, '23514', null, 'only the 50 legends exist');
select throws_ok($$update profiles set avatar = 'https://example.com/x.png' where id = '00000000-0000-4000-a000-0000000a7a01'$$, '23514', null, 'no links as avatars');
update profiles set avatar = 'legend-12' where id = '00000000-0000-4000-a000-0000000a7a02';
select tests.logout();
select is((select avatar from profiles where id = '00000000-0000-4000-a000-0000000a7a02'), null::text, 'nobody changes another member''s avatar');

set local role anon;
select is((select avatar from search_collectors('avatar_fan')), 'legend-07', 'search shows the avatar');
select is((select avatar from collector_profile('avatar_fan')), 'legend-07', 'so does the profile');
reset role;

select tests.login('00000000-0000-4000-a000-0000000a7a02');
select is((select avatar from my_following() where handle = 'avatar_fan'), 'legend-07', 'and the following list');
select lives_ok($$update profiles set avatar = null where id = '00000000-0000-4000-a000-0000000a7a02'$$, 'back to initials');
select tests.logout();

select * from finish();
rollback;
