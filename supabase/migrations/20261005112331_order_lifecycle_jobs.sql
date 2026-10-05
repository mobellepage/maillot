-- Order lifecycle jobs. Escrow only works if nothing can stall forever, so a
-- pg_cron job runs every five minutes and moves stuck orders on:
--
--   pending_payment  24 h after the match      -> cancelled (ask back on the book)
--   paid_escrow      5 days without shipping   -> refunded  (buyer gets money back)
--   shipped          14 days without a dispute -> released  (seller gets paid)
--   open bids        past expires_at           -> expired
--   settlement       stuck 'pending' > 15 min  -> settle function re-poked
--
-- Each deadline gets one reminder first. The windows live in
-- public.order_policy() so the app (and the terms) can show the same numbers.
create extension if not exists pg_cron;

create or replace function public.order_policy()
returns table (payment_hours int, ship_days int, release_days int, reminder_lead_hours int)
language sql immutable as $$ select 24, 5, 14, 48 $$;
grant execute on function public.order_policy() to anon, authenticated;

create or replace function private.notify_once(p_user uuid, p_type text, p_order uuid, p_title text, p_body text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, type, title, body, data)
  select p_user, p_type, p_title, p_body, jsonb_build_object('order_id', p_order)
  where not exists (select 1 from public.notifications where user_id = p_user and type = p_type and data->>'order_id' = p_order::text)
$$;

create or replace function public.run_order_lifecycle()
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  pol record;
  o public.orders;
  v_url text;
  n_cancelled int := 0; n_refunded int := 0; n_released int := 0; n_expired int := 0; n_retried int := 0;
begin
  select * into pol from public.order_policy();

  -- 1. Unpaid orders: remind halfway, cancel at the deadline.
  for o in select * from orders where status = 'pending_payment'
             and created_at < now() - make_interval(hours => pol.payment_hours / 2)
             and created_at >= now() - make_interval(hours => pol.payment_hours) loop
    perform private.notify_once(o.buyer_id, 'payment_reminder', o.id, 'Complete your payment',
      'Your order for ' || o.shirt_id || ' (' || o.size || ') is reserved until ' ||
      to_char((o.created_at + make_interval(hours => pol.payment_hours)) at time zone 'Europe/Zurich', 'DD.MM. HH24:MI') || ' — pay now to keep it.');
  end loop;
  for o in update orders set status = 'cancelled', updated_at = now()
            where status = 'pending_payment' and created_at < now() - make_interval(hours => pol.payment_hours)
            returning * loop
    n_cancelled := n_cancelled + 1;
    update asks set status = 'open' where id = o.ask_id and status = 'matched';
    update bids set status = 'expired' where id = o.bid_id;
    perform private.notify_once(o.buyer_id, 'order_expired', o.id, 'Order expired',
      'Payment for ' || o.shirt_id || ' (' || o.size || ') wasn''t completed in time, so the order was cancelled.');
  end loop;

  -- 2. Paid but not shipped: remind the seller, then refund the buyer.
  for o in select * from orders where status = 'paid_escrow'
             and paid_at < now() - make_interval(days => pol.ship_days) + make_interval(hours => pol.reminder_lead_hours)
             and paid_at >= now() - make_interval(days => pol.ship_days) loop
    perform private.notify_once(o.seller_id, 'ship_reminder', o.id, 'Ship your sale',
      'Please ship ' || o.shirt_id || ' (' || o.size || ') by ' ||
      to_char((o.paid_at + make_interval(days => pol.ship_days)) at time zone 'Europe/Zurich', 'DD.MM.') || ' — otherwise the buyer is refunded automatically.');
  end loop;
  for o in update orders set status = 'refunded', updated_at = now()
            where status = 'paid_escrow' and paid_at < now() - make_interval(days => pol.ship_days)
            returning * loop
    n_refunded := n_refunded + 1;
    perform private.notify_once(o.seller_id, 'order_unshipped', o.id, 'Order cancelled — not shipped',
      o.shirt_id || ' (' || o.size || ') wasn''t shipped within ' || pol.ship_days || ' days, so the buyer was refunded.');
  end loop;

  -- 3. Shipped, no dispute: remind the buyer, then release to the seller.
  for o in select * from orders where status = 'shipped'
             and shipped_at < now() - make_interval(days => pol.release_days) + make_interval(hours => pol.reminder_lead_hours)
             and shipped_at >= now() - make_interval(days => pol.release_days) loop
    perform private.notify_once(o.buyer_id, 'release_reminder', o.id, 'Did your shirt arrive?',
      'Confirm delivery of ' || o.shirt_id || ' (' || o.size || ') or report a problem by ' ||
      to_char((o.shipped_at + make_interval(days => pol.release_days)) at time zone 'Europe/Zurich', 'DD.MM.') || '. After that the payment is released to the seller.');
  end loop;
  update orders set status = 'released', released_at = now(), updated_at = now()
   where status = 'shipped' and shipped_at < now() - make_interval(days => pol.release_days);
  get diagnostics n_released = row_count;

  -- 4. Expired bids leave the book.
  update bids set status = 'expired' where status = 'open' and expires_at is not null and expires_at < now();
  get diagnostics n_expired = row_count;

  -- 5. Settlement requests that got lost (function down, network) are retried;
  --    the settle function is idempotent per order.
  select value into v_url from private.app_settings where key = 'functions_url';
  if v_url is not null then
    for o in select * from orders where payout_status in ('pending', 'refund_pending')
               and updated_at < now() - interval '15 minutes' order by updated_at limit 50 loop
      perform extensions.http_post(url := v_url || '/settle', headers := '{"Content-Type": "application/json"}'::jsonb,
                                   body := jsonb_build_object('order_id', o.id));
      update orders set updated_at = now() where id = o.id;
      n_retried := n_retried + 1;
    end loop;
  end if;

  return jsonb_build_object('cancelled', n_cancelled, 'refunded', n_refunded, 'released', n_released,
                            'bids_expired', n_expired, 'settlements_retried', n_retried);
end $$;
revoke execute on function public.run_order_lifecycle() from public, anon, authenticated;
revoke execute on function private.notify_once(uuid, text, uuid, text, text) from public, anon, authenticated;

select cron.schedule('order-lifecycle', '*/5 * * * *', 'select public.run_order_lifecycle()');

create index if not exists orders_status_age_idx on public.orders (status, created_at);
create index if not exists bids_open_expiry_idx on public.bids (expires_at) where status = 'open';

-- Cancellation is no longer only the buyer's doing (unpaid orders expire), so
-- the seller's message says what happened without blaming anyone.
create or replace function public.notify_order_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = old.status then return new; end if;

  if new.status = 'paid_escrow' then
    insert into public.notifications (user_id, type, title, body, data) values
      (new.seller_id, 'order_paid', 'Payment received', 'Buyer paid for ' || new.shirt_id || ' (' || new.size || ') — please ship it and mark the order as shipped.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id)),
      (new.buyer_id, 'order_paid', 'Payment held in escrow', 'Your payment for ' || new.shirt_id || ' (' || new.size || ') is held safely until you confirm delivery.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id));
  elsif new.status = 'shipped' then
    insert into public.notifications (user_id, type, title, body, data)
      values (new.buyer_id, 'order_shipped', 'Your order shipped', new.shirt_id || ' (' || new.size || ') is on its way' || case when new.tracking_code is not null then ' — tracking: ' || new.tracking_code else '' end || '.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id, 'tracking_code', new.tracking_code));
  elsif new.status = 'released' then
    insert into public.notifications (user_id, type, title, body, data)
      values (new.seller_id, 'order_released', 'Escrow released', 'Payment for ' || new.shirt_id || ' (' || new.size || ') has been released — your payout is on its way.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id));
  elsif new.status = 'cancelled' then
    insert into public.notifications (user_id, type, title, body, data)
      values (new.seller_id, 'order_cancelled', 'Order cancelled', 'The order for ' || new.shirt_id || ' (' || new.size || ') was cancelled before payment. Your ask is live again.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id));
  elsif new.status = 'refunded' then
    insert into public.notifications (user_id, type, title, body, data)
      values (new.buyer_id, 'order_refunded', 'Order refunded', 'Your payment for ' || new.shirt_id || ' (' || new.size || ') was refunded.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id));
  end if;
  -- 'disputed' is notified by notify_dispute_opened() (it knows who opened
  -- it and carries the reason) so the counterparty isn't notified twice.
  return new;
end $$;
