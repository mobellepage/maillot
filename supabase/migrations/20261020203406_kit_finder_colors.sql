-- Find kits by colour and era (an outfit: "a red retro shirt"). Every kit's
-- two main colours (kits.colors, read from its picture) get a colour family;
-- library_find() filters by family, era, kind and league.
create or replace function private.color_family(p_hex text)
returns text language plpgsql immutable set search_path = '' as $$
declare r float; g float; b float; mx float; mn float; l float; s float; h float; d float;
begin
  if p_hex is null or p_hex !~* '^#[0-9a-f]{6}$' then return null; end if;
  r := ('x' || substr(p_hex, 2, 2))::bit(8)::int / 255.0;
  g := ('x' || substr(p_hex, 4, 2))::bit(8)::int / 255.0;
  b := ('x' || substr(p_hex, 6, 2))::bit(8)::int / 255.0;
  mx := greatest(r, g, b); mn := least(r, g, b); l := (mx + mn) / 2; d := mx - mn;
  s := case when d = 0 then 0 else d / (1 - abs(2 * l - 1)) end;
  h := case when d = 0 then 0 when mx = r then 60 * (((g - b) / d)::numeric % 6) when mx = g then 60 * ((b - r) / d + 2) else 60 * ((r - g) / d + 4) end;
  if h < 0 then h := h + 360; end if;
  if l < 0.12 or (l < 0.24 and s < 0.35) then return 'black'; end if;
  if s < 0.16 or (l > 0.86 and s < 0.5) then return case when l > 0.72 then 'white' when l < 0.3 then 'black' else 'grey' end; end if;
  if h >= 345 or h < 12 then return case when l < 0.33 then 'claret' else 'red' end; end if;
  if h < 40 then return case when l < 0.35 then 'claret' else 'orange' end; end if;
  if h < 70 then return 'yellow'; end if;
  if h < 165 then return 'green'; end if;
  if h < 200 then return 'sky'; end if;
  if h < 250 then return case when l < 0.32 then 'navy' when l > 0.62 then 'sky' else 'blue' end; end if;
  if h < 290 then return 'purple'; end if;
  return case when l < 0.4 then 'claret' else 'pink' end;
end $$;

-- The families of the first two colours, the main one first.
create or replace function private.color_families(p_colors text[])
returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(f order by n), '{}') from (
    select distinct on (f) f, n from (
      select private.color_family(c) f, n from unnest(p_colors[1:2]) with ordinality as u(c, n)
    ) x where f is not null order by f, n
  ) y
$$;

alter table public.kits add column if not exists color_families text[] not null default '{}';
update public.kits set color_families = private.color_families(colors);
create index if not exists kits_color_families on public.kits using gin (color_families);
create index if not exists kits_season_year on public.kits (season_year);

create or replace function private.kits_color_families()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.color_families := private.color_families(new.colors);
  return new;
end $$;
drop trigger if exists kits_color_families on public.kits;
create trigger kits_color_families before insert or update of colors on public.kits
  for each row execute function private.kits_color_families();

-- "Red" also finds claret, "blue" also navy; the main colour ranks first.
create or replace function private.color_group(p_color text)
returns text[] language sql immutable set search_path = '' as $$
  select case p_color when 'red' then array['red', 'claret'] when 'blue' then array['blue', 'navy'] else array[p_color] end
$$;

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
              (k.variant = '') desc,
              md5(k.id::text || ':find')
     offset greatest(coalesce(p_offset, 0), 0)
     limit least(greatest(coalesce(p_limit, 48), 1), 96);
end $$;
revoke execute on function public.library_find(text, int, int, text, text, int, int) from public;
grant execute on function public.library_find(text, int, int, text, text, int, int) to anon, authenticated;
