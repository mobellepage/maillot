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

-- The marketplace shows every shirt in a collection unless it, or the whole
-- collection, is private; anyone may look.
select plan(6);

select tests.create_user('00000000-0000-4000-a000-0000000e3a01', 'open@market.test');
select tests.create_user('00000000-0000-4000-a000-0000000e3a02', 'closed@market.test');
update profiles set handle = 'open_market' where id = '00000000-0000-4000-a000-0000000e3a01';
update profiles set handle = 'closed_market', collection_private = true where id = '00000000-0000-4000-a000-0000000e3a02';
insert into custom_items (id, user_id, catalog_id, size, visibility, sale_price, photos) values
  ('t-mx-1', '00000000-0000-4000-a000-0000000e3a01', 'juv-9697', 'M', 'public', '', '{}'),
  ('t-mx-2', '00000000-0000-4000-a000-0000000e3a01', 'ajx-95', 'L', 'offers', '', '{}'),
  ('t-mx-3', '00000000-0000-4000-a000-0000000e3a01', 'sui-26', 'M', 'private', '', '{}'),
  ('t-mx-4', '00000000-0000-4000-a000-0000000e3a02', 'ned-88', 'M', 'public', '', '{}');

set local role anon;
select is((select count(*)::int from market_exemplars() where id like 't-mx-%'), 2, 'visitors see the shirts that are not private');
select ok(not exists (select 1 from market_exemplars() where id = 't-mx-3'), 'a private shirt stays out');
select ok(not exists (select 1 from market_exemplars() where id = 't-mx-4'), 'so does a private collection');
select is((select handle from market_exemplars() where id = 't-mx-2'), 'open_market', 'each shows its owner');
select is((select row(club, league, visibility)::text from market_exemplars() where id = 't-mx-2'), '(Ajax,Eredivisie,offers)', 'with the model and its status');
select is((select sale_price from market_exemplars() where id = 't-mx-1'), null, 'no price unless it is for sale');
reset role;

select * from finish();
rollback;
