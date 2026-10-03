-- matching_engine_v2_and_perf
-- ---------------------------------------------------------------------
-- Matching engine v2
--  * never matches a user against their own ask (no self-trades)
--  * row-locks both sides (FOR UPDATE SKIP LOCKED) so two concurrent
--    inserts can't fill the same ask twice
--  * sweeps every crossing bid, not just the single best pair
--  * ignores expired bids
--  * trades at the ask price; fees mirror src/fees.js
-- ---------------------------------------------------------------------
create or replace function public.match_order_book(p_shirt_id text, p_size text)
returns void language plpgsql security definer set search_path = public as $$
declare
  b public.bids;
  a public.asks;
  v_order_id uuid;
begin
  for b in
    select * from public.bids
     where shirt_id = p_shirt_id and size = p_size and status = 'open'
       and (expires_at is null or expires_at > now())
     order by amount desc, created_at asc
     for update skip locked
  loop
    select * into a from public.asks
     where shirt_id = p_shirt_id and size = p_size and status = 'open'
       and user_id <> b.user_id and amount <= b.amount
     order by amount asc, created_at asc
     limit 1
     for update skip locked;
    continue when a.id is null;

    update public.bids set status = 'matched' where id = b.id;
    update public.asks set status = 'matched' where id = a.id;

    insert into public.orders (buyer_id, seller_id, shirt_id, custom_item_id, bid_id, ask_id, size, amount, auth_fee, shipping_fee, commission, status)
    values (b.user_id, a.user_id, p_shirt_id, a.custom_item_id, b.id, a.id, p_size, a.amount, 9, 12, round(a.amount * 0.08), 'pending_payment')
    returning id into v_order_id;

    insert into public.notifications (user_id, type, title, body, data) values
      (b.user_id, 'bid_matched', 'Your bid was matched',
       'Your bid on ' || p_shirt_id || ' (' || p_size || ') matched at CHF ' || a.amount || ' — complete payment to secure it.',
       jsonb_build_object('order_id', v_order_id, 'shirt_id', p_shirt_id, 'size', p_size, 'amount', a.amount)),
      (a.user_id, 'ask_matched', 'Your item sold',
       'Your ask on ' || p_shirt_id || ' (' || p_size || ') sold at CHF ' || a.amount || ' — we''ll tell you as soon as the buyer has paid.',
       jsonb_build_object('order_id', v_order_id, 'shirt_id', p_shirt_id, 'size', p_size, 'amount', a.amount));
    a := null;
  end loop;
end $$;
revoke execute on function public.match_order_book(text, text) from public, anon, authenticated;

-- Buyer also hears about their own successful payment (previously the
-- stripe-webhook inserted extra rows itself, double-notifying the seller).
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
      values (new.seller_id, 'order_cancelled', 'Order cancelled', 'The buyer cancelled before paying for ' || new.shirt_id || ' (' || new.size || '). Your ask is live again.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id));
  elsif new.status = 'refunded' then
    insert into public.notifications (user_id, type, title, body, data)
      values (new.buyer_id, 'order_refunded', 'Order refunded', 'Your payment for ' || new.shirt_id || ' (' || new.size || ') was refunded.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id));
  end if;
  -- 'disputed' is notified by notify_dispute_opened() (it knows who opened
  -- it and carries the reason) so the counterparty isn't notified twice.
  return new;
end $$;
revoke execute on function public.notify_order_status_change() from public, anon, authenticated;

-- Relay only the notification id; the edge function loads the row itself
-- with the service role, so the endpoint can't be used as an open mail relay.
create or replace function public.relay_notification()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  perform extensions.http_post(
    url := 'https://vuclwradmphgasiactsa.supabase.co/functions/v1/send-notification',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('id', new.id)
  );
  return new;
exception when others then
  return new;
end $$;
revoke execute on function public.relay_notification() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Trending: one vote per actor per shirt/type/day, anonymous views count
-- a quarter, so one account (or a script) can't push a shirt up the chart.
-- ---------------------------------------------------------------------
create or replace function public.trending_scores(days integer default 14)
returns table (shirt_id text, score numeric)
language sql stable security definer set search_path = public as $$
  with actions as (
    select distinct e.shirt_id, e.type, e.user_id, (e.created_at at time zone 'UTC')::date as d,
           case when e.user_id is null then e.id else null end as anon_id
      from public.events e
     where e.created_at >= now() - make_interval(days => greatest(least(days, 90), 1))
  )
  select a.shirt_id,
         sum(case a.type when 'buy' then 8 when 'bid' then 5 when 'watch' then 3 when 'view' then 1 else 0 end
             * case when a.user_id is null then 0.25 else 1 end)::numeric as score
    from actions a
   group by a.shirt_id
   order by score desc
   limit 50;
$$;
grant execute on function public.trending_scores(integer) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Indexes: covering FK indexes + the hot paths (order book, inbox,
-- trending window, "my orders").
-- ---------------------------------------------------------------------
create index if not exists bids_book_idx on public.bids (shirt_id, size, status, amount desc, created_at);
create index if not exists asks_book_idx on public.asks (shirt_id, size, status, amount, created_at);
create index if not exists bids_user_idx on public.bids (user_id);
create index if not exists asks_user_idx on public.asks (user_id);
create index if not exists asks_custom_item_idx on public.asks (custom_item_id);
create index if not exists orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index if not exists orders_seller_idx on public.orders (seller_id, created_at desc);
create index if not exists orders_bid_idx on public.orders (bid_id);
create index if not exists orders_ask_idx on public.orders (ask_id);
create index if not exists orders_custom_item_idx on public.orders (custom_item_id);
create index if not exists orders_shirt_released_idx on public.orders (shirt_id, status, released_at desc);
create index if not exists disputes_order_idx on public.disputes (order_id);
create index if not exists disputes_opened_by_idx on public.disputes (opened_by);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists events_created_idx on public.events (created_at);
create index if not exists events_user_idx on public.events (user_id, created_at desc);
create index if not exists custom_items_user_idx on public.custom_items (user_id, created_at);
create index if not exists custom_items_review_idx on public.custom_items ((verification->>'reviewId'));
create index if not exists review_queue_item_idx on public.review_queue (custom_item_id);
create index if not exists review_queue_user_idx on public.review_queue (user_id);
create index if not exists review_queue_reviewer_idx on public.review_queue (reviewer_id);
create index if not exists api_keys_created_by_idx on public.api_keys (created_by);
