begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- ---- helpers (inlined so every file is self-contained) --------------------
create schema if not exists tests;
create or replace function tests.create_user(p_id uuid, p_email text)
returns uuid language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email);
  return p_id;
end $$;

-- A shirt in the collection needs front and back; selling it needs badge,
-- inner label and, if it has one, the print as well.
select plan(7);

select tests.create_user('00000000-0000-4000-a000-0000000e5a01', 'seller@salephotos.test');
insert into custom_items (id, user_id, catalog_id, size, visibility, flock, photos) values
  ('t-sp-1', '00000000-0000-4000-a000-0000000e5a01', 'ajx-95', 'M', 'public', '{"source":"Keine"}', '{"front":{"path":"a/front.jpg"},"back":{"path":"a/back.jpg"}}');

select is(private.sale_photos_missing('{"front":{},"back":{}}', '{"source":"Keine"}'), array['crest', 'product_code'], 'badge and label are missing');
select is(private.sale_photos_missing('{"front":{},"back":{},"crest":{},"product_code":{}}', '{"source":"Spielername & Nummer"}'), array['flock_closeup'], 'a printed shirt also needs the print');
select throws_ok($$update custom_items set visibility = 'forsale' where id = 't-sp-1'$$, '23514', 'sale_photos_missing', 'front and back are not enough to sell');
select throws_ok($$update custom_items set visibility = 'offers' where id = 't-sp-1'$$, '23514', 'sale_photos_missing', 'nor to take offers');
select lives_ok($$update custom_items set visibility = 'private' where id = 't-sp-1'$$, 'they are enough for the collection');
update custom_items set photos = photos || '{"crest":{"path":"a/crest.jpg"},"product_code":{"path":"a/label.jpg"}}' where id = 't-sp-1';
select lives_ok($$update custom_items set visibility = 'forsale' where id = 't-sp-1'$$, 'with badge and label it can be sold');
select lives_ok($$update custom_items set photos = '{}' , visibility = 'offers' where id = 't-sp-1'$$, 'a shirt already on sale is not checked again');

select * from finish();
rollback;
