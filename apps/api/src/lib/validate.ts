import { z } from 'zod';
import { badRequest } from './errors.js';

/** Parses untrusted input (body, params, query) or throws a 400 with per-field messages. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw badRequest('VALIDATION_ERROR', 'Some fields are invalid', z.flattenError(result.error));
  }
  return result.data;
}

export const idParamSchema = z.object({ id: z.cuid({ message: 'Invalid id' }) });
