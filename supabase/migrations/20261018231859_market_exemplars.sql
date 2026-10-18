-- The marketplace lists exemplars — the shirts in members' collections —
-- not catalogue models: every shirt that isn't private, from collections
-- that aren't private (the same rule as public profiles, private.shown).
-- Its status decides what a visitor can do: for sale (price), open to
-- offers, or a collector's piece (ask anyway). Never anything about where a
-- shirt is kept; only the main picture (readable through
-- is_visible_vault_photo for exactly these shirts).
create or replace function public.market_exemplars(p_limit int default 500)
returns table (
  id text, handle text, avatar text, dealer boolean,
  catalog_id text, kit_id uuid, kit_image text,
  club text, season text, kind text, variant text, league text,
  version text, size text, grade numeric, visibility text, sale_price numeric,
  verification_level text, verified boolean, inquiries_enabled boolean,
  photo_path text, thumb_path text, added_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select ci.id, p.handle, p.avatar, p.dealer_verified_at is not null,
         ci.catalog_id, ci.kit_id, ci.kit_image,
         coalesce(kc.name, cs.club, nullif(ci.proposed_club, '')),
         coalesce(k.season, cs.season, nullif(ci.proposed_season, '')),
         coalesce(k.kind, lower(cs.kit)),
         coalesce(nullif(k.variant, ''), nullif(ci.proposed_variant, '')),
         coalesce(cs.league, kc.league),
         ci.version, ci.size,
         case when jsonb_typeof(ci.condition -> 'grade') = 'number' then (ci.condition ->> 'grade')::numeric end,
         ci.visibility,
         case when ci.visibility = 'forsale' then nullif(regexp_replace(coalesce(ci.sale_price, ''), '[^0-9.]', '', 'g'), '')::numeric end,
         coalesce(ci.verification ->> 'level', 'self'),
         coalesce(ci.verification ->> 'status' = 'verifiziert', false),
         ci.inquiries_enabled,
         private.main_photo(ci.photos) ->> 'path', private.main_photo(ci.photos) ->> 'thumbPath',
         ci.created_at
    from public.custom_items ci
    join public.profiles p on p.id = ci.user_id
    left join public.catalog_shirts cs on cs.id = ci.catalog_id
    left join public.kits k on k.id = ci.kit_id
    left join public.kit_clubs kc on kc.id = k.club_id
   where ci.visibility <> 'private' and not p.collection_private and p.handle is not null
   order by ci.created_at desc
   limit least(greatest(coalesce(p_limit, 500), 1), 1000);
$$;
grant execute on function public.market_exemplars(int) to anon, authenticated;
