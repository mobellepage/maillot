-- The catalogue describes the model only: club, season, kit (variant),
-- maker, league, catalogue number, known product codes, picture. What
-- belongs to one physical shirt — version (replica, player-issue,
-- match-issued, match-worn), print, patches, signature, condition, size —
-- lives on the exemplar (custom_items) or the listing (asks). The market
-- value is the reference for a very good replica (as the valuation already
-- normalises: private.condition_factor / edition_factor).
alter table public.catalog_shirts
  alter column cond drop not null,
  alter column edition drop not null,
  add column if not exists kit text not null default 'Home',
  add column if not exists product_codes text[] not null default '{}';

update public.catalog_shirts set cond = null, edition = null, player = null;
update public.catalog_shirts set kit = 'Away' where id = 'ars-91';

-- "Match-worn" is a version, not a kind of catalogue entry: the Milan entry
-- is the 2006/07 home model, valued as a replica, in every size.
update public.catalog_shirts
   set name = 'AC Milan 2006/07 Home', type = 'Retro', index_price = 170,
       sizes = array['S', 'M', 'L', 'XL', 'XXL']
 where id = 'acm-0607';

alter table public.catalog_shirts drop constraint if exists catalog_shirts_type_check;
alter table public.catalog_shirts add constraint catalog_shirts_type_check check (type in ('New', 'Retro'));

-- The four versions, as the app names them, all known to the valuation.
create or replace function private.edition_factor(p text)
returns numeric
language sql
immutable
set search_path to ''
as $function$
  select case lower(coalesce(p, ''))
    when 'authentic' then 1.45 when 'player issue' then 1.45 when 'player-issue' then 1.45 when 'player-issue / authentic' then 1.45
    when 'match-issued' then 2.1
    when 'match_worn' then 3.2 when 'match-worn' then 3.2
    else 1.0 end
$function$;
