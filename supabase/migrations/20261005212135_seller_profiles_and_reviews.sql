-- Seller profiles and reviews. A seller's public page shows their chosen
-- handle, track record (completed sales, authentication pass rate, how fast
-- they ship), buyer reviews and live listings — never an email or an
-- account id. Only sellers who picked a handle have a public page.

create table if not exists public.seller_reviews (
  order_id uuid primary key references public.orders (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 600),
  created_at timestamptz not null default now()
);
create index if not exists seller_reviews_seller_idx on public.seller_reviews (seller_id, created_at desc);
alter table public.seller_reviews enable row level security;
-- Reviews are read through the profile RPCs; the table itself only shows
-- each party their own rows.
create policy seller_reviews_party_read on public.seller_reviews for select to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));
revoke insert, update, delete on public.seller_reviews from anon, authenticated;

-- The buyer of a completed order reviews the seller, once.
create or replace function public.review_seller(p_order_id uuid, p_rating int, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where id = p_order_id and buyer_id = auth.uid() and status = 'released';
  if o.id is null then raise exception 'only the buyer of a completed order can review it'; end if;
  if p_rating not between 1 and 5 then raise exception 'rating must be 1 to 5'; end if;
  insert into seller_reviews (order_id, seller_id, buyer_id, rating, comment)
  values (o.id, o.seller_id, o.buyer_id, p_rating, nullif(left(trim(coalesce(p_comment, '')), 600), ''));
exception when unique_violation then
  raise exception 'this order has already been reviewed';
end $$;
revoke execute on function public.review_seller(uuid, int, text) from public, anon;
grant execute on function public.review_seller(uuid, int, text) to authenticated;

-- One seller's public record, by handle.
create or replace function public.seller_profile(p_handle text)
returns table (handle text, member_since timestamptz, sales int, rating numeric, reviews int, pass_rate numeric, avg_ship_days numeric, listings int)
language sql stable security definer set search_path = public as $$
  with p as (select id, handle, created_at from profiles where lower(handle) = lower(p_handle))
  select p.handle, p.created_at,
         (select count(*)::int from orders o where o.seller_id = p.id and o.status = 'released'),
         (select round(avg(r.rating), 2) from seller_reviews r where r.seller_id = p.id),
         (select count(*)::int from seller_reviews r where r.seller_id = p.id),
         (select round(avg(case when o.inspection = 'passed' then 1.0 else 0.0 end), 3) from orders o where o.seller_id = p.id and o.inspection in ('passed', 'failed')),
         (select round(avg(extract(epoch from o.shipped_at - o.paid_at) / 86400.0)::numeric, 1) from orders o where o.seller_id = p.id and o.shipped_at is not null and o.paid_at is not null),
         (select count(*)::int from asks a where a.user_id = p.id and a.status = 'open')
    from p
$$;

create or replace function public.seller_listings(p_handle text)
returns table (ask_id uuid, shirt_id text, size text, amount numeric, condition text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, a.shirt_id, a.size, a.amount, a.condition, a.created_at
    from asks a join profiles p on p.id = a.user_id
   where lower(p.handle) = lower(p_handle) and a.status = 'open' and a.shirt_id is not null
   order by a.created_at desc limit 60
$$;

create or replace function public.seller_review_list(p_handle text)
returns table (rating smallint, comment text, shirt_id text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.rating, r.comment, o.shirt_id, r.created_at
    from seller_reviews r join profiles p on p.id = r.seller_id join orders o on o.id = r.order_id
   where lower(p.handle) = lower(p_handle)
   order by r.created_at desc limit 50
$$;

-- Seller badges for the asks on a shirt page: handle and rating per seller
-- (sellers without a handle come back without one).
create or replace function public.seller_cards(p_user_ids uuid[])
returns table (user_id uuid, handle text, rating numeric, reviews int, sales int)
language sql stable security definer set search_path = public as $$
  select p.id, p.handle,
         (select round(avg(r.rating), 2) from seller_reviews r where r.seller_id = p.id),
         (select count(*)::int from seller_reviews r where r.seller_id = p.id),
         (select count(*)::int from orders o where o.seller_id = p.id and o.status = 'released')
    from profiles p
   where p.id = any (p_user_ids[1:50])
$$;

revoke execute on function public.seller_profile(text), public.seller_listings(text), public.seller_review_list(text), public.seller_cards(uuid[]) from public;
grant execute on function public.seller_profile(text), public.seller_listings(text), public.seller_review_list(text), public.seller_cards(uuid[]) to anon, authenticated;

-- Tell the seller about a new review.
create or replace function private.notify_seller_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, type, title, body, data)
  values (new.seller_id, 'seller_review', 'New review', repeat('★', new.rating) || coalesce(' — ' || new.comment, ''), jsonb_build_object('order_id', new.order_id));
  return new;
end $$;
drop trigger if exists seller_reviews_notify on public.seller_reviews;
create trigger seller_reviews_notify after insert on public.seller_reviews for each row execute function private.notify_seller_review();
revoke execute on function private.notify_seller_review() from public, anon, authenticated;
