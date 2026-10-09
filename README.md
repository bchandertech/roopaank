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
npm run dev:web    # start the web app
npm run lint       # lint all workspaces
npm run build      # build all workspaces
```
