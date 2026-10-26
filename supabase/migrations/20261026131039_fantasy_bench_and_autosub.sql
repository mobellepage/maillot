-- Fantasy scoring, corrected (Mohamed, 2026-10-26):
-- * Only the five on the pitch score; the bench never does (unless Bench
--   Boost). The old check "starter or chip = 'bench_boost'" was NULL when no
--   chip was played, and a NULL let the bench count in full.
-- * Automatic substitution: a starter that hasn't played this Gameweek by
--   Monday 23:30 (Zurich) — or has no match in it at all — is replaced by the
--   leftmost bench club that played. The captain's double stays with the
--   captain; a club coming on scores single points.
create or replace function private.fantasy_sub_cutoff(p_md integer)
returns timestamptz language sql stable set search_path = '' as $$
  -- The Monday of the Gameweek (window starts Friday 18:00), 23:30 in Zurich.
  select ((m.window_start at time zone 'Europe/Zurich')::date + 3 + time '23:30') at time zone 'Europe/Zurich'
    from public.fantasy_matchdays m where m.id = p_md
$$;

create or replace function private.fantasy_score(p_md integer, p_final boolean)
returns void language plpgsql set search_path = '' as $$
declare
  pol record; l record; club text; res record; mult int; total int;
  boost boolean; cutoff timestamptz; ran text[]; missed text[]; subs jsonb; used text[]; b text; st text;
begin
  select * into pol from private.fantasy_md_policy();
  cutoff := private.fantasy_sub_cutoff(p_md);
  for l in select * from public.fantasy_lineups where matchday_id = p_md and locked loop
    total := 0;
    boost := l.chip is not distinct from 'bench_boost';
    -- Which clubs have played, and which starters miss out (no match, or none played by the cut-off).
    ran := array(select c from unnest(l.clubs) c where (select r.played from private.fantasy_club_result(c, p_md, p_final) r));
    missed := array(
      select c from unnest(l.starters) c
       where not c = any (ran)
         and (p_final or now() >= cutoff
              or not exists (select 1 from public.fantasy_fixtures f where f.matchday_id = p_md and (f.home_club_id = c or f.away_club_id = c))));
    subs := '{}'::jsonb;
    used := '{}';
    if not boost then
      foreach st in array missed loop
        b := (select x from unnest(l.bench) with ordinality t(x, i) where x = any (ran) and not x = any (used) order by i limit 1);
        exit when b is null;
        used := used || b;
        subs := subs || jsonb_build_object(b, st);
      end loop;
    end if;
    foreach club in array l.clubs loop
      select * into res from private.fantasy_club_result(club, p_md, p_final);
      mult := case
        when boost then (case when club is not distinct from l.captain then pol.captain_mult else 1 end)
        when club = any (l.starters) and not club = any (missed) then (case when club is not distinct from l.captain then pol.captain_mult else 1 end)
        when club = any (used) then 1
        else 0 end;
      insert into public.fantasy_club_scores (user_id, matchday_id, club_id, starter, captain, played, base, multiplier, total, detail)
      values (l.user_id, p_md, club, club = any (l.starters), club is not distinct from l.captain, res.played, res.points, mult, res.points * mult,
              jsonb_build_object('matches', res.detail, 'chip', l.chip, 'sub_in_for', subs ->> club,
                                 'sub_out', case when club = any (missed) and not boost and exists (select 1 from jsonb_each_text(subs) e where e.value = club) then true else null end))
      on conflict (user_id, matchday_id, club_id) do update
        set starter = excluded.starter, captain = excluded.captain, played = excluded.played, base = excluded.base, multiplier = excluded.multiplier, total = excluded.total, detail = excluded.detail;
      total := total + res.points * mult;
    end loop;
    update public.fantasy_lineups set points = total - hits where user_id = l.user_id and matchday_id = p_md;
  end loop;
  if p_final then
    update public.fantasy_matchdays set status = 'scored', scored_at = now() where id = p_md;
    perform private.fantasy_move_prices(p_md);
    update public.fantasy_squads s set clubs = s.locked_clubs, bank = s.bank_locked, updated_at = now()
      from public.fantasy_lineups x where x.user_id = s.user_id and x.matchday_id = p_md and x.chip = 'free_hit';
    perform private.fantasy_after_scored(p_md);
  else
    update public.fantasy_matchdays set status = 'live' where id = p_md and status = 'locked';
    perform private.fantasy_notify_live(p_md);
  end if;
end $$;
