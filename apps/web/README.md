# @roopaank/web

React 19 + Vite + TypeScript SPA. See `docs/SPEC.md` §4.1 and §8.

```
src/
├── app/          Router, providers, root layout
├── pages/        Route-level components (one per route in SPEC §8.2)
├── features/     Feature modules: components, hooks and API calls for one domain
│   ├── auth/  products/  cart/  checkout/  orders/  account/  admin/
├── components/
│   ├── ui/       Generic UI primitives (shadcn/ui)
│   └── layout/   Header, footer, announcement bar
├── hooks/        Hooks shared across features
├── lib/          API client, formatters, utilities
├── store/        Redux Toolkit store + slices (client-only UI state, never server data)
├── styles/       Global styles and theme tokens
└── assets/       Static images and icons imported by code
e2e/              Playwright end-to-end tests
```

Rule of thumb: code used by one feature lives in `features/<name>/`. Move it to `components/`, `hooks/` or `lib/` only when a second feature needs it.
