-- The kit library: every kit a club has had, for inspiration — home, away,
-- third, goalkeeper, cup, European, training and special editions, season
-- by season. Clubs of the top five leagues are listed from the start (plus
-- the other clubs in the catalogue); kits come from the catalogue, from
-- members' suggestions (checked by an admin) and from admin imports of
-- data Maillot is allowed to use. No data is copied from other sites.

create table if not exists public.kit_clubs (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  league text not null,
  country text not null,
  colors text[] not null check (array_length(colors, 1) between 1 and 3),
  -- names the catalogue uses for this club (catalog_shirts.club)
  aliases text[] not null default '{}',
  top5 boolean not null default false
);
alter table public.kit_clubs enable row level security;
create policy kit_clubs_read on public.kit_clubs for select to anon, authenticated using (true);
revoke insert, update, delete on public.kit_clubs from anon, authenticated;

create table if not exists public.kits (
  id uuid primary key default gen_random_uuid(),
  club_id text not null references public.kit_clubs (id) on delete cascade,
  season text not null check (season ~ '^[0-9]{4}(/[0-9]{2}|–[0-9]{2})?$'),
  season_year int not null,
  kind text not null check (kind in ('home', 'away', 'third', 'fourth', 'goalkeeper', 'cup', 'european', 'training', 'special')),
  brand text check (char_length(brand) <= 40),
  sponsor text check (char_length(sponsor) <= 60),
  pattern text not null default 'plain' check (pattern in ('plain', 'stripes', 'pinstripes', 'hoops', 'halves', 'quarters', 'sash', 'gradient', 'graphic')),
  colors text[] not null check (array_length(colors, 1) between 1 and 3),
  note text check (char_length(note) <= 300),
  catalog_id text references public.catalog_shirts (id) on delete set null,
  source text not null check (source in ('catalogue', 'member', 'import')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  suggested_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists kits_club_season on public.kits (club_id, season_year desc) where status = 'approved';
create unique index if not exists kits_one_per_slot on public.kits (club_id, season, kind) where status = 'approved' and kind <> 'special';
alter table public.kits enable row level security;
create policy kits_read_approved on public.kits for select to anon, authenticated using (status = 'approved');
create policy kits_read_own on public.kits for select to authenticated using (suggested_by = (select auth.uid()));
create policy kits_read_admin on public.kits for select to authenticated using ((select public.is_admin()));
revoke insert, update, delete on public.kits from anon, authenticated;

-- Colours are #RRGGBB.
create or replace function private.valid_colors(p text[])
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(array_length(p, 1), 0) between 1 and 3 and not exists (select 1 from unnest(p) c where c !~ '^#[0-9A-Fa-f]{6}$')
$$;
alter table public.kits add constraint kits_colors_hex check (private.valid_colors(colors));
alter table public.kit_clubs add constraint kit_clubs_colors_hex check (private.valid_colors(colors));

-- A member suggests a missing kit; an admin checks it.
create or replace function public.suggest_kit(p_club text, p_season text, p_kind text, p_brand text, p_sponsor text, p_pattern text, p_colors text[], p_note text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'not signed in' using errcode = '42501'; end if;
  perform private.hit('kit-suggest:' || (select auth.uid()), 20, interval '1 day');
  if not exists (select 1 from public.kit_clubs where id = p_club) then raise exception 'unknown club' using errcode = '22023'; end if;
  insert into public.kits (club_id, season, season_year, kind, brand, sponsor, pattern, colors, note, source, status, suggested_by)
  values (p_club, trim(p_season), left(trim(p_season), 4)::int, p_kind, nullif(trim(p_brand), ''), nullif(trim(p_sponsor), ''), coalesce(p_pattern, 'plain'),
          p_colors, nullif(trim(p_note), ''), 'member', 'pending', (select auth.uid()))
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.suggest_kit(text, text, text, text, text, text, text[], text) from public, anon;
grant execute on function public.suggest_kit(text, text, text, text, text, text, text[], text) to authenticated;

create or replace function public.admin_review_kit(p_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.kits set status = case when p_approve then 'approved' else 'rejected' end where id = p_id and status = 'pending';
  if not found then raise exception 'no such suggestion' using errcode = 'P0002'; end if;
end $$;
revoke execute on function public.admin_review_kit(uuid, boolean) from public, anon;
grant execute on function public.admin_review_kit(uuid, boolean) to authenticated;

-- Import a batch of kits (JSON array of {club, season, kind, brand?, sponsor?,
-- pattern?, colors[], note?}) straight into the library. Existing kits for
-- the same club, season and kind are updated. Returns how many were saved.
create or replace function public.admin_import_kits(p_kits jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare k jsonb; n int := 0; v_season text; v_kind text;
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  if jsonb_typeof(p_kits) <> 'array' or jsonb_array_length(p_kits) > 2000 then raise exception 'expected an array of at most 2000 kits' using errcode = '22023'; end if;
  for k in select * from jsonb_array_elements(p_kits) loop
    v_season := trim(k ->> 'season');
    v_kind := k ->> 'kind';
    update public.kits set brand = nullif(trim(k ->> 'brand'), ''), sponsor = nullif(trim(k ->> 'sponsor'), ''), pattern = coalesce(k ->> 'pattern', 'plain'),
           colors = array(select jsonb_array_elements_text(k -> 'colors')), note = nullif(trim(k ->> 'note'), '')
     where club_id = k ->> 'club' and season = v_season and kind = v_kind and status = 'approved' and kind <> 'special';
    if not found then
      insert into public.kits (club_id, season, season_year, kind, brand, sponsor, pattern, colors, note, source, status)
      values (k ->> 'club', v_season, left(v_season, 4)::int, v_kind, nullif(trim(k ->> 'brand'), ''), nullif(trim(k ->> 'sponsor'), ''), coalesce(k ->> 'pattern', 'plain'),
              array(select jsonb_array_elements_text(k -> 'colors')), nullif(trim(k ->> 'note'), ''), 'import', 'approved');
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.admin_import_kits(jsonb) from public, anon;
grant execute on function public.admin_import_kits(jsonb) to authenticated;

-- Admin queue: pending suggestions with the club name.
create or replace function public.list_kit_suggestions_for_admin()
returns table (id uuid, club text, season text, kind text, brand text, sponsor text, pattern text, colors text[], note text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query select k.id, c.name, k.season, k.kind, k.brand, k.sponsor, k.pattern, k.colors, k.note, k.created_at
                 from public.kits k join public.kit_clubs c on c.id = k.club_id where k.status = 'pending' order by k.created_at;
end $$;
revoke execute on function public.list_kit_suggestions_for_admin() from public, anon;
grant execute on function public.list_kit_suggestions_for_admin() to authenticated;

-- Clubs: the top five leagues (as of the 2025/26 season) and the other clubs in the catalogue.
insert into public.kit_clubs (id, name, league, country, colors, aliases, top5) values
  -- Premier League
  ('arsenal', 'Arsenal', 'Premier League', 'England', '{#EF0107,#FFFFFF}', '{Arsenal}', true),
  ('aston-villa', 'Aston Villa', 'Premier League', 'England', '{#670E36,#95BFE5}', '{}', true),
  ('bournemouth', 'AFC Bournemouth', 'Premier League', 'England', '{#DA291C,#000000}', '{}', true),
  ('brentford', 'Brentford', 'Premier League', 'England', '{#E30613,#FFFFFF}', '{}', true),
  ('brighton', 'Brighton & Hove Albion', 'Premier League', 'England', '{#0057B8,#FFFFFF}', '{}', true),
  ('burnley', 'Burnley', 'Premier League', 'England', '{#6C1D45,#99D6EA}', '{}', true),
  ('chelsea', 'Chelsea', 'Premier League', 'England', '{#034694,#FFFFFF}', '{}', true),
  ('crystal-palace', 'Crystal Palace', 'Premier League', 'England', '{#1B458F,#C4122E}', '{}', true),
  ('everton', 'Everton', 'Premier League', 'England', '{#003399,#FFFFFF}', '{}', true),
  ('fulham', 'Fulham', 'Premier League', 'England', '{#FFFFFF,#000000}', '{}', true),
  ('leeds', 'Leeds United', 'Premier League', 'England', '{#FFFFFF,#1D428A,#FFCD00}', '{}', true),
  ('liverpool', 'Liverpool', 'Premier League', 'England', '{#C8102E,#FFFFFF}', '{Liverpool FC}', true),
  ('man-city', 'Manchester City', 'Premier League', 'England', '{#6CABDD,#FFFFFF}', '{}', true),
  ('man-united', 'Manchester United', 'Premier League', 'England', '{#DA291C,#FFFFFF,#000000}', '{Manchester United}', true),
  ('newcastle', 'Newcastle United', 'Premier League', 'England', '{#241F20,#FFFFFF}', '{}', true),
  ('nottingham-forest', 'Nottingham Forest', 'Premier League', 'England', '{#DD0000,#FFFFFF}', '{}', true),
  ('sunderland', 'Sunderland', 'Premier League', 'England', '{#EB172B,#FFFFFF}', '{}', true),
  ('tottenham', 'Tottenham Hotspur', 'Premier League', 'England', '{#FFFFFF,#132257}', '{}', true),
  ('west-ham', 'West Ham United', 'Premier League', 'England', '{#7A263A,#1BB1E7}', '{}', true),
  ('wolves', 'Wolverhampton Wanderers', 'Premier League', 'England', '{#FDB913,#231F20}', '{}', true),
  -- LaLiga
  ('alaves', 'Deportivo Alavés', 'La Liga', 'Spain', '{#0761AF,#FFFFFF}', '{}', true),
  ('athletic', 'Athletic Club', 'La Liga', 'Spain', '{#EE2523,#FFFFFF,#000000}', '{}', true),
  ('atletico', 'Atlético de Madrid', 'La Liga', 'Spain', '{#CB3524,#FFFFFF,#272E61}', '{}', true),
  ('barcelona', 'FC Barcelona', 'La Liga', 'Spain', '{#A50044,#004D98,#EDBB00}', '{FC Barcelona}', true),
  ('celta', 'Celta Vigo', 'La Liga', 'Spain', '{#8AC3EE,#FFFFFF}', '{}', true),
  ('elche', 'Elche CF', 'La Liga', 'Spain', '{#FFFFFF,#05642C}', '{}', true),
  ('espanyol', 'RCD Espanyol', 'La Liga', 'Spain', '{#007FC8,#FFFFFF}', '{}', true),
  ('getafe', 'Getafe CF', 'La Liga', 'Spain', '{#005999,#FFFFFF}', '{}', true),
  ('girona', 'Girona FC', 'La Liga', 'Spain', '{#CD2534,#FFFFFF}', '{}', true),
  ('levante', 'Levante UD', 'La Liga', 'Spain', '{#004D98,#B4053F}', '{}', true),
  ('mallorca', 'RCD Mallorca', 'La Liga', 'Spain', '{#E20613,#000000}', '{}', true),
  ('osasuna', 'CA Osasuna', 'La Liga', 'Spain', '{#D91A21,#0A346F}', '{}', true),
  ('rayo', 'Rayo Vallecano', 'La Liga', 'Spain', '{#FFFFFF,#E53027}', '{}', true),
  ('betis', 'Real Betis', 'La Liga', 'Spain', '{#0BB363,#FFFFFF}', '{}', true),
  ('real-madrid', 'Real Madrid', 'La Liga', 'Spain', '{#FFFFFF,#FEBE10,#00529F}', '{Real Madrid}', true),
  ('oviedo', 'Real Oviedo', 'La Liga', 'Spain', '{#0057A8,#FFFFFF}', '{}', true),
  ('real-sociedad', 'Real Sociedad', 'La Liga', 'Spain', '{#0067B1,#FFFFFF}', '{}', true),
  ('sevilla', 'Sevilla FC', 'La Liga', 'Spain', '{#FFFFFF,#D71920}', '{}', true),
  ('valencia', 'Valencia CF', 'La Liga', 'Spain', '{#FFFFFF,#000000,#EE3524}', '{}', true),
  ('villarreal', 'Villarreal CF', 'La Liga', 'Spain', '{#FFE667,#005187}', '{}', true),
  -- Bundesliga
  ('augsburg', 'FC Augsburg', 'Bundesliga', 'Germany', '{#BA3733,#46714D,#FFFFFF}', '{}', true),
  ('union-berlin', '1. FC Union Berlin', 'Bundesliga', 'Germany', '{#EB1923,#FFFFFF}', '{}', true),
  ('bremen', 'SV Werder Bremen', 'Bundesliga', 'Germany', '{#1D9053,#FFFFFF}', '{}', true),
  ('dortmund', 'Borussia Dortmund', 'Bundesliga', 'Germany', '{#FDE100,#000000}', '{}', true),
  ('frankfurt', 'Eintracht Frankfurt', 'Bundesliga', 'Germany', '{#E1000F,#000000,#FFFFFF}', '{}', true),
  ('freiburg', 'SC Freiburg', 'Bundesliga', 'Germany', '{#E2001A,#000000}', '{}', true),
  ('hamburg', 'Hamburger SV', 'Bundesliga', 'Germany', '{#FFFFFF,#0A3F86,#E3000F}', '{}', true),
  ('heidenheim', '1. FC Heidenheim', 'Bundesliga', 'Germany', '{#E2001A,#003B79}', '{}', true),
  ('hoffenheim', 'TSG Hoffenheim', 'Bundesliga', 'Germany', '{#1961B5,#FFFFFF}', '{}', true),
  ('koeln', '1. FC Köln', 'Bundesliga', 'Germany', '{#FFFFFF,#ED1C24}', '{}', true),
  ('leipzig', 'RB Leipzig', 'Bundesliga', 'Germany', '{#FFFFFF,#DD0741,#001F47}', '{}', true),
  ('leverkusen', 'Bayer 04 Leverkusen', 'Bundesliga', 'Germany', '{#E32221,#000000}', '{}', true),
  ('mainz', '1. FSV Mainz 05', 'Bundesliga', 'Germany', '{#C3141E,#FFFFFF}', '{}', true),
  ('gladbach', 'Borussia Mönchengladbach', 'Bundesliga', 'Germany', '{#FFFFFF,#000000,#1A9F3D}', '{}', true),
  ('bayern', 'FC Bayern München', 'Bundesliga', 'Germany', '{#DC052D,#FFFFFF,#0066B2}', '{FC Bayern München}', true),
  ('st-pauli', 'FC St. Pauli', 'Bundesliga', 'Germany', '{#624839,#FFFFFF,#E2001A}', '{}', true),
  ('stuttgart', 'VfB Stuttgart', 'Bundesliga', 'Germany', '{#FFFFFF,#E32219}', '{}', true),
  ('wolfsburg', 'VfL Wolfsburg', 'Bundesliga', 'Germany', '{#65B32E,#FFFFFF}', '{}', true),
  -- Serie A
  ('atalanta', 'Atalanta', 'Serie A', 'Italy', '{#1E71B8,#000000}', '{}', true),
  ('bologna', 'Bologna FC', 'Serie A', 'Italy', '{#1A2F48,#A21C26}', '{}', true),
  ('cagliari', 'Cagliari Calcio', 'Serie A', 'Italy', '{#A50044,#002350}', '{}', true),
  ('como', 'Como 1907', 'Serie A', 'Italy', '{#003DA5,#FFFFFF}', '{}', true),
  ('cremonese', 'US Cremonese', 'Serie A', 'Italy', '{#C8102E,#A7A8AA}', '{}', true),
  ('fiorentina', 'ACF Fiorentina', 'Serie A', 'Italy', '{#482E92,#FFFFFF}', '{}', true),
  ('genoa', 'Genoa CFC', 'Serie A', 'Italy', '{#A50044,#002B5C}', '{}', true),
  ('verona', 'Hellas Verona', 'Serie A', 'Italy', '{#002F6C,#FFD100}', '{}', true),
  ('inter', 'Inter', 'Serie A', 'Italy', '{#0068A8,#000000}', '{}', true),
  ('juventus', 'Juventus', 'Serie A', 'Italy', '{#FFFFFF,#000000}', '{Juventus}', true),
  ('lazio', 'SS Lazio', 'Serie A', 'Italy', '{#87D8F7,#FFFFFF}', '{}', true),
  ('lecce', 'US Lecce', 'Serie A', 'Italy', '{#FFD700,#C8102E}', '{}', true),
  ('milan', 'AC Milan', 'Serie A', 'Italy', '{#FB090B,#000000}', '{AC Milan}', true),
  ('napoli', 'SSC Napoli', 'Serie A', 'Italy', '{#12A0D7,#FFFFFF}', '{SSC Napoli}', true),
  ('parma', 'Parma Calcio', 'Serie A', 'Italy', '{#FFFFFF,#FFD200,#1B4D9B}', '{}', true),
  ('pisa', 'Pisa SC', 'Serie A', 'Italy', '{#003A70,#000000}', '{}', true),
  ('roma', 'AS Roma', 'Serie A', 'Italy', '{#8E1F2F,#F0BC42}', '{}', true),
  ('sassuolo', 'US Sassuolo', 'Serie A', 'Italy', '{#00A752,#000000}', '{}', true),
  ('torino', 'Torino FC', 'Serie A', 'Italy', '{#881F19,#FFFFFF}', '{}', true),
  ('udinese', 'Udinese Calcio', 'Serie A', 'Italy', '{#FFFFFF,#000000}', '{}', true),
  -- Ligue 1
  ('angers', 'Angers SCO', 'Ligue 1', 'France', '{#000000,#FFFFFF}', '{}', true),
  ('auxerre', 'AJ Auxerre', 'Ligue 1', 'France', '{#FFFFFF,#00539F}', '{}', true),
  ('brest', 'Stade Brestois', 'Ligue 1', 'France', '{#E30613,#FFFFFF}', '{}', true),
  ('le-havre', 'Le Havre AC', 'Ligue 1', 'France', '{#8EC6E8,#1D3765}', '{}', true),
  ('lens', 'RC Lens', 'Ligue 1', 'France', '{#FFD700,#E30613}', '{}', true),
  ('lille', 'LOSC Lille', 'Ligue 1', 'France', '{#E01E13,#1E2A4D}', '{}', true),
  ('lorient', 'FC Lorient', 'Ligue 1', 'France', '{#F58220,#000000}', '{}', true),
  ('lyon', 'Olympique Lyonnais', 'Ligue 1', 'France', '{#FFFFFF,#1D3C87,#DA001A}', '{}', true),
  ('marseille', 'Olympique de Marseille', 'Ligue 1', 'France', '{#FFFFFF,#2FAEE0}', '{}', true),
  ('metz', 'FC Metz', 'Ligue 1', 'France', '{#7A1C33,#FFFFFF}', '{}', true),
  ('monaco', 'AS Monaco', 'Ligue 1', 'France', '{#E2001A,#FFFFFF}', '{}', true),
  ('nantes', 'FC Nantes', 'Ligue 1', 'France', '{#FCD405,#00873E}', '{}', true),
  ('nice', 'OGC Nice', 'Ligue 1', 'France', '{#C8102E,#000000}', '{}', true),
  ('paris-fc', 'Paris FC', 'Ligue 1', 'France', '{#1F3A68,#FFFFFF}', '{}', true),
  ('psg', 'Paris Saint-Germain', 'Ligue 1', 'France', '{#004170,#DA291C,#FFFFFF}', '{Paris Saint-Germain}', true),
  ('rennes', 'Stade Rennais', 'Ligue 1', 'France', '{#E13327,#000000}', '{}', true),
  ('strasbourg', 'RC Strasbourg', 'Ligue 1', 'France', '{#009FE3,#FFFFFF}', '{}', true),
  ('toulouse', 'Toulouse FC', 'Ligue 1', 'France', '{#5B2A86,#FFFFFF}', '{}', true),
  -- Other clubs and national teams in the catalogue
  ('ajax', 'Ajax', 'Eredivisie', 'Netherlands', '{#FFFFFF,#D2122E}', '{Ajax}', false),
  ('boca', 'Boca Juniors', 'Liga Profesional', 'Argentina', '{#103F79,#F3B229}', '{Boca Juniors}', false),
  ('inter-miami', 'Inter Miami CF', 'MLS', 'USA', '{#F7B5CD,#231F20}', '{Inter Miami CF}', false),
  ('young-boys', 'BSC Young Boys', 'Swiss Super League', 'Switzerland', '{#FFE600,#000000}', '{BSC Young Boys}', false),
  ('basel', 'FC Basel 1893', 'Swiss Super League', 'Switzerland', '{#E30613,#003F87}', '{FC Basel 1893}', false),
  ('brazil', 'Brazil', 'National Teams', 'Brazil', '{#FEDF00,#009C3B,#002776}', '{Brazil}', false),
  ('france', 'France', 'National Teams', 'France', '{#002654,#FFFFFF,#ED2939}', '{France}', false),
  ('germany', 'Germany', 'National Teams', 'Germany', '{#FFFFFF,#000000}', '{Germany}', false),
  ('netherlands', 'Netherlands', 'National Teams', 'Netherlands', '{#F36C21,#FFFFFF}', '{Netherlands}', false),
  ('switzerland', 'Switzerland', 'National Teams', 'Switzerland', '{#E3262E,#FFFFFF}', '{Switzerland}', false)
on conflict (id) do nothing;

-- Kits we already have in the catalogue (drawn with the catalogue's own look).
insert into public.kits (club_id, season, season_year, kind, brand, pattern, colors, catalog_id, source, status)
select c.id,
       regexp_replace(s.season, '–', '/'),
       left(s.season, 4)::int,
       case when s.name ~* '\maway\M' then 'away' when s.name ~* '\mthird\M' then 'third' else 'home' end,
       s.brand, 'graphic', c.colors, s.id, 'catalogue', 'approved'
  from public.catalog_shirts s
  join public.kit_clubs c on s.club = any (c.aliases)
on conflict do nothing;
