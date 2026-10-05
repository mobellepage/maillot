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
create or replace function tests.order_for(p_shirt text, p_size text)
returns public.orders language sql security definer as $$ select * from public.orders where shirt_id = p_shirt and size = p_size order by created_at desc limit 1 $$;
-- Match a seller ask with a buyer bid (as the service would), returning the order.
create or replace function tests.trade(p_shirt text, p_size text)
returns public.orders language plpgsql as $$
begin
  insert into public.asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-000000000b0b', p_shirt, p_size, 100);
  insert into public.bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000a11c', p_shirt, p_size, 100);
  return tests.order_for(p_shirt, p_size);
end $$;

-- alice: buyer · bob: seller. Shirts are ones neither the seed nor other tests use.
select tests.create_user('00000000-0000-4000-a000-00000000a11c', 'alice@test.local');
select tests.create_user('00000000-0000-4000-a000-000000000b0b', 'bob@test.local');

select plan(16);

select is((select row(payment_hours, ship_days, release_days)::text from order_policy()), '(24,5,14)', 'policy windows match the app (src/features/orders/policy.ts)');
select is((select count(*)::int from cron.job where jobname = 'order-lifecycle'), 1, 'lifecycle job is scheduled');

-- unpaid: 13 h old gets a reminder, 25 h old is cancelled and its ask reopens
select tests.trade('sui-26', 'M');
update orders set created_at = now() - interval '13 hours' where id = (tests.order_for('sui-26', 'M')).id;
select tests.trade('acm-0607', 'M');
update orders set created_at = now() - interval '25 hours' where id = (tests.order_for('acm-0607', 'M')).id;

-- unshipped: paid 4 days ago gets a reminder, 6 days ago is refunded
select tests.trade('ars-91', 'M');
update orders set status = 'paid_escrow', paid_at = now() - interval '4 days' where id = (tests.order_for('ars-91', 'M')).id;
select tests.trade('fcb-2627', 'M');
update orders set status = 'paid_escrow', paid_at = now() - interval '6 days' where id = (tests.order_for('fcb-2627', 'M')).id;

-- shipped: 13 days ago gets a reminder, 15 days ago is released; disputed is left alone
select tests.trade('nap-8788', 'M');
update orders set status = 'shipped', shipped_at = now() - interval '13 days' where id = (tests.order_for('nap-8788', 'M')).id;
select tests.trade('yb-2526', 'M');
update orders set status = 'shipped', shipped_at = now() - interval '15 days' where id = (tests.order_for('yb-2526', 'M')).id;
select tests.trade('ajx-95', 'M');
update orders set status = 'disputed', shipped_at = now() - interval '30 days' where id = (tests.order_for('ajx-95', 'M')).id;

-- an expired open bid
insert into bids (user_id, shirt_id, size, amount, expires_at) values ('00000000-0000-4000-a000-00000000a11c', 'bay-2627', 'XL', 10, now() - interval '1 minute');

select lives_ok('select public.run_order_lifecycle()', 'lifecycle run completes');

select is((tests.order_for('sui-26', 'M')).status, 'pending_payment', 'fresh unpaid order stays open');
select ok(exists (select 1 from notifications where type = 'payment_reminder' and data->>'order_id' = (tests.order_for('sui-26', 'M')).id::text), 'buyer reminded to pay');
select is((tests.order_for('acm-0607', 'M')).status, 'cancelled', 'unpaid order expires');
select is((select status from asks where shirt_id = 'acm-0607'), 'open', 'expired order puts the ask back on the book');

select ok(exists (select 1 from notifications where type = 'ship_reminder' and data->>'order_id' = (tests.order_for('ars-91', 'M')).id::text), 'seller reminded to ship');
select is((tests.order_for('fcb-2627', 'M')).status, 'refunded', 'unshipped order is refunded');
select is((tests.order_for('fcb-2627', 'M')).payout_status, 'refund_pending', 'refund is queued for settlement');

select ok(exists (select 1 from notifications where type = 'release_reminder' and data->>'order_id' = (tests.order_for('nap-8788', 'M')).id::text), 'buyer reminded to confirm delivery');
select is((tests.order_for('yb-2526', 'M')).status, 'released', 'undisputed delivery auto-releases');
select is((tests.order_for('yb-2526', 'M')).payout_status, 'pending', 'auto-release queues the payout');
select is((tests.order_for('ajx-95', 'M')).status, 'disputed', 'disputed orders are never auto-released');

select is((select status from bids where shirt_id = 'bay-2627'), 'expired', 'expired bids leave the book');

-- reminders are sent once, however often the job runs
select public.run_order_lifecycle();
select is((select count(*)::int from notifications where type = 'payment_reminder' and data->>'order_id' = (tests.order_for('sui-26', 'M')).id::text), 1, 'reminders are not repeated');

select * from finish();
rollback;
