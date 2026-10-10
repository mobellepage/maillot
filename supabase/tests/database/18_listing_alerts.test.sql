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
create or replace function tests.alerts_for(p_user uuid)
returns int language sql security definer as $$ select count(*)::int from public.notifications where user_id = p_user and type = 'listing_alert' $$;
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

-- wanter wants the Netherlands 1988 shirt in M up to CHF 300; seller lists.
select tests.create_user('00000000-0000-4000-a000-0000000a1e01', 'wanter@test.local');
select tests.create_user('00000000-0000-4000-a000-0000000a1e02', 'seller@test.local');
select tests.create_user('00000000-0000-4000-a000-0000000a1e03', 'bidder@test.local');

select plan(9);

select tests.login('00000000-0000-4000-a000-0000000a1e01');
select lives_ok($$insert into listing_alerts (user_id, shirt_id, size, max_price) values ('00000000-0000-4000-a000-0000000a1e01', 'ned-88', 'M', 300)$$, 'a member sets an alert for a size and price');
select lives_ok($$insert into listing_alerts (user_id, shirt_id) values ('00000000-0000-4000-a000-0000000a1e01', 'juv-9697')$$, 'or for any size and price');
select tests.logout();

insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-0000000a1e02', 'ned-88', 'L', 250);
select is(tests.alerts_for('00000000-0000-4000-a000-0000000a1e01'), 0, 'another size does not alert');
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-0000000a1e02', 'ned-88', 'M', 400);
select is(tests.alerts_for('00000000-0000-4000-a000-0000000a1e01'), 0, 'a price above the limit does not alert');
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-0000000a1e02', 'ned-88', 'M', 280);
select is(tests.alerts_for('00000000-0000-4000-a000-0000000a1e01'), 1, 'a matching listing alerts');
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-0000000a1e02', 'ned-88', 'M', 270);
select is(tests.alerts_for('00000000-0000-4000-a000-0000000a1e01'), 1, 'at most one alert per 10 minutes');

-- A listing that sells on the spot to a waiting bid is not announced.
insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-0000000a1e03', 'juv-9697', 'S', 500);
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-0000000a1e02', 'juv-9697', 'S', 450);
select is(tests.alerts_for('00000000-0000-4000-a000-0000000a1e01'), 1, 'a listing that sold instantly does not alert');
insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-0000000a1e02', 'juv-9697', 'XL', 999);
select is(tests.alerts_for('00000000-0000-4000-a000-0000000a1e01'), 2, 'an any-size alert fires for every size and price');

select tests.login('00000000-0000-4000-a000-0000000a1e02');
select is((select count(*)::int from listing_alerts), 0, 'alerts are private to their owner');
select tests.logout();

select * from finish();
rollback;
