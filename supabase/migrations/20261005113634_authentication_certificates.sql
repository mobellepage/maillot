-- Certificates of authenticity. Every shirt that passes the Zürich
-- inspection gets one: an unguessable code printed as a QR code on the
-- tamper-evident tag (optionally an NFC chip whose UID we record). Anyone can
-- check a code at /verify/<code> — the answer carries the shirt, size and
-- date, never who bought or sold it.
create table if not exists public.certificates (
  code text primary key,
  order_id uuid unique references public.orders (id) on delete set null,
  shirt_id text references public.catalog_shirts (id),
  size text,
  checks jsonb not null default '[]',
  nfc_uid text unique,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text
);
alter table public.certificates enable row level security;
-- The buyer of the order can list theirs; everyone else goes through verify_certificate().
create policy certificates_buyer_read on public.certificates for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = (select auth.uid())));
create policy certificates_admin_read on public.certificates for select to authenticated
  using ((select public.is_admin()));
revoke insert, update, delete on public.certificates from anon, authenticated;

-- 12 characters from a 31-symbol alphabet without look-alikes (0/O, 1/I/L):
-- ~59 bits, formatted MLT-XXXX-XXXX-XXXX.
create or replace function private.new_certificate_code()
returns text language plpgsql volatile as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  bytes bytea := extensions.gen_random_bytes(12);
  raw text := '';
begin
  for i in 0..11 loop
    raw := raw || substr(alphabet, (get_byte(bytes, i) % 31) + 1, 1);
  end loop;
  return 'MLT-' || substr(raw, 1, 4) || '-' || substr(raw, 5, 4) || '-' || substr(raw, 9, 4);
end $$;

-- Issue on pass. The checklist mirrors the inspection points on /authentication.
create or replace function private.issue_certificate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.inspection = 'passed' and old.inspection is distinct from 'passed' then
    insert into public.certificates (code, order_id, shirt_id, size, checks)
    values (private.new_certificate_code(), new.id, new.shirt_id, new.size,
            '["Crest and badges","Stitching and seams","Fabric and weave","Wash and size tags","Sponsor and kit-maker prints","Season-specific details"]'::jsonb)
    on conflict (order_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists orders_issue_certificate on public.orders;
create trigger orders_issue_certificate after update of inspection on public.orders
  for each row execute function private.issue_certificate();

-- Public lookup. Codes are case-insensitive and tolerate missing dashes.
-- p_tag is the NFC UID read from the chip, if the visitor tapped one.
create or replace function public.verify_certificate(p_code text, p_tag text default null)
returns table (code text, shirt_id text, size text, checks jsonb, issued_at timestamptz, revoked boolean, revoked_reason text, tag_match boolean)
language sql stable security definer set search_path = public as $$
  select c.code, c.shirt_id, c.size, c.checks, c.issued_at, c.revoked_at is not null, c.revoked_reason,
         case when p_tag is null or c.nfc_uid is null then null else upper(c.nfc_uid) = upper(p_tag) end
    from certificates c
   where replace(c.code, '-', '') = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
$$;
revoke execute on function public.verify_certificate(text, text) from public;
grant execute on function public.verify_certificate(text, text) to anon, authenticated;

-- Admin: bind an NFC tag to a certificate, or revoke one (e.g. later found
-- to be a counterfeit, or reported stolen).
create or replace function public.admin_attach_tag(p_code text, p_uid text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update certificates set nfc_uid = upper(nullif(trim(p_uid), '')) where code = p_code;
  if not found then raise exception 'certificate not found'; end if;
end $$;
create or replace function public.admin_revoke_certificate(p_code text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update certificates set revoked_at = now(), revoked_reason = nullif(trim(p_reason), '') where code = p_code and revoked_at is null;
  if not found then raise exception 'certificate not found or already revoked'; end if;
end $$;
revoke execute on function public.admin_attach_tag(text, text), public.admin_revoke_certificate(text, text) from public, anon;
grant execute on function public.admin_attach_tag(text, text), public.admin_revoke_certificate(text, text) to authenticated;
revoke execute on function private.new_certificate_code(), private.issue_certificate() from public, anon, authenticated;
