# Roopaank — Sprint Plan (Build 1: React + Express)

> Source: `docs/SPEC.md` v1.0 · Workflow: `CLAUDE.md` · Created: 2026-10-07
> Ticket IDs (`ROO-n`) are used in branch names, PR titles and commits, e.g. `feature/Roopaank-ROO-14-auth-api`.

## How this plan works

- **Sprint length:** 2 weeks. 11 sprints (S0–S10), about 22 weeks of part-time work.
- **Estimates:** story points (1 = under 2 h, 2 = half a day, 3 = about 1 day, 5 = 2–3 days, 8 = about a week). If something is bigger than 8, split it.
- **Ticket types:** `feat` (user-facing), `tech` (infra/foundation), `test`, `docs`, `spike` (time-boxed research).
- **Definition of Done** for every ticket: `docs/SPEC.md` §10 quality gate + `CLAUDE.md` feature flow (CI green → PR to `dev` → staging verified → PR to `main`).
- **Sprint ritual (solo version):** at sprint start, pick tickets and write the sprint goal. At sprint end, demo on staging, write a short retro (what went well, what to change) at the bottom of this file, then release `dev → main`.
- Tickets marked ⚠️ depend on an open decision or a spec gap. Resolve it before starting that ticket.

---

## Sprint 0 — Decisions & project setup

**Goal:** every blocking decision is made and the repo is ready for the PR workflow.

| ID | Type | Title | Pts | Acceptance criteria |
|---|---|---|---|---|
| ROO-1 | docs | Resolve open decisions | 2 | D2–D11 in SPEC §13 marked Confirmed/changed. Shipping fee fixed. Redux vs Zustand chosen (✅ Redux Toolkit, 2026-10-09). Hosting chosen (see ROO-2). Spec and CLAUDE.md consistent. |
| ROO-2 | spike | ⚠️ Choose staging/production hosting before AWS | 2 | Written decision in SPEC for web + API + DB hosting for S1–S9 (e.g. Vercel + Render/Railway + Neon, all free tier, no card). AWS stays S10. CLAUDE.md "Vercel" references updated to match. |
| ROO-3 | tech | GitHub repo + branches | 2 | Repo created. `.gitignore` covers `.env*` (except `.env.example`). Initial commit on `main`. `dev` branch created. Branch protection or documented manual discipline (GitHub Free limits protection on private repos). |
| ROO-4 | tech | Ticket tracking board | 1 | GitHub Issues + Projects board (or Jira) with columns Backlog / Sprint / In progress / In review / On staging / Done. All tickets in this file created as issues. |
| ROO-5 | docs | PR + issue templates | 1 | `.github/pull_request_template.md` with the CLAUDE.md PR checklist. Bug and feature issue templates. |
| ROO-6 | docs | ⚠️ Spec gap: legal & policy pages | 2 | SPEC updated with Privacy Policy, Terms, Shipping Policy, Refund/Return Policy and Contact pages. Razorpay requires these for live activation. Content owner identified. |

**Sprint 0 total: 10 pts**

---

## Sprint 1 — Foundation & CI/CD

**Goal:** an empty but production-shaped monorepo where a trivial change flows feature → CI → `dev` → staging URL.

| ID | Type | Title | Pts | Acceptance criteria |
|---|---|---|---|---|
| ROO-7 | tech | Monorepo with npm workspaces | 3 | `apps/web` (current Vite app moved here), `apps/api`, `packages/shared`. Root scripts: `dev`, `lint`, `typecheck`, `test`, `build`, run for all workspaces. |
| ROO-8 | tech | Tooling baseline | 2 | Strict `tsconfig` (shared base). oxlint + Prettier configured. `.editorconfig`. Node version pinned (`.nvmrc` + `engines`). |
| ROO-9 | tech | Express API skeleton | 5 | `GET /api/health` returns status + version. helmet, CORS (web origin only), JSON body limit, pino logger with request ID, central error handler returning the SPEC §7.1 shape, 404 handler, graceful shutdown. |
| ROO-10 | tech | Env config validation | 2 | API config parsed with Zod at startup; process exits with a clear message if invalid. `.env.example` committed for web and API. |
| ROO-11 | tech | Postgres + Prisma via Docker Compose | 3 | `docker compose up` starts Postgres (and optionally API + web). Prisma initialised, first empty migration, `db:migrate`, `db:seed`, `db:reset` scripts. Separate test database. |
| ROO-12 | test | Test setup | 3 | Jest in api, web and shared (TypeScript via ts-jest or @swc/jest; CSS/asset mocks and jsdom for web). React Testing Library for components. Supertest for API. Playwright installed in `apps/web/e2e`. One sample test each. Coverage report generated. |
| ROO-13 | tech | CI pipeline (GitHub Actions) | 3 | Runs on push to `feature/*`, `fix/*`, `hotfix/*` and on PRs to `dev`/`main`: install (cached) → lint → typecheck → test (with Postgres service) → build. Required status check on `dev` and `main`. |
| ROO-14 | tech | ⚠️ Staging deployment (CD) | 5 | Merge to `dev` auto-deploys web + API + migrations to staging (host chosen in ROO-2). Staging has its own DB and secrets. Staging URL in README. |
| ROO-15 | tech | Production deployment pipeline | 3 | Merge to `main` deploys to production env (separate DB/secrets). Deploy only after CI passes. Rollback steps documented. |
| ROO-16 | tech | Dependabot + npm audit | 1 | Dependabot for npm and GitHub Actions. `npm audit --audit-level=high` in CI. |
| ROO-17 | docs | README | 1 | Setup, scripts, env vars, architecture diagram link, branching workflow summary. |

**Sprint 1 total: 31 pts**

---

## Sprint 2 — Design system & app shell

**Goal:** the site looks like Roopaank (from the mockup) with a working layout, routing and data-fetching foundation.

| ID | Type | Title | Pts | Acceptance criteria |
|---|---|---|---|---|
| ROO-18 | tech | Tailwind + shadcn/ui setup | 2 | Tailwind configured. shadcn/ui initialised. Base components added only as needed (Button, Input, Card, Dialog, Toast). |
| ROO-19 | feat | Brand theme | 3 | Design tokens from `docs/roopaank.png`: maroon primary, cream background, gold accent, serif display + sans body fonts, spacing and radius scale. Contrast checked to WCAG AA. |
| ROO-20 | tech | Routing + providers | 2 | React Router with all SPEC §8.2 routes as placeholders. QueryClientProvider. Error boundary. 404 page. Scroll restoration. |
| ROO-21 | tech | API client | 2 | Typed `fetch` wrapper: base URL from env, `credentials: 'include'`, parses SPEC error shape into a typed `ApiError`. |
| ROO-22 | feat | Layout: announcement bar, header, footer | 5 | Matches mockup. Responsive (mobile menu). Search box, account and cart icons (cart count wired later). Footer links to policy pages. Keyboard accessible. |
| ROO-23 | feat | Shared UI states | 2 | Reusable loading skeleton, empty state, error state (with retry) and toast notifications. |
| ROO-24 | tech | Money helpers in `packages/shared` | 2 | `formatINR(paise)`, `discountPercent(price, compareAt)`. Unit tests for rounding and edge cases. |

**Sprint 2 total: 18 pts**

---

## Sprint 3 — Authentication

**Goal:** customers can register, log in and log out securely; admin routes are protected.

| ID | Type | Title | Pts | Acceptance criteria |
|---|---|---|---|---|
| ROO-25 | tech | User + Session schema | 2 | Prisma models per SPEC §6. Unique email (case-insensitive). Migration committed. |
| ROO-26 | feat | Register / login / logout / me API | 5 | SPEC §7.2. argon2 hashing. Session token stored hashed. Cookie `httpOnly`, `Secure` (non-local), `SameSite=Lax`, expiry. Generic error on bad credentials. |
| ROO-27 | tech | Auth middleware + guards | 3 | `requireUser` and `requireAdmin` middleware. Expired/revoked sessions rejected. Origin check on mutating routes (CSRF). |
| ROO-28 | tech | Rate limiting | 2 | Login and register limited per IP + email. 429 returned in SPEC error shape. |
| ROO-29 | tech | Admin seed CLI | 1 | `npm run admin:create` creates an ADMIN from env/args. No public way to become admin. |
| ROO-30 | feat | Login & register pages | 3 | React Hook Form + shared Zod schemas. Field errors, server errors, loading state. Redirect back to the original page after login. |
| ROO-31 | feat | Auth state + protected routes (web) | 3 | `useMe()` query. Header shows account menu/logout. `/account`, `/orders`, `/checkout` redirect to login; `/admin/*` shows 403 for non-admins. |
| ROO-32 | test | Auth tests | 3 | Integration: register, duplicate email, login success/fail, logout, expired session, admin guard 403, rate limit. |

**Sprint 3 total: 22 pts**

---

## Sprint 4 — Catalog backend & admin API

**Goal:** products and categories can be managed through the API and served to the storefront.

| ID | Type | Title | Pts | Acceptance criteria |
|---|---|---|---|---|
| ROO-33 | tech | Category, Product, ProductImage schema | 3 | Per SPEC §6 with indexes and DB CHECK constraints (`price > 0`, `stockQuantity >= 0`, `compareAtPrice > price`). |
| ROO-34 | tech | Seed data | 2 | 7 categories (SPEC §1.5) + ~20 sample products with images, matching the mockup. |
| ROO-35 | feat | Public catalog API | 5 | `GET /categories`, `GET /products` (pagination, category, search `q`, sort, featured), `GET /products/:slug`. Only active items. Query params validated. |
| ROO-36 | feat | Admin category API | 2 | CRUD; DELETE = deactivate; unique slug → 409. |
| ROO-37 | feat | Admin product API | 5 | Create/update/deactivate, stock updates, slug generation, compare-at validation. Admin only. |
| ROO-38 | feat | ⚠️ Product image upload | 5 | `POST /admin/products/:id/images`: type (jpg/png/webp) and size limits, stored on local disk in dev (storage from D11), alt text required, reorder, delete. |
| ROO-39 | test | Catalog tests | 3 | Integration tests for filters, pagination, inactive hidden, admin guard, validation errors. |

**Sprint 4 total: 25 pts**

---

## Sprint 5 — Storefront

**Goal:** customers can browse, search and view products on a page that matches the mockup.

| ID | Type | Title | Pts | Acceptance criteria |
|---|---|---|---|---|
| ROO-40 | feat | Product card | 2 | Image, name, price, struck-through compare-at price, % OFF badge, Add to cart button. No wishlist and no stars (D5). |
| ROO-41 | feat | Homepage | 5 | Hero carousel (accessible, pausable), "Our Collection" (featured), category tiles, trust/shipping/returns section. Loading/empty/error states. |
| ROO-42 | feat | Product listing page | 5 | Grid, category filter, sort, pagination. Filters stored in URL query params. Empty and error states. |
| ROO-43 | feat | Search | 3 | Header search → `/products?q=`. Debounced input. "No results" state. |
| ROO-44 | feat | Product detail page | 5 | Gallery, price block, material/details, stock status, quantity selector, Add to cart / Buy now (wired in S6), delivery and return info. Artificial-jewellery disclosure visible. 404 state. |
| ROO-45 | feat | Basic SEO for SPA | 2 | Per-page `<title>`/meta description, Open Graph tags, favicon. Known SPA SEO limitation noted (fixed by Next.js in Build 2). |

**Sprint 5 total: 22 pts**

---

## Sprint 6 — Admin panel (catalog)

**Goal:** the owner can run the catalog without touching the database.

| ID | Type | Title | Pts | Acceptance criteria |
|---|---|---|---|---|
| ROO-46 | feat | Admin layout + dashboard | 3 | Sidebar nav, admin-only. Dashboard shows counts (products, low stock, orders by status — orders wired in S9). |
| ROO-47 | feat | Admin categories page | 3 | List, create, edit, deactivate with confirmation. |
| ROO-48 | feat | Admin products list | 3 | Table with search, category filter, active toggle, stock column, low-stock highlight, pagination. |
| ROO-49 | feat | Admin product form | 5 | Create/edit with all SPEC §6 fields, price input in ₹ converted to paise, validation, image upload/reorder/alt text. Material field required. |
| ROO-50 | test | Admin catalog component tests | 2 | Form validation and submit behaviour with mocked API. |

**Sprint 6 total: 16 pts**

---

## Sprint 7 — Cart & addresses

**Goal:** logged-in customers can build a cart and save delivery addresses.

| ID | Type | Title | Pts | Acceptance criteria |
|---|---|---|---|---|
| ROO-51 | tech | Cart + Address schema | 2 | Per SPEC §6. Unique (cartId, productId). |
| ROO-52 | feat | Cart API | 5 | SPEC §7.4. Re-checks existence, active status, stock and current price on every call. Quantity limits. Returns computed subtotal and per-item stock warnings. |
| ROO-53 | tech | Pricing service in `packages/shared` | 3 | Pure functions: line total, subtotal, shipping (D6 rule), order total. 100% unit-test coverage. |
| ROO-54 | feat | Cart page + header count | 5 | Quantity controls, remove, price summary, free-shipping progress ("Add ₹X more for free shipping"), empty state, out-of-stock warnings. Optimistic updates with rollback. |
| ROO-55 | feat | Add to cart / Buy now wiring | 2 | From card and detail page. Logged-out users go to login, then return (D7). Success toast. |
| ROO-56 | feat | Address API + account addresses page | 5 | SPEC §7.5. 6-digit PIN validation, Indian state list, phone validation, one default address, own addresses only. |
| ROO-57 | test | Cart & address tests | 3 | Stock limits, inactive product, price changes, other users' cart/address → 404. |

**Sprint 7 total: 25 pts**

---

## Sprint 8 — Checkout & payments

**Goal:** a customer can pay with Razorpay (test mode) and their order is confirmed safely.

| ID | Type | Title | Pts | Acceptance criteria |
|---|---|---|---|---|
| ROO-58 | tech | Order, OrderItem, Payment, WebhookEvent schema | 3 | Per SPEC §6. Snapshots, unique provider IDs, order number generator. |
| ROO-59 | feat | Checkout API | 5 | `POST /checkout`: validates cart, stock and address; computes totals on the server; creates PENDING order + Razorpay order in a transaction-safe way; rate-limited. |
| ROO-60 | feat | Payment verify API | 5 | Signature HMAC check, amount check, idempotent. Marks PAID, decrements stock with conditional update in a transaction, confirms order, clears cart. Insufficient stock → `needsAttention` (D8). |
| ROO-61 | feat | Razorpay webhook | 5 | Raw-body signature verification, `WebhookEvent` dedupe, handles `payment.captured` / `payment.failed`, same outcome as verify. |
| ROO-62 | feat | Checkout page | 5 | Address select/add, order summary from server, Razorpay Checkout modal, loading/disabled states, no double submit. |
| ROO-63 | feat | Payment failure & retry | 3 | PAYMENT_FAILED shown with retry. Retry reuses the order (PAYMENT_FAILED → PENDING). Modal dismissed handled. |
| ROO-64 | feat | Order success page | 2 | Order number, summary, view-order CTA. Reached only for the user's own confirmed order. |
| ROO-65 | test | Checkout & payment tests | 5 | Tampered client total ignored, bad signature rejected, duplicate verify/webhook idempotent, stock race, amount mismatch. |

**Sprint 8 total: 33 pts** (heaviest sprint; move ROO-63 to S9 if needed)

---

## Sprint 9 — Orders & admin operations

**Goal:** customers can track orders; admin can fulfil them end to end.

| ID | Type | Title | Pts | Acceptance criteria |
|---|---|---|---|---|
| ROO-66 | tech | Order status state machine | 3 | Transition table from SPEC §3.1 as a pure function. Invalid → 409. Exhaustive unit tests. |
| ROO-67 | feat | Customer orders API + pages | 5 | `/orders` list (paginated), `/orders/:id` with status timeline, items, address and support contact for returns. Own orders only. |
| ROO-68 | feat | Admin orders API | 3 | List with status filter + pagination, detail, status update via state machine, `needsAttention` filter. |
| ROO-69 | feat | Admin orders pages | 5 | Table, filters, detail view, status change with confirmation, needs-attention badge. |
| ROO-70 | feat | Admin customers page | 2 | Paginated list (name, email, joined, order count). No sensitive data exposed. |
| ROO-71 | feat | Dashboard numbers | 2 | Orders by status, today's orders, low-stock products. |
| ROO-72 | test | Orders tests | 3 | Ownership checks, admin guard, transition rules, return window (7 days). |

**Sprint 9 total: 23 pts**

---

## Sprint 10 — Hardening & production launch

**Goal:** the MVP is tested end to end, secure, accessible and live with real payments.

| ID | Type | Title | Pts | Acceptance criteria |
|---|---|---|---|---|
| ROO-73 | test | E2E: customer journey | 5 | Playwright: home → product → cart → checkout → Razorpay test payment → confirmation → order page. Runs in CI against a seeded DB. |
| ROO-74 | test | E2E: admin journey | 3 | Login → create product → update → view order → update status. |
| ROO-75 | test | Security review | 3 | SPEC §9 checklist verified: headers, CORS, CSRF, rate limits, authz on every route, no secrets in bundle/logs, `npm audit` clean. Findings fixed or ticketed. |
| ROO-76 | test | Accessibility review | 2 | Keyboard-only run of both journeys, axe checks, contrast, alt text. |
| ROO-77 | test | Performance review | 2 | Lighthouse on home/listing/detail (target ≥ 90 performance on mobile). Images sized/lazy-loaded. Bundle split by route. DB queries checked for N+1. |
| ROO-78 | feat | ⚠️ Legal & policy pages | 2 | Pages from ROO-6 published and linked in footer and checkout. |
| ROO-79 | tech | Monitoring & backups | 3 | Error tracking (e.g. Sentry free tier), uptime check on `/api/health`, DB automated backups + one test restore done. |
| ROO-80 | tech | Production go-live | 3 | Razorpay live keys (KYC done), domain + HTTPS, production env vars, live ₹1 test order placed and refunded, launch checklist completed. |

**Sprint 10 total: 23 pts**

---

## Sprint 11+ — AWS migration (learning track)

**Goal:** move staging, then production, to AWS using infrastructure-as-code. Start only when the AWS account (with budget alerts) exists.

| ID | Type | Title | Pts | Acceptance criteria |
|---|---|---|---|---|
| ROO-81 | tech | AWS account baseline | 2 | Root MFA, IAM admin user, budget alerts ($5/$20/$50), region chosen (ap-south-1). |
| ROO-82 | tech | Terraform setup | 3 | Remote state (S3 + lock), `staging` and `production` workspaces/dirs, CI `terraform plan` on PR. |
| ROO-83 | tech | Dockerise API | 3 | Multi-stage Dockerfile, non-root user, health check, image pushed to ECR from CI. |
| ROO-84 | tech | RDS PostgreSQL | 3 | Private RDS, automated backups, credentials in SSM/Secrets Manager, migrations run in the deploy pipeline. |
| ROO-85 | tech | S3 + CloudFront | 3 | Product images and the web build served via CloudFront. Uploads via presigned URLs. |
| ROO-86 | tech | API hosting | 5 | EC2 + Docker first, then ECS Fargate + ALB. HTTPS via ACM. No NAT Gateway. |
| ROO-87 | tech | CloudWatch | 2 | Structured logs, alarms on 5xx rate, latency and RDS CPU/storage. |
| ROO-88 | tech | Cutover | 3 | Staging moved and verified, then production with a rollback plan. Old host decommissioned. |

---

## Backlog (not in MVP — need a written requirement first)

Wishlist · Reviews/ratings · Product variants · Coupons · Guest checkout · Cash on delivery · Customer self-cancel/return requests · Transactional emails (order confirmation) · Shipping partner integration · Build 2 (Next.js).

> Transactional emails are the most likely early addition. Real stores send an order-confirmation email. Consider promoting this into the spec before launch.

---

## Summary

| Sprint | Focus | Pts |
|---|---|---|
| S0 | Decisions & setup | 10 |
| S1 | Foundation & CI/CD | 31 |
| S2 | Design system & shell | 18 |
| S3 | Authentication | 22 |
| S4 | Catalog backend | 25 |
| S5 | Storefront | 22 |
| S6 | Admin catalog | 16 |
| S7 | Cart & addresses | 25 |
| S8 | Checkout & payments | 33 |
| S9 | Orders & admin ops | 23 |
| S10 | Hardening & launch | 23 |
| S11+ | AWS migration | 24 |

---

## Retro log

<!-- After each sprint: date · what went well · what didn't · one change for next sprint -->
