# Roopaank — Project Specification

> Version: 1.1 (draft) · Last updated: 2026-10-09
> Supersedes the technology/architecture sections of `docs/CLAUDE.pdf`. Product rules are carried over unchanged.
> Design reference: `docs/roopaank.png` (homepage mockup).

---

## 0. How to read this document

- Sections 1–3 (Product), 6 (Data Model), 7 (API Contract) and 8 (UI/UX) are **framework-agnostic**. They apply to both builds described below.
- Section 4 (Technology) and 5 (Architecture) describe **Build 1: React + Express**. Build 2 (Next.js) will get its own architecture section when it starts.
- Items marked **[DECISION]** are proposed defaults that need owner confirmation. Items marked **[OPEN]** must be resolved before the related phase starts.
- Change protocol: if a requirement changes → explain impact → update this file → then change code. Never silently change architecture or scope.

### Project goals

1. **Product goal:** a production-quality MVP D2C store selling artificial/imitation jewellery under the Roopaank brand.
2. **Learning goal (primary):** learn how real production applications are built and operated — Git workflow, code review, CI/CD, containers, environments, migrations, infrastructure-as-code, monitoring and security.

### Two builds

| | Build 1 (now) | Build 2 (later) |
|---|---|---|
| Frontend | React SPA (Vite) | Next.js |
| Backend | Separate Node.js API (Express) | Next.js Route Handlers (or reuse Build 1 API) |
| Purpose | Learn React + backend fundamentals | Learn Next.js, SSR, full-stack framework patterns |

Build 2 reuses this spec's product, data model and API contract. Only architecture changes.

---

## 1. Product

### 1.1 Positioning (non-negotiable)

- Products are **artificial/imitation jewellery**.
- Never represent a product as real gold, real silver or another precious metal unless factually true for that specific product.
- Material and specification information must be accurate and visible. Only publish information actually known for a product.

### 1.2 Primary customer flow

Home → Product Listing → Product Details → Cart → Checkout → Address → Payment → Order Confirmation → Order Tracking

### 1.3 MVP scope

**Customer can:**
- Browse products and categories
- Search products
- View product details and images
- Select quantity
- Add / remove / update cart items
- Register, log in, log out
- Add and manage delivery addresses
- Check out and pay online (Razorpay)
- View their orders and order status

**Admin can:**
- Log in to an admin area
- Create / edit / deactivate products and categories
- Upload and order product images
- Manage stock
- View orders and update order status
- View customers

### 1.4 Non-goals (not in MVP)

Mobile app · multi-vendor · international shipping · multi-currency · loyalty points · referrals · AI chatbot / recommendations · advanced analytics · subscriptions · coupon engine · **wishlist** · **product reviews/ratings** · **product variants** · cash on delivery · guest checkout.

Anything here needs a written requirement before being built.

### 1.5 Categories (initial)

Earrings · Necklace · Necklace Sets · Bangles · Rings · Bracelets · Other

---

## 2. Business rules

### 2.1 Money

- All amounts are stored and calculated as **integers in paise** (₹1 = 100 paise). No floating-point maths for money.
- Currency: INR only.
- UI formats paise → `₹1,299` using `Intl.NumberFormat('en-IN')`.

### 2.2 Pricing

- `price` = selling price. `compareAtPrice` (optional) = original MRP shown struck through; must be greater than `price` if set.
- Discount badge ("35% OFF") is derived: `round((compareAtPrice − price) / compareAtPrice × 100)`. Never stored.
- `discountAmount` on orders is **0** in MVP (no coupons). Field exists for later.

### 2.3 Shipping **[DECISION]**

- Orders with subtotal **≥ ₹999** → free shipping (matches mockup banner).
- Orders below ₹999 → flat shipping fee of **₹79** (confirmed 2026-10-09).
- India-only delivery. Postal code must be a valid 6-digit Indian PIN.

### 2.4 Returns **[DECISION]**

- 7-day return window from delivery (matches mockup banner).
- MVP: customer requests return by contacting support (email/WhatsApp shown on the order page). Admin moves the order through `RETURN_REQUESTED → RETURNED → REFUNDED` manually. Refunds are processed in the Razorpay dashboard, not via API, in MVP.

### 2.5 Cancellation **[DECISION]**

- Customer cannot self-cancel in MVP. Admin can cancel orders in `CONFIRMED` or `PROCESSING`.

### 2.6 Stock **[DECISION]**

- Stock is checked when adding to cart and at checkout, but **only decremented when payment is verified**, inside a single DB transaction using a conditional update (`stockQuantity >= qty`).
- If stock is insufficient at payment verification (rare race), the order is marked `CONFIRMED` with an admin flag `needsAttention = true` for manual refund/resolution. No automatic refunds in MVP.

### 2.7 Accounts

- Login required to check out. Cart is stored server-side per user.
- Anonymous visitors can browse; "Add to cart" while logged out redirects to login, then returns to the product. **[DECISION]**
- Admin users are created via a seed/CLI script, never via public registration.

---

## 3. Order lifecycle

### 3.1 Order status

```
PENDING ──(payment verified)──▶ CONFIRMED ──▶ PROCESSING ──▶ SHIPPED ──▶ OUT_FOR_DELIVERY ──▶ DELIVERED
   │                               │              │                                              │
   └──(payment failed)──▶ PAYMENT_FAILED          └──▶ CANCELLED                                 └──▶ RETURN_REQUESTED ──▶ RETURNED ──▶ REFUNDED
```

Allowed transitions (enforced server-side, unit-tested):

| From | To |
|---|---|
| PENDING | CONFIRMED (system only), PAYMENT_FAILED (system only) |
| PAYMENT_FAILED | PENDING (customer retries payment) |
| CONFIRMED | PROCESSING, CANCELLED |
| PROCESSING | SHIPPED, CANCELLED |
| SHIPPED | OUT_FOR_DELIVERY, DELIVERED |
| OUT_FOR_DELIVERY | DELIVERED |
| DELIVERED | RETURN_REQUESTED (within 7 days) |
| RETURN_REQUESTED | RETURNED |
| RETURNED | REFUNDED |

Any other transition returns `409 INVALID_STATUS_TRANSITION`.

### 3.2 Payment status

`CREATED → PAID | FAILED`, plus `REFUNDED`. Only the server sets payment status, from verified Razorpay signatures or webhooks.

---

## 4. Technology (Build 1)

### 4.1 Frontend — `apps/web`

| Concern | Choice |
|---|---|
| Framework | React 19 + Vite + TypeScript |
| Routing | React Router |
| Styling | Tailwind CSS v4 (Vite plugin) + shadcn/ui (`base-nova` style, Base UI primitives, Lucide icons). Import alias `@/*` → `src/*`. **[DECISION 2026-10-09]** Base UI chosen over Radix/React Aria: shadcn's current default and actively maintained. |
| Server state | TanStack Query (React Query) |
| Client state | Redux Toolkit (client/UI state only; cart lives on server; no RTK Query — server state is React Query's job) |
| Forms | React Hook Form + Zod |
| Lint / format | oxlint + Prettier (single quotes, width 120; Markdown excluded). `.editorconfig`, LF line endings via `.gitattributes`, Node 22 pinned in `.nvmrc` + `engines` |

### 4.2 Backend — `apps/api` **[DECISION]**

| Concern | Choice |
|---|---|
| Runtime | Node.js (LTS) + TypeScript |
| HTTP framework | Express |
| Validation | Zod (schemas shared with frontend via `packages/shared`) |
| ORM / DB | Prisma + PostgreSQL |
| Auth | Email + password, argon2 hashing, server-side sessions stored in Postgres, `httpOnly` + `Secure` + `SameSite=Lax` cookie |
| Payments | Razorpay (test mode until production) |
| Testing | Jest (unit/integration), React Testing Library (components), Supertest (API), Playwright (E2E) |

### 4.3 Infrastructure

| Concern | Now (no card needed) | Later (AWS) |
|---|---|---|
| Local dev | Docker Compose: Postgres + API + web | — |
| Source control | Git + GitHub, PR-based workflow | — |
| CI | GitHub Actions: dependency audit, format check, lint, typecheck, test, build | + Docker image build/push to ECR |
| Hosting | Web: Vercel (free). API: Render web service (free). See §4.4 | EC2 (first), then ECS Fargate + ALB |
| Database | Local Postgres in Docker; Neon Postgres (free) for staging and production | RDS PostgreSQL |
| Images | Local disk in dev | S3 + CloudFront |
| Infra as code | — | Terraform |
| Secrets | `.env` (git-ignored), `.env.example` committed; hosted envs set them in the Vercel/Render dashboards | SSM Parameter Store / Secrets Manager |
| Logs/alerts | Console (structured JSON via pino); Render log viewer when hosted | CloudWatch |

**[OPEN]** Image storage before AWS exists: local disk is fine for development; production images require S3 (or Cloudinary free tier as a fallback). Render's free disk is wiped on every deploy and restart, so uploaded images will not survive there.

### 4.4 Hosting before AWS **[DECISION]** (ROO-2, 2026-10-09)

Owner decision: free plans only, no paid services and no custom domain. Hosted environments are for testing, not for real customers. Applies to sprints S1–S9; AWS replaces it in S10 (§12, D10).

| Part | Host | Notes |
|---|---|---|
| Web (`apps/web`, static Vite build) | Vercel, free plan | One project per environment (staging, production). |
| API (`apps/api`, Express) | Render web service, free plan | One service per environment. Sleeps after ~15 min idle; the first request after that is slow (cold start). |
| Database | Neon Postgres, free plan | Separate databases for staging and production; never shared. |

**Same-site cookies without a domain:** the browser calls the API only through the web app's own origin (`<web>.vercel.app/api/*`). A Vercel rewrite forwards `/api/*` to the Render service. The browser sees one site, so the `SameSite=Lax` session cookie works (§9). `WEB_ORIGIN` on the API is the Vercel URL. Razorpay webhooks may call the Render URL directly, because they use signature verification, not cookies.

**To verify on the first staging deploy** (checklist in `docs/runbooks/deploy.md`): the correct `TRUST_PROXY` hop count behind Vercel + Render (rate limiting by IP depends on it); that `Set-Cookie` and `Origin` pass through the rewrite unchanged.

**Rewrite target per environment:** `vercel.json` holds an `__API_ORIGIN__` placeholder; the deploy workflow replaces it with the environment's `API_ORIGIN` before building.

**Recorded shortcut (CLAUDE.md):** free plans with cold starts, `*.vercel.app` URLs and no uptime guarantee are not fit for real customers. Before accepting real orders or live Razorpay keys, move to a custom domain and a non-sleeping API plan, or to AWS (S10).

---

## 5. Architecture (Build 1)

### 5.1 High level

```
Browser ──▶ React SPA (apps/web) ──HTTP/JSON + cookie──▶ Express API (apps/api)
                                                            │
                                         routes → validation (Zod) → services → Prisma → PostgreSQL
                                                            │
                                               Razorpay · Image storage
```

### 5.2 Repository layout **[DECISION]**

npm workspaces monorepo:

```
roopaank/
├── apps/
│   ├── web/                # React SPA (Vite)
│   │   ├── src/
│   │   │   ├── app/        # router, providers, root layout
│   │   │   ├── pages/      # route-level components
│   │   │   ├── features/   # auth, products, cart, checkout, orders, account, admin
│   │   │   ├── components/ # ui/ (shadcn/ui primitives), layout/ (header, footer)
│   │   │   ├── hooks/      # hooks shared across features
│   │   │   ├── lib/        # api client, formatters
│   │   │   ├── store/      # Redux Toolkit store + slices (client-only UI state)
│   │   │   ├── styles/     # global styles, theme tokens
│   │   │   └── assets/
│   │   └── e2e/            # Playwright tests
│   └── api/
│       ├── prisma/         # schema.prisma, migrations/, seed
│       ├── src/
│       │   ├── config/     # env validation
│       │   ├── lib/        # prisma client, logger, razorpay client
│       │   ├── middleware/ # auth guards, error handler, request ID, rate limiting
│       │   └── modules/    # auth, users, categories, products, cart, addresses,
│       │                   # checkout, payments, orders, admin
│       │                   #   each: *.routes.ts, *.service.ts, *.repository.ts (if useful), *.test.ts
│       └── tests/helpers/  # test DB, factories
├── packages/
│   └── shared/src/         # schemas/, types/, money/
├── docs/                   # SPEC, SPRINTS, adr/, runbooks/
├── infra/terraform/        # AWS IaC (Sprint 11)
├── scripts/                # dev/ops scripts
├── docker-compose.yml      # (Sprint 1)
└── .github/                # workflows/, ISSUE_TEMPLATE/
```

Each folder has a README describing what belongs there.

### 5.3 Architecture rules

- Business logic lives in API services, never in React components or route handlers.
- Every external input (body, query, params, webhook) is validated with Zod.
- The server calculates price, subtotal, shipping, discount and total. Client-sent amounts are ignored.
- Payment success is only trusted from server-side signature verification or webhook.
- Admin routes are protected by server-side role checks, not just hidden in the UI.
- Prefer small focused modules; no generic abstractions for one-time code.
- Don't copy server state (products, orders) into Redux; that's React Query's job.

### 5.4 Environments

| Env | Purpose | Data |
|---|---|---|
| `local` | Development | Seeded fake data |
| `staging` | Pre-release testing. Deployed from `dev` to Vercel + Render + Neon (§4.4); AWS in S10 | Seeded test data, Razorpay test keys |
| `production` | Deployed from `main` to Vercel + Render + Neon (§4.4). Real customers only after the §4.4 shortcut is resolved | Own database; Razorpay test keys until go-live, live keys only after that |

Config is read from environment variables and validated at startup with Zod; the API refuses to start if config is invalid.

---

## 6. Data model

All tables have `id` (cuid/uuid), `createdAt`, `updatedAt` unless noted. Money fields are `Int` (paise).

### User
`name` · `email` (unique) · `phone` (optional) · `passwordHash` · `role` (`USER` | `ADMIN`)

### Session
`userId` · `tokenHash` (unique) · `expiresAt` · `userAgent` · `ip`

### Category
`name` · `slug` (unique) · `description` · `isActive`

### Product
`name` · `slug` (unique) · `description` · `categoryId` · `price` · `compareAtPrice?` · `material` · `colour?` · `size?` · `weightGrams?` · `careInstructions?` · `stockQuantity` · `isActive` · `isFeatured`

Indexes: `slug`, `categoryId`, `isActive`. `isFeatured` drives the homepage "Our Collection" section.

### ProductImage
`productId` · `url` · `altText` · `sortOrder`

### Address
`userId` · `fullName` · `phone` · `addressLine1` · `addressLine2?` · `city` · `state` · `postalCode` · `country` (default `IN`) · `isDefault`

### Cart / CartItem
Cart: `userId` (unique). CartItem: `cartId` · `productId` · `quantity`. Unique on (`cartId`, `productId`).
No price snapshot in cart; price is always read fresh from Product.

### Order
`orderNumber` (unique, human-readable, e.g. `RPK-20261007-0001`) · `userId` · `status` · `paymentStatus` · `subtotal` · `shippingAmount` · `discountAmount` · `totalAmount` · `shippingAddress` (JSON snapshot) · `needsAttention` (bool)

`orderNumber` = `RPK-` + IST date + value from the Postgres sequence `order_number_seq` (zero-padded to 4+ digits). The sequence is global, not reset daily, so numbers are unique under concurrent checkouts.

### OrderStatusHistory
`orderId` · `status` · `createdAt` — append-only, one row per status change. Drives the customer order timeline (§8.2) and the 7-day return window (measured from the `DELIVERED` row). Added 2026-10-09 (ROO-100).

### OrderItem
`orderId` · `productId` · `productName` (snapshot) · `productImageUrl` (snapshot) · `quantity` · `unitPrice` (snapshot) · `totalPrice`

### Payment
`orderId` · `provider` (`RAZORPAY`) · `providerOrderId` (unique) · `providerPaymentId?` (unique) · `amount` · `status`

### WebhookEvent
`provider` · `eventId` (unique) · `type` · `processedAt` — used for webhook idempotency.

### Data rules
- Products and categories are soft-deleted (`isActive = false`), never hard-deleted once referenced by orders.
- Order items keep snapshots so historical orders stay correct after product edits.
- DB constraints (unique, foreign keys, `CHECK price > 0`, `CHECK stockQuantity >= 0`) are defined in migrations, not only in code. Also enforced: `compareAtPrice > price`, lowercase emails, positive quantities, `totalAmount = subtotal + shipping − discount`, `totalPrice = unitPrice × quantity`, and at most one default address per user (partial unique index).
- Limits: max 10 of one product per cart line; max 20 saved addresses per user; max 10 images per product (JPG/PNG/WebP, ≤ 5 MB, alt text required, type checked from file bytes).
- Cancelling an order (`CONFIRMED`/`PROCESSING` → `CANCELLED`) returns its items to stock, unless the order is `needsAttention` (stock may not have been taken; admin fixes by hand).
- Schema changes only via Prisma migrations committed to Git.

---

## 7. API contract

Base path: `/api`. JSON in/out. Auth via session cookie. All inputs validated.

### 7.1 Error shape

```json
{ "error": { "code": "PRODUCT_NOT_FOUND", "message": "Product not found", "details": {} } }
```
Never expose stack traces, SQL errors or secrets. Status codes: 400 validation · 401 not logged in · 403 not allowed · 404 not found · 409 conflict (stock, status transition) · 413 too large · 429 rate-limited · 500 unexpected · 502 payment provider unavailable.

Validation errors (`VALIDATION_ERROR`) put per-field messages in `details.fieldErrors`. Every response carries an `X-Request-Id` header (also in the logs) for support/debugging.

**Success responses:** a single resource is returned as the JSON object itself; lists as `{ items, page, limit, total }`; deletes return `204` with no body. Cart mutations return the updated cart. Response types live in `packages/shared/src/types/api.ts`. Money is integer paise; dates are ISO 8601 strings. Requests resolving another user's resource (cart item, address, order) return 404, not 403.

### 7.2 Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | name, email, password → creates USER + session |
| POST | `/auth/login` | sets session cookie |
| POST | `/auth/logout` | deletes session |
| GET | `/auth/me` | current user or 401 |

Login and register are rate-limited (login: 10 per 15 min per IP + email; register: 5 per hour per IP; checkout: 10 per 10 min per user). Sessions last 30 days (`SESSION_TTL_DAYS`); the cookie is `rpk_session`.

### 7.3 Catalog (public)
| Method | Path | Notes |
|---|---|---|
| GET | `/categories` | active categories |
| GET | `/products` | `?page&limit&category&q&sort=newest|price_asc|price_desc&featured` → `{ items, page, limit, total }` |
| GET | `/products/:slug` | active product with images, or 404 |

### 7.4 Cart (customer)
| Method | Path | Notes |
|---|---|---|
| GET | `/cart` | items with current price, stock status, computed subtotal |
| POST | `/cart/items` | `{ productId, quantity }` — checks exists, active, stock |
| PATCH | `/cart/items/:id` | `{ quantity }` |
| DELETE | `/cart/items/:id` | |

### 7.5 Addresses (customer)
`GET /addresses` · `POST /addresses` · `PATCH /addresses/:id` · `DELETE /addresses/:id`

### 7.6 Checkout & payments (customer)
| Method | Path | Notes |
|---|---|---|
| POST | `/checkout` | `{ addressId }` → validates cart & stock, calculates totals, creates `PENDING` order + Razorpay order → returns `{ orderId, orderNumber, razorpayOrderId, amount, currency, keyId }` |
| POST | `/payments/verify` | `{ razorpayOrderId, razorpayPaymentId, signature }` → verifies HMAC signature, checks amount, marks paid, decrements stock, confirms order. Idempotent. |
| POST | `/payments/webhook` | Razorpay webhook; verifies webhook signature; idempotent via `WebhookEvent`. Same outcome as verify if the browser never returns. |

Webhook events handled: `payment.captured` / `order.paid` (confirm, as verify) and `payment.failed` (order → `PAYMENT_FAILED`); others are recorded and ignored. Razorpay **auto-capture must be enabled** in the dashboard: verify accepts `captured` and `authorized` payments.

### 7.7 Orders (customer)
`GET /orders` (own orders, `?page&limit`) · `GET /orders/:id` (own order only, else 404; includes items, address snapshot and `statusHistory`)

`POST /orders/:id/pay` — payment retry (ROO-63). For an own `PENDING` or `PAYMENT_FAILED` order: moves `PAYMENT_FAILED → PENDING` and returns the same shape as `/checkout`, reusing the original Razorpay order (so the amount cannot change). Otherwise `409 ORDER_NOT_PAYABLE`.

### 7.8 Admin (role ADMIN)
| Method | Path |
|---|---|
| GET/POST | `/admin/products` (GET: `?page&limit&q&categoryId&isActive`) |
| GET/PATCH/DELETE | `/admin/products/:id` (DELETE = deactivate; GET includes inactive products) |
| POST | `/admin/products/:id/images` (multipart: `image` file + `altText`) · DELETE `/admin/images/:id` |
| PUT | `/admin/products/:id/images/order` (`{ imageIds }` — every image id of the product, in display order) |
| GET/POST | `/admin/categories` · PATCH/DELETE `/admin/categories/:id` |
| GET | `/admin/orders` (`?status&needsAttention&page&limit`) · GET `/admin/orders/:id` |
| PATCH | `/admin/orders/:id/status` (`{ status }`, transition rules from §3.1) |
| GET | `/admin/customers` (`?q&page&limit`; name, email, joined, order count only) |
| GET | `/admin/dashboard` (orders by status, today's paid orders (IST), needs-attention count, active products, low-stock list ≤ 5) |

`GET /admin/products/:id`, the image-order endpoint and `/admin/dashboard` were added 2026-10-09 (ROO-100) because the admin edit form (ROO-49), image reorder (ROO-38) and dashboard (ROO-71) need them.

---

## 8. UI / UX

### 8.1 Design direction
Premium, clean Indian D2C look per `docs/roopaank.png`: maroon primary, cream backgrounds, serif display headings, gold accents. Must communicate quality, trust, clear pricing and transparent product information.

**Deviations from mockup for MVP:** no wishlist heart icons, no star ratings (non-goals, §1.4). **[DECISION]**

### 8.2 Pages

| Route | Contents |
|---|---|
| `/` | Announcement bar (free shipping ≥ ₹999 · 7-day returns · secure payments) · header (logo, search, account, cart count) · hero carousel · "Our Collection" (featured products) · categories · trust info · footer |
| `/products` | Search, category filter, sort, product grid, pagination |
| `/products/:slug` | Image gallery, name, price + compare-at + % off, material & details, stock status, quantity, Add to cart, Buy now, delivery & return info |
| `/cart` | Items, quantity controls, remove, price summary, checkout CTA |
| `/checkout` | Address select/add, order summary, pay button (Razorpay) |
| `/order/success/:id` | Confirmation, order number, summary, view-order CTA |
| `/orders`, `/orders/:id` | Order list; detail with status timeline, items, address |
| `/account` | Profile, addresses |
| `/login`, `/register` | Auth forms |
| `/admin/*` | Dashboard, products, categories, orders, customers |

### 8.3 Required UI states
Every data view handles: loading · empty · error · success. Plus: out of stock · invalid input · payment failure (with retry) · order failure.

### 8.4 Responsive & accessibility
Mobile-first (mobile, tablet, desktop). Semantic HTML, keyboard navigation, visible focus, labelled form fields, meaningful alt text, WCAG AA contrast.

---

## 9. Security

- Passwords hashed with argon2; never logged.
- Session cookies: `httpOnly`, `Secure` (in non-local envs), `SameSite=Lax`; sessions expire and are revocable.
- CSRF: SameSite cookies + only JSON bodies accepted on mutating routes + `Origin` header check.
- CORS: only the web app origin allowed.
- Rate limiting on auth and checkout endpoints.
- `helmet` security headers on the API.
- Razorpay: verify payment signature and webhook signature server-side; validate amount matches order; handle webhooks idempotently; never store card data.
- Secrets only in environment variables; `.env` is git-ignored; never commit keys.
- Admin authorization checked on every admin route server-side.
- Dependency scanning in CI: `npm run audit:deps` (audit-ci) fails on any high or critical advisory not in `audit-ci.jsonc`. Dependabot (`.github/dependabot.yml`) opens weekly update PRs to `dev` for npm and GitHub Actions.

**Known limitations (recorded per CLAUDE.md):**
- Rate-limit counters are in process memory: correct for one API instance only. Running several instances needs a shared store (e.g. Redis).
- `SameSite=Lax` session cookies are only sent if the web app and API are on the **same site** (e.g. `roopaank.in` + `api.roopaank.in`). Hosting them on unrelated domains (e.g. `*.vercel.app` + `*.onrender.com`) would break login. ROO-2 solved this with a Vercel `/api/*` rewrite (§4.4).
- Three high-severity advisories are allowlisted in `audit-ci.jsonc` because no safe fix exists and none is in a runtime path: `mysql2` and `deepmerge-ts` in the Prisma CLI (we use PostgreSQL; fixed in Prisma 8, still RC), and `braces` in the shadcn CLI (build-time only). Each entry has a review date; remove it when Dependabot brings the fix.

---

## 10. Testing

| Level | Tool | Must cover |
|---|---|---|
| Unit | Jest (+ React Testing Library for components) | money/price/shipping calculation, order status transitions, stock rules, Zod schemas |
| Integration | Jest + Supertest + test Postgres | product, cart, checkout, payment verify/webhook, order APIs, auth guards |
| E2E | Playwright | Customer: home → product → cart → checkout → Razorpay test payment → confirmation. Admin: login → create product → update → view order → update status |

### Quality gate (a feature is "done" only when)
1. Requirement is in this spec.
2. Happy path, error, loading and empty states work.
3. Input validation exists.
4. Tests exist for important business logic.
5. CI is green on the PR.
6. No secrets exposed; security implications considered.
7. PR reviewed and merged; no unrelated features added.

---

## 11. Engineering workflow (production practice)

- **Git:** `main` is always deployable. Work on short-lived branches named per `CLAUDE.md` (`feature/Roopaank-ROO-123-title`, `fix/Roopaank-ROO-145-title`). Merge via Pull Request only.
- **Commits:** small and descriptive (Conventional Commits style: `feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- **CI (GitHub Actions) on every PR:** install → format check → lint → typecheck → unit/integration tests → build.
- **Database:** every schema change is a Prisma migration in the same PR as the code that needs it.
- **Docker:** `docker compose up` starts the full stack locally.
- **Docs:** this spec is updated in the same PR when behaviour changes.

---

## 12. Development plan

| Phase | Scope | Main learning |
|---|---|---|
| 0 — Spec | Finalise this document, resolve [OPEN]/[DECISION] items | Requirements thinking |
| 1 — Foundation | Git + GitHub, monorepo, move Vite app to `apps/web`, Express API skeleton, Prisma + Postgres in Docker Compose, env validation, error handler, logging, CI pipeline | Repo structure, Docker, CI |
| 2 — Auth | Register, login, logout, sessions, route guards, admin role, seed admin | Auth & security basics |
| 3 — Catalog | Categories, products, images, listing, search/filter, detail page, admin CRUD | REST APIs, React Query, forms |
| 4 — Cart | Server cart, add/update/remove, stock checks | State boundaries |
| 5 — Checkout | Addresses, totals, shipping rule, pending order | Transactions, server-side calculation |
| 6 — Payments | Razorpay test mode, verify, webhook, idempotency, failure/retry | Third-party integration, idempotency |
| 7 — Orders | Customer order history, admin order management, status transitions | State machines |
| 8 — Hardening | E2E tests, security review, accessibility review, performance | Quality |
| 9 — AWS | Terraform, EC2 → ECS, RDS, S3 + CloudFront, staging + production, CloudWatch alarms, budgets | Cloud & operations |

---

## 13. Decisions log

| ID | Decision | Status |
|---|---|---|
| D1 | Build 1 is React (Vite) SPA; Next.js rebuild later | ✅ Confirmed by owner (2026-10-07) |
| D2 | Backend: Express + Prisma + PostgreSQL in `apps/api` | ✅ Confirmed by owner (2026-10-09) |
| D3 | Monorepo with npm workspaces (`apps/web`, `apps/api`, `packages/shared`) | ✅ Confirmed by owner (2026-10-09) |
| D4 | Auth: own email/password + DB sessions (no third-party auth for Build 1) | ✅ Confirmed by owner (2026-10-09) |
| D5 | Wishlist, ratings/reviews, variants out of MVP; hidden from mockup UI | ✅ Confirmed by owner (2026-10-09) |
| D6 | Shipping: free ≥ ₹999, else flat ₹79 | ✅ Confirmed by owner (2026-10-09) |
| D7 | Login required for cart & checkout (no guest checkout) | ✅ Confirmed by owner (2026-10-09) |
| D8 | Stock decremented at payment verification | ✅ Confirmed by owner (2026-10-09) |
| D9 | No COD in MVP; online payment only | ✅ Confirmed by owner (2026-10-09) |
| D10 | Local-first development; AWS deployment in Phase 9 | Confirmed (no card until deploy) |
| D11 | Images: local disk in dev, S3 + CloudFront in production | ✅ Confirmed by owner (2026-10-09) |
| D12 | Client state: Redux Toolkit (replaces Zustand). Server state: React Query (TanStack Query) | ✅ Confirmed by owner (2026-10-09) |
| D13 | Testing: Jest + React Testing Library + Supertest (replaces Vitest); Playwright for E2E | ✅ Confirmed by owner (2026-10-09) |
| D14 | Hosting before AWS: Vercel (web) + Render (API) + Neon (Postgres), free plans, no custom domain, API reached via a Vercel `/api/*` rewrite (§4.4) | ✅ Confirmed by owner (2026-10-09) |
