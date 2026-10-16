-- A collection shirt can name its kit of the library (kit_id): for members
-- who just list what they own, without photos yet. kit_image is that kit's
-- picture, always set here from the library (never by the client), so the
-- shirt shows it until the owner adds their own photos. Owners in the
-- library and the favourite team's checklist use kit_id when it's there.

alter table public.custom_items
  add column if not exists kit_id uuid references public.kits (id) on delete set null,
  add column if not exists kit_image text check (kit_image ~ '^/library/[a-z0-9/_.-]+\.(webp|png|jpg)$');

create or replace function private.custom_item_kit_image()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.kit_image := case when new.kit_id is null then null
                        else (select k.image_path from public.kits k where k.id = new.kit_id and k.status = 'approved') end;
  if new.kit_id is not null and not exists (select 1 from public.kits k where k.id = new.kit_id and k.status = 'approved') then
    new.kit_id := null;
  end if;
  return new;
end $$;
drop trigger if exists custom_items_kit_image on public.custom_items;
create trigger custom_items_kit_image before insert or update of kit_id, kit_image on public.custom_items
  for each row execute function private.custom_item_kit_image();

-- Public collections show the library picture of shirts without photos.
drop function if exists public.public_collection(text);
create function public.public_collection(p_handle text)
returns table (id text, catalog_id text, club text, season text, variant text, version text, size text,
               player_name text, player_number text, grade numeric, visibility text, verified boolean,
               photo_path text, thumb_path text, added_at timestamptz,
               flock jsonb, patches jsonb, signature jsonb, verification_level text, inquiries_enabled boolean, kit_image text)
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
         ci.kit_image
    from public.custom_items ci
    join public.profiles p on p.id = ci.user_id
   where lower(p.handle) = lower(p_handle) and ci.visibility <> 'private' and not p.collection_private
   order by ci.created_at desc
   limit 300
$$;
revoke execute on function public.public_collection(text) from public;
grant execute on function public.public_collection(text) to anon, authenticated;

-- Owners of a kit and the member's own kits: the named kit first, else the
-- match by club, season and kind.
create or replace function public.library_kit_owners(p_club text)
returns table (kit_id uuid, item_id text, handle text, avatar text, visibility text, size text, can_ask boolean)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.throttle('library', 300, 1500);
  return query
    with items as (
      select ci.id, ci.user_id, ci.visibility, ci.size, ci.inquiries_enabled, ci.catalog_id, ci.kit_id as named,
             (private.kit_slot(coalesce(cs.club, ci.proposed_club), coalesce(cs.season, ci.proposed_season),
                               coalesce(cs.name, ci.proposed_variant))).*
        from public.custom_items ci
        left join public.catalog_shirts cs on cs.id = ci.catalog_id
       where ci.visibility <> 'private'
    )
    select distinct on (i.id) k.id, i.id, p.handle, p.avatar, i.visibility, i.size,
           (i.visibility in ('offers', 'forsale') and i.catalog_id is not null and i.size is not null)
           or (i.visibility = 'public' and i.inquiries_enabled)
      from items i
      join public.profiles p on p.id = i.user_id and p.handle is not null and not p.collection_private
      join public.kits k on k.status = 'approved'
        and (k.id = i.named or (i.named is null and k.club_id = i.club_id and k.season = i.season and k.kind = i.kind))
     where k.club_id = p_club
     order by i.id, (k.id = i.named) desc, k.variant
     limit 500;
end $$;

create or replace function public.my_club_kits(p_club text)
returns table (kit_id uuid, item_id text) language plpgsql security definer set search_path = '' as $$
declare v_me uuid := (select auth.uid());
begin
  if v_me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  return query
    with items as (
      select ci.id, ci.kit_id as named, (private.kit_slot(coalesce(cs.club, ci.proposed_club), coalesce(cs.season, ci.proposed_season),
                                      coalesce(cs.name, ci.proposed_variant))).*
        from public.custom_items ci
        left join public.catalog_shirts cs on cs.id = ci.catalog_id
       where ci.user_id = v_me
    )
    select distinct on (i.id) k.id, i.id
      from items i
      join public.kits k on k.status = 'approved'
        and (k.id = i.named or (i.named is null and k.club_id = i.club_id and k.season = i.season and k.kind = i.kind))
     where k.club_id = p_club
     order by i.id, (k.id = i.named) desc, k.variant;
end $$;
