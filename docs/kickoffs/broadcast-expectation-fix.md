# App Kickoff: Broadcast Expectation Fix

## 1. App Identity

* **App Name:** Admin Core
* **One-sentence Purpose:** Align the Broadcast "Save Draft" UI text with current system capabilities (write-only).
* **Target User:** Operator (Dave).
* **Core Job-To-Be-Done:** Prevent confusion about draft retrievability.

## 2. Scope Boundaries

**In Scope:**

* [x] Change "Save Draft" button label.
* [x] Add helper text below button.
* [x] `src/pages/Broadcast.tsx` only.

**Out of Scope:**

* [ ] Any logic changes.
* [ ] Adding a drafts list.
* [ ] Backend changes.

## 3. Data Model (High-Level)

**Primary Entities:** None.
**Excluded Data:** All.

## 4. Admin Core Integration

**Uses Admin Core?** Yes.
**Capabilities Required:** None.

## 5. Safety Constraints

* **Firebase Functions allowed?** No
* **Auth changes allowed?** No
* **Email delivery allowed?** No
* **Production data mutation allowed?** No

## 6. Definition of “Done”

* [ ] Button says "Save Draft (stored safely)".
* [ ] Helper text "Drafts are saved to the system but cannot be reopened yet." is visible.
* [ ] Build passes.
