begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

create schema if not exists tests;
create or replace function tests.create_user(p_id uuid, p_email text, p_admin boolean default false)
returns uuid language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email);
  if p_admin then update public.profiles set is_admin = true where id = p_id; end if;
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
create or replace function tests.kit(p_club text, p_season text, p_kind text)
returns public.kits language sql security definer as $$ select * from public.kits where club_id = p_club and season = p_season and kind = p_kind order by created_at desc limit 1 $$;
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

select tests.create_user('00000000-0000-4000-a000-00000000c1b1', 'fan@kits.test');
select tests.create_user('00000000-0000-4000-a000-00000000c1b2', 'other@kits.test');
select tests.create_user('00000000-0000-4000-a000-00000000c1ad', 'admin@kits.test', true);

select plan(13);

select is((select count(*)::int from kit_clubs where top5), 96, 'all clubs of the top five leagues are listed');
select ok((select count(*) from kits where source = 'catalogue' and status = 'approved') >= 1, 'catalogue shirts are in the library');

select tests.login('00000000-0000-4000-a000-00000000c1b1');
select lives_ok($$select suggest_kit('milan', '2003/04', 'european', 'adidas', 'Opel', 'stripes', '{#FB090B,#000000}', 'Champions League')$$, 'a member suggests a kit');
select throws_ok($$select suggest_kit('milan', '2003/04', 'home', null, null, 'plain', '{red}', null)$$, '23514', null, 'colours must be hex');
select throws_ok($$select suggest_kit('nowhere-fc', '2003/04', 'home', null, null, 'plain', '{#FFFFFF}', null)$$, '22023', 'unknown club', 'only known clubs');
select is((select count(*)::int from kits where club_id = 'milan' and season = '2003/04'), 1, 'members see their own suggestion');
select throws_ok(format('select admin_review_kit(%L, true)', (tests.kit('milan', '2003/04', 'european')).id), '42501', null, 'members cannot approve');
select tests.logout();

select tests.login('00000000-0000-4000-a000-00000000c1b2');
select is((select count(*)::int from kits where club_id = 'milan' and season = '2003/04'), 0, 'nobody else sees an unchecked suggestion');
select throws_ok($$select admin_import_kits('[]')$$, '42501', null, 'members cannot import');
select tests.logout();

select tests.login('00000000-0000-4000-a000-00000000c1ad');
select lives_ok(format('select admin_review_kit(%L, true)', (tests.kit('milan', '2003/04', 'european')).id), 'an admin approves it');
select is(admin_import_kits('[{"club":"arsenal","season":"2003/04","kind":"home","brand":"Nike","sponsor":"O2","pattern":"plain","colors":["#EF0107","#FFFFFF"]},{"club":"arsenal","season":"2003/04","kind":"home","brand":"Nike","sponsor":"O2","pattern":"plain","colors":["#EF0107","#FFFFFF"],"note":"The Invincibles"}]'), 2, 'an admin imports kits');
select tests.logout();

set local role anon;
select is((select count(*)::int from kits where club_id = 'arsenal' and season = '2003/04'), 1, 'a repeated import updates the kit instead of adding it twice');
select is((select note from kits where club_id = 'milan' and season = '2003/04'), 'Champions League', 'approved suggestions are public');
reset role;

select * from finish();
rollback;
