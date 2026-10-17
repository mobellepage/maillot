-- Kit news matching: club names also without their prefix or suffix
-- ("FC Augsburg" → "Augsburg", "Hellas Verona" stays), and the short names
-- the press uses for a few clubs.
update public.kit_clubs set aliases = (select array_agg(distinct a) from unnest(aliases || v.extra) a)
from (values
  ('marseille', array['Marseille', 'Olympique Marseille']), ('lyon', array['Lyon', 'Olympique Lyon']),
  ('bremen', array['Werder', 'Werder Bremen']), ('leverkusen', array['Leverkusen']), ('gladbach', array['Gladbach']),
  ('frankfurt', array['Eintracht']), ('newcastle', array['Newcastle']), ('west-ham', array['West Ham']),
  ('wolves', array['Wolves']), ('nottingham-forest', array['Forest']), ('brighton', array['Brighton']),
  ('bayern', array['Bayern Munich']), ('athletic', array['Athletic Bilbao']), ('real-sociedad', array['La Real'])
) as v (id, extra)
where kit_clubs.id = v.id;

create or replace function private.club_short_name(p text)
returns text language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(regexp_replace(lower(p),
    '^(1\. ?fc|1\. ?fsv|fc|sc|sv|vfb|vfl|tsg|ac|as|acf|ss|ssc|us|rc|rcd|ogc|losc|cf|cd|ca|ud|afc|bsc|aj|es|fk|sk) ', ''),
    ' (fc|cf|calcio|cfc|sco|ac|04|05|07|1893|1907|bc)$', ''))
$$;
revoke execute on function private.club_short_name(text) from public;

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
