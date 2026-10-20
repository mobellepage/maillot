-- collector_follows: its output column "handle" shadowed profiles.handle in
-- the lookup; qualify it.
create or replace function public.collector_follows(p_handle text)
returns table (direction text, handle text, avatar text, shirts int)
language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid := (select pr.id from public.profiles pr where lower(pr.handle) = lower(p_handle));
begin
  perform private.throttle('social', 300, 1500);
  if v_id is null then return; end if;
  return query
    select x.direction, p.handle, p.avatar,
           case when p.collection_private then 0
                else (select count(*)::int from public.custom_items ci where ci.user_id = p.id and ci.visibility <> 'private') end
      from (select 'following'::text as direction, f.followee_id as other, f.created_at as since from public.follows f where f.follower_id = v_id
            union all
            select 'follower', f.follower_id, f.created_at from public.follows f where f.followee_id = v_id) x
      join public.profiles p on p.id = x.other
     where p.handle is not null
     order by x.since desc
     limit 500;
end $$;
