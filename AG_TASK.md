# AG_TASK: Broadcast Audit Visibility

**Task:** Add creator and timestamp visibility to Broadcast drafts.

## 🔒 EXECUTION CONSTRAINTS

* **Branch:** `feat/broadcast-audit-ui`
* **Scope:** `src/pages/Broadcast.tsx` ONLY.
* **Safety:** UI-only. NO Logic. NO Backend.

## 🧩 REQUIREMENTS

1. **Draft List Update**:
    * Enhance the list item design.
    * Show `creatorEmail` prominently (or 'Unknown').
    * Show `createdAt` as readable date/time (e.g., `toLocaleDateString` + time).

2. **Loaded Draft Context**:
    * Add state: `loadedDraft` (stores metadata of the currently clicked draft).
    * When a draft is clicked, set this state.
    * Render a small info block above the Form (or inside the Drafts section header, or near the Subject line):
        "Editing draft from [email] • Created [date]"
    * Use subtle styling (text-slate-500, text-xs).

3. **Verify Build**:
    * Run `npm run build`.

## 📦 COMPLETION CRITERIA

* Audit info visible in list and on load.
* Code committed.
* Build passed.
