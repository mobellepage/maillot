-- Kit library: clubs from the Serie A and Ligue 1 imports that are not in
-- the 2025/26 top flight (they show under "Other leagues").
insert into public.kit_clubs (id, name, league, country, colors, aliases, top5) values
  ('venezia', 'Venezia FC', 'Serie B', 'Italy', '{#000000,#F47920,#00843D}', '{Venezia}', false),
  ('monza', 'AC Monza', 'Serie B', 'Italy', '{#E2001A,#FFFFFF}', '{Monza}', false),
  ('frosinone', 'Frosinone Calcio', 'Serie B', 'Italy', '{#FFD700,#0047AB}', '{Frosinone}', false),
  ('troyes', 'ES Troyes AC', 'Ligue 2', 'France', '{#0055A4,#FFFFFF}', '{Troyes}', false),
  ('le-mans', 'Le Mans FC', 'Ligue 2', 'France', '{#E30613,#FFD100}', '{Le Mans}', false)
on conflict (id) do nothing;
