-- New catalogue shirts of a known club appear in the kit library by themselves.
create or replace function private.catalogue_to_library()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_club public.kit_clubs;
begin
  select * into v_club from public.kit_clubs where new.club = any (aliases) or lower(name) = lower(new.club) limit 1;
  if v_club.id is null or new.season !~ '^[0-9]{4}' then return new; end if;
  insert into public.kits (club_id, season, season_year, kind, brand, pattern, colors, catalog_id, source, status)
  values (v_club.id, regexp_replace(new.season, '–', '/'), left(new.season, 4)::int,
          case when new.name ~* '\maway\M' then 'away' when new.name ~* '\mthird\M' then 'third' else 'home' end,
          new.brand, 'graphic', v_club.colors, new.id, 'catalogue', 'approved')
  on conflict do nothing;
  return new;
exception when others then
  -- The library is a bonus: never block adding a catalogue shirt.
  return new;
end $$;
drop trigger if exists catalog_shirts_to_library on public.catalog_shirts;
create trigger catalog_shirts_to_library after insert on public.catalog_shirts
  for each row execute function private.catalogue_to_library();
