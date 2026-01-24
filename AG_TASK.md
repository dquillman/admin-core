# AG_TASK: Issues Export

**Task:** Add a read-only export function to the Issues page.

## 🔒 EXECUTION CONSTRAINTS

* **Branch:** `feat/issues-json-export`
* **Scope:** `src/pages/Issues.tsx` ONLY.
* **Safety:** UI-only export. NO Backend changes.

## 🧩 REQUIREMENTS

1. **Export Button**:
    * Add "Export Issues (JSON)" button to the toolbar (near filters).
    * Style: Secondary/Outline button.

2. **Export Logic**:
    * Target `issues` state (currently loaded issues).
    * Map to schema:
        * `id`
        * `app`
        * `summary` (from `message` or `description`)
        * `severity`
        * `classification`
        * `status`
        * `createdAt` (ISO string)
        * `lastUpdated` (ISO string if available)
        * `adminNotes` (from `notes` array)

3. **File Generation**:
    * `issues-export-YYYY-MM-DD.json`.
    * Use `URL.createObjectURL` with a Blob.

4. **Verify Build**:
    * Run `npm run build`.

## 📦 COMPLETION CRITERIA

* Button works.
* File downloads.
* Code committed.
* Build passed.
