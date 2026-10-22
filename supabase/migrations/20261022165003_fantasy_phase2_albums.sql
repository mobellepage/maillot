-- Fantasy, phase 2: albums (themed sets of kits to complete, with a bridge
-- to the market on every slot that isn't Gold) and the weekly Kit Points
-- shop. Albums are made in the admin view (or seeded here from the library:
-- a legend's clubs, a league's season, a World Cup).

-- ---------------------------------------------------------------------------
-- Albums
-- ---------------------------------------------------------------------------
create table if not exists public.fantasy_albums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title jsonb not null,            -- {"en": …, "de": …, "fr": …}
  description jsonb not null default '{}'::jsonb,
  reward_points int not null default 100,
  active boolean not null default true,
  sort int not null default 100,
  created_at timestamptz not null default now()
);
create table if not exists public.fantasy_album_slots (
  album_id uuid not null references public.fantasy_albums (id) on delete cascade,
  kit_id uuid not null references public.kits (id) on delete cascade,
  sort int not null default 0,
  primary key (album_id, kit_id)
);
create index if not exists fantasy_album_slots_kit on public.fantasy_album_slots (kit_id);
-- When a player completed an album (and whether all its cards were Gold).
create table if not exists public.fantasy_album_done (
  user_id uuid not null references auth.users (id) on delete cascade,
  album_id uuid not null references public.fantasy_albums (id) on delete cascade,
  gold boolean not null default false,
  done_at timestamptz not null default now(),
  gold_at timestamptz,
  primary key (user_id, album_id)
);
-- Badges on the profile (albums, Gold albums, later: matchday wins, promotions).
create table if not exists public.fantasy_badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  data jsonb not null default '{}'::jsonb,
  earned_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.fantasy_albums enable row level security;
alter table public.fantasy_album_slots enable row level security;
alter table public.fantasy_album_done enable row level security;
alter table public.fantasy_badges enable row level security;
create policy fantasy_albums_read on public.fantasy_albums for select to anon, authenticated using (active);
create policy fantasy_album_slots_read on public.fantasy_album_slots for select to anon, authenticated using (true);
create policy fantasy_album_done_own on public.fantasy_album_done for select to authenticated using (user_id = (select auth.uid()));
create policy fantasy_badges_read on public.fantasy_badges for select to anon, authenticated using (true);
grant select on public.fantasy_albums, public.fantasy_album_slots, public.fantasy_badges to anon, authenticated;
grant select on public.fantasy_album_done to authenticated;
-- Admins make albums (the admin view; is_admin checks MFA).
create policy fantasy_albums_admin on public.fantasy_albums for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy fantasy_album_slots_admin on public.fantasy_album_slots for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant insert, update, delete on public.fantasy_albums, public.fantasy_album_slots to authenticated;

-- The kits a player holds as cards (digital or Gold), for album progress.
create or replace function private.fantasy_owned_kits(p_user uuid)
returns table (kit_id uuid, gold boolean)
language sql stable as $$
  select kit_id, bool_or(gold) from (
    select c.kit_id, false as gold from public.fantasy_cards c where c.user_id = p_user
    union all
    select private.fantasy_item_kit(ci), true from public.custom_items ci where ci.user_id = p_user and private.fantasy_gold_ok(ci)
  ) x where kit_id is not null group by kit_id
$$;

-- Albums just completed: badge, points, Gold badge — called after anything that adds a card.
create or replace function private.fantasy_check_albums(p_user uuid)
returns void language plpgsql as $$
declare r record;
begin
  for r in
    select a.id, a.slug, a.reward_points,
           count(*) as total,
           count(o.kit_id) as have,
           count(*) filter (where o.gold) as gold
      from public.fantasy_albums a
      join public.fantasy_album_slots s on s.album_id = a.id
      left join private.fantasy_owned_kits(p_user) o on o.kit_id = s.kit_id
     where a.active
     group by a.id, a.slug, a.reward_points
    having count(o.kit_id) = count(*)
  loop
    if not exists (select 1 from public.fantasy_album_done d where d.user_id = p_user and d.album_id = r.id) then
      insert into public.fantasy_album_done (user_id, album_id) values (p_user, r.id);
      insert into public.fantasy_badges (user_id, key, data) values (p_user, 'album:' || r.slug, jsonb_build_object('album', r.slug)) on conflict do nothing;
      perform private.fantasy_add_points(p_user, r.reward_points, 'album', r.slug);
    end if;
    if r.gold = r.total and not exists (select 1 from public.fantasy_album_done d where d.user_id = p_user and d.album_id = r.id and d.gold) then
      update public.fantasy_album_done set gold = true, gold_at = now() where user_id = p_user and album_id = r.id;
      insert into public.fantasy_badges (user_id, key, data) values (p_user, 'gold-album:' || r.slug, jsonb_build_object('album', r.slug, 'gold', true)) on conflict do nothing;
    end if;
  end loop;
end $$;

-- The albums, with the player's progress (zero for visitors).
create or replace function public.fantasy_albums()
returns table (id uuid, slug text, title jsonb, description jsonb, reward_points int, total int, have int, gold int, done boolean, done_gold boolean, cover text, sort int)
language sql stable security definer set search_path = '' as $$
  select a.id, a.slug, a.title, a.description, a.reward_points,
         count(s.kit_id)::int,
         count(o.kit_id)::int,
         count(*) filter (where o.gold)::int,
         coalesce(d.user_id is not null, false),
         coalesce(d.gold, false),
         (select k.image_path from public.fantasy_album_slots s2 join public.kits k on k.id = s2.kit_id where s2.album_id = a.id order by s2.sort limit 1),
         a.sort
    from public.fantasy_albums a
    join public.fantasy_album_slots s on s.album_id = a.id
    left join private.fantasy_owned_kits((select auth.uid())) o on o.kit_id = s.kit_id
    left join public.fantasy_album_done d on d.album_id = a.id and d.user_id = (select auth.uid())
   where a.active
   group by a.id, d.user_id, d.gold
   order by (d.user_id is not null), a.sort, a.title ->> 'en'
$$;
revoke all on function public.fantasy_albums() from public;
grant execute on function public.fantasy_albums() to anon, authenticated;

-- One album: every slot, what the player has there, and the way to the real
-- shirt — offers on Maillot (count, lowest price), owners to ask, wishlist.
create or replace function public.fantasy_album(p_slug text)
returns table (
  kit_id uuid, club_id text, club_name text, season text, kind text, variant text, image_path text, rarity text, sort int,
  state text, copies int, item_id text, photo_path text, thumb_path text,
  offers int, min_price numeric, owners int, wished boolean
)
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as id),
  a as (select id from public.fantasy_albums where slug = p_slug and active)
  select k.id, k.club_id, c.name, k.season, k.kind, k.variant, k.image_path, k.rarity, s.sort,
         case when g.kit_id is not null then 'gold' when d.n > 0 then 'digital' else 'empty' end,
         coalesce(d.n, 0)::int, g.item_id, g.photo_path, g.thumb_path,
         (select count(*)::int from public.custom_items ci where ci.kit_id = k.id and ci.visibility in ('forsale', 'offers') and private.shown(ci) and ci.user_id is distinct from me.id),
         (select min(private.price_of(ci.sale_price)) from public.custom_items ci where ci.kit_id = k.id and ci.visibility = 'forsale' and private.shown(ci) and ci.user_id is distinct from me.id),
         (select count(*)::int from public.custom_items ci where ci.kit_id = k.id and private.shown(ci) and ci.user_id is distinct from me.id),
         exists (select 1 from public.kit_likes l, me where l.user_id = me.id and l.kit_id = k.id)
    from a
    join public.fantasy_album_slots s on s.album_id = a.id
    join public.kits k on k.id = s.kit_id
    join public.kit_clubs c on c.id = k.club_id
    cross join me
    left join lateral (select count(*) n from public.fantasy_cards fc where fc.user_id = me.id and fc.kit_id = k.id) d on true
    left join lateral (
      select ci.id item_id, coalesce(ci.photos -> 'front_studio' ->> 'path', ci.photos -> 'front' ->> 'path') photo_path,
             coalesce(ci.photos -> 'front_studio' ->> 'thumbPath', ci.photos -> 'front' ->> 'thumbPath') thumb_path, private.fantasy_item_kit(ci) kit_id
        from public.custom_items ci where ci.user_id = me.id and private.fantasy_gold_ok(ci) and private.fantasy_item_kit(ci) = k.id
       order by ci.created_at limit 1) g on true
   order by s.sort
$$;
revoke all on function public.fantasy_album(text) from public;
grant execute on function public.fantasy_album(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The weekly shop: six kits a week (four common, two rare), bought with Kit Points.
-- ---------------------------------------------------------------------------
create table if not exists public.fantasy_shop_buys (
  user_id uuid not null references auth.users (id) on delete cascade,
  week date not null,
  kit_id uuid not null references public.kits (id) on delete cascade,
  bought_at timestamptz not null default now(),
  primary key (user_id, week, kit_id)
);
alter table public.fantasy_shop_buys enable row level security;
create policy fantasy_shop_buys_own on public.fantasy_shop_buys for select to authenticated using (user_id = (select auth.uid()));
grant select on public.fantasy_shop_buys to authenticated;

create or replace function private.fantasy_shop_policy()
returns table (price_common int, price_rare int, n_common int, n_rare int)
language sql immutable as $$ select 60, 150, 4, 2 $$;

create or replace function private.fantasy_week()
returns date language sql stable as $$ select date_trunc('week', private.fantasy_day())::date $$;

-- This week's six, drawn the same for everyone from the featured clubs' kits.
create or replace function private.fantasy_shop_kits(p_week date)
returns table (kit_id uuid, price int)
language sql stable as $$
  with pol as (select * from private.fantasy_shop_policy())
  (select k.id, pol.price_common from public.kits k join public.kit_clubs c on c.id = k.club_id, pol
    where k.rarity = 'common' and k.image_path is not null and c.featured
    order by md5(p_week::text || k.id::text) limit (select n_common from pol))
  union all
  (select k.id, pol.price_rare from public.kits k join public.kit_clubs c on c.id = k.club_id, pol
    where k.rarity = 'rare' and k.image_path is not null and c.featured
    order by md5(p_week::text || k.id::text) limit (select n_rare from pol))
$$;

create or replace function public.fantasy_shop()
returns table (kit_id uuid, club_id text, club_name text, season text, kind text, variant text, image_path text, rarity text, price int, owned boolean, bought boolean, week_ends date)
language sql stable security definer set search_path = '' as $$
  select k.id, k.club_id, c.name, k.season, k.kind, k.variant, k.image_path, k.rarity, s.price,
         exists (select 1 from private.fantasy_owned_kits((select auth.uid())) o where o.kit_id = k.id),
         exists (select 1 from public.fantasy_shop_buys b where b.user_id = (select auth.uid()) and b.week = private.fantasy_week() and b.kit_id = k.id),
         private.fantasy_week() + 7
    from private.fantasy_shop_kits(private.fantasy_week()) s
    join public.kits k on k.id = s.kit_id
    join public.kit_clubs c on c.id = k.club_id
   order by s.price, c.name
$$;
revoke all on function public.fantasy_shop() from public;
grant execute on function public.fantasy_shop() to anon, authenticated;

create or replace function public.fantasy_buy_card(p_kit uuid)
returns int language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  pl public.fantasy_players;
  pr int;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.hit('fantasy:shop:' || uid, 30, interval '1 day');
  select price into pr from private.fantasy_shop_kits(private.fantasy_week()) where kit_id = p_kit;
  if pr is null then raise exception 'not_in_shop' using errcode = 'P0463'; end if;
  if exists (select 1 from public.fantasy_shop_buys where user_id = uid and week = private.fantasy_week() and kit_id = p_kit) then
    raise exception 'already_bought' using errcode = 'P0464';
  end if;
  pl := private.fantasy_player(uid);
  if pl.points < pr then raise exception 'not_enough_points' using errcode = 'P0461'; end if;
  perform private.fantasy_add_points(uid, -pr, 'shop', p_kit::text);
  insert into public.fantasy_shop_buys (user_id, week, kit_id) values (uid, private.fantasy_week(), p_kit);
  insert into public.fantasy_cards (user_id, kit_id, source) values (uid, p_kit, 'shop');
  perform private.fantasy_check_albums(uid);
  return pr;
end $$;
revoke all on function public.fantasy_buy_card(uuid) from public;
grant execute on function public.fantasy_buy_card(uuid) to authenticated;

-- New cards (a pack, the shop) and changes to the collection (Gold) can complete an album.
create or replace function private.fantasy_cards_added()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.fantasy_check_albums(u) from (select distinct user_id u from ins) x;
  return null;
end $$;
drop trigger if exists fantasy_cards_albums on public.fantasy_cards;
create trigger fantasy_cards_albums after insert on public.fantasy_cards
  referencing new table as ins for each statement execute function private.fantasy_cards_added();
create or replace function private.fantasy_item_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.fantasy_players p where p.user_id = new.user_id) then perform private.fantasy_check_albums(new.user_id); end if;
  return null;
end $$;
drop trigger if exists fantasy_item_albums on public.custom_items;
create trigger fantasy_item_albums after insert or update of kit_id, photos, verification, precheck on public.custom_items
  for each row execute function private.fantasy_item_changed();

-- ---------------------------------------------------------------------------
-- Seed: albums from the library
-- ---------------------------------------------------------------------------
-- A legend's clubs: the first home kit of every club they wore (max 12).
insert into public.fantasy_albums (slug, title, description, reward_points, sort)
select 'legend-' || l.legend,
       jsonb_build_object('en', initcap(replace(l.legend, '-', ' ')) || ' — every club', 'de', initcap(replace(l.legend, '-', ' ')) || ' — jeder Verein', 'fr', initcap(replace(l.legend, '-', ' ')) || ' — chaque club'),
       jsonb_build_object('en', 'One home kit from every club of the career.', 'de', 'Ein Heimtrikot von jedem Verein der Karriere.', 'fr', 'Un maillot domicile de chaque club de la carrière.'),
       150, 10
  from (select distinct legend from public.kit_legends) l
on conflict (slug) do nothing;
insert into public.fantasy_album_slots (album_id, kit_id, sort)
select album_id, kit_id, row_number() over (partition by album_id order by season_year)
  from (
    select distinct on (a.id, k.club_id) a.id album_id, k.id kit_id, k.season_year
      from public.fantasy_albums a
      join public.kit_legends l on l.legend = replace(a.slug, 'legend-', '')
      join public.kits k on k.id = l.kit_id and k.image_path is not null
     where a.slug like 'legend-%'
     order by a.id, k.club_id, (k.kind = 'home') desc, k.season_year
  ) x
on conflict do nothing;
-- Keep legends' albums to at most 12 slots.
delete from public.fantasy_album_slots s using public.fantasy_albums a where a.id = s.album_id and a.slug like 'legend-%' and s.sort > 12;

-- A league's current season, home kits.
insert into public.fantasy_albums (slug, title, description, reward_points, sort) values
  ('premier-league-2025-26', '{"en": "Premier League 2025/26", "de": "Premier League 2025/26", "fr": "Premier League 2025/26"}', '{"en": "Every home kit of the season.", "de": "Alle Heimtrikots der Saison.", "fr": "Tous les maillots domicile de la saison."}', 200, 20),
  ('serie-a-2025-26', '{"en": "Serie A 2025/26", "de": "Serie A 2025/26", "fr": "Serie A 2025/26"}', '{"en": "Every home kit of the season.", "de": "Alle Heimtrikots der Saison.", "fr": "Tous les maillots domicile de la saison."}', 200, 21),
  ('bundesliga-2025-26', '{"en": "Bundesliga 2025/26", "de": "Bundesliga 2025/26", "fr": "Bundesliga 2025/26"}', '{"en": "Every home kit of the season.", "de": "Alle Heimtrikots der Saison.", "fr": "Tous les maillots domicile de la saison."}', 200, 22),
  ('la-liga-2025-26', '{"en": "La Liga 2025/26", "de": "La Liga 2025/26", "fr": "La Liga 2025/26"}', '{"en": "Every home kit of the season.", "de": "Alle Heimtrikots der Saison.", "fr": "Tous les maillots domicile de la saison."}', 200, 23),
  ('ligue-1-2025-26', '{"en": "Ligue 1 2025/26", "de": "Ligue 1 2025/26", "fr": "Ligue 1 2025/26"}', '{"en": "Every home kit of the season.", "de": "Alle Heimtrikots der Saison.", "fr": "Tous les maillots domicile de la saison."}', 200, 24),
  ('swiss-super-league-2025-26', '{"en": "Swiss Super League 2025/26", "de": "Super League 2025/26", "fr": "Super League 2025/26"}', '{"en": "Every home kit of the season.", "de": "Alle Heimtrikots der Saison.", "fr": "Tous les maillots domicile de la saison."}', 150, 25),
  ('world-cup-1998', '{"en": "World Cup 1998", "de": "WM 1998", "fr": "Coupe du monde 1998"}', '{"en": "The home kits of France 98.", "de": "Die Heimtrikots von Frankreich 98.", "fr": "Les maillots domicile de France 98."}', 300, 30)
on conflict (slug) do nothing;
insert into public.fantasy_album_slots (album_id, kit_id, sort)
select a.id, k.id, row_number() over (partition by a.id order by c.name)
  from public.fantasy_albums a
  join public.kit_clubs c on c.league = case a.slug
      when 'premier-league-2025-26' then 'Premier League' when 'serie-a-2025-26' then 'Serie A' when 'bundesliga-2025-26' then 'Bundesliga'
      when 'la-liga-2025-26' then 'La Liga' when 'ligue-1-2025-26' then 'Ligue 1' when 'swiss-super-league-2025-26' then 'Swiss Super League' end
  join public.kits k on k.club_id = c.id and k.season = '2025/26' and k.kind = 'home' and k.image_path is not null
on conflict do nothing;
insert into public.fantasy_album_slots (album_id, kit_id, sort)
select a.id, k.id, row_number() over (order by c.name)
  from public.fantasy_albums a
  join public.kit_clubs c on c.league = 'National Teams'
  join public.kits k on k.club_id = c.id and k.season = '1998' and k.kind = 'home' and k.image_path is not null
 where a.slug = 'world-cup-1998'
on conflict do nothing;
-- The World Cup album: the 16 best-known sides are enough to complete.
delete from public.fantasy_album_slots s using public.fantasy_albums a where a.id = s.album_id and a.slug = 'world-cup-1998' and s.sort > 16;
-- Albums with nothing in them aren't shown.
update public.fantasy_albums a set active = false where not exists (select 1 from public.fantasy_album_slots s where s.album_id = a.id);
