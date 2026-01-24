# App Kickoff: Issue Classification Filter

## 1. App Identity

* **App Name:** Admin Core
* **One-sentence Purpose:** Enable operators to filter and sort backlog issues by business risk (Classification).
* **Target User:** Operator (Dave).
* **Core Job-To-Be-Done:** Quickly isolate "Blocking" or "Misleading" issues.

## 2. Scope Boundaries

**In Scope:**

* [x] Add `filterClassification` state to `Issues.tsx`.
* [x] Add Filter Dropdown for Classification.
* [x] Update filtering logic to exclude non-matching classifications.
* [x] Add Sort option (Group by Classification risk).

**Out of Scope:**

* [ ] Backend query filtering (Firestore indexes).
* [ ] Persistent user preferences.

## 3. Data Model (High-Level)

**Primary Entities:** `issues` (Read existing `classification` field).
**New State:** `filterClassification` ("all" | "blocking" | "misleading" | "trust" | "cosmetic").

## 4. Admin Core Integration

**Uses Admin Core?** Yes.
**Capabilities Required:** Issues Management.

## 5. Safety Constraints

* **Firebase Functions allowed?** No
* **Auth changes allowed?** No
* **Email delivery allowed?** No
* **Production data mutation allowed?** No (Read-only view filtering).

## 6. Definition of “Done”

* [ ] User can select "Blocking" and see only blocking issues.
* [ ] User see "Unclassified" label/group where appropriately.
* [ ] Build passes.
