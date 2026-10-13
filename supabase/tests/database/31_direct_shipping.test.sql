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
create or replace function tests.the_order()
returns public.orders language sql security definer as $$ select * from public.orders where shirt_id = 'ajx-95' and size = 'XS' $$;
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

-- seller ships straight to buyer; an outsider sees nothing of it
select tests.create_user('00000000-0000-4000-a000-0000000d5e11', 'seller@direct.test');
select tests.create_user('00000000-0000-4000-a000-0000000d5b01', 'buyer@direct.test');
select tests.create_user('00000000-0000-4000-a000-0000000d5077', 'outsider@direct.test');
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-0000000d5e11', 'ajx-95', 'XS', 150);
insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-0000000d5b01', 'ajx-95', 'XS', 150);
update orders set status = 'paid_escrow', paid_at = now() where id = (tests.the_order()).id;

select plan(10);

select is((tests.the_order()).inspection, 'not_required', 'without a centre every order ships directly');
select is((tests.the_order()).auth_fee, 0::numeric, 'and carries no authentication fee');

select tests.login('00000000-0000-4000-a000-0000000d5e11');
select throws_ok(format('select order_mark_shipped(%L, %L, %L, %L)', (tests.the_order()).id, '', 'post', '[{"path": "00000000-0000-4000-a000-0000000d5e11/orders/a/shirt.jpg"}]'), '22023', 'tracking number required', 'a tracking number is required');
select throws_ok(format('select order_mark_shipped(%L, %L, %L, %L)', (tests.the_order()).id, 'RR1CH', null, '[{"path": "00000000-0000-4000-a000-0000000d5e11/orders/a/shirt.jpg"}]'), '22023', 'carrier required', 'a carrier is required');
select lives_ok(format('select order_mark_shipped(%L, %L, %L, %L)', (tests.the_order()).id, 'RR1CH', 'post', '[{"path": "00000000-0000-4000-a000-0000000d5e11/orders/a/shirt.jpg", "thumbPath": "00000000-0000-4000-a000-0000000d5e11/orders/a/shirt_thumb.jpg"}]'), 'the seller ships with a photo');
select tests.logout();

select tests.login('00000000-0000-4000-a000-0000000d5b01');
select ok(is_order_photo_for_me('00000000-0000-4000-a000-0000000d5e11/orders/a/shirt_thumb.jpg'), 'the buyer can see the shipping photo');
select ok(not is_order_photo_for_me('00000000-0000-4000-a000-0000000d5e11/items/other.jpg'), 'but nothing else in the seller''s folder');
select lives_ok(format('select order_mark_delivered(%L)', (tests.the_order()).id), 'the parcel arrived');
select lives_ok(format('select order_open_dispute(%L, %L)', (tests.the_order()).id, 'Looks counterfeit'), 'a problem can still be reported after delivery');
select tests.logout();

select tests.login('00000000-0000-4000-a000-0000000d5077');
select ok(not is_order_photo_for_me('00000000-0000-4000-a000-0000000d5e11/orders/a/shirt.jpg'), 'outsiders cannot see order photos');
select tests.logout();

select * from finish();
rollback;
