-- Kit library: clubs from the Premier League import that are not in the
-- 2025/26 top flight (they show under "Other leagues").
insert into public.kit_clubs (id, name, league, country, colors, aliases, top5) values
  ('coventry', 'Coventry City', 'Championship', 'England', '{#59CBE8,#FFFFFF}', '{Coventry}', false),
  ('hull', 'Hull City', 'Championship', 'England', '{#F5A12D,#000000}', '{Hull City AFC,Hull}', false),
  ('ipswich', 'Ipswich Town', 'Championship', 'England', '{#0044A9,#FFFFFF}', '{Ipswich}', false)
on conflict (id) do nothing;
