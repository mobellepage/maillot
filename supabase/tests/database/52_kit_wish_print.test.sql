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

-- The print wanted on a wishlist kit can be corrected — only on one's own wish;
-- the same kit can be on the wishlist more than once with different prints.
select plan(7);

select tests.create_user('00000000-0000-4000-a000-0000000bd001', 'wish@print.test');
select tests.create_user('00000000-0000-4000-a000-0000000bd002', 'nosy@print.test');
create temp table t_kit as select id from kits where image_path is not null limit 1;
grant select on t_kit to authenticated;

select tests.login('00000000-0000-4000-a000-0000000bd001');
select wish_kit_like((select id from t_kit));
select lives_ok($$select wish_kit_save((select id from t_kit), null, 'Raimondi', '19')$$, 'a print on the heart''s bare entry');
select is((select count(*)::int from kit_likes where kit_id = (select id from t_kit)), 1, 'the bare entry took the print');
select lives_ok($$select wish_kit_save((select id from t_kit), (select id from kit_likes where print_number = '19'), 'Raimondi', '9')$$, 'the wish dialog saves a corrected number');
select lives_ok($$select wish_kit_save((select id from t_kit), null, 'Hadjam', '3')$$, 'the same kit again with another print');
select is((select string_agg(print_name || ' ' || print_number, ', ' order by print_name) from kit_likes where kit_id = (select id from t_kit)), 'Hadjam 3, Raimondi 9', 'both prints are on the wishlist');
select is((select wish_kit_save((select id from t_kit), null, 'hadjam', '3')), null, 'the exact same print twice is not added');
select tests.logout();

select tests.login('00000000-0000-4000-a000-0000000bd002');
update kit_likes set print_number = '10';
select tests.logout();
select is((select count(*)::int from kit_likes where user_id = '00000000-0000-4000-a000-0000000bd001' and print_number = '10'), 0, 'nobody else can change it');

select * from finish();
rollback;
