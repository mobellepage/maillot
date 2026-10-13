-- The member's try-on character (features/tryon): looks, body, outfit and
-- saved looks, so it follows them across devices. Only they read and write
-- it (profiles RLS); kept small.
alter table public.profiles add column if not exists character jsonb;
alter table public.profiles drop constraint if exists profiles_character_size;
alter table public.profiles add constraint profiles_character_size
  check (character is null or (jsonb_typeof(character) = 'object' and pg_column_size(character) < 8000));
grant update (character) on public.profiles to authenticated;
