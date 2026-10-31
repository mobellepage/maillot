-- The same kit more than once on the wishlist, each with its own print
-- (e.g. Barcelona 2026/27 Home as YAMAL 10 and as PEDRI 8). A wish is now
-- an entry with its own id; the exact same print twice is refused. Likes
-- counted for "popular" and "trending" stay one per member and kit.
alter table public.kit_likes add column id uuid not null default gen_random_uuid();
alter table public.kit_likes drop constraint kit_likes_pkey;
alter table public.kit_likes add constraint kit_likes_pkey primary key (id);
create index kit_likes_user_kit on public.kit_likes (user_id, kit_id);
create unique index kit_likes_one_per_print on public.kit_likes (user_id, kit_id, coalesce(lower(print_name), ''), coalesce(print_number, ''));

-- Heart / right swipe: on the wishlist (a bare entry) unless the kit is there already.
create or replace function public.wish_kit_like(p_kit uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.kit_likes (user_id, kit_id)
  select (select auth.uid()), p_kit
   where (select auth.uid()) is not null
     and not exists (select 1 from public.kit_likes where user_id = (select auth.uid()) and kit_id = p_kit)
$$;

-- Save a print: on one entry (p_entry), or as a new entry of the kit. A bare
-- entry of the kit takes the first print instead of staying next to it.
create or replace function public.wish_kit_save(p_kit uuid, p_entry uuid, p_name text, p_number text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := (select auth.uid()); v_id uuid; v_name text := nullif(btrim(p_name), ''); v_number text := nullif(btrim(p_number), '');
begin
  if v_me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.hit('wish_kit:' || v_me, 300, interval '1 hour');
  if p_entry is null and (v_name is not null or v_number is not null) then
    select id into p_entry from public.kit_likes where user_id = v_me and kit_id = p_kit and print_name is null and print_number is null limit 1;
  end if;
  if p_entry is not null then
    update public.kit_likes set print_name = v_name, print_number = v_number
     where id = p_entry and user_id = v_me returning id into v_id;
    return v_id;
  end if;
  insert into public.kit_likes (user_id, kit_id, print_name, print_number) values (v_me, p_kit, v_name, v_number)
  on conflict do nothing returning id into v_id;
  return v_id;
end $$;

revoke all on function public.wish_kit_like(uuid), public.wish_kit_save(uuid, uuid, text, text) from public, anon;
grant execute on function public.wish_kit_like(uuid), public.wish_kit_save(uuid, uuid, text, text) to authenticated;

-- My wishlist: one row per entry (entry_id), newest first.
drop function if exists public.my_liked_kits();
create function public.my_liked_kits()
returns table(id uuid, club_id text, club_name text, league text, season text, season_year integer, kind text, variant text, image_path text, liked_at timestamptz, print_name text, print_number text, entry_id uuid)
language sql stable security definer set search_path = '' as $$
  select k.id, k.club_id, c.name, c.league, k.season, k.season_year, k.kind, k.variant, k.image_path, l.created_at, l.print_name, l.print_number, l.id
    from public.kit_likes l
    join public.kits k on k.id = l.kit_id
    join public.kit_clubs c on c.id = k.club_id
   where l.user_id = (select auth.uid())
   order by l.created_at desc
   limit 500
$$;
revoke all on function public.my_liked_kits() from public, anon;
grant execute on function public.my_liked_kits() to authenticated;

create or replace function public.trending_kits(p_limit integer default 12)
returns table(id uuid, club_id text, club_name text, league text, season text, season_year integer, kind text, variant text, image_path text, likes integer)
language sql stable security definer set search_path = '' as $$
  select k.id, k.club_id, c.name, c.league, k.season, k.season_year, k.kind, k.variant, k.image_path, x.recent::int
    from (select l.kit_id, count(distinct l.user_id) filter (where l.created_at > now() - interval '14 days') recent, count(distinct l.user_id) total
            from public.kit_likes l group by l.kit_id) x
    join public.kits k on k.id = x.kit_id and k.image_path is not null
    join public.kit_clubs c on c.id = k.club_id
   order by x.recent desc, x.total desc, k.season_year desc
   limit least(greatest(coalesce(p_limit, 12), 1), 48)
$$;

create or replace function public.popular_kits(p_limit integer default 3)
returns table(id uuid, club_id text, club_name text, season text, kind text, variant text, image_path text)
language plpgsql security definer set search_path = '' as $function$
declare
  v_year int := extract(year from (now() at time zone 'Europe/Zurich'))::int;
  v_day text := (now() at time zone 'Europe/Zurich')::date::text;
begin
  perform private.throttle('library', 300, 1500);
  return query
    with activity as (
      select l.kit_id, count(distinct l.user_id) * 3 as score from public.kit_likes l where l.created_at > now() - interval '14 days' group by 1
      union all
      select ci.kit_id, count(*) * 5 from public.custom_items ci where ci.kit_id is not null and ci.created_at > now() - interval '30 days' group by 1
    ), scored as (select a.kit_id, sum(a.score) as score from activity a group by 1),
    pool as (
      select k.id, k.club_id, c.name, k.season, k.kind, k.variant, k.image_path
        from public.kits k
        join public.kit_clubs c on c.id = k.club_id
        left join scored s on s.kit_id = k.id
       where k.status = 'approved' and k.image_path is not null and k.variant = '' and k.kind in ('home', 'away', 'third')
         and private.on_discover(c)
         and (s.score is not null or k.season_year >= v_year - 1)
       order by coalesce(s.score, 0) desc, md5(k.id::text || v_day)
       limit 60
    )
    select p.id, p.club_id, p.name, p.season, p.kind, p.variant, p.image_path
      from pool p
     order by md5(p.id::text || ':' || v_day)
     limit least(greatest(coalesce(p_limit, 3), 1), 30);
end $function$;
