-- Dealers: shops that sell on MAILLOT (pilot partners first). An admin marks
-- a member as a verified dealer and can give them their own commission rate
-- (pilot terms); everyone else keeps the standard 8 %. Members can read their
-- own rate (profiles_select_own) but cannot change it: the new columns get
-- no update grant.

alter table public.profiles
  add column if not exists dealer_verified_at timestamptz,
  add column if not exists commission_rate numeric(5, 4)
    check (commission_rate is null or (commission_rate >= 0 and commission_rate <= 0.3));

-- The commission on a sale: the seller's own rate, else the standard 8 %.
create or replace function private.commission_for(p_seller uuid, p_amount numeric)
returns numeric language sql stable security definer set search_path = '' as $$
  select round(p_amount * coalesce((select commission_rate from public.profiles where id = p_seller), 0.08))
$$;

-- Matching engine: unchanged except that the commission comes from commission_for.
create or replace function public.match_order_book(p_shirt_id text, p_size text)
returns void language plpgsql security definer set search_path = public as $function$
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
    values (b.user_id, a.user_id, p_shirt_id, a.custom_item_id, b.id, a.id, p_size, a.amount, 9, 12, private.commission_for(a.user_id, a.amount), 'pending_payment')
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
end $function$;

-- Admins (second factor verified) set or clear dealer status and rate.
create or replace function public.admin_set_dealer(p_handle text, p_verified boolean, p_commission_rate numeric default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (select public.is_admin()) then raise exception 'admins only' using errcode = '42501'; end if;
  if p_commission_rate is not null and (p_commission_rate < 0 or p_commission_rate > 0.3) then
    raise exception 'commission rate must be between 0 and 0.3' using errcode = '22023';
  end if;
  update public.profiles
     set dealer_verified_at = case when p_verified then coalesce(dealer_verified_at, now()) end,
         commission_rate = p_commission_rate
   where lower(handle) = lower(p_handle);
  if not found then raise exception 'no such member' using errcode = 'P0002'; end if;
end $$;
revoke execute on function public.admin_set_dealer(text, boolean, numeric) from public, anon;
grant execute on function public.admin_set_dealer(text, boolean, numeric) to authenticated;

-- Dealers listed for the admin panel.
create or replace function public.admin_dealers()
returns table (handle text, dealer_verified_at timestamptz, commission_rate numeric, listings int, sales int)
language sql stable security definer set search_path = '' as $$
  select p.handle, p.dealer_verified_at, p.commission_rate,
         (select count(*)::int from public.asks a where a.user_id = p.id and a.status = 'open'),
         (select count(*)::int from public.orders o where o.seller_id = p.id and o.status = 'released')
    from public.profiles p
   where (select public.is_admin()) and (p.dealer_verified_at is not null or p.commission_rate is not null)
   order by p.dealer_verified_at desc nulls last, p.handle
$$;
revoke execute on function public.admin_dealers() from public, anon;
grant execute on function public.admin_dealers() to authenticated;

-- The verified-dealer badge wherever a member appears publicly.
drop function public.collector_profile(text);
create function public.collector_profile(p_handle text)
returns table (followers int, following int, show_value boolean, is_following boolean, is_me boolean, dealer boolean)
language sql stable security definer set search_path = '' as $$
  select (select count(*)::int from public.follows f where f.followee_id = p.id),
         (select count(*)::int from public.follows f where f.follower_id = p.id),
         p.show_collection_value,
         exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = p.id),
         p.id = (select auth.uid()),
         p.dealer_verified_at is not null
    from public.profiles p
   where lower(p.handle) = lower(p_handle)
$$;
revoke execute on function public.collector_profile(text) from public;
grant execute on function public.collector_profile(text) to anon, authenticated;

drop function public.seller_cards(uuid[]);
create function public.seller_cards(p_user_ids uuid[])
returns table (user_id uuid, handle text, rating numeric, reviews integer, sales integer, dealer boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.handle,
         (select round(avg(r.rating), 2) from seller_reviews r where r.seller_id = p.id),
         (select count(*)::int from seller_reviews r where r.seller_id = p.id),
         (select count(*)::int from orders o where o.seller_id = p.id and o.status = 'released'),
         p.dealer_verified_at is not null
    from profiles p
   where p.id = any (p_user_ids[1:50])
$$;
revoke execute on function public.seller_cards(uuid[]) from public;
grant execute on function public.seller_cards(uuid[]) to anon, authenticated;

drop function public.search_collectors(text);
create function public.search_collectors(p_q text)
returns table (handle text, member_since timestamptz, shirts int, listings int, preview text[], dealer boolean)
language sql stable security definer set search_path = '' as $$
  with q as (select lower(trim(leading '@' from trim(coalesce(p_q, '')))) as s),
  found as (
    select p.id, p.handle, p.created_at, p.dealer_verified_at is not null as dealer,
           (select count(*)::int from public.custom_items ci where ci.user_id = p.id and ci.visibility <> 'private') as shirts,
           (select count(*)::int from public.asks a where a.user_id = p.id and a.status = 'open') as listings
      from public.profiles p, q
     where length(q.s) >= 2 and p.handle is not null and strpos(lower(p.handle), q.s) > 0
  )
  select f.handle, f.created_at, f.shirts, f.listings,
         array(select ci.catalog_id from public.custom_items ci
                where ci.user_id = f.id and ci.visibility <> 'private' and ci.catalog_id is not null
                order by ci.created_at desc limit 4),
         f.dealer
    from found f, q
   where f.shirts > 0 or f.listings > 0
   order by lower(f.handle) = q.s desc, f.dealer desc, starts_with(lower(f.handle), q.s) desc, f.shirts desc, lower(f.handle)
   limit 20
$$;
revoke execute on function public.search_collectors(text) from public;
grant execute on function public.search_collectors(text) to anon, authenticated;
