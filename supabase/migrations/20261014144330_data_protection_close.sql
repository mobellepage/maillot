-- Data protection, phase 2 (the app reads through the throttled functions
-- from data_protection_reads): close the direct table reads, so nobody can
-- download the catalogue, market values, value history, comparables, the
-- order book or the kit library in bulk through the API.
drop policy if exists catalog_public_read on public.catalog_shirts;
drop policy if exists "valuations are public" on public.shirt_valuations;
drop policy if exists "value history is public" on public.shirt_value_history;
drop policy if exists "market comps are public" on public.market_comps;
drop policy if exists kit_clubs_read on public.kit_clubs;
drop policy if exists kits_read_approved on public.kits;
revoke select on public.catalog_shirts, public.shirt_valuations, public.shirt_value_history, public.market_comps, public.kit_clubs, public.kits from anon;

-- Listings and bids: members read their own; the order book of one shirt
-- comes from open_asks / open_bids.
drop policy if exists asks_select_all on public.asks;
drop policy if exists bids_select_all on public.bids;
create policy asks_select_own on public.asks for select to authenticated using (user_id = (select auth.uid()));
create policy bids_select_own on public.bids for select to authenticated using (user_id = (select auth.uid()));
revoke select on public.asks, public.bids from anon;
