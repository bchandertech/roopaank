// Customer-facing request schemas: catalog queries, cart, checkout, payment, orders.
import { z } from 'zod';
import { MAX_CART_ITEM_QUANTITY } from '../types/enums.js';
import { idSchema, paginationSchema, queryBooleanSchema, slugSchema } from './common.js';

export const PRODUCT_SORTS = ['newest', 'price_asc', 'price_desc'] as const;

export const productListQuerySchema = paginationSchema(12, 48).extend({
  category: slugSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(PRODUCT_SORTS).default('newest'),
  featured: queryBooleanSchema.optional(),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

const quantitySchema = z.number().int().min(1).max(MAX_CART_ITEM_QUANTITY);

export const addCartItemSchema = z.object({
  productId: idSchema,
  quantity: quantitySchema.default(1),
});
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

export const updateCartItemSchema = z.object({ quantity: quantitySchema });
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const checkoutSchema = z.object({ addressId: idSchema });
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().regex(/^order_[A-Za-z0-9]{1,40}$/, 'Invalid Razorpay order id'),
  razorpayPaymentId: z.string().regex(/^pay_[A-Za-z0-9]{1,40}$/, 'Invalid Razorpay payment id'),
  signature: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid signature'),
});
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export const orderListQuerySchema = paginationSchema(10, 50);
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
