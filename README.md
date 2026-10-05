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

## Architecture

```
src/
  main.tsx            providers + router
  app/                shell: router (lazy routes), layout, header, nav, footer, auth guard
  lib/                session, preferences (currency/FX, language), toast, query client, page meta
  ui/                 design system: tokens.ts + ui.css, Button, Card, Badge, Dialog, fields, ShirtCard…
  features/
    catalog/          pure catalogue logic (search, filters, value) + ShirtGrid
    home/ browse/     pages
    market/           product page, live order book, buy/bid dialog
    sell/             four-step listing flow
    vault/            collection, item page, add-shirt wizard, public share page
    orders/           escrow actions and dialogs
    admin/ auth/ trust/ notifications/ watchlist/
  utils/db/           the only code that talks to Supabase, split by domain
  types/              generated schema types + domain types
```

- Server state lives in TanStack Query (one query key per resource); there is
  no global app-state object.
- URLs are the state for navigation and browsing (`/market?league=Serie+A&sort=gain`).
- Every colour, radius and font comes from `src/ui/tokens.ts` / `ui.css`.
- Strict TypeScript (`noUncheckedIndexedAccess` included); `npm run typecheck` runs in CI.
- No source file over 300 lines (generated types excepted).

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

### Shipping and authentication

Sellers ship to the Zürich centre (prepaid Swiss Post label from the
`shipping-label` function, or any tracked carrier). Admins record the
inspection in *Admin → Inspections*: a pass forwards the shirt (outbound
label to the address Stripe Checkout collected, kept in `order_addresses`
which sellers can't read) and starts the buyer's confirmation window; a fail
refunds the buyer. Labels need `SWISSPOST_CLIENT_ID`, `SWISSPOST_CLIENT_SECRET`,
`SWISSPOST_FRANKING_LICENSE` and `AUTH_CENTRE_ADDRESS`
(`{"name1","street","zip","city"}`) — verify the request against the current
Swiss Post Digital Commerce API docs when you get credentials.

### Certificates

A pass at the centre issues a certificate (`MLT-XXXX-XXXX-XXXX`, ~59 bits)
via trigger. The tag on the shirt carries its QR code (→ `/verify/<code>`)
and optionally an NFC chip whose UID admins bind in *Admin → Certificates*;
a chip that appends `?tag=<UID>` to the URL is checked against it.
`verify_certificate()` is public and returns shirt, size, date and checklist
version — never buyer or seller. Revocations show publicly.

### Order deadlines (pg_cron)

`run_order_lifecycle()` runs every 5 minutes (`cron.job` "order-lifecycle"):
unpaid orders expire after 24 h, unshipped paid orders are refunded after
5 days, and authenticated, forwarded orders without a dispute release after 14 days — each
with one reminder first. Expired bids are closed and lost settlement calls
retried. The windows are in `public.order_policy()` and mirrored in
`src/features/orders/policy.ts` (a pgTAP test keeps them in sync).

### Payouts (Stripe Connect)

Buyers pay the platform; money is held until the buyer confirms receipt
(or an admin resolves a dispute). Then a DB trigger marks the order
`payout_status = pending | refund_pending` and calls the `settle` function,
which transfers the seller's share (amount − commission) to their Express
account, or refunds the buyer. Each transfer/refund uses the order id as the
idempotency key, so retries are safe.

1. Enable **Connect** in the Stripe dashboard (Express accounts, country CH).
2. Add a webhook endpoint → `…/functions/v1/stripe-webhook` with
   `checkout.session.completed` and `checkout.session.async_payment_succeeded`,
   plus a **Connected accounts** endpoint for `account.updated` (same URL,
   same signing secret, or set it as `STRIPE_WEBHOOK_SECRET`).
3. Sellers set up payouts from *My collection → Payouts*. Payouts released
   before onboarding wait as `awaiting_onboarding` and are sent automatically
   once Stripe reports `payouts_enabled`.

## Languages (EN / DE / FR)

All visitor-facing text lives in `src/i18n/{en,de,fr}.ts`. English is the
source and is bundled; German and French load on demand. `de`/`fr` are typed
against the English keys, so a missing translation fails `npm run typecheck`,
and `src/__tests__/i18n.test.js` checks placeholders and that every `t('…')`
key exists. Use `t('key', { name })` for text, `tp('base', n)` for plurals
(`base.one` / `base.other`) and `label(kind, value)` for stored values
(catalogue types, add-shirt options). Server notifications are localised on
display by their known titles (`features/notifications/localize.ts`).

Deliberately English-only for now: the admin tools (internal), the developer
API docs, and the terms/privacy/imprint texts — those show a note in DE/FR
that the binding translation follows after legal review.

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
