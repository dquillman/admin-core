# AG_TASK: Issue Classification

**Task:** Add manual classification tags to the Issues page.

## 🔒 EXECUTION CONSTRAINTS

* **Branch:** `feat/issue-classification`
* **Scope:** `src/pages/Issues.tsx`, `src/types.ts` (if types exist there).
* **Safety:** UI + DB Update (on existing doc). NO Functions.

## 🧩 REQUIREMENTS

1. **Type Extension**:
    * Update Issue interface to include `classification?: 'blocking' | 'misleading' | 'trust' | 'cosmetic'`.

2. **Detail View (Dropdown)**:
    * Add a select/dropdown component to the issue details pane.
    * Labels: Blocking, Misleading, Trust, Cosmetic.
    * On change -> update the document in Firestore immediately (or as part of save if applicable).

3. **List View (Badge)**:
    * Render a colored badge for the classification.
        * Blocking: Red
        * Misleading: Orange
        * Trust: Purple
        * Cosmetic: Blue
        * Unclassified: Gray (or valid to hide if minimal).

4. **Verify Build**:
    * Run `npm run build`.

## 📦 COMPLETION CRITERIA

* Issues can be tagged.
* Tags persist.
* Code committed.
* Build passed.
