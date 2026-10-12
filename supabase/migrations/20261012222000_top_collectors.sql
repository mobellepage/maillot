-- Community on the home page: the collections people follow most (then the
-- biggest). Only members who show at least one shirt; counts only shirts
-- others may see; private collections never appear.
create or replace function public.top_collectors(p_limit int default 8)
returns table (handle text, avatar text, shirts int, followers int, dealer boolean)
language sql stable security definer set search_path = '' as $$
  select p.handle, p.avatar,
         (select count(*)::int from public.custom_items ci where ci.user_id = p.id and ci.visibility <> 'private') as shirts,
         (select count(*)::int from public.follows f where f.followee_id = p.id) as followers,
         p.dealer_verified_at is not null
    from public.profiles p
   where p.handle is not null and not p.collection_private
     and exists (select 1 from public.custom_items ci where ci.user_id = p.id and ci.visibility <> 'private')
   order by followers desc, shirts desc, p.created_at
   limit least(greatest(coalesce(p_limit, 8), 1), 20)
$$;
revoke execute on function public.top_collectors(int) from public;
grant execute on function public.top_collectors(int) to anon, authenticated;
