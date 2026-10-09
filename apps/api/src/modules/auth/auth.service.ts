import { createHash, randomBytes } from 'node:crypto';
import { hash, verify } from 'argon2';
import type { LoginInput, PublicUser, RegisterInput } from '@roopaank/shared';
import { config } from '../../config/env.js';
import type { User } from '../../generated/prisma/client.js';
import { AppError, conflict } from '../../lib/errors.js';
import { isUniqueViolation, prisma } from '../../lib/prisma.js';
import { DAY_MS } from '../../lib/time.js';

export const SESSION_COOKIE = 'rpk_session';

export interface AuthContext {
  sessionId: string;
  user: PublicUser;
}

export interface RequestMeta {
  ip?: string | undefined;
  userAgent?: string | undefined;
}

export interface NewSession {
  token: string;
  expiresAt: Date;
}

// Only a hash of the token is stored, so a leaked database can't be used to hijack sessions.
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
}

export function hashPassword(password: string): Promise<string> {
  return hash(password); // argon2id with the library's recommended defaults
}

export async function createSession(userId: string, meta: RequestMeta): Promise<NewSession> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + config.SESSION_TTL_DAYS * DAY_MS);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
      ip: meta.ip ?? null,
    },
  });
  return { token, expiresAt };
}

export async function register(input: RegisterInput, meta: RequestMeta) {
  const passwordHash = await hashPassword(input.password);
  let user: User;
  try {
    user = await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash } });
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict('EMAIL_TAKEN', 'An account with this email already exists');
    throw error;
  }
  return { user: toPublicUser(user), session: await createSession(user.id, meta) };
}

const invalidCredentials = () => new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');

let dummyHash: Promise<string> | undefined;

export async function login(input: LoginInput, meta: RequestMeta) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    // Spend the same time as a real check so response timing doesn't reveal which emails exist.
    dummyHash ??= hashPassword('timing-equaliser-not-a-real-password');
    await verify(await dummyHash, input.password);
    throw invalidCredentials();
  }
  if (!(await verify(user.passwordHash, input.password))) throw invalidCredentials();
  return { user: toPublicUser(user), session: await createSession(user.id, meta) };
}

export async function logout(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

export async function findSession(token: string): Promise<AuthContext | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return { sessionId: session.id, user: toPublicUser(session.user) };
}
