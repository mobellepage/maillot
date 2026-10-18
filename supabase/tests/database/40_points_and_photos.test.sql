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

-- Collector points for shirts bought through Maillot, and profile photos.
select plan(8);

select tests.create_user('00000000-0000-4000-a000-0000000c0b01', 'buyer@points.test');
select tests.create_user('00000000-0000-4000-a000-0000000c0b02', 'seller@points.test');
insert into orders (id, buyer_id, seller_id, shirt_id, size, amount, status) values
  ('00000000-0000-4000-a000-0000000c0d01', '00000000-0000-4000-a000-0000000c0b01', '00000000-0000-4000-a000-0000000c0b02', 'ger-26', 'M', 140, 'paid_escrow');

update orders set status = 'delivered' where id = '00000000-0000-4000-a000-0000000c0d01';
select is((select count(*)::int from collector_points where order_id = '00000000-0000-4000-a000-0000000c0d01'), 0, 'no points before the purchase is complete');
update orders set status = 'released' where id = '00000000-0000-4000-a000-0000000c0d01';
select is((select points from collector_points where order_id = '00000000-0000-4000-a000-0000000c0d01'), 240, 'a completed purchase earns 100 points plus 1 per franc');

select tests.login('00000000-0000-4000-a000-0000000c0b01');
select is((select total || '/' || purchases from my_collector_points()), '240/1', 'the buyer sees their points');
select throws_ok($$insert into collector_points (user_id, points, reason) values ('00000000-0000-4000-a000-0000000c0b01', 99999, 'purchase')$$, '42501', null, 'members cannot give themselves points');
select tests.logout();
select tests.login('00000000-0000-4000-a000-0000000c0b02');
select is((select total from my_collector_points()), 0, 'the seller earns none for it');
select tests.logout();

update orders set status = 'refunded' where id = '00000000-0000-4000-a000-0000000c0d01';
select is((select count(*)::int from collector_points where order_id = '00000000-0000-4000-a000-0000000c0d01'), 0, 'a refund takes the points back');

-- Profile photos: your own folder only.
select tests.login('00000000-0000-4000-a000-0000000c0b01');
select lives_ok($$update profiles set avatar = 'photo:00000000-0000-4000-a000-0000000c0b01/avatar-1.jpg' where id = '00000000-0000-4000-a000-0000000c0b01'$$, 'a member sets their own photo');
select throws_ok($$update profiles set avatar = 'photo:00000000-0000-4000-a000-0000000c0b02/avatar-1.jpg' where id = '00000000-0000-4000-a000-0000000c0b01'$$, '42501', null, 'but not someone else''s');
select tests.logout();

select * from finish();
rollback;
