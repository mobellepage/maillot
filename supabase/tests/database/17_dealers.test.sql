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

-- shop is the pilot dealer, priv a private seller, fan buys, boss is an admin.
select tests.create_user('00000000-0000-4000-a000-00000000d0a1', 'shop@test.local');
select tests.create_user('00000000-0000-4000-a000-00000000d0a2', 'priv@test.local');
select tests.create_user('00000000-0000-4000-a000-00000000d0a3', 'fan@test.local');
select tests.create_user('00000000-0000-4000-a000-00000000d0a4', 'boss@test.local');
update profiles set handle = 'pilot_shop' where id = '00000000-0000-4000-a000-00000000d0a1';
update profiles set handle = 'private_seller' where id = '00000000-0000-4000-a000-00000000d0a2';
update profiles set is_admin = true where id = '00000000-0000-4000-a000-00000000d0a4';

select plan(11);

select tests.login('00000000-0000-4000-a000-00000000d0a1');
select throws_ok($$select admin_set_dealer('pilot_shop', true, 0.01)$$, '42501', 'admins only', 'members cannot make themselves dealers');
select throws_ok($$update profiles set commission_rate = 0 where id = '00000000-0000-4000-a000-00000000d0a1'$$, '42501', null, 'nor change their own commission');
select tests.logout();

select tests.login('00000000-0000-4000-a000-00000000d0a4');
select throws_ok($$select admin_set_dealer('pilot_shop', true, 0.5)$$, '22023', null, 'rates above 30 % are refused');
select throws_ok($$select admin_set_dealer('nobody_here', true, 0.05)$$, 'P0002', 'no such member', 'unknown handles are refused');
select lives_ok($$select admin_set_dealer('PILOT_SHOP', true, 0.05)$$, 'an admin makes a shop a verified dealer with a pilot rate');
select is((select row(handle, commission_rate)::text from admin_dealers()), '(pilot_shop,0.0500)', 'the admin panel lists dealers with their rate');
select tests.logout();

-- A sale by the dealer and one by a private seller.
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000d0a1', 'bra-70', 'XL', 200);
insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000d0a3', 'bra-70', 'XL', 200);
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000d0a2', 'boc-81', 'XL', 200);
insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000d0a3', 'boc-81', 'XL', 200);
select is((select commission from orders where seller_id = '00000000-0000-4000-a000-00000000d0a1'), 10::numeric, 'the dealer pays their pilot rate (5 % of 200)');
select is((select commission from orders where seller_id = '00000000-0000-4000-a000-00000000d0a2'), 16::numeric, 'everyone else the standard 8 %');

-- Still listing something, so the shop can be found.
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000d0a1', 'ned-88', 'S', 300);

set local role anon;
select is((select dealer from collector_profile('pilot_shop')), true, 'profiles show the dealer badge');
select is((select dealer from seller_cards(array['00000000-0000-4000-a000-00000000d0a1'::uuid, '00000000-0000-4000-a000-00000000d0a2'::uuid]) where handle = 'pilot_shop'), true, 'so do seller cards on product pages');
select is((select dealer from search_collectors('pilot_shop')), true, 'and search results');
reset role;

select * from finish();
rollback;
