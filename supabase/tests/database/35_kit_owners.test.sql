begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- Seed: @zurich_kits has an Ajax 1994/95 open to offers and a Real Madrid
-- 2026/27 shown as not for sale (inquiries welcome).
select plan(8);

select is((select row(club_id, season, kind)::text from private.kit_slot('YB', '2018-19', 'Away Kit')), '(young-boys,2018/19,away)', 'short names, dashes and kit words are understood');
select is((select season from private.kit_slot('AC Milan', '2006–2007', 'GK')), '2006/07', 'a four-digit second year is shortened');
select is((select kind from private.kit_slot('Real Madrid', '2026/27', 'Real Madrid 2026/27 Home')), 'home', 'home when nothing else is said');
select is((select count(*)::int from private.kit_slot('Nowhere FC', '2001', 'Home')), 0, 'unknown clubs match nothing');

set local role anon;
select is((select handle || ':' || visibility || ':' || can_ask from library_kit_owners('ajax') where item_id = 'seed-ajax-offers'), 'zurich_kits:offers:true', 'a shirt open to offers shows under its library kit');
select is((select can_ask from library_kit_owners('real-madrid') where item_id = 'seed-piece'), true, 'a shirt not for sale can still be asked about');
reset role;

update public.custom_items set visibility = 'private' where id = 'seed-piece';
set local role anon;
select is((select count(*)::int from library_kit_owners('real-madrid') where item_id = 'seed-piece'), 0, 'private shirts never show');
reset role;

update public.custom_items set visibility = 'public' where id = 'seed-piece';
update public.profiles set collection_private = true where handle = 'zurich_kits';
set local role anon;
select is((select count(*)::int from library_kit_owners('ajax')), 0, 'nor do shirts of a private collection');
reset role;

select * from finish();
rollback;
