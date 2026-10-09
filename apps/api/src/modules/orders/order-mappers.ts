import type {
  AdminOrderDetail,
  AdminOrderSummary,
  OrderDetail,
  OrderSummary,
  ShippingAddressSnapshot,
} from '@roopaank/shared';
import type { Prisma } from '../../generated/prisma/client.js';

export const summaryInclude = {
  items: { select: { quantity: true } },
} satisfies Prisma.OrderInclude;

export const detailInclude = {
  items: { orderBy: { createdAt: 'asc' } },
  statusHistory: { orderBy: { createdAt: 'asc' }, select: { status: true, createdAt: true } },
} satisfies Prisma.OrderInclude;

export const adminSummaryInclude = {
  ...summaryInclude,
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.OrderInclude;

export const adminDetailInclude = {
  ...detailInclude,
  user: { select: { id: true, name: true, email: true, phone: true } },
  payments: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.OrderInclude;

type SummaryRow = Prisma.OrderGetPayload<{ include: typeof summaryInclude }>;
type DetailRow = Prisma.OrderGetPayload<{ include: typeof detailInclude }>;
type AdminSummaryRow = Prisma.OrderGetPayload<{ include: typeof adminSummaryInclude }>;
type AdminDetailRow = Prisma.OrderGetPayload<{ include: typeof adminDetailInclude }>;

export function toOrderSummary(o: SummaryRow): OrderSummary {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    totalAmount: o.totalAmount,
    itemCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: o.createdAt.toISOString(),
  };
}

export function toOrderDetail(o: DetailRow): OrderDetail {
  return {
    ...toOrderSummary(o),
    subtotal: o.subtotal,
    shippingAmount: o.shippingAmount,
    discountAmount: o.discountAmount,
    // Written only by checkout from a validated address, so the shape is known.
    shippingAddress: o.shippingAddress as unknown as ShippingAddressSnapshot,
    items: o.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productImageUrl: item.productImageUrl,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    statusHistory: o.statusHistory.map((event) => ({
      status: event.status,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export function toAdminOrderSummary(o: AdminSummaryRow): AdminOrderSummary {
  return { ...toOrderSummary(o), needsAttention: o.needsAttention, customer: o.user };
}

export function toAdminOrderDetail(o: AdminDetailRow): AdminOrderDetail {
  return {
    ...toOrderDetail(o),
    needsAttention: o.needsAttention,
    customer: o.user,
    payments: o.payments.map((p) => ({
      id: p.id,
      providerOrderId: p.providerOrderId,
      providerPaymentId: p.providerPaymentId,
      amount: p.amount,
      status: p.status,
    })),
  };
}
