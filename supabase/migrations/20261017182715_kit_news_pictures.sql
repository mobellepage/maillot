-- Kit news with SoccerBible's title pictures (used with the owner's
-- permission): fetch-news keeps a copy of each in the public news-images
-- bucket, so the app loads them from our own storage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('news-images', 'news-images', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

alter table public.news_items add column if not exists image_path text
  check (image_path ~ '^[a-z0-9][a-z0-9/_.-]*\.(jpg|jpeg|png|webp)$');

create or replace function public.store_news(p_items jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0; mt record;
begin
  for r in select x.*, o.ord from jsonb_array_elements(p_items) with ordinality as o (item, ord)
                cross join lateral jsonb_to_record(o.item) as x (url text, title text, published_on date, image_path text)
            limit 60 loop
    select * into mt from private.news_match(r.title, r.published_on);
    insert into public.news_items (source, url, title, published_on, club_id, kit_id, image_path, fetched_at)
    values ('SoccerBible', r.url, left(r.title, 240), r.published_on, mt.club_id, mt.kit_id, r.image_path, now() - r.ord * interval '1 second')
    on conflict (url) do update set title = excluded.title, club_id = excluded.club_id, kit_id = excluded.kit_id,
      image_path = coalesce(excluded.image_path, public.news_items.image_path);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.store_news(jsonb) from public, anon, authenticated;
grant execute on function public.store_news(jsonb) to service_role;

drop function if exists public.latest_news(int);
create function public.latest_news(p_limit int default 5)
returns table (id uuid, source text, url text, title text, published_on date, image_path text, club_id text, club_name text, kit_season text, kit_image text)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.throttle('library', 300, 1500);
  return query
    select n.id, n.source, n.url, n.title, n.published_on, n.image_path, n.club_id, c.name, k.season, k.image_path
      from public.news_items n
      left join public.kit_clubs c on c.id = n.club_id
      left join public.kits k on k.id = n.kit_id
     order by n.published_on desc, n.fetched_at desc
     limit least(greatest(coalesce(p_limit, 5), 1), 20);
end $$;
revoke execute on function public.latest_news(int) from public;
grant execute on function public.latest_news(int) to anon, authenticated;

-- The next run fetches again at once (to collect the pictures).
delete from private.app_settings where key = 'news_fetched_at';
