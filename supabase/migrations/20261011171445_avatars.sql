-- Profile pictures: members pick one of 50 illustrated "legend" avatars
-- (drawn in the app, src/features/avatars/legends.ts — no photos, no real
-- people). profiles.avatar holds its id; null shows the initials.
alter table public.profiles add column if not exists avatar text
  check (avatar ~ '^legend-(0[1-9]|[1-4][0-9]|50)$');
grant update (avatar) on public.profiles to authenticated;

-- Search, profile and following list carry the avatar along.
drop function public.search_collectors(text);
create function public.search_collectors(p_q text)
returns table (handle text, member_since timestamptz, shirts int, listings int, preview text[], dealer boolean, avatar text)
language sql stable security definer set search_path = '' as $$
  with q as (select lower(trim(leading '@' from trim(coalesce(p_q, '')))) as s),
  found as (
    select p.id, p.handle, p.created_at, p.dealer_verified_at is not null as dealer, p.collection_private as hidden, p.avatar,
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
         f.dealer, f.avatar
    from found f, q
   order by lower(f.handle) = q.s desc, f.dealer desc, starts_with(lower(f.handle), q.s) desc, f.shirts desc, lower(f.handle)
   limit 20
$$;
revoke execute on function public.search_collectors(text) from public;
grant execute on function public.search_collectors(text) to anon, authenticated;

drop function public.collector_profile(text);
create function public.collector_profile(p_handle text)
returns table (followers int, following int, show_value boolean, is_following boolean, is_me boolean, dealer boolean, collection_private boolean, avatar text)
language sql stable security definer set search_path = '' as $$
  select (select count(*)::int from public.follows f where f.followee_id = p.id),
         (select count(*)::int from public.follows f where f.follower_id = p.id),
         p.show_collection_value,
         exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = p.id),
         p.id = (select auth.uid()),
         p.dealer_verified_at is not null,
         p.collection_private,
         p.avatar
    from public.profiles p
   where lower(p.handle) = lower(p_handle)
$$;
revoke execute on function public.collector_profile(text) from public;
grant execute on function public.collector_profile(text) to anon, authenticated;

drop function public.my_following();
create function public.my_following()
returns table (handle text, followed_at timestamptz, shirts int, avatar text)
language sql stable security definer set search_path = '' as $$
  select p.handle, f.created_at,
         case when p.collection_private then 0
              else (select count(*)::int from public.custom_items ci where ci.user_id = p.id and ci.visibility <> 'private') end,
         p.avatar
    from public.follows f
    join public.profiles p on p.id = f.followee_id
   where f.follower_id = (select auth.uid()) and p.handle is not null
   order by f.created_at desc
$$;
revoke execute on function public.my_following() from public, anon;
grant execute on function public.my_following() to authenticated;
