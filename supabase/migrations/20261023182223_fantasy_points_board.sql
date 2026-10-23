-- The points board, as in Fantasy Premier League: the Gameweek's average and
-- highest score next to one's own, and in the table every manager's
-- transfers and what they cost.
create or replace function public.fantasy_matchday_stats(p_md int)
returns table (avg_points int, top_points int, managers int)
language sql stable security definer set search_path = '' as $$
  select coalesce(round(avg(l.points))::int, 0), coalesce(max(l.points), 0), count(*)::int
    from public.fantasy_lineups l where l.matchday_id = p_md and l.locked
$$;
revoke all on function public.fantasy_matchday_stats(int) from public;
grant execute on function public.fantasy_matchday_stats(int) to anon, authenticated;

drop function if exists public.fantasy_matchday_table(int, int);
create function public.fantasy_matchday_table(p_md int, p_limit int default 50)
returns table (user_id uuid, handle text, avatar text, points int, hits int, transfers int, captain_name text, chip text, is_me boolean)
language sql stable security definer set search_path = '' as $$
  select l.user_id, p.handle, p.avatar, l.points, l.hits, l.transfers, (select c.name from public.kit_clubs c where c.id = l.captain), l.chip, l.user_id = (select auth.uid())
    from public.fantasy_lineups l join public.profiles p on p.id = l.user_id
   where l.matchday_id = p_md and l.locked
   order by l.points desc, l.updated_at
   limit p_limit
$$;
revoke all on function public.fantasy_matchday_table(int, int) from public;
grant execute on function public.fantasy_matchday_table(int, int) to anon, authenticated;
