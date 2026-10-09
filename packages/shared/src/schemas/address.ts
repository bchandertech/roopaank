import { z } from 'zod';
import { optionalText, phoneSchema } from './common.js';

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

const addressFields = {
  fullName: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  addressLine1: z.string().trim().min(3).max(200),
  addressLine2: optionalText(200),
  city: z.string().trim().min(2).max(80),
  state: z.enum(INDIAN_STATES, { message: 'Select a valid state' }),
  postalCode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
  isDefault: z.boolean().optional(),
};

// India-only delivery (SPEC §2.3): country is always set by the server, never accepted from input.
export const createAddressSchema = z.object(addressFields);
export type CreateAddressInput = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = z
  .object({
    ...addressFields,
    // On update, a blank second line means "clear it" (null), not "leave unchanged".
    addressLine2: z
      .string()
      .trim()
      .max(200)
      .nullable()
      .transform((value) => (value === '' ? null : value)),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
