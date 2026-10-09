---
description: Write tests with test-creator, then run them with test-runner
argument-hint: <ticket-id> <files or behaviour to cover>
---

Create and verify tests for: $ARGUMENTS

If no ticket ID or files/behaviour were given above, stop and ask for them. Do not guess.

## Step 1 — Create tests

Run the `test-creator` agent with the ticket and scope above. Wait for it to finish.

If it reports a spec gap or a bug in production code, or ends without a "Handoff to test-runner" block, stop. Show its report and do not go to step 2.

## Step 2 — Run tests

Run the `test-runner` agent. Pass it the full "Handoff to test-runner" block from step 1, so it runs exactly those test files first and then the full validation.

## Step 3 — Report

Show:

1. Test files created and the behaviours they cover (from step 1).
2. The test-runner results table and verdict (from step 2), unchanged.
3. If the verdict is NOT READY: list each failure with its category (Test bug / Code bug / Environment). Do not fix anything automatically. Ask the owner how to proceed.

Do not commit, push or change production code in this command.
