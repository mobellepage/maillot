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

select tests.create_user('00000000-0000-4000-a000-00000005e001', 'quietfan@test.local');

select plan(5);

select tests.login('00000000-0000-4000-a000-00000005e001');
select lives_ok($$update profiles set notification_prefs = '{"value": false}' where id = '00000000-0000-4000-a000-00000005e001'$$, 'a member switches value news off');
select tests.logout();

insert into notifications (user_id, type, title) values
  ('00000000-0000-4000-a000-00000005e001', 'price_move', 'Your shirt went up'),
  ('00000000-0000-4000-a000-00000005e001', 'collection_week', 'Your collection went up this week'),
  ('00000000-0000-4000-a000-00000005e001', 'new_follower', 'New follower'),
  ('00000000-0000-4000-a000-00000005e001', 'collection_offer', 'New offer for your shirt'),
  ('00000000-0000-4000-a000-00000005e001', 'order_paid', 'Payment received');
select is((select count(*)::int from notifications where user_id = '00000000-0000-4000-a000-00000005e001' and type in ('price_move', 'collection_week')), 0, 'value news stay away');
select is((select count(*)::int from notifications where user_id = '00000000-0000-4000-a000-00000005e001' and type = 'new_follower'), 1, 'other groups still arrive');
select is((select count(*)::int from notifications where user_id = '00000000-0000-4000-a000-00000005e001' and type in ('collection_offer', 'order_paid')), 2, 'offers and orders always arrive');

update profiles set notification_prefs = '{"value": false, "social": false, "wanted": false}' where id = '00000000-0000-4000-a000-00000005e001';
insert into notifications (user_id, type, title) values ('00000000-0000-4000-a000-00000005e001', 'inquiry', 'Someone is interested in your shirt');
select is((select count(*)::int from notifications where user_id = '00000000-0000-4000-a000-00000005e001' and type = 'inquiry'), 1, 'even with everything off, inquiries arrive');

select * from finish();
rollback;
