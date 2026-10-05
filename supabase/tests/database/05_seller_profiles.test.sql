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
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
create or replace function tests.logout()
returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;
create or replace function tests.order_for(p_shirt text, p_size text)
returns public.orders language sql security definer as $$ select * from public.orders where shirt_id = p_shirt and size = p_size order by created_at desc limit 1 $$;
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

-- alice buys from bob (handle bob_sells); carol is a bystander
select tests.create_user('00000000-0000-4000-a000-00000000a11c', 'alice@test.local');
select tests.create_user('00000000-0000-4000-a000-000000000b0b', 'bob@test.local');
select tests.create_user('00000000-0000-4000-a000-0000000ca201', 'carol@test.local');
update profiles set handle = 'bob_sells' where id = '00000000-0000-4000-a000-000000000b0b';

insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-000000000b0b', 'sui-26', 'L', 90);
insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000a11c', 'sui-26', 'L', 90);
update orders set status = 'released', inspection = 'passed', paid_at = now() - interval '5 days', shipped_at = now() - interval '3 days'
 where id = (tests.order_for('sui-26', 'L')).id;
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-000000000b0b', 'acm-0607', 'M', 999);
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-000000000b0b', 'ars-91', 'M', 300);
insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000a11c', 'ars-91', 'M', 300);

select plan(13);

select tests.login('00000000-0000-4000-a000-000000000b0b');
select throws_ok(format('select review_seller(%L, 5)', (tests.order_for('sui-26', 'L')).id), null, 'only the buyer of a completed order can review it', 'sellers cannot review themselves');
select tests.login('00000000-0000-4000-a000-00000000a11c');
select throws_ok(format('select review_seller(%L, 5)', (tests.order_for('ars-91', 'M')).id), null, 'only the buyer of a completed order can review it', 'unfinished orders cannot be reviewed');
select throws_ok(format('select review_seller(%L, 6)', (tests.order_for('sui-26', 'L')).id), null, 'rating must be 1 to 5', 'ratings are 1 to 5');
select lives_ok(format('select review_seller(%L, 5, %L)', (tests.order_for('sui-26', 'L')).id, 'Fast and exactly as described'), 'the buyer reviews the seller');
select throws_ok(format('select review_seller(%L, 1)', (tests.order_for('sui-26', 'L')).id), null, 'this order has already been reviewed', 'one review per order');
select tests.logout();
select ok(exists (select 1 from notifications where user_id = '00000000-0000-4000-a000-000000000b0b' and type = 'seller_review'), 'the seller hears about it');

set local role anon;
select is((select row(sales, rating, reviews, pass_rate, listings)::text from seller_profile('BOB_SELLS')), '(1,5.00,1,1.000,1)', 'public profile: sales, rating, pass rate, live listings');
select is((select avg_ship_days from seller_profile('bob_sells')), 2.0, 'public profile: days from payment to shipping');
select is((select count(*)::int from seller_profile('nobody_here')), 0, 'unknown handles have no profile');
select is((select comment from seller_review_list('bob_sells') limit 1), 'Fast and exactly as described', 'reviews are public on the profile');
select is((select count(*)::int from seller_listings('bob_sells')), 1, 'live listings are listed');
select is((select count(*)::int from seller_reviews), 0, 'the review table itself is not public');
select is((select handle from seller_cards(array['00000000-0000-4000-a000-000000000b0b'::uuid])), 'bob_sells', 'shirt pages can label an ask with its seller');
reset role;

select * from finish();
rollback;
