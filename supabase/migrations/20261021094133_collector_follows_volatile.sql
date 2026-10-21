-- collector_follows writes to the throttle; as STABLE the API ran it in a
-- read-only transaction and it failed (empty follower lists in the app).
alter function public.collector_follows(text) volatile;
