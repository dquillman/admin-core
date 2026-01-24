# App Kickoff: Sidebar Version Display

## 1. App Identity

* **App Name:** Admin Core (Sidebar Enhancement)
* **One-sentence Purpose:** Display the current application version in the navigation sidebar.
* **Target User:** Admin Operators (Dave).
* **Core Job-To-Be-Done:** Quickly identify which version of Admin Core is currently deployed/running.

## 2. Scope Boundaries

**In Scope:**

* [x] Add a text element to the bottom of `Sidebar.tsx`.
* [x] Display static version number (e.g., "v0.X.X") or import from config.
* [x] distinct styling (small, muted text).

**Out of Scope:**

* [ ] Auto-incrementing version scripts.
* [ ] API endpoints for version checking.
* [ ] "New Update Available" notifications.

## 3. Data Model (High-Level)

**Primary Entities:**

* None. (UI Only)

**Excluded Data:**

* All Firestore data.

## 4. Admin Core Integration

**Uses Admin Core?** Yes (It IS Admin Core).

**Capabilities Required:**

* [ ] Broadcast Messaging
* [ ] Issues & Severity Tracking
* [ ] User Roles / Testers
* [x] Other: UI Enhancement only.

## 5. Safety Constraints

* **Firebase Functions allowed?** No
* **Auth changes allowed?** No
* **Email delivery allowed?** No
* **Production data mutation allowed?** No

## 6. Definition of “Done”

* [x] Build passes with no errors (`npm run build`).
* [x] Version string is visible in the Sidebar footer.
* [x] No visual regression in navigation links.
* [x] Manual QA performed by operator.
