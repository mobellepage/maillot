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

-- Everyone can see what a collector is looking for — unless they keep their collection private.
select plan(4);

select tests.create_user('00000000-0000-4000-a000-0000000be001', 'wants@wish.test');
update profiles set handle = 'wants_kits' where id = '00000000-0000-4000-a000-0000000be001';
create temp table t_kit as select id from kits where image_path is not null limit 1;
grant select on t_kit to authenticated;

select tests.login('00000000-0000-4000-a000-0000000be001');
insert into kit_likes (kit_id, print_name, print_number) select id, 'Elber', '9' from t_kit;
insert into watchlist (user_id, shirt_id) values ('00000000-0000-4000-a000-0000000be001', 'sui-26');
select tests.logout();

set local role anon;
select is((select count(*)::int from public_wishlist('wants_kits')), 2, 'a visitor sees the kit and the watched shirt');
select is((select print_name || ' ' || print_number from public_wishlist('wants_kits') where kit_id is not null), 'Elber 9', 'with the print wanted');
select is((select shirt_id from public_wishlist('WANTS_KITS') where kit_id is null), 'sui-26', 'whatever the case of the handle');
reset role;

update profiles set collection_private = true where id = '00000000-0000-4000-a000-0000000be001';
set local role anon;
select is((select count(*)::int from public_wishlist('wants_kits')), 0, 'a private collection keeps the wishlist private too');
reset role;

select * from finish();
rollback;
