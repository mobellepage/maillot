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

-- The feed tells what happens to shirts in collections, and forgets a shirt
-- the moment it is made private.
select plan(7);

select tests.create_user('00000000-0000-4000-a000-0000000fe001', 'feed@events.test');
update profiles set handle = 'feed_events' where id = '00000000-0000-4000-a000-0000000fe001';
insert into custom_items (id, user_id, catalog_id, size, visibility, photos) values
  ('t-fe-1', '00000000-0000-4000-a000-0000000fe001', 'ajx-95', 'M', 'public', '{"front":{},"back":{},"crest":{},"product_code":{}}');

select is((select string_agg(event_kind, ',') from feed_events() where id = 't-fe-1'), 'added', 'adding a shirt is news');
update custom_items set visibility = 'offers' where id = 't-fe-1';
select ok(exists (select 1 from feed_events() where id = 't-fe-1' and event_kind = 'offers'), 'so is opening it to offers');
update custom_items set visibility = 'forsale', sale_price = '300' where id = 't-fe-1';
update custom_items set sale_price = '250' where id = 't-fe-1';
select is((select row(old_price, new_price)::text from feed_events() where id = 't-fe-1' and event_kind = 'price_drop'), '(300,250)', 'and a lower price');
update custom_items set sale_price = '280' where id = 't-fe-1';
select is((select count(*)::int from feed_events() where id = 't-fe-1' and event_kind = 'price_drop'), 1, 'a higher price is not');
update custom_items set verification = '{"level":"expert","status":"verifiziert","reason":"","reviewId":null}' where id = 't-fe-1';
select ok(exists (select 1 from feed_events() where id = 't-fe-1' and event_kind = 'verified'), 'a verification is news');
update custom_items set visibility = 'private' where id = 't-fe-1';
select is((select count(*)::int from feed_events() where id = 't-fe-1'), 0, 'a private shirt leaves the feed with all its news');

set local role anon;
select throws_ok($$select * from collection_events$$, '42501', null, 'the log itself is not readable');
reset role;

select * from finish();
rollback;
