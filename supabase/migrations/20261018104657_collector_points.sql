-- Collector points: every shirt bought through Maillot earns its buyer 100
-- points plus 1 point per franc, once the purchase is complete (the money is
-- released to the seller). A refunded purchase takes its points back. The
-- same rule is shown in the app (src/config/rules.ts, COLLECTOR_POINTS).
create table if not exists public.collector_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id uuid unique references public.orders (id) on delete set null,
  points int not null check (points between -100000 and 100000),
  reason text not null check (reason in ('purchase')),
  created_at timestamptz not null default now()
);
create index if not exists collector_points_user_idx on public.collector_points (user_id, created_at desc);
alter table public.collector_points enable row level security;
create policy collector_points_own_select on public.collector_points for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.collector_points from anon, authenticated;
grant select on public.collector_points to authenticated;

create or replace function private.purchase_points(p_amount numeric)
returns int language sql immutable set search_path = '' as $$
  select 100 + greatest(floor(coalesce(p_amount, 0)), 0)::int
$$;
revoke execute on function private.purchase_points(numeric) from public;

create or replace function private.collector_points_for_order()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.buyer_id is null then return new; end if;
  if new.status = 'released' and old.status is distinct from 'released' then
    insert into public.collector_points (user_id, order_id, points, reason)
    values (new.buyer_id, new.id, private.purchase_points(new.amount), 'purchase')
    on conflict (order_id) do nothing;
  elsif new.status = 'refunded' and old.status is distinct from 'refunded' then
    delete from public.collector_points where order_id = new.id;
  end if;
  return new;
end $$;
revoke execute on function private.collector_points_for_order() from public;
drop trigger if exists orders_collector_points on public.orders;
create trigger orders_collector_points after update of status on public.orders
  for each row execute function private.collector_points_for_order();

-- Purchases completed before points existed count too.
insert into public.collector_points (user_id, order_id, points, reason, created_at)
select o.buyer_id, o.id, private.purchase_points(o.amount), 'purchase', coalesce(o.released_at, o.updated_at)
  from public.orders o
 where o.status = 'released' and o.buyer_id is not null
on conflict (order_id) do nothing;

-- My points: the total and how many purchases earned them.
create or replace function public.my_collector_points()
returns table (total int, purchases int)
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(points), 0)::int, count(*) filter (where reason = 'purchase')::int
    from public.collector_points where user_id = (select auth.uid())
$$;
revoke execute on function public.my_collector_points() from public, anon;
grant execute on function public.my_collector_points() to authenticated;
