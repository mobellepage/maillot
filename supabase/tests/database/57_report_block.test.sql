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

-- Reporting and blocking (App Store guideline 1.2).
select tests.create_user('00000000-0000-4000-a000-0000000b1001', 'nice@block.test');
select tests.create_user('00000000-0000-4000-a000-0000000b1002', 'troll@block.test');
select tests.create_user('00000000-0000-4000-a000-0000000b1003', 'mod@block.test');
update profiles set handle = 'nice_one', bio = 'kits' where id = '00000000-0000-4000-a000-0000000b1001';
update profiles set handle = 'troll_one', bio = 'rude words' where id = '00000000-0000-4000-a000-0000000b1002';
update profiles set handle = 'mod_one', is_admin = true where id = '00000000-0000-4000-a000-0000000b1003';
insert into custom_items (id, user_id, catalog_id, visibility, size) values ('t-nice-1', '00000000-0000-4000-a000-0000000b1001', 'sui-26', 'public', 'M');
insert into follows (follower_id, followee_id) values ('00000000-0000-4000-a000-0000000b1002', '00000000-0000-4000-a000-0000000b1001');

select plan(13);

select tests.login('00000000-0000-4000-a000-0000000b1001');
select throws_ok($$select block_user('nice_one')$$, '22023', 'you cannot block yourself', 'nobody blocks themselves');
select lives_ok($$select block_user('Troll_One')$$, 'a member blocks another by handle');
select is((select string_agg(handle, ',') from my_blocks()), 'troll_one', 'the blocker sees whom they blocked');
select lives_ok($$select report_content('profile', 'troll_one', 'offensive', 'rude bio')$$, 'a member reports a profile');
select lives_ok($$select report_content('profile', 'troll_one', 'offensive')$$, 'reporting the same thing twice is harmless');
select throws_ok($$select report_content('shirt', 't-nice-1', 'spam')$$, '22023', 'this is your own', 'nobody reports their own shirt');
select throws_ok($$select admin_reports()$$, '42501', 'admins only', 'members cannot read the reports');
select tests.logout();

select is((select count(*)::int from follows where follower_id = '00000000-0000-4000-a000-0000000b1002'), 0, 'blocking ends the follow both ways');
select throws_ok($$insert into item_comments (item_id, user_id, body) values ('t-nice-1', '00000000-0000-4000-a000-0000000b1002', 'hi')$$, '42501', 'blocked', 'the blocked member cannot comment on the blocker''s shirts');
select throws_ok($$insert into follows (follower_id, followee_id) values ('00000000-0000-4000-a000-0000000b1002', '00000000-0000-4000-a000-0000000b1001')$$, '42501', 'blocked', 'nor follow them again');
select is((select count(*)::int from notifications where user_id = '00000000-0000-4000-a000-0000000b1003' and type = 'content_report'), 1, 'admins hear about a report once');

select tests.login('00000000-0000-4000-a000-0000000b1003');
select lives_ok($$select admin_resolve_report((select id from admin_reports() limit 1), 'removed')$$, 'an admin takes the reported content down');
select tests.logout();
select is((select coalesce(bio, '') from profiles where handle = 'troll_one'), '', 'a removed profile loses its bio');

select * from finish();
rollback;
