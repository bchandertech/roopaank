# Runbook: rollback

Use this when a release is live and broken. Start with evidence: the failing request, the Render logs and the deploy that introduced it (Actions → Deploy → commit).

## Decide: roll back or fix forward

| Situation | Action |
|---|---|
| Users are affected now and the cause is not obvious | **Roll back** (below), then fix through the normal branch flow. |
| Small, clear bug and a fix can pass CI quickly | **Fix forward**: `hotfix/Roopaank-ROO-<n>-<title>` from `main` → PR to `main` → then merge `main` back into `dev`. |
| A migration damaged data | Stop and restore data first (see Database). Do not deploy anything else meanwhile. |

## Roll back the API (Render)

1. Render → `roopaank-api-prod` → **Events**.
2. Find the last good deploy → **Rollback**.
3. Check `https://<prod web>/api/health`: `version` is the old commit and `status` is `ok`.

## Roll back the web (Vercel)

1. Vercel → project `roopaank` → **Deployments**.
2. Find the last good production deployment → **⋯ → Instant Rollback**.
3. Open the site and check the broken page.

After an Instant Rollback, Vercel may stop pointing the production URL at new deployments until you promote one. After the fix is deployed, check the Deployments page and promote it if needed.

## Database

Migrations are **forward-only**. Do not run `migrate reset` or hand-edit production tables.

- Because every migration must work with the previous API version (deploy runbook, migration rule), rolling back the API or web does **not** require undoing a migration.
- A bad migration is fixed with a **new** migration through the normal flow.
- If data was lost or corrupted, restore it with Neon's point-in-time restore (project → **Restore**). The free plan only keeps a short history window, so act quickly.

## Make the rollback permanent

A dashboard rollback is temporary: the next deploy from `main` brings the bad code back.

1. On GitHub, open the PR that caused the problem → **Revert** → this creates a revert PR.
2. Merge the revert into `dev` (staging deploys), check staging, then release `dev → main` as usual.
3. Record what happened, the cause and the follow-up ticket in the PR or a ticket.
