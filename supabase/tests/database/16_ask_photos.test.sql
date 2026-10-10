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

select tests.create_user('00000000-0000-4000-a000-0000000ab0a1', 'lister@test.local');
select tests.create_user('00000000-0000-4000-a000-0000000ab0a2', 'other@test.local');
update profiles set handle = 'photo_lister' where id = '00000000-0000-4000-a000-0000000ab0a1';

select plan(8);

select tests.login('00000000-0000-4000-a000-0000000ab0a1');
select lives_ok($$insert into asks (user_id, shirt_id, size, amount, photos) values ('00000000-0000-4000-a000-0000000ab0a1', 'acm-0607', 'S', 777,
  '[{"kind":"front","path":"00000000-0000-4000-a000-0000000ab0a1/asks/d1/front.jpg","thumbPath":"00000000-0000-4000-a000-0000000ab0a1/asks/d1/front_thumb.jpg"},
    {"kind":"label","path":"00000000-0000-4000-a000-0000000ab0a1/asks/d1/label.jpg"}]')$$, 'a seller lists with photos from their own folder');
select throws_ok($$insert into asks (user_id, shirt_id, size, amount, photos) values ('00000000-0000-4000-a000-0000000ab0a1', 'acm-0607', 'S', 778,
  '[{"kind":"front","path":"00000000-0000-4000-a000-0000000ab0a2/items/x/front.jpg"}]')$$, '42501', null, 'someone else''s photos cannot be attached');
select throws_ok($$insert into asks (user_id, shirt_id, size, amount, photos) values ('00000000-0000-4000-a000-0000000ab0a1', 'acm-0607', 'S', 779,
  '[{"kind":"front","path":"00000000-0000-4000-a000-0000000ab0a1/a.jpg","thumbPath":"00000000-0000-4000-a000-0000000ab0a2/b.jpg"}]')$$, '42501', null, 'nor a thumbnail from another folder');
select throws_ok($$insert into asks (user_id, shirt_id, size, amount, photos) values ('00000000-0000-4000-a000-0000000ab0a1', 'acm-0607', 'S', 780,
  (select jsonb_agg(jsonb_build_object('kind','x','path','00000000-0000-4000-a000-0000000ab0a1/p' || i || '.jpg')) from generate_series(1, 7) i))$$, '23514', null, 'at most six photos');
select tests.logout();

set local role anon;
select ok(is_visible_vault_photo('00000000-0000-4000-a000-0000000ab0a1/asks/d1/label.jpg'), 'listing photos are public');
select ok(is_visible_vault_photo('00000000-0000-4000-a000-0000000ab0a1/asks/d1/front_thumb.jpg'), 'thumbnails too');
select ok(not is_visible_vault_photo('00000000-0000-4000-a000-0000000ab0a1/items/secret/front.jpg'), 'other photos in the seller''s folder stay private');
select is((select thumb_path from seller_listings('photo_lister') where amount = 777), '00000000-0000-4000-a000-0000000ab0a1/asks/d1/front_thumb.jpg', 'seller pages show the first photo');
reset role;

select * from finish();
rollback;
