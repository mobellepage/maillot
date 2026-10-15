-- Who owns a kit of the library: shown collection shirts (not private, the
-- owner's collection not private, the owner has a handle) matched to the
-- kit by club, season and kind - from the catalogue shirt they were added
-- as, or from what the owner typed (club / season / kit). On the library
-- page each kit then shows its owners, and a buyer goes on to the owner's
-- shirt to make an offer or ask about it.

-- Club, season and kind of a collection shirt, as the library writes them.
create or replace function private.kit_slot(p_club text, p_season text, p_name text)
returns table (club_id text, season text, kind text) language sql stable set search_path = '' as $$
  select c.id,
         case when s ~ '^[0-9]{4}/[0-9]{4}$' then left(s, 5) || right(s, 2) else s end,
         case when p_name ~* '(\mgk\M|goalkeeper|torwart|gardien)' then 'goalkeeper'
              when p_name ~* '(\mthird\M|ausweich|troisi)' then 'third'
              when p_name ~* '(\maway\M|auswärts|auswaerts|extérieur|exterieur)' then 'away'
              when p_name ~* '\mfourth\M' then 'fourth'
              else 'home' end
    from (select regexp_replace(trim(coalesce(p_season, '')), '\s*[–-]\s*', '/') as s) x
    join public.kit_clubs c
      on lower(c.name) = lower(trim(p_club)) or c.id = lower(trim(p_club))
      or exists (select 1 from unnest(c.aliases) a where lower(a) = lower(trim(p_club)))
   where trim(coalesce(p_club, '')) <> ''
   limit 1
$$;

create or replace function public.library_kit_owners(p_club text)
returns table (kit_id uuid, item_id text, handle text, avatar text, visibility text, size text, can_ask boolean)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.throttle('library', 300, 1500);
  return query
    with items as (
      select ci.id, ci.user_id, ci.visibility, ci.size, ci.inquiries_enabled, ci.catalog_id,
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
      join public.kits k on k.club_id = i.club_id and k.season = i.season and k.kind = i.kind and k.status = 'approved'
     where i.club_id = p_club
     order by i.id, k.variant
     limit 500;
end $$;
revoke execute on function public.library_kit_owners(text) from public;
grant execute on function public.library_kit_owners(text) to anon, authenticated;
