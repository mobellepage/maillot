begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-00000000a11c', 'authenticated', 'authenticated', 'alice@test.local');

select plan(3);

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-a000-00000000a11c', 'role', 'authenticated')::text, true);
set local role authenticated;
select lives_ok($$ select consume_studio_quota() $$, 'a member can cut out a photo');
select throws_ok($$ do $b$ begin for i in 1..30 loop perform consume_studio_quota(); end loop; end $b$ $$, 'P0429', null, 'cut-outs are rate-limited per member');
reset role;

set local role anon;
select throws_ok($$ select consume_studio_quota() $$, '42501', null, 'signed-out visitors cannot cut out photos');
reset role;

select * from finish();
rollback;
