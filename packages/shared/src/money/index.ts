// All amounts are integer paise (₹1 = 100 paise). See SPEC §2.1–2.3.

/** Orders with a subtotal at or above this get free shipping (D6). */
export const FREE_SHIPPING_THRESHOLD = 99_900;
/** Flat shipping fee below the threshold (D6). */
export const FLAT_SHIPPING_FEE = 7_900;

const wholeRupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const withPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

function assertPaise(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer number of paise`);
  }
}

/** 129900 → "₹1,299"; 129950 → "₹1,299.50". */
export function formatINR(paise: number): string {
  assertPaise(paise, 'paise');
  return paise % 100 === 0 ? wholeRupees.format(paise / 100) : withPaise.format(paise / 100);
}

/** Derived "% OFF" badge (SPEC §2.2). Returns null when there is no valid discount. */
export function discountPercent(price: number, compareAtPrice: number | null | undefined): number | null {
  assertPaise(price, 'price');
  if (compareAtPrice == null || compareAtPrice <= price) return null;
  assertPaise(compareAtPrice, 'compareAtPrice');
  return Math.round(((compareAtPrice - price) * 100) / compareAtPrice);
}

export function lineTotal(unitPrice: number, quantity: number): number {
  assertPaise(unitPrice, 'unitPrice');
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new RangeError('quantity must be a positive integer');
  }
  return unitPrice * quantity;
}

/** Shipping for a subtotal (D6). An empty cart has no shipping. */
export function shippingFor(subtotal: number): number {
  assertPaise(subtotal, 'subtotal');
  if (subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return FLAT_SHIPPING_FEE;
}

/** How much more the customer must add for free shipping ("Add ₹X more"). */
export function amountToFreeShipping(subtotal: number): number {
  assertPaise(subtotal, 'subtotal');
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
}

export interface PriceLine {
  unitPrice: number;
  quantity: number;
}

export interface OrderTotals {
  subtotal: number;
  shippingAmount: number;
  /** Always 0 in MVP — no coupons (SPEC §2.2). */
  discountAmount: number;
  totalAmount: number;
}

export function orderTotals(lines: readonly PriceLine[]): OrderTotals {
  const subtotal = lines.reduce((sum, line) => sum + lineTotal(line.unitPrice, line.quantity), 0);
  const shippingAmount = shippingFor(subtotal);
  const discountAmount = 0;
  return { subtotal, shippingAmount, discountAmount, totalAmount: subtotal + shippingAmount - discountAmount };
}
