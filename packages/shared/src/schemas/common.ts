import { z } from 'zod';

export const idSchema = z.cuid({ message: 'Invalid id' });

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email({ message: 'Invalid email' }));

/** Indian mobile number. Accepts "+91 98765 43210", "09876543210" etc.; outputs 10 digits. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, '').replace(/^(?:\+91|91|0)(?=\d{10}$)/, ''))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'));

/** Optional free-text field: blank input becomes undefined. */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value));
}

export function paginationSchema(defaultLimit: number, maxLimit: number) {
  return z.object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit),
  });
}

/** Query-string boolean: only "true" / "false". */
export const queryBooleanSchema = z.enum(['true', 'false']).transform((value) => value === 'true');
