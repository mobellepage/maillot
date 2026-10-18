-- The players a model is known for (Zidane for France 1998): model data,
-- used only so a search for the player finds the shirt. Not a print — a
-- print belongs to one exemplar.
alter table public.catalog_shirts add column if not exists players text[] not null default '{}';
update public.catalog_shirts c set players = v.p
  from (values ('ger-26', array['Wirtz']), ('sui-26', array['Xhaka']), ('acm-0607', array['Kaká']), ('mia-26', array['Messi']),
               ('fcb-2627', array['Yamal']), ('nap-8788', array['Maradona']), ('ned-88', array['van Basten']), ('juv-9697', array['Del Piero']),
               ('liv-2526', array['Salah']), ('rma-2627', array['Mbappé']), ('mun-0708', array['Ronaldo']), ('bay-2627', array['Kane']),
               ('bra-70', array['Pelé']), ('fra-98', array['Zidane']), ('psg-2526', array['Dembélé']), ('bas-2526', array['Shaqiri']),
               ('ajx-95', array['Kluivert']), ('boc-81', array['Maradona'])) as v(id, p)
 where c.id = v.id;
