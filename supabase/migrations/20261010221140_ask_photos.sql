-- Real photos on listings: buyers see the actual shirt they would get, not
-- only the catalogue picture. A listing carries up to six photos
-- ({kind, path, thumbPath}) uploaded to the seller's own folder of the
-- vault-photos bucket; anyone may view a listing's photos (like the main
-- picture of a visible collection shirt), nothing else in that folder.

alter table public.asks add column if not exists photos jsonb not null default '[]'::jsonb;
alter table public.asks add constraint asks_photos_shape
  check (case when jsonb_typeof(photos) = 'array' then jsonb_array_length(photos) <= 6 else false end);
create index if not exists asks_user_with_photos on public.asks (user_id) where photos <> '[]'::jsonb;

-- Sellers list only photos from their own folder.
drop policy if exists asks_owner_insert on public.asks;
create policy asks_owner_insert on public.asks for insert to authenticated
  with check (
    (select auth.uid()) = user_id and status = 'open'
    and (custom_item_id is null or exists (select 1 from custom_items c where c.id = custom_item_id and c.user_id = (select auth.uid())))
    and not exists (
      select 1 from jsonb_array_elements(photos) e
       where jsonb_typeof(e) <> 'object'
          or not starts_with(coalesce(e ->> 'path', ''), (select auth.uid())::text || '/')
          or (e ? 'thumbPath' and not starts_with(coalesce(e ->> 'thumbPath', ''), (select auth.uid())::text || '/'))
    )
  );

-- Storage: listing photos are public alongside collection main pictures.
create or replace function public.is_visible_vault_photo(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  with owner as (
    select case when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(p_name, '/', 1)::uuid end as id
  )
  select exists (
    select 1 from public.custom_items ci, owner
     where ci.user_id = owner.id
       and ci.visibility <> 'private'
       and p_name in (private.main_photo(ci.photos) ->> 'path', private.main_photo(ci.photos) ->> 'thumbPath')
  ) or exists (
    select 1 from public.asks a, owner, jsonb_array_elements(a.photos) e
     where a.user_id = owner.id
       and p_name in (e ->> 'path', e ->> 'thumbPath')
  )
$$;

-- Seller pages show each listing's first photo.
drop function public.seller_listings(text);
create function public.seller_listings(p_handle text)
returns table (ask_id uuid, shirt_id text, size text, amount numeric, condition text, created_at timestamptz, thumb_path text)
language sql stable security definer set search_path = public as $$
  select a.id, a.shirt_id, a.size, a.amount, a.condition, a.created_at, coalesce(a.photos -> 0 ->> 'thumbPath', a.photos -> 0 ->> 'path')
    from asks a join profiles p on p.id = a.user_id
   where lower(p.handle) = lower(p_handle) and a.status = 'open' and a.shirt_id is not null
   order by a.created_at desc limit 60
$$;
revoke execute on function public.seller_listings(text) from public;
grant execute on function public.seller_listings(text) to anon, authenticated;
