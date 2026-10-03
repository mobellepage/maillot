-- init_maillot_schema
-- Profiles ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

create function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, handle) values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer set search_path = public;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Custom (self-added) vault items ----------------------------------------
create table public.custom_items (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  catalog_id text,
  proposed boolean default false,
  proposed_club text, proposed_season text, proposed_variant text,
  version text, size_group text, size text, sleeve text,
  flock jsonb default '{}', patches jsonb default '[]', signature jsonb default '{}',
  tags_attached boolean default false,
  condition jsonb default '{}', provenance text default '',
  photos jsonb default '{}',
  precheck jsonb, verification jsonb not null default '{"level":"self","status":"none","reason":"","reviewId":null}',
  visibility text not null default 'private', sale_price text default '',
  valuation jsonb, initial_valuation jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.custom_items enable row level security;
create policy "custom_items_owner_all" on public.custom_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "custom_items_admin_select" on public.custom_items for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Human review queue (expert verification) --------------------------------
create table public.review_queue (
  id text primary key,
  custom_item_id text references public.custom_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  status text not null default 'pending', -- pending|in_review|approved|rejected
  reason text default '',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id)
);
alter table public.review_queue enable row level security;
create policy "review_queue_owner_select" on public.review_queue for select using (auth.uid() = user_id);
create policy "review_queue_owner_insert" on public.review_queue for insert with check (auth.uid() = user_id);
create policy "review_queue_admin_all" on public.review_queue for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Watchlist ----------------------------------------------------------------
create table public.watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  shirt_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, shirt_id)
);
alter table public.watchlist enable row level security;
create policy "watchlist_owner_all" on public.watchlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Real order book: bids & asks ---------------------------------------------
create table public.bids (
  id uuid primary key default gen_random_uuid(),
  shirt_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  size text not null,
  amount numeric not null,
  status text not null default 'open', -- open|matched|cancelled|expired
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.bids enable row level security;
create policy "bids_select_all" on public.bids for select using (true);
create policy "bids_owner_write" on public.bids for insert with check (auth.uid() = user_id);
create policy "bids_owner_update" on public.bids for update using (auth.uid() = user_id);

create table public.asks (
  id uuid primary key default gen_random_uuid(),
  shirt_id text,
  custom_item_id text references public.custom_items(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  size text not null,
  amount numeric not null,
  status text not null default 'open', -- open|matched|cancelled
  created_at timestamptz not null default now()
);
alter table public.asks enable row level security;
create policy "asks_select_all" on public.asks for select using (true);
create policy "asks_owner_write" on public.asks for insert with check (auth.uid() = user_id);
create policy "asks_owner_update" on public.asks for update using (auth.uid() = user_id);

-- Orders / escrow -----------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references auth.users(id),
  seller_id uuid references auth.users(id),
  shirt_id text,
  custom_item_id text references public.custom_items(id),
  bid_id uuid references public.bids(id),
  ask_id uuid references public.asks(id),
  size text,
  amount numeric not null,
  auth_fee numeric not null default 0,
  shipping_fee numeric not null default 0,
  commission numeric not null default 0,
  status text not null default 'pending_payment',
  -- pending_payment -> paid -> authenticating -> shipped -> completed
  -- or -> refunded / disputed / cancelled
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "orders_party_select" on public.orders for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "orders_party_insert" on public.orders for insert with check (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "orders_party_update" on public.orders for update using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Disputes --------------------------------------------------------------
create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  opened_by uuid references auth.users(id),
  reason text not null,
  status text not null default 'open', -- open|under_review|resolved_refund|resolved_release|closed
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.disputes enable row level security;
create policy "disputes_party_select" on public.disputes for select using (exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())));
create policy "disputes_party_insert" on public.disputes for insert with check (exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())));
create policy "disputes_admin_update" on public.disputes for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Notifications -----------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, -- bid_matched|price_alert|restock|order_update|dispute_update
  title text not null,
  body text,
  data jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "notifications_owner_all" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Behavior events (for the recommendation/trending engine) -----------------
create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  shirt_id text not null,
  type text not null, -- view|watch|unwatch|bid|buy
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
create policy "events_insert_any" on public.events for insert with check (true);
create policy "events_select_own" on public.events for select using (auth.uid() = user_id);

-- Real order-book matching engine ------------------------------------------
-- Replaces the old hardcoded "highest bid = ask*0.88" placeholder: a genuine
-- price-time-priority match between the best open bid and best open ask for
-- the same shirt+size, executed transactionally whenever a new bid/ask is placed.
create function public.match_order_book(p_shirt_id text, p_size text) returns void as $$
declare
  best_bid public.bids;
  best_ask public.asks;
  v_commission numeric;
begin
  select * into best_bid from public.bids
    where shirt_id = p_shirt_id and size = p_size and status = 'open'
    order by amount desc, created_at asc limit 1;
  select * into best_ask from public.asks
    where shirt_id = p_shirt_id and size = p_size and status = 'open'
    order by amount asc, created_at asc limit 1;

  if best_bid.id is null or best_ask.id is null then return; end if;
  if best_bid.amount < best_ask.amount then return; end if;

  update public.bids set status = 'matched' where id = best_bid.id;
  update public.asks set status = 'matched' where id = best_ask.id;

  v_commission := round(best_ask.amount * 0.08);
  insert into public.orders (buyer_id, seller_id, shirt_id, bid_id, ask_id, size, amount, auth_fee, shipping_fee, commission, status)
    values (best_bid.user_id, best_ask.user_id, p_shirt_id, best_bid.id, best_ask.id, p_size, best_ask.amount, 9, 12, v_commission, 'pending_payment');

  insert into public.notifications (user_id, type, title, body, data)
    values
      (best_bid.user_id, 'bid_matched', 'Your bid was matched', 'Your bid on ' || p_shirt_id || ' (' || p_size || ') matched at ' || best_ask.amount, jsonb_build_object('shirt_id', p_shirt_id, 'size', p_size, 'amount', best_ask.amount)),
      (best_ask.user_id, 'bid_matched', 'Your ask was matched', 'Your ask on ' || p_shirt_id || ' (' || p_size || ') matched at ' || best_ask.amount, jsonb_build_object('shirt_id', p_shirt_id, 'size', p_size, 'amount', best_ask.amount));
end;
$$ language plpgsql security definer set search_path = public;

create function public.on_bid_or_ask_insert() returns trigger as $$
begin
  perform public.match_order_book(new.shirt_id, new.size);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger bids_after_insert after insert on public.bids
  for each row execute procedure public.on_bid_or_ask_insert();
create trigger asks_after_insert after insert on public.asks
  for each row execute procedure public.on_bid_or_ask_insert();
