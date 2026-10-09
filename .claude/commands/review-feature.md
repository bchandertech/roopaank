---
description: Check code quality with code-quality-checker and review the change with code-reviewer
argument-hint: <ticket-id> [files or branch to review]
---

Review the changes for: $ARGUMENTS

If no ticket ID was given above, take it from the current branch name (`git branch --show-current`, e.g. `feature/Roopaank-ROO-123-...` → `ROO-123`). If there is still no ticket ID, stop and ask for it. Do not guess.

If no files or branch were given, the scope is the current branch's changes against `dev` (`git diff dev...HEAD` plus uncommitted changes). If that diff is empty, stop and say there is nothing to review.

## Step 1 — Run both agents

Run the `code-quality-checker` and `code-reviewer` agents in parallel. Give each the ticket ID and the scope above. Wait for both to finish.

## Step 2 — Report

Show:

1. The scope: ticket, branch and files reviewed.
2. The code-quality-checker results table, findings and verdict, unchanged.
3. The code-reviewer acceptance criteria, findings, missing tests and verdict, unchanged.
4. An overall verdict:
   - **READY FOR PR**: only if quality is QUALITY OK and review is APPROVE.
   - **NOT READY**: otherwise. List the must-fix and blocker/major items first, de-duplicated across both reports.
5. The current stage in the `CLAUDE.md` feature workflow.

Do not fix anything automatically. Ask the owner how to proceed.

Do not commit, push, create a PR, or change any code in this command.
