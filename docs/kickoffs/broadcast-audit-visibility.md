# App Kickoff: Broadcast Audit Visibility

## 1. App Identity

* **App Name:** Admin Core
* **One-sentence Purpose:** Provide visibility into who created a draft and when.
* **Target User:** Operator (Dave).
* **Core Job-To-Be-Done:** Identify draft ownership and recency without DB inspection.

## 2. Scope Boundaries

**In Scope:**

* [x] Enhance Draft List items with fields (Creator, Timestamps).
* [x] Add read-only "Context Bar" when a draft is loaded.
* [x] UI-Only changes in `Broadcast.tsx`.

**Out of Scope:**

* [ ] Version history.
* [ ] "Last Edited By" logic (backend change).
* [ ] Permissions enforcement.

## 3. Data Model (High-Level)

**Primary Entities:** `broadcast_drafts` (Read-only fields: `creatorEmail`, `createdAt`).
**Excluded Data:** All other.

## 4. Admin Core Integration

**Uses Admin Core?** Yes.
**Capabilities Required:** Broadcast Messaging.

## 5. Safety Constraints

* **Firebase Functions allowed?** No
* **Auth changes allowed?** No
* **Email delivery allowed?** No
* **Production data mutation allowed?** No

## 6. Definition of “Done”

* [ ] List shows "Created by [email] on [date]".
* [ ] Loaded form shows "Original draft by [email]...".
* [ ] Build passes.
