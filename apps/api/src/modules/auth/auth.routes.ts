import { type Request, type Response, Router } from 'express';
import { loginSchema, registerSchema } from '@roopaank/shared';
import { config } from '../../config/env.js';
import { currentUser, requireUser } from '../../middleware/auth.js';
import type { RateLimiters } from '../../middleware/rate-limit.js';
import { parse } from '../../lib/validate.js';
import * as auth from './auth.service.js';

const cookieOptions = {
  httpOnly: true, // not readable from JavaScript, so XSS can't steal it
  secure: config.isProduction, // HTTPS-only outside local development
  sameSite: 'lax', // not sent on cross-site POSTs (CSRF defence)
  path: '/',
} as const;

function setSessionCookie(res: Response, session: auth.NewSession) {
  res.cookie(auth.SESSION_COOKIE, session.token, { ...cookieOptions, expires: session.expiresAt });
}

const requestMeta = (req: Request): auth.RequestMeta => ({ ip: req.ip, userAgent: req.get('user-agent') });

export function authRouter(limiters: RateLimiters): Router {
  const router = Router();

  router.post('/register', limiters.register, async (req, res) => {
    const { user, session } = await auth.register(parse(registerSchema, req.body), requestMeta(req));
    setSessionCookie(res, session);
    res.status(201).json(user);
  });

  router.post('/login', limiters.login, async (req, res) => {
    const { user, session } = await auth.login(parse(loginSchema, req.body), requestMeta(req));
    setSessionCookie(res, session);
    res.json(user);
  });

  router.post('/logout', async (req, res) => {
    if (req.auth) await auth.logout(req.auth.sessionId);
    res.clearCookie(auth.SESSION_COOKIE, cookieOptions);
    res.status(204).end();
  });

  router.get('/me', requireUser, (req, res) => {
    res.json(currentUser(req));
  });

  return router;
}
