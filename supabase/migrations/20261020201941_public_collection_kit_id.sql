-- A collector's profile also names each shirt's library kit, so a visitor
-- can put that kit on their wishlist (kit_likes) — apart from liking the
-- collector's own shirt (item_likes).
drop function if exists public.public_collection(text);
create function public.public_collection(p_handle text)
returns table (id text, catalog_id text, club text, season text, variant text, version text, size text,
               player_name text, player_number text, grade numeric, visibility text, verified boolean,
               photo_path text, thumb_path text, added_at timestamptz,
               flock jsonb, patches jsonb, signature jsonb, verification_level text, inquiries_enabled boolean, kit_image text,
               highlighted boolean, likes int, liked boolean, kit_id uuid)
language sql stable security definer set search_path = '' as $$
  select ci.id, ci.catalog_id, nullif(ci.proposed_club, ''), nullif(ci.proposed_season, ''), nullif(ci.proposed_variant, ''),
         ci.version, ci.size,
         nullif(ci.flock ->> 'name', ''), nullif(ci.flock ->> 'number', ''),
         case when jsonb_typeof(ci.condition -> 'grade') = 'number' then (ci.condition ->> 'grade')::numeric end,
         ci.visibility,
         coalesce(ci.verification ->> 'status' = 'verifiziert', false),
         private.main_photo(ci.photos) ->> 'path', private.main_photo(ci.photos) ->> 'thumbPath',
         ci.created_at,
         case when p.show_collection_value then ci.flock end,
         case when p.show_collection_value then ci.patches end,
         case when p.show_collection_value then ci.signature end,
         case when p.show_collection_value then ci.verification ->> 'level' end,
         ci.inquiries_enabled,
         ci.kit_image,
         ci.highlighted_at is not null,
         (select count(*)::int from public.item_likes l where l.item_id = ci.id),
         exists (select 1 from public.item_likes l where l.item_id = ci.id and l.user_id = (select auth.uid())),
         ci.kit_id
    from public.custom_items ci
    join public.profiles p on p.id = ci.user_id
   where lower(p.handle) = lower(p_handle) and ci.visibility <> 'private' and not p.collection_private
   order by ci.highlighted_at asc nulls last, ci.created_at desc
   limit 300
$$;
revoke execute on function public.public_collection(text) from public;
grant execute on function public.public_collection(text) to anon, authenticated;
