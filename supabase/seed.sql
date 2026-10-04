-- Local development seed. Runs on `supabase db reset` — never in production.
--
-- Test accounts (local only):
--   admin@maillot.test   / maillot-dev-pw   (is_admin)
--   seller@maillot.test  / maillot-dev-pw
--   buyer@maillot.test   / maillot-dev-pw

-- Local edge functions are reachable from the db container via Kong.
insert into private.app_settings (key, value)
values ('functions_url', 'http://kong:8000/functions/v1')
on conflict (key) do update set value = excluded.value;

-- GoTrue can't sign in users whose token columns are NULL, so set them to ''.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin@maillot.test',  extensions.crypt('maillot-dev-pw', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'seller@maillot.test', extensions.crypt('maillot-dev-pw', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'buyer@maillot.test',  extensions.crypt('maillot-dev-pw', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now()
from auth.users u where u.email like '%@maillot.test';

-- profiles rows are created by the on_auth_user_created trigger.
update public.profiles set is_admin = true where id = '11111111-1111-1111-1111-111111111111';

-- Some liquidity so the detail page's live order book isn't empty locally.
insert into public.asks (user_id, shirt_id, size, amount, condition, edition) values
  ('22222222-2222-2222-2222-222222222222', 'ger-26',   'M', 139, 'New with tags', 'Authentic'),
  ('22222222-2222-2222-2222-222222222222', 'ger-26',   'L', 149, 'New with tags', 'Authentic'),
  ('22222222-2222-2222-2222-222222222222', 'juv-9697', 'L', 235, 'Very good',     'Replica'),
  ('22222222-2222-2222-2222-222222222222', 'rma-2627', 'M', 118, 'New with tags', 'Authentic'),
  ('22222222-2222-2222-2222-222222222222', 'bra-70',   'M', 540, 'Good',          'Replica');

insert into public.bids (user_id, shirt_id, size, amount, expires_at) values
  ('33333333-3333-3333-3333-333333333333', 'ger-26',   'M', 120, now() + interval '30 days'),
  ('33333333-3333-3333-3333-333333333333', 'juv-9697', 'L', 210, now() + interval '30 days'),
  ('33333333-3333-3333-3333-333333333333', 'fra-98',   'M', 250, now() + interval '30 days');
