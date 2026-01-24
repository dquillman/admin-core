# App Kickoff: Factory Smoke Test (UI Change)

## 1. App Identity

* **App Name:** Admin Core
* **One-sentence Purpose:** Validate the AG Execution Pipeline with a safe, visible UI change.
* **Target User:** Operator (Dave).
* **Core Job-To-Be-Done:** Prove the system works without breaking anything.

## 2. Scope Boundaries

**In Scope:**

* [x] Add a small 'Beta' badge/text next to the 'Testers' link in `Sidebar.tsx`.
* [x] UI styling only (Tailwind).

**Out of Scope:**

* [ ] Any logic changes.
* [ ] Any backend changes.
* [ ] Any other pages.

## 3. Data Model (High-Level)

**Primary Entities:** None.
**Excluded Data:** All.

## 4. Admin Core Integration

**Uses Admin Core?** Yes.
**Capabilities Required:** None specific.

## 5. Safety Constraints

* **Firebase Functions allowed?** No
* **Auth changes allowed?** No
* **Email delivery allowed?** No
* **Production data mutation allowed?** No

## 6. Definition of “Done”

* [ ] Build passes.
* [ ] 'Beta' text visible next to 'Testers' in Sidebar.
* [ ] No functionality broken.
