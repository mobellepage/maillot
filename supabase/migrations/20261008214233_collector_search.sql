-- Find other collectors and look at their collections.
-- A member is findable only once they show something: a shirt whose
-- visibility isn't 'private' (public / open to offers / for sale) or a live
-- listing. Private shirts never leave the owner's account, and of the public
-- ones only the main picture is readable (studio cut-out, else the front) —
-- never the label or detail photos.

create index if not exists custom_items_public_by_user on public.custom_items (user_id, created_at desc) where visibility <> 'private';
create index if not exists profiles_handle_lower on public.profiles (lower(handle) text_pattern_ops) where handle is not null;

-- The main picture of an item, as {path, thumbPath} (the same choice the app makes).
create or replace function private.main_photo(p_photos jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(nullif(p_photos -> 'front_studio', 'null'::jsonb), nullif(p_photos -> 'front', 'null'::jsonb))
$$;

-- Up to 20 collectors whose handle contains the query (2+ characters, a leading
-- @ is ignored). Exact match first, then prefix matches, then the biggest
-- public collections.
create or replace function public.search_collectors(p_q text)
returns table (handle text, member_since timestamptz, shirts int, listings int, preview text[])
language sql stable security definer set search_path = '' as $$
  with q as (select lower(trim(leading '@' from trim(coalesce(p_q, '')))) as s),
  found as (
    select p.id, p.handle, p.created_at,
           (select count(*)::int from public.custom_items ci where ci.user_id = p.id and ci.visibility <> 'private') as shirts,
           (select count(*)::int from public.asks a where a.user_id = p.id and a.status = 'open') as listings
      from public.profiles p, q
     where length(q.s) >= 2 and p.handle is not null and strpos(lower(p.handle), q.s) > 0
  )
  select f.handle, f.created_at, f.shirts, f.listings,
         array(select ci.catalog_id from public.custom_items ci
                where ci.user_id = f.id and ci.visibility <> 'private' and ci.catalog_id is not null
                order by ci.created_at desc limit 4)
    from found f, q
   where f.shirts > 0 or f.listings > 0
   order by lower(f.handle) = q.s desc, starts_with(lower(f.handle), q.s) desc, f.shirts desc, lower(f.handle)
   limit 20
$$;

-- A collector's visible shirts, newest first. Only what the profile needs:
-- no valuations, purchase prices, provenance or label photos.
create or replace function public.public_collection(p_handle text)
returns table (id text, catalog_id text, club text, season text, variant text, version text, size text,
               player_name text, player_number text, grade numeric, visibility text, verified boolean,
               photo_path text, thumb_path text, added_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select ci.id, ci.catalog_id, nullif(ci.proposed_club, ''), nullif(ci.proposed_season, ''), nullif(ci.proposed_variant, ''),
         ci.version, ci.size,
         nullif(ci.flock ->> 'name', ''), nullif(ci.flock ->> 'number', ''),
         case when jsonb_typeof(ci.condition -> 'grade') = 'number' then (ci.condition ->> 'grade')::numeric end,
         ci.visibility,
         coalesce(ci.verification ->> 'status' = 'verifiziert', false),
         private.main_photo(ci.photos) ->> 'path', private.main_photo(ci.photos) ->> 'thumbPath',
         ci.created_at
    from public.custom_items ci
    join public.profiles p on p.id = ci.user_id
   where lower(p.handle) = lower(p_handle) and ci.visibility <> 'private'
   order by ci.created_at desc
   limit 300
$$;

revoke execute on function public.search_collectors(text), public.public_collection(text) from public;
grant execute on function public.search_collectors(text), public.public_collection(text) to anon, authenticated;

-- Visitors may sign URLs for the main picture of a visible shirt — nothing
-- else in the bucket. Storage policies run as the visitor, who can't read
-- other members' items, hence the definer check.
create or replace function public.is_visible_vault_photo(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.custom_items ci
     where ci.user_id = case when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(p_name, '/', 1)::uuid end
       and ci.visibility <> 'private'
       and p_name in (private.main_photo(ci.photos) ->> 'path', private.main_photo(ci.photos) ->> 'thumbPath')
  )
$$;
revoke execute on function public.is_visible_vault_photo(text) from public;
grant execute on function public.is_visible_vault_photo(text) to anon, authenticated;

create policy "vault photos: main picture of visible shirts" on storage.objects for select to anon, authenticated
  using (bucket_id = 'vault-photos' and public.is_visible_vault_photo(name));
