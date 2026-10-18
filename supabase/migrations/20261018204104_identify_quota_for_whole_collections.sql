-- Collectors photograph their whole collection in one sitting: recognition
-- must not stop after a dozen shirts. The limits only stop abuse now (a
-- shirt is recognised once, from front and back together).
create or replace function public.consume_identify_quota()
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  perform private.hit('identify:' || (select auth.uid()), 150, interval '1 hour');
  perform private.hit('identify:day:' || (select auth.uid()), 500, interval '1 day');
  perform private.hit('identify:all', 3000, interval '1 hour');
  perform private.hit('identify:all:day', 20000, interval '1 day');
end;
$function$;
