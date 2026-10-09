import { randomUUID } from 'node:crypto';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express, Router } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { config } from './config/env.js';
import { logger } from './lib/logger.js';
import type { PaymentGateway } from './lib/razorpay.js';
import type { ImageStorage } from './lib/storage.js';
import { loadSession } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { originCheck } from './middleware/origin-check.js';
import { createRateLimiters, defaultRateLimits, type RateLimitRules } from './middleware/rate-limit.js';
import { addressesRouter } from './modules/addresses/addresses.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { cartRouter } from './modules/cart/cart.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { checkoutRouter } from './modules/checkout/checkout.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { paymentsRouter, paymentWebhookHandlers } from './modules/payments/payments.routes.js';
import { productsRouter } from './modules/products/products.routes.js';

/** External services are passed in, so tests can supply fakes without network calls. */
export interface AppDependencies {
  gateway: PaymentGateway;
  storage: ImageStorage;
  rateLimits?: RateLimitRules;
}

const REQUEST_ID_PATTERN = /^[\w-]{1,64}$/;

export function createApp({ gateway, storage, rateLimits = defaultRateLimits }: AppDependencies): Express {
  const app = express();
  const limiters = createRateLimiters(rateLimits);

  // Behind a proxy/load balancer, req.ip must come from X-Forwarded-For (rate limits, logs).
  app.set('trust proxy', config.TRUST_PROXY);

  // One log line per request, tagged with a request id that is also returned to the client.
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cors({ origin: config.WEB_ORIGIN, credentials: true }));

  // Local-disk product images (D11). Replaced by S3 + CloudFront in production later.
  app.use('/uploads', express.static(path.resolve(config.UPLOAD_DIR), { maxAge: '7d', index: false }));

  // Before express.json(): the webhook signature needs the raw body.
  app.post('/api/payments/webhook', ...paymentWebhookHandlers(gateway));

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(originCheck(config.WEB_ORIGIN));
  app.use(loadSession);

  const api = Router();
  api.use('/health', healthRouter());
  api.use('/auth', authRouter(limiters));
  api.use('/categories', categoriesRouter());
  api.use('/products', productsRouter());
  api.use('/cart', cartRouter());
  api.use('/addresses', addressesRouter());
  api.use('/checkout', checkoutRouter(gateway, limiters));
  api.use('/payments', paymentsRouter(gateway));
  api.use('/orders', ordersRouter(gateway));
  api.use('/admin', adminRouter(storage));
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
