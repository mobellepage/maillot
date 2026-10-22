-- A collector's wishlist on their profile, for everyone to see: the library
-- kits they want (with the print they want on it) and the catalogue shirts
-- on their watchlist. Members who keep their collection private keep their
-- wishlist private too.
create or replace function public.public_wishlist(p_handle text)
returns table (kit_id uuid, club_id text, club_name text, season text, kind text, variant text, image_path text, print_name text, print_number text, shirt_id text, added_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with who as (
    select p.id from public.profiles p
     where lower(p.handle) = lower(p_handle) and not p.collection_private
  )
  select * from (
    select k.id, k.club_id, c.name, k.season, k.kind, k.variant, k.image_path, l.print_name, l.print_number, null::text, l.created_at
      from public.kit_likes l
      join who on who.id = l.user_id
      join public.kits k on k.id = l.kit_id
      join public.kit_clubs c on c.id = k.club_id
    union all
    select null, null, null, null, null, null, null, null, null, w.shirt_id, w.created_at
      from public.watchlist w
      join who on who.id = w.user_id
  ) x
  order by 11 desc
  limit 300
$$;
revoke all on function public.public_wishlist(text) from public;
grant execute on function public.public_wishlist(text) to anon, authenticated;
