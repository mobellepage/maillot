-- notifications_lifecycle_triggers
-- Extends the notifications system (the `notifications` table + the
-- bid_matched inserts already done inside match_order_book()) to also cover
-- the escrow order lifecycle and disputes, and adds a best-effort relay that
-- forwards every new notification row to the `send-notification` Edge
-- Function so it can email/push the user. The relay is fire-and-forget
-- (pg_net is async) and the Edge Function itself is inert until a real email
-- provider key is configured — see supabase/functions/send-notification.

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Order status changes -> notify the relevant party
-- ---------------------------------------------------------------------------
create or replace function public.notify_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'paid_escrow' then
    insert into public.notifications (user_id, type, title, body, data)
      values (new.seller_id, 'order_paid', 'Payment received', 'Buyer paid for ' || new.shirt_id || ' (' || new.size || ') \u2014 please ship it and mark the order as shipped.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id));
  elsif new.status = 'shipped' then
    insert into public.notifications (user_id, type, title, body, data)
      values (new.buyer_id, 'order_shipped', 'Your order shipped', new.shirt_id || ' (' || new.size || ') is on its way' || case when new.tracking_code is not null then ' \u2014 tracking: ' || new.tracking_code else '' end || '.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id, 'tracking_code', new.tracking_code));
  elsif new.status = 'released' then
    insert into public.notifications (user_id, type, title, body, data)
      values (new.seller_id, 'order_released', 'Escrow released', 'Buyer confirmed receipt of ' || new.shirt_id || ' (' || new.size || ') \u2014 your payout is on its way.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id));
  elsif new.status = 'disputed' then
    insert into public.notifications (user_id, type, title, body, data)
      values
        (new.buyer_id, 'order_disputed', 'Order disputed', 'A dispute was opened on ' || new.shirt_id || ' (' || new.size || ').', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id)),
        (new.seller_id, 'order_disputed', 'Order disputed', 'A dispute was opened on ' || new.shirt_id || ' (' || new.size || ').', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id));
  elsif new.status = 'cancelled' then
    insert into public.notifications (user_id, type, title, body, data)
      values (new.seller_id, 'order_cancelled', 'Order cancelled', 'The buyer cancelled the order for ' || new.shirt_id || ' (' || new.size || ').', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id));
  elsif new.status = 'refunded' then
    insert into public.notifications (user_id, type, title, body, data)
      values (new.buyer_id, 'order_refunded', 'Order refunded', 'Your payment for ' || new.shirt_id || ' (' || new.size || ') was refunded.', jsonb_build_object('order_id', new.id, 'shirt_id', new.shirt_id));
  end if;

  return new;
end;
$$;

drop trigger if exists on_order_status_change on public.orders;
create trigger on_order_status_change
  after update on public.orders
  for each row execute function public.notify_order_status_change();

-- ---------------------------------------------------------------------------
-- Dispute opened -> notify whichever party did not open it
-- ---------------------------------------------------------------------------
create or replace function public.notify_dispute_opened()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  o public.orders;
  recipient uuid;
begin
  select * into o from public.orders where id = new.order_id;
  if o.id is null then return new; end if;

  recipient := case when new.opened_by = o.buyer_id then o.seller_id else o.buyer_id end;

  insert into public.notifications (user_id, type, title, body, data)
    values (recipient, 'dispute_opened', 'Dispute opened against your order', new.reason, jsonb_build_object('order_id', o.id, 'dispute_id', new.id, 'shirt_id', o.shirt_id));

  return new;
end;
$$;

drop trigger if exists on_dispute_insert on public.disputes;
create trigger on_dispute_insert
  after insert on public.disputes
  for each row execute function public.notify_dispute_opened();

-- ---------------------------------------------------------------------------
-- Every new notification row -> best-effort async relay to the
-- send-notification Edge Function (email/push). Inert until that function's
-- email provider secret is configured; failures here never block the INSERT.
-- ---------------------------------------------------------------------------
create or replace function public.relay_notification()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
begin
  perform extensions.http_post(
    url := 'https://vuclwradmphgasiactsa.supabase.co/functions/v1/send-notification',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('id', new.id, 'user_id', new.user_id, 'type', new.type, 'title', new.title, 'body', new.body, 'data', new.data)
  );
  return new;
exception when others then
  -- Never let a notification-relay failure break the underlying write.
  return new;
end;
$$;

drop trigger if exists on_notification_insert on public.notifications;
create trigger on_notification_insert
  after insert on public.notifications
  for each row execute function public.relay_notification();
