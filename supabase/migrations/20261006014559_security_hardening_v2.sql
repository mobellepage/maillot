-- Security hardening v2: admin rights need a second factor, writes are rate
-- limited per user, and every admin action lands in an append-only audit log.

-- 1. Admin = admin flag AND a session verified with a second factor (TOTP).
--    Every admin policy and RPC goes through is_admin(), so this is the one
--    switch. A stolen password alone no longer opens the admin tools.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false)
     and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;

-- Whether the signed-in account has the admin flag at all (to show the
-- 2FA prompt instead of "not allowed"). Not a permission check.
create or replace function public.my_admin_flag()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false)
$$;
revoke execute on function public.my_admin_flag() from public, anon;
grant execute on function public.my_admin_flag() to authenticated;

create or replace function public.list_disputes_for_admin()
returns table (dispute_id uuid, order_id uuid, dispute_status text, reason text, resolution_note text, created_at timestamptz, buyer_id uuid, seller_id uuid, shirt_id text, custom_item_id text, size text, amount numeric, order_status text)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
    select d.id, d.order_id, d.status, d.reason, d.resolution_note, d.created_at,
           o.buyer_id, o.seller_id, o.shirt_id, o.custom_item_id, o.size, o.amount, o.status
      from disputes d join orders o on o.id = d.order_id
     order by d.created_at desc;
end $$;

create or replace function public.create_api_key(p_label text)
returns table (id uuid, plaintext_key text, key_prefix text, created_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
declare v_raw text; v_prefix text; v_hash text; v_id uuid; v_created timestamptz;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  v_raw := encode(gen_random_bytes(24), 'hex');
  v_prefix := 'mlt_' || substr(v_raw, 1, 8);
  v_hash := encode(digest(v_raw, 'sha256'), 'hex');
  insert into public.api_keys (label, key_prefix, key_hash, created_by)
  values (left(p_label, 80), v_prefix, v_hash, auth.uid())
  returning api_keys.id, api_keys.created_at into v_id, v_created;
  return query select v_id, (v_prefix || '.' || v_raw), v_prefix, v_created;
end $$;

create or replace function public.revoke_api_key(p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.api_keys set revoked_at = now() where id = p_id;
end $$;

-- 2. Rate limits: fixed windows per key, kept in a private table.
create table if not exists private.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits int not null
);

create or replace function private.hit(p_key text, p_max int, p_window interval)
returns void language plpgsql security definer set search_path = private as $$
declare n int;
begin
  insert into private.rate_limits as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update
     set hits = case when r.window_start < now() - p_window then 1 else r.hits + 1 end,
         window_start = case when r.window_start < now() - p_window then now() else r.window_start end
  returning hits into n;
  if n > p_max then
    raise exception 'rate limit exceeded — please try again later' using errcode = 'P0429';
  end if;
end $$;
revoke execute on function private.hit(text, int, interval) from public, anon, authenticated;

-- Writes made by signed-in users (server jobs and the service role have no
-- auth.uid() and are never limited).
create or replace function private.limit_user_writes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    perform private.hit(tg_argv[0] || ':' || auth.uid(), tg_argv[1]::int, tg_argv[2]::interval);
  end if;
  return new;
end $$;
revoke execute on function private.limit_user_writes() from public, anon, authenticated;

drop trigger if exists bids_rate_limit on public.bids;
create trigger bids_rate_limit before insert on public.bids for each row execute function private.limit_user_writes('bid', '30', '10 minutes');
drop trigger if exists asks_rate_limit on public.asks;
create trigger asks_rate_limit before insert on public.asks for each row execute function private.limit_user_writes('ask', '30', '10 minutes');
drop trigger if exists custom_items_rate_limit on public.custom_items;
create trigger custom_items_rate_limit before insert on public.custom_items for each row execute function private.limit_user_writes('item', '60', '1 hour');
drop trigger if exists review_queue_rate_limit on public.review_queue;
create trigger review_queue_rate_limit before insert on public.review_queue for each row execute function private.limit_user_writes('review', '10', '1 hour');
drop trigger if exists disputes_rate_limit on public.disputes;
create trigger disputes_rate_limit before insert on public.disputes for each row execute function private.limit_user_writes('dispute', '10', '1 hour');
drop trigger if exists seller_reviews_rate_limit on public.seller_reviews;
create trigger seller_reviews_rate_limit before insert on public.seller_reviews for each row execute function private.limit_user_writes('rate', '20', '1 hour');

-- Username lookups can be used to enumerate members: 30 a minute is plenty
-- for typing one.
create or replace function public.handle_available(p_handle text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform private.hit('handle:' || coalesce(auth.uid()::text, 'anon'), 30, interval '1 minute');
  return p_handle ~ '^[a-z0-9_]{3,20}$'
     and not exists (select 1 from profiles where lower(handle) = lower(p_handle) and id is distinct from auth.uid());
end $$;

-- Error reports: besides the per-fingerprint cap, at most 300 in 10 minutes overall.
create or replace function public.report_client_error(p_message text, p_stack text default null, p_url text default null, p_release text default null, p_user_agent text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_msg text := left(coalesce(nullif(trim(p_message), ''), 'unknown error'), 500);
  v_fp text := md5(regexp_replace(v_msg, '[0-9a-f]{8,}|\d+', '#', 'g'));
begin
  if (select count(*) from client_errors where fingerprint = v_fp and created_at > now() - interval '10 minutes') >= 20 then return; end if;
  if (select count(*) from client_errors where created_at > now() - interval '10 minutes') >= 300 then return; end if;
  insert into client_errors (fingerprint, message, stack, url, release, user_agent, user_id)
  values (v_fp, v_msg, left(p_stack, 4000), left(p_url, 500), left(p_release, 64), left(p_user_agent, 300), auth.uid());
end $$;

-- 3. Audit log: what admins did, when. Written by triggers on the tables
--    admin actions change, so no admin code path can skip it; nobody can
--    edit or delete entries through the API.
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null,
  target text not null,
  details jsonb not null default '{}'
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);
alter table public.audit_log enable row level security;
create policy audit_log_admin_read on public.audit_log for select to authenticated using ((select public.is_admin()));
revoke insert, update, delete on public.audit_log from anon, authenticated;

create or replace function private.audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_action text; v_target text; v_details jsonb := '{}';
begin
  if tg_table_name = 'disputes' and new.status is distinct from old.status then
    v_action := 'dispute.' || new.status; v_target := new.id::text; v_details := jsonb_build_object('order_id', new.order_id, 'note', new.resolution_note);
  elsif tg_table_name = 'review_queue' and new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    v_action := 'review.' || new.status; v_target := new.id; v_details := jsonb_build_object('reason', new.reason);
  elsif tg_table_name = 'orders' and new.inspection is distinct from old.inspection then
    v_action := 'inspection.' || new.inspection; v_target := new.id::text; v_details := jsonb_build_object('note', new.inspection_note, 'outbound_tracking', new.outbound_tracking);
  elsif tg_table_name = 'certificates' and new.revoked_at is distinct from old.revoked_at then
    v_action := 'certificate.revoke'; v_target := new.code; v_details := jsonb_build_object('reason', new.revoked_reason);
  elsif tg_table_name = 'certificates' and new.nfc_uid is distinct from old.nfc_uid then
    v_action := 'certificate.tag'; v_target := new.code; v_details := jsonb_build_object('uid', new.nfc_uid);
  elsif tg_table_name = 'api_keys' and tg_op = 'INSERT' then
    v_action := 'api_key.create'; v_target := new.id::text; v_details := jsonb_build_object('label', new.label, 'prefix', new.key_prefix);
  elsif tg_table_name = 'api_keys' and new.revoked_at is distinct from old.revoked_at then
    v_action := 'api_key.revoke'; v_target := new.id::text; v_details := jsonb_build_object('label', new.label);
  elsif tg_table_name = 'profiles' and new.is_admin is distinct from old.is_admin then
    v_action := case when new.is_admin then 'admin.grant' else 'admin.revoke' end; v_target := new.id::text;
  elsif tg_table_name = 'catalog_shirts' then
    v_action := 'catalog.' || lower(tg_op); v_target := coalesce(new.id, old.id);
  else
    return coalesce(new, old);
  end if;
  insert into audit_log (actor, action, target, details) values (auth.uid(), v_action, v_target, v_details);
  return coalesce(new, old);
end $$;
revoke execute on function private.audit() from public, anon, authenticated;

drop trigger if exists audit_disputes on public.disputes;
create trigger audit_disputes after update on public.disputes for each row execute function private.audit();
drop trigger if exists audit_review_queue on public.review_queue;
create trigger audit_review_queue after update on public.review_queue for each row execute function private.audit();
drop trigger if exists audit_orders_inspection on public.orders;
create trigger audit_orders_inspection after update of inspection on public.orders for each row execute function private.audit();
drop trigger if exists audit_certificates on public.certificates;
create trigger audit_certificates after update on public.certificates for each row execute function private.audit();
drop trigger if exists audit_api_keys on public.api_keys;
create trigger audit_api_keys after insert or update on public.api_keys for each row execute function private.audit();
drop trigger if exists audit_profiles_admin on public.profiles;
create trigger audit_profiles_admin after update of is_admin on public.profiles for each row execute function private.audit();
drop trigger if exists audit_catalog on public.catalog_shirts;
create trigger audit_catalog after insert or update or delete on public.catalog_shirts for each row execute function private.audit();
