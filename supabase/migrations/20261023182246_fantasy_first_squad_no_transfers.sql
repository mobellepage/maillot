-- Building the first squad isn't a transfer: count none until the first deadline.
create or replace function public.fantasy_save_squad(p_clubs text[], p_md int default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  md public.fantasy_matchdays;
  pol record;
  sq public.fantasy_squads;
  l public.fantasy_lineups;
  added text[]; removed text[];
  v_bank numeric; n int; st text[]; cap text; auto record;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.hit('fantasy:squad:' || uid, 120, interval '1 hour');
  select * into pol from private.fantasy_md_policy();
  md := private.fantasy_open_matchday(p_md);
  insert into public.fantasy_squads (user_id, season_id) values (uid, md.season_id) on conflict (user_id) do nothing;
  select * into sq from public.fantasy_squads where user_id = uid for update;
  select coalesce(array_agg(c), '{}') into added from unnest(p_clubs) c where not (c = any (sq.locked_clubs));
  select coalesce(array_agg(c), '{}') into removed from unnest(sq.locked_clubs) c where not (c = any (p_clubs));
  perform private.fantasy_check_squad(p_clubs, added, md.id);
  v_bank := sq.bank_locked
        + coalesce((select sum(private.fantasy_club_price(c)) from unnest(removed) c), 0)
        - coalesce((select sum(private.fantasy_club_price(c)) from unnest(added) c), 0);
  if v_bank < 0 then raise exception 'over_budget' using errcode = 'P0474'; end if;
  n := case when sq.first_locked_md is null then 0 else coalesce(array_length(added, 1), 0) end;
  update public.fantasy_squads set clubs = p_clubs, bank = v_bank, updated_at = now() where user_id = uid;
  -- The line-up follows the squad: starters that left are replaced by the game's pick.
  l := private.fantasy_ensure_lineup(uid, md.id);
  if not (l.starters <@ p_clubs) or coalesce(array_length(l.starters, 1), 0) <> pol.starters then
    select * into auto from private.fantasy_auto_lineup(uid, md.id, p_clubs);
    st := coalesce(auto.starters, '{}');
    cap := auto.captain;
  else
    st := l.starters;
    cap := case when l.captain = any (st) then l.captain end;
  end if;
  update public.fantasy_lineups
     set clubs = p_clubs, starters = st, bench = (select coalesce(array_agg(c), '{}') from unnest(p_clubs) c where not (c = any (st))), captain = cap,
         transfers = n, hits = private.fantasy_hits(n, sq.free_transfers, l.chip, sq.first_locked_md is not null), carried = false, updated_at = now()
   where user_id = uid and matchday_id = md.id;
end $$;
revoke all on function public.fantasy_save_squad(text[], int) from public;
grant execute on function public.fantasy_save_squad(text[], int) to authenticated;

-- The first Gameweek's line-ups were the squads being built.
update public.fantasy_lineups l set transfers = 0
  from public.fantasy_squads s where s.user_id = l.user_id and s.first_locked_md = l.matchday_id and l.hits = 0;
