# AG_TASK: Broadcast Expectation Fix

**Task:** Fix misleading UI text in Broadcast.tsx to clarify drafts are currently write-only.

## 🔒 EXECUTION CONSTRAINTS

* **Branch:** `fix/broadcast-ui-text`
* **Scope:** `src/pages/Broadcast.tsx` ONLY.
* **Safety:** Text-only UI changes. NO Logic. NO Backend.

## 🧩 REQUIREMENTS

1. **Modify `Broadcast.tsx`**:
    * Locate the "Save Draft" button.
    * Update label to: "Save Draft (stored safely)".
    * Update the existing helper text (or add new if missing) below the button to exactly: "Drafts are saved to the system but cannot be reopened yet."
    * Ensure helper text is visibly distinct (text-xs, text-amber-500/80 or slate-500, but explicit about the limitation).

2. **Verify Build**:
    * Run `npm run build`.

## 📦 COMPLETION CRITERIA

* UI text updated.
* Code committed.
* Build passed.
