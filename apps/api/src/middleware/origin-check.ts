import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence (SPEC §9), together with SameSite=Lax cookies and JSON-only bodies:
 * browsers always send an Origin header on cross-origin writes, so a write coming from
 * any other site is rejected. Non-browser clients (curl, Razorpay webhooks) send no Origin
 * and carry no victim's cookie, so they are allowed through.
 */
export function originCheck(allowedOrigin: string): RequestHandler {
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.get('origin');
    if (origin !== undefined && origin !== allowedOrigin) {
      throw new AppError(403, 'ORIGIN_NOT_ALLOWED', 'Request origin is not allowed');
    }
    next();
  };
}
