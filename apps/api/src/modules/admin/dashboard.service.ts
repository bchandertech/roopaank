import { type AdminDashboard, LOW_STOCK_THRESHOLD, ORDER_STATUSES, type OrderStatus } from '@roopaank/shared';
import { prisma } from '../../lib/prisma.js';
import { startOfIstDay } from '../../lib/time.js';

export async function getDashboard(): Promise<AdminDashboard> {
  const [byStatus, ordersToday, needsAttentionCount, activeProductCount, lowStockProducts] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    // "Today" is the IST calendar day; unpaid orders don't count as orders yet.
    prisma.order.count({
      where: { createdAt: { gte: startOfIstDay(new Date()) }, status: { notIn: ['PENDING', 'PAYMENT_FAILED'] } },
    }),
    prisma.order.count({ where: { needsAttention: true } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.findMany({
      where: { isActive: true, stockQuantity: { lte: LOW_STOCK_THRESHOLD } },
      select: { id: true, name: true, slug: true, stockQuantity: true },
      orderBy: [{ stockQuantity: 'asc' }, { name: 'asc' }],
      take: 20,
    }),
  ]);

  const ordersByStatus = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0])) as Record<OrderStatus, number>;
  for (const row of byStatus) ordersByStatus[row.status] = row._count._all;

  return { ordersByStatus, ordersToday, needsAttentionCount, activeProductCount, lowStockProducts };
}
