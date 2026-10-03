-- lock_down_definer_functions
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.match_order_book(text, text) from anon, authenticated;
revoke execute on function public.on_bid_or_ask_insert() from anon, authenticated;
