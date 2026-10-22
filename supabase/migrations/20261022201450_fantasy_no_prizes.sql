-- No prizes in Fantasy (Mohamed, 22 Oct 2026): leagues, cups, divisions and
-- badges are the game's honours. The pool and the winners' records go; the
-- cup's closing still calls the award step, which now does nothing.
create or replace function private.fantasy_award_prizes(p_cup int)
returns void language sql set search_path = '' as $$ select null $$;
drop function if exists public.fantasy_my_prizes(), public.fantasy_claim_prize(uuid, jsonb), public.fantasy_prize_received(uuid),
  public.fantasy_admin_prizes(int), public.fantasy_admin_prize_update(uuid, text, uuid);
drop table if exists public.fantasy_prizes, public.fantasy_prize_pool cascade;
delete from public.notifications where type = 'fantasy_prize';
