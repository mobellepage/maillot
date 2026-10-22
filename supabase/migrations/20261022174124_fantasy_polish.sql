-- Fantasy, polish after the review:
-- * the "current" matchday is the one running (or next), not next week's
--   while this weekend is live;
-- * "you're leading your league" while matches run; Manager of the Season
--   when a season ends;
-- * indexes on the foreign keys the linter flagged, admin policies split
--   from the read policies, a fixed search_path on every private helper.

-- The matchday to show: the earliest one whose window hasn't ended (plus six hours).
create or replace function private.fantasy_current_matchday()
returns int language sql stable as $$
  select id from public.fantasy_matchdays
   where window_end > now() - interval '6 hours'
   order by window_start
   limit 1
$$;

-- Live: the first time someone leads a league this matchday, they hear it.
create or replace function private.fantasy_notify_live(p_md int)
returns void language plpgsql as $$
declare lg record; top record; md public.fantasy_matchdays;
begin
  select * into md from public.fantasy_matchdays where id = p_md;
  for lg in select l.id, l.name from public.fantasy_leagues l where (select count(*) from public.fantasy_league_members m where m.league_id = l.id) >= 2 loop
    select x.user_id, x.points into top
      from public.fantasy_lineups x join public.fantasy_league_members m on m.user_id = x.user_id and m.league_id = lg.id
     where x.matchday_id = p_md and x.locked and x.points > 0
     order by x.points desc, x.updated_at limit 1;
    if top.user_id is not null then
      perform private.fantasy_notify(top.user_id, 'fantasy_live_lead', 'lead:' || p_md || ':' || lg.id, 'Matchday live: you’re leading your league',
        lg.name || ': ' || top.points || ' points so far in Matchday ' || md.number || '.',
        jsonb_build_object('link', '/fantasy/league/' || lg.id, 'league', lg.name, 'points', top.points, 'matchday', md.number), true);
    end if;
  end loop;
end $$;

create or replace function private.fantasy_score(p_md int, p_final boolean)
returns void language plpgsql as $$
declare
  pol record;
  l record;
  i int;
  kit uuid;
  club text;
  res record;
  mult numeric;
  total int;
  clubs text[];
  pp int;
  f public.fantasy_fixtures;
  md public.fantasy_matchdays;
begin
  select * into pol from private.fantasy_md_policy();
  select * into md from public.fantasy_matchdays where id = p_md;
  for l in select * from public.fantasy_lineups where matchday_id = p_md loop
    total := 0;
    select array_agg(k.club_id) into clubs from public.kits k where k.id = any (l.kits);
    for i in 1..coalesce(array_length(l.kits, 1), 0) loop
      kit := l.kits[i];
      select k.club_id into club from public.kits k where k.id = kit;
      select * into res from private.fantasy_club_result(club, p_md, p_final);
      mult := 1;
      if l.golds[i] then mult := mult * case when l.chip = 'gold_rush' then pol.gold_rush_mult else pol.gold_mult end; end if;
      if kit = l.captain then mult := mult * case when l.chip = 'triple_captain' then pol.triple_captain_mult else pol.captain_mult end; end if;
      if l.chip = 'derby_day' and res.opponents && clubs then mult := mult * pol.derby_mult; end if;
      insert into public.fantasy_card_scores (user_id, matchday_id, kit_id, club_id, played, base, multiplier, total, detail)
      values (l.user_id, p_md, kit, club, res.played, res.points, mult, round(res.points * mult)::int, jsonb_build_object('matches', res.detail, 'gold', l.golds[i], 'captain', kit = l.captain, 'chip', l.chip))
      on conflict (user_id, matchday_id, kit_id) do update
        set club_id = excluded.club_id, played = excluded.played, base = excluded.base, multiplier = excluded.multiplier, total = excluded.total, detail = excluded.detail;
      total := total + round(res.points * mult)::int;
    end loop;
    pp := 0;
    if l.pred_fixture is not null then
      select * into f from public.fantasy_fixtures where id = l.pred_fixture;
      if f.status = 'finished' and f.home_goals is not null then
        if f.home_goals = l.pred_home and f.away_goals = l.pred_away then pp := pol.pred_exact;
        elsif sign(f.home_goals - f.away_goals) = sign(coalesce(l.pred_home, 0) - coalesce(l.pred_away, 0)) then pp := pol.pred_outcome;
        end if;
      end if;
    end if;
    update public.fantasy_lineups set points = total + pp, pred_points = pp where user_id = l.user_id and matchday_id = p_md;
  end loop;
  if p_final then
    update public.fantasy_matchdays set status = 'scored', scored_at = now() where id = p_md;
    perform private.fantasy_after_scored(p_md);
  else
    update public.fantasy_matchdays set status = 'live' where id = p_md and status = 'locked';
    perform private.fantasy_notify_live(p_md);
  end if;
end $$;

-- A season that ended: Manager of the Season (badge and a word), for the honour.
create or replace function private.fantasy_close_season()
returns void language plpgsql as $$
declare s record; top record;
begin
  for s in select * from public.fantasy_seasons where ends < current_date loop
    if exists (select 1 from public.fantasy_badges where key = 'manager-of-season:' || s.id) then continue; end if;
    select st.user_id, st.points into top from public.fantasy_standings st where st.scope = 'season' and st.scope_id = s.id::text order by st.points desc, st.user_id limit 1;
    if top.user_id is null then continue; end if;
    insert into public.fantasy_badges (user_id, key, data) values (top.user_id, 'manager-of-season:' || s.id, jsonb_build_object('season', s.name, 'points', top.points)) on conflict do nothing;
    perform private.fantasy_notify(top.user_id, 'fantasy_season', 'season:' || s.id, 'Manager of the Season',
      'Season ' || s.name || ': ' || top.points || ' points — the best of all. 👑', jsonb_build_object('link', '/fantasy/standings?tab=season', 'season', s.name, 'points', top.points));
  end loop;
end $$;

create or replace function public.fantasy_tick()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; locked int := 0; scored int := 0; live int := 0; ids int[];
begin
  perform private.fantasy_ensure_matchdays();
  select array_agg(id) into ids from (
    select id from public.fantasy_matchdays where window_end > now() - interval '3 hours' and window_start < now() + interval '14 days' order by window_start limit 3) x;
  perform private.fantasy_request_fixtures(ids);
  for r in select id from public.fantasy_matchdays where status = 'upcoming' and deadline <= now() loop
    perform private.fantasy_lock_matchday(r.id);
    locked := locked + 1;
  end loop;
  for r in select id from public.fantasy_matchdays where status in ('locked', 'live') and window_start <= now() and window_end > now() loop
    perform private.fantasy_score(r.id, false);
    live := live + 1;
  end loop;
  for r in select id from public.fantasy_matchdays m where status in ('locked', 'live') and window_end <= now()
             and (not exists (select 1 from public.fantasy_fixtures f where f.matchday_id = m.id and f.status <> 'finished') or window_end < now() - interval '3 hours') loop
    perform private.fantasy_score(r.id, true);
    scored := scored + 1;
  end loop;
  perform private.fantasy_notify_tick();
  perform private.fantasy_close_season();
  return jsonb_build_object('locked', locked, 'live', live, 'scored', scored);
end $$;
revoke all on function public.fantasy_tick() from public;

-- Indexes the linter asked for.
create index if not exists fantasy_cards_kit on public.fantasy_cards (kit_id);
create index if not exists fantasy_album_done_album on public.fantasy_album_done (album_id);
create index if not exists fantasy_chips_md on public.fantasy_chips_used (matchday_id);
create index if not exists fantasy_fixtures_home on public.fantasy_fixtures (home_club_id);
create index if not exists fantasy_fixtures_away on public.fantasy_fixtures (away_club_id);
create index if not exists fantasy_h2h_md on public.fantasy_h2h (matchday_id);
create index if not exists fantasy_h2h_user_b on public.fantasy_h2h (user_b);
create index if not exists fantasy_league_posts_user on public.fantasy_league_posts (user_id);
create index if not exists fantasy_leagues_owner on public.fantasy_leagues (owner_id);
create index if not exists fantasy_lineups_pred on public.fantasy_lineups (pred_fixture);
create index if not exists fantasy_matchdays_cup on public.fantasy_matchdays (cup_id);
create index if not exists fantasy_matchdays_season on public.fantasy_matchdays (season_id);
create index if not exists fantasy_prize_pool_cup on public.fantasy_prize_pool (cup_id);
create index if not exists fantasy_prizes_cup on public.fantasy_prizes (cup_id);
create index if not exists fantasy_prizes_kit on public.fantasy_prizes (kit_id);
create index if not exists fantasy_prizes_pool on public.fantasy_prizes (pool_id);
create index if not exists fantasy_shop_buys_kit on public.fantasy_shop_buys (kit_id);
create index if not exists fantasy_standings_user on public.fantasy_standings (user_id);
create index if not exists fantasy_daily_missions_key on public.fantasy_daily_missions (mission_key);
create index if not exists custom_items_kit on public.custom_items (kit_id);
create index if not exists kit_likes_kit on public.kit_likes (kit_id);
create index if not exists kit_legends_kit on public.kit_legends (kit_id);

-- Admin policies only for writing (the read policies already cover select).
do $$
declare t text;
begin
  foreach t in array array['fantasy_albums', 'fantasy_album_slots', 'fantasy_missions', 'fantasy_prize_pool', 'fantasy_team_mappings'] loop
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin())', t || '_admin_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())', t || '_admin_delete', t);
  end loop;
end $$;

-- Every private helper of the game runs with a fixed search_path (they qualify every name).
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private' and (p.proname like 'fantasy_%' or p.proname = 'kits_set_rarity')
  loop
    execute format('alter function %s set search_path = ''''', r.sig);
  end loop;
end $$;
