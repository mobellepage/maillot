-- Following collectors, and an opt-in collection value on the profile.
--
-- Follows: anyone signed in can follow a member by handle. Who follows whom
-- is private (members only see their own follows); profiles show counts.
-- Followers hear, in the app only (never by email), when a collector they
-- follow lists a shirt or shows a new one — at most once per collector
-- every 6 hours while unread, so a big upload isn't a flood.
--
-- Collection value: off by default. When a member turns it on, their
-- profile shows the total estimate of the shirts they show (never of
-- private ones), computed by the app's valuation model like the vault.

alter table public.profiles add column if not exists show_collection_value boolean not null default false;
grant update (show_collection_value) on public.profiles to authenticated;

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_not_self check (follower_id <> followee_id)
);
create index follows_followee on public.follows (followee_id, created_at desc);
alter table public.follows enable row level security;
create policy "follows: own rows" on public.follows for select to authenticated using (follower_id = (select auth.uid()));
revoke insert, update, delete on public.follows from anon, authenticated;

-- Social notifications stay in the app.
create or replace trigger on_notification_insert
  after insert on public.notifications
  for each row when (new.type not in ('new_follower', 'followed_listing', 'followed_shirt'))
  execute function public.relay_notification();

create or replace function public.follow_collector(p_handle text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_them uuid;
  v_my_handle text;
begin
  if v_me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select id into v_them from public.profiles where lower(handle) = lower(p_handle);
  if v_them is null then raise exception 'no such collector' using errcode = 'P0002'; end if;
  if v_them = v_me then raise exception 'you cannot follow yourself' using errcode = '22023'; end if;
  perform private.hit('follow:' || v_me, 100, interval '1 hour');

  insert into public.follows (follower_id, followee_id) values (v_me, v_them) on conflict do nothing;
  if not found then return; end if;

  -- Unfollow + follow again doesn't ping twice a day.
  select handle into v_my_handle from public.profiles where id = v_me;
  if not exists (
    select 1 from public.notifications n
     where n.user_id = v_them and n.type = 'new_follower' and n.created_at > now() - interval '1 day'
       and n.data ->> 'follower' is not distinct from v_my_handle
  ) then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_them, 'new_follower', 'New follower',
            coalesce('@' || v_my_handle, 'A collector') || ' now follows your collection',
            jsonb_build_object('follower', v_my_handle, 'handle', v_my_handle));
  end if;
end $$;

create or replace function public.unfollow_collector(p_handle text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'not signed in' using errcode = '42501'; end if;
  delete from public.follows f
   using public.profiles p
   where f.follower_id = (select auth.uid()) and f.followee_id = p.id and lower(p.handle) = lower(p_handle);
end $$;

-- What a profile page needs beyond seller_profile: follow counts, whether
-- the viewer follows (or is) this member, and the value opt-in.
create or replace function public.collector_profile(p_handle text)
returns table (followers int, following int, show_value boolean, is_following boolean, is_me boolean)
language sql stable security definer set search_path = '' as $$
  select (select count(*)::int from public.follows f where f.followee_id = p.id),
         (select count(*)::int from public.follows f where f.follower_id = p.id),
         p.show_collection_value,
         exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = p.id),
         p.id = (select auth.uid())
    from public.profiles p
   where lower(p.handle) = lower(p_handle)
$$;

-- The collectors the signed-in member follows, newest first.
create or replace function public.my_following()
returns table (handle text, followed_at timestamptz, shirts int)
language sql stable security definer set search_path = '' as $$
  select p.handle, f.created_at,
         (select count(*)::int from public.custom_items ci where ci.user_id = p.id and ci.visibility <> 'private')
    from public.follows f
    join public.profiles p on p.id = f.followee_id
   where f.follower_id = (select auth.uid()) and p.handle is not null
   order by f.created_at desc
$$;

-- public_collection gains what the valuation model needs (patches,
-- signature, verification level) — only when the owner shows their value.
drop function public.public_collection(text);
create function public.public_collection(p_handle text)
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
   where lower(p.handle) = lower(p_handle) and ci.visibility <> 'private'
   order by ci.created_at desc
   limit 300
$$;

revoke execute on function public.public_collection(text), public.collector_profile(text) from public;
grant execute on function public.public_collection(text), public.collector_profile(text) to anon, authenticated;
revoke execute on function public.follow_collector(text), public.unfollow_collector(text), public.my_following() from public, anon;
grant execute on function public.follow_collector(text), public.unfollow_collector(text), public.my_following() to authenticated;

-- Tell followers about a collector's activity (throttled per collector).
create or replace function private.notify_followers(p_owner uuid, p_type text, p_title text, p_body text, p_data jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, title, body, data)
  select f.follower_id, p_type, p_title, p_body, p_data
    from public.follows f
   where f.followee_id = p_owner
     and not exists (
       select 1 from public.notifications n
        where n.user_id = f.follower_id and n.type = p_type and not n.read
          and n.created_at > now() - interval '6 hours'
          and n.data ->> 'handle' = p_data ->> 'handle'
     )
$$;

create or replace function private.followers_on_listing()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_handle text; v_name text;
begin
  select handle into v_handle from public.profiles where id = new.user_id;
  if v_handle is null or new.status <> 'open' then return new; end if;
  select name into v_name from public.catalog_shirts where id = new.shirt_id;
  perform private.notify_followers(new.user_id, 'followed_listing', 'New listing from a collector you follow',
    '@' || v_handle || ' listed ' || coalesce(v_name, new.shirt_id) || ' (' || new.size || ') for CHF ' || new.amount,
    jsonb_build_object('handle', v_handle, 'shirt_id', new.shirt_id, 'size', new.size, 'amount', new.amount));
  return new;
exception when others then
  return new; -- a notification must never block a listing
end $$;

create or replace function private.followers_on_shirt()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_handle text;
begin
  if new.visibility = 'private' or (tg_op = 'UPDATE' and old.visibility <> 'private') then return new; end if;
  select handle into v_handle from public.profiles where id = new.user_id;
  if v_handle is null then return new; end if;
  perform private.notify_followers(new.user_id, 'followed_shirt', 'New shirt in a collection you follow',
    '@' || v_handle || ' added a shirt to their collection',
    jsonb_build_object('handle', v_handle, 'catalog_id', new.catalog_id));
  return new;
exception when others then
  return new;
end $$;

create trigger followers_on_listing after insert on public.asks for each row execute function private.followers_on_listing();
create trigger followers_on_shirt after insert or update of visibility on public.custom_items for each row execute function private.followers_on_shirt();
