import { type CheckoutInput, orderTotals, type PaymentSession, type ShippingAddressSnapshot } from '@roopaank/shared';
import { AppError, conflict } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import type { PaymentGateway } from '../../lib/razorpay.js';
import { istDateStamp } from '../../lib/time.js';
import { findOwnAddress } from '../addresses/addresses.service.js';

/** "RPK-20261009-0042": IST date + a database sequence value (atomic, never reused). */
async function nextOrderNumber(): Promise<string> {
  const [row] = await prisma.$queryRaw<{ value: bigint }[]>`SELECT nextval('order_number_seq') AS value`;
  if (!row) throw new Error('order_number_seq returned no value');
  return `RPK-${istDateStamp(new Date())}-${row.value.toString().padStart(4, '0')}`;
}

/**
 * Turns the user's cart into a PENDING order and a Razorpay order (SPEC §7.6).
 * Every amount is calculated here from current DB prices; nothing comes from the client.
 */
export async function checkout(userId: string, input: CheckoutInput, gateway: PaymentGateway): Promise<PaymentSession> {
  const address = await findOwnAddress(userId, input.addressId);

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
        include: {
          product: {
            include: {
              category: { select: { isActive: true } },
              images: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], take: 1, select: { url: true } },
            },
          },
        },
      },
    },
  });
  const items = cart?.items ?? [];
  if (items.length === 0) throw conflict('CART_EMPTY', 'Your cart is empty');

  // Stock is checked here and again, atomically, when payment is verified (D8).
  const problems = items
    .filter((i) => !i.product.isActive || !i.product.category.isActive || i.product.stockQuantity < i.quantity)
    .map((i) => ({ cartItemId: i.id, productId: i.productId, name: i.product.name, available: i.product.stockQuantity }));
  if (problems.length > 0) {
    throw conflict('CART_HAS_ISSUES', 'Some items in your cart are unavailable or low on stock', { items: problems });
  }

  const totals = orderTotals(items.map((i) => ({ unitPrice: i.product.price, quantity: i.quantity })));
  const orderNumber = await nextOrderNumber();

  // Create the Razorpay order before writing ours: if this call fails, nothing is left
  // half-done in our DB. If our write fails afterwards, an unpaid Razorpay order is harmless.
  const providerOrder = await gateway.createOrder({ amount: totals.totalAmount, receipt: orderNumber });
  if (providerOrder.amount !== totals.totalAmount) {
    logger.error({ orderNumber, expected: totals.totalAmount, got: providerOrder.amount }, 'Razorpay order amount mismatch');
    throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'Payment service is unavailable. Please try again.');
  }

  const shippingAddress: ShippingAddressSnapshot = {
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  };

  // A nested create runs as one transaction: order, items, payment and history together.
  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      ...totals,
      shippingAddress: { ...shippingAddress },
      items: {
        create: items.map((i) => ({
          productId: i.productId,
          productName: i.product.name,
          productImageUrl: i.product.images[0]?.url ?? null,
          quantity: i.quantity,
          unitPrice: i.product.price,
          totalPrice: i.product.price * i.quantity,
        })),
      },
      payments: { create: { providerOrderId: providerOrder.id, amount: totals.totalAmount } },
      statusHistory: { create: { status: 'PENDING' } },
    },
    select: { id: true },
  });

  return {
    orderId: order.id,
    orderNumber,
    razorpayOrderId: providerOrder.id,
    amount: totals.totalAmount,
    currency: 'INR',
    keyId: gateway.keyId,
  };
}
