-- asks_listing_details
alter table public.asks
  add column if not exists condition text,
  add column if not exists edition text,
  add column if not exists player_print text;
alter table public.asks add constraint asks_condition_len check (char_length(coalesce(condition, '')) <= 40) not valid;
alter table public.asks add constraint asks_edition_len check (char_length(coalesce(edition, '')) <= 40) not valid;
alter table public.asks add constraint asks_player_len check (char_length(coalesce(player_print, '')) <= 60) not valid;

-- An ask the seller just placed may fill an existing bid immediately; let
-- them find the resulting order the same way buyers do for bids.
create index if not exists orders_ask_lookup_idx on public.orders (ask_id) include (id, amount, status);
