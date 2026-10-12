-- "Your shirt reached an all-time high": when a shirt's latest value is above
-- every earlier value on record (with at least 30 days of history), its
-- owners hear about it — at most once per shirt every 30 days. Runs daily
-- after the valuations.
create or replace function public.notify_all_time_highs()
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
    highs as (
      select l.catalog_id, l.value
        from latest l
       where l.value > (select max(h.value) from public.shirt_value_history h where h.catalog_id = l.catalog_id and h.day < l.day)
         and (select min(h.day) from public.shirt_value_history h where h.catalog_id = l.catalog_id) <= l.day - 30
    )
    select distinct ci.user_id, h.catalog_id, round(h.value) as value, s.name
      from highs h
      join public.custom_items ci on ci.catalog_id = h.catalog_id
      join public.catalog_shirts s on s.id = h.catalog_id
  loop
    if not exists (
      select 1 from public.notifications x
       where x.user_id = r.user_id and x.type = 'all_time_high' and x.data ->> 'shirt_id' = r.catalog_id and x.created_at > now() - interval '30 days'
    ) then
      insert into public.notifications (user_id, type, title, body, data)
      values (r.user_id, 'all_time_high', 'Your shirt reached an all-time high',
              r.name || ' is now worth about CHF ' || r.value || ' — more than ever before.',
              jsonb_build_object('shirt_id', r.catalog_id, 'amount', r.value));
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;
revoke all on function public.notify_all_time_highs() from public, anon, authenticated;
select cron.schedule('all-time-highs', '15 5 * * *', 'select public.notify_all_time_highs()');
