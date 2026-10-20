-- Instagram-like: a short bio and the favourite club on every profile, the
-- follower lists of any collector, a "Following" feed of the shirts the
-- collectors I follow add, and their last day as stories.
alter table public.profiles add column if not exists bio text;
alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles add constraint profiles_bio_length check (char_length(bio) <= 160);
grant select (bio) on public.profiles to authenticated;
grant update (bio) on public.profiles to authenticated;

-- The profile header: counts, bio, favourite club (interests.club).
drop function if exists public.collector_profile(text);
create function public.collector_profile(p_handle text)
returns table (followers int, following int, show_value boolean, is_following boolean, is_me boolean, dealer boolean, collection_private boolean, avatar text,
               bio text, club_id text, club_name text, shirts int)
language sql stable security definer set search_path = '' as $$
  select (select count(*)::int from public.follows f where f.followee_id = p.id),
         (select count(*)::int from public.follows f where f.follower_id = p.id),
         p.show_collection_value,
         exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = p.id),
         p.id = (select auth.uid()),
         p.dealer_verified_at is not null,
         p.collection_private,
         p.avatar,
         nullif(trim(p.bio), ''),
         c.id, c.name,
         case when p.collection_private then 0
              else (select count(*)::int from public.custom_items ci where ci.user_id = p.id and ci.visibility <> 'private') end
    from public.profiles p
    left join public.kit_clubs c on c.id = p.interests ->> 'club'
   where lower(p.handle) = lower(p_handle)
$$;
grant execute on function public.collector_profile(text) to anon, authenticated;

-- Whom a collector follows and who follows them (handles only).
create or replace function public.collector_follows(p_handle text)
returns table (direction text, handle text, avatar text, shirts int)
language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid := (select id from public.profiles where lower(handle) = lower(p_handle));
begin
  perform private.throttle('social', 300, 1500);
  if v_id is null then return; end if;
  return query
    select x.direction, p.handle, p.avatar,
           case when p.collection_private then 0
                else (select count(*)::int from public.custom_items ci where ci.user_id = p.id and ci.visibility <> 'private') end
      from (select 'following'::text as direction, f.followee_id as other, f.created_at as since from public.follows f where f.follower_id = v_id
            union all
            select 'follower', f.follower_id, f.created_at from public.follows f where f.followee_id = v_id) x
      join public.profiles p on p.id = x.other
     where p.handle is not null
     order by x.since desc
     limit 500;
end $$;
revoke execute on function public.collector_follows(text) from public;
grant execute on function public.collector_follows(text) to anon, authenticated;

-- "Following": the shirts the collectors I follow added, newest first, with
-- likes, comments and the latest comment.
create or replace function public.following_feed(p_before timestamptz default null, p_limit int default 20)
returns table (id text, handle text, avatar text, catalog_id text, kit_id uuid, kit_image text, club text, season text, variant text,
               version text, size text, player_name text, player_number text, photo_path text, thumb_path text, added_at timestamptz,
               likes int, liked boolean, comments int, last_comment jsonb)
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := (select auth.uid());
begin
  if v_me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.throttle('social', 300, 1500);
  return query
    select ci.id, p.handle, p.avatar, ci.catalog_id, ci.kit_id, ci.kit_image,
           nullif(ci.proposed_club, ''), nullif(ci.proposed_season, ''), nullif(ci.proposed_variant, ''),
           ci.version, ci.size, nullif(ci.flock ->> 'name', ''), nullif(ci.flock ->> 'number', ''),
           private.main_photo(ci.photos) ->> 'path', private.main_photo(ci.photos) ->> 'thumbPath', ci.created_at,
           (select count(*)::int from public.item_likes l where l.item_id = ci.id),
           exists (select 1 from public.item_likes l where l.item_id = ci.id and l.user_id = v_me),
           (select count(*)::int from public.item_comments c where c.item_id = ci.id),
           (select jsonb_build_object('handle', cp.handle, 'body', c.body)
              from public.item_comments c left join public.profiles cp on cp.id = c.user_id
             where c.item_id = ci.id order by c.created_at desc limit 1)
      from public.follows f
      join public.profiles p on p.id = f.followee_id and p.handle is not null and not p.collection_private
      join public.custom_items ci on ci.user_id = p.id and ci.visibility <> 'private'
     where f.follower_id = v_me
       and (p_before is null or ci.created_at < p_before)
     order by ci.created_at desc
     limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;
revoke execute on function public.following_feed(timestamptz, int) from public, anon;
grant execute on function public.following_feed(timestamptz, int) to authenticated;

-- Stories: the collectors I follow who added shirts in the last 24 hours,
-- with those shirts (up to 10 each), the newest first.
create or replace function public.following_stories()
returns table (handle text, avatar text, latest timestamptz, items jsonb)
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := (select auth.uid());
begin
  if v_me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.throttle('social', 300, 1500);
  return query
    select p.handle, p.avatar, max(x.created_at),
           jsonb_agg(jsonb_build_object('id', x.id, 'catalog_id', x.catalog_id, 'kit_image', x.kit_image,
                                        'club', nullif(x.proposed_club, ''), 'season', nullif(x.proposed_season, ''), 'variant', nullif(x.proposed_variant, ''),
                                        'photo_path', private.main_photo(x.photos) ->> 'path', 'added_at', x.created_at)
                     order by x.created_at)
      from public.follows f
      join public.profiles p on p.id = f.followee_id and p.handle is not null and not p.collection_private
      cross join lateral (
        select ci.* from public.custom_items ci
         where ci.user_id = p.id and ci.visibility <> 'private' and ci.created_at > now() - interval '24 hours'
         order by ci.created_at desc limit 10
      ) x
     where f.follower_id = v_me
     group by p.handle, p.avatar
     order by max(x.created_at) desc;
end $$;
revoke execute on function public.following_stories() from public, anon;
grant execute on function public.following_stories() to authenticated;
