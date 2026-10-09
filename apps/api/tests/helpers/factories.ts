import { randomUUID } from 'node:crypto';
import type { OrderStatus, Role } from '../../src/generated/prisma/client.js';
import { prisma } from '../../src/lib/prisma.js';
import { createSession, hashPassword, SESSION_COOKIE } from '../../src/modules/auth/auth.service.js';

export const TEST_PASSWORD = 'correct-horse-battery';
let passwordHash: Promise<string> | undefined;

const unique = () => randomUUID().slice(0, 8);

export async function createUser(overrides: { role?: Role; email?: string; name?: string } = {}) {
  passwordHash ??= hashPassword(TEST_PASSWORD); // hashing is slow; do it once per test file
  return prisma.user.create({
    data: {
      name: overrides.name ?? 'Test User',
      email: overrides.email ?? `user-${unique()}@example.com`,
      passwordHash: await passwordHash,
      role: overrides.role ?? 'USER',
    },
  });
}

/** A Cookie header value for a fresh session of this user. */
export async function sessionCookie(userId: string): Promise<string> {
  const { token } = await createSession(userId, {});
  return `${SESSION_COOKIE}=${token}`;
}

export async function createCustomer() {
  const user = await createUser();
  return { user, cookie: await sessionCookie(user.id) };
}

export async function createAdmin() {
  const user = await createUser({ role: 'ADMIN', name: 'Admin' });
  return { user, cookie: await sessionCookie(user.id) };
}

export async function createCategory(overrides: { name?: string; slug?: string; isActive?: boolean } = {}) {
  const id = unique();
  return prisma.category.create({
    data: {
      name: overrides.name ?? `Category ${id}`,
      slug: overrides.slug ?? `category-${id}`,
      isActive: overrides.isActive ?? true,
    },
  });
}

export async function createProduct(
  overrides: Partial<{
    name: string;
    slug: string;
    categoryId: string;
    price: number;
    compareAtPrice: number | null;
    stockQuantity: number;
    isActive: boolean;
    isFeatured: boolean;
    material: string;
  }> = {},
) {
  const id = unique();
  const categoryId = overrides.categoryId ?? (await createCategory()).id;
  return prisma.product.create({
    data: {
      name: overrides.name ?? `Product ${id}`,
      slug: overrides.slug ?? `product-${id}`,
      description: 'Imitation jewellery',
      categoryId,
      price: overrides.price ?? 50_000,
      compareAtPrice: overrides.compareAtPrice ?? null,
      material: overrides.material ?? 'Brass alloy, gold-tone plating',
      stockQuantity: overrides.stockQuantity ?? 10,
      isActive: overrides.isActive ?? true,
      isFeatured: overrides.isFeatured ?? false,
    },
  });
}

export async function createAddress(userId: string, overrides: { isDefault?: boolean } = {}) {
  return prisma.address.create({
    data: {
      userId,
      fullName: 'Priya Sharma',
      phone: '9876543210',
      addressLine1: '12 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      isDefault: overrides.isDefault ?? true,
    },
  });
}

/** An order written straight to the DB, for tests that start after checkout. */
export async function createOrder(
  userId: string,
  options: { status?: OrderStatus; quantity?: number; productId?: string; needsAttention?: boolean } = {},
) {
  const product = options.productId
    ? await prisma.product.findUniqueOrThrow({ where: { id: options.productId } })
    : await createProduct();
  const quantity = options.quantity ?? 1;
  const total = product.price * quantity;
  const status = options.status ?? 'CONFIRMED';
  const paid = status !== 'PENDING' && status !== 'PAYMENT_FAILED';
  return prisma.order.create({
    data: {
      orderNumber: `RPK-TEST-${unique()}`,
      userId,
      status,
      paymentStatus: paid ? 'PAID' : 'CREATED',
      subtotal: total,
      shippingAmount: 0,
      totalAmount: total,
      needsAttention: options.needsAttention ?? false,
      shippingAddress: { fullName: 'Priya Sharma', city: 'Bengaluru' },
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          quantity,
          unitPrice: product.price,
          totalPrice: total,
        },
      },
      payments: { create: { providerOrderId: `order_${unique()}`, amount: total, status: paid ? 'PAID' : 'CREATED' } },
      statusHistory: { create: { status } },
    },
  });
}

export async function addToCart(userId: string, productId: string, quantity: number) {
  const cart = await prisma.cart.upsert({ where: { userId }, update: {}, create: { userId } });
  return prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
}
