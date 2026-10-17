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

-- Likes and comments on shirts in other members' collections.
select plan(14);

select tests.create_user('00000000-0000-4000-a000-00000050c1a1', 'owner@social.test');
select tests.create_user('00000000-0000-4000-a000-00000050c1a2', 'fan@social.test');
update public.profiles set handle = 'tap_owner' where id = '00000000-0000-4000-a000-00000050c1a1';
update public.profiles set handle = 'tap_fan' where id = '00000000-0000-4000-a000-00000050c1a2';
insert into public.custom_items (id, user_id, catalog_id, size, version, visibility, condition, flock, patches, signature, photos) values
  ('tap-shown', '00000000-0000-4000-a000-00000050c1a1', 'juv-9697', 'M', 'Replica', 'public', '{"grade":8,"defects":[]}', '{"source":"Keine"}', '[]', '{"signed":false}', '{}'),
  ('tap-hidden', '00000000-0000-4000-a000-00000050c1a1', 'juv-9697', 'L', 'Replica', 'private', '{"grade":8,"defects":[]}', '{"source":"Keine"}', '[]', '{"signed":false}', '{}');

select tests.login('00000000-0000-4000-a000-00000050c1a2');
select is(set_item_like('tap-shown', true), 1, 'a member likes a shown shirt');
select is(set_item_like('tap-shown', true), 1, 'liking twice counts once');
select throws_ok($$select set_item_like('tap-hidden', true)$$, 'P0002', 'no such shirt', 'private shirts cannot be liked');
select isnt(add_item_comment('tap-shown', '  What a classic!  '), null, 'a member comments');
select throws_ok($$select add_item_comment('tap-shown', '   ')$$, '22023', null, 'empty comments are refused');
select throws_ok($$select add_item_comment('tap-hidden', 'hi')$$, 'P0002', 'no such shirt', 'nor on private shirts');
select is((select likes || ':' || liked || ':' || (comments -> 0 ->> 'body') || ':' || (comments -> 0 ->> 'handle') from item_social('tap-shown')), '1:true:What a classic!:tap_fan', 'likes, my like and the trimmed comment show');
select throws_ok($$select * from item_likes$$, '42501', null, 'the tables are not read directly');
select tests.logout();

select is((select count(*)::int from public.notifications where user_id = '00000000-0000-4000-a000-00000050c1a1' and type in ('shirt_liked', 'shirt_comment')), 2, 'the owner hears about the like and the comment, once each');
select is((select data ->> 'link' from public.notifications where user_id = '00000000-0000-4000-a000-00000050c1a1' and type = 'shirt_comment'), '/u/tap_owner/tap-shown', 'the notification leads to the shirt');

set local role anon;
select is((select likes from item_social('tap-shown')), 1, 'visitors see the likes');
select throws_ok($$select set_item_like('tap-shown', true)$$, '42501', null, 'but cannot like');
reset role;

-- The owner can remove any comment on their shirt.
select set_config('tap.comment', (select id::text from public.item_comments where item_id = 'tap-shown'), true);
select tests.login('00000000-0000-4000-a000-00000050c1a1');
select lives_ok($$select delete_item_comment(current_setting('tap.comment')::uuid)$$, 'the owner removes a comment');
select is((select jsonb_array_length(comments) from item_social('tap-shown')), 0, 'and it is gone');
select tests.logout();

select * from finish();
rollback;
