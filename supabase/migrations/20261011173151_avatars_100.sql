-- 50 more legend avatars: profiles.avatar accepts 'legend-01' … 'legend-99' and 'legend-100'.
alter table public.profiles drop constraint profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check
  check (avatar ~ '^legend-(0[1-9]|[1-9][0-9]|100)$');
