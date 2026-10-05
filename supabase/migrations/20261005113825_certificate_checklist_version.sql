-- Certificates record which inspection checklist they were issued against
-- (src/config/inspection.ts) rather than a copy of its text, so the public
-- page can show the full 14-point list for that version.
alter table public.certificates alter column checks set default '{"checklist":"v1"}';
update public.certificates set checks = '{"checklist":"v1"}' where jsonb_typeof(checks) = 'array';

create or replace function private.issue_certificate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.inspection = 'passed' and old.inspection is distinct from 'passed' then
    insert into public.certificates (code, order_id, shirt_id, size, checks)
    values (private.new_certificate_code(), new.id, new.shirt_id, new.size, '{"checklist":"v1"}')
    on conflict (order_id) do nothing;
  end if;
  return new;
end $$;
