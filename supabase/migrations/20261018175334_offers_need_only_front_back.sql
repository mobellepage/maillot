-- Offers work with the collection's front and back; only putting a shirt up
-- for sale at a price needs the badge, inner label and print as well.
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
  v_missing := private.sale_photos_missing(new.photos, new.flock);
  if cardinality(v_missing) > 0 then
    raise exception 'sale_photos_missing'
      using errcode = 'check_violation', detail = array_to_string(v_missing, ','), hint = 'Add these photos before selling the shirt.';
  end if;
  return new;
end $$;
