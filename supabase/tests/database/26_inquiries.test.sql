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

select tests.create_user('00000000-0000-4000-a000-00000001a001', 'keeper@test.local');
select tests.create_user('00000000-0000-4000-a000-00000001a002', 'asker@test.local');
update profiles set handle = 'piece_keeper' where id = '00000000-0000-4000-a000-00000001a001';
update profiles set handle = 'piece_asker' where id = '00000000-0000-4000-a000-00000001a002';
insert into custom_items (id, user_id, catalog_id, size, visibility) values
  ('t-inq-1', '00000000-0000-4000-a000-00000001a001', 'ned-88', 'M', 'public'),
  ('t-inq-2', '00000000-0000-4000-a000-00000001a001', 'ajx-95', 'L', 'offers'),
  ('t-inq-3', '00000000-0000-4000-a000-00000001a001', 'sui-26', 'M', 'public');
update custom_items set inquiries_enabled = false where id = 't-inq-3';

select plan(12);

select tests.login('00000000-0000-4000-a000-00000001a002');
select ok(make_inquiry('t-inq-1', 450, 'Would you ever sell it?') is not null, 'anyone may ask about a not-for-sale shirt');
select throws_ok($$select make_inquiry('t-inq-1', null, 'again')$$, '23505', null, 'one open inquiry per member and shirt');
select throws_ok($$select make_inquiry('t-inq-2')$$, 'P0002', null, 'shirts open to offers take offers, not inquiries');
select throws_ok($$select make_inquiry('t-inq-3')$$, 'P0002', null, 'owners can switch inquiries off');
select throws_ok($$insert into item_inquiries (item_id, owner_id, from_id) values ('t-inq-1', '00000000-0000-4000-a000-00000001a001', '00000000-0000-4000-a000-00000001a002')$$, '42501', null, 'inquiries only through make_inquiry');
select tests.logout();

select is((select title || ' / ' || body from notifications where user_id = '00000000-0000-4000-a000-00000001a001' and type = 'inquiry'),
          'Someone is interested in your shirt / @piece_asker is interested in your Netherlands 1988 Home and would pay about CHF 450.', 'the owner hears about it');

select tests.login('00000000-0000-4000-a000-00000001a001');
select throws_ok($$select make_inquiry('t-inq-1')$$, '22023', null, 'not on your own shirt');
select is((select row(direction, other_handle, amount)::text from my_inquiries()), '(received,piece_asker,450)', 'the owner sees it with who asked and the price');
select lives_ok($$select answer_inquiry((select id from item_inquiries where item_id = 't-inq-1'), 'Not for now — but ask me again next year!')$$, 'the owner answers');
select throws_ok($$select dismiss_inquiry((select id from item_inquiries where item_id = 't-inq-1'))$$, '42501', null, 'an answered inquiry is closed');
select tests.logout();

select is((select body from notifications where user_id = '00000000-0000-4000-a000-00000001a002' and type = 'inquiry_reply'), '@piece_keeper: Not for now — but ask me again next year!', 'the asker gets the reply');
set local role anon;
select is((select array_agg(inquiries_enabled order by id) from public_collection('piece_keeper')), array[true, true, false], 'profiles show which shirts take inquiries');
reset role;

select * from finish();
rollback;
