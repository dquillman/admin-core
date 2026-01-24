# AG_TASK: Broadcast Draft Visibility

**Task:** Implement a read-only list of broadcast drafts that can be loaded into the compose form.

## 🔒 EXECUTION CONSTRAINTS

* **Branch:** `feat/broadcast-draft-list`
* **Scope:** `src/pages/Broadcast.tsx` (or new component if preferred).
* **Safety:** Read-Only query. NO Functions. NO Auth.

## 🧩 REQUIREMENTS

1. **UI Implementation**:
    * Add a new section: "Saved Drafts (Read-Only)".
    * Fetch documents from `broadcast_drafts` collection.
    * Sort by `createdAt` desc, Limit 20 (or `updatedAt` if that's what we saved previously - checking schema implies `timestamp` or similar). Rules say `updatedAt`, but check what we actually saved (`createdAt`).
    * Render list items:
        * Subject (truncate if needed)
        * Date (formatted)
        * Creator email

2. **Interaction**:
    * On click -> `setSubject(draft.subject)`, `setMessage(draft.body)`, `setAudience(draft.audience)`.
    * Add modest visual feedback (cursor-pointer, hover bg).

3. **Correctness**:
    * Handle empty state ("No saved drafts yet.").
    * Handle loading state.

4. **Verify Build**:
    * Run `npm run build`.

## 📦 COMPLETION CRITERIA

* Drafts listed.
* Form populates on click.
* Code committed.
* Build passed.
