-- Highlights: a member marks up to five shirts of their collection; they
-- come first, in the order they were marked — on their own page and on
-- their public profile. Set on its own (never by an upsert of the item).
alter table public.custom_items add column if not exists highlighted_at timestamptz;
grant update (highlighted_at) on public.custom_items to authenticated;

-- The app reads the same number from src/config/rules.ts (HIGHLIGHTS).
create or replace function private.highlight_limit()
returns int language sql immutable set search_path = '' as $$ select 5 $$;

create or replace function private.enforce_highlight_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.highlighted_at is null or (tg_op = 'UPDATE' and old.highlighted_at is not null) then return new; end if;
  perform pg_advisory_xact_lock(hashtext('highlights:' || new.user_id::text));
  if (select count(*) from public.custom_items where user_id = new.user_id and highlighted_at is not null and id <> new.id) >= private.highlight_limit() then
    raise exception 'highlight_limit' using errcode = 'P0455', hint = 'Five highlights at most; unmark one first.';
  end if;
  return new;
end $$;

drop trigger if exists custom_items_highlight_limit on public.custom_items;
create trigger custom_items_highlight_limit before insert or update of highlighted_at on public.custom_items
  for each row execute function private.enforce_highlight_limit();

-- The public collection: highlights first (and say so), then newest first.
drop function if exists public.public_collection(text);
create function public.public_collection(p_handle text)
returns table (id text, catalog_id text, club text, season text, variant text, version text, size text,
               player_name text, player_number text, grade numeric, visibility text, verified boolean,
               photo_path text, thumb_path text, added_at timestamptz,
               flock jsonb, patches jsonb, signature jsonb, verification_level text, inquiries_enabled boolean, kit_image text,
               highlighted boolean)
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
         ci.highlighted_at is not null
    from public.custom_items ci
    join public.profiles p on p.id = ci.user_id
   where lower(p.handle) = lower(p_handle) and ci.visibility <> 'private' and not p.collection_private
   order by ci.highlighted_at asc nulls last, ci.created_at desc
   limit 300
$$;
revoke execute on function public.public_collection(text) from public;
grant execute on function public.public_collection(text) to anon, authenticated;
