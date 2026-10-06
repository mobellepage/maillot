-- Observability. Browser errors are reported here (no third party needed);
-- a pg_cron health check alerts admins — in-app and by email through the
-- existing notification relay — when something needs a human.

create table if not exists public.client_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  fingerprint text not null,
  message text not null,
  stack text,
  url text,
  release text,
  user_agent text,
  user_id uuid
);
create index if not exists client_errors_recent_idx on public.client_errors (created_at desc);
create index if not exists client_errors_fp_idx on public.client_errors (fingerprint, created_at desc);
alter table public.client_errors enable row level security;
revoke all on public.client_errors from anon, authenticated;

-- Anyone (signed in or not) can report; inputs are truncated and each
-- fingerprint is capped at 20 reports per 10 minutes so a crash loop or a
-- malicious client can't flood the table.
create or replace function public.report_client_error(p_message text, p_stack text default null, p_url text default null, p_release text default null, p_user_agent text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_msg text := left(coalesce(nullif(trim(p_message), ''), 'unknown error'), 500);
  v_fp text := md5(regexp_replace(v_msg, '[0-9a-f]{8,}|\d+', '#', 'g'));
begin
  if (select count(*) from client_errors where fingerprint = v_fp and created_at > now() - interval '10 minutes') >= 20 then return; end if;
  insert into client_errors (fingerprint, message, stack, url, release, user_agent, user_id)
  values (v_fp, v_msg, left(p_stack, 4000), left(p_url, 500), left(p_release, 64), left(p_user_agent, 300), auth.uid());
end $$;
revoke execute on function public.report_client_error(text, text, text, text, text) from public;
grant execute on function public.report_client_error(text, text, text, text, text) to anon, authenticated;

-- What the admin Health panel shows.
create or replace function public.admin_health()
returns table (errors_1h int, errors_24h int, failed_payouts int, failed_refunds int, stuck_settlements int, overdue_inspections int, open_disputes int, pending_reviews int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query select
    (select count(*)::int from client_errors where created_at > now() - interval '1 hour'),
    (select count(*)::int from client_errors where created_at > now() - interval '24 hours'),
    (select count(*)::int from orders where payout_status = 'failed'),
    (select count(*)::int from orders where payout_status = 'refund_failed'),
    (select count(*)::int from orders where payout_status in ('pending', 'refund_pending') and updated_at < now() - interval '1 hour'),
    (select count(*)::int from orders where status = 'shipped' and inspection = 'pending' and shipped_at < now() - interval '7 days'),
    (select count(*)::int from disputes where status = 'open'),
    (select count(*)::int from review_queue where status in ('pending', 'in_review'));
end $$;

create or replace function public.admin_recent_errors()
returns table (fingerprint text, message text, count int, last_seen timestamptz, url text, release text, stack text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
    select e.fingerprint, (array_agg(e.message order by e.created_at desc))[1], count(*)::int, max(e.created_at),
           (array_agg(e.url order by e.created_at desc))[1], (array_agg(e.release order by e.created_at desc))[1], (array_agg(e.stack order by e.created_at desc))[1]
      from client_errors e
     where e.created_at > now() - interval '7 days'
     group by e.fingerprint
     order by max(e.created_at) desc
     limit 50;
end $$;
revoke execute on function public.admin_health(), public.admin_recent_errors() from public, anon;
grant execute on function public.admin_health(), public.admin_recent_errors() to authenticated;

-- Health check: one alert per problem per 6 hours, to every admin.
create or replace function private.alert_admins(p_kind text, p_title text, p_body text)
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0;
begin
  if exists (select 1 from notifications where type = 'ops_alert' and data->>'kind' = p_kind and created_at > now() - interval '6 hours') then return 0; end if;
  insert into notifications (user_id, type, title, body, data)
  select p.id, 'ops_alert', p_title, p_body, jsonb_build_object('kind', p_kind) from profiles p where p.is_admin;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.run_health_check()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_errors int; v_failed int; v_stuck int; v_overdue int; alerts int := 0;
begin
  select count(*) into v_errors from client_errors where created_at > now() - interval '15 minutes';
  if v_errors >= 25 then
    alerts := alerts + private.alert_admins('client_errors', 'Ops: error spike', v_errors || ' browser errors in the last 15 minutes. See Admin → Health.');
  end if;
  select count(*) into v_failed from orders where payout_status in ('failed', 'refund_failed');
  if v_failed > 0 then
    alerts := alerts + private.alert_admins('settlement_failed', 'Ops: payouts or refunds failed', v_failed || ' order(s) could not be paid out or refunded. Check Stripe and Admin → Health.');
  end if;
  select count(*) into v_stuck from orders where payout_status in ('pending', 'refund_pending') and updated_at < now() - interval '2 hours';
  if v_stuck > 0 then
    alerts := alerts + private.alert_admins('settlement_stuck', 'Ops: settlements stuck', v_stuck || ' payout(s)/refund(s) have been pending for over 2 hours.');
  end if;
  select count(*) into v_overdue from orders where status = 'shipped' and inspection = 'pending' and shipped_at < now() - interval '7 days';
  if v_overdue > 0 then
    alerts := alerts + private.alert_admins('inspection_overdue', 'Ops: inspections overdue', v_overdue || ' shirt(s) shipped over 7 days ago are still awaiting inspection.');
  end if;
  -- Keep a month of error reports.
  delete from client_errors where created_at < now() - interval '30 days';
  return jsonb_build_object('errors_15m', v_errors, 'settlement_failed', v_failed, 'settlement_stuck', v_stuck, 'inspection_overdue', v_overdue, 'alerts_sent', alerts);
end $$;
revoke execute on function public.run_health_check() from public, anon, authenticated;
revoke execute on function private.alert_admins(text, text, text) from public, anon, authenticated;

select cron.schedule('health-check', '*/15 * * * *', 'select public.run_health_check()');
