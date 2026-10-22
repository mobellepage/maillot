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

-- The print wanted on a wishlist kit can be corrected — only on one's own wish.
select plan(3);

select tests.create_user('00000000-0000-4000-a000-0000000bd001', 'wish@print.test');
select tests.create_user('00000000-0000-4000-a000-0000000bd002', 'nosy@print.test');
create temp table t_kit as select id from kits where image_path is not null limit 1;
grant select on t_kit to authenticated;

select tests.login('00000000-0000-4000-a000-0000000bd001');
insert into kit_likes (kit_id, print_name, print_number) select id, 'Raimondi', '19' from t_kit;
select lives_ok($$insert into kit_likes (kit_id, print_name, print_number) select id, 'Raimondi', '9' from t_kit on conflict (user_id, kit_id) do update set print_name = excluded.print_name, print_number = excluded.print_number$$, 'the wish dialog saves a corrected number');
select is((select print_number from kit_likes where kit_id = (select id from t_kit)), '9', 'and the wishlist shows it');
select tests.logout();

select tests.login('00000000-0000-4000-a000-0000000bd002');
update kit_likes set print_number = '10';
select tests.logout();
select is((select print_number from kit_likes where user_id = '00000000-0000-4000-a000-0000000bd001'), '9', 'nobody else can change it');

select * from finish();
rollback;
