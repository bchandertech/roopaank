import type { Request, RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { AppError } from '../lib/errors.js';

export interface RateLimitRule {
  windowMs: number;
  limit: number;
}

export interface RateLimitRules {
  login: RateLimitRule;
  register: RateLimitRule;
  checkout: RateLimitRule;
}

const MINUTE = 60_000;

export const defaultRateLimits: RateLimitRules = {
  login: { windowMs: 15 * MINUTE, limit: 10 },
  register: { windowMs: 60 * MINUTE, limit: 5 },
  checkout: { windowMs: 10 * MINUTE, limit: 10 },
};

export type RateLimiters = Record<keyof RateLimitRules, RequestHandler>;

const clientIp = (req: Request) => ipKeyGenerator(req.ip ?? 'unknown');

/**
 * Counters live in process memory: correct for a single API instance. Running several
 * instances needs a shared store (e.g. Redis) — tracked as a known limitation in the spec.
 */
export function createRateLimiters(rules: RateLimitRules): RateLimiters {
  const build = (rule: RateLimitRule, keyGenerator: (req: Request) => string) =>
    rateLimit({
      windowMs: rule.windowMs,
      limit: rule.limit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      keyGenerator,
      handler: (_req, _res, next) =>
        next(new AppError(429, 'RATE_LIMITED', 'Too many attempts. Please wait a few minutes and try again.')),
    });

  return {
    // Per IP + email: slows password guessing against one account without locking out a shared IP.
    login: build(rules.login, (req) => {
      const email: unknown = req.body?.email;
      return `${clientIp(req)}:${typeof email === 'string' ? email.trim().toLowerCase() : ''}`;
    }),
    register: build(rules.register, clientIp),
    // Mounted after requireUser, so the user id is always present.
    checkout: build(rules.checkout, (req) => req.auth?.user.id ?? clientIp(req)),
  };
}
