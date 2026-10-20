-- The kit finder shows the well-known clubs and nations first (top-5
-- leagues, Swiss Super League, featured national teams), then the rest.
create or replace function public.library_find(p_color text default null, p_from int default null, p_to int default null,
                                               p_kind text default null, p_league text default null,
                                               p_offset int default 0, p_limit int default 48)
returns table (id uuid, club_id text, club_name text, league text, season text, season_year int, kind text, variant text, image_path text, total int)
language plpgsql security definer set search_path = '' as $$
declare v_group text[] := case when p_color is null then null else private.color_group(p_color) end;
begin
  perform private.throttle('library', 300, 1500);
  if p_color is not null and p_color not in ('red', 'claret', 'orange', 'yellow', 'green', 'sky', 'blue', 'navy', 'purple', 'pink', 'white', 'black', 'grey') then
    raise exception 'unknown colour' using errcode = '22023';
  end if;
  return query
    select k.id, k.club_id, c.name, c.league, k.season, k.season_year, k.kind, k.variant, k.image_path,
           (count(*) over ())::int
      from public.kits k
      join public.kit_clubs c on c.id = k.club_id
     where k.status = 'approved' and k.image_path is not null and k.kind <> 'training'
       and (v_group is null or k.color_families && v_group)
       and (p_from is null or k.season_year >= p_from)
       and (p_to is null or k.season_year <= p_to)
       and (p_kind is null or k.kind = p_kind)
       and (p_league is null or c.league = p_league)
     order by (v_group is not null and k.color_families[1] = any (v_group)) desc,
              private.on_discover(c) desc,
              (k.variant = '') desc,
              md5(k.id::text || ':find')
     offset greatest(coalesce(p_offset, 0), 0)
     limit least(greatest(coalesce(p_limit, 48), 1), 96);
end $$;
