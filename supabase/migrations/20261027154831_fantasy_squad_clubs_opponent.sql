-- Pick team: each jersey shows its next match under the price — the
-- opponent and home or away (new columns opponent, home).
drop function if exists public.fantasy_squad_clubs(integer);
create function public.fantasy_squad_clubs(p_md integer default null)
returns table(club_id text, name text, league text, price numeric, delta numeric, kit_id uuid, season text, image_path text, plays boolean, fixture text, kickoff timestamptz, is_national boolean, owned boolean, starter boolean, captain boolean, in_locked boolean, opponent text, home boolean)
language sql stable security definer set search_path = '' as $function$
  with md as (select * from public.fantasy_matchdays where id = coalesce(p_md, private.fantasy_current_matchday())),
  me as (select auth.uid() as id),
  sq as (select s.* from public.fantasy_squads s, me where s.user_id = me.id),
  l as (
    select x.starters, x.captain, x.bench from public.fantasy_lineups x, me, md where x.user_id = me.id and x.matchday_id = md.id
    union all
    (select x.starters, x.captain, x.bench from public.fantasy_lineups x join public.fantasy_matchdays m2 on m2.id = x.matchday_id, me, md
      where x.user_id = me.id and m2.window_start < md.window_start
        and not exists (select 1 from public.fantasy_lineups y where y.user_id = me.id and y.matchday_id = md.id)
      order by m2.window_start desc limit 1)
  )
  select c.id, c.name, c.league, private.fantasy_club_price(c.id),
         (select m.delta from public.fantasy_price_moves m where m.club_id = c.id order by m.created_at desc limit 1),
         j.kit_id, j.season, j.image_path,
         f.id is not null, case when f.id is null then null else f.home_name || ' – ' || f.away_name end, f.kickoff,
         c.league = 'National Teams',
         c.id in (select private.fantasy_owned_clubs(me.id)),
         coalesce(c.id = any (l.starters), false),
         coalesce(c.id = l.captain, false),
         c.id = any (sq.locked_clubs),
         case when f.id is null then null when f.home_club_id = c.id then f.away_name else f.home_name end,
         case when f.id is null then null else f.home_club_id = c.id end
    from sq cross join md cross join me
    left join l on true
    cross join lateral unnest(sq.clubs) u (club_id)
    join public.kit_clubs c on c.id = u.club_id
    left join lateral private.fantasy_jersey(c.id) j on true
    left join lateral (select x.* from public.fantasy_fixtures x where x.matchday_id = md.id and (x.home_club_id = c.id or x.away_club_id = c.id) order by x.kickoff limit 1) f on true
   order by coalesce(c.id = any (l.starters), false) desc, array_position(l.bench, c.id) nulls first, private.fantasy_club_price(c.id) desc, c.name
$function$;
revoke all on function public.fantasy_squad_clubs(integer) from public, anon;
grant execute on function public.fantasy_squad_clubs(integer) to authenticated;
