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
create or replace function tests.notes(p_user uuid, p_type text)
returns int language sql security definer as $$ select count(*)::int from public.notifications where user_id = p_user and type = p_type $$;
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

-- owner shows shirts; fan wants the Ajax shirt (watchlist) and offers; rival offers too.
select tests.create_user('00000000-0000-4000-a000-0000000c0f01', 'owner@test.local');
select tests.create_user('00000000-0000-4000-a000-0000000c0f02', 'fan@test.local');
select tests.create_user('00000000-0000-4000-a000-0000000c0f03', 'rival@test.local');
update profiles set handle = 'kit_owner' where id = '00000000-0000-4000-a000-0000000c0f01';
update profiles set handle = 'kit_fan' where id = '00000000-0000-4000-a000-0000000c0f02';
insert into watchlist (user_id, shirt_id) values ('00000000-0000-4000-a000-0000000c0f02', 'ajx-95');
insert into custom_items (id, user_id, catalog_id, size, visibility) values
  ('t-off-1', '00000000-0000-4000-a000-0000000c0f01', 'ajx-95', 'M', 'private'),
  ('t-off-2', '00000000-0000-4000-a000-0000000c0f01', 'ned-88', 'L', 'public');

select plan(16);

select is(tests.notes('00000000-0000-4000-a000-0000000c0f02', 'wanted_in_collection'), 0, 'a private shirt tells nobody');
update custom_items set visibility = 'offers' where id = 't-off-1';
select is(tests.notes('00000000-0000-4000-a000-0000000c0f02', 'wanted_in_collection'), 1, 'opening a wanted shirt to offers tells the members who want it');
update custom_items set visibility = 'forsale' where id = 't-off-1';
select is(tests.notes('00000000-0000-4000-a000-0000000c0f02', 'wanted_in_collection'), 1, 'only once per shirt');

select tests.login('00000000-0000-4000-a000-0000000c0f02');
select throws_ok($$select make_collection_offer('t-off-2', 100)$$, 'P0002', 'this shirt is not open to offers', 'shirts only on show take no offers');
select lives_ok($$select make_collection_offer('t-off-1', 180, 'Mein Lieblingstrikot!')$$, 'a member makes an offer');
select lives_ok($$select make_collection_offer('t-off-1', 200)$$, 'and raises it');
select is((select row(amount, status)::text from collection_offers where buyer_id = '00000000-0000-4000-a000-0000000c0f02'), '(200,open)', 'the new offer replaces the old one');
select tests.logout();
select is(tests.notes('00000000-0000-4000-a000-0000000c0f01', 'collection_offer'), 2, 'the owner hears about each offer');

select tests.login('00000000-0000-4000-a000-0000000c0f01');
select throws_ok($$select make_collection_offer('t-off-1', 50)$$, '22023', 'you cannot make an offer on your own shirt', 'no offers on your own shirts');
select tests.logout();
select tests.login('00000000-0000-4000-a000-0000000c0f03');
select lives_ok($$select make_collection_offer('t-off-1', 150)$$, 'a second member offers');
select throws_ok(format('select respond_collection_offer(%L, true)', (select id from collection_offers where buyer_id = '00000000-0000-4000-a000-0000000c0f02')), 'P0002', 'no such offer', 'only the owner can accept');
select is((select count(*)::int from collection_offers), 1, 'members see only their own offers');
select tests.logout();

select tests.login('00000000-0000-4000-a000-0000000c0f01');
select lives_ok(format('select respond_collection_offer(%L, true)', (select id from collection_offers where buyer_id = '00000000-0000-4000-a000-0000000c0f02')), 'the owner accepts');
select tests.logout();
select is((select row(buyer_id, seller_id, shirt_id, custom_item_id, size, amount, commission, status)::text from orders where custom_item_id = 't-off-1'),
          '(00000000-0000-4000-a000-0000000c0f02,00000000-0000-4000-a000-0000000c0f01,ajx-95,t-off-1,M,200,16,pending_payment)', 'accepting creates an order the buyer pays like any other');
select is(tests.notes('00000000-0000-4000-a000-0000000c0f02', 'offer_accepted'), 1, 'the buyer hears the offer was accepted');
select is((select status from collection_offers where buyer_id = '00000000-0000-4000-a000-0000000c0f03'), 'declined', 'the other offer is declined');

select * from finish();
rollback;
