-- library_search counts each call for the rate limit (private.throttle
-- writes), so it can't be STABLE: the API runs stable functions read-only.
alter function public.library_search(text, int, text, text) volatile;
