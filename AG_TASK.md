# AG_TASK: Sidebar Beta Tooltip

**Task:** Add a tooltip to the "Beta" label in the Admin Core Sidebar.

## 🔒 EXECUTION CONSTRAINTS

* **Branch:** `feat/sidebar-tooltip`
* **Scope:** `src/components/Sidebar.tsx` ONLY.
* **Safety:** UI-only. NO Functions. NO Auth.

## 🧩 REQUIREMENTS

1. **Modify `Sidebar.tsx`**:
    * Locate the "Beta" span added in the previous task.
    * Add a `title` attribute with the text: "This area is in beta. Features may change during testing."
    * (Optionally verify if a custom Tooltip component is standard pattern, but default to `title` for zero-risk).

2. **Verify Build**:
    * Run `npm run build`.

## 📦 COMPLETION CRITERIA

* Code committed.
* Build passed.
