-- realtime_publication
-- Live updates instead of polling. Supabase Realtime applies each table's
-- RLS to every subscriber, so users only ever receive rows they can select.
do $$
declare t text;
begin
  foreach t in array array['notifications', 'orders', 'bids', 'asks', 'review_queue', 'disputes', 'custom_items'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Admins read disputes directly (for the live queue); parties keep their own policy.
drop policy if exists disputes_admin_select on public.disputes;
create policy disputes_admin_select on public.disputes for select to authenticated using ((select public.is_admin()));
