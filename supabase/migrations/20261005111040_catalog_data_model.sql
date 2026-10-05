-- catalog_data_model
-- The catalogue moves from a bundled JS file into Postgres, so it can be
-- curated (admins) without a deploy, referenced by orders and asks, and
-- priced from real trades. The app ships a snapshot of these rows only as an
-- instant first paint / offline fallback.

create table if not exists public.catalog_shirts (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  club text not null,
  name text not null,
  season text not null,
  year int not null check (year between 1870 and 2100),
  brand text not null,
  league text not null,
  type text not null check (type in ('New', 'Retro', 'Match-worn')),
  cond text not null,
  edition text not null,
  player text,
  -- Index estimate used until real trades exist (CHF).
  index_price numeric not null check (index_price > 0),
  -- 30-day change of the index estimate, in percent.
  index_change_30d numeric not null default 0,
  -- Illustration colours (CSS) until real product photography is attached.
  pattern text not null,
  trim_color text not null,
  number_color text,
  crest_color text not null,
  glow_color text not null,
  sizes text[] not null default array['S','M','L','XL','XXL'],
  sku text not null unique,
  added_at timestamptz not null default now(),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.catalog_shirts enable row level security;
drop policy if exists catalog_public_read on public.catalog_shirts;
drop policy if exists catalog_admin_write on public.catalog_shirts;
create policy catalog_public_read on public.catalog_shirts for select using (active or (select public.is_admin()));
create policy catalog_admin_write on public.catalog_shirts for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create index if not exists catalog_league_idx on public.catalog_shirts (league);

insert into public.catalog_shirts (id, club, name, season, year, brand, league, type, cond, edition, player, index_price, index_change_30d, pattern, trim_color, number_color, crest_color, glow_color, added_at, sizes, sku) values
  ('ger-26', 'Germany', 'Germany 2026 Home "The Last Adidas"', '2026', 2026, 'adidas', 'National Teams', 'New', 'New with tags', 'Authentic', 'Wirtz 17', 140, 31, 'linear-gradient(180deg,#F4F4F1 0 31%,#151515 31% 35%,#DD0000 35% 39%,#FFCE00 39% 43%,#F4F4F1 43%)', '#151515', null, '#151515', '#FFCE00', now() - interval '9 days', array['S','M','L','XL','XXL'], 'KV-60419'),
  ('sui-26', 'Switzerland', 'Switzerland 2026 Home', '2026', 2026, 'Puma', 'National Teams', 'New', 'New with tags', 'Authentic', 'Xhaka 10', 95, 12, 'linear-gradient(180deg,#E3262E,#B51B22)', '#FFFFFF', null, '#FFFFFF', '#E3262E', now() - interval '3 days', array['S','M','L','XL','XXL'], 'KV-34158'),
  ('acm-0607', 'AC Milan', 'AC Milan 2006/07 Home — Match-worn', '2006/07', 2006, 'adidas', 'Serie A', 'Match-worn', 'Match-worn', 'Player issue', 'Kaká 22', 450, 6, 'repeating-linear-gradient(90deg,#C8102E 0 11%,#141414 11% 22%)', '#FFFFFF', null, '#FFFFFF', '#C8102E', now() - interval '60 days', array['L'], 'KV-21205'),
  ('mia-26', 'Inter Miami CF', 'Inter Miami 2026 Home', '2026', 2026, 'adidas', 'MLS', 'New', 'New with tags', 'Authentic', 'Messi 10', 120, 22, 'linear-gradient(180deg,#F7B5CD,#EC9DBB)', '#231F20', null, '#231F20', '#F7B5CD', now() - interval '15 days', array['S','M','L','XL','XXL'], 'KV-54442'),
  ('ars-91', 'Arsenal', 'Arsenal 1991–93 Away "Bruised Banana"', '1991–93', 1991, 'adidas', 'Premier League', 'Retro', 'Excellent', 'Replica', null, 220, 9, 'repeating-linear-gradient(135deg,#F2D21B 0 9px,#F2D21B 9px 15px,#1C1B3A 15px 18px,#C8102E 18px 21px)', '#1C1B3A', null, '#C8102E', '#F2D21B', now() - interval '140 days', array['S','M','L','XL','XXL'], 'KV-39560'),
  ('fcb-2627', 'FC Barcelona', 'FC Barcelona 2026/27 Home', '2026/27', 2026, 'Nike', 'La Liga', 'New', 'New with tags', 'Replica', 'Yamal 10', 110, 4, 'repeating-linear-gradient(90deg,#A50044 0 12.5%,#004D98 12.5% 25%)', '#EDBB00', null, '#EDBB00', '#2A63C7', now() - interval '6 days', array['S','M','L','XL','XXL'], 'KV-73576'),
  ('nap-8788', 'SSC Napoli', 'SSC Napoli 1987/88 Home', '1987/88', 1987, 'Ennerre', 'Serie A', 'Retro', 'Very good', 'Replica', 'Maradona 10', 380, 14, 'linear-gradient(180deg,#2BA6E0,#1680C2)', '#FFFFFF', null, '#FFFFFF', '#2BA6E0', now() - interval '30 days', array['S','M','L','XL','XXL'], 'KV-76767'),
  ('ned-88', 'Netherlands', 'Netherlands 1988 Home', '1988', 1988, 'adidas', 'National Teams', 'Retro', 'Excellent', 'Replica', 'van Basten 12', 310, 18, 'repeating-linear-gradient(45deg,#FF6A13 0 10px,#EE5A08 10px 20px),#FF6A13', '#FFFFFF', null, '#FFFFFF', '#FF6A13', now() - interval '45 days', array['S','M','L','XL','XXL'], 'KV-59698'),
  ('yb-2526', 'BSC Young Boys', 'BSC Young Boys 2025/26 Home', '2025/26', 2025, 'Nike', 'Swiss Super League', 'New', 'New with tags', 'Replica', null, 89, 1.8, 'linear-gradient(180deg,#151515 0 17%,#FFD200 17%)', '#151515', null, '#151515', '#FFD200', now() - interval '12 days', array['S','M','L','XL','XXL'], 'KV-41288'),
  ('juv-9697', 'Juventus', 'Juventus 1996/97 Home', '1996/97', 1996, 'Kappa', 'Serie A', 'Retro', 'Very good', 'Replica', 'Del Piero 10', 240, 11, 'repeating-linear-gradient(90deg,#141414 0 10%,#F5F5F2 10% 20%)', '#141414', null, '#C9A227', '#FFFFFF', now() - interval '80 days', array['S','M','L','XL','XXL'], 'KV-75050'),
  ('ajx-95', 'Ajax', 'Ajax 1994/95 Home', '1994/95', 1994, 'Umbro', 'Eredivisie', 'Retro', 'Excellent', 'Replica', 'Kluivert 15', 260, 7, 'linear-gradient(90deg,#F5F5F2 0 35%,#D2122E 35% 65%,#F5F5F2 65%)', '#D2122E', '#141414', '#D2122E', '#D2122E', now() - interval '95 days', array['S','M','L','XL','XXL'], 'KV-67873'),
  ('liv-2526', 'Liverpool FC', 'Liverpool 2025/26 Home', '2025/26', 2025, 'adidas', 'Premier League', 'New', 'New with tags', 'Replica', 'Salah 11', 105, -3, 'linear-gradient(180deg,#D0132F,#A30D25)', '#FFFFFF', null, '#F6EB61', '#C8102E', now() - interval '40 days', array['S','M','L','XL','XXL'], 'KV-44078'),
  ('rma-2627', 'Real Madrid', 'Real Madrid 2026/27 Home', '2026/27', 2026, 'adidas', 'La Liga', 'New', 'New with tags', 'Authentic', 'Mbappé 10', 115, 2, 'linear-gradient(180deg,#F8F7F3,#E2E0D8)', '#C9A227', null, '#C9A227', '#C9A227', now() - interval '4 days', array['S','M','L','XL','XXL'], 'KV-41064'),
  ('mun-0708', 'Manchester United', 'Manchester United 2007/08 Home', '2007/08', 2007, 'Nike', 'Premier League', 'Retro', 'Excellent', 'Replica', 'Ronaldo 7', 180, -2, 'linear-gradient(180deg,#DA1F26,#B3161C)', '#FFFFFF', null, '#FFD23F', '#DA1F26', now() - interval '120 days', array['S','M','L','XL','XXL'], 'KV-46099'),
  ('bay-2627', 'FC Bayern München', 'FC Bayern 2026/27 Home', '2026/27', 2026, 'adidas', 'Bundesliga', 'New', 'New with tags', 'Replica', 'Kane 9', 105, -5, 'linear-gradient(180deg,#DC052D 0 68%,#FFFFFF 68% 71%,#DC052D 71%)', '#FFFFFF', null, '#0066B2', '#DC052D', now() - interval '2 days', array['S','M','L','XL','XXL'], 'KV-78790'),
  ('bra-70', 'Brazil', 'Brazil 1970 Home', '1970', 1970, 'Athleta', 'National Teams', 'Retro', 'Good', 'Replica', 'Pelé 10', 520, 3, 'linear-gradient(180deg,#FEDD00,#F0C800)', '#009B3A', null, '#009B3A', '#FEDD00', now() - interval '200 days', array['S','M','L','XL','XXL'], 'KV-15396'),
  ('boc-81', 'Boca Juniors', 'Boca Juniors 1981 Home', '1981', 1981, 'adidas', 'Liga Profesional', 'Retro', 'Good', 'Replica', 'Maradona 10', 290, 5, 'linear-gradient(180deg,#0B2D6B 0 38%,#F3B229 38% 55%,#0B2D6B 55%)', '#F3B229', '#FFFFFF', '#F3B229', '#3D6FD6', now() - interval '70 days', array['S','M','L','XL','XXL'], 'KV-91600'),
  ('fra-98', 'France', 'France 1998 Home', '1998', 1998, 'adidas', 'National Teams', 'Retro', 'Excellent', 'Replica', 'Zidane 10', 275, 8, 'linear-gradient(180deg,#14246B 0 30%,#FFFFFF 30% 33%,#E1001A 33% 38%,#FFFFFF 38% 41%,#14246B 41%)', '#FFFFFF', null, '#FFFFFF', '#3556D8', now() - interval '150 days', array['S','M','L','XL','XXL'], 'KV-36092'),
  ('psg-2526', 'Paris Saint-Germain', 'PSG 2025/26 Home', '2025/26', 2025, 'Nike', 'Ligue 1', 'New', 'New with tags', 'Replica', 'Dembélé 10', 115, -4, 'linear-gradient(90deg,#0E1E3F 0 37%,#FFFFFF 37% 39%,#D4202A 39% 61%,#FFFFFF 61% 63%,#0E1E3F 63%)', '#FFFFFF', null, '#D4202A', '#D4202A', now() - interval '25 days', array['S','M','L','XL','XXL'], 'KV-27194'),
  ('bas-2526', 'FC Basel 1893', 'FC Basel 2025/26 Home', '2025/26', 2025, 'Macron', 'Swiss Super League', 'New', 'New with tags', 'Replica', 'Shaqiri 10', 85, -1, 'linear-gradient(90deg,#D6001C 0 50%,#003E80 50%)', '#FFFFFF', null, '#FFFFFF', '#D6001C', now() - interval '20 days', array['S','M','L','XL','XXL'], 'KV-21745')
on conflict (id) do nothing;

-- Real-trade market data per catalogue shirt (released orders only).
create or replace function public.catalog_market()
returns table (shirt_id text, completed_sales bigint, last_price numeric, last_sold_at timestamptz, avg_recent numeric)
language sql stable security definer set search_path = public as $$
  with sales as (
    select o.shirt_id, o.amount, o.released_at,
           row_number() over (partition by o.shirt_id order by o.released_at desc nulls last) as rn
      from public.orders o
     where o.status = 'released' and o.shirt_id is not null
  )
  select s.shirt_id,
         count(*),
         max(s.amount) filter (where s.rn = 1),
         max(s.released_at) filter (where s.rn = 1),
         round(avg(s.amount) filter (where s.rn <= 5), 2)
    from sales s
   group by s.shirt_id;
$$;
revoke execute on function public.catalog_market() from public;
grant execute on function public.catalog_market() to anon, authenticated;

-- Integrity: market activity can only reference real catalogue shirts.
alter table public.bids drop constraint if exists bids_shirt_fk;
alter table public.asks drop constraint if exists asks_shirt_fk;
alter table public.orders drop constraint if exists orders_shirt_fk;
alter table public.watchlist drop constraint if exists watchlist_shirt_fk;
alter table public.events drop constraint if exists events_shirt_fk;
alter table public.bids add constraint bids_shirt_fk foreign key (shirt_id) references public.catalog_shirts (id);
alter table public.asks add constraint asks_shirt_fk foreign key (shirt_id) references public.catalog_shirts (id);
alter table public.orders add constraint orders_shirt_fk foreign key (shirt_id) references public.catalog_shirts (id);
alter table public.watchlist add constraint watchlist_shirt_fk foreign key (shirt_id) references public.catalog_shirts (id) on delete cascade;
alter table public.events add constraint events_shirt_fk foreign key (shirt_id) references public.catalog_shirts (id) on delete cascade;
