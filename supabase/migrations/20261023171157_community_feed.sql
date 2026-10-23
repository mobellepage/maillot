-- Feed → All: the shirts of every collector with a public collection, shuffled
-- and dealt round by round — each collector once per round, in a new order
-- every round, so nobody fills the feed. The seed keeps one visit's order
-- stable while paging; a new visit deals anew. One's own shirts stay out.
create or replace function public.community_feed(p_seed text default null, p_offset int default 0, p_limit int default 20)
returns table (id text, handle text, avatar text, catalog_id text, kit_id uuid, kit_image text, club text, season text, variant text,
               version text, size text, player_name text, player_number text, photo_path text, thumb_path text, added_at timestamptz,
               likes int, liked boolean, comments int, last_comment jsonb)
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := (select auth.uid()); v_seed text := coalesce(nullif(p_seed, ''), 'maillot');
begin
  perform private.throttle('social', 300, 1500);
  return query
    with pool as (
      select ci.*, p.handle as p_handle, p.avatar as p_avatar,
             row_number() over (partition by ci.user_id order by md5(v_seed || ci.id)) as turn
        from public.custom_items ci
        join public.profiles p on p.id = ci.user_id and p.handle is not null and not p.collection_private
       where ci.visibility <> 'private' and (v_me is null or ci.user_id <> v_me)
    )
    select x.id, x.p_handle, x.p_avatar, x.catalog_id, x.kit_id, x.kit_image,
           nullif(x.proposed_club, ''), nullif(x.proposed_season, ''), nullif(x.proposed_variant, ''),
           x.version, x.size, nullif(x.flock ->> 'name', ''), nullif(x.flock ->> 'number', ''),
           private.main_photo(x.photos) ->> 'path', private.main_photo(x.photos) ->> 'thumbPath', x.created_at,
           (select count(*)::int from public.item_likes l where l.item_id = x.id),
           v_me is not null and exists (select 1 from public.item_likes l where l.item_id = x.id and l.user_id = v_me),
           (select count(*)::int from public.item_comments c where c.item_id = x.id),
           (select jsonb_build_object('handle', cp.handle, 'body', c.body)
              from public.item_comments c left join public.profiles cp on cp.id = c.user_id
             where c.item_id = x.id order by c.created_at desc limit 1)
      from pool x
     order by x.turn, md5(v_seed || x.turn::text || x.user_id::text), x.id
     offset greatest(coalesce(p_offset, 0), 0)
     limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;
revoke execute on function public.community_feed(text, int, int) from public;
grant execute on function public.community_feed(text, int, int) to anon, authenticated;
