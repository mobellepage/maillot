begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- ---- helpers (inlined so every file is self-contained) --------------------
create schema if not exists tests;
create or replace function tests.create_user(p_id uuid, p_email text, p_admin boolean default false)
returns uuid language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email);
  if p_admin then update public.profiles set is_admin = true where id = p_id; end if;
  return p_id;
end $$;
-- Act as a signed-in user for the statements that follow.
create or replace function tests.login(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
-- Back to the superuser test runner.
create or replace function tests.logout()
returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

-- alice: buyer · bob: seller · carol: bystander · admin: is_admin
-- Shirts used here are deliberately ones supabase/seed.sql doesn't list on.
select tests.create_user('00000000-0000-4000-a000-00000000a11c', 'alice@test.local');
select tests.create_user('00000000-0000-4000-a000-000000000b0b', 'bob@test.local');
select tests.create_user('00000000-0000-4000-a000-0000000ad111', 'admin@test.local', true);
select tests.create_user('00000000-0000-4000-a000-0000000ca201', 'carol@test.local');

-- Order lookup by shirt/size for assertions, independent of the caller's RLS.
create or replace function tests.order_for(p_shirt text, p_size text)
returns public.orders language sql security definer as $$ select * from public.orders where shirt_id = p_shirt and size = p_size order by created_at desc limit 1 $$;
grant execute on function tests.order_for(text, text) to authenticated;
create or replace function tests.last_dispute()
returns uuid language sql security definer as $$ select id from public.disputes order by created_at desc limit 1 $$;
grant execute on function tests.last_dispute() to authenticated;

select plan(32);

-- ======================= matching engine ==================================
-- self-trade: one user's crossing bid and ask must never match
select tests.login('00000000-0000-4000-a000-00000000a11c');
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000a11c', 'ned-88', 'M', 100);
insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000a11c', 'ned-88', 'M', 100);
select tests.logout();
select is((select count(*)::int from orders where shirt_id = 'ned-88'), 0, 'no self-trade');

-- a real cross executes at the resting ask price
select tests.login('00000000-0000-4000-a000-000000000b0b');
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-000000000b0b', 'liv-2526', 'L', 120);
select tests.login('00000000-0000-4000-a000-00000000a11c');
insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000a11c', 'liv-2526', 'L', 130);
select tests.logout();
select is((tests.order_for('liv-2526', 'L')).status, 'pending_payment', 'crossing bid creates a pending order');
select is((tests.order_for('liv-2526', 'L')).amount, 120::numeric, 'trade executes at the ask price');
select is((tests.order_for('liv-2526', 'L')).commission, 10::numeric, 'commission is 8% rounded');
select is((select status from bids where user_id = '00000000-0000-4000-a000-00000000a11c' and shirt_id = 'liv-2526'), 'matched', 'bid marked matched');

-- expired bids are ignored
insert into bids (user_id, shirt_id, size, amount, expires_at) values ('00000000-0000-4000-a000-00000000a11c', 'liv-2526', 'S', 200, now() - interval '1 day');
select tests.login('00000000-0000-4000-a000-000000000b0b');
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-000000000b0b', 'liv-2526', 'S', 150);
select tests.logout();
select is((select count(*)::int from orders where shirt_id = 'liv-2526' and size = 'S'), 0, 'expired bid does not match');

-- the sweep fills the highest bid first, then the next
select tests.login('00000000-0000-4000-a000-00000000a11c');
insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000a11c', 'boc-81', 'M', 100);
select tests.login('00000000-0000-4000-a000-0000000ca201');
insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-0000000ca201', 'boc-81', 'M', 110);
select tests.login('00000000-0000-4000-a000-000000000b0b');
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-000000000b0b', 'boc-81', 'M', 90);
select tests.logout();
select is((tests.order_for('boc-81', 'M')).buyer_id, '00000000-0000-4000-a000-0000000ca201'::uuid, 'highest bidder is filled first');
select tests.login('00000000-0000-4000-a000-000000000b0b');
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-000000000b0b', 'boc-81', 'M', 95);
select tests.logout();
select is((select count(*)::int from orders where shirt_id = 'boc-81'), 2, 'second ask fills the next bid');

-- ======================= escrow lifecycle =================================
select tests.login('00000000-0000-4000-a000-00000000a11c');
select throws_ok(format('select order_confirm_receipt(%L)', (tests.order_for('liv-2526', 'L')).id), null, 'order cannot be released', 'cannot release an unpaid order');
select tests.logout();
update orders set status = 'paid_escrow' where id = (tests.order_for('liv-2526', 'L')).id;  -- what the Stripe webhook does
select tests.login('00000000-0000-4000-a000-00000000a11c');
select throws_ok(format('select order_mark_shipped(%L, %L)', (tests.order_for('liv-2526', 'L')).id, 'X'), null, 'order cannot be marked shipped', 'buyer cannot mark shipped');
select tests.login('00000000-0000-4000-a000-000000000b0b');
select lives_ok(format('select order_mark_shipped(%L, %L)', (tests.order_for('liv-2526', 'L')).id, '99.00.123456'), 'seller marks shipped');
select is((tests.order_for('liv-2526', 'L')).tracking_code, '99.00.123456', 'tracking code stored');
select throws_ok(format('select order_confirm_receipt(%L)', (tests.order_for('liv-2526', 'L')).id), null, 'order cannot be released', 'seller cannot release their own escrow');
select tests.login('00000000-0000-4000-a000-00000000a11c');
select lives_ok(format('select order_confirm_receipt(%L)', (tests.order_for('liv-2526', 'L')).id), 'buyer confirms receipt');
select tests.logout();
select is((tests.order_for('liv-2526', 'L')).status, 'released', 'order released');
select ok(exists (select 1 from notifications where user_id = '00000000-0000-4000-a000-000000000b0b' and type = 'order_released'), 'seller notified of release');

-- ======================= cancellation =====================================
select tests.login('00000000-0000-4000-a000-000000000b0b');
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-000000000b0b', 'mun-0708', 'L', 200);
select tests.login('00000000-0000-4000-a000-00000000a11c');
insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000a11c', 'mun-0708', 'L', 200);
select tests.login('00000000-0000-4000-a000-000000000b0b');
select throws_ok(format('select order_cancel(%L)', (tests.order_for('mun-0708', 'L')).id), null, 'order cannot be cancelled', 'seller cannot cancel the buyer''s order');
select tests.login('00000000-0000-4000-a000-00000000a11c');
select lives_ok(format('select order_cancel(%L)', (tests.order_for('mun-0708', 'L')).id), 'buyer cancels before paying');
select tests.logout();
select is((select status from asks where user_id = '00000000-0000-4000-a000-000000000b0b' and shirt_id = 'mun-0708'), 'open', 'seller''s ask goes back on the book');

-- ======================= disputes =========================================
select tests.login('00000000-0000-4000-a000-000000000b0b');
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-000000000b0b', 'psg-2526', 'M', 300);
select tests.login('00000000-0000-4000-a000-00000000a11c');
insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000a11c', 'psg-2526', 'M', 300);
select tests.logout();
update orders set status = 'paid_escrow' where id = (tests.order_for('psg-2526', 'M')).id;
select tests.login('00000000-0000-4000-a000-0000000ca201');
select throws_ok(format('select order_open_dispute(%L, %L)', (tests.order_for('psg-2526', 'M')).id, 'x'), null, 'order cannot be disputed', 'outsiders cannot dispute');
select tests.login('00000000-0000-4000-a000-00000000a11c');
select lives_ok(format('select order_open_dispute(%L, %L)', (tests.order_for('psg-2526', 'M')).id, 'Never arrived'), 'buyer opens a dispute');
select throws_ok(format('select resolve_dispute(%L, %L, null)', tests.last_dispute(), 'refund'), null, 'not authorized', 'parties cannot resolve disputes');
select tests.login('00000000-0000-4000-a000-0000000ad111');
select lives_ok(format('select resolve_dispute(%L, %L, %L)', tests.last_dispute(), 'refund', 'carrier lost it'), 'admin refunds');
select throws_ok(format('select resolve_dispute(%L, %L, null)', tests.last_dispute(), 'release'), null, 'dispute not found or already resolved', 'a dispute resolves only once');
select tests.logout();
select is((tests.order_for('psg-2526', 'M')).status, 'refunded', 'order refunded');

-- ======================= expert verification ==============================
select tests.login('00000000-0000-4000-a000-00000000a11c');
select throws_ok($$ insert into review_queue (id, user_id, snapshot, status) values ('rv-x', '00000000-0000-4000-a000-00000000a11c', '{}', 'approved') $$, '42501', null, 'cannot submit a pre-approved review');
insert into review_queue (id, user_id, snapshot) values ('rv-t', '00000000-0000-4000-a000-00000000a11c', '{}');
insert into custom_items (id, user_id, verification) values ('it-t', '00000000-0000-4000-a000-00000000a11c', '{"level":"self","status":"angefragt","reviewId":"rv-t"}');
select throws_ok($$ update custom_items set verification = '{"level":"expert","status":"verifiziert","reviewId":"rv-t"}' where id = 'it-t' $$, null, 'review rv-t is not approved', 'cannot self-verify while review is pending');
select tests.login('00000000-0000-4000-a000-0000000ad111');
select lives_ok($$ select resolve_review('rv-t', true, null) $$, 'admin approves review');
select tests.logout();
select is((select verification->>'level' from custom_items where id = 'it-t'), 'expert', 'approval stamps the item as expert-verified');
select tests.login('00000000-0000-4000-a000-00000000a11c');
select lives_ok($$ insert into custom_items (id, user_id, verification) values ('it-t2', '00000000-0000-4000-a000-00000000a11c', '{"level":"expert","status":"verifiziert","reviewId":"rv-t"}') $$, 'item backed by an approved review may claim expert');

-- ======================= cancel-only open orders ===========================
insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000a11c', 'mia-26', 'M', 50);
select throws_ok($$ update bids set amount = 1 where shirt_id = 'mia-26' $$, '42501', null, 'open bids cannot be repriced');
select lives_ok($$ update bids set status = 'cancelled' where shirt_id = 'mia-26' $$, 'open bids can be cancelled');

select * from finish();
rollback;
