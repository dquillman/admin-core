# App Kickoff: Sidebar Beta Tooltip

## 1. App Identity

* **App Name:** Admin Core
* **One-sentence Purpose:** Clarify the meaning of the "Beta" label to avoid operator confusion.
* **Target User:** Operator (Dave).
* **Core Job-To-Be-Done:** Provide context on click/hover for beta features.

## 2. Scope Boundaries

**In Scope:**

* [x] Modify `Sidebar.tsx` to add a `title` attribute or simple tooltip to the existing "Beta" span.
* [x] UI-only change.

**Out of Scope:**

* [ ] Custom tooltip components (use native `title` for simplest safe implementation unless UI library calls for otherwise).
* [ ] Any logic/backend.

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
* [ ] Tooltip text matches requirement: “This area is in beta. Features may change during testing.”
* [ ] No visual regression.
