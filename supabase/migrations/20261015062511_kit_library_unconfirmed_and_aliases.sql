-- Kit library: kits of seasons that have not started (2027/28, the
-- nations' 2027) are not confirmed yet - out until they are.
delete from public.kits where season_year >= 2027 and source = 'import';

-- Short names people type into the search.
update public.kit_clubs c set aliases = (select array_agg(distinct a) from unnest(c.aliases || v.extra) a)
from (values
  ('young-boys', array['YB', 'Young Boys']),
  ('dortmund', array['BVB', 'Dortmund']),
  ('bayern', array['Bayern', 'FCB München']),
  ('man-united', array['Man Utd', 'Man United', 'Manchester United']),
  ('man-city', array['Man City', 'Manchester City']),
  ('tottenham', array['Spurs', 'Tottenham Hotspur']),
  ('inter', array['Internazionale', 'Inter Milan', 'Inter Mailand']),
  ('juventus', array['Juve']),
  ('real-madrid', array['Real']),
  ('atletico', array['Atlético Madrid', 'Atletico Madrid', 'Atleti']),
  ('barcelona', array['Barça', 'Barca']),
  ('psg', array['PSG', 'Paris']),
  ('marseille', array['OM']),
  ('lyon', array['OL']),
  ('gladbach', array['Mönchengladbach', 'Borussia Mönchengladbach']),
  ('leverkusen', array['Bayer Leverkusen']),
  ('basel', array['FC Basel', 'FCB Basel', 'Basel']),
  ('napoli', array['Neapel']),
  ('roma', array['Rom'])
) as v (id, extra)
where c.id = v.id;
