-- security_hardening_v1
-- =====================================================================
-- Security hardening v1
-- Closes: admin self-promotion, client-side escrow status writes,
-- self-granted expert verification, forged review approvals, event
-- spoofing, and internal/trigger functions exposed over /rest/v1/rpc.
-- Also rewrites every policy to the (select auth.uid()) initplan form.
-- =====================================================================

-- Shared admin predicate (STABLE + SECURITY DEFINER so policies can call it
-- without recursing through profiles RLS, and it is evaluated once per query).
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false) $$;

-- ---------------------------------------------------------------------
-- profiles: users may only change their handle. is_admin is never
-- client-writable; rows are created by the handle_new_user() trigger.
-- ---------------------------------------------------------------------
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (handle) on public.profiles to authenticated;
create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------
-- orders: read-only for the parties. Orders are created only by the
-- matching engine; every status change goes through the RPCs below.
-- ---------------------------------------------------------------------
drop policy if exists orders_party_insert on public.orders;
drop policy if exists orders_party_update on public.orders;
drop policy if exists orders_party_select on public.orders;
revoke insert, update, delete on public.orders from anon, authenticated;
create policy orders_party_select on public.orders for select to authenticated
  using ((select auth.uid()) = buyer_id or (select auth.uid()) = seller_id);

create or replace function public.order_mark_shipped(p_order_id uuid, p_tracking text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update orders set status = 'shipped', shipped_at = now(), updated_at = now(),
         tracking_code = nullif(trim(coalesce(p_tracking, '')), '')
   where id = p_order_id and seller_id = auth.uid() and status = 'paid_escrow';
  if not found then raise exception 'order cannot be marked shipped'; end if;
end $$;

create or replace function public.order_confirm_receipt(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update orders set status = 'released', delivered_at = now(), released_at = now(), updated_at = now()
   where id = p_order_id and buyer_id = auth.uid() and status = 'shipped';
  if not found then raise exception 'order cannot be released'; end if;
end $$;

-- Buyer walks away before paying: the seller's ask goes back on the book
-- (it was never their fault) and the buyer's bid is cancelled.
create or replace function public.order_cancel(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  update orders set status = 'cancelled', updated_at = now()
   where id = p_order_id and buyer_id = auth.uid() and status = 'pending_payment'
   returning * into o;
  if o.id is null then raise exception 'order cannot be cancelled'; end if;
  if o.ask_id is not null then update asks set status = 'open' where id = o.ask_id and status = 'matched'; end if;
  if o.bid_id is not null then update bids set status = 'cancelled' where id = o.bid_id; end if;
end $$;

create or replace function public.order_open_dispute(p_order_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason required'; end if;
  update orders set status = 'disputed', updated_at = now()
   where id = p_order_id and (buyer_id = auth.uid() or seller_id = auth.uid())
     and status in ('paid_escrow', 'shipped');
  if not found then raise exception 'order cannot be disputed'; end if;
  insert into disputes (order_id, opened_by, reason) values (p_order_id, auth.uid(), left(trim(p_reason), 2000))
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- disputes: parties read, creation only via order_open_dispute(),
-- resolution only via resolve_dispute() (admin).
-- ---------------------------------------------------------------------
drop policy if exists disputes_party_insert on public.disputes;
drop policy if exists disputes_party_select on public.disputes;
drop policy if exists disputes_admin_update on public.disputes;
revoke insert, update, delete on public.disputes from anon, authenticated;
create policy disputes_party_select on public.disputes for select to authenticated using (
  exists (select 1 from orders o where o.id = disputes.order_id
          and (o.buyer_id = (select auth.uid()) or o.seller_id = (select auth.uid())))
);

-- Only open disputes can be resolved (prevents double release/refund).
create or replace function public.resolve_dispute(p_dispute_id uuid, p_outcome text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare v_order_id uuid;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_outcome not in ('release', 'refund') then raise exception 'invalid outcome: %', p_outcome; end if;
  update disputes set status = 'resolved_' || p_outcome, resolution_note = p_note, updated_at = now()
   where id = p_dispute_id and status = 'open'
   returning order_id into v_order_id;
  if v_order_id is null then raise exception 'dispute not found or already resolved'; end if;
  update orders
     set status = case when p_outcome = 'release' then 'released' else 'refunded' end,
         released_at = case when p_outcome = 'release' then now() else released_at end,
         updated_at = now()
   where id = v_order_id and status = 'disputed';
end $$;

-- ---------------------------------------------------------------------
-- review_queue: owners can only submit *pending* requests; resolution is
-- admin-only via resolve_review(), which also stamps the owner's item.
-- ---------------------------------------------------------------------
drop policy if exists review_queue_owner_insert on public.review_queue;
drop policy if exists review_queue_owner_select on public.review_queue;
drop policy if exists review_queue_admin_all on public.review_queue;
create policy review_queue_select on public.review_queue for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));
create policy review_queue_insert on public.review_queue for insert to authenticated
  with check (
    ((select auth.uid()) = user_id and status = 'pending' and reviewer_id is null and reviewed_at is null)
    or (select public.is_admin())
  );
create policy review_queue_admin_update on public.review_queue for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy review_queue_admin_delete on public.review_queue for delete to authenticated
  using ((select public.is_admin()));

create or replace function public.resolve_review(p_id text, p_approved boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_reason text := case when p_approved then '' else coalesce(nullif(trim(p_reason), ''), 'Unstimmigkeiten konnten nicht ausgeräumt werden.') end;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update review_queue
     set status = case when p_approved then 'approved' else 'rejected' end,
         reason = v_reason, reviewed_at = now(), reviewer_id = auth.uid()
   where id = p_id and status in ('pending', 'in_review');
  if not found then raise exception 'review not found or already resolved'; end if;
  update custom_items
     set verification = verification || jsonb_build_object(
           'level', case when p_approved then 'expert' else coalesce(verification->>'level', 'self') end,
           'status', case when p_approved then 'verifiziert' else 'abgelehnt' end,
           'reason', v_reason),
         updated_at = now()
   where verification->>'reviewId' = p_id;
end $$;

-- ---------------------------------------------------------------------
-- custom_items: an item may only claim expert verification (or a
-- rejection) if a matching decision really exists in review_queue.
-- ---------------------------------------------------------------------
drop policy if exists custom_items_owner_all on public.custom_items;
drop policy if exists custom_items_admin_select on public.custom_items;
create policy custom_items_select on public.custom_items for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));
create policy custom_items_owner_insert on public.custom_items for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy custom_items_owner_update on public.custom_items for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy custom_items_owner_delete on public.custom_items for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.guard_custom_item_verification()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_level text := new.verification->>'level';
  v_status text := new.verification->>'status';
  v_rev review_queue;
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'UPDATE'
     and v_level is not distinct from old.verification->>'level'
     and v_status is not distinct from old.verification->>'status' then
    return new;
  end if;
  if v_level = 'expert' or v_status in ('verifiziert', 'abgelehnt') then
    select * into v_rev from review_queue where id = new.verification->>'reviewId' and user_id = new.user_id;
    if v_rev.id is null then raise exception 'verification state must reference a review'; end if;
    if (v_level = 'expert' or v_status = 'verifiziert') and v_rev.status <> 'approved' then
      raise exception 'review % is not approved', v_rev.id;
    end if;
    if v_status = 'abgelehnt' and v_rev.status <> 'rejected' then
      raise exception 'review % is not rejected', v_rev.id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists custom_items_guard_verification on public.custom_items;
create trigger custom_items_guard_verification before insert or update on public.custom_items
  for each row execute function public.guard_custom_item_verification();

-- ---------------------------------------------------------------------
-- bids / asks: owners place open orders and may only cancel them.
-- ---------------------------------------------------------------------
alter table public.bids add constraint bids_amount_positive check (amount > 0) not valid;
alter table public.asks add constraint asks_amount_positive check (amount > 0) not valid;
alter table public.asks add constraint asks_has_item check (shirt_id is not null or custom_item_id is not null) not valid;

drop policy if exists bids_owner_write on public.bids;
drop policy if exists bids_owner_update on public.bids;
drop policy if exists bids_select_all on public.bids;
create policy bids_select_all on public.bids for select using (true);
create policy bids_owner_insert on public.bids for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'open');
create policy bids_owner_cancel on public.bids for update to authenticated
  using ((select auth.uid()) = user_id and status = 'open')
  with check ((select auth.uid()) = user_id and status = 'cancelled');

drop policy if exists asks_owner_write on public.asks;
drop policy if exists asks_owner_update on public.asks;
drop policy if exists asks_select_all on public.asks;
create policy asks_select_all on public.asks for select using (true);
create policy asks_owner_insert on public.asks for insert to authenticated
  with check (
    (select auth.uid()) = user_id and status = 'open'
    and (custom_item_id is null or exists (select 1 from custom_items c where c.id = custom_item_id and c.user_id = (select auth.uid())))
  );
create policy asks_owner_cancel on public.asks for update to authenticated
  using ((select auth.uid()) = user_id and status = 'open')
  with check ((select auth.uid()) = user_id and status = 'cancelled');
revoke delete on public.bids, public.asks from anon, authenticated;

-- ---------------------------------------------------------------------
-- notifications: owners read and mark-as-read only. Rows are written by
-- server-side triggers/functions, never by clients.
-- ---------------------------------------------------------------------
alter table public.notifications add column if not exists emailed_at timestamptz;
drop policy if exists notifications_owner_all on public.notifications;
revoke insert, update, delete on public.notifications from anon, authenticated;
grant update (read) on public.notifications to authenticated;
create policy notifications_owner_select on public.notifications for select to authenticated
  using ((select auth.uid()) = user_id);
create policy notifications_owner_mark_read on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- events: no spoofing other users; anonymous visitors may only log views.
-- ---------------------------------------------------------------------
drop policy if exists events_insert_any on public.events;
drop policy if exists events_select_own on public.events;
create policy events_insert on public.events for insert
  with check (
    (user_id is null and type = 'view')
    or (user_id = (select auth.uid()) and type in ('view', 'watch', 'unwatch', 'bid', 'buy'))
  );
create policy events_select_own on public.events for select to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- api_keys: same admin predicate, initplan form.
-- ---------------------------------------------------------------------
drop policy if exists api_keys_admin_all on public.api_keys;
create policy api_keys_admin_all on public.api_keys for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists watchlist_owner_all on public.watchlist;
create policy watchlist_owner_all on public.watchlist for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- Function exposure: trigger/internal functions are not callable via the
-- API at all; admin/user RPCs are signed-in only (they re-check roles).
-- ---------------------------------------------------------------------
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.notify_dispute_opened() from public, anon, authenticated;
revoke execute on function public.notify_order_status_change() from public, anon, authenticated;
revoke execute on function public.on_bid_or_ask_insert() from public, anon, authenticated;
revoke execute on function public.relay_notification() from public, anon, authenticated;
revoke execute on function public.match_order_book(text, text) from public, anon, authenticated;
revoke execute on function public.guard_custom_item_verification() from public, anon, authenticated;

revoke execute on function public.create_api_key(text) from public, anon;
revoke execute on function public.revoke_api_key(uuid) from public, anon;
revoke execute on function public.list_disputes_for_admin() from public, anon;
revoke execute on function public.resolve_dispute(uuid, text, text) from public, anon;
revoke execute on function public.resolve_review(text, boolean, text) from public, anon;
revoke execute on function public.order_mark_shipped(uuid, text) from public, anon;
revoke execute on function public.order_confirm_receipt(uuid) from public, anon;
revoke execute on function public.order_cancel(uuid) from public, anon;
revoke execute on function public.order_open_dispute(uuid, text) from public, anon;
grant execute on function public.create_api_key(text), public.revoke_api_key(uuid), public.list_disputes_for_admin(),
  public.resolve_dispute(uuid, text, text), public.resolve_review(text, boolean, text),
  public.order_mark_shipped(uuid, text), public.order_confirm_receipt(uuid), public.order_cancel(uuid),
  public.order_open_dispute(uuid, text), public.is_admin() to authenticated;
