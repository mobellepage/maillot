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

## Observability

- **Browser errors** (uncaught errors, failed queries/mutations, page
  crashes) are reported to `public.client_errors` via `report_client_error`
  (`src/lib/monitoring.ts`): capped per page and per fingerprint, tagged with
  the release (commit) and page, network blips and extensions filtered out.
- **Health check** (`run_health_check`, pg_cron every 15 min) alerts every
  admin — in-app and by email through the notification relay — on error
  spikes, failed or stuck payouts/refunds and overdue inspections, at most
  once per problem per 6 hours.
- **Admin → Health** shows those numbers and the grouped error reports.
- Edge-function logs are in the Supabase dashboard (Functions → Logs).

## Performance

- **Prerendered public pages.** `npm run build` also renders the public routes
  (home, market, every shirt, trust and legal pages — `src/entry-server.tsx`)
  to static HTML via `scripts/prerender.mjs`, with per-page title, description
  and Open Graph tags, plus `sitemap.xml` and `robots.txt` (`SITE_URL`, else the Vercel production URL).
  Those pages inline their CSS and load JS at low priority; React takes over
  without a visible change. Signed-in routes fall back to the empty shell
  `app.html` (also the service worker's navigation fallback).
- **Supabase loads on demand** (`await sb()`), so it isn't in the first download.
  Initial JS is ~148 kB gzipped.
- **Subset fonts** in `src/assets/fonts/` (`scripts/subset-fonts.py`): 83 kB
  instead of 130 kB.
- Lighthouse (mobile, slow 4G, devtools throttling) on the production build:
  Performance 100 on /, /market, /shirt/:id and /authentication; FCP 0.7 s,
  LCP 0.8–1.1 s.

## Photo recognition

`identify-shirt` (edge function) sends the member's front and inner-label photos
to Claude (`claude-opus-5-5`, structured JSON output, server-side refusal
fallback) together with the catalogue, and returns club, season, kit, article
code, print, edition, visible condition and authenticity notes. The add-shirt
wizard and the sell flow prefill from it (`src/features/identify/prefill.ts`) —
only confident matches (≥ 0.6) pick a catalogue shirt, and nothing the member
already chose is overwritten. Notes it raises feed the pre-check.

- Secret: `ANTHROPIC_API_KEY` (until it's set the flows fall back to search).
- 20 recognitions per member per hour, 2,000 overall (`consume_identify_quota`).
- Photos aren't stored by the function; results go to `shirt_identifications`.

## Auth emails

Sign-up sends people to `/welcome`, password resets to `/reset-password`
(`emailRedirectTo` / `redirectTo` = this site, or the public site from the iOS
app). Branded templates in `supabase/templates/` pick the reader's language from
user metadata (`lang`, stored at sign-up), English otherwise; `config.toml`
wires them up locally. In production (Supabase dashboard):

1. **Authentication → URL Configuration**: Site URL `https://maillot-two.vercel.app`;
   Redirect URLs `https://maillot-two.vercel.app/**` and `http://localhost:5173/**`.
2. **Authentication → Emails → SMTP**: a custom sender (e.g. Resend:
   `smtp.resend.com`, port 465, user `resend`, password = Resend API key,
   sender name `MAILLOT`, a verified domain). Supabase's built-in sender is for
   testing only — it's rate-limited, shows "Supabase Auth" and doesn't reach
   ordinary sign-ups.
3. **Authentication → Emails → Templates**: for Confirm sign up, Reset password
   and Change email address paste the subject from `config.toml` and the HTML
   from the matching file.

## Market value

Every catalogue shirt has a market value from `refresh_shirt_valuation`
(`shirt_valuations`, public): MAILLOT sales weigh most (recent ones more),
then comparable offers for this exact shirt, then related shirts; the
catalogue index anchors it. Prices are normalised to a very good replica,
asking prices discounted 15 %, outliers dropped; value = weighted median,
range = weighted 25th–75th percentile. Recomputed nightly, after each comps
run and whenever an order is released. The product page shows value, range,
confidence and the comparables (`ValuationCard`).

**Comparables** — `fetch-comps` (daily via pg_cron, at most once per 20 h)
reads eBay's Browse API (`EBAY_DE`, `EBAY_GB`, `EBAY_FR`, `EBAY_IT`; set
`EBAY_MARKETPLACES` to change), keeps titles that name the club (with its
aliases) and season and aren't kids' sizes or accessories, then lets Claude
sort them into exact / related / unrelated. Secrets: `EBAY_CLIENT_ID`,
`EBAY_CLIENT_SECRET` (and `ANTHROPIC_API_KEY` for the classification).
Sold prices (eBay Marketplace Insights) need eBay's approval; the table and
valuation already accept `kind = 'sold'`.

## Collection as a portfolio

`shirt_value_history` keeps each shirt's market value per day (written by a
trigger whenever `shirt_valuations` changes). The collection shows how it moved
in the last 7 days and its biggest movers (`features/vault/moves.ts`); every
Monday `notify_collection_movers` tells owners and watchers about shirts that
moved 10 % or more (in-app and by email, once per shirt per week).
"Share as picture" draws a 1080×1350 card (total value, count, top three) in
the browser and hands it to the share sheet.

## Apple Wallet certificates

`wallet-pass` turns a certificate (`/verify/MLT-…`) into a signed `.pkpass`:
shirt, club, season, size, inspection date and a QR code back to the public
certificate page; a revoked certificate's pass is shown void. The button
("Add to Apple Wallet") appears on Apple devices and in the iOS app once the
function reports `configured` (`?probe=1`).

Secrets (Apple Developer → Certificates → Pass Type IDs):
`PASS_TYPE_ID` (e.g. `pass.ch.maillot.certificate`), `APPLE_TEAM_ID`,
`PASS_CERT_PEM`, `PASS_KEY_PEM` (+ `PASS_KEY_PASSPHRASE` if encrypted),
`APPLE_WWDR_PEM` (Apple's WWDR intermediate). The PKCS#7 signing is
unit-tested end to end, verified with OpenSSL against a test CA.

## iOS app

The App Store app is this web app in a native shell ([Capacitor](https://capacitorjs.com), `ios/`).
Native bits live behind `src/lib/native.ts` and load only inside the app.

```
npm run ios:sync    # build the app bundle (vite --mode native, no service worker) and copy it into ios/
npm run ios:open    # open ios/App in Xcode → pick your team under Signing → Run / Archive
```

- Bundle id `ch.maillot.app` (capacitor.config.ts) — final once the first build is uploaded.
- Stripe checkout and payout onboarding open in an in-app browser sheet; Stripe
  returns to `<site>/return`, which hands over to the app via `maillot://…`
  (`appPathFromUrl` only accepts plain in-app paths).
- Account deletion (App Store guideline 5.1.1(v)): `/account` → edge function
  `delete-account`. Refused while an order is open; completed orders stay for the
  books with buyer/seller set to null.
- Icon and launch screen come from `npm run brand`.

## Brand assets

`npm run build && npm run brand` regenerates every raster asset from one
source — the mark in `scripts/brand-assets.mjs` plus the app's own fonts,
styles and shirt illustrations:

- `public/favicon.svg`, `public/icons/` (192/512, maskable, Apple touch icon)
- `public/og/default.jpg` and one link-preview image per prerendered shirt
  (`public/og/shirt/<id>.jpg`); `scripts/prerender.mjs` points each page's
  `og:image` at it (shirts without one use the default) and adds `canonical`.

Notification emails (`supabase/functions/send-notification/email.ts`) use the
same mark and accent, link straight to the order or shirt, and include a
plain-text part; `APP_URL` must be set for links and the logo.

## Accessibility

Target: WCAG 2.2 AA. `e2e/smoke/a11y.spec.js` runs axe-core on every public
page (desktop + mobile) and on the bid dialog; `e2e/backend/a11y.spec.js` does
the same for signed-in pages. A violation fails CI with the rule and element.

What axe can't see is built in and tested by hand-written e2e checks:
- a translated skip link, and after every in-app navigation the new page title
  is announced (`RouteAnnouncer`) and focus moves to `<main>`;
- dialogs trap focus, close on Escape and return focus to their opener;
- colour tokens meet 4.5:1 on every surface (`--faint` is the floor), links in
  running text are underlined, sideways-scrolling regions are focusable;
- `prefers-reduced-motion` turns animations off.

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

The new admin then opens `/admin` and enrols an authenticator app (TOTP).
Admin rights only apply to sessions verified with that second factor (`aal2`).

## Security model (summary)

- Clients can't write `orders`, `disputes` or `notifications`; every escrow
  transition is a `SECURITY DEFINER` RPC that checks role + current status.
- `profiles.is_admin` is not client-writable.
- An item can only claim expert verification if a matching approved review exists.
- The matching engine forbids self-trades and row-locks both sides.
- **Admin 2FA:** `is_admin()` is true only for an `aal2` session, so a stolen
  password alone never reaches admin RPCs or tables.
- **Rate limits:** `private.hit()` throttles bids, asks, items, review requests,
  disputes, seller reviews, handle checks and client error reports per user
  (errcode `P0429`). Supabase Auth limits sign-ins/sign-ups (`config.toml`).
- **Captcha:** sign-in and sign-up send a Cloudflare Turnstile token when
  `VITE_TURNSTILE_SITE_KEY` is set; enable Turnstile under Auth → Bot protection
  with the matching secret.
- **Audit log:** admin decisions, role changes, dispute outcomes, certificate
  changes and API keys are written to `audit_log` (admin read-only, shown on `/admin`).
- **Headers:** `vercel.json` sets a strict CSP (inline script allowed by hash —
  a unit test fails if the hash drifts), HSTS, `nosniff`, `frame-ancestors 'none'`.
- **Dependencies:** CI fails on high-severity `npm audit` findings in runtime
  packages; Dependabot and CodeQL run weekly.

## Hosting

Production: https://maillot-two.vercel.app — Vercel project `maillot`, every
push to `main` deploys. Build env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
(publishable key); optional `SITE_URL` once a custom domain is attached.

Single-page app with path routing (`/shirt/:id`, `/orders`, …): the host must
serve `app.html` for unknown paths (prerendered pages are served as-is).
`vercel.json` does this on Vercel.
