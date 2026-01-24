# App Kickoff: Versioning Convention

## 1. App Identity

* **App Name:** Admin Core (Versioning Standardization)
* **One-sentence Purpose:** Establish a single, obvious source of truth for the application version to prevent future search loops.
* **Target User:** Developers / Operators (Dave + AG).
* **Core Job-To-Be-Done:** Developers must know exactly where to update the version and where it is displayed.

## 2. Scope Boundaries

**In Scope:**

* [x] Create/Update `src/config.ts` (or similar) as the Single Source of Truth.
* [x] Export `ADMINCORE_VERSION` constant.
* [x] Update `Sidebar.tsx` to import and use this constant.
* [x] Document the convention in `docs/conventions/versioning.md`.

**Out of Scope:**

* [ ] Reading from `package.json` (avoiding fs limits or build complexities for now).
* [ ] Auto-increment scripts.
* [ ] Displaying version in other components.

## 3. Data Model (High-Level)

**Primary Entities:**

* None. (Config/UI only)

**Excluded Data:**

* All backend data.

## 4. Admin Core Integration

**Uses Admin Core?** Yes (Internal Convention).

**Capabilities Required:**

* [ ] Broadcast Messaging
* [ ] Issues & Severity Tracking
* [ ] User Roles / Testers
* [x] Other: Developer Experience (DX).

## 5. Safety Constraints

* **Firebase Functions allowed?** No
* **Auth changes allowed?** No
* **Email delivery allowed?** No
* **Production data mutation allowed?** No

## 6. Definition of “Done”

* [ ] `ADMINCORE_VERSION` defines the version string in one place.
* [ ] `Sidebar.tsx` imports and displays it.
* [ ] Build passes.
* [ ] Documentation exists.
