-- The read throttle protects the public data from bulk copying by visitors.
-- The build that prerenders every public page (scripts/prerender.mjs) reads
-- with the service role key — a server-side secret — and is not a visitor.
create or replace function private.throttle(p_bucket text, p_anon int, p_member int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '') = 'service_role' then return; end if;
  perform private.hit('read:' || p_bucket || ':' || private.client_key(),
                      case when (select auth.uid()) is null then p_anon else p_member end, interval '1 hour');
end $$;
