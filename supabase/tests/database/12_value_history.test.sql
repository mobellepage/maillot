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
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

select tests.create_user('00000000-0000-4000-a000-00000000a11c', 'alice@test.local');
select tests.create_user('00000000-0000-4000-a000-000000000b0b', 'bob@test.local');
select tests.create_user('00000000-0000-4000-a000-0000000ca201', 'carol@test.local');
-- alice owns the Netherlands shirt, bob watches it, carol owns the Swiss one
insert into custom_items (id, user_id, catalog_id) values ('t-ned', '00000000-0000-4000-a000-00000000a11c', 'ned-88'), ('t-sui', '00000000-0000-4000-a000-0000000ca201', 'sui-26');
insert into watchlist (user_id, shirt_id) values ('00000000-0000-4000-a000-000000000b0b', 'ned-88');

delete from shirt_value_history where catalog_id in ('ned-88', 'sui-26');
insert into shirt_value_history (catalog_id, day, value) values
  ('ned-88', current_date - 8, 300), ('ned-88', current_date, 340),   -- +13 %
  ('sui-26', current_date - 7, 100), ('sui-26', current_date, 104);   -- +4 %

select plan(7);

update shirt_valuations set value = value + 1 where catalog_id = 'yb-2526';
select ok(exists (select 1 from shirt_value_history where catalog_id = 'yb-2526' and day = (now() at time zone 'Europe/Zurich')::date), 'a revaluation records the day’s value');

select is(notify_collection_movers(), 2, 'a 13 % move is reported to its owner and its watcher');
select is((select body from notifications where user_id = '00000000-0000-4000-a000-00000000a11c' and type = 'price_move'),
  'Netherlands 1988 Home is up 13% this week — now worth about CHF 340.', 'the message names the shirt, the move and the value');
select is((select data from notifications where user_id = '00000000-0000-4000-a000-000000000b0b' and type = 'price_move'),
  '{"amount": 340, "shirt_id": "ned-88", "change_pct": 13}'::jsonb, 'the app gets what it needs to show it in the reader’s language');
select is((select count(*)::int from notifications where user_id = '00000000-0000-4000-a000-0000000ca201' and type = 'price_move'), 0, 'a 4 % move stays quiet');
select is(notify_collection_movers(), 0, 'each move is reported once a week');

set local role anon;
select ok((select count(*) > 0 from shirt_value_history), 'value history is public');
reset role;

select * from finish();
rollback;
