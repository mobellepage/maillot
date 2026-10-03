# MAILLOT

The catalogue, marketplace and price index for football shirts.

React 19 + Vite frontend, Supabase (Postgres, Auth, Edge Functions) backend,
Stripe Checkout (card + TWINT) for escrowed payments.

## Quick start

```bash
npm install
cp .env.example .env.local   # point at the hosted project or local stack
npm run dev
```

## Tests

```bash
npm test                  # unit tests (Vitest)
npm run test:e2e          # browser smoke tests (Playwright, offline backend)
npm run test:db           # database tests (pgTAP) — needs `npm run db:start`
E2E_SUPABASE_URL=http://127.0.0.1:54321 E2E_SUPABASE_ANON_KEY=<anon> npx playwright test --project=backend
```

CI (`.github/workflows/ci.yml`) runs all of it on every push and pull
request: lint, unit tests, build and smoke e2e; then it builds the database
from scratch with the Supabase CLI, runs the pgTAP suite and the backend e2e
flow against it.

## Database & backend

Everything that runs in Supabase lives in [`supabase/`](supabase) and is the
source of truth — never change the production schema by hand.

| Path | What |
| --- | --- |
| `supabase/migrations/` | Every schema change, in order (tables, RLS, RPCs, triggers) |
| `supabase/functions/` | Edge functions: `checkout`, `stripe-webhook`, `send-notification`, `price-index` |
| `supabase/seed.sql` | Local-only test accounts and sample listings |
| `supabase/config.toml` | Local stack + per-function `verify_jwt` settings |

### Local stack (needs Docker)

```bash
npm run db:start     # Postgres, Auth, Studio on :54321–54323
npm run db:reset     # rebuild from migrations + seed
npm run functions:serve
```

Local test accounts (password `maillot-dev-pw`): `admin@maillot.test`,
`seller@maillot.test`, `buyer@maillot.test`.

### Changing the schema

```bash
npm run db:diff -- <change_name>   # writes supabase/migrations/<ts>_<change_name>.sql
npm run db:reset                   # prove it applies cleanly from zero
npm run db:push                    # apply to the linked project
```

Link once with `npx supabase link --project-ref vuclwradmphgasiactsa`.

### Edge functions

```bash
npm run functions:deploy                       # all functions, honouring config.toml
npx supabase secrets set STRIPE_SECRET_KEY=... # see .env.example for the full list
```

All payment/email functions are inert (respond `configured: false`) until
their secrets are set.

## Environments

Environment-specific values live in `private.app_settings`, never in code:

| key | production | local |
| --- | --- | --- |
| `functions_url` | `https://vuclwradmphgasiactsa.supabase.co/functions/v1` | `http://kong:8000/functions/v1` (seed) |

Set on a new environment with:

```sql
insert into private.app_settings (key, value) values ('functions_url', 'https://<ref>.supabase.co/functions/v1')
on conflict (key) do update set value = excluded.value;
```

### Making someone an admin

```sql
update public.profiles set is_admin = true where id = '<auth user id>';
```

## Security model (summary)

- Clients can't write `orders`, `disputes` or `notifications`; every escrow
  transition is a `SECURITY DEFINER` RPC that checks role + current status.
- `profiles.is_admin` is not client-writable.
- An item can only claim expert verification if a matching approved review exists.
- The matching engine forbids self-trades and row-locks both sides.

## Hosting

Single-page app with path routing (`/shirt/:id`, `/orders`, …): the host must
serve `index.html` for unknown paths. `vercel.json` does this on Vercel.
