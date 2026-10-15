-- A member's favourite team (profiles.interests.club): its kits show at the
-- top of the collection, the ones the member owns lit up.

create or replace function public.set_favorite_club(p_club text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me uuid := (select auth.uid());
begin
  if v_me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_club is not null and not exists (select 1 from public.kit_clubs where id = p_club) then
    raise exception 'unknown club' using errcode = '22023';
  end if;
  update public.profiles
     set interests = case when p_club is null then interests - 'club' else interests || jsonb_build_object('club', p_club) end
   where id = v_me;
end $$;

-- The library kits of one club that the caller has in their collection
-- (any visibility: it's their own), matched like library_kit_owners().
create or replace function public.my_club_kits(p_club text)
returns table (kit_id uuid, item_id text) language plpgsql security definer set search_path = '' as $$
declare v_me uuid := (select auth.uid());
begin
  if v_me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  return query
    with items as (
      select ci.id, (private.kit_slot(coalesce(cs.club, ci.proposed_club), coalesce(cs.season, ci.proposed_season),
                                      coalesce(cs.name, ci.proposed_variant))).*
        from public.custom_items ci
        left join public.catalog_shirts cs on cs.id = ci.catalog_id
       where ci.user_id = v_me
    )
    select distinct on (i.id) k.id, i.id
      from items i
      join public.kits k on k.club_id = i.club_id and k.season = i.season and k.kind = i.kind and k.status = 'approved'
     where i.club_id = p_club
     order by i.id, k.variant;
end $$;

revoke execute on function public.set_favorite_club(text) from public, anon;
revoke execute on function public.my_club_kits(text) from public, anon;
grant execute on function public.set_favorite_club(text) to authenticated;
grant execute on function public.my_club_kits(text) to authenticated;
