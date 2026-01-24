# AG Task Pre-Flight Checklist

## 1. What This Is

This mandatory checklist must be completed before **any** `AG_TASK.md` is pasted into the AI. It prevents 90% of failures by catching scope creep, ambiguous requirements, and safety violations before execution begins.

## 2. Pre-Flight Questions

* [ ] **Kickoff Completed:** Was `docs/templates/app-kickoff.md` filled out and reviewed?
* [ ] **Correct Scope:** Is the task **UI-only** (or has explicit written approval for backend/infra)?
* [ ] **Guardrails Reviewed:** Have you checked [`docs/ag-guardrails.md`](../ag-guardrails.md)?
* [ ] **Forbidden Actions Listed:** Does `AG_TASK.md` explicitly list forbidden actions (No Functions, No Auth)?
* [ ] **Definition of Done:** Is success clearly defined and testable?
* [ ] **Rollback Path:** Do you know how to revert if this fails (e.g., specific git reset)?
* [ ] **Atomic Task:** Is the task small enough to be completed in one shot?

## 3. Risk Flags (STOP Conditions)

**If ANY of these are present, STOP immediately:**

* [ ] Firebase Functions mentioned or implied?
* [ ] Auth logic changes implied?
* [ ] Email delivery or external API calls implied?
* [ ] Schema changes (indexes, collections) implied?
* [ ] "While we're here" or "Might as well" language present?

## 4. Operator Sign-Off

**Date:** ____________________
**Operator Initials:** _________
**Status:** Approved to run `AG_TASK.md`.

## 5. Usage Instructions

1. Reference a link to this specific file at the top of every `AG_TASK.md`.
2. Any task submitted without a completed Pre-Flight check is considered **VOID** and should be rejected by the AI.
