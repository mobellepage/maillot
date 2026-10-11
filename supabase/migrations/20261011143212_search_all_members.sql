-- Collector search finds every member with a username — also those who show
-- no shirt yet (a private collection, or nothing added), so friends can find
-- and follow each other. Shirts stay as private as their owner set them:
-- the count and previews only include what others may see.
create or replace function public.search_collectors(p_q text)
returns table (handle text, member_since timestamptz, shirts int, listings int, preview text[], dealer boolean)
language sql stable security definer set search_path = '' as $$
  with q as (select lower(trim(leading '@' from trim(coalesce(p_q, '')))) as s),
  found as (
    select p.id, p.handle, p.created_at, p.dealer_verified_at is not null as dealer, p.collection_private as hidden,
           case when p.collection_private then 0
                else (select count(*)::int from public.custom_items ci where ci.user_id = p.id and ci.visibility <> 'private') end as shirts,
           (select count(*)::int from public.asks a where a.user_id = p.id and a.status = 'open') as listings
      from public.profiles p, q
     where length(q.s) >= 2 and p.handle is not null and strpos(lower(p.handle), q.s) > 0
  )
  select f.handle, f.created_at, f.shirts, f.listings,
         case when f.hidden then array[]::text[]
              else array(select ci.catalog_id from public.custom_items ci
                          where ci.user_id = f.id and ci.visibility <> 'private' and ci.catalog_id is not null
                          order by ci.created_at desc limit 4) end,
         f.dealer
    from found f, q
   order by lower(f.handle) = q.s desc, f.dealer desc, starts_with(lower(f.handle), q.s) desc, f.shirts desc, lower(f.handle)
   limit 20
$$;
