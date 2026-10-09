import { z } from 'zod';
import { ORDER_STATUSES } from '../types/enums.js';
import { idSchema, optionalText, paginationSchema, queryBooleanSchema, slugSchema } from './common.js';

// ---- Categories ----

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: slugSchema.optional(),
  description: z.string().trim().max(500).default(''),
  isActive: z.boolean().default(true),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    slug: slugSchema,
    description: z.string().trim().max(500),
    isActive: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ---- Products ----

/** ₹10,00,000 — a sanity ceiling against typos (e.g. an extra zero). */
const MAX_PRICE_PAISE = 100_000_000;
const priceSchema = z.number().int('Price must be in whole paise').positive().max(MAX_PRICE_PAISE);

const productFields = {
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  description: z.string().trim().min(1).max(5000),
  categoryId: idSchema,
  price: priceSchema,
  compareAtPrice: priceSchema.nullable(),
  // Material is mandatory: product information must be accurate (SPEC §1.1).
  material: z.string().trim().min(1).max(100),
  colour: z.string().trim().min(1).max(50).nullable(),
  size: z.string().trim().min(1).max(50).nullable(),
  weightGrams: z.number().int().positive().max(10_000).nullable(),
  careInstructions: z.string().trim().min(1).max(1000).nullable(),
  stockQuantity: z.number().int().min(0).max(100_000),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
};

const compareAtMustExceedPrice = {
  message: 'Compare-at price must be greater than price',
  path: ['compareAtPrice'],
};

export const createProductSchema = z
  .object({
    ...productFields,
    slug: productFields.slug.optional(),
    compareAtPrice: productFields.compareAtPrice.default(null),
    colour: productFields.colour.default(null),
    size: productFields.size.default(null),
    weightGrams: productFields.weightGrams.default(null),
    careInstructions: productFields.careInstructions.default(null),
    stockQuantity: productFields.stockQuantity.default(0),
    isActive: productFields.isActive.default(true),
    isFeatured: productFields.isFeatured.default(false),
  })
  .refine((p) => p.compareAtPrice === null || p.compareAtPrice > p.price, compareAtMustExceedPrice);
export type CreateProductInput = z.infer<typeof createProductSchema>;

// The server re-checks compare-at vs price against stored values when only one is sent.
export const updateProductSchema = z
  .object(productFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update')
  .refine(
    (p) => p.price === undefined || p.compareAtPrice == null || p.compareAtPrice > p.price,
    compareAtMustExceedPrice,
  );
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const adminProductListQuerySchema = paginationSchema(20, 100).extend({
  q: z.string().trim().min(1).max(100).optional(),
  categoryId: idSchema.optional(),
  isActive: queryBooleanSchema.optional(),
});
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;

export const productImageMetaSchema = z.object({
  altText: z.string().trim().min(1, 'Alt text is required').max(200),
});

export const reorderImagesSchema = z.object({
  imageIds: z.array(idSchema).min(1).max(20),
});
export type ReorderImagesInput = z.infer<typeof reorderImagesSchema>;

// ---- Orders & customers ----

export const adminOrderListQuerySchema = paginationSchema(20, 100).extend({
  status: z.enum(ORDER_STATUSES).optional(),
  needsAttention: queryBooleanSchema.optional(),
});
export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;

export const updateOrderStatusSchema = z.object({ status: z.enum(ORDER_STATUSES) });
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const adminCustomerListQuerySchema = paginationSchema(20, 100).extend({
  q: optionalText(100),
});
export type AdminCustomerListQuery = z.infer<typeof adminCustomerListQuerySchema>;
