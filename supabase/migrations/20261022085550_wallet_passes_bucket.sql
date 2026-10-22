-- Collector cards for Apple Wallet: the signed .pkpass files, private; the
-- wallet-pass function stores them (service role) and hands out a link that
-- expires after ten minutes. Members can't list or read them directly.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wallet-passes', 'wallet-passes', false, 5242880, array['application/vnd.apple.pkpass'])
on conflict (id) do nothing;
