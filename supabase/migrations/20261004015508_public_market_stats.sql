-- public_market_stats
-- Aggregate-only, anonymous-safe market statistics, so the UI can show real
-- numbers instead of invented ones. Nothing here identifies a user.

create or replace function public.public_stats()
returns table (collectors bigint, live_listings bigint, open_bids bigint, completed_sales bigint, traded_chf numeric)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from profiles),
    (select count(*) from asks where status = 'open'),
    (select count(*) from bids where status = 'open' and (expires_at is null or expires_at > now())),
    (select count(*) from orders where status = 'released'),
    (select coalesce(sum(amount), 0) from orders where status = 'released');
$$;

create or replace function public.shirt_stats(p_shirt_id text)
returns table (watchers bigint, live_listings bigint, open_bids bigint, completed_sales bigint, last_sale_amount numeric, last_sale_at timestamptz)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from watchlist where shirt_id = p_shirt_id),
    (select count(*) from asks where shirt_id = p_shirt_id and status = 'open'),
    (select count(*) from bids where shirt_id = p_shirt_id and status = 'open' and (expires_at is null or expires_at > now())),
    (select count(*) from orders where shirt_id = p_shirt_id and status = 'released'),
    (select amount from orders where shirt_id = p_shirt_id and status = 'released' order by released_at desc nulls last limit 1),
    (select released_at from orders where shirt_id = p_shirt_id and status = 'released' order by released_at desc nulls last limit 1);
$$;

revoke execute on function public.public_stats() from public;
revoke execute on function public.shirt_stats(text) from public;
grant execute on function public.public_stats() to anon, authenticated;
grant execute on function public.shirt_stats(text) to anon, authenticated;

create index if not exists watchlist_shirt_idx on public.watchlist (shirt_id);
