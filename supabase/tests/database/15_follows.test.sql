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

-- fan follows star; star lists and shows shirts.
select tests.create_user('00000000-0000-4000-a000-0000000f0a01', 'fan@test.local');
select tests.create_user('00000000-0000-4000-a000-0000000f0a02', 'star@test.local');
update profiles set handle = 'fan_one' where id = '00000000-0000-4000-a000-0000000f0a01';
update profiles set handle = 'star_kits' where id = '00000000-0000-4000-a000-0000000f0a02';
insert into custom_items (id, user_id, catalog_id, visibility, size, flock, patches, signature, condition)
values ('t-star-1', '00000000-0000-4000-a000-0000000f0a02', 'sui-26', 'public', 'M', '{"source":"official","name":"XHAKA","number":"10"}', '["nations"]', '{"signed":false}', '{"grade":9,"defects":[]}');

select plan(17);

select tests.login('00000000-0000-4000-a000-0000000f0a01');
select throws_ok($$select follow_collector('star_kits_nobody')$$, 'P0002', 'no such collector', 'unknown handles cannot be followed');
select throws_ok($$select follow_collector('FAN_ONE')$$, '22023', 'you cannot follow yourself', 'members cannot follow themselves');
select lives_ok($$select follow_collector('Star_Kits')$$, 'a member follows a collector by handle');
select lives_ok($$select follow_collector('star_kits')$$, 'following twice is harmless');
select is((select row(followers, following, is_following, is_me)::text from collector_profile('star_kits')), '(1,0,t,f)', 'the profile counts the follower and knows the viewer follows');
select is((select handle from my_following()), 'star_kits', 'the follower sees whom they follow');
select is((select count(*)::int from follows), 1, 'members see their own follows');
select throws_ok($$insert into follows values ('00000000-0000-4000-a000-0000000f0a01', '00000000-0000-4000-a000-0000000f0a02')$$, '42501', null, 'follows are written through the functions only');
select tests.logout();

select is((select body from notifications where user_id = '00000000-0000-4000-a000-0000000f0a02' and type = 'new_follower'), '@fan_one now follows your collection', 'the collector hears about a new follower');

-- star's activity reaches the follower, throttled while unread
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-0000000f0a02', 'sui-26', 'L', 180);
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-0000000f0a02', 'sui-26', 'XL', 190);
select is((select count(*)::int from notifications where user_id = '00000000-0000-4000-a000-0000000f0a01' and type = 'followed_listing'), 1, 'a new listing notifies followers once while unread');
update custom_items set visibility = 'private' where id = 't-star-1';
update custom_items set visibility = 'forsale' where id = 't-star-1';
select is((select data ->> 'handle' from notifications where user_id = '00000000-0000-4000-a000-0000000f0a01' and type = 'followed_shirt'), 'star_kits', 'a shirt that becomes visible notifies followers');

select is((select verification_level from public_collection('star_kits')), null::text, 'without the opt-in no valuation inputs leave the database');
update profiles set show_collection_value = true where id = '00000000-0000-4000-a000-0000000f0a02';
select is((select patches from public_collection('star_kits')), '["nations"]'::jsonb, 'with the opt-in the profile gets what the valuation needs');
select is((select show_value from collector_profile('star_kits')), true, 'the profile knows the value is shown');

select tests.login('00000000-0000-4000-a000-0000000f0a01');
select lives_ok($$select unfollow_collector('star_kits')$$, 'a member unfollows');
select is((select followers from collector_profile('star_kits')), 0, 'and is no longer counted');
select tests.logout();

set local role anon;
select throws_ok($$select follow_collector('star_kits')$$, '42501', null, 'visitors cannot follow');
reset role;

select * from finish();
rollback;
