import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config/env.js';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: config.DATABASE_URL }),
});

/** A client usable both inside and outside `prisma.$transaction`. */
export type Db = Prisma.TransactionClient;

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
