import request from 'supertest';
import { buildTestApp } from '../../../tests/helpers/app.js';
import { resetDatabase } from '../../../tests/helpers/db.js';
import { createUser, sessionCookie, TEST_PASSWORD } from '../../../tests/helpers/factories.js';
import { prisma } from '../../lib/prisma.js';

const { app } = buildTestApp();

beforeEach(resetDatabase);

function cookieFrom(res: request.Response): string {
  const header = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = header?.find((c) => c.startsWith('rpk_session='));
  if (!cookie) throw new Error('No session cookie set');
  return cookie;
}

describe('POST /api/auth/register', () => {
  it('creates a USER, sets a secure session cookie and returns no secrets', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Priya', email: 'Priya@Example.com', password: 'long-enough-pw' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(String), name: 'Priya', email: 'priya@example.com', phone: null, role: 'USER' });
    const cookie = cookieFrom(res);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'priya@example.com' } });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    const session = await prisma.session.findFirstOrThrow({ where: { userId: stored.id } });
    expect(cookie).not.toContain(session.tokenHash); // only a hash is stored
  });

  it('ignores a client-supplied role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Mallory', email: 'm@example.com', password: 'long-enough-pw', role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('USER');
  });

  it('rejects a duplicate email regardless of case', async () => {
    await createUser({ email: 'taken@example.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Priya', email: 'TAKEN@example.com', password: 'long-enough-pw' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('returns field errors for invalid input', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'P', email: 'nope', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.details.fieldErrors).sort()).toEqual(['email', 'name', 'password']);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with the right password', async () => {
    const user = await createUser({ email: 'priya@example.com' });
    const res = await request(app).post('/api/auth/login').send({ email: 'Priya@example.com', password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user.id);
    cookieFrom(res);
  });

  it('gives the same generic error for a wrong password and an unknown email', async () => {
    await createUser({ email: 'priya@example.com' });
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'priya@example.com', password: 'wrong-password' });
    const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'wrong-password' });

    for (const res of [wrongPassword, unknownEmail]) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password' } });
    }
  });

  it('rate-limits repeated attempts for the same email', async () => {
    const { app: limitedApp } = buildTestApp({
      rateLimits: {
        login: { windowMs: 60_000, limit: 2 },
        register: { windowMs: 60_000, limit: 2 },
        checkout: { windowMs: 60_000, limit: 2 },
      },
    });
    const attempt = () => request(limitedApp).post('/api/auth/login').send({ email: 'x@example.com', password: 'guess' });
    expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('session lifecycle', () => {
  it('GET /me requires a session', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('GET /me returns the logged-in user', async () => {
    const user = await createUser();
    const res = await request(app).get('/api/auth/me').set('Cookie', await sessionCookie(user.id));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, email: user.email, role: 'USER' });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('rejects and removes an expired session', async () => {
    const user = await createUser();
    const cookie = await sessionCookie(user.id);
    await prisma.session.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(401);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it('logout deletes the session and clears the cookie', async () => {
    const user = await createUser();
    const cookie = await sessionCookie(user.id);

    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(res.status).toBe(204);
    expect(String(res.headers['set-cookie'])).toMatch(/rpk_session=;/);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
    expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
  });
});
