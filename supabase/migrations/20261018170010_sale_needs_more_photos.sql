-- Selling a collection shirt (a set price or open to offers) needs more photos
-- than keeping it: front, back, badge, inner label and, if it has one, the
-- print. Shirts already on sale stay there; only a new sale is checked.
create or replace function private.sale_photos_missing(p_photos jsonb, p_flock jsonb)
returns text[]
language sql immutable
set search_path = ''
as $$
  select coalesce(array_agg(x.k order by x.n), '{}')
  from unnest(array['front', 'back', 'crest', 'flock_closeup', 'product_code']) with ordinality as x(k, n)
  where (x.k <> 'flock_closeup' or coalesce(p_flock ->> 'source', '') not in ('', 'Keine', 'none'))
    and coalesce(p_photos -> x.k, 'null'::jsonb) = 'null'::jsonb;
$$;

create or replace function private.custom_items_sale_photos()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_missing text[];
begin
  if new.visibility not in ('offers', 'forsale') then return new; end if;
  if tg_op = 'UPDATE' and old.visibility in ('offers', 'forsale') then return new; end if;
  v_missing := private.sale_photos_missing(new.photos, new.flock);
  if cardinality(v_missing) > 0 then
    raise exception 'sale_photos_missing'
      using errcode = 'check_violation', detail = array_to_string(v_missing, ','), hint = 'Add these photos before selling the shirt.';
  end if;
  return new;
end $$;

drop trigger if exists custom_items_sale_photos on public.custom_items;
create trigger custom_items_sale_photos before insert or update of visibility on public.custom_items
  for each row execute function private.custom_items_sale_photos();
