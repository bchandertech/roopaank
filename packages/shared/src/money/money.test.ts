import {
  amountToFreeShipping,
  discountPercent,
  FLAT_SHIPPING_FEE,
  formatINR,
  lineTotal,
  orderTotals,
  shippingFor,
} from './index.js';

describe('formatINR', () => {
  it('formats whole rupees without decimals using Indian grouping', () => {
    expect(formatINR(129_900)).toBe('₹1,299');
    expect(formatINR(12_345_600)).toBe('₹1,23,456');
    expect(formatINR(0)).toBe('₹0');
  });

  it('shows two decimals when there are paise', () => {
    expect(formatINR(129_950)).toBe('₹1,299.50');
    expect(formatINR(5)).toBe('₹0.05');
  });

  it('rejects non-integer or negative amounts', () => {
    expect(() => formatINR(12.5)).toThrow(RangeError);
    expect(() => formatINR(-100)).toThrow(RangeError);
  });
});

describe('discountPercent', () => {
  it('rounds to the nearest whole percent', () => {
    expect(discountPercent(129_900, 199_900)).toBe(35);
    expect(discountPercent(66_600, 99_900)).toBe(33);
  });

  it('returns null without a valid compare-at price', () => {
    expect(discountPercent(1_000, null)).toBeNull();
    expect(discountPercent(1_000, undefined)).toBeNull();
    expect(discountPercent(1_000, 1_000)).toBeNull();
    expect(discountPercent(1_000, 900)).toBeNull();
  });
});

describe('lineTotal', () => {
  it('multiplies unit price by quantity', () => {
    expect(lineTotal(49_900, 3)).toBe(149_700);
  });

  it('rejects a zero or fractional quantity', () => {
    expect(() => lineTotal(100, 0)).toThrow(RangeError);
    expect(() => lineTotal(100, 1.5)).toThrow(RangeError);
  });
});

describe('shippingFor', () => {
  it('is free for an empty cart', () => {
    expect(shippingFor(0)).toBe(0);
  });

  it('charges the flat fee below ₹999', () => {
    expect(shippingFor(99_899)).toBe(FLAT_SHIPPING_FEE);
    expect(FLAT_SHIPPING_FEE).toBe(7_900);
  });

  it('is free at exactly ₹999 and above', () => {
    expect(shippingFor(99_900)).toBe(0);
    expect(shippingFor(250_000)).toBe(0);
  });
});

describe('amountToFreeShipping', () => {
  it('returns the remaining amount, never negative', () => {
    expect(amountToFreeShipping(60_000)).toBe(39_900);
    expect(amountToFreeShipping(150_000)).toBe(0);
  });
});

describe('orderTotals', () => {
  it('adds shipping below the threshold', () => {
    expect(orderTotals([{ unitPrice: 49_900, quantity: 1 }])).toEqual({
      subtotal: 49_900,
      shippingAmount: 7_900,
      discountAmount: 0,
      totalAmount: 57_800,
    });
  });

  it('gives free shipping once the subtotal reaches the threshold', () => {
    expect(
      orderTotals([
        { unitPrice: 49_900, quantity: 1 },
        { unitPrice: 50_000, quantity: 1 },
      ]),
    ).toEqual({ subtotal: 99_900, shippingAmount: 0, discountAmount: 0, totalAmount: 99_900 });
  });
});
