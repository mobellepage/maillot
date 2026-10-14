-- Kit library: clubs from the Bundesliga import that are not in the 2025/26
-- top flight (they show under "Other leagues").
insert into public.kit_clubs (id, name, league, country, colors, aliases, top5) values
  ('schalke', 'FC Schalke 04', '2. Bundesliga', 'Germany', '{#004D9D,#FFFFFF}', '{Schalke 04,Schalke}', false),
  ('paderborn', 'SC Paderborn 07', '2. Bundesliga', 'Germany', '{#005CA9,#000000}', '{SC Paderborn,Paderborn}', false),
  ('elversberg', 'SV Elversberg', '2. Bundesliga', 'Germany', '{#000000,#FFFFFF}', '{Elversberg}', false)
on conflict (id) do nothing;
