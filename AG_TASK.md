# AG_TASK: Add Version Display to Sidebar

**Task:** Implement a strict UI-only change to display the application version in the Admin Core Sidebar.

## 🔒 EXECUTION CONSTRAINTS

* **Branch:** `feat/sidebar-version`
* **Scope:** `src/components/Sidebar.tsx` ONLY.
* **Safety:** NO Functions, NO Auth, NO Email.

## 🧩 REQUIREMENTS

1. **Modify `Sidebar.tsx`**:
    * Locate the bottom of the sidebar (after the navigation links).
    * Add a footer section.
    * Display text: `Admin Core v0.2.7` (Hardcoded is acceptable for this test, or read from `package.json` if safe/easy).
    * Style: Text-slate-500, text-xs, padding.

2. **Verify Build**:
    * Run `npm run build` to ensure no regression.
    * Ensure no linter errors.

## 📦 COMPLETION CRITERIA

* Branch created.
* Code committed.
* Build passed.
