import type { Address, CreateAddressInput, UpdateAddressInput } from '@roopaank/shared';
import type { Address as AddressRow } from '../../generated/prisma/client.js';
import { conflict, notFound } from '../../lib/errors.js';
import { type Db, prisma } from '../../lib/prisma.js';

/** Keeps the address book bounded; generous for real customers. */
export const MAX_ADDRESSES_PER_USER = 20;

export const toAddress = (a: AddressRow): Address => ({
  id: a.id,
  fullName: a.fullName,
  phone: a.phone,
  addressLine1: a.addressLine1,
  addressLine2: a.addressLine2,
  city: a.city,
  state: a.state,
  postalCode: a.postalCode,
  country: a.country,
  isDefault: a.isDefault,
});

const addressNotFound = () => notFound('ADDRESS_NOT_FOUND', 'Address not found');

export async function listAddresses(userId: string): Promise<Address[]> {
  const rows = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  return rows.map(toAddress);
}

/** Another user's address is reported as not found, never as forbidden (no leaking). */
export async function findOwnAddress(userId: string, id: string, db: Db = prisma): Promise<AddressRow> {
  const address = await db.address.findFirst({ where: { id, userId } });
  if (!address) throw addressNotFound();
  return address;
}

const clearDefault = (db: Db, userId: string) =>
  db.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });

export async function createAddress(userId: string, input: CreateAddressInput): Promise<Address> {
  return prisma.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId } });
    if (count >= MAX_ADDRESSES_PER_USER) {
      throw conflict('ADDRESS_LIMIT_REACHED', `You can save up to ${MAX_ADDRESSES_PER_USER} addresses`);
    }
    // The first address is always the default.
    const isDefault = input.isDefault === true || count === 0;
    if (isDefault) await clearDefault(tx, userId);
    return toAddress(await tx.address.create({ data: { ...input, userId, isDefault } }));
  });
}

export async function updateAddress(userId: string, id: string, input: UpdateAddressInput): Promise<Address> {
  return prisma.$transaction(async (tx) => {
    await findOwnAddress(userId, id, tx);
    if (input.isDefault === true) await clearDefault(tx, userId);
    return toAddress(await tx.address.update({ where: { id }, data: input }));
  });
}

export async function deleteAddress(userId: string, id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const address = await findOwnAddress(userId, id, tx);
    await tx.address.delete({ where: { id } });
    if (address.isDefault) {
      // Promote the most recent remaining address so the user still has a default.
      const next = await tx.address.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
}
