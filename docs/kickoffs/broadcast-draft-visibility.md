# App Kickoff: Broadcast Draft Visibility

## 1. App Identity

* **App Name:** Admin Core
* **One-sentence Purpose:** Allow operators to view and retrieve saved broadcast drafts.
* **Target User:** Operator (Dave).
* **Core Job-To-Be-Done:** Recover saved work without querying the database manually.

## 2. Scope Boundaries

**In Scope:**

* [x] Create `BroadcastDraftList` component (or integrated view).
* [x] Query `broadcast_drafts` collection (limit 20, desc sort).
* [x] Display draft metadata (Subject, Time, Creator).
* [x] Click-to-load functionality (populates parent form).

**Out of Scope:**

* [ ] Editing saved drafts (updating the existing doc).
* [ ] Deleting drafts.
* [ ] Sending.
* [ ] Pagination.

## 3. Data Model (High-Level)

**Primary Entities:** `broadcast_drafts` (Read-Only).
**Excluded Data:** User data (beyond existing usage).

## 4. Admin Core Integration

**Uses Admin Core?** Yes.
**Capabilities Required:** Broadcast Messaging.

## 5. Safety Constraints

* **Firebase Functions allowed?** No
* **Auth changes allowed?** No
* **Email delivery allowed?** No
* **Production data mutation allowed?** No (Read-only query).

## 6. Definition of “Done”

* [ ] List of drafts appears in `Broadcast.tsx`.
* [ ] Clicking a draft fills the Subject and Body fields.
* [ ] Empty state handles "No drafts".
* [ ] Build passes.
