-- A member's shirt has its own page (/u/:handle/:item), so a friend who taps
-- it sees that shirt, not the catalogue entry. Others see its pictures of
-- the shirt itself: the main photo (studio cut-out, else the front) and the
-- back. Label, tags and certificates stay with the owner — they are for
-- authentication, not for show.
create or replace function private.shirt_photos(p_photos jsonb)
returns table (kind text, path text, thumb_path text)
language sql immutable set search_path = '' as $$
  select x.kind, x.photo ->> 'path', x.photo ->> 'thumbPath'
    from (values (1, 'main', private.main_photo(p_photos)), (2, 'back', nullif(p_photos -> 'back', 'null'::jsonb))) as x(n, kind, photo)
   where jsonb_typeof(x.photo) = 'object' and x.photo ->> 'path' is not null
   order by x.n
$$;

create function public.public_shirt_photos(p_handle text, p_item_id text)
returns table (kind text, path text, thumb_path text)
language sql stable security definer set search_path = '' as $$
  select ph.kind, ph.path, ph.thumb_path
    from public.custom_items ci
    join public.profiles p on p.id = ci.user_id
    cross join lateral private.shirt_photos(ci.photos) ph
   where lower(p.handle) = lower(p_handle) and ci.id = p_item_id and private.shown(ci)
$$;
revoke execute on function public.public_shirt_photos(text, text) from public;
grant execute on function public.public_shirt_photos(text, text) to anon, authenticated;

create or replace function public.is_visible_vault_photo(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  with owner as (
    select case when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(p_name, '/', 1)::uuid end as id
  )
  select exists (
    select 1 from public.custom_items ci, owner, private.shirt_photos(ci.photos) ph
     where ci.user_id = owner.id
       and private.shown(ci)
       and p_name in (ph.path, ph.thumb_path)
  ) or exists (
    select 1 from public.asks a, owner, jsonb_array_elements(a.photos) e
     where a.user_id = owner.id
       and p_name in (e ->> 'path', e ->> 'thumbPath')
  )
$$;
