-- pg_net's functions live in schema "net" (the extension isn't relocatable),
-- so the extensions.http_post(...) calls in relay_notification,
-- request_settlement and run_order_lifecycle never worked: notification
-- emails and automatic settlements were silently skipped (their exception
-- handlers swallowed the error), and the lifecycle job would have failed on
-- its first settlement retry. Recreate each function from its current
-- definition with the call fixed — nothing else changes.
do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prosrc like '%extensions.http_post(%'
  loop
    execute replace(pg_get_functiondef(f), 'extensions.http_post(', 'net.http_post(');
  end loop;
end $$;
