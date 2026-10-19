-- Premium, second version (2026-10-19). The collection stays free and
-- unlimited; what costs money is paid for:
--   free     20 AI scans a month, 8 % commission
--   trial    every account, 7 days from sign-up: unlimited scans (fair use)
--   premium  CHF 4.90 a month / CHF 39 a year (Stripe, premium_until):
--            unlimited scans (fair use 500 a month), studio look, 6 % commission
-- The app reads the same numbers from src/config/plans.ts — change both.
create or replace function private.plan_policy()
returns table (free_scans int, premium_scans int, trial_days int, free_rate numeric, premium_rate numeric)
language sql immutable set search_path = '' as $$ select 20, 500, 7, 0.08::numeric, 0.06::numeric $$;

alter table public.profiles add column if not exists trial_until timestamptz;
alter table public.profiles alter column trial_until set default (now() + interval '7 days');
-- Members who are already here get their week from today.
update public.profiles set trial_until = now() + interval '7 days' where trial_until is null;

-- Members read their own trial (the app counts the days down); only the
-- database writes it, like premium_until.
grant select (trial_until) on public.profiles to authenticated;

-- private.is_premium (premium_plan) stays paid premium only; the premium
-- features also come with the trial.
create or replace function private.premium_features(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select premium_until > now() or trial_until > now() from public.profiles where id = p_user), false)
$$;

-- AI scans: the free monthly allowance (P0402 = the plan's limit, not abuse)
-- or premium's fair use; the hourly, daily and overall caps stay.
create or replace function public.consume_identify_quota()
returns void language plpgsql security definer set search_path to '' as $function$
declare v_me uuid := (select auth.uid());
begin
  if v_me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if private.premium_features(v_me) then
    perform private.hit('identify:fair:' || v_me, (select premium_scans from private.plan_policy()), interval '30 days');
  else
    begin
      perform private.hit('identify:free:' || v_me, (select free_scans from private.plan_policy()), interval '30 days');
    exception when sqlstate 'P0429' then
      raise exception 'scan_quota' using errcode = 'P0402', hint = 'The free scans of this month are used; premium scans without limit.';
    end;
  end if;
  perform private.hit('identify:' || v_me, 150, interval '1 hour');
  perform private.hit('identify:day:' || v_me, 500, interval '1 day');
  perform private.hit('identify:all', 3000, interval '1 hour');
  perform private.hit('identify:all:day', 20000, interval '1 day');
end;
$function$;

-- The studio look is a premium feature (the trial included).
create or replace function public.consume_studio_quota()
returns void language plpgsql security definer set search_path to '' as $function$
declare v_me uuid := (select auth.uid());
begin
  if v_me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not private.premium_features(v_me) then
    raise exception 'premium_only' using errcode = 'P0402';
  end if;
  perform private.hit('studio:' || v_me, 30, interval '1 hour');
  perform private.hit('studio:day:' || v_me, 60, interval '1 day');
  perform private.hit('studio:all', 1500, interval '1 hour');
  perform private.hit('studio:all:day', 300, interval '1 day');
end;
$function$;

-- Commission: a dealer's own rate, else 6 % with paid premium, else 8 %.
create or replace function private.commission_for(p_seller uuid, p_amount numeric)
returns numeric language sql stable security definer set search_path to '' as $function$
  select round(p_amount * coalesce(
    (select commission_rate from public.profiles where id = p_seller),
    case when private.is_premium(p_seller) then (select premium_rate from private.plan_policy()) else (select free_rate from private.plan_policy()) end))
$function$;

-- What the app shows: the member's plan and this month's scans.
create or replace function public.my_plan()
returns table (plan text, trial_until timestamptz, premium_until timestamptz, scans_used int, scans_limit int, scans_reset timestamptz)
language sql stable security definer set search_path = '' as $$
  with me as (select p.* from public.profiles p where p.id = (select auth.uid())),
       pol as (select * from private.plan_policy()),
       used as (
         select r.hits, r.window_start from private.rate_limits r, me
          where r.key = case when private.premium_features(me.id) then 'identify:fair:' else 'identify:free:' end || me.id
            and r.window_start > now() - interval '30 days')
  select case when me.premium_until > now() then 'premium' when me.trial_until > now() then 'trial' else 'free' end,
         me.trial_until, me.premium_until,
         coalesce((select hits from used), 0),
         case when private.premium_features(me.id) then pol.premium_scans else pol.free_scans end,
         (select window_start + interval '30 days' from used)
    from me, pol
$$;
revoke execute on function public.my_plan() from public, anon;
grant execute on function public.my_plan() to authenticated;
