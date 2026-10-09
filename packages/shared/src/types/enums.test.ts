import { ADMIN_ORDER_STATUS_TRANSITIONS, canAdminTransition, ORDER_STATUSES, type OrderStatus } from './enums.js';

// The exact table from SPEC §3.1, minus system/customer-only transitions.
const expected: Record<OrderStatus, OrderStatus[]> = {
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

describe('admin order status transitions', () => {
  it('matches the spec table exactly', () => {
    expect(ADMIN_ORDER_STATUS_TRANSITIONS).toEqual(expected);
  });

  it.each(ORDER_STATUSES.flatMap((from) => ORDER_STATUSES.map((to) => [from, to] as const)))('%s → %s', (from, to) => {
    expect(canAdminTransition(from, to)).toBe(expected[from].includes(to));
  });

  it('never lets an admin confirm or fail a payment', () => {
    expect(canAdminTransition('PENDING', 'CONFIRMED')).toBe(false);
    expect(canAdminTransition('PENDING', 'PAYMENT_FAILED')).toBe(false);
  });
});
