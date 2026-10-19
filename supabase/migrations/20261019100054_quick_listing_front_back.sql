-- Quick listing (Mohamed, 2026-10-19): a shirt can be put up for sale with
-- the front and the back; it then carries the badge "self-reported". The
-- badge, inner label and print make it "pre-checked" once the pre-check has
-- run (verification level), not a condition for selling.
create or replace function private.custom_items_sale_photos()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_missing text[];
begin
  if new.visibility <> 'forsale' then return new; end if;
  if tg_op = 'UPDATE' and old.visibility = 'forsale' then return new; end if;
  select coalesce(array_agg(k), '{}') into v_missing
    from unnest(array['front', 'back']) k
   where coalesce(new.photos -> k, 'null'::jsonb) = 'null'::jsonb;
  if cardinality(v_missing) > 0 then
    raise exception 'sale_photos_missing'
      using errcode = 'check_violation', detail = array_to_string(v_missing, ','), hint = 'Add the front and the back before selling the shirt.';
  end if;
  return new;
end $$;
