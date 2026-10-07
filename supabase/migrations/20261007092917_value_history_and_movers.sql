-- Portfolio: every market value is kept per day, so collections can show how
-- they moved, and members hear when a shirt they own or watch moves a lot.

create table if not exists public.shirt_value_history (
  catalog_id text not null references public.catalog_shirts (id) on delete cascade,
  day date not null,
  value numeric not null,
  primary key (catalog_id, day)
);
alter table public.shirt_value_history enable row level security;
create policy "value history is public" on public.shirt_value_history for select to anon, authenticated using (true);

-- Each (re)valuation records that day's value (Zürich calendar day).
create or replace function private.snapshot_value()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.shirt_value_history (catalog_id, day, value)
  values (new.catalog_id, (now() at time zone 'Europe/Zurich')::date, new.value)
  on conflict (catalog_id, day) do update set value = excluded.value;
  return new;
end;
$$;
create trigger shirt_valuations_history after insert or update of value on public.shirt_valuations
  for each row execute function private.snapshot_value();
insert into public.shirt_value_history (catalog_id, day, value)
select catalog_id, (now() at time zone 'Europe/Zurich')::date, value from public.shirt_valuations
on conflict do nothing;

-- Weekly: a shirt that moved 10 % or more against its value a week earlier
-- is reported to everyone who owns or watches it (once per shirt per week).
create or replace function public.notify_collection_movers()
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  n int := 0;
begin
  for r in
    with latest as (
      select distinct on (catalog_id) catalog_id, day, value from public.shirt_value_history order by catalog_id, day desc
    ),
    moves as (
      select l.catalog_id, l.value as now_v, round((l.value - w.value) / w.value * 100)::int as pct
        from latest l
        cross join lateral (
          select value from public.shirt_value_history h
           where h.catalog_id = l.catalog_id and h.day <= l.day - 7
           order by h.day desc limit 1
        ) w
       where w.value > 0
    ),
    interested as (
      select user_id, catalog_id as shirt_id from public.custom_items where catalog_id is not null
      union
      select user_id, shirt_id from public.watchlist
    )
    select distinct i.user_id, m.catalog_id, m.now_v, m.pct, s.name
      from moves m
      join interested i on i.shirt_id = m.catalog_id
      join public.catalog_shirts s on s.id = m.catalog_id
     where abs(m.pct) >= 10
  loop
    if not exists (
      select 1 from public.notifications x
       where x.user_id = r.user_id and x.type = 'price_move' and x.data ->> 'shirt_id' = r.catalog_id and x.created_at > now() - interval '6 days'
    ) then
      insert into public.notifications (user_id, type, title, body, data)
      values (r.user_id, 'price_move',
              case when r.pct > 0 then 'Your shirt went up' else 'Your shirt went down' end,
              r.name || ' is ' || case when r.pct > 0 then 'up ' else 'down ' end || abs(r.pct) || '% this week — now worth about CHF ' || round(r.now_v) || '.',
              jsonb_build_object('shirt_id', r.catalog_id, 'change_pct', r.pct, 'amount', round(r.now_v)));
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;
revoke all on function public.notify_collection_movers() from public, anon, authenticated;
select cron.schedule('collection-movers', '0 7 * * 1', 'select public.notify_collection_movers()');
