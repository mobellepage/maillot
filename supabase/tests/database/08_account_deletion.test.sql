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
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  execute 'set local role authenticated';
end $$;
create or replace function tests.logout()
returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;
create or replace function tests.order_for(p_shirt text, p_size text)
returns public.orders language sql security definer as $$ select * from public.orders where shirt_id = p_shirt and size = p_size order by created_at desc limit 1 $$;
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

-- alice buys bob's shirt
select tests.create_user('00000000-0000-4000-a000-00000000a11c', 'alice@test.local');
select tests.create_user('00000000-0000-4000-a000-000000000b0b', 'bob@test.local');
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-000000000b0b', 'sui-26', 'L', 90);
insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000a11c', 'sui-26', 'L', 90);
insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000a11c', 'ars-91', 'M', 50);

select plan(15);

select tests.login('00000000-0000-4000-a000-00000000a11c');
select is((select open_orders from account_deletion_blockers()), 1, 'an unpaid order is an open order');
select throws_ok($$ select prepare_account_deletion() $$, 'P0409', null, 'no deletion while an order is open');
select tests.logout();

update orders set status = 'released', paid_at = now(), shipped_at = now() where id = (tests.order_for('sui-26', 'L')).id;
insert into order_addresses (order_id, ship_to) values ((tests.order_for('sui-26', 'L')).id, '{"name":"Alice","city":"Bern"}');

select tests.login('00000000-0000-4000-a000-000000000b0b');
select is((select open_orders from account_deletion_blockers()), 0, 'completed orders do not block');
select tests.login('00000000-0000-4000-a000-00000000a11c');
select lives_ok($$ select prepare_account_deletion() $$, 'the buyer can start deleting their account');
select tests.logout();

select is((select count(*)::int from order_addresses where order_id = (tests.order_for('sui-26', 'L')).id), 0, 'their shipping address is gone');
select ok(exists (select 1 from audit_log where action = 'account.delete' and target = '00000000-0000-4000-a000-00000000a11c'), 'the deletion is audit-logged');

-- what the edge function does last
select lives_ok($$ delete from auth.users where id = '00000000-0000-4000-a000-00000000a11c' $$, 'the user can be deleted even with past orders');
select is((select buyer_id from orders where id = (tests.order_for('sui-26', 'L')).id), null, 'the order stays for the books, without the person');
select is((select seller_id from orders where id = (tests.order_for('sui-26', 'L')).id), '00000000-0000-4000-a000-000000000b0b'::uuid, '…and the other side keeps it');
select is((select count(*)::int from profiles where id = '00000000-0000-4000-a000-00000000a11c'), 0, 'the profile is gone');
select is((select count(*)::int from bids where user_id = '00000000-0000-4000-a000-00000000a11c'), 0, 'their open bids are gone');

-- the seller leaves too: the sale still exists for the books
select tests.login('00000000-0000-4000-a000-000000000b0b');
select lives_ok($$ select prepare_account_deletion() $$, 'the seller can start deleting their account');
select tests.logout();
select lives_ok($$ delete from auth.users where id = '00000000-0000-4000-a000-000000000b0b' $$, 'the seller can be deleted after a sale');
select is((select count(*)::int from orders where id = (select id from orders where shirt_id = 'sui-26' and size = 'L' and buyer_id is null and seller_id is null order by created_at desc limit 1)), 1, 'the anonymous sale remains');

set local role anon;
select throws_ok($$ select prepare_account_deletion() $$, '42501', null, 'signed-out visitors cannot call it');
reset role;

select * from finish();
rollback;
