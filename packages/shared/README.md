# @roopaank/shared

Code that must behave identically on web and api.

```
src/
├── schemas/   Zod schemas for API request/response contracts
├── types/     Types inferred from schemas and shared enums (OrderStatus, Role, ...)
└── money/     Paise helpers: formatting, discount %, totals, shipping
```

Rules: no React, no Express, no Prisma, no Node-only APIs. Pure TypeScript only.
