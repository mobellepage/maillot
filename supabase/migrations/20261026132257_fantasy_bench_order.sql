-- The bench has one order everywhere: the one the manager sees on "Pick
-- team", saved with the line-up (p_bench), shown on Points and on profiles,
-- and used by the automatic substitution (leftmost first). Before, the pick
-- screen sorted by price while the line-up saved the squad's order.
drop function if exists public.fantasy_save_lineup(integer, text[], text);
create or replace function public.fantasy_save_lineup(p_md integer, p_starters text[], p_captain text default null, p_bench text[] default null)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); md public.fantasy_matchdays; sq public.fantasy_squads; pol record; v_bench text[];
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.hit('fantasy:lineup:' || uid, 120, interval '1 hour');
  select * into pol from private.fantasy_md_policy();
  md := private.fantasy_open_matchday(p_md);
  select * into sq from public.fantasy_squads where user_id = uid;
  if sq.user_id is null or coalesce(array_length(sq.clubs, 1), 0) <> pol.squad_size then raise exception 'no_squad' using errcode = 'P0479'; end if;
  perform private.fantasy_check_starters(sq.clubs, p_starters, md.id);
  if p_captain is not null and (not (p_captain = any (p_starters)) or p_captain not in (select private.fantasy_owned_clubs(uid))) then
    raise exception 'captain_not_owned' using errcode = 'P0472';
  end if;
  v_bench := array(select c from unnest(sq.clubs) c where not (c = any (p_starters)));
  -- The order sent, when it's exactly the clubs left on the bench.
  if p_bench is not null and cardinality(p_bench) = cardinality(v_bench) and p_bench @> v_bench and v_bench @> p_bench then
    v_bench := p_bench;
  end if;
  perform private.fantasy_ensure_lineup(uid, md.id);
  update public.fantasy_lineups
     set clubs = sq.clubs, starters = p_starters, bench = v_bench,
         captain = p_captain, carried = false, updated_at = now()
   where user_id = uid and matchday_id = md.id;
end $$;
revoke all on function public.fantasy_save_lineup(integer, text[], text, text[]) from public, anon;
grant execute on function public.fantasy_save_lineup(integer, text[], text, text[]) to authenticated;

create or replace function public.fantasy_squad_clubs(p_md integer default null)
returns table(club_id text, name text, league text, price numeric, delta numeric, kit_id uuid, season text, image_path text, plays boolean, fixture text, kickoff timestamptz, is_national boolean, owned boolean, starter boolean, captain boolean, in_locked boolean)
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
         c.id = any (sq.locked_clubs)
    from sq cross join md cross join me
    left join l on true
    cross join lateral unnest(sq.clubs) u (club_id)
    join public.kit_clubs c on c.id = u.club_id
    left join lateral private.fantasy_jersey(c.id) j on true
    left join lateral (select x.* from public.fantasy_fixtures x where x.matchday_id = md.id and (x.home_club_id = c.id or x.away_club_id = c.id) order by x.kickoff limit 1) f on true
   order by coalesce(c.id = any (l.starters), false) desc, array_position(l.bench, c.id) nulls first, private.fantasy_club_price(c.id) desc, c.name
$function$;

create or replace function public.fantasy_lineup_clubs(p_md integer, p_user uuid default null)
returns table(club_id text, name text, league text, price numeric, image_path text, starter boolean, captain boolean, played boolean, base integer, multiplier integer, total integer, detail jsonb)
language sql stable security definer set search_path = '' as $function$
  with l as (select * from public.fantasy_lineups where matchday_id = p_md and user_id = coalesce(p_user, (select auth.uid())) and (locked or user_id = (select auth.uid())))
  select c.id, c.name, c.league, private.fantasy_club_price(c.id), (select image_path from private.fantasy_jersey(c.id)),
         c.id = any (l.starters), c.id is not distinct from l.captain,
         coalesce(s.played, false), coalesce(s.base, 0), coalesce(s.multiplier, case when c.id = any (l.starters) then 1 else 0 end), coalesce(s.total, 0), coalesce(s.detail, '{}'::jsonb)
    from l
    cross join lateral unnest(l.clubs) u (club_id)
    join public.kit_clubs c on c.id = u.club_id
    left join public.fantasy_club_scores s on s.user_id = l.user_id and s.matchday_id = p_md and s.club_id = c.id
   order by (c.id = any (l.starters)) desc, (c.id is not distinct from l.captain) desc, array_position(l.bench, c.id), private.fantasy_club_price(c.id) desc
$function$;
