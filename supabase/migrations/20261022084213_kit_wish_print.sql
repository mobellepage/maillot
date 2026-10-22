-- A kit on the wishlist can say which print the member wants on it
-- (player name and number) — so they know what they're looking for.
alter table public.kit_likes add column if not exists print_name text;
alter table public.kit_likes add column if not exists print_number text;
alter table public.kit_likes drop constraint if exists kit_likes_print_name_length;
alter table public.kit_likes add constraint kit_likes_print_name_length check (char_length(print_name) between 1 and 24);
alter table public.kit_likes drop constraint if exists kit_likes_print_number_format;
alter table public.kit_likes add constraint kit_likes_print_number_format check (print_number ~ '^[0-9]{1,3}$');
grant insert (print_name, print_number), update (print_name, print_number) on public.kit_likes to authenticated;

drop function if exists public.my_liked_kits();
create function public.my_liked_kits()
returns table (id uuid, club_id text, club_name text, league text, season text, season_year int, kind text, variant text, image_path text, liked_at timestamptz,
               print_name text, print_number text)
language sql stable security definer set search_path = '' as $$
  select k.id, k.club_id, c.name, c.league, k.season, k.season_year, k.kind, k.variant, k.image_path, l.created_at, l.print_name, l.print_number
    from public.kit_likes l
    join public.kits k on k.id = l.kit_id
    join public.kit_clubs c on c.id = k.club_id
   where l.user_id = (select auth.uid())
   order by l.created_at desc
   limit 500
$$;
revoke execute on function public.my_liked_kits() from public, anon;
grant execute on function public.my_liked_kits() to authenticated;
