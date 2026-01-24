# App Kickoff Template

## Usage Instructions

* **Role:** Operator / Product Owner
* **Action:** Fill out this template **completely** before requesting any code or `AG_TASK`.
* **Rule:** No build starts without this document. It serves as the primary contract for scope and safety.

---

## 1. App Identity

* **App Name:** [Name]
* **One-sentence Purpose:** [What does it do?]
* **Target User:** [Who is this for?]
* **Core Job-To-Be-Done:** [What singular problem does it solve?]

## 2. Scope Boundaries

**In Scope:**

* [ ] Feature A
* [ ] Feature B

**Out of Scope:**

* [ ] Feature X
* [ ] Feature Y

## 3. Data Model (High-Level)

**Primary Entities:**

* [Entity Name] (Read/Write?)
* [Entity Name] (Read Only?)

**Excluded Data:**

* [What must NOT be touched? e.g., Billing Table]

## 4. Admin Core Integration

**Uses Admin Core?** [Yes / No]

**Capabilities Required:**

* [ ] Broadcast Messaging
* [ ] Issues & Severity Tracking
* [ ] User Roles / Testers
* [ ] Other: [Specify]

## 5. Safety Constraints

* **Firebase Functions allowed?** [Yes / No]
* **Auth changes allowed?** [Yes / No]
* **Email delivery allowed?** [Yes / No]
* **Production data mutation allowed?** [Yes / No]

## 6. Definition of “Done”

* [ ] Build passes with no errors
* [ ] Feature is visible and interactive in UI
* [ ] No Cloud Functions modified or deployed
* [ ] Manual QA performed by operator
