# @roopaank/api

Node.js + Express + Prisma + PostgreSQL API. See `docs/SPEC.md` §4.2, §5 and §7.

```
src/
├── config/       Env parsing and validation (Zod) — app refuses to start on bad config
├── lib/          Infrastructure clients: Prisma, logger, Razorpay
├── middleware/   Auth guards, error handler, request ID, rate limiting
└── modules/      One folder per business capability
    ├── auth/  users/  categories/  products/  cart/  addresses/
    └── checkout/  payments/  orders/  admin/
prisma/
├── schema.prisma
└── migrations/   Committed migrations — the only way schema changes
tests/
└── helpers/      Test DB setup, factories, authenticated request helpers
```

Each module follows the same shape:

```
modules/products/
├── products.routes.ts      HTTP layer: parse + validate input, call service, send response
├── products.service.ts     Business logic (no Express types here)
├── products.repository.ts  Prisma queries (only when it adds clarity)
└── products.test.ts
```
