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

select tests.create_user('00000000-0000-4000-a000-0000000b1a01', 'shy@test.local');
select tests.create_user('00000000-0000-4000-a000-0000000b1a02', 'fan@test.local');
update profiles set handle = 'shy_collector' where id = '00000000-0000-4000-a000-0000000b1a01';
insert into custom_items (id, user_id, catalog_id, size, photos) values
  ('t-priv-1', '00000000-0000-4000-a000-0000000b1a01', 'ajx-95', 'M', '{"front":{"path":"00000000-0000-4000-a000-0000000b1a01/items/p1/front.jpg"}}');
insert into custom_items (id, user_id, catalog_id, size, visibility, photos) values
  ('t-priv-2', '00000000-0000-4000-a000-0000000b1a01', 'ned-88', 'L', 'offers', '{"front":{},"back":{},"crest":{},"product_code":{}}');

select plan(9);

select is((select visibility from custom_items where id = 't-priv-1'), 'public', 'a new shirt is public unless chosen otherwise');
set local role anon;
select is((select count(*)::int from public_collection('shy_collector')), 2, 'a public collection shows on the profile');
reset role;

select tests.login('00000000-0000-4000-a000-0000000b1a01');
select lives_ok($$update profiles set collection_private = true where id = '00000000-0000-4000-a000-0000000b1a01'$$, 'a member makes their collection private');
select tests.logout();

set local role anon;
select is((select count(*)::int from public_collection('shy_collector')), 0, 'a private collection shows nothing');
select is((select row(shirts, preview)::text from search_collectors('shy_collector')), '(0,{})', 'the member is still found, but shows no shirts');
select ok(not is_visible_vault_photo('00000000-0000-4000-a000-0000000b1a01/items/p1/front.jpg'), 'its photos are not readable');
select is((select collection_private from collector_profile('shy_collector')), true, 'the profile says the collection is private');
reset role;

select tests.login('00000000-0000-4000-a000-0000000b1a02');
select throws_ok($$select make_collection_offer('t-priv-2', 100)$$, 'P0002', 'this shirt is not open to offers', 'no offers on a private collection');
select tests.logout();

insert into watchlist (user_id, shirt_id) values ('00000000-0000-4000-a000-0000000b1a02', 'bra-70');
insert into custom_items (id, user_id, catalog_id, size, visibility, photos) values ('t-priv-3', '00000000-0000-4000-a000-0000000b1a01', 'bra-70', 'M', 'forsale', '{"front":{},"back":{},"crest":{},"product_code":{}}');
select is((select count(*)::int from notifications where user_id = '00000000-0000-4000-a000-0000000b1a02' and type = 'wanted_in_collection'), 0, 'nobody hears about shirts in a private collection');

select * from finish();
rollback;
