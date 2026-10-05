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
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
create or replace function tests.logout()
returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;
create or replace function tests.order_for(p_shirt text, p_size text)
returns public.orders language sql security definer as $$ select * from public.orders where shirt_id = p_shirt and size = p_size order by created_at desc limit 1 $$;
create or replace function tests.cert()
returns text language sql security definer as $$ select code from public.certificates where order_id = (tests.order_for('sui-26', 'L')).id $$;
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

-- alice buys, bob sells, admin runs the centre
select tests.create_user('00000000-0000-4000-a000-00000000a11c', 'alice@test.local');
select tests.create_user('00000000-0000-4000-a000-000000000b0b', 'bob@test.local');
select tests.create_user('00000000-0000-4000-a000-0000000ad111', 'admin@test.local', true);

insert into asks (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-000000000b0b', 'sui-26', 'L', 90);
insert into bids (user_id, shirt_id, size, amount) values ('00000000-0000-4000-a000-00000000a11c', 'sui-26', 'L', 90);
update orders set status = 'shipped', shipped_at = now() where id = (tests.order_for('sui-26', 'L')).id;

select plan(15);

select is((select count(*)::int from certificates where order_id = (tests.order_for('sui-26', 'L')).id), 0, 'no certificate before inspection');
select tests.login('00000000-0000-4000-a000-0000000ad111');
select lives_ok(format('select admin_record_inspection(%L, true)', (tests.order_for('sui-26', 'L')).id), 'centre passes the shirt');
select tests.logout();
select ok(tests.cert() ~ '^MLT-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$', 'a pass issues a certificate with an unambiguous code');

set local role anon;
select is((select shirt_id from verify_certificate(tests.cert())), 'sui-26', 'anyone can verify a code');
select is((select count(*)::int from verify_certificate(lower(replace(tests.cert(), '-', ' ')))), 1, 'codes are case- and separator-insensitive');
select is((select count(*)::int from verify_certificate('MLT-2222-2222-2222')), 0, 'unknown codes verify as nothing');
select is((select count(*)::int from certificates), 0, 'the table itself is not public');
reset role;

select tests.login('00000000-0000-4000-a000-000000000b0b');
select is((select count(*)::int from certificates), 0, 'the seller cannot list the buyer''s certificate');
select throws_ok(format('select admin_revoke_certificate(%L, %L)', tests.cert(), 'x'), null, 'not authorized', 'only admins revoke');
select tests.login('00000000-0000-4000-a000-00000000a11c');
select is((select count(*)::int from certificates), 1, 'the buyer sees their certificate');

select tests.login('00000000-0000-4000-a000-0000000ad111');
select lives_ok(format('select admin_attach_tag(%L, %L)', tests.cert(), '04a1b2c3d4e5f6'), 'admin binds an NFC tag');
select tests.logout();
select is((select tag_match from verify_certificate(tests.cert(), '04A1B2C3D4E5F6')), true, 'the right chip matches');
select is((select tag_match from verify_certificate(tests.cert(), '04FFFFFFFFFFFF')), false, 'a different chip does not');

select tests.login('00000000-0000-4000-a000-0000000ad111');
select lives_ok(format('select admin_revoke_certificate(%L, %L)', tests.cert(), 'reported stolen'), 'admin revokes');
select tests.logout();
select is((select revoked from verify_certificate(tests.cert())), true, 'revocation is public');

select * from finish();
rollback;
