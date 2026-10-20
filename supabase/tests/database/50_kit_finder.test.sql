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

-- The kit finder: colour families from a kit's colours, filtered by era.
select plan(7);

select is(private.color_family('#CA0318'), 'red', 'a strong red is red');
select is(private.color_family('#7E090E'), 'claret', 'a dark red is claret');
select is(private.color_family('#C4B332'), 'yellow', 'a muted yellow (YB) is yellow');
select is(private.color_family('#0D1F3C'), 'navy', 'a very dark blue is navy, not black');
select is(private.color_families(array['#941938', '#15437F', '#FFFFFF']), array['claret', 'navy'], 'the first two colours, main first');

insert into kit_clubs (id, name, league, country, colors) values ('t-find-club', 'Finder FC', 'Test League', 'CH', array['#D7192A']) on conflict do nothing;
insert into kits (club_id, season, season_year, kind, colors, status, variant, image_path, source) values
  ('t-find-club', '1988/89', 1988, 'home', array['#D7192A', '#FFFFFF'], 'approved', '', '/library/t/1.webp', 'import'),
  ('t-find-club', '2015/16', 2015, 'home', array['#D7192A', '#FFFFFF'], 'approved', '', '/library/t/2.webp', 'import'),
  ('t-find-club', '1988/89', 1988, 'away', array['#1D4FC4', '#FFFFFF'], 'approved', '', '/library/t/3.webp', 'import');
select is((select array_agg(season) from library_find('red', null, 1999, null, 'Test League')), array['1988/89'], 'a red retro kit, nothing else');
select is((select count(*)::int from library_find(null, 1980, 1989, null, 'Test League')), 2, 'the 80s, any colour');

select * from finish();
rollback;
