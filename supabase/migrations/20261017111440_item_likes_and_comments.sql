-- Likes and comments on the shirts in other members' collections. Only
-- shirts that are shown (not private, collection not private) can be liked
-- or commented on; everything goes through the functions below. The owner
-- hears about it in the app (social notifications, can be switched off) and
-- can remove any comment on their shirts; authors can remove their own.

create table if not exists public.item_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.custom_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);
create index if not exists item_likes_user_idx on public.item_likes (user_id);
alter table public.item_likes enable row level security;
revoke all on public.item_likes from anon, authenticated;

create table if not exists public.item_comments (
  id uuid primary key default gen_random_uuid(),
  item_id text not null references public.custom_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists item_comments_item_idx on public.item_comments (item_id, created_at);
create index if not exists item_comments_user_idx on public.item_comments (user_id);
alter table public.item_comments enable row level security;
revoke all on public.item_comments from anon, authenticated;

-- The owner of a shirt others may see, or null.
create or replace function private.shown_item_owner(p_item text)
returns uuid language sql stable security definer set search_path = '' as $$
  select ci.user_id
    from public.custom_items ci
    join public.profiles p on p.id = ci.user_id
   where ci.id = p_item and ci.visibility <> 'private' and not p.collection_private
$$;

-- Likes, whether I liked it, and the comments (oldest first).
create or replace function public.item_social(p_item text)
returns table (likes int, liked boolean, is_owner boolean, comments jsonb)
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  perform private.throttle('social', 300, 1500);
  v_owner := private.shown_item_owner(p_item);
  if v_owner is null then return; end if;
  return query
    select (select count(*)::int from public.item_likes l where l.item_id = p_item),
           exists (select 1 from public.item_likes l where l.item_id = p_item and l.user_id = (select auth.uid())),
           v_owner = (select auth.uid()),
           coalesce((
             select jsonb_agg(jsonb_build_object(
                      'id', c.id, 'handle', p.handle, 'avatar', p.avatar, 'body', c.body, 'created_at', c.created_at,
                      'can_delete', c.user_id = (select auth.uid()) or v_owner = (select auth.uid()))
                    order by c.created_at)
               from (select * from public.item_comments c0 where c0.item_id = p_item order by c0.created_at desc limit 200) c
               left join public.profiles p on p.id = c.user_id
           ), '[]'::jsonb);
end $$;

create or replace function public.set_item_like(p_item text, p_like boolean)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_owner uuid;
  v_handle text;
  v_owner_handle text;
begin
  if v_me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  v_owner := private.shown_item_owner(p_item);
  if v_owner is null then raise exception 'no such shirt' using errcode = 'P0002'; end if;
  perform private.hit('item_like:' || v_me, 300, interval '1 hour');
  if p_like then
    insert into public.item_likes (user_id, item_id) values (v_me, p_item) on conflict do nothing;
    if found and v_owner <> v_me then
      select handle into v_handle from public.profiles where id = v_me;
      select handle into v_owner_handle from public.profiles where id = v_owner;
      -- Unlike + like again doesn't ping twice a day.
      if not exists (
        select 1 from public.notifications n
         where n.user_id = v_owner and n.type = 'shirt_liked' and n.created_at > now() - interval '1 day'
           and n.data ->> 'item_id' = p_item and n.data ->> 'handle' is not distinct from v_handle
      ) then
        insert into public.notifications (user_id, type, title, body, data)
        values (v_owner, 'shirt_liked', 'Someone liked your shirt',
                coalesce('@' || v_handle, 'A collector') || ' liked a shirt in your collection',
                jsonb_build_object('handle', v_handle, 'item_id', p_item, 'link', '/u/' || v_owner_handle || '/' || p_item));
      end if;
    end if;
  else
    delete from public.item_likes where user_id = v_me and item_id = p_item;
  end if;
  return (select count(*)::int from public.item_likes where item_id = p_item);
end $$;

create or replace function public.add_item_comment(p_item text, p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_owner uuid;
  v_body text := btrim(coalesce(p_body, ''));
  v_id uuid;
  v_handle text;
  v_owner_handle text;
begin
  if v_me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 500 then
    raise exception 'a comment has 1 to 500 characters' using errcode = '22023';
  end if;
  v_owner := private.shown_item_owner(p_item);
  if v_owner is null then raise exception 'no such shirt' using errcode = 'P0002'; end if;
  perform private.hit('item_comment:' || v_me, 30, interval '1 hour');
  insert into public.item_comments (item_id, user_id, body) values (p_item, v_me, v_body) returning id into v_id;
  if v_owner <> v_me then
    select handle into v_handle from public.profiles where id = v_me;
    select handle into v_owner_handle from public.profiles where id = v_owner;
    insert into public.notifications (user_id, type, title, body, data)
    values (v_owner, 'shirt_comment', 'New comment on your shirt',
            coalesce('@' || v_handle, 'A collector') || ': ' || left(v_body, 120),
            jsonb_build_object('handle', v_handle, 'item_id', p_item, 'comment_id', v_id, 'link', '/u/' || v_owner_handle || '/' || p_item));
  end if;
  return v_id;
end $$;

create or replace function public.delete_item_comment(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'not signed in' using errcode = '42501'; end if;
  delete from public.item_comments c
   using public.custom_items ci
   where c.id = p_id and ci.id = c.item_id
     and (c.user_id = (select auth.uid()) or ci.user_id = (select auth.uid()));
  if not found then raise exception 'no such comment' using errcode = 'P0002'; end if;
end $$;

-- Likes and comments are social notifications: in the app only, and
-- switched off with the other social ones.
create or replace function private.notification_group(p_type text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_type in ('price_move', 'all_time_high', 'collection_week') then 'value'
    when p_type in ('wanted_in_collection', 'listing_alert') then 'wanted'
    when p_type in ('new_follower', 'followed_shirt', 'followed_listing', 'shirt_liked', 'shirt_comment') then 'social'
  end
$$;
create or replace trigger on_notification_insert
  after insert on public.notifications
  for each row when (new.type not in ('new_follower', 'followed_listing', 'followed_shirt', 'shirt_liked', 'shirt_comment'))
  execute function public.relay_notification();

revoke execute on function private.shown_item_owner(text) from public;
do $$
declare f text;
begin
  revoke execute on function public.item_social(text) from public;
  grant execute on function public.item_social(text) to anon, authenticated;
  foreach f in array array['set_item_like(text, boolean)', 'add_item_comment(text, text)', 'delete_item_comment(uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
