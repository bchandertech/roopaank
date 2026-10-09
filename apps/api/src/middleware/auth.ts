import type { Request, RequestHandler } from 'express';
import type { PublicUser } from '@roopaank/shared';
import { forbidden, unauthorized } from '../lib/errors.js';
import { type AuthContext, findSession, SESSION_COOKIE } from '../modules/auth/auth.service.js';

// Express's documented way to add typed fields to `req`.
declare global {
  namespace Express {
    interface Request {
      /** Set by `loadSession` when the request carries a valid session cookie. */
      auth?: AuthContext;
    }
  }
}

/** Resolves the session cookie (if any) to a user. Never rejects the request by itself. */
export const loadSession: RequestHandler = async (req, _res, next) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string' && token.length > 0 && token.length <= 128) {
    const auth = await findSession(token);
    if (auth) req.auth = auth;
  }
  next();
};

export const requireUser: RequestHandler = (req, _res, next) => {
  if (!req.auth) throw unauthorized();
  next();
};

/** Admin routes are protected here, on the server — hiding them in the UI is not security. */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.auth) throw unauthorized();
  if (req.auth.user.role !== 'ADMIN') throw forbidden();
  next();
};

/** The logged-in user. Use only on routes behind `requireUser` / `requireAdmin`. */
export function currentUser(req: Request): PublicUser {
  if (!req.auth) throw unauthorized();
  return req.auth.user;
}
