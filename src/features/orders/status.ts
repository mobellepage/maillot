import type { OrderStatus } from '../../types/domain.ts';
import type { Tone } from '../../ui/index.ts';

export const ORDER_TONE: Record<OrderStatus, Tone> = {
  pending_payment: 'warn',
  paid_escrow: 'info',
  shipped: 'info',
  delivered: 'accent',
  released: 'accent',
  disputed: 'neg',
  cancelled: 'neutral',
  refunded: 'neutral'
};
