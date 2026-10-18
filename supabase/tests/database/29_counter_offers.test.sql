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

select tests.create_user('00000000-0000-4000-a000-00000004d001', 'seller@neg.test');
select tests.create_user('00000000-0000-4000-a000-00000004d002', 'buyer@neg.test');
update profiles set handle = 'neg_seller' where id = '00000000-0000-4000-a000-00000004d001';
update profiles set handle = 'neg_buyer' where id = '00000000-0000-4000-a000-00000004d002';
insert into custom_items (id, user_id, catalog_id, size, visibility, photos) values ('t-neg-1', '00000000-0000-4000-a000-00000004d001', 'ajx-95', 'M', 'offers', '{"front":{},"back":{},"crest":{},"product_code":{}}');

select plan(13);

select is((select row(valid_hours, max_rounds)::text from offer_policy()), '(48,3)', 'offers are open 48 h, three rounds at most');

select tests.login('00000000-0000-4000-a000-00000004d002');
select lives_ok($$select make_collection_offer('t-neg-1', 150)$$, 'the buyer offers 150');
select ok((select expires_at between now() + interval '47 hours' and now() + interval '49 hours' from collection_offers where item_id = 't-neg-1'), 'valid for 48 hours');
select throws_ok(format('select counter_collection_offer(%L, 170)', (select id from collection_offers where item_id = 't-neg-1')), 'P0002', null, 'the buyer cannot counter their own offer');
select tests.logout();

select tests.login('00000000-0000-4000-a000-00000004d001');
select lives_ok(format('select counter_collection_offer(%L, 220, %L)', (select id from collection_offers where item_id = 't-neg-1' and status = 'open'), 'Mein letzter Preis wäre 220'), 'the owner counters with 220');
select is((select row(round, by_owner, awaiting_me)::text from my_collection_offers() where status = 'open'), '(2,t,f)', 'round two, made by the owner, now the buyer’s turn');
select tests.logout();

select is((select title from notifications where user_id = '00000000-0000-4000-a000-00000004d002' and title like '%counter%'), 'You received a counter-offer', 'the buyer hears about the counter-offer');

select tests.login('00000000-0000-4000-a000-00000004d002');
select is((select awaiting_me from my_collection_offers() where status = 'open'), true, 'the buyer sees it waits for them');
select lives_ok(format('select counter_collection_offer(%L, 190)', (select id from collection_offers where item_id = 't-neg-1' and status = 'open')), 'the buyer counters back with 190 (round three)');
select tests.logout();

select tests.login('00000000-0000-4000-a000-00000004d001');
select throws_ok(format('select counter_collection_offer(%L, 200)', (select id from collection_offers where item_id = 't-neg-1' and status = 'open')), '22023', null, 'no fourth round: accept or decline');
select lives_ok(format('select respond_collection_offer(%L, true)', (select id from collection_offers where item_id = 't-neg-1' and status = 'open')), 'the owner accepts 190');
select tests.logout();

select is((select row(amount, status)::text from orders where custom_item_id = 't-neg-1'), '(190,pending_payment)', 'the agreed price becomes the order');
select is((select string_agg(status, ',' order by round) from collection_offers where item_id = 't-neg-1'), 'countered,countered,accepted', 'the whole negotiation is kept');

select * from finish();
rollback;
