✅ AG PROMPT — STEP 4 (Fix Diagnostic Overwrite)

Copy/paste this exactly into the **Exam Coach (Student App)** codebase agent.

You are modifying the **Exam Coach (Student App)** codebase.

GOAL:
Fix a critical bug where completing a diagnostic inadvertently revokes Admin-granted "Reviewer Access" (testerOverride).

## 🛠️ SETUP

Before making changes, create a new branch for this fix:

```bash
git checkout -b fix/diagnostic-overwrite
```

## CONTEXT

- Admins grant access via `testerOverride: true` in the `users/{uid}` document.
- When a user finishes a diagnostic, the app saves the results.
- **Root Cause:** The save operation is likely performing a `set()` (overwrite) instead of `update()` (merge), wiping the `testerOverride` field.

## TASKS

1. Locate the logic that saves diagnostic results.
   - Likely in a service (e.g., `DiagnosticService`, `UserService`) or a Context hook.
   - Search for `setDoc` or `set(` calls affecting `users/{uid}`.

2. Modify the write operation to be **NON-DESTRUCTIVE**.
   - Change `set(ref, data)` to `set(ref, data, { merge: true })`.
   - OR change to `update(ref, data)`.

3. Ensure the object being written does NOT explicitly set `testerOverride: undefined` or `null`.

## SUCCESS CRITERIA

- Diagnostic completion persists all existing user fields (especially `testerOverride`).
- User remains "Pro" (Reviewer) after finishing the diagnostic.
- No other data is lost.

## ⛔ Stop Rule

- Verify the fix by running the unit test or checking the code path.
- Commit the fix:

  ```bash
  git add .
  git commit -m "fix(user): Prevent diagnostic save from unsetting testerOverride"
  ```
