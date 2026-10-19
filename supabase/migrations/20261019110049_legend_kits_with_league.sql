-- A legend's kits carry their league, so the page can name the career's
-- first and last club ("every kit from PSV to Corinthians") without the
-- national team.
drop function if exists public.legend_kits_for(text);
create function public.legend_kits_for(p_legend text)
returns table (id uuid, club_id text, club_name text, season text, season_year integer, kind text, variant text, image_path text, league text)
language plpgsql security definer set search_path to '' as $function$
begin
  perform private.throttle('library', 300, 1500);
  return query
    select k.id, k.club_id, c.name, k.season, k.season_year, k.kind, k.variant, k.image_path, c.league
      from public.kit_legends l
      join public.kits k on k.id = l.kit_id
      join public.kit_clubs c on c.id = k.club_id
     where l.legend = p_legend and k.status = 'approved' and k.image_path is not null
     order by k.season_year, c.league = 'National Teams', c.name,
              array_position(array['home', 'away', 'third', 'fourth', 'cup', 'european', 'special', 'goalkeeper', 'training'], k.kind), k.variant
     limit 400;
end $function$;
grant execute on function public.legend_kits_for(text) to anon, authenticated, service_role;
