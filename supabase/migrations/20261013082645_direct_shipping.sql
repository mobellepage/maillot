-- Direct shipping: seller -> buyer. There is no authentication centre yet,
-- so an order travels straight to the buyer:
--   paid_escrow --(seller: photo + carrier + tracking)--> shipped
--   shipped --(buyer: "parcel arrived", or automatically after delivery_days)--> delivered
--   delivered --(buyer confirms with a photo, or automatically after release_days)--> released
-- Either side can report a problem until release. The centre path
-- (inspection 'pending' → admin_record_inspection) stays for later: an order
-- only goes through it when order_policy().auth_threshold is set and reached.

alter table public.orders drop constraint if exists orders_inspection_check;
alter table public.orders add constraint orders_inspection_check
  check (inspection in ('not_required', 'pending', 'passed', 'failed'));
alter table public.orders alter column inspection set default 'not_required';
update public.orders set inspection = 'not_required', auth_fee = 0 where inspection = 'pending' and status in ('pending_payment', 'cancelled');
update public.orders set inspection = 'not_required' where inspection = 'pending';

-- Photos as [{path, thumbPath}] in the uploader's own vault-photos folder.
alter table public.orders
  add column if not exists ship_photos jsonb not null default '[]'::jsonb,
  add column if not exists receipt_photos jsonb not null default '[]'::jsonb,
  add column if not exists delivered_by text check (delivered_by in ('buyer', 'auto'));

-- Every deadline in one place (mirrored in src/config/rules.ts; the
-- lifecycle test fails if the two drift apart). auth_threshold: null = no
-- authentication centre; set a CHF amount to route orders from it upwards
-- through the centre.
drop function if exists public.order_policy();
create function public.order_policy()
returns table (payment_hours int, ship_days int, delivery_days int, release_days int, reminder_lead_hours int,
               release_reminder_days int[], auth_threshold numeric)
language sql immutable as $$ select 24, 5, 7, 5, 48, array[2, 4], null::numeric $$;
grant execute on function public.order_policy() to anon, authenticated;

create or replace function private.route_order_inspection()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_threshold numeric;
begin
  select auth_threshold into v_threshold from public.order_policy();
  new.inspection := case when v_threshold is not null and new.amount >= v_threshold then 'pending' else 'not_required' end;
  -- No centre, no authentication fee. The seller pays the postage, so the
  -- buyer's shipping fee is paid out to them with the sale (see settle).
  if new.inspection = 'not_required' then new.auth_fee := 0; end if;
  return new;
end $$;
drop trigger if exists orders_route_inspection on public.orders;
create trigger orders_route_inspection before insert on public.orders
  for each row execute function private.route_order_inspection();

-- photos must be 1..6 objects whose paths sit in the caller's own folder.
create or replace function private.own_photos(p_photos jsonb, p_user uuid)
returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(p_photos) = 'array'
     and jsonb_array_length(p_photos) between 1 and 6
     and not exists (
       select 1 from jsonb_array_elements(p_photos) e
        where jsonb_typeof(e) <> 'object'
           or not starts_with(coalesce(e ->> 'path', ''), p_user::text || '/')
           or (e ? 'thumbPath' and not starts_with(coalesce(e ->> 'thumbPath', ''), p_user::text || '/'))
     )
$$;

-- The seller needs the delivery address while shipping is their job.
drop policy if exists order_addresses_seller_read on public.order_addresses;
create policy order_addresses_seller_read on public.order_addresses for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.seller_id = (select auth.uid())
                 and o.inspection = 'not_required' and o.status in ('paid_escrow', 'shipped', 'delivered', 'disputed')));

-- Both parties (and admins) can see an order's shipping and receipt photos.
create or replace function public.is_order_photo_for_me(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.orders o
     where (o.buyer_id = (select auth.uid()) or o.seller_id = (select auth.uid()) or public.is_admin())
       and exists (select 1 from jsonb_array_elements(o.ship_photos || o.receipt_photos) e
                    where p_name in (e ->> 'path', e ->> 'thumbPath'))
  )
$$;
revoke execute on function public.is_order_photo_for_me(text) from public, anon;
grant execute on function public.is_order_photo_for_me(text) to authenticated;
drop policy if exists "vault photos: order photos for both parties" on storage.objects;
create policy "vault photos: order photos for both parties" on storage.objects for select to authenticated
  using (bucket_id = 'vault-photos' and public.is_order_photo_for_me(name));

-- 1. Seller ships: a photo of the shirt, the carrier and the tracking number.
drop function if exists public.order_mark_shipped(uuid, text, text);
create function public.order_mark_shipped(p_order_id uuid, p_tracking text, p_carrier text, p_photos jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_tracking), '') = '' then raise exception 'tracking number required' using errcode = '22023'; end if;
  if coalesce(p_carrier, '') not in ('post', 'dhl', 'dpd', 'ups', 'gls', 'other') then raise exception 'carrier required' using errcode = '22023'; end if;
  if not private.own_photos(p_photos, auth.uid()) then raise exception 'a photo of the shirt is required' using errcode = '22023'; end if;
  update orders set status = 'shipped', shipped_at = now(), updated_at = now(),
         tracking_code = left(trim(p_tracking), 60), carrier = p_carrier, ship_photos = p_photos
   where id = p_order_id and seller_id = auth.uid() and status = 'paid_escrow';
  if not found then raise exception 'order cannot be marked shipped'; end if;
end $$;
revoke execute on function public.order_mark_shipped(uuid, text, text, jsonb) from public, anon;
grant execute on function public.order_mark_shipped(uuid, text, text, jsonb) to authenticated;

-- 2. Buyer: the parcel arrived (starts the release clock).
create or replace function public.order_mark_delivered(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update orders set status = 'delivered', delivered_at = now(), delivered_by = 'buyer', updated_at = now()
   where id = p_order_id and buyer_id = auth.uid() and status = 'shipped' and inspection in ('not_required', 'passed');
  if not found then raise exception 'order cannot be marked delivered'; end if;
end $$;
revoke execute on function public.order_mark_delivered(uuid) from public, anon;
grant execute on function public.order_mark_delivered(uuid) to authenticated;

-- 3. Buyer confirms with a photo of the shirt they received → payout.
drop function if exists public.order_confirm_receipt(uuid);
create function public.order_confirm_receipt(p_order_id uuid, p_photos jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.own_photos(p_photos, auth.uid()) then raise exception 'a photo of the shirt is required' using errcode = '22023'; end if;
  update orders set status = 'released', delivered_at = coalesce(delivered_at, now()), delivered_by = coalesce(delivered_by, 'buyer'),
         released_at = now(), updated_at = now(), receipt_photos = p_photos
   where id = p_order_id and buyer_id = auth.uid() and status in ('shipped', 'delivered') and inspection in ('not_required', 'passed');
  if not found then raise exception 'order cannot be released'; end if;
end $$;
revoke execute on function public.order_confirm_receipt(uuid, jsonb) from public, anon;
grant execute on function public.order_confirm_receipt(uuid, jsonb) to authenticated;

-- Problems can be reported until the payment is released.
create or replace function public.order_open_dispute(p_order_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason required'; end if;
  update orders set status = 'disputed', updated_at = now()
   where id = p_order_id and (buyer_id = auth.uid() or seller_id = auth.uid())
     and status in ('paid_escrow', 'shipped', 'delivered');
  if not found then raise exception 'order cannot be disputed'; end if;
  insert into disputes (order_id, opened_by, reason) values (p_order_id, auth.uid(), left(trim(p_reason), 2000))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.notify_order_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare pol record; v_name text := new.shirt_id || ' (' || new.size || ')';
begin
  if new.status = old.status then return new; end if;
  select * into pol from public.order_policy();

  if new.status = 'paid_escrow' then
    insert into public.notifications (user_id, type, title, body, data) values
      (new.seller_id, 'order_paid', 'Payment received', 'Buyer paid for ' || v_name || ' — please ship it to the buyer within ' || pol.ship_days || ' days and add a photo and the tracking number.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id)),
      (new.buyer_id, 'order_paid', 'Payment held in escrow', 'Your payment for ' || v_name || ' is held safely until you confirm delivery.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id));
  elsif new.status = 'shipped' then
    insert into public.notifications (user_id, type, title, body, data)
      values (new.buyer_id, 'order_shipped', 'Your shirt is on its way', 'The seller shipped ' || v_name || '. Once it arrives, confirm with a photo — or report a problem.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id, 'tracking_code', new.tracking_code));
  elsif new.status = 'delivered' then
    insert into public.notifications (user_id, type, title, body, data)
      values (new.seller_id, 'order_delivered', 'Your sale was delivered', v_name || ' has arrived. The payment is released when the buyer confirms, or automatically on ' ||
              to_char((new.delivered_at + make_interval(days => pol.release_days)) at time zone 'Europe/Zurich', 'DD.MM.') || '.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id));
  elsif new.status = 'released' then
    insert into public.notifications (user_id, type, title, body, data)
      values (new.seller_id, 'order_released', 'Escrow released', 'Payment for ' || v_name || ' has been released — your payout is on its way.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id));
  elsif new.status = 'cancelled' then
    insert into public.notifications (user_id, type, title, body, data)
      values (new.seller_id, 'order_cancelled', 'Order cancelled', 'The order for ' || v_name || ' was cancelled before payment. Your ask is live again.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id));
  elsif new.status = 'refunded' then
    insert into public.notifications (user_id, type, title, body, data)
      values (new.buyer_id, 'order_refunded', 'Order refunded', 'Your payment for ' || v_name || ' was refunded.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id));
  end if;
  return new;
end $$;

create or replace function public.run_order_lifecycle()
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  pol record;
  o public.orders;
  v_url text;
  v_day int;
  n_cancelled int := 0; n_refunded int := 0; n_delivered int := 0; n_released int := 0; n_expired int := 0; n_retried int := 0;
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

  -- 3. Shipped to the buyer (directly, or forwarded by the centre) and the
  --    buyer hasn't said it arrived: without carrier tracking, count it as
  --    delivered delivery_days after it left.
  update orders set status = 'delivered', delivered_by = 'auto', updated_at = now(),
         delivered_at = case when inspection = 'passed' then forwarded_at else shipped_at end + make_interval(days => pol.delivery_days)
   where status = 'shipped'
     and ((inspection = 'not_required' and shipped_at < now() - make_interval(days => pol.delivery_days))
       or (inspection = 'passed' and forwarded_at < now() - make_interval(days => pol.delivery_days)));
  get diagnostics n_delivered = row_count;

  -- 4. Delivered, no confirmation and no problem: remind the buyer, then
  --    release to the seller.
  foreach v_day in array pol.release_reminder_days loop
    for o in select * from orders where status = 'delivered'
               and delivered_at < now() - make_interval(days => v_day)
               and delivered_at >= now() - make_interval(days => pol.release_days) loop
      perform private.notify_once(o.buyer_id, 'release_reminder_' || v_day, o.id, 'Did your shirt arrive?',
        'Confirm ' || o.shirt_id || ' (' || o.size || ') with a photo or report a problem by ' ||
        to_char((o.delivered_at + make_interval(days => pol.release_days)) at time zone 'Europe/Zurich', 'DD.MM.') || '. After that the payment is released to the seller.');
    end loop;
  end loop;
  update orders set status = 'released', released_at = now(), updated_at = now()
   where status = 'delivered' and delivered_at < now() - make_interval(days => pol.release_days);
  get diagnostics n_released = row_count;

  -- 5. Expired bids leave the book.
  update bids set status = 'expired' where status = 'open' and expires_at is not null and expires_at < now();
  get diagnostics n_expired = row_count;

  -- 6. Settlement requests that got lost (function down, network) are retried;
  --    the settle function is idempotent per order.
  select value into v_url from private.app_settings where key = 'functions_url';
  if v_url is not null then
    for o in select * from orders where payout_status in ('pending', 'refund_pending')
               and updated_at < now() - interval '15 minutes' order by updated_at limit 50 loop
      perform net.http_post(url := v_url || '/settle', headers := '{"Content-Type": "application/json"}'::jsonb,
                            body := jsonb_build_object('order_id', o.id));
      update orders set updated_at = now() where id = o.id;
      n_retried := n_retried + 1;
    end loop;
  end if;

  return jsonb_build_object('cancelled', n_cancelled, 'refunded', n_refunded, 'delivered', n_delivered, 'released', n_released,
                            'bids_expired', n_expired, 'settlements_retried', n_retried);
end $$;
