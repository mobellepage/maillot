-- Studio photos (edge function studio-photo): each cut-out is a paid call to
-- the background-removal service — 30 per member per hour, 1,500 overall.
create or replace function public.consume_studio_quota()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  perform private.hit('studio:' || (select auth.uid()), 30, interval '1 hour');
  perform private.hit('studio:all', 1500, interval '1 hour');
end;
$$;
revoke all on function public.consume_studio_quota() from public, anon;
grant execute on function public.consume_studio_quota() to authenticated;
