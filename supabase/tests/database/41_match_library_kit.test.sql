begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- Shirt recognition finds the library kit from club, season, kind and the words of its description.
select plan(4);

select is((select variant || ' ' || kind || ' ' || season from match_library_kit('BSC Young Boys', '2022-23', 'special', 'Young Boys shirt for the club''s 125th anniversary')), 'Anniversary special 2022/23', 'the anniversary shirt is found by its description');
select is((select kind || ' ' || season from match_library_kit('YB', '2025/26', 'home', '')), 'home 2025/26', 'short names and season spellings are understood');
select is((select count(*)::int from match_library_kit('FC Nowhere', '2001', 'home', '')), 0, 'unknown clubs find nothing');

set local role anon;
select throws_ok($$select * from match_library_kit('YB', '2025/26', 'home', '')$$, '42501', null, 'only the recognition function may ask');
reset role;

select * from finish();
rollback;
