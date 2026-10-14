-- The try-on studio was removed: drop the stored figures and looks.
alter table public.profiles drop constraint if exists profiles_character_size;
alter table public.profiles drop column if exists character;
