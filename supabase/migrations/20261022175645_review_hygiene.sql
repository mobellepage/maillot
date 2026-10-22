-- After the review: an index on every foreign key that had none, one read
-- policy per table where admins had a second one, and a fixed search_path
-- on the last two private helpers without one.

-- Every foreign key without an index whose leading columns are the key's.
do $$
declare r record; idx text;
begin
  for r in
    select c.conrelid::regclass as tbl, t.relname,
           (select string_agg(quote_ident(a.attname), ', ' order by k.ord)
              from unnest(c.conkey) with ordinality k (attnum, ord)
              join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as cols
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
     where c.contype = 'f' and n.nspname in ('public', 'private')
       and not exists (
         select 1 from pg_index i
          where i.indrelid = c.conrelid
            and (select array_agg(x) from unnest((i.indkey::int2[])[0:array_length(c.conkey, 1) - 1]) x) = c.conkey)
  loop
    idx := left(r.relname || '_' || replace(replace(r.cols, ', ', '_'), '"', '') || '_fk_idx', 63);
    execute format('create index if not exists %I on %s (%s)', idx, r.tbl, r.cols);
  end loop;
end $$;

-- One read policy per table: the party's rule, or an admin.
drop policy if exists catalog_admin_read on public.catalog_shirts;          -- catalog_admin_write (for all) covers reading
drop policy if exists certificates_admin_read on public.certificates;
drop policy if exists certificates_buyer_read on public.certificates;
create policy certificates_read on public.certificates for select to authenticated
  using (public.is_admin() or exists (select 1 from public.orders o where o.id = certificates.order_id and o.buyer_id = (select auth.uid())));
drop policy if exists disputes_admin_select on public.disputes;
drop policy if exists disputes_party_select on public.disputes;
create policy disputes_select on public.disputes for select to authenticated
  using (public.is_admin() or exists (select 1 from public.orders o where o.id = disputes.order_id and (o.buyer_id = (select auth.uid()) or o.seller_id = (select auth.uid()))));
drop policy if exists kits_read_admin on public.kits;
drop policy if exists kits_read_own on public.kits;
create policy kits_read on public.kits for select to authenticated
  using (public.is_admin() or suggested_by = (select auth.uid()));
drop policy if exists order_addresses_admin_read on public.order_addresses;
drop policy if exists order_addresses_buyer_read on public.order_addresses;
drop policy if exists order_addresses_seller_read on public.order_addresses;
create policy order_addresses_read on public.order_addresses for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_addresses.order_id and o.buyer_id = (select auth.uid()))
    or exists (select 1 from public.orders o where o.id = order_addresses.order_id and o.seller_id = (select auth.uid())
                 and o.inspection = 'not_required' and o.status = any (array['paid_escrow', 'shipped', 'delivered', 'disputed']))
  );

alter function private.notification_group(text) set search_path = '';
alter function private.new_certificate_code() set search_path = '';
