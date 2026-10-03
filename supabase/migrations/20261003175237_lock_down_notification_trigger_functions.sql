-- lock_down_notification_trigger_functions
-- These are trigger-only functions (they reference NEW/OLD and have no
-- meaningful standalone behavior), but revoke direct RPC execution anyway so
-- they don't show up as publicly callable SECURITY DEFINER functions.
revoke execute on function public.notify_order_status_change() from anon, authenticated;
revoke execute on function public.notify_dispute_opened() from anon, authenticated;
revoke execute on function public.relay_notification() from anon, authenticated;
