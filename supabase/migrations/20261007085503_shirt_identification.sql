-- Photo → shirt identification (edge function identify-shirt, Claude vision).
-- Results are kept without the photos: they show what members own and help
-- tune recognition and the valuation model. Members read their own; only the
-- edge function (service role) writes.
create table if not exists public.shirt_identifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  catalog_id text,
  confidence numeric,
  result jsonb not null,
  model text not null,
  created_at timestamptz not null default now()
);
create index if not exists shirt_identifications_user_idx on public.shirt_identifications (user_id, created_at desc);
alter table public.shirt_identifications enable row level security;
create policy "members read their own identifications" on public.shirt_identifications
  for select to authenticated using (user_id = (select auth.uid()));

-- Every identification costs an API call: 20 per member per hour, and a
-- global ceiling so a flood of sign-ups can't run up the bill.
create or replace function public.consume_identify_quota()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  perform private.hit('identify:' || (select auth.uid()), 20, interval '1 hour');
  perform private.hit('identify:all', 2000, interval '1 hour');
end;
$$;
revoke all on function public.consume_identify_quota() from public, anon;
grant execute on function public.consume_identify_quota() to authenticated;
