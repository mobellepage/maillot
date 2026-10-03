-- trending_scores_rpc
-- Aggregated, privacy-safe trending signal for the homepage recommendation
-- engine. The `events` table's RLS policy (events_select_own) only lets a
-- user SELECT their own rows, which is correct for personalised history but
-- means the client can never compute a *site-wide* trending score directly.
-- This SECURITY DEFINER function bypasses that row-level restriction only to
-- return an aggregated (shirt_id, score) pair per shirt — never raw
-- per-user rows — so it's safe to expose to anon/authenticated alike.
create or replace function public.trending_scores(days int default 14)
returns table(shirt_id text, score numeric)
language sql
stable
security definer
set search_path = public
as $$
  select shirt_id,
         sum(case type
           when 'buy' then 8
           when 'bid' then 5
           when 'watch' then 3
           when 'view' then 1
           else 0
         end) as score
  from public.events
  where created_at >= now() - (greatest(days, 1) || ' days')::interval
  group by shirt_id
  order by score desc
  limit 50;
$$;

grant execute on function public.trending_scores(int) to anon, authenticated;
