-- create_api_keys_and_price_index
-- API keys for licensable price-index data product
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  key_prefix text not null,
  key_hash text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);

alter table public.api_keys enable row level security;

create policy api_keys_admin_all on public.api_keys
  for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

-- Atomically generate, hash and store a new API key; returns the plaintext key once.
create or replace function public.create_api_key(p_label text)
returns table (id uuid, plaintext_key text, key_prefix text, created_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_raw text;
  v_prefix text;
  v_hash text;
  v_id uuid;
  v_created timestamptz;
begin
  if not exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'not authorized';
  end if;

  v_raw := encode(gen_random_bytes(24), 'hex');
  v_prefix := 'mlt_' || substr(v_raw, 1, 8);
  v_hash := encode(digest(v_raw, 'sha256'), 'hex');

  insert into public.api_keys (label, key_prefix, key_hash, created_by)
  values (p_label, v_prefix, v_hash, auth.uid())
  returning api_keys.id, api_keys.created_at into v_id, v_created;

  return query select v_id, (v_prefix || '.' || v_raw), v_prefix, v_created;
end;
$$;

create or replace function public.revoke_api_key(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'not authorized';
  end if;
  update public.api_keys set revoked_at = now() where id = p_id;
end;
$$;
