-- The print wanted on a wishlist kit (player and number) can be corrected:
-- the upsert of the wish dialog updates the row already there.
create policy kit_likes_own_update on public.kit_likes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
