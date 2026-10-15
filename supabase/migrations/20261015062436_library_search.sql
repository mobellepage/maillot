-- Kit library search for the home page: "Milan 2006/07", "YB Heim" …
-- The app splits the query into club text, year / season and kind; this
-- finds the kits, newest first, home kit before the others. Throttled
-- like every public read (its own bucket: it runs while people type).
create or replace function public.library_search(p_club text, p_year int default null, p_season text default null, p_kind text default null)
returns table (id uuid, club_id text, club_name text, season text, kind text, variant text, image_path text, colors text[])
language plpgsql stable security definer set search_path = '' as $$
declare
  v_needle text := lower(trim(coalesce(p_club, '')));
begin
  perform private.throttle('library_search', 600, 2000);
  if char_length(v_needle) < 2 then return; end if;
  return query
    select k.id, k.club_id, c.name, k.season, k.kind, k.variant, k.image_path, k.colors
    from public.kits k
    join public.kit_clubs c on c.id = k.club_id
    where k.status = 'approved'
      and (lower(c.name) like '%' || v_needle || '%' or c.id = v_needle
           or exists (select 1 from unnest(c.aliases) a where lower(a) like '%' || v_needle || '%'))
      and (p_year is null or k.season_year = p_year)
      and (p_season is null or k.season = p_season)
      and (p_kind is null or k.kind = p_kind)
    order by (lower(c.name) = v_needle or c.id = v_needle or exists (select 1 from unnest(c.aliases) a where lower(a) = v_needle)) desc,
             k.season_year desc,
             array_position(array['home', 'away', 'third', 'fourth', 'goalkeeper', 'cup', 'european', 'special', 'training'], k.kind),
             k.variant
    limit 8;
end $$;
revoke execute on function public.library_search(text, int, text, text) from public;
grant execute on function public.library_search(text, int, text, text) to anon, authenticated;
