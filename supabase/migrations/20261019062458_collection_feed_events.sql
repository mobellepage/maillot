-- What happens to the shirts in collections, for the feed: a shirt added,
-- put up for sale, opened to offers, its price lowered, verified. Written by
-- a trigger on custom_items; read through feed_events(), which applies the
-- marketplace's privacy rule at read time (a shirt made private, or a
-- private collection, disappears from the feed with all its events).
create table if not exists public.collection_events (
  id bigint generated always as identity primary key,
  item_id text not null references public.custom_items (id) on delete cascade,
  kind text not null check (kind in ('added', 'forsale', 'offers', 'price_drop', 'verified')),
  old_price numeric,
  new_price numeric,
  created_at timestamptz not null default now()
);
create index if not exists collection_events_recent on public.collection_events (created_at desc);
create index if not exists collection_events_item on public.collection_events (item_id);
alter table public.collection_events enable row level security;
-- No direct access: only through feed_events().
revoke all on public.collection_events from anon, authenticated;

create or replace function private.price_of(p text)
returns numeric language sql immutable set search_path = '' as $$
  select nullif(regexp_replace(coalesce(p, ''), '[^0-9.]', '', 'g'), '')::numeric
$$;

create or replace function private.log_collection_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.collection_events (item_id, kind, new_price) values (new.id, 'added', private.price_of(new.sale_price));
    return new;
  end if;
  if new.visibility is distinct from old.visibility and new.visibility in ('forsale', 'offers') then
    insert into public.collection_events (item_id, kind, new_price) values (new.id, new.visibility, private.price_of(new.sale_price));
  elsif new.visibility = 'forsale' and old.visibility = 'forsale'
        and private.price_of(new.sale_price) < private.price_of(old.sale_price) then
    insert into public.collection_events (item_id, kind, old_price, new_price) values (new.id, 'price_drop', private.price_of(old.sale_price), private.price_of(new.sale_price));
  end if;
  if coalesce(new.verification ->> 'status', '') = 'verifiziert' and coalesce(old.verification ->> 'status', '') <> 'verifiziert' then
    insert into public.collection_events (item_id, kind) values (new.id, 'verified');
  end if;
  return new;
end $$;

drop trigger if exists collection_events_log on public.custom_items;
create trigger collection_events_log after insert or update of visibility, sale_price, verification on public.custom_items
  for each row execute function private.log_collection_event();

-- Shirts already in collections count as added when they were.
insert into public.collection_events (item_id, kind, new_price, created_at)
select ci.id, 'added', private.price_of(ci.sale_price), ci.created_at
  from public.custom_items ci
 where not exists (select 1 from public.collection_events e where e.item_id = ci.id and e.kind = 'added');

-- The feed: recent events of shirts that are shown on the marketplace, with
-- the shirt as it is now (market_exemplars), newest first.
create or replace function public.feed_events(p_limit int default 200)
returns table (
  event_id bigint, event_kind text, event_at timestamptz, old_price numeric, new_price numeric,
  id text, handle text, avatar text, dealer boolean,
  catalog_id text, kit_id uuid, kit_image text,
  club text, season text, kind text, variant text, league text,
  version text, size text, grade numeric, visibility text, sale_price numeric,
  verification_level text, verified boolean, inquiries_enabled boolean,
  photo_path text, thumb_path text, added_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select e.id, e.kind, e.created_at, e.old_price, e.new_price, m.*
    from public.collection_events e
    join public.market_exemplars(1000) m on m.id = e.item_id
   order by e.created_at desc
   limit least(greatest(coalesce(p_limit, 200), 1), 500);
$$;
grant execute on function public.feed_events(int) to anon, authenticated;
