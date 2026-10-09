import {
  ADMIN_ORDER_STATUS_TRANSITIONS,
  type AdminOrderDetail,
  type AdminOrderListQuery,
  type AdminOrderSummary,
  canAdminTransition,
  type OrderStatus,
  type Paginated,
  RETURN_WINDOW_DAYS,
} from '@roopaank/shared';
import type { Prisma } from '../../generated/prisma/client.js';
import { conflict, notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { DAY_MS } from '../../lib/time.js';
import { adminDetailInclude, adminSummaryInclude, toAdminOrderDetail, toAdminOrderSummary } from './order-mappers.js';

const orderNotFound = () => notFound('ORDER_NOT_FOUND', 'Order not found');

export async function adminListOrders(query: AdminOrderListQuery): Promise<Paginated<AdminOrderSummary>> {
  const where: Prisma.OrderWhereInput = {
    ...(query.status && { status: query.status }),
    ...(query.needsAttention !== undefined && { needsAttention: query.needsAttention }),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: adminSummaryInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return { items: rows.map(toAdminOrderSummary), page: query.page, limit: query.limit, total };
}

export async function adminGetOrder(id: string): Promise<AdminOrderDetail> {
  const row = await prisma.order.findUnique({ where: { id }, include: adminDetailInclude });
  if (!row) throw orderNotFound();
  return toAdminOrderDetail(row);
}

/** Moves an order along the SPEC §3.1 state machine. Anything else is a 409. */
export async function updateOrderStatus(id: string, to: OrderStatus): Promise<AdminOrderDetail> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id },
      include: {
        items: { select: { productId: true, quantity: true } },
        statusHistory: { where: { status: 'DELIVERED' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!order) throw orderNotFound();

    const from = order.status;
    if (!canAdminTransition(from, to)) {
      throw conflict('INVALID_STATUS_TRANSITION', `Cannot change an order from ${from} to ${to}`, {
        from,
        to,
        allowed: ADMIN_ORDER_STATUS_TRANSITIONS[from],
      });
    }

    if (to === 'RETURN_REQUESTED') {
      const deliveredAt = order.statusHistory[0]?.createdAt;
      if (!deliveredAt || Date.now() - deliveredAt.getTime() > RETURN_WINDOW_DAYS * DAY_MS) {
        throw conflict('RETURN_WINDOW_EXPIRED', `Returns must be requested within ${RETURN_WINDOW_DAYS} days of delivery`);
      }
    }

    // Only succeeds if nobody changed the status since we read it (optimistic concurrency).
    const { count } = await tx.order.updateMany({
      where: { id, status: from },
      data: { status: to, ...(to === 'REFUNDED' && { paymentStatus: 'REFUNDED' as const }) },
    });
    if (count === 0) throw conflict('ORDER_CHANGED', 'This order was just updated. Reload and try again.');
    await tx.orderStatusHistory.create({ data: { orderId: id, status: to } });

    // Cancelled before shipping: the items go back on sale. A needsAttention order may not
    // have had all its stock taken, so its stock is left for the admin to fix by hand.
    if (to === 'CANCELLED' && !order.needsAttention) {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    }

    // The refund itself is done in the Razorpay dashboard in MVP (SPEC §2.4); this records it.
    if (to === 'REFUNDED') {
      await tx.payment.updateMany({ where: { orderId: id, status: 'PAID' }, data: { status: 'REFUNDED' } });
    }
  });
  return adminGetOrder(id);
}
