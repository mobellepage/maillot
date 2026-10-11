-- Offers on collection shirts. A member who shows a shirt as "open to
-- offers" or "for sale" can receive offers for it; accepting one turns it
-- into a normal order (escrow, authentication, payout) — the buyer pays as
-- after any match. And members hear when someone adds a shirt from their
-- watchlist (or alerts) to a collection open to offers, so they can make one.
--
-- Offers expire after 14 days, one open offer per buyer and shirt (a new one
-- replaces it), 30 offers per member and hour. Only catalogued shirts with a
-- size can be offered on (orders need both).

create table public.collection_offers (
  id uuid primary key default gen_random_uuid(),
  item_id text not null references public.custom_items(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null check (amount >= 1 and amount <= 100000),
  message text check (char_length(message) <= 300),
  status text not null default 'open' check (status in ('open', 'accepted', 'declined', 'withdrawn')),
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days'
);
create unique index collection_offers_one_open on public.collection_offers (item_id, buyer_id) where status = 'open';
create index collection_offers_owner on public.collection_offers (owner_id, created_at desc);
create index collection_offers_buyer on public.collection_offers (buyer_id, created_at desc);
alter table public.collection_offers enable row level security;
create policy "collection offers: parties" on public.collection_offers for select to authenticated
  using ((select auth.uid()) in (owner_id, buyer_id));
revoke insert, update, delete on public.collection_offers from anon, authenticated;

create or replace function public.make_collection_offer(p_item_id text, p_amount numeric, p_message text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_item public.custom_items;
  v_id uuid;
  v_handle text;
  v_name text;
begin
  if v_me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into v_item from public.custom_items where id = p_item_id;
  if v_item.id is null or v_item.visibility not in ('offers', 'forsale') then
    raise exception 'this shirt is not open to offers' using errcode = 'P0002';
  end if;
  if v_item.user_id = v_me then raise exception 'you cannot make an offer on your own shirt' using errcode = '22023'; end if;
  if v_item.catalog_id is null or v_item.size is null then
    raise exception 'offers need a catalogued shirt with a size' using errcode = '22023';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 100000 then raise exception 'amount must be between 1 and 100000' using errcode = '22023'; end if;
  perform private.hit('offer:' || v_me, 30, interval '1 hour');

  -- A new offer replaces the buyer's open one on the same shirt.
  update public.collection_offers set amount = round(p_amount), message = nullif(trim(p_message), ''), created_at = now(), expires_at = now() + interval '14 days'
   where item_id = p_item_id and buyer_id = v_me and status = 'open'
  returning id into v_id;
  if v_id is null then
    insert into public.collection_offers (item_id, owner_id, buyer_id, amount, message)
    values (p_item_id, v_item.user_id, v_me, round(p_amount), nullif(trim(p_message), ''))
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

create or replace function public.respond_collection_offer(p_offer_id uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  o public.collection_offers;
  v_item public.custom_items;
  v_order uuid;
  v_handle text;
  v_name text;
begin
  if v_me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into o from public.collection_offers where id = p_offer_id for update;
  if o.id is null or o.owner_id <> v_me then raise exception 'no such offer' using errcode = 'P0002'; end if;
  if o.status <> 'open' or o.expires_at < now() then raise exception 'this offer is no longer open' using errcode = '22023'; end if;
  select * into v_item from public.custom_items where id = o.item_id;
  select handle into v_handle from public.profiles where id = v_me;
  select name into v_name from public.catalog_shirts where id = v_item.catalog_id;

  if not p_accept then
    update public.collection_offers set status = 'declined', responded_at = now() where id = o.id;
    insert into public.notifications (user_id, type, title, body, data)
    values (o.buyer_id, 'offer_declined', 'Your offer was declined',
            coalesce('@' || v_handle, 'The owner') || ' declined your offer of CHF ' || o.amount || ' for ' || coalesce(v_name, v_item.catalog_id) || '.',
            jsonb_build_object('item_id', o.item_id, 'catalog_id', v_item.catalog_id, 'amount', o.amount, 'handle', v_handle));
    return null;
  end if;

  if v_item.visibility not in ('offers', 'forsale') or v_item.user_id <> v_me then
    raise exception 'this shirt is no longer open to offers' using errcode = '22023';
  end if;
  -- An accepted offer is an order like any match: the buyer pays into escrow next.
  insert into public.orders (buyer_id, seller_id, shirt_id, custom_item_id, size, amount, auth_fee, shipping_fee, commission, status)
  values (o.buyer_id, v_me, v_item.catalog_id, v_item.id, v_item.size, o.amount, 9, 12, private.commission_for(v_me, o.amount), 'pending_payment')
  returning id into v_order;
  update public.collection_offers set status = 'accepted', responded_at = now(), order_id = v_order where id = o.id;

  insert into public.notifications (user_id, type, title, body, data)
  values (o.buyer_id, 'offer_accepted', 'Your offer was accepted',
          coalesce('@' || v_handle, 'The owner') || ' accepted your offer of CHF ' || o.amount || ' for ' || coalesce(v_name, v_item.catalog_id) || ' — complete payment to secure it.',
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
         jsonb_build_object('item_id', o.item_id, 'catalog_id', v_item.catalog_id, 'amount', others.amount, 'handle', v_handle)
    from others;
  return v_order;
end $$;

create or replace function public.withdraw_collection_offer(p_offer_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.collection_offers set status = 'withdrawn', responded_at = now()
   where id = p_offer_id and buyer_id = (select auth.uid()) and status = 'open';
  if not found then raise exception 'no such open offer' using errcode = 'P0002'; end if;
end $$;

-- Offers received and sent, with what the app needs to show them.
create or replace function public.my_collection_offers()
returns table (id uuid, direction text, item_id text, catalog_id text, size text, amount numeric, message text, status text,
               created_at timestamptz, expires_at timestamptz, other_handle text, order_id uuid)
language sql stable security definer set search_path = '' as $$
  select o.id, case when o.owner_id = (select auth.uid()) then 'received' else 'sent' end,
         o.item_id, ci.catalog_id, ci.size, o.amount, o.message,
         case when o.status = 'open' and o.expires_at < now() then 'expired' else o.status end,
         o.created_at, o.expires_at,
         (select p.handle from public.profiles p where p.id = case when o.owner_id = (select auth.uid()) then o.buyer_id else o.owner_id end),
         o.order_id
    from public.collection_offers o
    join public.custom_items ci on ci.id = o.item_id
   where (select auth.uid()) in (o.owner_id, o.buyer_id)
   order by (o.status = 'open' and o.expires_at >= now()) desc, o.created_at desc
   limit 100
$$;

revoke execute on function public.make_collection_offer(text, numeric, text), public.respond_collection_offer(uuid, boolean),
  public.withdraw_collection_offer(uuid), public.my_collection_offers() from public, anon;
grant execute on function public.make_collection_offer(text, numeric, text), public.respond_collection_offer(uuid, boolean),
  public.withdraw_collection_offer(uuid), public.my_collection_offers() to authenticated;

-- "A shirt you want is in a collection": watchers and alert holders hear when
-- someone opens a shirt they want to offers (once per shirt and member).
create or replace function private.wanted_in_collection()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_handle text; v_name text;
begin
  if new.catalog_id is null or new.visibility not in ('offers', 'forsale') then return new; end if;
  if tg_op = 'UPDATE' and old.visibility in ('offers', 'forsale') and old.catalog_id is not distinct from new.catalog_id then return new; end if;
  select handle into v_handle from public.profiles where id = new.user_id;
  if v_handle is null then return new; end if;
  select name into v_name from public.catalog_shirts where id = new.catalog_id;
  insert into public.notifications (user_id, type, title, body, data)
  select w.user_id, 'wanted_in_collection', 'A shirt you want is in a collection',
         '@' || v_handle || ' has ' || coalesce(v_name, new.catalog_id) || coalesce(' (' || new.size || ')', '') || ' and is open to offers.',
         jsonb_build_object('handle', v_handle, 'item_id', new.id, 'catalog_id', new.catalog_id, 'size', new.size)
    from (
      select user_id from public.watchlist where shirt_id = new.catalog_id
      union
      select user_id from public.listing_alerts where shirt_id = new.catalog_id and (size is null or size = new.size)
    ) w
   where w.user_id <> new.user_id
     and not exists (select 1 from public.notifications n where n.user_id = w.user_id and n.type = 'wanted_in_collection' and n.data ->> 'item_id' = new.id);
  return new;
exception when others then
  return new; -- a notification must never block saving a shirt
end $$;
create trigger wanted_in_collection after insert or update of visibility, catalog_id on public.custom_items
  for each row execute function private.wanted_in_collection();
