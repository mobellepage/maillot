-- Onboarding: what a new member wants to do and what they collect, so the
-- first screens are about them. Also: handles are now chosen, not derived
-- from the email address (the old default published the part before "@").
alter table public.profiles
  add column if not exists goals text[] not null default '{}' check (goals <@ array['collect', 'buy', 'sell']),
  add column if not exists interests jsonb not null default '{}' check (pg_column_size(interests) < 4096),
  add column if not exists onboarded_at timestamptz;

-- Existing email-derived handles that don't fit the public format are cleared.
update public.profiles set handle = null where handle is not null and handle !~ '^[a-z0-9_]{3,20}$';
alter table public.profiles add constraint profiles_handle_format check (handle is null or handle ~ '^[a-z0-9_]{3,20}$');
create unique index if not exists profiles_handle_unique on public.profiles (lower(handle));

grant update (goals, interests, onboarded_at) on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;

-- Is a handle free (and well-formed)? Your own current handle counts as free.
create or replace function public.handle_available(p_handle text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_handle ~ '^[a-z0-9_]{3,20}$'
     and not exists (select 1 from profiles where lower(handle) = lower(p_handle) and id is distinct from auth.uid())
$$;
revoke execute on function public.handle_available(text) from public, anon;
grant execute on function public.handle_available(text) to authenticated;
