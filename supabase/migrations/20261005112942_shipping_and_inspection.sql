-- Shipping and the authentication leg. Every sale travels
--   seller --(inbound, prepaid label)--> Zürich authentication centre
--          --(outbound, after inspection)--> buyer
-- An order stays 'shipped' across both legs; `inspection` records what the
-- centre decided. Buyers can only confirm receipt (and the auto-release
-- clock only starts) once the shirt has passed and been forwarded.

alter table public.orders
  add column if not exists carrier text check (carrier in ('post', 'dhl', 'dpd', 'ups', 'gls', 'other')),
  add column if not exists label_path text,
  add column if not exists inspection text not null default 'pending' check (inspection in ('pending', 'passed', 'failed')),
  add column if not exists inspection_note text,
  add column if not exists inspected_at timestamptz,
  add column if not exists outbound_carrier text check (outbound_carrier in ('post', 'dhl', 'dpd', 'ups', 'gls', 'other')),
  add column if not exists outbound_tracking text,
  add column if not exists forwarded_at timestamptz;

-- The buyer's delivery address, collected by Stripe Checkout. Kept out of
-- `orders` so the seller (who can read the order) never sees it: only the
-- buyer and admins can.
create table if not exists public.order_addresses (
  order_id uuid primary key references public.orders (id) on delete cascade,
  ship_to jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.order_addresses enable row level security;
create policy order_addresses_buyer_read on public.order_addresses for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = (select auth.uid())));
create policy order_addresses_admin_read on public.order_addresses for select to authenticated
  using ((select public.is_admin()));
revoke insert, update, delete on public.order_addresses from anon, authenticated;

-- Seller ships (inbound). Carrier is optional; the app detects it from the code.
drop function if exists public.order_mark_shipped(uuid, text);
create or replace function public.order_mark_shipped(p_order_id uuid, p_tracking text default null, p_carrier text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update orders set status = 'shipped', shipped_at = now(), updated_at = now(),
         tracking_code = coalesce(nullif(trim(coalesce(p_tracking, '')), ''), tracking_code),
         carrier = coalesce(nullif(p_carrier, ''), carrier)
   where id = p_order_id and seller_id = auth.uid() and status = 'paid_escrow';
  if not found then raise exception 'order cannot be marked shipped'; end if;
end $$;
revoke execute on function public.order_mark_shipped(uuid, text, text) from public, anon;
grant execute on function public.order_mark_shipped(uuid, text, text) to authenticated;

-- Buyer confirms receipt: only possible once the centre forwarded the shirt.
create or replace function public.order_confirm_receipt(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update orders set status = 'released', delivered_at = now(), released_at = now(), updated_at = now()
   where id = p_order_id and buyer_id = auth.uid() and status = 'shipped' and inspection = 'passed';
  if not found then raise exception 'order cannot be released'; end if;
end $$;

-- Authentication centre queue and decision (admins only).
create or replace function public.list_inspections_for_admin()
returns table (order_id uuid, shirt_id text, custom_item_id text, size text, amount numeric, carrier text, tracking_code text,
               shipped_at timestamptz, inspection text, outbound_tracking text, ship_to jsonb)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
    select o.id, o.shirt_id, o.custom_item_id, o.size, o.amount, o.carrier, o.tracking_code, o.shipped_at, o.inspection, o.outbound_tracking, a.ship_to
      from orders o left join order_addresses a on a.order_id = o.id
     where o.status in ('paid_escrow', 'shipped') and o.inspection = 'pending'
     order by o.shipped_at nulls last, o.created_at;
end $$;
revoke execute on function public.list_inspections_for_admin() from public, anon;
grant execute on function public.list_inspections_for_admin() to authenticated;

create or replace function public.admin_record_inspection(p_order_id uuid, p_passed boolean, p_note text default null,
                                                          p_outbound_tracking text default null, p_outbound_carrier text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o orders; v_name text;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select * into o from orders where id = p_order_id and status = 'shipped' and inspection = 'pending' for update;
  if o.id is null then raise exception 'order is not awaiting inspection'; end if;
  v_name := coalesce(o.shirt_id, 'Your shirt') || ' (' || o.size || ')';

  if p_passed then
    update orders set inspection = 'passed', inspection_note = p_note, inspected_at = now(), forwarded_at = now(), updated_at = now(),
           outbound_tracking = nullif(trim(coalesce(p_outbound_tracking, '')), ''),
           outbound_carrier = coalesce(nullif(p_outbound_carrier, ''), outbound_carrier, 'post')
     where id = p_order_id;
    insert into notifications (user_id, type, title, body, data) values
      (o.buyer_id, 'order_authenticated', 'Authenticated — on its way to you',
       v_name || ' passed authentication in Zürich and has been sent to you' ||
       coalesce(' — tracking: ' || nullif(trim(coalesce(p_outbound_tracking, '')), ''), '') || '.',
       jsonb_build_object('order_id', o.id, 'shirt_id', o.shirt_id, 'tracking_code', p_outbound_tracking)),
      (o.seller_id, 'order_authenticated', 'Your sale passed authentication',
       v_name || ' passed and is on its way to the buyer. You’re paid once they confirm delivery.',
       jsonb_build_object('order_id', o.id, 'shirt_id', o.shirt_id));
  else
    update orders set inspection = 'failed', inspection_note = p_note, inspected_at = now(), status = 'refunded', updated_at = now()
     where id = p_order_id;
    insert into notifications (user_id, type, title, body, data) values
      (o.seller_id, 'order_failed_inspection', 'Your sale didn’t pass authentication',
       v_name || ' didn’t pass' || coalesce(': ' || nullif(p_note, ''), '') || '. We’ll return it to you and the buyer has been refunded.',
       jsonb_build_object('order_id', o.id, 'shirt_id', o.shirt_id));
  end if;
end $$;
revoke execute on function public.admin_record_inspection(uuid, boolean, text, text, text) from public, anon;
grant execute on function public.admin_record_inspection(uuid, boolean, text, text, text) to authenticated;

-- The 'shipped' notification now describes the inbound leg.
create or replace function public.notify_order_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = old.status then return new; end if;

  if new.status = 'paid_escrow' then
    insert into public.notifications (user_id, type, title, body, data) values
      (new.seller_id, 'order_paid', 'Payment received', 'Buyer paid for ' || new.shirt_id || ' (' || new.size || ') — please ship it to our authentication centre and mark the order as shipped.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id)),
      (new.buyer_id, 'order_paid', 'Payment held in escrow', 'Your payment for ' || new.shirt_id || ' (' || new.size || ') is held safely until you confirm delivery.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id));
  elsif new.status = 'shipped' then
    insert into public.notifications (user_id, type, title, body, data)
      values (new.buyer_id, 'order_shipped', 'On its way to authentication', 'The seller shipped ' || new.shirt_id || ' (' || new.size || ') to our Zürich centre. We’ll let you know once it has passed.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id, 'tracking_code', new.tracking_code));
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
  return new;
end $$;

-- Auto-release counts from forwarding, and only for authenticated shirts.
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

  -- 3. Authenticated and forwarded, no dispute: remind the buyer, then
  --    release to the seller. The clock starts when the centre forwards it.
  for o in select * from orders where status = 'shipped' and inspection = 'passed'
             and forwarded_at < now() - make_interval(days => pol.release_days) + make_interval(hours => pol.reminder_lead_hours)
             and forwarded_at >= now() - make_interval(days => pol.release_days) loop
    perform private.notify_once(o.buyer_id, 'release_reminder', o.id, 'Did your shirt arrive?',
      'Confirm delivery of ' || o.shirt_id || ' (' || o.size || ') or report a problem by ' ||
      to_char((o.forwarded_at + make_interval(days => pol.release_days)) at time zone 'Europe/Zurich', 'DD.MM.') || '. After that the payment is released to the seller.');
  end loop;
  update orders set status = 'released', released_at = now(), updated_at = now()
   where status = 'shipped' and inspection = 'passed' and forwarded_at < now() - make_interval(days => pol.release_days);
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
