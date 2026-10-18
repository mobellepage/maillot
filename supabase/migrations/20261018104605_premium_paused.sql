-- Premium is paused: members keep as many shirts as they like. The limit's
-- functions stay (free_shirt_limit, private.enforce_shirt_limit); to bring
-- the plan back, re-create the trigger and set PREMIUM_ENABLED in
-- src/config/plans.ts.
drop trigger if exists custom_items_plan_limit on public.custom_items;
