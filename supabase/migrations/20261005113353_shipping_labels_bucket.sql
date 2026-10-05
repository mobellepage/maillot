-- Prepaid shipping labels (PDF). Private, with no client policies: only the
-- shipping-label edge function (service role) reads and writes, and hands
-- out short-lived signed URLs to the seller or an admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shipping-labels', 'shipping-labels', false, 2097152, array['application/pdf'])
on conflict (id) do nothing;
