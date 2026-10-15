-- The feed swipes through kits of the library (until there are enough
-- members' listings): a fresh random mix on every visit, leaning towards
-- the clubs and leagues someone likes. A like on a library kit is kept in
-- kit_likes (the wishlist of catalogue shirts stays as it is).

create table if not exists public.kit_likes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kit_id uuid not null references public.kits (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, kit_id)
);
alter table public.kit_likes enable row level security;
create policy kit_likes_own_select on public.kit_likes for select to authenticated using (user_id = (select auth.uid()));
create policy kit_likes_own_insert on public.kit_likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy kit_likes_own_delete on public.kit_likes for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.kit_likes from anon;
grant select, insert, delete on public.kit_likes to authenticated;

-- Up to 80 kits with pictures: some of the given clubs, some of the given
-- leagues, the rest from the whole library (top five leagues, Swiss Super
-- League, national teams; home, away and third kits).
create or replace function public.feed_kits(p_clubs text[] default '{}', p_leagues text[] default '{}')
returns table (id uuid, club_id text, club_name text, league text, season text, season_year int, kind text, variant text, image_path text)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.throttle('library', 300, 1500);
  return query
    with pool as (
      select k.id, k.club_id, c.name, c.league, k.season, k.season_year, k.kind, k.variant, k.image_path
        from public.kits k
        join public.kit_clubs c on c.id = k.club_id
       where k.status = 'approved' and k.image_path is not null and k.kind in ('home', 'away', 'third')
         and (c.top5 or c.league in ('Swiss Super League', 'National Teams'))
    ), picked as (
      (select * from pool where pool.club_id = any (coalesce(p_clubs, '{}')) order by random() limit 25)
      union
      (select * from pool where pool.league = any (coalesce(p_leagues, '{}')) order by random() limit 25)
      union
      (select * from pool order by random() limit 60)
    )
    select * from picked limit 80;
end $$;

-- The library kits the member liked, newest like first (wishlist page).
create or replace function public.my_liked_kits()
returns table (id uuid, club_id text, club_name text, league text, season text, season_year int, kind text, variant text, image_path text, liked_at timestamptz)
language sql security definer set search_path = '' as $$
  select k.id, k.club_id, c.name, c.league, k.season, k.season_year, k.kind, k.variant, k.image_path, l.created_at
    from public.kit_likes l
    join public.kits k on k.id = l.kit_id
    join public.kit_clubs c on c.id = k.club_id
   where l.user_id = (select auth.uid())
   order by l.created_at desc
   limit 500
$$;

revoke execute on function public.feed_kits(text[], text[]) from public;
grant execute on function public.feed_kits(text[], text[]) to anon, authenticated;
revoke execute on function public.my_liked_kits() from public, anon;
grant execute on function public.my_liked_kits() to authenticated;
