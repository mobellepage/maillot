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
create or replace function tests.login(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  execute 'set local role authenticated';
end $$;
create or replace function tests.logout()
returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

-- From CHF 500, or match-issued / match-worn, a sale waits for expert
-- authentication — which hasn't started: nobody can make an offer yet.
select plan(6);

select tests.create_user('00000000-0000-4000-a000-0000000ea001', 'owner@expert.test');
select tests.create_user('00000000-0000-4000-a000-0000000ea002', 'buyer@expert.test');
update profiles set handle = 'expert_owner' where id = '00000000-0000-4000-a000-0000000ea001';
insert into custom_items (id, user_id, catalog_id, size, version, visibility, sale_price, photos) values
  ('t-ea-cheap', '00000000-0000-4000-a000-0000000ea001', 'juv-9697', 'M', 'Fan-Replica', 'forsale', '300', '{"front":{},"back":{}}'),
  ('t-ea-dear', '00000000-0000-4000-a000-0000000ea001', 'bra-70', 'M', 'Fan-Replica', 'forsale', '650', '{"front":{},"back":{}}'),
  ('t-ea-worn', '00000000-0000-4000-a000-0000000ea001', 'acm-0607', 'L', 'Match-Worn', 'offers', '', '{"front":{},"back":{}}');

select is((select string_agg(id || '=' || needs_auth, ',' order by id) from market_exemplars() where id like 't-ea-%'), 't-ea-cheap=false,t-ea-dear=true,t-ea-worn=true', 'the marketplace knows which shirts wait for authentication');

select tests.login('00000000-0000-4000-a000-0000000ea002');
select lives_ok($$select make_collection_offer('t-ea-cheap', 280)$$, 'below the threshold, offers work');
select throws_ok($$select make_collection_offer('t-ea-dear', 600)$$, 'P0451', null, 'from CHF 500 they wait for authentication');
select throws_ok($$select make_collection_offer('t-ea-worn', 200)$$, 'P0451', null, 'a match-worn shirt too, whatever its price');
select tests.logout();

update custom_items set verification = '{"level":"expert","status":"verifiziert","reason":"","reviewId":null}' where id = 't-ea-worn';
select is((select needs_auth from market_exemplars() where id = 't-ea-worn'), false, 'an expert-verified shirt is done');
select tests.login('00000000-0000-4000-a000-0000000ea002');
select lives_ok($$select make_collection_offer('t-ea-worn', 200)$$, 'and can receive offers');
select tests.logout();

select * from finish();
rollback;
