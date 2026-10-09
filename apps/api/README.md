# @roopaank/api

Node.js + Express + Prisma + PostgreSQL API. See `docs/SPEC.md` §4.2, §5, §6, §7 and §9.

## Run locally

```bash
# from the repo root
npm install                      # also runs `prisma generate`
npm run db:up                    # Postgres in Docker on localhost:5434 (dev + test databases)
cp apps/api/.env.example apps/api/.env
npm run db:migrate -w @roopaank/api
npm run db:seed -w @roopaank/api # 7 categories + 20 sample products
npm run dev:api                  # http://localhost:4000/api/health
```

Create an admin (password comes from the environment, never a CLI argument):

```bash
# set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD in apps/api/.env, then
npm run admin:create -w @roopaank/api
```

## Scripts

| Script | What it does |
|---|---|
| `dev` | Run with reload (`tsx watch`), using `@roopaank/shared` source directly |
| `build` / `start` | Compile to `dist/` / run the compiled server (needs `@roopaank/shared` built first — the root `npm run build` does both) |
| `test` | Jest + Supertest integration tests against the `roopaank_test` database |
| `typecheck` / `lint` | `tsc` / `oxlint` |
| `db:migrate` | Create + apply a migration in dev (`prisma migrate dev`) |
| `db:deploy` | Apply committed migrations (staging/production) |
| `db:seed` / `db:reset` | Sample data / drop and recreate the dev DB |

## Layout

```
src/
├── app.ts        Express app: middleware order, routers. Takes the payment gateway and
│                 image storage as arguments so tests can pass fakes.
├── server.ts     Starts the HTTP server, graceful shutdown
├── config/       Env parsing and validation (Zod) — app refuses to start on bad config
├── lib/          Prisma client, logger, errors, validation, Razorpay gateway, image storage
├── middleware/   Session loading + guards, CSRF origin check, rate limits, error handler
├── modules/      One folder per business capability: *.routes.ts (HTTP) → *.service.ts (logic)
│   ├── auth/  categories/  products/  cart/  addresses/
│   ├── checkout/  payments/  orders/  users/  admin/  health/
├── scripts/      create-admin
└── generated/    Prisma client (git-ignored, rebuilt by `prisma generate`)
prisma/
├── schema.prisma
├── migrations/   Committed migrations — the only way the schema changes
└── seed.ts
tests/
├── setup-env.ts  Test environment (fake Razorpay keys, test DB)
└── helpers/      DB reset, factories, fake payment gateway, test app
```

Routes only parse/validate input and shape the HTTP response; all business rules live in services.

## Environment

See `.env.example`. Staging and production set real values in the host; never commit `.env`.
Razorpay **auto-capture** must be enabled, and the webhook URL is `POST /api/payments/webhook`
(events: `payment.captured`, `payment.failed`, `order.paid`).
