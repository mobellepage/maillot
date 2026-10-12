-- Plans: Free keeps up to 10 shirts in the collection, Premium (Stripe
-- subscription, CHF 4.90/month or CHF 49/year) has no limit. premium_until
-- is written only by the Stripe webhook (service role) or an admin —
-- members can't grant themselves Premium.
alter table public.profiles
  add column if not exists premium_until timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists premium_waitlist_at timestamptz;

-- The free allowance, in one place (the app reads it too: config/plans.ts).
create or replace function public.free_shirt_limit()
returns int language sql immutable set search_path = '' as $$ select 10 $$;
grant execute on function public.free_shirt_limit() to anon, authenticated;

create or replace function private.is_premium(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select premium_until > now() from public.profiles where id = p_user), false)
$$;

-- A member adding an 11th shirt without Premium is stopped (P0402). Saving
-- changes to a shirt they already have (upsert) is always fine; rows written
-- without a member session (seed, service jobs) are not counted against anyone.
create or replace function private.enforce_shirt_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if exists (select 1 from public.custom_items where id = new.id) then return new; end if;
  perform pg_advisory_xact_lock(hashtext('shirts:' || new.user_id::text));
  if not private.is_premium(new.user_id)
     and (select count(*) from public.custom_items where user_id = new.user_id) >= public.free_shirt_limit() then
    raise exception 'free plan: % shirts at most', public.free_shirt_limit() using errcode = 'P0402', hint = 'premium';
  end if;
  return new;
end $$;

drop trigger if exists custom_items_plan_limit on public.custom_items;
create trigger custom_items_plan_limit before insert on public.custom_items
  for each row execute function private.enforce_shirt_limit();

-- "Tell me when Premium starts" while payments are still switched off.
create or replace function public.join_premium_waitlist()
returns void language sql security definer set search_path = '' as $$
  update public.profiles set premium_waitlist_at = coalesce(premium_waitlist_at, now()) where id = (select auth.uid())
$$;
revoke execute on function public.join_premium_waitlist() from public, anon;
grant execute on function public.join_premium_waitlist() to authenticated;

-- Admins can grant (or end) Premium by hand, e.g. for pilot partners.
create or replace function public.admin_set_premium(p_handle text, p_until timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (select public.is_admin()) then raise exception 'admins only' using errcode = '42501'; end if;
  update public.profiles set premium_until = p_until where lower(handle) = lower(p_handle);
  if not found then raise exception 'no member @%', p_handle using errcode = 'P0002'; end if;
end $$;
revoke execute on function public.admin_set_premium(text, timestamptz) from public, anon;
grant execute on function public.admin_set_premium(text, timestamptz) to authenticated;
