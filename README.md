# Roopaank

D2C artificial/imitation jewellery store, built to production standards.

- Spec: [`docs/SPEC.md`](docs/SPEC.md)
- Sprint plan: [`docs/SPRINTS.md`](docs/SPRINTS.md)
- Rules for Claude: [`CLAUDE.md`](CLAUDE.md)

## Repository layout

```
roopaank/
├── apps/
│   ├── web/              React SPA (Vite) — storefront + admin UI
│   └── api/              Express API — business logic, auth, payments
├── packages/
│   └── shared/           Code shared by web and api (Zod schemas, types, money helpers)
├── docs/
│   ├── adr/              Architecture Decision Records
│   └── runbooks/         Deploy, rollback and incident procedures
├── infra/
│   └── terraform/        Infrastructure as code (AWS, Sprint 11)
├── scripts/              One-off dev/ops scripts (seed admin, etc.)
└── .github/
    ├── workflows/        CI/CD pipelines
    └── ISSUE_TEMPLATE/   Bug/feature templates
```

This is an npm workspaces monorepo. Run commands from the repo root:

```bash
npm install        # installs all workspaces
npm run db:up      # start local Postgres in Docker (port 5434)
npm run dev:api    # start the API (see apps/api/README.md for first-time setup)
npm run dev:web    # start the web app
npm run lint       # lint all workspaces
npm run typecheck  # type-check all workspaces
npm test           # run all tests (API tests need the Docker database)
npm run build      # build shared → api → web
```

## Environments

| Env | Branch | URL | Deploy |
|---|---|---|---|
| Local | any | `http://localhost:5173` (web), `http://localhost:4000` (API) | `npm run dev:web`, `npm run dev:api` |
| Staging | `dev` | `https://roopaank-staging.vercel.app` (live after the first deploy) | Automatic on merge into `dev` |

Hosting: Vercel (web) + Render (API) + Neon (Postgres), free plans (`docs/SPEC.md` §4.4). Setup, deploy flow and troubleshooting: [`docs/runbooks/deploy.md`](docs/runbooks/deploy.md).
