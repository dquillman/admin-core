# App Kickoff: Issue Classification

## 1. App Identity

* **App Name:** Admin Core
* **One-sentence Purpose:** Allow operators to manually classify issues by business risk (e.g., Blocking, Misleading).
* **Target User:** Operator (Dave).
* **Core Job-To-Be-Done:** Categorize issues as "Trust" or "Misleading" risks instead of just severity.

## 2. Scope Boundaries

**In Scope:**

* [x] Add `classification` field to Issue type definition.
* [x] Display classification badge in Issue List.
* [x] Add dropdown selector in Issue Detail View.
* [x] Update `firestoreService` update logic if needed.

**Out of Scope:**

* [ ] Auto-classification.
* [ ] Filtering/Sorting by classification (for now).
* [ ] New collections.

## 3. Data Model (High-Level)

**Primary Entities:** `issues` (Existing).
**New Field:** `classification` (optional string string).
**Values:** "blocking" | "misleading" | "trust" | "cosmetic".

## 4. Admin Core Integration

**Uses Admin Core?** Yes.
**Capabilities Required:** Issues & Severity Tracking.

## 5. Safety Constraints

* **Firebase Functions allowed?** No
* **Auth changes allowed?** No
* **Email delivery allowed?** No
* **Production data mutation allowed?** Yes (Updating issue fields).

## 6. Definition of “Done”

* [ ] Dropdown appears in detail view.
* [ ] Selected value persists to Firestore.
* [ ] Badge appears in list view.
* [ ] Build passes.
