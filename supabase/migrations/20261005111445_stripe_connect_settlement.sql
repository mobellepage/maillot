-- stripe_connect_settlement
-- Real money movement for escrow outcomes (Stripe Connect, separate charges
-- and transfers). The buyer pays the platform at checkout; when an order is
-- released the seller's share is transferred to their connected account,
-- when it's refunded the buyer's payment is refunded. Both are performed by
-- the "settle" edge function, triggered here and idempotent per order.

alter table public.profiles
  add column if not exists stripe_account_id text unique,
  add column if not exists payouts_enabled boolean not null default false;
-- Still not client-writable: only `handle` has a column UPDATE grant.

alter table public.orders
  add column if not exists payout_status text not null default 'none'
    check (payout_status in ('none', 'pending', 'awaiting_onboarding', 'paid', 'failed', 'refund_pending', 'refunded', 'refund_failed')),
  add column if not exists payout_transfer_id text,
  add column if not exists refund_id text,
  add column if not exists settlement_error text,
  add column if not exists settled_at timestamptz;

-- The seller's own payout readiness (for the "set up payouts" prompt).
create or replace function public.my_payout_status()
returns table (connected boolean, payouts_enabled boolean)
language sql stable security definer set search_path = public as $$
  select stripe_account_id is not null, payouts_enabled from public.profiles where id = auth.uid();
$$;
revoke execute on function public.my_payout_status() from public, anon;
grant execute on function public.my_payout_status() to authenticated;

-- Fire-and-forget settlement request; the edge function re-reads the order
-- and only acts if the database state calls for it.
create or replace function public.request_settlement()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare v_url text;
begin
  if new.status = old.status or new.status not in ('released', 'refunded') then return new; end if;
  new.payout_status := case when new.status = 'released' then 'pending' else 'refund_pending' end;
  select value into v_url from private.app_settings where key = 'functions_url';
  if v_url is not null then
    perform extensions.http_post(
      url := v_url || '/settle',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('order_id', new.id)
    );
  end if;
  return new;
exception when others then
  return new;
end $$;
revoke execute on function public.request_settlement() from public, anon, authenticated;

drop trigger if exists orders_request_settlement on public.orders;
create trigger orders_request_settlement before update of status on public.orders
  for each row execute function public.request_settlement();

create index if not exists orders_payout_pending_idx on public.orders (seller_id) where payout_status in ('pending', 'awaiting_onboarding');
