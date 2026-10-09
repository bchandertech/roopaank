# Roopaank — Instructions for Claude

**This web app is built to real production standards, the way professional teams build and ship production applications. Every decision — code, architecture, security, testing, Git workflow, deployment and operations — must follow industry-standard production practices. No shortcuts, demo-quality code or "good enough for now" hacks; if a shortcut is ever unavoidable, say so explicitly and record it in the spec.**

D2C artificial/imitation jewellery store. The source of truth is `docs/SPEC.md` — read the relevant sections before any change.

## Rules

- Follow: Requirement → User flow → Data model / API contract → Architecture → Implementation → Testing.
- Don't implement anything not in `docs/SPEC.md`. If a requirement is missing or ambiguous and affects architecture, data or security: stop, ask, update the spec, then code.
- Never claim products are real gold/silver.
- Money is integer paise. Server calculates all prices, totals, shipping and stock; never trust client amounts or payment status.
- Business logic lives in API services, not React components or route handlers. Validate all input with Zod.
- Prefer the smallest correct implementation; no premature abstractions.
- The owner is learning (React now, Next.js and AWS later). Explain the "why" behind production practices briefly when introducing them.
- Everything written into the project is in English only: code comments, identifiers, commit messages, PR descriptions, docs and test names. This applies even when the owner asks in Hindi or Hinglish; never add Hindi to any project file.

## Learning Mode

The owner's main goal is not just to ship the site but to gain real, hands-on experience of how production web apps are built, learning each thing step by step and in depth.

- The site is built as small features, one ticket at a time from `docs/SPRINTS.md`.
- For every feature, the owner first tries to build it themselves. Claude does not write the implementation up front.
- Claude's role on a feature, in order:
  1. Explain the concept and the "why" behind it.
  2. Give hints or guiding questions instead of full solutions.
  3. Review the owner's attempt: bugs, production gaps, security, tests.
  4. Help finish and refine it.
- Claude writes the full code only when the owner explicitly asks for it, after their own attempt.
- Teach one concept at a time; do not skip steps or bundle many new ideas together.
- Exception (owner decision, 2026-10-09): the backend (`apps/api`, `packages/shared`) was built by Claude in one go (ROO-100) so the owner can focus on the frontend. The owner will study it afterwards; explain backend code on request. Frontend work follows the attempt-first rule above.

### `!` shell commands (e.g. `! git status`)

- When the owner runs a command with the `!` prefix, do not reply with explanations, tips, next steps or workflow stage.
- Show nothing beyond what the terminal (Git Bash) itself prints. If the output is already visible, stay silent or reply with nothing extra.
- Explain only if the owner asks a question in a separate message.

## Architecture

- Keep frontend, backend and database responsibilities clearly separated.
- React components should focus on UI and user interaction.
- Keep server state in React Query (TanStack Query); use Redux Toolkit only for genuine client/global state.
- Do not put API calls directly inside reusable UI components.
- Do not duplicate business logic between frontend and backend.
- Follow the existing project structure before creating new folders or patterns.
- Do not introduce a new library when the existing stack can solve the problem.

## API & Security

- Never expose secrets, API keys, database credentials or payment secrets to the client.
- Never commit `.env`, credentials, tokens or private keys.
- Environment-specific configuration must come from environment variables.
- Never trust client-provided price, total, discount, stock, role or payment status.
- Every protected API must verify authentication and authorization on the server.
- Return consistent API response and error formats.
- Do not expose internal errors, stack traces or sensitive database information to clients.
- Validate request body, params and query parameters with Zod.
- Handle loading, empty, validation and error states explicitly.

## Frontend

- Use TypeScript strictly; avoid `any` unless there is a documented reason.
- Components should remain small and focused.
- Use reusable components only when reuse is actually needed.
- Do not create abstractions for hypothetical future requirements.
- Forms must have client-side validation, but server-side validation remains mandatory.
- Provide proper loading, error, empty and success states.
- Follow accessibility basics: semantic HTML, labels, keyboard navigation and appropriate ARIA where required.
- Handle responsive layouts for mobile, tablet and desktop.
- Never hide important business errors from the user.

## Data & Database

- Never modify the database schema without updating the relevant specification.
- Use migrations for schema changes.
- Never delete or modify production data as part of development/testing.
- Add appropriate indexes based on actual query patterns.
- Preserve data integrity with database constraints where appropriate.
- Use transactions when multiple database operations must succeed or fail together.

## Testing

- Every business-critical feature must have tests.
- Test happy paths and important failure paths.
- Backend tests must verify authorization and validation.
- Frontend tests should focus on user behavior rather than implementation details.
- Before declaring a feature complete, run the relevant tests and build.
- Never claim tests passed unless they were actually executed.

## Git & Changes

- Before making changes, inspect the existing code and understand the current implementation.
- Keep changes small and focused.
- Do not modify unrelated files.
- Do not overwrite working code without understanding why it exists.
- Before destructive operations, ask for confirmation.
- Do not commit, push, merge or create a PR unless explicitly requested.
- Use clear conventional commit messages when a commit is requested.
- Never include secrets in commits.

## Production Quality

- Consider performance, security, accessibility and error handling before declaring a feature complete.
- Avoid unnecessary API requests and unnecessary React re-renders.
- Use pagination for potentially large datasets.
- Do not load large datasets into the browser unnecessarily.
- Images should be optimized and use appropriate dimensions/formats.
- Add logging where it helps diagnose production failures, but never log secrets or sensitive user data.
- Production debugging must start with evidence: logs, request IDs, errors, recent deployments and reproducible steps.

## Claude Workflow

Before coding:

1. Read the relevant specification.
2. Inspect the existing implementation.
3. Identify affected files.
4. Explain the planned change briefly.
5. Ask for confirmation if the change affects architecture, security, database schema or existing contracts.

While coding:

1. Make the smallest correct change.
2. Follow existing project conventions.
3. Do not introduce unrelated improvements.
4. Keep frontend/backend contracts synchronized.

After coding:

1. Run relevant tests.
2. Run lint/type-check/build when applicable.
3. Review the diff.
4. Report exactly what changed.
5. Report tests/checks actually executed and their results.
6. Mention any known limitations or remaining work.

## Important

- Do not say "done", "working", "tested" or "production-ready" unless there is evidence.
- If something is uncertain, say so instead of guessing.
- If the specification and existing code conflict, stop and ask before making architectural changes.

**## Git, Branching & CI/CD — Production Workflow**

- Follow a production-style Git workflow for every feature, bug fix and release.
- `main` represents the production environment.
- `dev` represents the staging environment.
- Never push directly to `main` or `dev`.
- Every feature must have its own branch.

### Branch Naming

Feature branch:

`feature/<projectName>-<jiraTicket>-<title>`

Example:

`feature/Roopaank-ROO-123-product-listing`

Bug fix:

`fix/<projectName>-<jiraTicket>-<title>`

Example:

`fix/Roopaank-ROO-145-cart-total`

Production hotfix:

`hotfix/<projectName>-<jiraTicket>-<title>`

Example:

`hotfix/Roopaank-ROO-201-payment-failure`

### Mandatory Feature Flow

For every feature, follow this exact flow:

1. Start from the latest `dev` branch.
2. Create a feature branch using the required naming convention.
3. Implement the feature.
4. Run local validation:
   - lint
   - TypeScript type-check
   - tests
   - production build
5. Push the feature branch to GitHub.
6. GitHub Actions CI must automatically run.
7. If CI fails, do not create/merge the PR until the failure is fixed.
8. After CI passes, create a Pull Request:

   `feature/* → dev`

9. All required CI checks must pass before the PR can be merged.
10. After review/approval, merge the PR into `dev`.
11. Merging into `dev` must trigger the staging deployment.
12. Deploy the `dev` branch to the staging environment.
13. Generate/provide the staging URL.
14. QA/manual testing must be performed on staging.
15. If testing finds issues, fix them through the normal feature/fix branch workflow and repeat CI → PR → staging testing.
16. Only after staging testing passes, create a Pull Request:

`dev → main`

17. Required CI checks must pass again.
18. The PR must be reviewed and approved.
19. Merge `dev` into `main`.
20. Merging into `main` must trigger the production CD pipeline.
21. Production deployment must run only after all required CI checks pass.
22. Production must be deployed to Vercel.
23. If the production CI/build/deployment fails, the release must not be considered successfully deployed.
24. Never bypass or manually skip required CI/CD checks.

### CI Pipeline

GitHub Actions CI must run on:

- Push to feature/fix/hotfix branches.
- Pull Requests targeting `dev`.
- Pull Requests targeting `main`.

Minimum CI checks:

1. Install dependencies.
2. Lint.
3. TypeScript type-check.
4. Unit/component tests.
5. Production build.

If any required check fails:

`CI = FAILED`

Therefore:

- The PR must not be merged.
- The code must not move to the next environment.
- Production deployment must not proceed.

### Staging Environment

`dev` is the staging branch.

Expected flow:

`feature/*`
→ `CI`
→ `PR → dev`
→ `CI`
→ `merge → dev`
→ `staging deployment`
→ `staging URL`
→ `QA/manual testing`

The staging environment must use staging-specific:

- API URL
- database
- environment variables
- secrets
- third-party service configuration

Never use production credentials in staging.

### Production Environment

`main` is the production branch.

Expected flow:

`dev`
→ `PR → main`
→ `CI`
→ `review/approval`
→ `merge → main`
→ `production CD`
→ `production build`
→ `Vercel`
→ `production`

Production deployment must use production-specific environment variables and secrets.

Production deployment must not happen when required CI checks fail.

### Branch Protection

`dev` and `main` must be protected branches.

Required rules:

- No direct push to `dev`.
- No direct push to `main`.
- Changes must come through Pull Requests.
- Required CI checks must pass before merging.
- PR approval is required.
- Force push must be disabled.
- CI checks must not be bypassed.

### Pull Request Rules

Every Pull Request should include:

- Jira ticket.
- Feature/fix description.
- Why the change was required.
- What was changed.
- Testing performed.
- Screenshots/video for UI changes when useful.
- Known limitations or remaining work.

PR title example:

`ROO-123: Add product listing page`

### Deployment Rules

- CI is responsible for validating the code.
- CD is responsible for deploying validated code.
- Never treat a successful local build as proof that production deployment is safe.
- Never manually deploy production when the project workflow requires CI/CD.
- Never deploy code that has failed required CI checks.
- Never disable a failing CI check just to merge code.
- Never commit secrets or production credentials.
- Production deployment must be triggered only from the approved production branch/workflow.
- If the production build fails, production must remain on the previous successful version.

### Claude Git Restrictions

Claude must NOT automatically:

- Push code.
- Merge Pull Requests.
- Approve Pull Requests.
- Delete branches.
- Modify branch protection.
- Bypass CI checks.
- Deploy to production.

Claude may prepare:

- Git commands.
- Commit messages.
- Pull Request descriptions.
- CI/CD configuration.
- Deployment configuration.

Any operation that pushes, merges, deletes, changes branch protection, or affects production requires explicit user approval.

### Feature Completion Criteria

A feature is NOT considered complete after local implementation alone.

A feature is complete only after the complete workflow succeeds:

`Feature implementation`
→ `local validation`
→ `feature branch push`
→ `CI passed`
→ `PR → dev`
→ `CI passed`
→ `review/approval`
→ `merge → dev`
→ `staging deployment`
→ `staging URL`
→ `QA/manual testing passed`
→ `PR → main`
→ `CI passed`
→ `review/approval`
→ `merge → main`
→ `production CD`
→ `production build`
→ `Vercel deployment successful`

Claude must always report the current stage of this workflow when working on a feature.
