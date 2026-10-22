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

-- Fantasy, phase 1: a pack a day, cards, duplicates into Kit Points, missions, Gold from the collection.
select plan(12);

select tests.create_user('00000000-0000-4000-a000-0000000bf001', 'player@fantasy.test');
select tests.create_user('00000000-0000-4000-a000-0000000bf002', 'other@fantasy.test');
create temp table t_kit as select id from kits where image_path is not null limit 1;
grant select on t_kit to authenticated;

-- Signed out: nothing.
select throws_ok($$select * from fantasy_state()$$, '42501', null, 'the game is for members');
select is((select count(*)::int from fantasy_odds()), 4, 'the odds are public');

select tests.login('00000000-0000-4000-a000-0000000bf001');
select is((select packs from fantasy_state()), 1, 'a new player starts with one pack');
select is((select jsonb_array_length(missions) from fantasy_state()), 3, 'and three missions for the day');
select is((select count(*)::int from fantasy_open_pack()), 5, 'a pack holds five cards');
select is((select packs from fantasy_state()), 0, 'which uses the pack up');
select throws_ok($$select * from fantasy_open_pack()$$, 'P0462', null, 'and there is no second one yet');
select is((select points from fantasy_state()), 20, 'opening the pack was a mission: Kit Points');
select ok((select next_pack_at > now() + interval '11 hours' from fantasy_state()), 'the next pack comes in twelve hours');

-- Duplicates: two copies of one kit become points.
select tests.logout();
insert into fantasy_cards (user_id, kit_id) select '00000000-0000-4000-a000-0000000bf001', id from t_kit;
insert into fantasy_cards (user_id, kit_id) select '00000000-0000-4000-a000-0000000bf001', id from t_kit;
select tests.login('00000000-0000-4000-a000-0000000bf001');
select ok((select fantasy_convert_duplicates((select id from t_kit))) >= 5, 'a duplicate is worth Kit Points');
select is((select count(*)::int from fantasy_cards where kit_id = (select id from t_kit) and user_id = '00000000-0000-4000-a000-0000000bf001'), 1, 'and one copy stays');

-- Gold: a shirt of the collection with a library kit and a front photo.
select tests.logout();
insert into custom_items (id, user_id, kit_id, size, visibility, photos)
select 't-gold-1', '00000000-0000-4000-a000-0000000bf001', id, 'M', 'public', '{"front": {"path": "u/front.jpg"}}'::jsonb from t_kit;
select tests.login('00000000-0000-4000-a000-0000000bf001');
select is((select count(*)::int from fantasy_my_cards() where gold), 1, 'a photographed, linked shirt is a Gold card');
select tests.logout();

select * from finish();
rollback;
