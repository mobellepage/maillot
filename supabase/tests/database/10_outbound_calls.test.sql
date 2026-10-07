begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(4);

select has_function('net', 'http_post', 'pg_net''s http_post exists where the functions call it');
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private') and p.prosrc like '%extensions.http_post(%'),
  0, 'no function calls the non-existent extensions.http_post');

-- A new notification really queues the email relay call.
insert into private.app_settings (key, value) values ('functions_url', 'http://functions.test/v1')
on conflict (key) do update set value = excluded.value;
insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-00000000a11c', 'authenticated', 'authenticated', 'alice@test.local');
create temp table queued_before as select count(*) as n from net.http_request_queue;
insert into notifications (user_id, type, title, body) values ('00000000-0000-4000-a000-00000000a11c', 'test', 'Hello', 'World');
select is((select count(*) from net.http_request_queue) - (select n from queued_before), 1::bigint, 'a notification queues one call to send-notification');
select ok(exists (select 1 from net.http_request_queue where url = 'http://functions.test/v1/send-notification'), '…to the configured functions URL');

select * from finish();
rollback;
