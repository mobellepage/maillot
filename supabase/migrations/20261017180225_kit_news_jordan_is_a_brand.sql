-- Kit news: "Jordan" (Nike's brand) is not Jordan's national team; the
-- stored headlines are matched again.
create or replace function private.news_match(p_title text, p_published date, out club_id text, out kit_id uuid)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_t text := lower(p_title);
  v_season text;
  v_year int;
  v_kind text;
  v_women boolean := v_t ~ '\m(women|womens|women''s|frauen|féminines)\M';
  m text[];
begin
  select c.id into club_id
    from public.kit_clubs c
    cross join lateral unnest(array[c.name, private.club_short_name(c.name)] || c.aliases) as n (name)
   where char_length(n.name) >= 4
     and v_t ~ ('\m' || regexp_replace(lower(n.name), '([.^$*+?()\[\]{}|\\-])', '\\\1', 'g') || '\M')
     and exists (select 1 from public.kits k where k.club_id = c.id and k.status = 'approved' and k.image_path is not null)
     -- "Jordan" in kit news is Nike's brand, not the national team.
     and not (c.id = 'jordan' and v_t !~ '\mjordan(''s)? (national|fa)\M')
   order by char_length(n.name) desc, c.top5 desc
   limit 1;
  if club_id is null then return; end if;

  m := regexp_match(v_t, '\m(\d{2})/(\d{2})\M');
  if m is not null then
    v_year := 2000 + m[1]::int;
  else
    v_year := extract(year from p_published)::int - case when extract(month from p_published) < 7 then 1 else 0 end;
  end if;
  v_season := v_year || '/' || lpad(((v_year + 1) % 100)::text, 2, '0');
  v_kind := case
    when v_t ~ '\mthird\M' then 'third'
    when v_t ~ '\mfourth\M' then 'fourth'
    when v_t ~ '\maway\M' then 'away'
    when v_t ~ '\m(goalkeeper|gk)\M' then 'goalkeeper'
    when v_t ~ '\mhome\M' then 'home'
    when v_t ~ '\m(special|anniversary|celebrate|honour|honor|tribute|edition)\M' then 'special'
  end;
  select k.id into kit_id
    from public.kits k
   where k.club_id = news_match.club_id and k.status = 'approved' and k.image_path is not null
     and (k.season = v_season or k.season = v_year::text)
   order by (k.kind = v_kind) desc nulls last, (v_women and k.variant = 'Women') desc, (k.variant = '') desc,
            array_position(array['home', 'away', 'third', 'fourth', 'special', 'cup', 'european', 'goalkeeper', 'training'], k.kind)
   limit 1;
end $$;
revoke execute on function private.news_match(text, date) from public;

update public.news_items n set club_id = m.club_id, kit_id = m.kit_id
from public.news_items x cross join lateral private.news_match(x.title, x.published_on) m
where n.id = x.id;
