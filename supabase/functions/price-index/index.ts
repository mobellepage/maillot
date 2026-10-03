// price-index: licensable, API-key-gated price-index data product.
// Returns aggregated market data (completed sales + current order book) for a
// given shirt_id, computed from the existing orders/asks/bids tables.
//
// Auth: NOT a Supabase user JWT. Callers authenticate with an API key issued
// via the admin-only create_api_key() RPC, passed as:
//   Authorization: Bearer mlt_xxxxxxxx.<64 hex chars>
// or
//   x-api-key: mlt_xxxxxxxx.<64 hex chars>
//
// The key is never stored in plaintext — only a sha256 hex digest is kept in
// public.api_keys.key_hash (see migration create_api_keys_and_price_index).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  })
}

async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  const url = new URL(req.url)
  const shirtId = url.searchParams.get('shirt_id')
  if (!shirtId) return json({ error: 'missing shirt_id query param' }, 400)

  const authHeader = req.headers.get('authorization') || ''
  const rawKey = req.headers.get('x-api-key') || (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '')
  if (!rawKey) return json({ error: 'missing API key (use x-api-key header or Authorization: Bearer)' }, 401)

  const dotIdx = rawKey.indexOf('.')
  const secret = dotIdx >= 0 ? rawKey.slice(dotIdx + 1) : rawKey
  const keyHash = await sha256Hex(secret)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: apiKey, error: keyErr } = await admin
    .from('api_keys')
    .select('id, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (keyErr) return json({ error: 'lookup failed' }, 500)
  if (!apiKey || apiKey.revoked_at) return json({ error: 'invalid or revoked API key' }, 401)

  admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKey.id).then(() => {})

  const [{ data: sales, error: salesErr }, { data: bids, error: bidsErr }, { data: asks, error: asksErr }] = await Promise.all([
    admin
      .from('orders')
      .select('amount, size, released_at')
      .eq('shirt_id', shirtId)
      .eq('status', 'released')
      .order('released_at', { ascending: false })
      .limit(200),
    admin.from('bids').select('amount, size').eq('shirt_id', shirtId).eq('status', 'open').order('amount', { ascending: false }),
    admin.from('asks').select('amount, size').eq('shirt_id', shirtId).eq('status', 'open').order('amount', { ascending: true })
  ])

  if (salesErr || bidsErr || asksErr) return json({ error: 'query failed' }, 500)

  const amounts = (sales || []).map((s) => Number(s.amount))
  const salesCount = amounts.length
  const avg = salesCount ? amounts.reduce((a, b) => a + b, 0) / salesCount : null
  const min = salesCount ? Math.min(...amounts) : null
  const max = salesCount ? Math.max(...amounts) : null
  const lastSale = (sales || [])[0] || null

  return json({
    shirt_id: shirtId,
    sales: { count: salesCount, avg, min, max, last_price: lastSale ? Number(lastSale.amount) : null, last_sold_at: lastSale ? lastSale.released_at : null },
    order_book: {
      best_bid: bids && bids.length ? Number(bids[0].amount) : null,
      best_ask: asks && asks.length ? Number(asks[0].amount) : null,
      open_bids: bids ? bids.length : 0,
      open_asks: asks ? asks.length : 0
    },
    generated_at: new Date().toISOString()
  })
})
