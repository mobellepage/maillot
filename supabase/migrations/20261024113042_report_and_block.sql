-- Reporting and blocking (App Store guideline 1.2: apps with user content
-- need a way to report it, to block abusive users, and someone who acts on
-- reports). Reports go to the admins (notification + Admin → Reports);
-- a block hides the other member's content for the blocker (the app filters
-- by handle) and stops comments, inquiries and follows between the two.

create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index user_blocks_blocked_idx on public.user_blocks (blocked_id);
alter table public.user_blocks enable row level security;
create policy user_blocks_own_read on public.user_blocks for select to authenticated using (blocker_id = (select auth.uid()));

create table public.content_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('profile', 'shirt', 'comment', 'inquiry')),
  target_id text not null,
  reason text not null check (reason in ('spam', 'offensive', 'scam', 'other')),
  note text check (char_length(note) <= 500),
  snapshot text,
  status text not null default 'open' check (status in ('open', 'removed', 'dismissed')),
  handled_by uuid references public.profiles(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index content_reports_open_idx on public.content_reports (created_at desc) where status = 'open';
create index content_reports_reporter_idx on public.content_reports (reporter_id);
create index content_reports_target_user_idx on public.content_reports (target_user_id);
create index content_reports_handled_by_idx on public.content_reports (handled_by);
alter table public.content_reports enable row level security;
create policy content_reports_admin_read on public.content_reports for select to authenticated using ((select public.is_admin()));

/** Whether either of the two members blocked the other. */
create or replace function private.blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

-- No comments, inquiries or follows across a block.
create or replace function private.refuse_blocked()
returns trigger language plpgsql security definer set search_path = '' as $$
declare a uuid; b uuid;
begin
  if tg_table_name = 'item_comments' then
    a := new.user_id; b := (select user_id from public.custom_items where id = new.item_id);
  elsif tg_table_name = 'item_inquiries' then
    a := new.from_id; b := new.owner_id;
  else
    a := new.follower_id; b := new.followee_id;
  end if;
  if a is not null and b is not null and private.blocked_between(a, b) then
    raise exception 'blocked' using errcode = '42501', hint = 'One of you blocked the other.';
  end if;
  return new;
end $$;
create trigger item_comments_refuse_blocked before insert on public.item_comments for each row execute function private.refuse_blocked();
create trigger item_inquiries_refuse_blocked before insert on public.item_inquiries for each row execute function private.refuse_blocked();
create trigger follows_refuse_blocked before insert on public.follows for each row execute function private.refuse_blocked();

create or replace function public.block_user(p_handle text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me uuid := (select auth.uid()); v_them uuid;
begin
  if v_me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select id into v_them from public.profiles where lower(handle) = lower(p_handle);
  if v_them is null then raise exception 'no such collector' using errcode = 'P0002'; end if;
  if v_them = v_me then raise exception 'you cannot block yourself' using errcode = '22023'; end if;
  perform private.hit('block:' || v_me, 60, interval '1 hour');
  insert into public.user_blocks (blocker_id, blocked_id) values (v_me, v_them) on conflict do nothing;
  delete from public.follows where (follower_id = v_me and followee_id = v_them) or (follower_id = v_them and followee_id = v_me);
  update public.item_inquiries set status = 'dismissed' where status = 'open' and ((owner_id = v_me and from_id = v_them) or (owner_id = v_them and from_id = v_me));
end $$;

create or replace function public.unblock_user(p_handle text)
returns void language sql security definer set search_path = '' as $$
  delete from public.user_blocks
   where blocker_id = (select auth.uid())
     and blocked_id = (select id from public.profiles where lower(handle) = lower(p_handle))
$$;

create or replace function public.my_blocks()
returns table (handle text, avatar text, blocked_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.handle, p.avatar, b.created_at
    from public.user_blocks b join public.profiles p on p.id = b.blocked_id
   where b.blocker_id = (select auth.uid())
   order by b.created_at desc
$$;

-- Report a profile (handle), a shirt (custom_items id), a comment or an
-- inquiry (uuid). The owner of the content and a short copy of it are kept,
-- so the report still makes sense after the content changed.
create or replace function public.report_content(p_kind text, p_target text, p_reason text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_user uuid;
  v_snap text;
  v_handle text;
begin
  if v_me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_reason not in ('spam', 'offensive', 'scam', 'other') then raise exception 'unknown reason' using errcode = '22023'; end if;
  perform private.hit('report:' || v_me, 30, interval '1 day');
  if p_kind = 'profile' then
    select id, coalesce(bio, '') into v_user, v_snap from public.profiles where lower(handle) = lower(p_target);
  elsif p_kind = 'shirt' then
    select user_id, concat_ws(' ', proposed_club, proposed_season) into v_user, v_snap from public.custom_items where id = p_target;
  elsif p_kind = 'comment' then
    select user_id, body into v_user, v_snap from public.item_comments where id::text = p_target;
  elsif p_kind = 'inquiry' then
    select case when owner_id = v_me then from_id else owner_id end, concat_ws(' · ', message, reply) into v_user, v_snap
      from public.item_inquiries where id::text = p_target and v_me in (owner_id, from_id);
  else
    raise exception 'unknown kind' using errcode = '22023';
  end if;
  if v_user is null then raise exception 'nothing to report' using errcode = 'P0002'; end if;
  if v_user = v_me then raise exception 'this is your own' using errcode = '22023'; end if;
  if exists (select 1 from public.content_reports where reporter_id = v_me and kind = p_kind and target_id = p_target and status = 'open') then return; end if;

  insert into public.content_reports (reporter_id, target_user_id, kind, target_id, reason, note, snapshot)
  values (v_me, v_user, p_kind, p_target, p_reason, nullif(btrim(left(p_note, 500)), ''), left(v_snap, 500));

  select handle into v_handle from public.profiles where id = v_user;
  insert into public.notifications (user_id, type, title, body, data)
  select a.id, 'content_report', 'New report', 'A ' || p_kind || ' by @' || coalesce(v_handle, '?') || ' was reported (' || p_reason || ').',
         jsonb_build_object('link', '/admin?tab=reports', 'kind', p_kind)
    from public.profiles a where a.is_admin;
end $$;

-- Admin: the reports, open first, with what's needed to look at the content.
create or replace function public.admin_reports(p_status text default 'open')
returns table (id bigint, kind text, target_id text, reason text, note text, snapshot text, status text, created_at timestamptz,
               reporter text, target_handle text, item_id text, reports_on_user integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  return query
  select r.id, r.kind, r.target_id, r.reason, r.note, r.snapshot, r.status, r.created_at,
         rp.handle, tp.handle,
         case r.kind when 'shirt' then r.target_id
                     when 'comment' then (select c.item_id from public.item_comments c where c.id::text = r.target_id)
                     when 'inquiry' then (select i.item_id from public.item_inquiries i where i.id::text = r.target_id) end,
         (select count(*)::int from public.content_reports x where x.target_user_id = r.target_user_id)
    from public.content_reports r
    left join public.profiles rp on rp.id = r.reporter_id
    left join public.profiles tp on tp.id = r.target_user_id
   where p_status = 'all' or r.status = p_status
   order by r.created_at desc
   limit 200;
end $$;

-- Admin: close a report. 'removed' takes the content down: a comment is
-- deleted, a shirt goes private, an inquiry is dismissed, a profile loses
-- its bio and avatar.
create or replace function public.admin_resolve_report(p_id bigint, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.content_reports;
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  if p_action not in ('removed', 'dismissed') then raise exception 'unknown action' using errcode = '22023'; end if;
  select * into r from public.content_reports where id = p_id;
  if r.id is null then raise exception 'no such report' using errcode = 'P0002'; end if;
  if p_action = 'removed' then
    if r.kind = 'comment' then delete from public.item_comments where id::text = r.target_id;
    elsif r.kind = 'shirt' then update public.custom_items set visibility = 'private' where id = r.target_id;
    elsif r.kind = 'inquiry' then update public.item_inquiries set status = 'dismissed' where id::text = r.target_id;
    elsif r.kind = 'profile' then update public.profiles set bio = null, avatar = null where id = r.target_user_id;
    end if;
  end if;
  update public.content_reports set status = p_action, handled_by = (select auth.uid()), handled_at = now()
   where id = p_id or (status = 'open' and kind = r.kind and target_id = r.target_id);
end $$;

revoke all on function public.block_user(text), public.unblock_user(text), public.my_blocks(), public.report_content(text, text, text, text),
  public.admin_reports(text), public.admin_resolve_report(bigint, text) from public, anon;
grant execute on function public.block_user(text), public.unblock_user(text), public.my_blocks(), public.report_content(text, text, text, text),
  public.admin_reports(text), public.admin_resolve_report(bigint, text) to authenticated;
revoke all on function private.blocked_between(uuid, uuid), private.refuse_blocked() from public, anon, authenticated;
