import { createAddressSchema } from './address.js';
import { createProductSchema, updateProductSchema } from './admin.js';
import { registerSchema } from './auth.js';
import { emailSchema, phoneSchema } from './common.js';
import { addCartItemSchema, productListQuerySchema } from './shop.js';

describe('emailSchema', () => {
  it('trims and lowercases', () => {
    expect(emailSchema.parse('  Priya@Example.COM ')).toBe('priya@example.com');
  });

  it('rejects invalid emails', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });
});

describe('phoneSchema', () => {
  it.each(['9876543210', '+91 98765 43210', '09876543210', '98765-43210'])('normalises %s', (input) => {
    expect(phoneSchema.parse(input)).toBe('9876543210');
  });

  it.each(['12345', '5876543210', '98765432101', 'abcdefghij'])('rejects %s', (input) => {
    expect(phoneSchema.safeParse(input).success).toBe(false);
  });
});

describe('createAddressSchema', () => {
  const valid = {
    fullName: 'Priya Sharma',
    phone: '9876543210',
    addressLine1: '12 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
  };

  it('accepts a valid Indian address and drops a blank second line', () => {
    expect(createAddressSchema.parse({ ...valid, addressLine2: '  ' })).toEqual({ ...valid, addressLine2: undefined });
  });

  it.each(['012345', '56001', '5600011', 'ABCDEF'])('rejects PIN %s', (postalCode) => {
    expect(createAddressSchema.safeParse({ ...valid, postalCode }).success).toBe(false);
  });

  it('rejects an unknown state', () => {
    expect(createAddressSchema.safeParse({ ...valid, state: 'California' }).success).toBe(false);
  });

  it('ignores a client-supplied country', () => {
    expect(createAddressSchema.parse({ ...valid, country: 'US' })).not.toHaveProperty('country');
  });
});

describe('registerSchema', () => {
  it('requires a password of at least 8 characters', () => {
    expect(registerSchema.safeParse({ name: 'Priya', email: 'p@example.com', password: 'short' }).success).toBe(false);
  });
});

describe('addCartItemSchema', () => {
  it('defaults quantity to 1 and strips unknown fields such as price', () => {
    expect(addCartItemSchema.parse({ productId: 'cm1abcdefghijklmnop', price: 1 })).toEqual({
      productId: 'cm1abcdefghijklmnop',
      quantity: 1,
    });
  });

  it('rejects quantities above the per-line limit', () => {
    expect(addCartItemSchema.safeParse({ productId: 'cm1abcdefghijklmnop', quantity: 11 }).success).toBe(false);
  });
});

describe('productListQuerySchema', () => {
  it('applies defaults and coerces query strings', () => {
    expect(productListQuerySchema.parse({ page: '2', featured: 'true' })).toEqual({
      page: 2,
      limit: 12,
      sort: 'newest',
      featured: true,
    });
  });

  it('rejects an unknown sort and an oversized limit', () => {
    expect(productListQuerySchema.safeParse({ sort: 'random' }).success).toBe(false);
    expect(productListQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
  });
});

describe('product schemas', () => {
  const base = {
    name: 'Kundan Jhumka',
    description: 'Gold-plated brass jhumkas',
    categoryId: 'cm1abcdefghijklmnop',
    price: 129_900,
    material: 'Brass, gold plated',
  };

  it('requires compare-at price to exceed price', () => {
    expect(createProductSchema.safeParse({ ...base, compareAtPrice: 129_900 }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...base, compareAtPrice: 199_900 }).success).toBe(true);
  });

  it('rejects fractional paise and requires material', () => {
    expect(createProductSchema.safeParse({ ...base, price: 1299.5 }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...base, material: '' }).success).toBe(false);
  });

  it('rejects an empty update', () => {
    expect(updateProductSchema.safeParse({}).success).toBe(false);
  });
});
