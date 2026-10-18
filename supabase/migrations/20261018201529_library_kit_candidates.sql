-- Shirt recognition compares the member's photos with the library's pictures
-- of one club. This picks which of that club's kits to show it: the seasons
-- the photos suggest (with a year either side), the kind read off the photos
-- and the kinds that look alike first, goalkeeper and training kits only when
-- asked for. For the identify-shirt edge function only.
create or replace function public.library_kit_candidates(p_club_id text, p_kind text, p_year_from int, p_year_to int, p_limit int default 20)
returns table (id uuid, club_id text, club_name text, season text, kind text, variant text, image_path text)
language sql stable security definer set search_path = '' as $$
  with k as (
    select k.*, c.name as cname,
           case when p_year_from is null and p_year_to is null then 0
                when k.season_year < coalesce(p_year_from, p_year_to) then coalesce(p_year_from, p_year_to) - k.season_year
                when k.season_year > coalesce(p_year_to, p_year_from) then k.season_year - coalesce(p_year_to, p_year_from)
                else 0 end as gap,
           case when k.kind = p_kind then 0
                when (p_kind = 'home' and k.kind in ('european', 'cup', 'special'))
                  or (p_kind in ('away', 'third') and k.kind in ('away', 'third', 'fourth', 'european', 'cup', 'special'))
                  or (p_kind = 'special' and k.kind in ('home', 'away', 'third', 'european', 'cup'))
                  or (coalesce(p_kind, 'unknown') = 'unknown' and k.kind not in ('goalkeeper', 'training')) then 1
                else 2 end as kind_gap
      from public.kits k
      join public.kit_clubs c on c.id = k.club_id
     where k.club_id = p_club_id and k.status = 'approved' and k.image_path is not null
       and (k.kind not in ('goalkeeper', 'training') or k.kind = p_kind)
  )
  select k.id, k.club_id, k.cname, k.season, k.kind, k.variant, k.image_path
    from k
   order by (k.gap > 1), k.kind_gap = 2, k.gap, k.kind_gap, k.season_year desc, k.variant
   limit least(greatest(coalesce(p_limit, 20), 1), 30);
$$;
revoke execute on function public.library_kit_candidates(text, text, int, int, int) from public, anon, authenticated;
grant execute on function public.library_kit_candidates(text, text, int, int, int) to service_role;
