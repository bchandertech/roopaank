# Runbook: deployments (staging)

Hosting decision: `docs/SPEC.md` §4.4 (D14). Pipeline: `.github/workflows/deploy.yml`.

## How a deploy works

A merge into `dev` triggers the **Deploy** workflow:

1. **CI** runs again on the exact merge commit (`ci.yml`). If it fails, nothing is deployed.
2. **Migrations**: `prisma migrate deploy` against the staging Neon database.
3. **API**: Render deploy hook, then the workflow waits until `/api/health` reports this commit.
4. **Web**: Vercel build and deploy, with `/api/*` and `/uploads/*` rewritten to the Render API.
5. **Smoke test**: `GET /` and `GET /api/health` through the web URL.

Render and Vercel auto-deploys are turned off, so this workflow is the only way code reaches staging.

**Migration rule:** migrations run *before* the new API starts, while the old API is still serving. Every migration must work with the currently running code: add tables/columns first, remove old ones in a later release.

## One-time setup (staging)

Never paste secrets into chat, issues, commits or logs.

### 1. Neon (database)

1. Create a project `roopaank-staging` (region close to the Render region, e.g. Singapore).
2. From **Connect**, copy two connection strings:
   - **Pooled** (host contains `-pooler`): used by the running API on Render.
   - **Direct** (no `-pooler`): used by the workflow for migrations.

### 2. Render (API)

New → **Web Service** → connect the `roopaank` GitHub repo.

| Setting | Value |
|---|---|
| Name | `roopaank-api-staging` |
| Branch | `dev` |
| Region | Same as Neon |
| Runtime | Node |
| Build command | `npm ci && npm run build -w @roopaank/shared && npm run build -w @roopaank/api` |
| Start command | `NODE_ENV=production APP_VERSION=$RENDER_GIT_COMMIT npm run start -w @roopaank/api` |
| Instance type | Free |
| Health check path | `/api/health` |
| Auto-Deploy | **Off** |

`NODE_ENV` is set in the start command, not as an environment variable: with `NODE_ENV=production` during the build, `npm ci` skips dev dependencies and the TypeScript build fails.

Environment variables:

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string |
| `WEB_ORIGIN` | The Vercel staging URL, e.g. `https://roopaank-staging.vercel.app` |
| `PUBLIC_UPLOADS_URL` | `<WEB_ORIGIN>/uploads` |
| `TRUST_PROXY` | `2` (Vercel + Render; verify, see below) |
| `LOG_LEVEL` | `info` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Razorpay **test mode** keys only |

`PORT` is set by Render automatically.

Then **Settings → Deploy Hook**: copy the URL. It is a secret: anyone with it can trigger a deploy.

### 3. Vercel (web)

```bash
npx vercel@63 login
npx vercel@63 project add roopaank-staging
```

- Project **Settings → General**: leave **Root Directory** empty (build settings come from `vercel.json`). Copy the **Project ID**.
- Team/account **Settings → General**: copy the **Team ID** (`VERCEL_ORG_ID`).
- Account **Settings → Tokens**: create a token scoped to this team, with an expiry date.

### 4. GitHub environment

Repo **Settings → Environments → New environment** `staging`. Under **Deployment branches**, allow only `dev`.

| Type | Name | Value |
|---|---|---|
| Variable | `API_ORIGIN` | Render URL, e.g. `https://roopaank-api-staging.onrender.com` (no trailing slash) |
| Variable | `WEB_URL` | Vercel URL, e.g. `https://roopaank-staging.vercel.app` |
| Variable | `VERCEL_ORG_ID` | Team ID |
| Variable | `VERCEL_PROJECT_ID` | Project ID |
| Secret | `DATABASE_URL` | Neon **direct** connection string |
| Secret | `RENDER_DEPLOY_HOOK_URL` | Render deploy hook URL |
| Secret | `VERCEL_TOKEN` | Vercel token |

### 5. First deploy

Re-run the latest **Deploy** workflow on `dev` (Actions → Deploy → Re-run), or merge any PR into `dev`. Then create a staging admin from your machine, with the **direct** Neon URL in your shell only:

```bash
cd apps/api
DATABASE_URL='<neon direct url>' ADMIN_NAME='...' ADMIN_EMAIL='...' ADMIN_PASSWORD='...' npm run admin:create
```

## Verify after the first deploy (open items from SPEC §4.4)

- [ ] `https://<web>/api/health` returns `{"status":"ok","version":"<commit>"}`.
- [ ] Register and log in on the staging site; the session cookie is set on the Vercel domain and survives a page reload (proves `Set-Cookie` passes through the rewrite).
- [ ] A logged-in POST works (proves the `Origin` header passes the CSRF origin check).
- [ ] `TRUST_PROXY`: the client IP the API sees (Render logs, request log `remoteAddress`/`req.ip`) is your real IP, not a Vercel or Render address. Adjust the value if not; rate limiting depends on it.

## Troubleshooting

| Symptom | Where to look |
|---|---|
| Deploy fails at "Check environment configuration" | A variable or secret from step 4 is missing; the error lists which. |
| Migration step fails | Workflow log; check the direct `DATABASE_URL`. Never run `db:reset` against staging. |
| "API did not report version" | Render → service → Events/Logs. Usually a build error or invalid env (the API prints which variable is invalid, never its value). |
| Web loads but `/api/*` returns 404/502 | `API_ORIGIN` wrong, or the Render service is asleep/crashed. |

## Known limitations

- Free Render instances sleep after ~15 min idle; the first request then takes 30–60 s.
- The Render disk is wiped on every deploy and restart, so uploaded and seeded images do not persist (SPEC §4.3 [OPEN]).
- Staging is not seeded automatically: `prisma/seed.ts` writes images to local disk and refuses to run with `NODE_ENV=production`. Resolve together with image storage.
