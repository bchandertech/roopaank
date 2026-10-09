import type { OrderDetail, OrderListQuery, OrderSummary, Paginated, PaymentSession } from '@roopaank/shared';
import { conflict, notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import type { PaymentGateway } from '../../lib/razorpay.js';
import { detailInclude, summaryInclude, toOrderDetail, toOrderSummary } from './order-mappers.js';

const orderNotFound = () => notFound('ORDER_NOT_FOUND', 'Order not found');

export async function listOrders(userId: string, query: OrderListQuery): Promise<Paginated<OrderSummary>> {
  const where = { userId };
  const [total, rows] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: summaryInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return { items: rows.map(toOrderSummary), page: query.page, limit: query.limit, total };
}

/** Another customer's order is reported as not found, so order ids can't be probed. */
export async function getOrderForUser(userId: string, orderId: string): Promise<OrderDetail> {
  const row = await prisma.order.findFirst({ where: { id: orderId, userId }, include: detailInclude });
  if (!row) throw orderNotFound();
  return toOrderDetail(row);
}

/**
 * Lets the customer pay again for an unpaid order (ROO-63). The same Razorpay order is
 * reused — Razorpay accepts further attempts on it — so the amount can't change.
 */
export async function retryPayment(userId: string, orderId: string, gateway: PaymentGateway): Promise<PaymentSession> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!order) throw orderNotFound();
  const payment = order.payments[0];
  if ((order.status !== 'PENDING' && order.status !== 'PAYMENT_FAILED') || !payment) {
    throw conflict('ORDER_NOT_PAYABLE', 'This order cannot be paid');
  }

  if (order.status === 'PAYMENT_FAILED') {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: 'PAYMENT_FAILED' },
        data: { status: 'PENDING', paymentStatus: 'CREATED' },
      });
      if (count === 0) return;
      await tx.payment.updateMany({ where: { id: payment.id, status: 'FAILED' }, data: { status: 'CREATED' } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, status: 'PENDING' } });
    });
  }

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    razorpayOrderId: payment.providerOrderId,
    amount: payment.amount,
    currency: 'INR',
    keyId: gateway.keyId,
  };
}
