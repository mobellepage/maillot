-- Discover page: a random handful of other collectors with a peek at their
-- collection (up to four shown shirts: photo thumbnail or library picture),
-- so people find collections to follow. Shown collections only; not the
-- viewer themself; whether the viewer already follows them.
create or replace function public.discover_collectors(p_limit int default 8)
returns table (handle text, avatar text, shirts int, followers int, dealer boolean, is_following boolean, preview jsonb)
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := (select auth.uid());
begin
  perform private.throttle('collectors', 240, 1200);
  return query
    select p.handle, p.avatar,
           (select count(*)::int from public.custom_items ci where ci.user_id = p.id and ci.visibility <> 'private'),
           (select count(*)::int from public.follows f where f.followee_id = p.id),
           p.dealer_verified_at is not null,
           v_me is not null and exists (select 1 from public.follows f where f.followee_id = p.id and f.follower_id = v_me),
           (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'catalog_id', x.catalog_id, 'thumb_path', x.thumb, 'kit_image', x.kit_image)), '[]'::jsonb)
              from (select ci.id, ci.catalog_id, ci.kit_image, private.main_photo(ci.photos) ->> 'thumbPath' as thumb
                      from public.custom_items ci
                     where ci.user_id = p.id and ci.visibility <> 'private'
                     order by ci.created_at desc limit 4) x)
      from public.profiles p
     where p.handle is not null and not p.collection_private and p.id is distinct from v_me
       and exists (select 1 from public.custom_items ci where ci.user_id = p.id and ci.visibility <> 'private')
     order by random()
     limit least(greatest(coalesce(p_limit, 8), 1), 12);
end $$;
revoke execute on function public.discover_collectors(int) from public;
grant execute on function public.discover_collectors(int) to anon, authenticated;
