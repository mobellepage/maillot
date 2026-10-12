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

select tests.create_user('00000000-0000-4000-a000-00000003c001', 'ath@test.local');
insert into custom_items (id, user_id, catalog_id, size) values ('t-ath-1', '00000000-0000-4000-a000-00000003c001', 'liv-2526', 'M');
delete from shirt_value_history where catalog_id = 'liv-2526';
insert into shirt_value_history (catalog_id, day, value) values ('liv-2526', current_date - 40, 100), ('liv-2526', current_date - 10, 120), ('liv-2526', current_date, 131);

select plan(3);

select ok(notify_all_time_highs() >= 1, 'an all-time high is reported');
select is((select body from notifications where user_id = '00000000-0000-4000-a000-00000003c001' and type = 'all_time_high'), 'Liverpool 2025/26 Home is now worth about CHF 131 — more than ever before.', 'with the shirt and its value');
select notify_all_time_highs();
select is((select count(*)::int from notifications where user_id = '00000000-0000-4000-a000-00000003c001' and type = 'all_time_high'), 1, 'once per shirt a month');

select * from finish();
rollback;
