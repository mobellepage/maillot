-- "Trotzdem anfragen": a shirt shown as a collector's piece (visibility
-- 'public' = in the collection, not for sale) can't get offers, but others
-- may ask without obligation — optionally naming a price. The owner hears
-- about it and can answer, ignore it, or open the shirt to offers. One open
-- inquiry per member and shirt; owners can switch inquiries off per shirt.
alter table public.custom_items add column if not exists inquiries_enabled boolean not null default true;

create table public.item_inquiries (
  id uuid primary key default gen_random_uuid(),
  item_id text not null references public.custom_items(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  from_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric check (amount is null or (amount >= 1 and amount <= 100000)),
  message text check (char_length(message) <= 500),
  status text not null default 'open' check (status in ('open', 'answered', 'dismissed')),
  reply text check (char_length(reply) <= 500),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create unique index item_inquiries_one_open on public.item_inquiries (item_id, from_id) where status = 'open';
create index item_inquiries_owner on public.item_inquiries (owner_id, created_at desc);
create index item_inquiries_from on public.item_inquiries (from_id, created_at desc);
alter table public.item_inquiries enable row level security;
create policy "item inquiries: parties" on public.item_inquiries for select to authenticated
  using ((select auth.uid()) in (owner_id, from_id));
revoke insert, update, delete on public.item_inquiries from anon, authenticated;

create or replace function public.make_inquiry(p_item_id text, p_amount numeric default null, p_message text default null)
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
  if v_item.id is null or not private.shown(v_item) or v_item.visibility <> 'public' then
    raise exception 'inquiries are for shirts shown as not for sale' using errcode = 'P0002';
  end if;
  if not v_item.inquiries_enabled then raise exception 'the owner does not take inquiries for this shirt' using errcode = 'P0002'; end if;
  if v_item.user_id = v_me then raise exception 'this is your own shirt' using errcode = '22023'; end if;
  if p_amount is not null and (p_amount < 1 or p_amount > 100000) then raise exception 'amount must be between 1 and 100000' using errcode = '22023'; end if;
  if exists (select 1 from public.item_inquiries where item_id = p_item_id and from_id = v_me and status = 'open') then
    raise exception 'you already asked about this shirt' using errcode = '23505';
  end if;
  perform private.hit('inquiry:' || v_me, 20, interval '1 day');

  insert into public.item_inquiries (item_id, owner_id, from_id, amount, message)
  values (p_item_id, v_item.user_id, v_me, round(p_amount), nullif(trim(left(p_message, 500)), ''))
  returning id into v_id;

  select handle into v_handle from public.profiles where id = v_me;
  select name into v_name from public.catalog_shirts where id = v_item.catalog_id;
  insert into public.notifications (user_id, type, title, body, data)
  values (v_item.user_id, 'inquiry', 'Someone is interested in your shirt',
          coalesce('@' || v_handle, 'A collector') || ' is interested in your ' || coalesce(v_name, nullif(trim(coalesce(v_item.proposed_club, '') || ' ' || coalesce(v_item.proposed_season, '')), ''), 'shirt')
            || case when p_amount is not null then ' and would pay about CHF ' || round(p_amount) else '' end || '.',
          jsonb_build_object('inquiry_id', v_id, 'item_id', p_item_id, 'catalog_id', v_item.catalog_id, 'amount', round(p_amount), 'handle', v_handle));
  return v_id;
end $$;

create or replace function public.answer_inquiry(p_id uuid, p_reply text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  q public.item_inquiries;
  v_handle text;
begin
  select * into q from public.item_inquiries where id = p_id;
  if q.id is null or q.owner_id is distinct from v_me then raise exception 'not your inquiry' using errcode = '42501'; end if;
  if q.status <> 'open' then raise exception 'already handled' using errcode = '22023'; end if;
  if coalesce(trim(p_reply), '') = '' then raise exception 'write a reply' using errcode = '22023'; end if;
  update public.item_inquiries set status = 'answered', reply = trim(left(p_reply, 500)), answered_at = now() where id = p_id;
  select handle into v_handle from public.profiles where id = v_me;
  insert into public.notifications (user_id, type, title, body, data)
  values (q.from_id, 'inquiry_reply', 'The owner replied to your inquiry',
          coalesce('@' || v_handle, 'The owner') || ': ' || trim(left(p_reply, 500)),
          jsonb_build_object('inquiry_id', p_id, 'item_id', q.item_id, 'handle', v_handle));
end $$;

create or replace function public.dismiss_inquiry(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.item_inquiries set status = 'dismissed', answered_at = now()
   where id = p_id and owner_id = (select auth.uid()) and status = 'open';
  if not found then raise exception 'not your open inquiry' using errcode = '42501'; end if;
end $$;

-- Both sides: what I asked and what I was asked, newest first.
create or replace function public.my_inquiries()
returns table (id uuid, direction text, item_id text, catalog_id text, item_name text, amount numeric, message text,
               status text, reply text, created_at timestamptz, other_handle text, other_avatar text)
language sql stable security definer set search_path = '' as $$
  select q.id, case when q.owner_id = (select auth.uid()) then 'received' else 'sent' end, q.item_id, ci.catalog_id,
         coalesce(cs.name, nullif(trim(coalesce(ci.proposed_club, '') || ' ' || coalesce(ci.proposed_season, '')), '')),
         q.amount, q.message, q.status, q.reply, q.created_at,
         p.handle, p.avatar
    from public.item_inquiries q
    join public.custom_items ci on ci.id = q.item_id
    left join public.catalog_shirts cs on cs.id = ci.catalog_id
    join public.profiles p on p.id = case when q.owner_id = (select auth.uid()) then q.from_id else q.owner_id end
   where (select auth.uid()) in (q.owner_id, q.from_id)
   order by q.created_at desc
   limit 100
$$;

revoke execute on function public.make_inquiry(text, numeric, text), public.answer_inquiry(uuid, text), public.dismiss_inquiry(uuid), public.my_inquiries() from public, anon;
grant execute on function public.make_inquiry(text, numeric, text), public.answer_inquiry(uuid, text), public.dismiss_inquiry(uuid), public.my_inquiries() to authenticated;

-- Profiles show whether a not-for-sale shirt takes inquiries.
drop function public.public_collection(text);
create function public.public_collection(p_handle text)
returns table (id text, catalog_id text, club text, season text, variant text, version text, size text,
               player_name text, player_number text, grade numeric, visibility text, verified boolean,
               photo_path text, thumb_path text, added_at timestamptz,
               flock jsonb, patches jsonb, signature jsonb, verification_level text, inquiries_enabled boolean)
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
         ci.inquiries_enabled
    from public.custom_items ci
    join public.profiles p on p.id = ci.user_id
   where lower(p.handle) = lower(p_handle) and ci.visibility <> 'private' and not p.collection_private
   order by ci.created_at desc
   limit 300
$$;
revoke execute on function public.public_collection(text) from public;
grant execute on function public.public_collection(text) to anon, authenticated;
