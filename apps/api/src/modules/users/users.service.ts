import type { AdminCustomer, AdminCustomerListQuery, Paginated } from '@roopaank/shared';
import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';

/** Customer list for admins: only non-sensitive fields (no password hash, sessions, addresses). */
export async function adminListCustomers(query: AdminCustomerListQuery): Promise<Paginated<AdminCustomer>> {
  const where: Prisma.UserWhereInput = {
    role: 'USER',
    ...(query.q && {
      OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { email: { contains: query.q, mode: 'insensitive' } }],
    }),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, createdAt: true, _count: { select: { orders: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return {
    items: rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt.toISOString(),
      orderCount: u._count.orders,
    })),
    page: query.page,
    limit: query.limit,
    total,
  };
}
