# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Roopaank is an artificial-jewellery e-commerce site for India (prices in INR). It is a monorepo with two independent npm projects, each with its own `package.json` and lockfile. There is no root `package.json`, so run commands from inside `client/` or `server/`.

## client/ (React 19 + Vite 8, plain JS/JSX)

Stack: Redux Toolkit, TanStack Query, axios, react-router-dom 7, Tailwind 4. Linting uses oxlint and tests use Jest with jsdom.

```
npm run dev            # vite dev server
npm run build
npm run lint           # oxlint
npm test               # jest --runInBand
npx jest src/pages/Home.test.jsx            # single test file
npx jest -t "test name"                     # single test by name
npm run test:coverage  # fails below 80% global statements/branches/functions/lines
```

- Tests must live in `src/**/*.test.{js,jsx}`. CSS imports are mocked via `test/styleMock.cjs`, and the Jest timeout is raised to 20s for cold CI runners.
- `src/` is organised by feature (`features/{auth,cart,checkout,orders,products,...}`), with app wiring in `src/app/` (providers, router, store) and Redux slices in `src/store/`.

## server/ (Node + TypeScript, Prisma 7, PostgreSQL)

Only the database layer exists so far. There is no HTTP server or app entrypoint yet.

```
docker compose up -d        # local Postgres 16 on host port 5433 (5432 is often taken by a local install)
cp .env.example .env        # DATABASE_URL, SEED_ADMIN_PASSWORD (SEED_ADMIN_EMAIL optional)
npm run prisma:migrate      # migrate dev
npm run prisma:deploy       # migrate deploy
npm run prisma:generate
npm run db:seed             # idempotent; fails without SEED_ADMIN_PASSWORD
npm run prisma:studio
npm run typecheck           # tsc --noEmit
```

Things that need more than one file to understand:

- **Generated client:** it goes to `src/generated/prisma` (git-ignored). Run `prisma generate` after every schema change. `migrate dev --create-only` does not regenerate it, and a stale client makes `tsc` pass while runtime calls fail.
- **Prisma 7 setup:** the datasource URL lives in `prisma.config.ts`, not in `schema.prisma`. Clients are built with the `@prisma/adapter-pg` driver adapter (see `src/lib/prisma.ts`, the single shared instance, and `prisma/seed.ts`). Keep `prisma`, `@prisma/client` and `@prisma/adapter-pg` pinned to the same exact version.
- **Order numbers:** `Order` has only `orderSeq` (autoincrement, unique). The initial migration ends with a hand-written `ALTER SEQUENCE "Order_orderSeq_seq" RESTART WITH 10001;`, so the first order is 10001. If you regenerate the migration, re-append that line. `src/lib/orderNumber.ts` converts between `orderSeq` and `"RPK-10001"`.
- **Track Order security:** order numbers are sequential and guessable. Logged-in lookups must match `order.userId`. Public lookups need the order number plus phone or email, and both must match. A wrong number and wrong contact details return the same generic "not found". Check `parseOrderNumber` for `null` before querying.
- **Ratings:** `Product.rating` and `reviewCount` are cached values. They are kept in sync by `src/lib/productRating.ts` (`createReview`, `updateReview`, `deleteReview` run in transactions), not by DB triggers. Always change reviews through those helpers. Review rating (1–5) is validated there, not in the DB.
- **Money and discounts:** all money fields are `Decimal(10,2)`. There is no discount column, so calculate the percentage from `price` and `originalPrice`. Free shipping above ₹499 is app logic, and `shippingFee` defaults to 0.
- **Payments:** never store card, CVV or UPI data. `Order.paymentReference` holds gateway IDs only.
- **Seed:** upserts on slug and email. The admin upsert has an empty `update` so re-running never overwrites an existing admin's password.
- **Destructive commands:** `prisma migrate reset --force` is blocked when run by an AI agent. The local dev DB can be recreated with `docker compose down -v && docker compose up -d`.

## Workflow and CI

- `.github/workflows/ci.yml` runs lint, tests, coverage and build for **`client/` only**, on every push. Nothing in CI covers `server/` yet.
- The intended branch flow, from `.github/workflows/docs/ARCHITECTURE.md`, is `feature/*` → `dev` → `staging` → `main`. Each step needs a PR and CI, merging to `dev` deploys to staging, and `main` deploys to production on Vercel.

## Rules

- Never create, commit, push, merge, or delete branches unless explicitly asked.
- Never modify or print `.env` files or secrets. Only `.env.example` is committed.
- Check the existing stack before adding a dependency. Reuse existing components, hooks, and utilities.
- Keep changes focused on the task. No unrelated refactors or folder-structure changes.
- Never silently change business rules or database behavior. Ask first.
- After changes, run the relevant lint, test, typecheck, and build commands. Fix root causes; never disable or weaken checks or tests.

### Frontend

- Feature code in `src/features/`, shared UI in `src/components/`, providers/router/store setup in `src/app/`, Redux slices in `src/store/`.
- Server/API data uses TanStack Query. Redux is only for client-side state.
- Use the existing axios instance, never a new one.
- Follow existing Tailwind theme tokens.

### Testing

- Test business-critical features and add regression tests for bug fixes.
- Use React Testing Library and `userEvent`; test user-visible behavior.
- Keep the 80% global coverage threshold. Update affected tests instead of deleting them.

### Backend and database

- All DB access goes through `src/lib/` using the single Prisma instance in `src/lib/prisma.ts`.
- Always use the existing helpers for ratings, order numbers, and Track Order security (see sections above).
- Use transactions for multi-record updates.
- Every schema change needs a migration, followed by `npm run prisma:generate`.
- Never edit a migration that has been applied to a shared or production database. Preserve the `Order_orderSeq_seq` restart at 10001.
- Never run destructive DB commands against shared or production databases.

### API

- Validate auth and input before any DB call.
- Never return raw Prisma errors, stack traces, or sensitive fields.

### Git workflow

- Branches: `feature/<name>` or `fix/<name>` → PR into `dev`. Never push directly to `main`.
- Don't merge with failing CI. PR descriptions say what changed and how it was tested.
