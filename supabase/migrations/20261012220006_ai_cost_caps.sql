-- Cost brake for the paid AI calls (pilot phase): on top of the hourly
-- limits, daily ceilings per member and overall, so a busy day can cost a
-- few francs at most. Raise them here once usage (and income) grows.
create or replace function public.consume_identify_quota()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  perform private.hit('identify:' || (select auth.uid()), 20, interval '1 hour');
  perform private.hit('identify:day:' || (select auth.uid()), 40, interval '1 day');
  perform private.hit('identify:all', 2000, interval '1 hour');
  perform private.hit('identify:all:day', 300, interval '1 day');
end;
$$;
revoke all on function public.consume_identify_quota() from public, anon;
grant execute on function public.consume_identify_quota() to authenticated;

create or replace function public.consume_studio_quota()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  perform private.hit('studio:' || (select auth.uid()), 30, interval '1 hour');
  perform private.hit('studio:day:' || (select auth.uid()), 60, interval '1 day');
  perform private.hit('studio:all', 1500, interval '1 hour');
  perform private.hit('studio:all:day', 300, interval '1 day');
end;
$$;
revoke all on function public.consume_studio_quota() from public, anon;
grant execute on function public.consume_studio_quota() to authenticated;
