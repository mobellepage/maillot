begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

create schema if not exists tests;
create or replace function tests.create_user(p_id uuid, p_email text)
returns uuid language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email);
  return p_id;
end $$;
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

-- Comparables for the Netherlands 1988 shirt (catalogue index CHF 310).
delete from market_comps where catalog_id in ('ned-88', 'sui-26');
insert into market_comps (source, external_id, catalog_id, marketplace, kind, match, edition, condition, title, price, currency, price_chf) values
  ('ebay', 'a', 'ned-88', 'EBAY_DE', 'listing', 'exact', 'replica', 'used', 'Holland 1988 Trikot', 340, 'CHF', 340),
  ('ebay', 'b', 'ned-88', 'EBAY_DE', 'listing', 'exact', 'replica', 'unknown', 'Holland 1988 Trikot', 360, 'CHF', 360),
  ('ebay', 'c', 'ned-88', 'EBAY_GB', 'listing', 'exact', 'replica', 'unknown', 'Netherlands 1988 shirt', 380, 'CHF', 380),
  ('ebay', 'd', 'ned-88', 'EBAY_GB', 'listing', 'exact', 'replica', 'unknown', 'Netherlands 1988 shirt', 400, 'CHF', 400),
  ('ebay', 'e', 'ned-88', 'EBAY_FR', 'listing', 'exact', 'replica', 'new_with_tags', 'Pays-Bas 1988 neuf', 460, 'CHF', 460),
  ('ebay', 'f', 'ned-88', 'EBAY_IT', 'listing', 'exact', 'replica', 'unknown', 'Olanda 1988 dream', 5000, 'CHF', 5000),
  ('ebay', 'g', 'ned-88', 'EBAY_DE', 'listing', 'similar', 'replica', 'unknown', 'Holland 1988 Auswärts', 150, 'CHF', 150),
  ('ebay', 'h', 'ned-88', 'EBAY_DE', 'listing', 'exact', 'match_worn', 'used', 'Holland 1988 matchworn', 1000, 'CHF', 1000);
update market_comps set seen_at = now() - interval '30 days' where external_id = 'h';

select plan(14);

select lives_ok($$ select refresh_shirt_valuations() $$, 'valuations can be computed for the whole catalogue');
select ok((select value between 295 and 330 from shirt_valuations where catalog_id = 'ned-88'), 'the value follows the comparables (asking prices discounted), not the outlier');
select is((select n_exact from shirt_valuations where catalog_id = 'ned-88'), 5, 'the CHF 5,000 outlier and the stale listing are left out');
select is((select n_similar from shirt_valuations where catalog_id = 'ned-88'), 1, 'a related shirt counts, weakly');
select is((select confidence from shirt_valuations where catalog_id = 'ned-88'), 'medium', 'five comparables give medium confidence');
select ok((select low < value and value < high from shirt_valuations where catalog_id = 'ned-88'), 'the range brackets the value');

select is((select value from shirt_valuations where catalog_id = 'sui-26'), 95::numeric, 'without evidence the index price stands');
select ok((select low <= 81 and high >= 109 and confidence = 'low' from shirt_valuations where catalog_id = 'sui-26'), '…with a wide range and low confidence');

-- A completed sale on MAILLOT moves the value at once.
select tests.create_user('00000000-0000-4000-a000-00000000a11c', 'alice@test.local');
select tests.create_user('00000000-0000-4000-a000-000000000b0b', 'bob@test.local');
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-000000000b0b', 'sui-26', 'L', 160);
insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000a11c', 'sui-26', 'L', 160);
update orders set status = 'released', paid_at = now(), shipped_at = now(), released_at = now()
 where id = (select id from orders where shirt_id = 'sui-26' and size = 'L' order by created_at desc limit 1);
select ok((select n_trades = 1 and value > 95 from shirt_valuations where catalog_id = 'sui-26'), 'a released order revalues its shirt');

set local role anon;
select ok((select count(*) > 0 from shirt_valuations) and (select count(*) > 0 from market_comps), 'values and comparables are public');
select throws_ok($$ insert into market_comps (source, external_id, catalog_id, marketplace, kind, match, title, price, currency, price_chf) values ('ebay','x','ned-88','EBAY_DE','listing','exact','x',1,'CHF',1) $$, '42501', null, '…but only the collector writes comparables');
select throws_ok($$ select refresh_shirt_valuations() $$, '42501', null, '…and visitors can’t trigger recomputation');
reset role;

delete from market_comp_runs;
select isnt(start_market_comp_run(), null, 'a collection run can start');
select is(start_market_comp_run(), null, '…but at most once in 20 hours');

select * from finish();
rollback;
