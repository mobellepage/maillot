-- Market value per catalogue shirt, blended from every price signal we have:
--   • sales on MAILLOT (strongest; recent ones count more),
--   • market comparables (fetch-comps): this exact shirt fully, title-only
--     matches half, related shirts a little; asking prices 15 % lower,
--   • the catalogue index price as an anchor.
-- Each price is first brought to a common baseline (a very good replica) so
-- new-with-tags or match-worn copies don't skew it. Outliers (below a third or
-- above three times a first rough value) are dropped. Value = weighted median,
-- range = weighted 25th–75th percentile, widened when evidence is thin.

-- Price factor of a condition, in both vocabularies (sell flow / comparables).
create or replace function private.condition_factor(p text)
returns numeric language sql immutable set search_path = '' as $$
  select case lower(coalesce(p, ''))
    when 'new_with_tags' then 1.15 when 'new with tags' then 1.15
    when 'new' then 1.10 when 'excellent' then 1.05
    when 'very good' then 1.0 when 'good' then 0.9 when 'used' then 0.95
    else 1.0 end
$$;

-- Price factor of an edition (replica = 1); same multipliers as the add-shirt valuation.
create or replace function private.edition_factor(p text)
returns numeric language sql immutable set search_path = '' as $$
  select case lower(coalesce(p, ''))
    when 'authentic' then 1.45 when 'player issue' then 1.45 when 'player-issue / authentic' then 1.45
    when 'match-issued' then 2.1
    when 'match_worn' then 3.2 when 'match-worn' then 3.2
    else 1.0 end
$$;

create or replace function private.weighted_quantile(p_prices numeric[], p_weights numeric[], p_q numeric)
returns numeric language sql immutable set search_path = '' as $$
  with pts as (select unnest(p_prices) as price, unnest(p_weights) as w),
       acc as (select price, sum(w) over (order by price rows unbounded preceding) as cw, sum(w) over () as tw from pts)
  select price from acc where cw >= p_q * tw order by price limit 1
$$;

-- Every price signal for a shirt at the common baseline, with its weight.
create or replace function private.valuation_points(p_shirt text)
returns table (price numeric, weight numeric, kind text)
language sql stable set search_path = '' as $$
  select o.amount / private.condition_factor(a.condition) / private.edition_factor(a.edition),
         3 * exp(-extract(epoch from now() - o.released_at) / (86400 * 180.0))::numeric,
         'trade'
    from public.orders o left join public.asks a on a.id = o.ask_id
   where o.shirt_id = p_shirt and o.status = 'released' and o.released_at > now() - interval '2 years'
  union all
  select c.price_chf / private.condition_factor(c.condition) / private.edition_factor(c.edition) * case when c.kind = 'listing' then 0.85 else 1 end,
         case c.match when 'exact' then 1.0 when 'heuristic' then 0.5 else 0.25 end * case when c.kind = 'sold' then 2 else 1 end,
         'comp_' || c.match
    from public.market_comps c
   where c.catalog_id = p_shirt
     and ((c.kind = 'listing' and c.seen_at > now() - interval '14 days') or (c.kind = 'sold' and c.sold_at > now() - interval '1 year'))
$$;

create table if not exists public.shirt_valuations (
  catalog_id text primary key references public.catalog_shirts (id) on delete cascade,
  value numeric not null,
  low numeric not null,
  high numeric not null,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  n_trades int not null,
  n_exact int not null,
  n_similar int not null,
  computed_at timestamptz not null default now()
);
alter table public.shirt_valuations enable row level security;
create policy "valuations are public" on public.shirt_valuations for select to anon, authenticated using (true);

create or replace function public.refresh_shirt_valuation(p_shirt text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_index numeric;
  v_rough numeric;
  v_prices numeric[];
  v_weights numeric[];
  v_value numeric;
  v_low numeric;
  v_high numeric;
  n_trades int;
  n_exact int;
  n_similar int;
begin
  select index_price into v_index from public.catalog_shirts where id = p_shirt;
  if v_index is null then return; end if;

  select array_agg(p.price), array_agg(p.weight) into v_prices, v_weights
    from (select price, weight from private.valuation_points(p_shirt) union all select v_index, 1.0) p;
  v_rough := private.weighted_quantile(v_prices, v_weights, 0.5);

  select array_agg(p.price), array_agg(p.weight),
         count(*) filter (where p.kind = 'trade'),
         count(*) filter (where p.kind in ('comp_exact', 'comp_heuristic')),
         count(*) filter (where p.kind = 'comp_similar')
    into v_prices, v_weights, n_trades, n_exact, n_similar
    from (select * from private.valuation_points(p_shirt) where price between v_rough / 3 and v_rough * 3
          union all select v_index, 1.0, 'index') p;

  v_value := private.weighted_quantile(v_prices, v_weights, 0.5);
  v_low := private.weighted_quantile(v_prices, v_weights, 0.25);
  v_high := private.weighted_quantile(v_prices, v_weights, 0.75);
  -- Thin evidence: say so with a wider range.
  if n_trades + n_exact < 3 then
    v_low := least(v_low, v_value * 0.85);
    v_high := greatest(v_high, v_value * 1.15);
  end if;

  insert into public.shirt_valuations as s (catalog_id, value, low, high, confidence, n_trades, n_exact, n_similar, computed_at)
  values (p_shirt, round(v_value), round(v_low), round(v_high),
          case when n_trades + n_exact >= 8 then 'high' when n_trades + n_exact >= 3 then 'medium' else 'low' end,
          n_trades, n_exact, n_similar, now())
  on conflict (catalog_id) do update
     set value = excluded.value, low = excluded.low, high = excluded.high, confidence = excluded.confidence,
         n_trades = excluded.n_trades, n_exact = excluded.n_exact, n_similar = excluded.n_similar, computed_at = excluded.computed_at;
end;
$$;

create or replace function public.refresh_shirt_valuations()
returns int
language plpgsql security definer set search_path = ''
as $$
declare r record; n int := 0;
begin
  for r in select id from public.catalog_shirts where active loop
    perform public.refresh_shirt_valuation(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.refresh_shirt_valuation(text) from public, anon, authenticated;
revoke all on function public.refresh_shirt_valuations() from public, anon, authenticated;
grant execute on function public.refresh_shirt_valuations() to service_role;

-- A completed sale moves the value at once.
create or replace function private.revalue_on_release()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'released' and old.status is distinct from 'released' and new.shirt_id is not null then
    perform public.refresh_shirt_valuation(new.shirt_id);
  end if;
  return new;
end;
$$;
create trigger orders_revalue_on_release after update of status on public.orders
  for each row execute function private.revalue_on_release();

select public.refresh_shirt_valuations();
-- Daily after the comparables are collected (03:30).
select cron.schedule('shirt-valuations', '30 4 * * *', 'select public.refresh_shirt_valuations()');
