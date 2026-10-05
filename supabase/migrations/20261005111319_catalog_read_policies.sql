-- catalog_read_policies
-- Anonymous visitors must be able to read the active catalogue without the
-- policy calling is_admin() (not executable by anon). Split into a public
-- read of active rows and an admin read of everything.
drop policy if exists catalog_public_read on public.catalog_shirts;
drop policy if exists catalog_admin_read on public.catalog_shirts;
create policy catalog_public_read on public.catalog_shirts for select to anon, authenticated using (active);
create policy catalog_admin_read on public.catalog_shirts for select to authenticated using ((select public.is_admin()));
