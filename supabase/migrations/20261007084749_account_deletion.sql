-- Account deletion (App Store requirement; right to erasure under the Swiss
-- FADP / GDPR). The delete-account edge function calls
-- prepare_account_deletion() as the user, removes their photos, then deletes
-- the auth user, which cascades to everything personal.
--
-- Completed orders are business records (amounts, dates, the shirt) and stay
-- for accounting, but lose the link to the person: these references now
-- become null instead of blocking the deletion.
alter table public.orders
  drop constraint orders_buyer_id_fkey,
  add constraint orders_buyer_id_fkey foreign key (buyer_id) references auth.users (id) on delete set null,
  drop constraint orders_seller_id_fkey,
  add constraint orders_seller_id_fkey foreign key (seller_id) references auth.users (id) on delete set null,
  -- the matched bid/ask and the seller's item go with their owner
  drop constraint orders_bid_id_fkey,
  add constraint orders_bid_id_fkey foreign key (bid_id) references public.bids (id) on delete set null,
  drop constraint orders_ask_id_fkey,
  add constraint orders_ask_id_fkey foreign key (ask_id) references public.asks (id) on delete set null,
  drop constraint orders_custom_item_id_fkey,
  add constraint orders_custom_item_id_fkey foreign key (custom_item_id) references public.custom_items (id) on delete set null;
alter table public.disputes
  drop constraint disputes_opened_by_fkey,
  add constraint disputes_opened_by_fkey foreign key (opened_by) references auth.users (id) on delete set null;
alter table public.review_queue
  drop constraint review_queue_reviewer_id_fkey,
  add constraint review_queue_reviewer_id_fkey foreign key (reviewer_id) references auth.users (id) on delete set null;
alter table public.api_keys
  drop constraint api_keys_created_by_fkey,
  add constraint api_keys_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

-- What still stands in the way: orders where money or a shirt is in transit.
create or replace function public.account_deletion_blockers()
returns table (open_orders int)
language sql stable security definer set search_path = ''
as $$
  select count(*)::int
  from public.orders o
  where (o.buyer_id = (select auth.uid()) or o.seller_id = (select auth.uid()))
    and o.status in ('pending_payment', 'paid_escrow', 'shipped', 'delivered', 'disputed');
$$;

create or replace function public.prepare_account_deletion()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  open_n int;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select b.open_orders into open_n from public.account_deletion_blockers() b;
  if open_n > 0 then
    raise exception 'finish or cancel your open orders first (%)', open_n using errcode = 'P0409';
  end if;
  -- Shipping addresses aren't needed once an order is complete.
  delete from public.order_addresses a using public.orders o where a.order_id = o.id and o.buyer_id = uid;
  insert into public.audit_log (actor, action, target) values (uid, 'account.delete', uid::text);
end;
$$;

revoke all on function public.account_deletion_blockers() from public, anon;
revoke all on function public.prepare_account_deletion() from public, anon;
grant execute on function public.account_deletion_blockers() to authenticated;
grant execute on function public.prepare_account_deletion() to authenticated;
