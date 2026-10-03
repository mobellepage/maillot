-- add_escrow_lifecycle_columns_to_orders
alter table public.orders
  add column if not exists stripe_checkout_session_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists tracking_code text;

-- valid lifecycle: pending_payment -> paid_escrow -> shipped -> delivered -> released
--                                                                          -> disputed (from paid_escrow/shipped/delivered)
--                                                                          -> cancelled (from pending_payment only)
alter table public.orders
  drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check check (
    status in ('pending_payment','paid_escrow','shipped','delivered','released','disputed','cancelled','refunded')
  );
