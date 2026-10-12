-- A reason to come back every week: on Sunday evening each member hears how
-- their collection's value moved over the last 7 days (catalogued shirts
-- with a value then and now). Only when it moved, at most once a week.
create or replace function public.notify_collection_week()
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
    week_ago as (
      select l.catalog_id, l.value as now_v,
             (select h.value from public.shirt_value_history h
               where h.catalog_id = l.catalog_id and h.day <= l.day - 7
               order by h.day desc limit 1) as then_v
        from latest l
    ),
    per_member as (
      select ci.user_id, sum(w.now_v) as now_total, sum(w.then_v) as then_total, count(*) as shirts
        from public.custom_items ci
        join week_ago w on w.catalog_id = ci.catalog_id and w.then_v > 0
       group by ci.user_id
    )
    select user_id, round(now_total) as now_total, round(now_total - then_total) as delta,
           round((now_total - then_total) / then_total * 100, 1) as pct
      from per_member
     where then_total > 0 and abs(now_total - then_total) >= 1
  loop
    if not exists (
      select 1 from public.notifications x
       where x.user_id = r.user_id and x.type = 'collection_week' and x.created_at > now() - interval '6 days'
    ) then
      insert into public.notifications (user_id, type, title, body, data)
      values (r.user_id, 'collection_week',
              case when r.delta > 0 then 'Your collection went up this week' else 'Your collection went down this week' end,
              'Your collection is ' || case when r.delta > 0 then 'up ' else 'down ' end || abs(r.pct) || '% (CHF ' || abs(r.delta) || ') this week — now worth about CHF ' || r.now_total || '.',
              jsonb_build_object('change_pct', r.pct, 'delta', r.delta, 'amount', r.now_total));
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;
revoke all on function public.notify_collection_week() from public, anon, authenticated;
select cron.schedule('collection-week', '0 17 * * 0', 'select public.notify_collection_week()');
