begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- Discover's shelves: popular today, kits by era and a legend's kits, all
-- from the library and open to everyone. Test kits sit in the 2080s and
-- 2090s, where the real library has none.
select plan(9);

insert into public.kit_clubs (id, name, league, country, colors, top5, region, featured) values
  ('tap-nation', 'Tapland', 'National Teams', 'Tapland', array['#ffffff'], false, 'Oceania', true),
  ('tap-club', 'Tap FC', 'Premier League', 'England', array['#000000'], true, null, false),
  ('tap-islands', 'Tap Islands', 'National Teams', 'Tap Islands', array['#00ff00'], false, 'Oceania', false);
insert into public.kits (club_id, season, season_year, kind, colors, source, status, image_path) values
  ('tap-club', '2084/85', 2084, 'home', array['#000000'], 'import', 'approved', '/library/tap/2084-85-home.webp'),
  ('tap-club', '2084/85', 2084, 'goalkeeper', array['#000000'], 'import', 'approved', '/library/tap/2084-85-gk.webp'),
  ('tap-club', '2089/90', 2089, 'away', array['#000000'], 'import', 'approved', null),
  ('tap-nation', '2088', 2088, 'home', array['#ffffff'], 'import', 'approved', '/library/tap/2088-home.webp'),
  ('tap-nation', '2092', 2092, 'home', array['#ffffff'], 'import', 'approved', '/library/tap/2092-home.webp'),
  ('tap-islands', '2086', 2086, 'home', array['#00ff00'], 'import', 'approved', '/library/tap/2086-home.webp');

insert into public.kit_legends (legend, kit_id)
  select 'tap-legend', id from public.kits where club_id like 'tap-%' and kind = 'home' and season in ('2084/85', '2088');

set local role anon;
select ok((select count(*) from popular_kits()) <= 3, 'popular today is three kits');
select is((select count(*)::int from era_kits(2080, null, 0, 96) where club_id like 'tap-%'), 2, 'the 2080s hold the pictured outfield kits of the decade');
select is((select count(*)::int from era_kits(2080, 'National Teams', 0, 96) where club_id like 'tap-%'), 1, 'the league narrows the era, and only featured national teams are on the shelves');
select is((select count(*)::int from era_kits(2090, null, 0, 96) where club_id like 'tap-%'), 1, 'each decade has its own kits');
select throws_ok($$select * from era_kits(1995)$$, '22023', 'unknown decade', 'a decade starts at a round year');
select is(
  (select string_agg(season, ',' order by season_year) from legend_kits_for('tap-legend')),
  '2084/85,2088',
  'a legend''s kits are the ones listed for them'
);
select is((select count(*)::int from legend_kits_for('nobody')), 0, 'an unknown legend has none');
reset role;

select is((select region from public.kit_clubs where id = 'brazil'), 'South America', 'national teams have a continent');
select throws_ok($$update public.kit_clubs set region = 'Atlantis' where id = 'tap-nation'$$, '23514', null, 'only known continents');

select * from finish();
rollback;
