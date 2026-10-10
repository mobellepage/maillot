-- The 50-alert limit moves into a trigger: an insert policy that counts its
-- own table is rejected by Postgres as recursive.
drop policy "listing alerts: own insert" on public.listing_alerts;
create policy "listing alerts: own insert" on public.listing_alerts for insert to authenticated
  with check (user_id = (select auth.uid()));

-- At most 50 alerts per member (a policy can't count its own table).
create or replace function private.listing_alerts_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.listing_alerts where user_id = new.user_id) >= 50 then
    raise exception 'at most 50 alerts' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger listing_alerts_limit before insert on public.listing_alerts for each row execute function private.listing_alerts_limit();
