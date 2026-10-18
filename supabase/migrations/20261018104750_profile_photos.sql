-- Profile pictures of their own: a square photo in the public avatars bucket,
-- under the member's own folder (<user id>/…), which only they can write.
-- profiles.avatar is then 'photo:<user id>/<file>' instead of a legend.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy avatars_own_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_own_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check
  check (avatar ~ '^legend-(0[1-9]|[1-9][0-9]|100)$' or avatar ~ '^photo:[0-9a-f-]{36}/[a-z0-9_-]{1,60}\.(jpg|webp)$');

-- A member's photo must be in their own folder.
create or replace function private.own_avatar_photo()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.avatar like 'photo:%' and split_part(substr(new.avatar, 7), '/', 1) <> new.id::text then
    raise exception 'not your photo' using errcode = '42501';
  end if;
  return new;
end $$;
revoke execute on function private.own_avatar_photo() from public;
drop trigger if exists profiles_own_avatar_photo on public.profiles;
create trigger profiles_own_avatar_photo before insert or update of avatar on public.profiles
  for each row execute function private.own_avatar_photo();
