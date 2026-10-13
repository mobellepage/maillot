-- The daily shirt puzzle: one result per member and day, so streaks follow
-- the member across devices. Only today's puzzle (Zurich time, ±1 day for
-- clocks and time zones) can be recorded, and only once — no backfilling
-- streaks.
create table if not exists public.daily_game_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  won boolean not null,
  tries smallint not null check (tries between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.daily_game_results enable row level security;

create policy daily_game_own_read on public.daily_game_results for select to authenticated
  using (user_id = (select auth.uid()));
create policy daily_game_own_insert on public.daily_game_results for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and day between ((now() at time zone 'Europe/Zurich')::date - 1) and ((now() at time zone 'Europe/Zurich')::date + 1)
  );
revoke update, delete on public.daily_game_results from anon, authenticated;
grant select, insert on public.daily_game_results to authenticated;
