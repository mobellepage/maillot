-- configurable_notification_relay
-- Environment-specific settings live in a private table instead of being
-- hard-coded into functions, so a local/staging database built from these
-- migrations never calls production endpoints. Each environment sets its own
-- values (production: see README "Environments"; local: supabase/seed.sql).
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_settings (
  key text primary key,
  value text not null
);
revoke all on private.app_settings from public, anon, authenticated;

create or replace function public.relay_notification()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare v_url text;
begin
  select value into v_url from private.app_settings where key = 'functions_url';
  if v_url is null then return new; end if;
  perform extensions.http_post(
    url := v_url || '/send-notification',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('id', new.id)
  );
  return new;
exception when others then
  return new;
end $$;
revoke execute on function public.relay_notification() from public, anon, authenticated;
