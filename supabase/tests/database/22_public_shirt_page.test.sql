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

select tests.create_user('00000000-0000-4000-a000-0000000c5a01', 'owner@test.local');
update profiles set handle = 'shirt_owner' where id = '00000000-0000-4000-a000-0000000c5a01';
insert into custom_items (id, user_id, catalog_id, size, visibility, photos) values
  ('t-page-1', '00000000-0000-4000-a000-0000000c5a01', 'sui-26', 'M', 'public',
   '{"front":{"path":"00000000-0000-4000-a000-0000000c5a01/items/a/front.jpg","thumbPath":"00000000-0000-4000-a000-0000000c5a01/items/a/front_thumb.jpg"},"front_studio":{"path":"00000000-0000-4000-a000-0000000c5a01/items/a/studio.jpg","thumbPath":"00000000-0000-4000-a000-0000000c5a01/items/a/studio_thumb.jpg"},"back":{"path":"00000000-0000-4000-a000-0000000c5a01/items/a/back.jpg","thumbPath":"00000000-0000-4000-a000-0000000c5a01/items/a/back_thumb.jpg"},"product_code":{"path":"00000000-0000-4000-a000-0000000c5a01/items/a/label.jpg"}}'),
  ('t-page-2', '00000000-0000-4000-a000-0000000c5a01', 'ned-88', 'L', 'private',
   '{"front":{"path":"00000000-0000-4000-a000-0000000c5a01/items/b/front.jpg"},"back":{"path":"00000000-0000-4000-a000-0000000c5a01/items/b/back.jpg"}}');

select plan(7);

set local role anon;
select is((select array_agg(kind || ':' || path order by kind desc) from public_shirt_photos('Shirt_Owner', 't-page-1')),
          array['main:00000000-0000-4000-a000-0000000c5a01/items/a/studio.jpg', 'back:00000000-0000-4000-a000-0000000c5a01/items/a/back.jpg'],
          'a shown shirt gives its main picture and the back');
select is((select count(*)::int from public_shirt_photos('shirt_owner', 't-page-2')), 0, 'a private shirt gives nothing');
select is((select count(*)::int from public_shirt_photos('someone_else', 't-page-1')), 0, 'only under its owner''s name');
select ok(is_visible_vault_photo('00000000-0000-4000-a000-0000000c5a01/items/a/back_thumb.jpg'), 'the back photo is readable');
select ok(not is_visible_vault_photo('00000000-0000-4000-a000-0000000c5a01/items/a/label.jpg'), 'the label photo is not');
select ok(not is_visible_vault_photo('00000000-0000-4000-a000-0000000c5a01/items/a/front.jpg'), 'nor the original front once there is a studio photo');
select ok(not is_visible_vault_photo('00000000-0000-4000-a000-0000000c5a01/items/b/back.jpg'), 'nor anything of a private shirt');
reset role;

select * from finish();
rollback;
