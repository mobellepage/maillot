-- Listing alerts: "tell me when this shirt is listed (in my size, up to my
-- price)". When a listing goes live that matches, the member gets a
-- notification (in the app, and by email once email is switched on).
-- Up to 50 alerts per member; one notification per alert every 10 minutes.
--
-- Also: listings sold the moment they are placed (matched against a waiting
-- bid) no longer notify followers or alerts — there is nothing left to buy.

create table public.listing_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  shirt_id text not null,
  size text,
  max_price numeric check (max_price is null or max_price > 0),
  created_at timestamptz not null default now(),
  last_notified_at timestamptz,
  unique nulls not distinct (user_id, shirt_id, size)
);
create index listing_alerts_shirt on public.listing_alerts (shirt_id);
alter table public.listing_alerts enable row level security;
create policy "listing alerts: own rows" on public.listing_alerts for select to authenticated using (user_id = (select auth.uid()));
create policy "listing alerts: own insert" on public.listing_alerts for insert to authenticated
  with check (user_id = (select auth.uid()) and (select count(*) from public.listing_alerts a where a.user_id = (select auth.uid())) < 50);
create policy "listing alerts: own delete" on public.listing_alerts for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, delete on public.listing_alerts to authenticated;
revoke update on public.listing_alerts from anon, authenticated;

create or replace function private.alerts_on_listing()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  -- Matching runs in an earlier trigger: skip listings that already sold.
  if new.shirt_id is null or (select status from public.asks where id = new.id) <> 'open' then return new; end if;
  select name into v_name from public.catalog_shirts where id = new.shirt_id;
  with hit as (
    update public.listing_alerts a set last_notified_at = now()
     where a.shirt_id = new.shirt_id
       and (a.size is null or a.size = new.size)
       and (a.max_price is null or new.amount <= a.max_price)
       and a.user_id <> new.user_id
       and (a.last_notified_at is null or a.last_notified_at < now() - interval '10 minutes')
    returning a.user_id
  )
  insert into public.notifications (user_id, type, title, body, data)
  select hit.user_id, 'listing_alert', 'A shirt you want is listed',
         coalesce(v_name, new.shirt_id) || ' (' || new.size || ') is now listed for CHF ' || new.amount || '.',
         jsonb_build_object('shirt_id', new.shirt_id, 'size', new.size, 'amount', new.amount, 'ask_id', new.id)
    from hit;
  return new;
exception when others then
  return new; -- an alert must never block a listing
end $$;
create trigger listing_alerts_on_ask after insert on public.asks for each row execute function private.alerts_on_listing();

-- Followers: same rule — no "new listing" for something that sold on the spot.
create or replace function private.followers_on_listing()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_handle text; v_name text;
begin
  select handle into v_handle from public.profiles where id = new.user_id;
  if v_handle is null or (select status from public.asks where id = new.id) <> 'open' then return new; end if;
  select name into v_name from public.catalog_shirts where id = new.shirt_id;
  perform private.notify_followers(new.user_id, 'followed_listing', 'New listing from a collector you follow',
    '@' || v_handle || ' listed ' || coalesce(v_name, new.shirt_id) || ' (' || new.size || ') for CHF ' || new.amount,
    jsonb_build_object('handle', v_handle, 'shirt_id', new.shirt_id, 'size', new.size, 'amount', new.amount));
  return new;
exception when others then
  return new;
end $$;
