# App Kickoff: Issues Export

## 1. App Identity

* **App Name:** Admin Core
* **One-sentence Purpose:** Allow operators to export issue data for external analysis or backup.
* **Target User:** Operator (Dave).
* **Core Job-To-Be-Done:** Download current issue list as JSON.

## 2. Scope Boundaries

**In Scope:**

* [x] Add "Export JSON" button to `Issues.tsx`.
* [x] specific JSON structure (id, app, summary, severity, classification, status, dates, notes).
* [x] Client-side file generation and download triggering.

**Out of Scope:**

* [ ] Server-side generation.
* [ ] CSV/Excel formats (strictly JSON as requested).
* [ ] Filtering logic changes (exports current view or all loaded? Request implies "currently loaded issues dataset").

## 3. Data Model (High-Level)

**Primary Entities:** `issues` (Read-only).
**New Action:** `exportIssues()`.

## 4. Admin Core Integration

**Uses Admin Core?** Yes.
**Capabilities Required:** Issues Management.

## 5. Safety Constraints

* **Firebase Functions allowed?** No
* **Auth changes allowed?** No
* **Email delivery allowed?** No
* **Production data mutation allowed?** No (Read-only export).

## 6. Definition of “Done”

* [ ] Button visible in UI.
* [ ] Clicking downloads `issues-export-YYYY-MM-DD.json`.
* [ ] JSON contains required fields.
* [ ] Build passes.
