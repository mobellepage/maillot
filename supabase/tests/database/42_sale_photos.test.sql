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

-- Selling needs the front and the back (quick listing, "self-reported");
-- badge, inner label and print are what the pre-check wants for "pre-checked".
select plan(7);

select tests.create_user('00000000-0000-4000-a000-0000000e5a01', 'seller@salephotos.test');
insert into custom_items (id, user_id, catalog_id, size, visibility, flock, photos) values
  ('t-sp-1', '00000000-0000-4000-a000-0000000e5a01', 'ajx-95', 'M', 'public', '{"source":"Keine"}', '{"front":{"path":"a/front.jpg"}}');

select is(private.sale_photos_missing('{"front":{},"back":{}}', '{"source":"Keine"}'), array['crest', 'product_code'], 'the pre-check still wants badge and label');
select is(private.sale_photos_missing('{"front":{},"back":{},"crest":{},"product_code":{}}', '{"source":"Spielername & Nummer"}'), array['flock_closeup'], 'and the print on a printed shirt');
select throws_ok($$update custom_items set visibility = 'forsale' where id = 't-sp-1'$$, '23514', 'sale_photos_missing', 'the front alone is not enough to sell');
select lives_ok($$update custom_items set visibility = 'offers' where id = 't-sp-1'$$, 'offers need no more than the collection');
update custom_items set photos = photos || '{"back":{"path":"a/back.jpg"}}' where id = 't-sp-1';
select lives_ok($$update custom_items set visibility = 'forsale' where id = 't-sp-1'$$, 'front and back are enough to list it quickly');
select lives_ok($$update custom_items set photos = '{}', visibility = 'forsale' where id = 't-sp-1'$$, 'a shirt already on sale is not checked again');
select lives_ok($$insert into custom_items (id, user_id, catalog_id, size, visibility, photos) values ('t-sp-2', '00000000-0000-4000-a000-0000000e5a01', 'juv-9697', 'M', 'forsale', '{"front":{"path":"b/front.jpg"},"back":{"path":"b/back.jpg"}}')$$, 'or added straight for sale');

select * from finish();
rollback;
