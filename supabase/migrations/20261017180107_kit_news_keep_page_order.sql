-- Kit news keep SoccerBible's order (the page lists the newest first; the
-- links only carry the month): new headlines get their place by position,
-- known ones keep theirs.
create or replace function public.store_news(p_items jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0; mt record;
begin
  for r in select x.*, o.ord from jsonb_array_elements(p_items) with ordinality as o (item, ord)
                cross join lateral jsonb_to_record(o.item) as x (url text, title text, published_on date)
            limit 60 loop
    select * into mt from private.news_match(r.title, r.published_on);
    insert into public.news_items (source, url, title, published_on, club_id, kit_id, fetched_at)
    values ('SoccerBible', r.url, left(r.title, 240), r.published_on, mt.club_id, mt.kit_id, now() - r.ord * interval '1 second')
    on conflict (url) do update set title = excluded.title, club_id = excluded.club_id, kit_id = excluded.kit_id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.store_news(jsonb) from public, anon, authenticated;
grant execute on function public.store_news(jsonb) to service_role;
