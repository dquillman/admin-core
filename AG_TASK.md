# AG_TASK: Factory Smoke Test (UI Change)

**Task:** Add a visual 'Beta' indicator to the 'Testers' navigation item in `Sidebar.tsx`.

## 🔒 EXECUTION CONSTRAINTS

* **Branch:** `feat/smoke-test-ui`
* **Scope:** `src/components/Sidebar.tsx` ONLY.
* **Safety:** UI-only. NO Functions. NO Auth.

## 🧩 REQUIREMENTS

1. **Modify `Sidebar.tsx`**:
    * Find the navigation item configuration (array or list).
    * Add a conditional render or a static badge for the `/testers` route item.
    * IF the item is `/testers`, render a small `span` with text `Beta` (text-xs, bg-blue-100, text-blue-800, rounded-full, px-2).
    * Ensure layout remains clean (flex-row).

2. **Verify Build**:
    * Run `npm run build`.

## 📦 COMPLETION CRITERIA

* Code committed.
* Build passed.
