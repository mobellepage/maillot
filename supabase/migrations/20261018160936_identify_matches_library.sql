-- Shirt recognition finds the kit in the library: from the club, season and
-- kind the model read off the photos (and words of its description, such as
-- "anniversary", for the variant), the best library kit — the season named,
-- else the one next to it when the variant matches. For the identify-shirt
-- edge function only.
create or replace function public.match_library_kit(p_club text, p_season text, p_kind text, p_hint text default '')
returns table (id uuid, club_id text, club_name text, season text, kind text, variant text, image_path text)
language plpgsql stable security definer set search_path = '' as $$
declare
  s record;
  v_hint text := lower(coalesce(p_hint, ''));
  v_kind text := case when p_kind in ('home', 'away', 'third', 'fourth', 'goalkeeper', 'special', 'training', 'cup', 'european') then p_kind end;
begin
  if coalesce(btrim(p_club), '') = '' or coalesce(btrim(p_season), '') = '' then return; end if;
  select * into s from private.kit_slot(p_club, p_season, coalesce(v_kind, 'home'));
  if s.club_id is null then return; end if;
  return query
    select k.id, k.club_id, c.name, k.season, k.kind, k.variant, k.image_path
      from public.kits k
      join public.kit_clubs c on c.id = k.club_id
     where k.club_id = s.club_id and k.status = 'approved' and k.image_path is not null
       and (k.season = s.season
            or (abs(k.season_year - left(s.season, 4)::int) = 1 and k.variant <> '' and v_hint like '%' || lower(k.variant) || '%'))
     order by (k.season = s.season) desc,
              (k.kind = v_kind) desc nulls last,
              (k.variant <> '' and v_hint like '%' || lower(k.variant) || '%') desc,
              (k.variant = '') desc,
              array_position(array['home', 'away', 'third', 'fourth', 'special', 'cup', 'european', 'goalkeeper', 'training'], k.kind)
     limit 1;
end $$;
revoke execute on function public.match_library_kit(text, text, text, text) from public, anon, authenticated;
grant execute on function public.match_library_kit(text, text, text, text) to service_role;
