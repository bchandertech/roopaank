/**
 * Creates (or promotes) an ADMIN user — the only way to get admin access; public
 * registration always creates USER accounts (SPEC §2.7).
 *
 * Usage: set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD (in .env or the shell), then
 *   npm run admin:create -w @roopaank/api
 * The password is read from the environment, not a CLI argument, so it doesn't end up
 * in shell history.
 */
import { registerSchema } from '@roopaank/shared';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../modules/auth/auth.service.js';

const input = registerSchema.safeParse({
  name: process.env.ADMIN_NAME,
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
});

if (!input.success) {
  console.error('Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD (min 8 characters):');
  console.error(z.prettifyError(input.error));
  process.exit(1);
}

const { name, email, password } = input.data;

try {
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', passwordHash, name },
    create: { name, email, passwordHash, role: 'ADMIN' },
  });
  // Existing sessions were created under the old password; end them.
  await prisma.session.deleteMany({ where: { userId: user.id } });
  console.log(`Admin ready: ${user.email}`);
} finally {
  await prisma.$disconnect();
}
