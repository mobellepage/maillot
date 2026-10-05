import type { Tables } from '../../types/database.ts';

export type Bid = Tables<'bids'>;
export type Ask = Tables<'asks'>;
export type Order = Tables<'orders'>;
export type Dispute = Tables<'disputes'>;
export type Notification = Tables<'notifications'>;
export type ApiKeyRow = Pick<Tables<'api_keys'>, 'id' | 'label' | 'key_prefix' | 'created_at' | 'revoked_at' | 'last_used_at'>;
export type OrderBook = { bids: Bid[]; asks: Ask[] };
export type OrderRef = Pick<Order, 'id' | 'amount' | 'status'>;

