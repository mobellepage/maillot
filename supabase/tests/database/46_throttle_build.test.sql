begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- Visitors are throttled; the prerender build (service role) is not.
select plan(2);

select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.headers', '{"x-forwarded-for":"203.0.113.77"}', true);
insert into private.rate_limits (key, window_start, hits) values ('read:library:203.0.113.77', now(), 300)
on conflict (key) do update set window_start = excluded.window_start, hits = excluded.hits;
select throws_ok($$select private.throttle('library', 300, 1500)$$, 'P0429', null, 'a visitor over the limit is stopped');

select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select lives_ok($$select private.throttle('library', 300, 1500)$$, 'the build reading with the service role is not');

select * from finish();
rollback;
