-- Kit library: clubs from the La Liga import that are not in the 2025/26
-- top flight (they show under "Other leagues").
insert into public.kit_clubs (id, name, league, country, colors, aliases, top5) values
  ('deportivo', 'Deportivo de La Coruña', 'Segunda División', 'Spain', '{#0067B1,#FFFFFF}', '{Deportivo de A Coruña,Depor}', false),
  ('racing-santander', 'Racing de Santander', 'Segunda División', 'Spain', '{#00A651,#FFFFFF}', '{Racing Santander}', false),
  ('malaga', 'Málaga CF', 'Segunda División', 'Spain', '{#0070B8,#FFFFFF}', '{Malaga}', false)
on conflict (id) do nothing;
