# AG_TASK: Standardize Versioning Convention

**Task:** Implement a single source of truth for the Admin Core version string.

## 🔒 EXECUTION CONSTRAINTS

* **Branch:** `feat/version-convention`
* **Scope:** `src/config.ts` (NEW/UPDATE), `src/components/Sidebar.tsx`, `docs/conventions/versioning.md`.
* **Safety:** UI/Config only. NO Functions.

## 🧩 REQUIREMENTS

1. **Define Convention (Option A Selected)**:
    * Create `src/config.ts` if it doesn't exist, or use `src/constants.ts` if appropriate.
    * Export `export const ADMIN_CORE_VERSION = '0.3.0';` (Bumping version to signify convention change).

2. **Update UI**:
    * In `src/components/Sidebar.tsx`, import `ADMIN_CORE_VERSION`.
    * Replace the hardcoded string from the previous task with this constant.

3. **Document**:
    * Create `docs/conventions/versioning.md`.
    * Explain: "Update `src/config.ts` to change the version."

## 📦 COMPLETION CRITERIA

* Version matches in config and UI.
* Build passes `npm run build`.
* Documentation created.
