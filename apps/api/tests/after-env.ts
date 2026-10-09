import { prisma } from '../src/lib/prisma.js';

// Each test file gets its own Prisma client; close its connections when the file finishes.
afterAll(async () => {
  await prisma.$disconnect();
});
