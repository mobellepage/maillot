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

-- Instagram-like: the Following feed, stories, follower lists and the bio.
select plan(8);

select tests.create_user('00000000-0000-4000-a000-0000000fb001', 'me@ig.test');
select tests.create_user('00000000-0000-4000-a000-0000000fb002', 'friend@ig.test');
select tests.create_user('00000000-0000-4000-a000-0000000fb003', 'stranger@ig.test');
update profiles set handle = 'ig_me' where id = '00000000-0000-4000-a000-0000000fb001';
update profiles set handle = 'ig_friend', bio = 'Serie A, 90s' where id = '00000000-0000-4000-a000-0000000fb002';
update profiles set handle = 'ig_stranger' where id = '00000000-0000-4000-a000-0000000fb003';
insert into follows (follower_id, followee_id) values ('00000000-0000-4000-a000-0000000fb001', '00000000-0000-4000-a000-0000000fb002');
insert into custom_items (id, user_id, catalog_id, size, visibility, created_at) values
  ('t-ig-new', '00000000-0000-4000-a000-0000000fb002', 'sui-26', 'M', 'public', now() - interval '1 hour'),
  ('t-ig-old', '00000000-0000-4000-a000-0000000fb002', 'sui-26', 'L', 'public', now() - interval '3 days'),
  ('t-ig-hidden', '00000000-0000-4000-a000-0000000fb002', 'sui-26', 'S', 'private', now()),
  ('t-ig-stranger', '00000000-0000-4000-a000-0000000fb003', 'sui-26', 'M', 'public', now());

select tests.login('00000000-0000-4000-a000-0000000fb001');
select is((select array_agg(id) from following_feed(null, 20)), array['t-ig-new', 't-ig-old'], 'the shirts of whom I follow, newest first, nothing private, nobody else');
select is((select array_agg(id) from following_feed(now() - interval '2 hours', 20)), array['t-ig-old'], 'the next page starts before the last one shown');
select is((select handle from following_stories()), 'ig_friend', 'a story for a collector who added a shirt today');
select is((select jsonb_array_length(items) from following_stories()), 1, 'with only the last day''s shirts');
select is((select bio || ' · ' || shirts from collector_profile('ig_friend')), 'Serie A, 90s · 2', 'the profile has the bio and the shirts shown');
select is((select count(*)::int from collector_follows('ig_friend') where direction = 'follower' and handle = 'ig_me'), 1, 'anyone can see who follows a collector');
select lives_ok($$update profiles set bio = 'Bern · YB' where id = '00000000-0000-4000-a000-0000000fb001'$$, 'members write their own bio');
select tests.logout();

set local role anon;
select throws_ok($$select * from following_feed()$$, '42501', null, 'the Following feed is for members');
reset role;

select * from finish();
rollback;
