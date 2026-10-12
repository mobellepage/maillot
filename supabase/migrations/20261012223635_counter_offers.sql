-- Counter-offers. Whoever receives an offer on a collection shirt (the
-- owner, or the buyer for a counter-offer) can accept, decline or counter —
-- up to offer_policy().max_rounds offers in one negotiation. Every offer is
-- open for offer_policy().valid_hours (48 h) — the rules live in one place.
create or replace function public.offer_policy()
returns table (valid_hours int, max_rounds int)
language sql immutable set search_path = '' as $$ select 48, 3 $$;
grant execute on function public.offer_policy() to anon, authenticated;

alter table public.collection_offers
  add column if not exists parent_offer_id uuid references public.collection_offers(id) on delete set null,
  add column if not exists round int not null default 1,
  add column if not exists by_owner boolean not null default false;
alter table public.collection_offers drop constraint collection_offers_status_check;
alter table public.collection_offers add constraint collection_offers_status_check
  check (status in ('open', 'accepted', 'declined', 'withdrawn', 'countered'));
alter table public.collection_offers alter column expires_at set default now() + interval '48 hours';

-- New offers from buyers: open for 48 h (was 14 days).
create or replace function public.make_collection_offer(p_item_id text, p_amount numeric, p_message text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_item public.custom_items;
  v_id uuid;
  v_handle text;
  v_name text;
  v_hours int := (select valid_hours from public.offer_policy());
begin
  if v_me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into v_item from public.custom_items where id = p_item_id;
  if v_item.id is null or v_item.visibility not in ('offers', 'forsale') or not private.shown(v_item) then
    raise exception 'this shirt is not open to offers' using errcode = 'P0002';
  end if;
  if v_item.user_id = v_me then raise exception 'you cannot make an offer on your own shirt' using errcode = '22023'; end if;
  if v_item.catalog_id is null or v_item.size is null then
    raise exception 'offers need a catalogued shirt with a size' using errcode = '22023';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 100000 then raise exception 'amount must be between 1 and 100000' using errcode = '22023'; end if;
  perform private.hit('offer:' || v_me, 30, interval '1 hour');

  -- A new offer replaces the buyer's open one on the same shirt (and starts a new negotiation).
  update public.collection_offers set amount = round(p_amount), message = nullif(trim(p_message), ''), created_at = now(),
         expires_at = now() + make_interval(hours => v_hours), round = 1, by_owner = false, parent_offer_id = null
   where item_id = p_item_id and buyer_id = v_me and status = 'open'
  returning id into v_id;
  if v_id is null then
    insert into public.collection_offers (item_id, owner_id, buyer_id, amount, message, expires_at)
    values (p_item_id, v_item.user_id, v_me, round(p_amount), nullif(trim(p_message), ''), now() + make_interval(hours => v_hours))
    returning id into v_id;
  end if;

  select handle into v_handle from public.profiles where id = v_me;
  select name into v_name from public.catalog_shirts where id = v_item.catalog_id;
  insert into public.notifications (user_id, type, title, body, data)
  values (v_item.user_id, 'collection_offer', 'New offer for your shirt',
          coalesce('@' || v_handle, 'A collector') || ' offers CHF ' || round(p_amount) || ' for ' || coalesce(v_name, v_item.catalog_id) || ' (' || v_item.size || ').',
          jsonb_build_object('offer_id', v_id, 'item_id', p_item_id, 'catalog_id', v_item.catalog_id, 'size', v_item.size, 'amount', round(p_amount), 'handle', v_handle));
  return v_id;
end $$;

-- Who answers an offer: the owner for a buyer's offer, the buyer for a counter-offer.
create or replace function private.offer_responder(o public.collection_offers)
returns uuid language sql immutable set search_path = '' as $$
  select case when o.by_owner then o.buyer_id else o.owner_id end
$$;

create or replace function public.counter_collection_offer(p_offer_id uuid, p_amount numeric, p_message text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  o public.collection_offers;
  v_item public.custom_items;
  v_id uuid;
  v_handle text;
  v_name text;
  v_policy record;
begin
  select * into v_policy from public.offer_policy();
  select * into o from public.collection_offers where id = p_offer_id for update;
  if o.id is null or private.offer_responder(o) is distinct from v_me then raise exception 'no such offer' using errcode = 'P0002'; end if;
  if o.status <> 'open' or o.expires_at < now() then raise exception 'this offer is no longer open' using errcode = '22023'; end if;
  if o.round >= v_policy.max_rounds then raise exception 'no more counter-offers — accept or decline' using errcode = '22023'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 100000 then raise exception 'amount must be between 1 and 100000' using errcode = '22023'; end if;
  select * into v_item from public.custom_items where id = o.item_id;
  if v_item.visibility not in ('offers', 'forsale') or not private.shown(v_item) then
    raise exception 'this shirt is no longer open to offers' using errcode = '22023';
  end if;
  perform private.hit('offer:' || v_me, 30, interval '1 hour');

  update public.collection_offers set status = 'countered', responded_at = now() where id = o.id;
  insert into public.collection_offers (item_id, owner_id, buyer_id, amount, message, parent_offer_id, round, by_owner, expires_at)
  values (o.item_id, o.owner_id, o.buyer_id, round(p_amount), nullif(trim(p_message), ''), o.id, o.round + 1, v_me = o.owner_id,
          now() + make_interval(hours => v_policy.valid_hours))
  returning id into v_id;

  select handle into v_handle from public.profiles where id = v_me;
  select name into v_name from public.catalog_shirts where id = v_item.catalog_id;
  insert into public.notifications (user_id, type, title, body, data)
  values (case when v_me = o.owner_id then o.buyer_id else o.owner_id end, 'collection_offer', 'You received a counter-offer',
          coalesce('@' || v_handle, 'The other collector') || ' counters with CHF ' || round(p_amount) || ' for ' || coalesce(v_name, v_item.catalog_id) || ' (' || v_item.size || ').',
          jsonb_build_object('offer_id', v_id, 'item_id', o.item_id, 'catalog_id', v_item.catalog_id, 'size', v_item.size, 'amount', round(p_amount), 'handle', v_handle));
  return v_id;
end $$;

-- Accept or decline: by whoever the offer is addressed to. An accepted offer
-- (or counter-offer) becomes an order the buyer pays into escrow.
create or replace function public.respond_collection_offer(p_offer_id uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  o public.collection_offers;
  v_item public.custom_items;
  v_order uuid;
  v_handle text;
  v_name text;
  v_maker uuid;
begin
  if v_me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into o from public.collection_offers where id = p_offer_id for update;
  if o.id is null or private.offer_responder(o) is distinct from v_me then raise exception 'no such offer' using errcode = 'P0002'; end if;
  if o.status <> 'open' or o.expires_at < now() then raise exception 'this offer is no longer open' using errcode = '22023'; end if;
  v_maker := case when o.by_owner then o.owner_id else o.buyer_id end;
  select * into v_item from public.custom_items where id = o.item_id;
  select handle into v_handle from public.profiles where id = v_me;
  select name into v_name from public.catalog_shirts where id = v_item.catalog_id;

  if not p_accept then
    update public.collection_offers set status = 'declined', responded_at = now() where id = o.id;
    insert into public.notifications (user_id, type, title, body, data)
    values (v_maker, 'offer_declined', case when o.by_owner then 'Your counter-offer was declined' else 'Your offer was declined' end,
            coalesce('@' || v_handle, 'The other collector') || ' declined your ' || case when o.by_owner then 'counter-offer' else 'offer' end || ' of CHF ' || o.amount || ' for ' || coalesce(v_name, v_item.catalog_id) || '.',
            jsonb_build_object('item_id', o.item_id, 'catalog_id', v_item.catalog_id, 'amount', o.amount, 'handle', v_handle));
    return null;
  end if;

  if v_item.visibility not in ('offers', 'forsale') or v_item.user_id <> o.owner_id then
    raise exception 'this shirt is no longer open to offers' using errcode = '22023';
  end if;
  insert into public.orders (buyer_id, seller_id, shirt_id, custom_item_id, size, amount, auth_fee, shipping_fee, commission, status)
  values (o.buyer_id, o.owner_id, v_item.catalog_id, v_item.id, v_item.size, o.amount, 9, 12, private.commission_for(o.owner_id, o.amount), 'pending_payment')
  returning id into v_order;
  update public.collection_offers set status = 'accepted', responded_at = now(), order_id = v_order where id = o.id;

  insert into public.notifications (user_id, type, title, body, data)
  values (v_maker, 'offer_accepted', case when o.by_owner then 'Your counter-offer was accepted' else 'Your offer was accepted' end,
          case when o.by_owner
               then coalesce('@' || v_handle, 'The buyer') || ' accepted your counter-offer of CHF ' || o.amount || ' for ' || coalesce(v_name, v_item.catalog_id) || ' — payment is next.'
               else coalesce('@' || v_handle, 'The owner') || ' accepted your offer of CHF ' || o.amount || ' for ' || coalesce(v_name, v_item.catalog_id) || ' — complete payment to secure it.' end,
          jsonb_build_object('order_id', v_order, 'shirt_id', v_item.catalog_id, 'size', v_item.size, 'amount', o.amount, 'handle', v_handle));

  -- Everyone else who offered on this shirt hears it's gone.
  with others as (
    update public.collection_offers set status = 'declined', responded_at = now()
     where item_id = o.item_id and status = 'open' and id <> o.id
    returning buyer_id, amount
  )
  insert into public.notifications (user_id, type, title, body, data)
  select others.buyer_id, 'offer_declined', 'Your offer was declined',
         coalesce(v_name, v_item.catalog_id) || ' went to another offer.',
         jsonb_build_object('item_id', o.item_id, 'catalog_id', v_item.catalog_id, 'amount', others.amount,
                            'handle', (select handle from public.profiles where id = o.owner_id))
    from others where others.buyer_id <> o.buyer_id;
  return v_order;
end $$;

-- Withdraw your own open offer or counter-offer.
create or replace function public.withdraw_collection_offer(p_offer_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.collection_offers set status = 'withdrawn', responded_at = now()
   where id = p_offer_id and status = 'open'
     and (select auth.uid()) = case when by_owner then owner_id else buyer_id end;
  if not found then raise exception 'no such open offer' using errcode = 'P0002'; end if;
end $$;

drop function public.my_collection_offers();
create function public.my_collection_offers()
returns table (id uuid, direction text, item_id text, catalog_id text, size text, amount numeric, message text, status text,
               created_at timestamptz, expires_at timestamptz, other_handle text, order_id uuid,
               round int, by_owner boolean, awaiting_me boolean)
language sql stable security definer set search_path = '' as $$
  select o.id, case when o.owner_id = (select auth.uid()) then 'received' else 'sent' end,
         o.item_id, ci.catalog_id, ci.size, o.amount, o.message,
         case when o.status = 'open' and o.expires_at < now() then 'expired' else o.status end,
         o.created_at, o.expires_at,
         (select p.handle from public.profiles p where p.id = case when o.owner_id = (select auth.uid()) then o.buyer_id else o.owner_id end),
         o.order_id, o.round, o.by_owner,
         o.status = 'open' and o.expires_at >= now() and private.offer_responder(o) = (select auth.uid())
    from public.collection_offers o
    join public.custom_items ci on ci.id = o.item_id
   where (select auth.uid()) in (o.owner_id, o.buyer_id)
     and o.status <> 'countered'
   order by (o.status = 'open' and o.expires_at >= now()) desc, o.created_at desc
   limit 100
$$;

revoke execute on function public.counter_collection_offer(uuid, numeric, text), public.my_collection_offers() from public, anon;
grant execute on function public.counter_collection_offer(uuid, numeric, text), public.my_collection_offers() to authenticated;
