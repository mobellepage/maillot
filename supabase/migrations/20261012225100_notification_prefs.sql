-- Notification settings. Offers, inquiries, orders and payouts always reach
-- the member (money and deadlines). Three groups can be switched off:
-- value news, wanted shirts and social. A switched-off group is simply not
-- written (profiles.notification_prefs: {"value": false, ...}).
alter table public.profiles add column if not exists notification_prefs jsonb not null default '{}'::jsonb;
grant update (notification_prefs) on public.profiles to authenticated;

create or replace function private.notification_group(p_type text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_type in ('price_move', 'all_time_high', 'collection_week') then 'value'
    when p_type in ('wanted_in_collection', 'listing_alert') then 'wanted'
    when p_type in ('new_follower', 'followed_shirt', 'followed_listing') then 'social'
  end
$$;

create or replace function private.respect_notification_prefs()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_group text := private.notification_group(new.type);
begin
  if v_group is not null and exists (
    select 1 from public.profiles p where p.id = new.user_id and p.notification_prefs ->> v_group = 'false'
  ) then
    return null; -- switched off: not written
  end if;
  return new;
end $$;

drop trigger if exists notifications_respect_prefs on public.notifications;
create trigger notifications_respect_prefs before insert on public.notifications
  for each row execute function private.respect_notification_prefs();
