-- Collections are public by default: a shirt a member adds shows on their
-- profile unless they choose "private" for it — or make their whole
-- collection private in their profile (profiles.collection_private). A
-- private collection hides every shirt from others: profile, search,
-- photos, offers and "wanted shirt" notifications. Listings stay public:
-- listing a shirt for sale is showing it.

alter table public.profiles add column if not exists collection_private boolean not null default false;
grant update (collection_private) on public.profiles to authenticated;
alter table public.custom_items alter column visibility set default 'public';

-- Shirts others may see: not private, and the owner's collection isn't private.
create or replace function private.shown(p_item public.custom_items)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_item.visibility <> 'private'
     and not coalesce((select collection_private from public.profiles where id = p_item.user_id), false)
$$;

create or replace function public.public_collection(p_handle text)
returns table (id text, catalog_id text, club text, season text, variant text, version text, size text,
               player_name text, player_number text, grade numeric, visibility text, verified boolean,
               photo_path text, thumb_path text, added_at timestamptz,
               flock jsonb, patches jsonb, signature jsonb, verification_level text)
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
         case when p.show_collection_value then ci.verification ->> 'level' end
    from public.custom_items ci
    join public.profiles p on p.id = ci.user_id
   where lower(p.handle) = lower(p_handle) and ci.visibility <> 'private' and not p.collection_private
   order by ci.created_at desc
   limit 300
$$;

create or replace function public.search_collectors(p_q text)
returns table (handle text, member_since timestamptz, shirts int, listings int, preview text[], dealer boolean)
language sql stable security definer set search_path = '' as $$
  with q as (select lower(trim(leading '@' from trim(coalesce(p_q, '')))) as s),
  found as (
    select p.id, p.handle, p.created_at, p.dealer_verified_at is not null as dealer, p.collection_private as hidden,
           case when p.collection_private then 0
                else (select count(*)::int from public.custom_items ci where ci.user_id = p.id and ci.visibility <> 'private') end as shirts,
           (select count(*)::int from public.asks a where a.user_id = p.id and a.status = 'open') as listings
      from public.profiles p, q
     where length(q.s) >= 2 and p.handle is not null and strpos(lower(p.handle), q.s) > 0
  )
  select f.handle, f.created_at, f.shirts, f.listings,
         case when f.hidden then array[]::text[]
              else array(select ci.catalog_id from public.custom_items ci
                          where ci.user_id = f.id and ci.visibility <> 'private' and ci.catalog_id is not null
                          order by ci.created_at desc limit 4) end,
         f.dealer
    from found f, q
   where f.shirts > 0 or f.listings > 0
   order by lower(f.handle) = q.s desc, f.dealer desc, starts_with(lower(f.handle), q.s) desc, f.shirts desc, lower(f.handle)
   limit 20
$$;

create or replace function public.is_visible_vault_photo(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  with owner as (
    select case when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(p_name, '/', 1)::uuid end as id
  )
  select exists (
    select 1 from public.custom_items ci, owner
     where ci.user_id = owner.id
       and private.shown(ci)
       and p_name in (private.main_photo(ci.photos) ->> 'path', private.main_photo(ci.photos) ->> 'thumbPath')
  ) or exists (
    select 1 from public.asks a, owner, jsonb_array_elements(a.photos) e
     where a.user_id = owner.id
       and p_name in (e ->> 'path', e ->> 'thumbPath')
  )
$$;

drop function public.collector_profile(text);
create function public.collector_profile(p_handle text)
returns table (followers int, following int, show_value boolean, is_following boolean, is_me boolean, dealer boolean, collection_private boolean)
language sql stable security definer set search_path = '' as $$
  select (select count(*)::int from public.follows f where f.followee_id = p.id),
         (select count(*)::int from public.follows f where f.follower_id = p.id),
         p.show_collection_value,
         exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = p.id),
         p.id = (select auth.uid()),
         p.dealer_verified_at is not null,
         p.collection_private
    from public.profiles p
   where lower(p.handle) = lower(p_handle)
$$;
revoke execute on function public.collector_profile(text) from public;
grant execute on function public.collector_profile(text) to anon, authenticated;

-- Followers count only shirts they can actually see.
create or replace function public.my_following()
returns table (handle text, followed_at timestamptz, shirts int)
language sql stable security definer set search_path = '' as $$
  select p.handle, f.created_at,
         case when p.collection_private then 0
              else (select count(*)::int from public.custom_items ci where ci.user_id = p.id and ci.visibility <> 'private') end
    from public.follows f
    join public.profiles p on p.id = f.followee_id
   where f.follower_id = (select auth.uid()) and p.handle is not null
   order by f.created_at desc
$$;

-- Offers and "wanted" notifications only for shirts others can see.
create or replace function public.make_collection_offer(p_item_id text, p_amount numeric, p_message text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_item public.custom_items;
  v_id uuid;
  v_handle text;
  v_name text;
begin
  if v_me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into v_item from public.custom_items where id = p_item_id;
  if v_item.id is null or v_item.visibility not in ('offers', 'forsale') or not private.shown(v_item) then
    raise exception 'this shirt is not open to offers' using errcode = 'P0002';
  end if;
  if v_item.user_id = v_me then raise exception 'you cannot make an offer on your own shirt' using errcode = '22023'; end if;
  if v_item.catalog_id is null or v_item.size is null then
    raise exception 'offers need a catalogued shirt with a size' using errcode = '22023';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 100000 then raise exception 'amount must be between 1 and 100000' using errcode = '22023'; end if;
  perform private.hit('offer:' || v_me, 30, interval '1 hour');

  update public.collection_offers set amount = round(p_amount), message = nullif(trim(p_message), ''), created_at = now(), expires_at = now() + interval '14 days'
   where item_id = p_item_id and buyer_id = v_me and status = 'open'
  returning id into v_id;
  if v_id is null then
    insert into public.collection_offers (item_id, owner_id, buyer_id, amount, message)
    values (p_item_id, v_item.user_id, v_me, round(p_amount), nullif(trim(p_message), ''))
    returning id into v_id;
  end if;

  select handle into v_handle from public.profiles where id = v_me;
  select name into v_name from public.catalog_shirts where id = v_item.catalog_id;
  insert into public.notifications (user_id, type, title, body, data)
  values (v_item.user_id, 'collection_offer', 'New offer for your shirt',
          coalesce('@' || v_handle, 'A collector') || ' offers CHF ' || round(p_amount) || ' for ' || coalesce(v_name, v_item.catalog_id) || ' (' || v_item.size || ').',
          jsonb_build_object('offer_id', v_id, 'item_id', p_item_id, 'catalog_id', v_item.catalog_id, 'size', v_item.size, 'amount', round(p_amount), 'handle', v_handle));
  return v_id;
end $$;

create or replace function private.wanted_in_collection()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_handle text; v_name text;
begin
  if new.catalog_id is null or new.visibility not in ('offers', 'forsale') or not private.shown(new) then return new; end if;
  if tg_op = 'UPDATE' and old.visibility in ('offers', 'forsale') and old.catalog_id is not distinct from new.catalog_id then return new; end if;
  select handle into v_handle from public.profiles where id = new.user_id;
  if v_handle is null then return new; end if;
  select name into v_name from public.catalog_shirts where id = new.catalog_id;
  insert into public.notifications (user_id, type, title, body, data)
  select w.user_id, 'wanted_in_collection', 'A shirt you want is in a collection',
         '@' || v_handle || ' has ' || coalesce(v_name, new.catalog_id) || coalesce(' (' || new.size || ')', '') || ' and is open to offers.',
         jsonb_build_object('handle', v_handle, 'item_id', new.id, 'catalog_id', new.catalog_id, 'size', new.size)
    from (
      select user_id from public.watchlist where shirt_id = new.catalog_id
      union
      select user_id from public.listing_alerts where shirt_id = new.catalog_id and (size is null or size = new.size)
    ) w
   where w.user_id <> new.user_id
     and not exists (select 1 from public.notifications n where n.user_id = w.user_id and n.type = 'wanted_in_collection' and n.data ->> 'item_id' = new.id);
  return new;
exception when others then
  return new;
end $$;

-- Followers hear about a newly shown shirt only if they can see it.
create or replace function private.followers_on_shirt()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_handle text;
begin
  if not private.shown(new) or (tg_op = 'UPDATE' and old.visibility <> 'private') then return new; end if;
  select handle into v_handle from public.profiles where id = new.user_id;
  if v_handle is null then return new; end if;
  perform private.notify_followers(new.user_id, 'followed_shirt', 'New shirt in a collection you follow',
    '@' || v_handle || ' added a shirt to their collection',
    jsonb_build_object('handle', v_handle, 'catalog_id', new.catalog_id));
  return new;
exception when others then
  return new;
end $$;
