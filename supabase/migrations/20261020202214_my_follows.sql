-- My own profile: the collectors I follow and those who follow me, with
-- their picture and how many shirts they show — to find them again quickly.
create or replace function public.my_follows()
returns table (direction text, handle text, avatar text, shirts int, since timestamptz)
language sql stable security definer set search_path = '' as $$
  select x.direction, p.handle, p.avatar,
         case when p.collection_private then 0
              else (select count(*)::int from public.custom_items ci where ci.user_id = p.id and ci.visibility <> 'private') end,
         x.since
    from (select 'following'::text as direction, f.followee_id as other, f.created_at as since
            from public.follows f where f.follower_id = (select auth.uid())
          union all
          select 'follower', f.follower_id, f.created_at
            from public.follows f where f.followee_id = (select auth.uid())) x
    join public.profiles p on p.id = x.other
   where p.handle is not null
   order by x.since desc
$$;
revoke execute on function public.my_follows() from public, anon;
grant execute on function public.my_follows() to authenticated;
