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

select tests.create_user('00000000-0000-4000-a000-0000000ee701', 'weekly@test.local');
insert into custom_items (id, user_id, catalog_id, size) values
  ('t-week-1', '00000000-0000-4000-a000-0000000ee701', 'yb-2526', 'M'),
  ('t-week-2', '00000000-0000-4000-a000-0000000ee701', 'bas-2526', 'L');
-- Values a week apart, as the latest days on record for these shirts.
insert into shirt_value_history (catalog_id, day, value) values
  ('yb-2526', current_date + 30, 110), ('yb-2526', current_date + 22, 100),
  ('bas-2526', current_date + 30, 95), ('bas-2526', current_date + 22, 90)
on conflict (catalog_id, day) do update set value = excluded.value;

select plan(4);

select ok(notify_collection_week() >= 1, 'the weekly recap goes out');
select is((select title from notifications where user_id = '00000000-0000-4000-a000-0000000ee701' and type = 'collection_week'), 'Your collection went up this week', 'it says the collection went up');
select is((select data::text from notifications where user_id = '00000000-0000-4000-a000-0000000ee701' and type = 'collection_week'), '{"delta": 15, "amount": 205, "change_pct": 7.9}', 'with the total, the change and the percentage');
select notify_collection_week();
select is((select count(*)::int from notifications where user_id = '00000000-0000-4000-a000-0000000ee701' and type = 'collection_week'), 1, 'at most once a week');

select * from finish();
rollback;
