export const ROLES = ['USER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUSES = [
  'PENDING',
  'PAYMENT_FAILED',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
  'REFUNDED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ['CREATED', 'PAID', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Returns can be requested this many days after delivery (SPEC §2.4). */
export const RETURN_WINDOW_DAYS = 7;

/**
 * Transitions an admin may make (SPEC §3.1). PENDING → CONFIRMED / PAYMENT_FAILED are
 * made only by the payment system, and PAYMENT_FAILED → PENDING only by a customer retry.
 */
export const ADMIN_ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING: [],
  PAYMENT_FAILED: [],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  CANCELLED: [],
  RETURN_REQUESTED: ['RETURNED'],
  RETURNED: ['REFUNDED'],
  REFUNDED: [],
};

export function canAdminTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ADMIN_ORDER_STATUS_TRANSITIONS[from].includes(to);
}

/** Max quantity of a single product per cart line. */
export const MAX_CART_ITEM_QUANTITY = 10;
/** Max images per product. */
export const MAX_PRODUCT_IMAGES = 10;
/** Active products at or below this stock show as "low stock" on the admin dashboard. */
export const LOW_STOCK_THRESHOLD = 5;
