-- Profile line-ups: each club's base points and multiplier too, so a bench
-- club shows what it would have scored (greyed; it doesn't count).
create or replace function public.fantasy_public_profile(p_handle text)
returns table(plays boolean, division_number integer, season_points integer, season_rank integer, best_points integer, best_matchday integer, played integer, leagues integer, badges jsonb, squad jsonb, squad_value numeric)
language sql stable security definer set search_path = '' as $function$
  with who as (select p.id from public.profiles p where lower(p.handle) = lower(p_handle)),
  md as (select m.* from public.fantasy_matchdays m where m.id = private.fantasy_current_matchday()),
  sq as (select s.* from public.fantasy_squads s, who where s.user_id = who.id and s.first_locked_md is not null),
  lu as (select l.*, m.number gw, m.status md_status from public.fantasy_lineups l join public.fantasy_matchdays m on m.id = l.matchday_id, who
          where l.user_id = who.id and l.locked order by m.window_start desc limit 1)
  select exists (select 1 from sq),
         (select d.number from public.fantasy_divisions d join public.fantasy_division_members dm on dm.division_id = d.id, who, md where dm.user_id = who.id and d.cup_id = md.cup_id),
         coalesce((select s.points from public.fantasy_standings s, who, md where s.scope = 'season' and s.scope_id = md.season_id::text and s.user_id = who.id), 0),
         (select r.rn::int from (select s.user_id, row_number() over (order by s.points desc, s.user_id) rn from public.fantasy_standings s, md where s.scope = 'season' and s.scope_id = md.season_id::text) r, who where r.user_id = who.id),
         (select max(l.points) from public.fantasy_lineups l, who where l.user_id = who.id and l.locked),
         (select m.number from public.fantasy_lineups l join public.fantasy_matchdays m on m.id = l.matchday_id, who where l.user_id = who.id and l.locked order by l.points desc limit 1),
         (select count(*)::int from public.fantasy_lineups l, who where l.user_id = who.id and l.locked),
         (select count(*)::int from public.fantasy_league_members m, who where m.user_id = who.id),
         (select coalesce(jsonb_agg(jsonb_build_object('key', b.key, 'data', b.data, 'at', b.earned_at) order by b.earned_at desc), '[]'::jsonb) from public.fantasy_badges b, who where b.user_id = who.id),
         (select coalesce(jsonb_agg(jsonb_build_object('club_id', c.id, 'name', c.name, 'league', c.league, 'price', private.fantasy_club_price(c.id),
                                                       'image_path', (select image_path from private.fantasy_jersey(c.id)),
                                                       'starter', c.id = any (lu.starters), 'captain', c.id is not distinct from lu.captain, 'gameweek', lu.gw,
                                                       'matchday_id', lu.matchday_id, 'gw_points', lu.points, 'live', lu.md_status <> 'scored',
                                                       'points', coalesce(cs.total, 0), 'base', coalesce(cs.base, 0), 'multiplier', coalesce(cs.multiplier, case when c.id = any (lu.starters) then 1 else 0 end), 'played', coalesce(cs.played, false),
                                                       'sub_in_for', cs.detail ->> 'sub_in_for', 'sub_out', (cs.detail ->> 'sub_out')::boolean)
                                    order by (c.id = any (lu.starters)) desc, array_position(lu.starters, c.id), array_position(lu.bench, c.id), private.fantasy_club_price(c.id) desc), '[]'::jsonb)
            from lu cross join lateral unnest(lu.clubs) u (club_id) join public.kit_clubs c on c.id = u.club_id
            left join public.fantasy_club_scores cs on cs.user_id = lu.user_id and cs.matchday_id = lu.matchday_id and cs.club_id = c.id),
         (select coalesce(sum(private.fantasy_club_price(x)), 0) from lu cross join lateral unnest(lu.clubs) x)
    from who
$function$;
