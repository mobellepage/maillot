-- Popular today: a different few every day, drawn from the 60 kits liked
-- and added most lately (topped up with current kits of big clubs and nations).
create or replace function public.popular_kits(p_limit int default 3)
returns table (id uuid, club_id text, club_name text, season text, kind text, variant text, image_path text)
language plpgsql security definer set search_path = '' as $$
declare
  v_year int := extract(year from (now() at time zone 'Europe/Zurich'))::int;
  v_day text := (now() at time zone 'Europe/Zurich')::date::text;
begin
  perform private.throttle('library', 300, 1500);
  return query
    with activity as (
      select l.kit_id, count(*) * 3 as score from public.kit_likes l where l.created_at > now() - interval '14 days' group by 1
      union all
      select ci.kit_id, count(*) * 5 from public.custom_items ci where ci.kit_id is not null and ci.created_at > now() - interval '30 days' group by 1
    ), scored as (select a.kit_id, sum(a.score) as score from activity a group by 1),
    pool as (
      select k.id, k.club_id, c.name, k.season, k.kind, k.variant, k.image_path
        from public.kits k
        join public.kit_clubs c on c.id = k.club_id
        left join scored s on s.kit_id = k.id
       where k.status = 'approved' and k.image_path is not null and k.variant = '' and k.kind in ('home', 'away', 'third')
         and (c.top5 or c.league in ('Swiss Super League', 'National Teams'))
         and (s.score is not null or k.season_year >= v_year - 1)
       order by coalesce(s.score, 0) desc, md5(k.id::text || v_day)
       limit 60
    )
    select p.id, p.club_id, p.name, p.season, p.kind, p.variant, p.image_path
      from pool p
     order by md5(p.id::text || ':' || v_day)
     limit least(greatest(coalesce(p_limit, 3), 1), 30);
end $$;
