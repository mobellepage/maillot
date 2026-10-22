-- The 2026/27 leagues: the promoted clubs (already in the library with their
-- kits, filed under the second divisions) move up, the relegated ones down.
-- Fantasy picks from the top-flight leagues, so this is what makes the new
-- clubs pickable and keeps the relegated ones out. Prices sit at the bottom
-- of each league's range; the fixture feeds learn their team ids.
update public.kit_clubs c set league = v.league, top5 = v.top5 from (values
  ('coventry', 'Premier League', true), ('hull', 'Premier League', true), ('ipswich', 'Premier League', true),
  ('deportivo', 'La Liga', true), ('malaga', 'La Liga', true), ('racing-santander', 'La Liga', true),
  ('schalke', 'Bundesliga', true), ('paderborn', 'Bundesliga', true), ('elversberg', 'Bundesliga', true),
  ('venezia', 'Serie A', true), ('monza', 'Serie A', true), ('frosinone', 'Serie A', true),
  ('troyes', 'Ligue 1', true), ('le-mans', 'Ligue 1', true),
  ('vaduz', 'Swiss Super League', false),
  ('burnley', 'Championship', false), ('west-ham', 'Championship', false), ('wolves', 'Championship', false),
  ('girona', 'Segunda División', false), ('mallorca', 'Segunda División', false), ('oviedo', 'Segunda División', false),
  ('heidenheim', '2. Bundesliga', false), ('st-pauli', '2. Bundesliga', false), ('wolfsburg', '2. Bundesliga', false),
  ('verona', 'Serie B', false), ('pisa', 'Serie B', false), ('cremonese', 'Serie B', false),
  ('metz', 'Ligue 2', false), ('nantes', 'Ligue 2', false)
) v (id, league, top5) where c.id = v.id;

insert into public.fantasy_club_prices (club_id, price, base_price)
select v.id, v.p, v.p from (values
  ('coventry', 6), ('ipswich', 6), ('hull', 5.5), ('deportivo', 6), ('malaga', 5.5), ('racing-santander', 5.5),
  ('schalke', 7), ('paderborn', 5), ('elversberg', 4.5), ('venezia', 6), ('monza', 5.5), ('frosinone', 5),
  ('troyes', 5), ('le-mans', 4.5), ('vaduz', 5)
) v (id, p)
where exists (select 1 from public.kit_clubs k where k.id = v.id)
on conflict (club_id) do update set price = excluded.price, base_price = excluded.base_price, updated_at = now();

insert into public.fantasy_team_mappings (club_id, provider, provider_team_id, team_name)
select v.id, v.provider, v.tid, v.name from (values
  ('coventry', 'espn', '388', 'Coventry City'), ('hull', 'espn', '306', 'Hull City'), ('ipswich', 'espn', '373', 'Ipswich Town'),
  ('deportivo', 'espn', '90', 'Deportivo'), ('malaga', 'espn', '99', 'Málaga'), ('racing-santander', 'espn', '87', 'Racing Santander'),
  ('schalke', 'espn', '133', 'Schalke 04'), ('paderborn', 'espn', '3307', 'SC Paderborn 07'), ('elversberg', 'espn', '10388', 'SV Elversberg'),
  ('venezia', 'espn', '17530', 'Venezia'), ('monza', 'espn', '4007', 'Monza'), ('frosinone', 'espn', '4057', 'Frosinone'),
  ('troyes', 'espn', '170', 'Troyes'), ('le-mans', 'espn', '2697', 'Le Mans'),
  ('vaduz', 'tsdb', '134320', 'Vaduz')
) v (id, provider, tid, name)
where exists (select 1 from public.kit_clubs k where k.id = v.id)
on conflict (club_id) do update set provider = excluded.provider, provider_team_id = excluded.provider_team_id, team_name = excluded.team_name;
