-- Expert authentication is required to sell a shirt from CHF 500 (its price,
-- or its estimated value when open to offers) or when it is match-issued or
-- match-worn — unless an expert has already verified it. The service isn't
-- running yet (available = false): such shirts are shown as a reservation
-- ("authentication starts soon") and nobody can make an offer on them.
-- The app reads the same numbers from config/rules.ts EXPERT_AUTH — change
-- both together.
create or replace function private.expert_auth_policy()
returns table (threshold_chf numeric, available boolean)
language sql immutable set search_path = '' as $$ select 500::numeric, false $$;

create or replace function private.needs_expert_auth(p public.custom_items)
returns boolean language sql stable set search_path = '' as $$
  select not (coalesce(p.verification ->> 'level', '') = 'expert' and coalesce(p.verification ->> 'status', '') = 'verifiziert')
     and (lower(coalesce(p.version, '')) in ('match-issued', 'match-worn', 'match_worn')
          or coalesce(case when p.visibility = 'forsale' then private.price_of(p.sale_price) end,
                      case when coalesce(p.valuation ->> 'mid', '') ~ '^[0-9]+(\.[0-9]+)?$' then (p.valuation ->> 'mid')::numeric end,
                      0) >= (select threshold_chf from private.expert_auth_policy()))
$$;

create or replace function private.offers_wait_for_expert_auth()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_item public.custom_items;
begin
  if new.status <> 'open' then return new; end if;
  select * into v_item from public.custom_items where id = new.item_id;
  if v_item.id is not null and private.needs_expert_auth(v_item) and not (select available from private.expert_auth_policy()) then
    raise exception 'expert_auth_pending' using errcode = 'P0451', hint = 'This shirt needs expert authentication, which starts soon.';
  end if;
  return new;
end $$;
drop trigger if exists collection_offers_expert_auth on public.collection_offers;
create trigger collection_offers_expert_auth before insert or update of amount, status on public.collection_offers
  for each row execute function private.offers_wait_for_expert_auth();

-- The marketplace and the feed say which shirts are waiting for it.
drop function if exists public.feed_events(int);
drop function if exists public.market_exemplars(int);
create function public.market_exemplars(p_limit int default 500)
returns table (
  id text, handle text, avatar text, dealer boolean,
  catalog_id text, kit_id uuid, kit_image text,
  club text, season text, kind text, variant text, league text,
  version text, size text, grade numeric, visibility text, sale_price numeric,
  verification_level text, verified boolean, inquiries_enabled boolean,
  photo_path text, thumb_path text, added_at timestamptz, needs_auth boolean
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
         case when ci.visibility = 'forsale' then private.price_of(ci.sale_price) end,
         coalesce(ci.verification ->> 'level', 'self'),
         coalesce(ci.verification ->> 'status' = 'verifiziert', false),
         ci.inquiries_enabled,
         private.main_photo(ci.photos) ->> 'path', private.main_photo(ci.photos) ->> 'thumbPath',
         ci.created_at,
         private.needs_expert_auth(ci)
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

create function public.feed_events(p_limit int default 200)
returns table (
  event_id bigint, event_kind text, event_at timestamptz, old_price numeric, new_price numeric,
  id text, handle text, avatar text, dealer boolean,
  catalog_id text, kit_id uuid, kit_image text,
  club text, season text, kind text, variant text, league text,
  version text, size text, grade numeric, visibility text, sale_price numeric,
  verification_level text, verified boolean, inquiries_enabled boolean,
  photo_path text, thumb_path text, added_at timestamptz, needs_auth boolean
)
language sql stable security definer set search_path = '' as $$
  select e.id, e.kind, e.created_at, e.old_price, e.new_price, m.*
    from public.collection_events e
    join public.market_exemplars(1000) m on m.id = e.item_id
   order by e.created_at desc
   limit least(greatest(coalesce(p_limit, 200), 1), 500);
$$;
grant execute on function public.feed_events(int) to anon, authenticated;
