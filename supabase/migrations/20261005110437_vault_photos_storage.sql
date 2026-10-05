-- vault_photos_storage
-- Shirt photos live in Storage, not in table rows. Private bucket; each user
-- writes only inside their own top-level folder (<user id>/…); admins can
-- read everything for verification reviews. Images are re-encoded on the
-- device first (which strips EXIF/GPS), so only JPEG/WebP are accepted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vault-photos', 'vault-photos', false, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vault_photos_owner_read on storage.objects;
drop policy if exists vault_photos_owner_insert on storage.objects;
drop policy if exists vault_photos_owner_update on storage.objects;
drop policy if exists vault_photos_owner_delete on storage.objects;
drop policy if exists vault_photos_admin_read on storage.objects;

create policy vault_photos_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'vault-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy vault_photos_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'vault-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy vault_photos_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'vault-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy vault_photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'vault-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy vault_photos_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'vault-photos' and (select public.is_admin()));
