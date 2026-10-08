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

-- dana shows two shirts (one with a studio photo) and keeps one private;
-- danny only has private shirts; erik has a live listing but no shirts.
select tests.create_user('00000000-0000-4000-a000-00000000da0a', 'dana@test.local');
select tests.create_user('00000000-0000-4000-a000-00000000da0b', 'danny@test.local');
select tests.create_user('00000000-0000-4000-a000-00000000e41c', 'erik@test.local');
update profiles set handle = 'dana_kits' where id = '00000000-0000-4000-a000-00000000da0a';
update profiles set handle = 'danny_private' where id = '00000000-0000-4000-a000-00000000da0b';
update profiles set handle = 'erik_dan' where id = '00000000-0000-4000-a000-00000000e41c';

insert into custom_items (id, user_id, catalog_id, visibility, size, flock, condition, verification, photos, valuation, provenance, created_at) values
  ('t-dana-1', '00000000-0000-4000-a000-00000000da0a', 'sui-26', 'public', 'M', '{"source":"official","name":"XHAKA","number":"10"}', '{"grade":9,"defects":[]}',
   '{"level":"expert","status":"verifiziert","reason":"","reviewId":null}',
   '{"front":{"path":"00000000-0000-4000-a000-00000000da0a/items/t1/front.jpg","thumbPath":"00000000-0000-4000-a000-00000000da0a/items/t1/front_thumb.jpg"},"front_studio":{"path":"00000000-0000-4000-a000-00000000da0a/items/t1/studio.jpg","thumbPath":"00000000-0000-4000-a000-00000000da0a/items/t1/studio_thumb.jpg"},"product_code":{"path":"00000000-0000-4000-a000-00000000da0a/items/t1/label.jpg"}}',
   '{"blocked":false,"mid":240}', 'Bought at the stadium', now() - interval '2 days'),
  ('t-dana-2', '00000000-0000-4000-a000-00000000da0a', null, 'forsale', 'L', '{"source":"none"}', '{"grade":7,"defects":[]}', default,
   '{"front":{"path":"00000000-0000-4000-a000-00000000da0a/items/t2/front.jpg","thumbPath":"00000000-0000-4000-a000-00000000da0a/items/t2/front_thumb.jpg"}}',
   null, '', now() - interval '1 day'),
  ('t-dana-3', '00000000-0000-4000-a000-00000000da0a', 'acm-0607', 'private', 'S', '{"source":"none"}', '{"grade":8,"defects":[]}', default,
   '{"front":{"path":"00000000-0000-4000-a000-00000000da0a/items/t3/front.jpg"}}', null, '', now()),
  ('t-danny-1', '00000000-0000-4000-a000-00000000da0b', 'ars-91', 'private', 'M', '{"source":"none"}', '{"grade":8,"defects":[]}', default, '{}', null, '', now());
update custom_items set proposed_club = 'FC Thun', proposed_season = '1955' where id = 't-dana-2';
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000e41c', 'sui-26', 'XL', 150);

select plan(14);

set local role anon;
select is((select array_agg(handle order by handle) from search_collectors('dan')), array['dana_kits', 'erik_dan'], 'search finds members who show something, never ones with only private shirts');
select is((select handle from search_collectors('@DANA_KITS') limit 1), 'dana_kits', 'a leading @ and case are ignored; the exact match comes first');
select is((select row(shirts, listings)::text from search_collectors('dana_kits')), '(2,0)', 'counts only visible shirts');
select is((select preview from search_collectors('dana_kits')), array['sui-26'], 'previews only catalogued, visible shirts');
select is((select count(*)::int from search_collectors('d')), 0, 'one character is not a search');
select is((select count(*)::int from search_collectors('danny')), 0, 'a member with only private shirts cannot be found');

select is((select array_agg(id order by added_at) from public_collection('Dana_Kits')), array['t-dana-1', 't-dana-2'], 'the collection lists visible shirts, newest last here, never private ones');
select is((select row(player_name, player_number, grade, verified, photo_path)::text from public_collection('dana_kits') where id = 't-dana-1'),
          '(XHAKA,10,9,t,00000000-0000-4000-a000-00000000da0a/items/t1/studio.jpg)', 'player, condition, verification and the studio photo come along');
select is((select row(club, season, photo_path)::text from public_collection('dana_kits') where id = 't-dana-2'),
          '("FC Thun",1955,00000000-0000-4000-a000-00000000da0a/items/t2/front.jpg)', 'uncatalogued shirts show their own name; without a studio photo the front is shown');
select is((select count(*)::int from public_collection('danny_private')), 0, 'private shirts stay private');

select ok(is_visible_vault_photo('00000000-0000-4000-a000-00000000da0a/items/t1/studio_thumb.jpg'), 'the main picture of a visible shirt is readable');
select ok(not is_visible_vault_photo('00000000-0000-4000-a000-00000000da0a/items/t1/front.jpg'), 'its original front photo is not, once there is a studio photo');
select ok(not is_visible_vault_photo('00000000-0000-4000-a000-00000000da0a/items/t1/label.jpg'), 'nor the label photo');
select ok(not is_visible_vault_photo('00000000-0000-4000-a000-00000000da0a/items/t3/front.jpg'), 'nor any photo of a private shirt');
reset role;

select * from finish();
rollback;
