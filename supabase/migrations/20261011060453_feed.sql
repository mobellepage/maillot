-- The feed: a random mix of live listings (with their photos and who sells
-- them) for the scroll-and-like page. The app interleaves sellers, weighs in
-- what the member likes and fills up with catalogue shirts.
create or replace function public.feed_listings(p_limit int default 150)
returns table (ask_id uuid, shirt_id text, size text, amount numeric, condition text, edition text, player_print text,
               photos jsonb, handle text, dealer boolean, created_at timestamptz)
language sql volatile security definer set search_path = '' as $$
  select a.id, a.shirt_id, a.size, a.amount, a.condition, a.edition, a.player_print, a.photos,
         p.handle, p.dealer_verified_at is not null, a.created_at
    from public.asks a
    join public.profiles p on p.id = a.user_id
   where a.status = 'open' and a.shirt_id is not null
   order by random()
   limit least(greatest(coalesce(p_limit, 150), 1), 300)
$$;
revoke execute on function public.feed_listings(int) from public;
grant execute on function public.feed_listings(int) to anon, authenticated;
