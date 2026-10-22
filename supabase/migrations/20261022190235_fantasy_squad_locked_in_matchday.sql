-- The squad as the matchday RPC carries it also tells the app what it looked
-- like at the last deadline, so transfers and the money can be worked out
-- while the manager is still choosing.
create or replace function public.fantasy_matchday(p_md int default null)
returns table (
  id int, number int, window_start timestamptz, window_end timestamptz, deadline timestamptz, international boolean, status text,
  cup_name text, season_name text, budget numeric, fixtures int,
  squad jsonb, lineup jsonb, chips_used text[], previous_id int, next_id int, players int, rank int
)
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as id),
  md as (select * from public.fantasy_matchdays where id = coalesce(p_md, private.fantasy_current_matchday()))
  select md.id, md.number, md.window_start, md.window_end, md.deadline, md.international, md.status,
         c.name, s.name, (select budget from private.fantasy_md_policy()),
         (select count(*)::int from public.fantasy_fixtures f where f.matchday_id = md.id),
         (select jsonb_build_object('clubs', sq.clubs, 'bank', sq.bank, 'locked_clubs', sq.locked_clubs, 'bank_locked', sq.bank_locked,
                                    'free_transfers', sq.free_transfers, 'first_locked', sq.first_locked_md is not null,
                                    'value', (select coalesce(sum(private.fantasy_club_price(x)), 0) from unnest(sq.clubs) x))
            from public.fantasy_squads sq, me where sq.user_id = me.id),
         (select to_jsonb(l) - 'user_id' from public.fantasy_lineups l, me where l.user_id = me.id and l.matchday_id = md.id),
         (select coalesce(array_agg(cu.chip), '{}') from public.fantasy_chips_used cu, me where cu.user_id = me.id and cu.season_id = md.season_id and cu.matchday_id <> md.id),
         (select m2.id from public.fantasy_matchdays m2 where m2.window_start < md.window_start order by m2.window_start desc limit 1),
         (select m2.id from public.fantasy_matchdays m2 where m2.window_start > md.window_start order by m2.window_start limit 1),
         (select count(*)::int from public.fantasy_lineups l where l.matchday_id = md.id and l.locked),
         (select r.rank::int from (select l.user_id, rank() over (order by l.points desc) from public.fantasy_lineups l where l.matchday_id = md.id and l.locked) r, me where r.user_id = me.id)
    from md join public.fantasy_cups c on c.id = md.cup_id join public.fantasy_seasons s on s.id = md.season_id
$$;
