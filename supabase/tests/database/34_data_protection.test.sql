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

select tests.create_user('00000000-0000-4000-a000-0000000dd001', 'seller@protect.test');
select tests.create_user('00000000-0000-4000-a000-0000000dd002', 'reader@protect.test');
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-0000000dd001', 'boc-81', 'XL', 333);
delete from shirt_value_history where catalog_id = 'boc-81';
insert into shirt_value_history (catalog_id, day, value) select 'boc-81', current_date - d, 100 + d from generate_series(0, 200) d;
-- A fresh visitor (no rate-limit history).
select set_config('request.headers', '{"x-forwarded-for": "203.0.113.77"}', true);
delete from private.rate_limits where key like 'read:%203.0.113.7_';

select plan(14);

set local role anon;
select throws_ok($$select count(*) from shirt_valuations$$, '42501', null, 'visitors cannot read market values directly');
select throws_ok($$select count(*) from shirt_value_history$$, '42501', null, 'nor the value history');
select throws_ok($$select count(*) from market_comps$$, '42501', null, 'nor the comparables');
select throws_ok($$select count(*) from catalog_shirts$$, '42501', null, 'nor the catalogue table');
select throws_ok($$select count(*) from asks$$, '42501', null, 'nor all listings');
select throws_ok($$select count(*) from kits$$, '42501', null, 'nor the kit library table');
select is((select count(*)::int from value_history(array['boc-81'], 400)), 36, 'visitors see about a month of history, however much they ask for');
select is((select amount from open_asks('boc-81', 'XL')), 333::numeric, 'the order book of one shirt is there');
reset role;

select tests.login('00000000-0000-4000-a000-0000000dd002');
select is((select count(*)::int from asks), 0, 'members don’t see other people’s listings directly');
select is((select count(*)::int from value_history(array['boc-81'], 400)), 201, 'members see the longer history');
select tests.logout();

select tests.login('00000000-0000-4000-a000-0000000dd001');
select is((select count(*)::int from asks where shirt_id = 'boc-81'), 1, 'sellers still see their own listings');
select tests.logout();

-- A scraper hammering the API runs into the limit.
set local role anon;
select set_config('request.headers', '{"x-forwarded-for": "203.0.113.78"}', true);
select lives_ok($$select count(*) from (select public_valuations() from generate_series(1, 119)) x$$, 'normal use stays under the limit');
select throws_ok($$select count(*) from (select public_valuations() from generate_series(1, 5)) x$$, 'P0429', null, 'then it is throttled');
reset role;
select is((select count(*)::int from private.canaries), 3, 'trap entries are on record');

select * from finish();
rollback;
