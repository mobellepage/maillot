-- Premium is switched off (2026-10-24, App Store would require Apple's
-- in-app purchase): every account gets every feature — studio photos, the
-- insurance list, scans within the fair-use limit (plan_policy.premium_scans).
-- Paid Premium (is_premium) still lowers the commission for whoever has it.
-- Bring the old rule back with: premium_until > now() or trial_until > now().
create or replace function private.premium_features(p_user uuid)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = p_user)
$$;
