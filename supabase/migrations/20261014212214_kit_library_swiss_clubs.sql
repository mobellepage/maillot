-- Kit library: the clubs of the Swiss Super League import (YB and Basel
-- are there already). Vaduz plays in the Swiss Challenge League.
insert into public.kit_clubs (id, name, league, country, colors, aliases, top5) values
  ('grasshoppers', 'Grasshopper Club Zürich', 'Swiss Super League', 'Switzerland', '{#0063AF,#FFFFFF}', '{GC,Grasshoppers,GC Zürich}', false),
  ('zurich', 'FC Zürich', 'Swiss Super League', 'Switzerland', '{#FFFFFF,#0067B1}', '{FCZ,Zürich,Zurich}', false),
  ('luzern', 'FC Luzern', 'Swiss Super League', 'Switzerland', '{#0055A5,#FFFFFF}', '{FCL,Luzern,Lucerne}', false),
  ('st-gallen', 'FC St. Gallen', 'Swiss Super League', 'Switzerland', '{#00843D,#FFFFFF}', '{FCSG,St. Gallen}', false),
  ('servette', 'Servette FC', 'Swiss Super League', 'Switzerland', '{#8A1538,#FFFFFF}', '{Servette,Genf,Genève}', false),
  ('sion', 'FC Sion', 'Swiss Super League', 'Switzerland', '{#FFFFFF,#E30613}', '{Sion,Sitten}', false),
  ('lugano', 'FC Lugano', 'Swiss Super League', 'Switzerland', '{#000000,#FFFFFF}', '{Lugano}', false),
  ('lausanne', 'FC Lausanne-Sport', 'Swiss Super League', 'Switzerland', '{#002D72,#FFFFFF}', '{Lausanne-Sport,Lausanne}', false),
  ('thun', 'FC Thun', 'Swiss Super League', 'Switzerland', '{#E30613,#FFFFFF}', '{Thun}', false),
  ('vaduz', 'FC Vaduz', 'Challenge League', 'Liechtenstein', '{#E30613,#FFFFFF}', '{Vaduz}', false)
on conflict (id) do nothing;
