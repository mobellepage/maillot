-- Market comparables: prices for the same (or a closely related) shirt on
-- other marketplaces, collected daily by the fetch-comps edge function and
-- used by the valuation (shirt_valuation). Public data, publicly readable.
create table if not exists public.market_comps (
  source text not null check (source in ('ebay')),
  external_id text not null,
  catalog_id text not null references public.catalog_shirts (id) on delete cascade,
  marketplace text not null,
  -- 'listing' = asking price of a live offer; 'sold' = a completed sale
  kind text not null check (kind in ('listing', 'sold')),
  -- exact: this shirt; similar: same club and season, related shirt;
  -- heuristic: title matched, not yet classified
  match text not null check (match in ('exact', 'similar', 'heuristic')),
  edition text not null default 'unknown' check (edition in ('replica', 'authentic', 'match_worn', 'unknown')),
  condition text not null default 'unknown' check (condition in ('new_with_tags', 'new', 'used', 'unknown')),
  title text not null,
  url text,
  image_url text,
  price numeric not null check (price > 0),
  currency text not null,
  price_chf numeric not null check (price_chf > 0),
  listed_at timestamptz,
  sold_at timestamptz,
  first_seen_at timestamptz not null default now(),
  seen_at timestamptz not null default now(),
  primary key (source, external_id, catalog_id)
);
create index if not exists market_comps_shirt_idx on public.market_comps (catalog_id, seen_at desc);
alter table public.market_comps enable row level security;
create policy "market comps are public" on public.market_comps for select to anon, authenticated using (true);

-- One row per collection run: throttles the job (fetch-comps refuses to run
-- more than once in 20 hours) and shows what it did.
create table if not exists public.market_comp_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  shirts int not null default 0,
  listings int not null default 0,
  kept int not null default 0,
  error text
);
alter table public.market_comp_runs enable row level security;
create policy "admins read comp runs" on public.market_comp_runs for select to authenticated using ((select public.is_admin()));

-- Starts a run unless one started in the last 20 hours. Atomic, so two
-- simultaneous calls can't both start one.
create or replace function public.start_market_comp_run()
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('market_comp_runs'));
  if exists (select 1 from public.market_comp_runs where started_at > now() - interval '20 hours') then
    return null;
  end if;
  insert into public.market_comp_runs default values returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.start_market_comp_run() from public, anon, authenticated;
grant execute on function public.start_market_comp_run() to service_role;

-- Daily at 03:30: ask the edge function to collect (it answers at once and
-- works in the background).
create or replace function private.request_market_comps()
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_url text;
begin
  select value into v_url from private.app_settings where key = 'functions_url';
  if v_url is null then return; end if;
  perform net.http_post(url := v_url || '/fetch-comps', headers := '{"Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb);
end;
$$;
revoke all on function private.request_market_comps() from public, anon, authenticated;
select cron.schedule('market-comps', '30 3 * * *', 'select private.request_market_comps()');
