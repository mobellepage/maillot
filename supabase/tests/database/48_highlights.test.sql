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

-- Highlights: up to five shirts a member marks come first on their profile.
select plan(6);

select tests.create_user('00000000-0000-4000-a000-0000000bc001', 'star@highlight.test');
select tests.create_user('00000000-0000-4000-a000-0000000bc002', 'other@highlight.test');
update profiles set handle = 'star_fan' where id = '00000000-0000-4000-a000-0000000bc001';
insert into custom_items (id, user_id, catalog_id, size, visibility, created_at)
select 't-hl-' || g, '00000000-0000-4000-a000-0000000bc001', 'sui-26', 'M', 'public', now() - (g || ' minutes')::interval from generate_series(1, 7) g;

select tests.login('00000000-0000-4000-a000-0000000bc001');
select lives_ok($$update custom_items set highlighted_at = now() + (substr(id, 6)::int || ' seconds')::interval where id in ('t-hl-7', 't-hl-6', 't-hl-5', 't-hl-4', 't-hl-3')$$, 'a member highlights five shirts');
select throws_ok($$update custom_items set highlighted_at = now() where id = 't-hl-1'$$, 'P0455', 'highlight_limit', 'a sixth is refused');
select lives_ok($$update custom_items set highlighted_at = null where id = 't-hl-7'$$, 'unmarking one …');
select lives_ok($$update custom_items set highlighted_at = now() + interval '1 hour' where id = 't-hl-1'$$, '… makes room for another');
select tests.logout();

select tests.login('00000000-0000-4000-a000-0000000bc002');
select is((select array_agg(id) from (select id from public_collection('star_fan') limit 6) x), array['t-hl-3', 't-hl-4', 't-hl-5', 't-hl-6', 't-hl-1', 't-hl-2'], 'the profile shows the highlights first, in the order they were marked, then the newest');
select is((select count(*)::int from public_collection('star_fan') where highlighted), 5, 'and says which they are');
select tests.logout();

select * from finish();
rollback;
