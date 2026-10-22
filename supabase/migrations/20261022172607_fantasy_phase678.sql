-- Fantasy, phases 6–8: the game on the public profile, prizes (pool,
-- winners, claim → ship → received → a shirt in the collection), admin
-- helpers (results override, rarity, missions), and notifications — each
-- type under one "fantasy" switch in the notification settings, with quiet
-- hours and per-event de-duplication.

-- ---------------------------------------------------------------------------
-- Notifications: the group, the ledger of what was sent, quiet hours
-- ---------------------------------------------------------------------------
create or replace function private.notification_group(p_type text)
returns text language sql immutable as $$
  select case
    when p_type in ('price_move', 'all_time_high', 'collection_week') then 'value'
    when p_type in ('wanted_in_collection', 'listing_alert') then 'wanted'
    when p_type in ('new_follower', 'followed_shirt', 'followed_listing', 'shirt_liked', 'shirt_comment') then 'social'
    when p_type like 'fantasy_%' then 'fantasy'
  end
$$;

create table if not exists private.fantasy_notified (
  user_id uuid not null,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Writes a Fantasy notification once per key (quiet hours 22–08 Zurich for the chatty ones).
create or replace function private.fantasy_notify(p_user uuid, p_type text, p_key text, p_title text, p_body text, p_data jsonb, p_quiet boolean default false)
returns boolean language plpgsql as $$
begin
  if p_quiet and extract(hour from now() at time zone 'Europe/Zurich') not between 8 and 21 then return false; end if;
  insert into private.fantasy_notified (user_id, key) values (p_user, p_key) on conflict do nothing;
  if not found then return false; end if;
  insert into public.notifications (user_id, type, title, body, data) values (p_user, p_type, p_title, p_body, p_data);
  return true;
end $$;

-- After a matchday is scored: the result, head-to-head verdicts, the manager.
create or replace function private.fantasy_notify_scored(p_md int)
returns void language plpgsql as $$
declare md public.fantasy_matchdays; r record; n int; h record; lg text; other text;
begin
  select * into md from public.fantasy_matchdays where id = p_md;
  select count(*) into n from public.fantasy_lineups where matchday_id = p_md and locked;
  for r in select l.user_id, l.points, rank() over (order by l.points desc) rk from public.fantasy_lineups l where l.matchday_id = p_md and l.locked loop
    perform private.fantasy_notify(r.user_id, 'fantasy_result', 'result:' || p_md, 'Matchday result',
      'Matchday ' || md.number || ': ' || r.points || ' points, rank ' || r.rk || ' of ' || n || '.',
      jsonb_build_object('link', '/fantasy/matchday/' || p_md, 'matchday', md.number, 'points', r.points, 'rank', r.rk, 'players', n));
    if r.rk = 1 then
      perform private.fantasy_notify(r.user_id, 'fantasy_motm', 'motm:' || p_md, 'Manager of the Matchday',
        'Top score of Matchday ' || md.number || ': ' || r.points || ' points.',
        jsonb_build_object('link', '/fantasy/matchday/' || p_md, 'matchday', md.number, 'points', r.points));
    end if;
  end loop;
  for h in select x.*, g.name from public.fantasy_h2h x join public.fantasy_leagues g on g.id = x.league_id where x.matchday_id = p_md and x.user_b is not null loop
    select handle into other from public.profiles where id = h.user_b;
    perform private.fantasy_notify(h.user_a, 'fantasy_h2h', 'h2h:' || p_md || ':' || h.league_id,
      case h.result when 'a' then 'Head-to-head: won' when 'b' then 'Head-to-head: lost' else 'Head-to-head: draw' end,
      h.name || ': ' || h.points_a || '–' || h.points_b || ' against @' || coalesce(other, '?') || '.',
      jsonb_build_object('link', '/fantasy/league/' || h.league_id, 'handle', other, 'a', h.points_a, 'b', h.points_b, 'league', h.name));
    select handle into other from public.profiles where id = h.user_a;
    perform private.fantasy_notify(h.user_b, 'fantasy_h2h', 'h2h:' || p_md || ':' || h.league_id,
      case h.result when 'b' then 'Head-to-head: won' when 'a' then 'Head-to-head: lost' else 'Head-to-head: draw' end,
      h.name || ': ' || h.points_b || '–' || h.points_a || ' against @' || coalesce(other, '?') || '.',
      jsonb_build_object('link', '/fantasy/league/' || h.league_id, 'handle', other, 'a', h.points_b, 'b', h.points_a, 'league', h.name));
  end loop;
end $$;

-- After a cup closes: promotions.
create or replace function private.fantasy_notify_cup_closed(p_cup int)
returns void language plpgsql as $$
declare b record;
begin
  for b in select * from public.fantasy_badges where key = 'promoted:' || p_cup loop
    perform private.fantasy_notify(b.user_id, 'fantasy_promoted', 'promoted:' || p_cup, 'Promoted',
      'You are in Division ' || (b.data ->> 'to') || ' for the next cup.',
      jsonb_build_object('link', '/fantasy/standings', 'division', (b.data ->> 'to')::int, 'cup', b.data ->> 'cup'));
  end loop;
end $$;

-- The reminders the clock sends: pack ready, deadline, cup end, one album nudge a week.
create or replace function private.fantasy_notify_tick()
returns void language plpgsql as $$
declare pol record; md public.fantasy_matchdays; r record; wk text := to_char(private.fantasy_week(), 'YYYY-MM-DD'); lg record;
begin
  select * into pol from private.fantasy_policy();
  -- Pack ready (at most two a day: one per pack interval, quiet hours respected).
  for r in
    select p.user_id, p.packs, p.next_pack_at from public.fantasy_players p
     where p.packs > 0 and p.last_open_day is distinct from private.fantasy_day()
  loop
    perform private.fantasy_notify(r.user_id, 'fantasy_pack', 'pack:' || to_char(now(), 'YYYY-MM-DD') || ':' || (extract(hour from now())::int / 12),
      'Your pack is ready', 'A new pack of ' || pol.cards_per_pack || ' cards is waiting for you.', jsonb_build_object('link', '/fantasy'), true);
  end loop;
  -- Deadline in three hours: everyone who has played before and has no line-up yet.
  for md in select * from public.fantasy_matchdays where status = 'upcoming' and deadline between now() and now() + interval '3 hours' loop
    for r in
      select p.user_id from public.fantasy_players p
       where exists (select 1 from public.fantasy_lineups l where l.user_id = p.user_id)
         and not exists (select 1 from public.fantasy_lineups l where l.user_id = p.user_id and l.matchday_id = md.id)
    loop
      perform private.fantasy_notify(r.user_id, 'fantasy_deadline', 'deadline:' || md.id, 'Deadline in 3 hours – set your captain',
        'Matchday ' || md.number || ' locks soon. Your previous line-up plays again if you do nothing.',
        jsonb_build_object('link', '/fantasy/matchday/' || md.id, 'matchday', md.number));
    end loop;
  end loop;
  -- The cup ends this weekend: where you stand in your leagues.
  for md in select m.* from public.fantasy_matchdays m where m.status = 'upcoming' and m.deadline between now() and now() + interval '3 days'
             and not exists (select 1 from public.fantasy_matchdays m2 where m2.cup_id = m.cup_id and m2.window_start > m.window_start) loop
    for lg in
      select s.user_id, g.name, row_number() over (partition by s.scope_id order by s.h2h_pts desc, s.points desc) rk
        from public.fantasy_standings s join public.fantasy_leagues g on g.id::text = s.scope_id
       where s.scope = 'league' and s.period = md.cup_id::text
    loop
      perform private.fantasy_notify(lg.user_id, 'fantasy_cup_end', 'cupend:' || md.cup_id, 'Cup ends this weekend',
        'You are ' || lg.rk || '. in ' || lg.name || '. Last Matchday: set your line-up.',
        jsonb_build_object('link', '/fantasy/matchday/' || md.id, 'rank', lg.rk, 'league', lg.name));
    end loop;
  end loop;
  -- One shirt missing from an album, and it's on Maillot: once a week.
  for r in
    select o.user_id, a.slug, a.title, x.kit_id,
           (select count(*) from public.custom_items ci where ci.kit_id = x.kit_id and ci.visibility in ('forsale', 'offers') and private.shown(ci) and ci.user_id <> o.user_id) offers,
           (select min(private.price_of(ci.sale_price)) from public.custom_items ci where ci.kit_id = x.kit_id and ci.visibility = 'forsale' and private.shown(ci) and ci.user_id <> o.user_id) min_price
      from public.fantasy_players o
      join public.fantasy_albums a on a.active
      join lateral (
        select s.kit_id from public.fantasy_album_slots s where s.album_id = a.id
           and not exists (select 1 from private.fantasy_owned_kits(o.user_id) k where k.kit_id = s.kit_id)
      ) x on true
     where (select count(*) from public.fantasy_album_slots s where s.album_id = a.id
              and not exists (select 1 from private.fantasy_owned_kits(o.user_id) k where k.kit_id = s.kit_id)) = 1
       and not exists (select 1 from private.fantasy_notified n where n.user_id = o.user_id and n.key like 'album:' || wk || '%')
  loop
    if r.offers > 0 then
      perform private.fantasy_notify(r.user_id, 'fantasy_album', 'album:' || wk, '1 shirt missing for ' || (r.title ->> 'en'),
        r.offers || ' available on Maillot' || case when r.min_price is not null then ' from CHF ' || round(r.min_price) else '' end || '.',
        jsonb_build_object('link', '/fantasy/album/' || r.slug, 'album', r.title ->> 'en', 'offers', r.offers, 'amount', r.min_price), true);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Prizes
-- ---------------------------------------------------------------------------
create table if not exists public.fantasy_prize_pool (
  id serial primary key,
  cup_id int references public.fantasy_cups (id) on delete cascade,   -- null: every cup
  scope text not null check (scope in ('division', 'league')),
  rank int not null default 1,
  type text not null check (type in ('shirt', 'voucher', 'points')),
  title text not null,
  description text,
  value numeric,                 -- CHF for a voucher, Kit Points for points
  sponsor_name text,
  sponsor_logo text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.fantasy_prizes (
  id uuid primary key default gen_random_uuid(),
  pool_id int references public.fantasy_prize_pool (id) on delete set null,
  cup_id int not null references public.fantasy_cups (id) on delete cascade,
  scope text not null,
  scope_id text not null,
  scope_name text,
  rank int not null,
  winner_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  value numeric,
  sponsor_name text,
  sponsor_logo text,
  status text not null default 'won' check (status in ('won', 'claimed', 'shipped', 'received', 'cancelled')),
  claim jsonb,
  kit_id uuid references public.kits (id),
  item_id text,
  claimed_at timestamptz,
  shipped_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists fantasy_prizes_winner on public.fantasy_prizes (winner_id, created_at desc);
alter table public.fantasy_prize_pool enable row level security;
alter table public.fantasy_prizes enable row level security;
create policy fantasy_prize_pool_read on public.fantasy_prize_pool for select to anon, authenticated using (active);
create policy fantasy_prize_pool_admin on public.fantasy_prize_pool for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy fantasy_prizes_own on public.fantasy_prizes for select to authenticated using (winner_id = (select auth.uid()) or public.is_admin());
grant select on public.fantasy_prize_pool to anon, authenticated;
grant insert, update, delete on public.fantasy_prize_pool to authenticated;
grant select on public.fantasy_prizes to authenticated;
-- Admins edit missions, mappings and fixtures from the admin view.
create policy fantasy_missions_admin on public.fantasy_missions for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant insert, update, delete on public.fantasy_missions to authenticated;

-- Default pool: Kit Points for the top three of every division, and for every league winner.
insert into public.fantasy_prize_pool (scope, rank, type, title, description, value)
select * from (values
  ('division', 1, 'points', '1st in the division', 'Kit Points for winning your division this cup.', 500),
  ('division', 2, 'points', '2nd in the division', 'Kit Points for second place.', 300),
  ('division', 3, 'points', '3rd in the division', 'Kit Points for third place.', 150),
  ('league', 1, 'points', 'League winner', 'Kit Points for winning a league of 20 or more.', 300)
) v (scope, rank, type, title, description, value)
where not exists (select 1 from public.fantasy_prize_pool);

-- Cup closed: the winners get their prizes (points at once; shirts and vouchers to claim).
create or replace function private.fantasy_award_prizes(p_cup int)
returns void language plpgsql as $$
declare pol record; cup public.fantasy_cups; d record; r record; pz record; lg record; pid uuid;
begin
  select * into pol from private.fantasy_league_policy();
  select * into cup from public.fantasy_cups where id = p_cup;
  for d in select * from public.fantasy_divisions where cup_id = p_cup loop
    for r in
      select s.user_id, row_number() over (order by s.points desc, s.user_id) rk from public.fantasy_standings s
       where s.scope = 'division' and s.scope_id = d.id::text and s.period = p_cup::text
    loop
      for pz in select * from public.fantasy_prize_pool p where p.active and p.scope = 'division' and p.rank = r.rk and (p.cup_id is null or p.cup_id = p_cup) loop
        insert into public.fantasy_prizes (pool_id, cup_id, scope, scope_id, scope_name, rank, winner_id, type, title, value, sponsor_name, sponsor_logo, status)
        values (pz.id, p_cup, 'division', d.id::text, 'Division ' || d.number, r.rk, r.user_id, pz.type, pz.title, pz.value, pz.sponsor_name, pz.sponsor_logo, case when pz.type = 'points' then 'received' else 'won' end)
        returning id into pid;
        if pz.type = 'points' then perform private.fantasy_add_points(r.user_id, coalesce(pz.value, 0)::int, 'prize', pid::text); end if;
        perform private.fantasy_notify(r.user_id, 'fantasy_prize', 'prize:' || pid, 'You won a prize', pz.title || ' – ' || cup.name || ', ' || 'Division ' || d.number || '.',
          jsonb_build_object('link', '/fantasy/prizes', 'prize', pz.title, 'cup', cup.name));
      end loop;
    end loop;
  end loop;
  for lg in select l.* from public.fantasy_leagues l where (select count(*) from public.fantasy_league_members m where m.league_id = l.id) >= pol.min_league_size_prizes loop
    for r in
      select s.user_id, row_number() over (order by s.h2h_pts desc, s.points desc, s.user_id) rk from public.fantasy_standings s
       where s.scope = 'league' and s.scope_id = lg.id::text and s.period = p_cup::text
    loop
      for pz in select * from public.fantasy_prize_pool p where p.active and p.scope = 'league' and p.rank = r.rk and (p.cup_id is null or p.cup_id = p_cup) loop
        insert into public.fantasy_prizes (pool_id, cup_id, scope, scope_id, scope_name, rank, winner_id, type, title, value, sponsor_name, sponsor_logo, status)
        values (pz.id, p_cup, 'league', lg.id::text, lg.name, r.rk, r.user_id, pz.type, pz.title, pz.value, pz.sponsor_name, pz.sponsor_logo, case when pz.type = 'points' then 'received' else 'won' end)
        returning id into pid;
        if pz.type = 'points' then perform private.fantasy_add_points(r.user_id, coalesce(pz.value, 0)::int, 'prize', pid::text); end if;
        perform private.fantasy_notify(r.user_id, 'fantasy_prize', 'prize:' || pid, 'You won a prize', pz.title || ' – ' || cup.name || ', ' || lg.name || '.',
          jsonb_build_object('link', '/fantasy/prizes', 'prize', pz.title, 'cup', cup.name));
      end loop;
    end loop;
  end loop;
end $$;

create or replace function public.fantasy_my_prizes()
returns table (id uuid, cup_name text, scope text, scope_name text, rank int, type text, title text, value numeric, sponsor_name text, sponsor_logo text, status text, claim jsonb, kit_id uuid, kit_name text, item_id text, created_at timestamptz, shipped_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, c.name, p.scope, p.scope_name, p.rank, p.type, p.title, p.value, p.sponsor_name, p.sponsor_logo, p.status, p.claim, p.kit_id,
         (select cl.name || ' ' || k.season from public.kits k join public.kit_clubs cl on cl.id = k.club_id where k.id = p.kit_id), p.item_id, p.created_at, p.shipped_at
    from public.fantasy_prizes p join public.fantasy_cups c on c.id = p.cup_id
   where p.winner_id = (select auth.uid())
   order by p.created_at desc
$$;
revoke all on function public.fantasy_my_prizes() from public;
grant execute on function public.fantasy_my_prizes() to authenticated;

-- The winner says where to send it.
create or replace function public.fantasy_claim_prize(p_id uuid, p_claim jsonb)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_claim ->> 'name' is null or p_claim ->> 'street' is null or p_claim ->> 'city' is null then raise exception 'address' using errcode = 'P0490'; end if;
  update public.fantasy_prizes set status = 'claimed', claim = p_claim, claimed_at = now()
   where id = p_id and winner_id = uid and status = 'won' and type in ('shirt', 'voucher');
  if not found then raise exception 'not_claimable' using errcode = 'P0491'; end if;
end $$;
revoke all on function public.fantasy_claim_prize(uuid, jsonb) from public;
grant execute on function public.fantasy_claim_prize(uuid, jsonb) to authenticated;

-- The shirt arrived: it joins the collection (with the library kit the admin named); a photo makes it Gold.
create or replace function public.fantasy_prize_received(p_id uuid)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); pz public.fantasy_prizes; kit record; iid text;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into pz from public.fantasy_prizes where id = p_id and winner_id = uid and status = 'shipped';
  if pz.id is null then raise exception 'not_shipped' using errcode = 'P0492'; end if;
  if pz.type = 'shirt' and pz.kit_id is not null then
    select k.season, k.kind, c.name club_name into kit from public.kits k join public.kit_clubs c on c.id = k.club_id where k.id = pz.kit_id;
    iid := 'prize-' || replace(pz.id::text, '-', '');
    insert into public.custom_items (id, user_id, kit_id, proposed_club, proposed_season, proposed_variant, visibility, provenance)
    values (iid, uid, pz.kit_id, kit.club_name, kit.season, kit.kind, 'public', 'Fantasy prize')
    on conflict (id) do nothing;
  end if;
  update public.fantasy_prizes set status = 'received', received_at = now(), item_id = iid where id = p_id;
  return iid;
end $$;
revoke all on function public.fantasy_prize_received(uuid) from public;
grant execute on function public.fantasy_prize_received(uuid) to authenticated;

-- Admin: fulfilment list and status changes.
create or replace function public.fantasy_admin_prizes(p_limit int default 200)
returns table (id uuid, cup_name text, scope_name text, rank int, type text, title text, value numeric, sponsor_name text, status text, claim jsonb, kit_id uuid, winner_handle text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, c.name, p.scope_name, p.rank, p.type, p.title, p.value, p.sponsor_name, p.status, p.claim, p.kit_id, pr.handle, p.created_at
    from public.fantasy_prizes p join public.fantasy_cups c on c.id = p.cup_id join public.profiles pr on pr.id = p.winner_id
   where public.is_admin() and p.type <> 'points'
   order by case p.status when 'claimed' then 0 when 'won' then 1 when 'shipped' then 2 else 3 end, p.created_at desc
   limit p_limit
$$;
revoke all on function public.fantasy_admin_prizes(int) from public;
grant execute on function public.fantasy_admin_prizes(int) to authenticated;

create or replace function public.fantasy_admin_prize_update(p_id uuid, p_status text, p_kit uuid default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  update public.fantasy_prizes
     set status = p_status, kit_id = coalesce(p_kit, kit_id),
         shipped_at = case when p_status = 'shipped' then now() else shipped_at end
   where id = p_id;
end $$;
revoke all on function public.fantasy_admin_prize_update(uuid, text, uuid) from public;
grant execute on function public.fantasy_admin_prize_update(uuid, text, uuid) to authenticated;

-- Admin: a fixture's result by hand (kept on resync), a kit's rarity.
create or replace function public.fantasy_admin_fixture(p_id bigint, p_home int, p_away int, p_status text default 'finished')
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  update public.fantasy_fixtures set home_goals = p_home, away_goals = p_away, status = p_status, overridden = true, updated_at = now() where id = p_id;
end $$;
revoke all on function public.fantasy_admin_fixture(bigint, int, int, text) from public;
grant execute on function public.fantasy_admin_fixture(bigint, int, int, text) to authenticated;

create or replace function public.fantasy_admin_set_rarity(p_kit uuid, p_rarity text)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  update public.kits set rarity = p_rarity where id = p_kit;
end $$;
revoke all on function public.fantasy_admin_set_rarity(uuid, text) from public;
grant execute on function public.fantasy_admin_set_rarity(uuid, text) to authenticated;

-- Admin: the matchdays, for the fixtures view.
create or replace function public.fantasy_admin_matchdays()
returns table (id int, number int, window_start timestamptz, status text, fixtures int, lineups int, cup_name text)
language sql stable security definer set search_path = '' as $$
  select m.id, m.number, m.window_start, m.status,
         (select count(*)::int from public.fantasy_fixtures f where f.matchday_id = m.id),
         (select count(*)::int from public.fantasy_lineups l where l.matchday_id = m.id),
         c.name
    from public.fantasy_matchdays m join public.fantasy_cups c on c.id = m.cup_id
   where public.is_admin()
   order by m.window_start desc limit 20
$$;
revoke all on function public.fantasy_admin_matchdays() from public;
grant execute on function public.fantasy_admin_matchdays() to authenticated;

-- ---------------------------------------------------------------------------
-- The clock, now with reminders
-- ---------------------------------------------------------------------------
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
  return jsonb_build_object('locked', locked, 'live', live, 'scored', scored);
end $$;
revoke all on function public.fantasy_tick() from public;

-- ---------------------------------------------------------------------------
-- The game on a public profile
-- ---------------------------------------------------------------------------
create or replace function public.fantasy_public_profile(p_handle text)
returns table (plays boolean, division_number int, season_points int, season_rank int, best_points int, best_matchday int, played int, leagues int, badges jsonb, albums jsonb, gold jsonb)
language sql stable security definer set search_path = '' as $$
  with who as (select p.id, p.collection_private from public.profiles p where lower(p.handle) = lower(p_handle)),
  md as (select m.* from public.fantasy_matchdays m where m.id = private.fantasy_current_matchday())
  select exists (select 1 from public.fantasy_players fp, who where fp.user_id = who.id),
         (select d.number from public.fantasy_divisions d join public.fantasy_division_members dm on dm.division_id = d.id, who, md where dm.user_id = who.id and d.cup_id = md.cup_id),
         coalesce((select s.points from public.fantasy_standings s, who, md where s.scope = 'season' and s.scope_id = md.season_id::text and s.user_id = who.id), 0),
         (select r.rn::int from (select s.user_id, row_number() over (order by s.points desc, s.user_id) rn from public.fantasy_standings s, md where s.scope = 'season' and s.scope_id = md.season_id::text) r, who where r.user_id = who.id),
         (select max(l.points) from public.fantasy_lineups l, who where l.user_id = who.id and l.locked),
         (select m.number from public.fantasy_lineups l join public.fantasy_matchdays m on m.id = l.matchday_id, who where l.user_id = who.id and l.locked order by l.points desc limit 1),
         (select count(*)::int from public.fantasy_lineups l, who where l.user_id = who.id and l.locked),
         (select count(*)::int from public.fantasy_league_members m, who where m.user_id = who.id),
         (select coalesce(jsonb_agg(jsonb_build_object('key', b.key, 'data', b.data, 'at', b.earned_at) order by b.earned_at desc), '[]'::jsonb) from public.fantasy_badges b, who where b.user_id = who.id),
         (select coalesce(jsonb_agg(jsonb_build_object('slug', a.slug, 'title', a.title, 'gold', d.gold) order by d.gold desc, d.done_at desc), '[]'::jsonb) from public.fantasy_album_done d join public.fantasy_albums a on a.id = d.album_id, who where d.user_id = who.id),
         (select coalesce(jsonb_agg(jsonb_build_object('kit_id', k.id, 'club_name', c.name, 'season', k.season, 'kind', k.kind, 'variant', k.variant, 'image_path', k.image_path, 'rarity', k.rarity, 'photo_path', x.photo_path, 'thumb_path', x.thumb_path, 'verified', x.verified, 'item_id', x.item_id, 'handle', p_handle) order by x.since desc), '[]'::jsonb)
            from (
              select distinct on (private.fantasy_item_kit(ci)) private.fantasy_item_kit(ci) kit_id, ci.id item_id,
                     coalesce(ci.photos -> 'front_studio' ->> 'path', ci.photos -> 'front' ->> 'path') photo_path,
                     coalesce(ci.photos -> 'front_studio' ->> 'thumbPath', ci.photos -> 'front' ->> 'thumbPath') thumb_path,
                     (ci.verification ->> 'status' = 'verifiziert') or (ci.precheck ->> 'status' = 'ok') verified, ci.created_at since
                from public.custom_items ci, who
               where ci.user_id = who.id and not who.collection_private and private.fantasy_gold_ok(ci) and ci.visibility <> 'private'
               order by private.fantasy_item_kit(ci), ci.created_at limit 8) x
            join public.kits k on k.id = x.kit_id join public.kit_clubs c on c.id = k.club_id)
    from who
$$;
revoke all on function public.fantasy_public_profile(text) from public;
grant execute on function public.fantasy_public_profile(text) to anon, authenticated;
