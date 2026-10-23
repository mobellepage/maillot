-- Recommended kits as plain SQL (the PL/pgSQL version clashed with its own output column names).
drop function if exists public.recommended_kits(int);
create function public.recommended_kits(p_limit int default 12)
returns table (id uuid, club_id text, club_name text, league text, season text, season_year int, kind text, variant text, image_path text)
language sql stable security definer set search_path = '' as $$
  with me as (select (select auth.uid()) uid),
  owned as (
    select k.id oid, k.club_id oclub, c.league oleague, (k.season_year / 10) * 10 decade
      from me join public.custom_items ci on ci.user_id = me.uid
      join public.kits k on k.id = private.fantasy_item_kit(ci)
      join public.kit_clubs c on c.id = k.club_id
  ),
  taste as (
    select coalesce((select array_agg(distinct oclub) from owned), '{}') clubs,
           coalesce((select array_agg(distinct oleague) from owned),
                    (select array(select jsonb_array_elements_text(coalesce(p.interests -> 'leagues', '[]'::jsonb))) from public.profiles p, me where p.id = me.uid), '{}') leagues,
           coalesce((select array_agg(distinct decade) from owned), '{}') decades,
           (select p.interests ->> 'club' from public.profiles p, me where p.id = me.uid) fav
  )
  select k.id, k.club_id, c.name, c.league, k.season, k.season_year, k.kind, k.variant, k.image_path
    from me cross join taste t
    join public.kits k on k.image_path is not null and k.kind in ('home', 'away', 'third')
    join public.kit_clubs c on c.id = k.club_id
   where me.uid is not null
     and (k.club_id = any (t.clubs) or k.club_id = t.fav or c.league = any (t.leagues))
     and not exists (select 1 from owned o where o.oid = k.id)
     and not exists (select 1 from public.kit_likes l where l.user_id = me.uid and l.kit_id = k.id)
   order by (case when k.club_id = any (t.clubs) or k.club_id = t.fav then 3 else 0 end)
          + (case when c.league = any (t.leagues) then 1 else 0 end)
          + (case when (k.season_year / 10) * 10 = any (t.decades) then 1 else 0 end) desc,
          md5(k.id::text || current_date::text)
   limit least(greatest(coalesce(p_limit, 12), 1), 48)
$$;
revoke all on function public.recommended_kits(int) from public;
grant execute on function public.recommended_kits(int) to authenticated;
