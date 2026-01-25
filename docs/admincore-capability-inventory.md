# Admin Core: Capability Inventory & Positioning

**Status:** Live Document
**Scope:** Internal Positioning & Operator Reference

---

## 1. Capability List (Current)

### Broadcast Messaging

* **Controls:** Drafting, audience segmentation (`Testers` vs `All Users`), and logging of internal communication drafts.
* **Does NOT Touch:** Email delivery providers (SendGrid), user-facing notifications, or message dispatching.

### Issues & Severity Tracking

* **Controls:** Triage, categorization (`S1`-`S4`), and state management (`Open`, `In Progress`, `Resolved`) of user-reported issues.
* **Does NOT Touch:** The user's actual application state or data; strictly a metadata layer for operators.

### Operator Notes

* **Controls:** Structured, internal-only contextual notes attached to Users or Issues. Includes templating for consistency.
* **Does NOT Touch:** User visible data. Notes are strictly sequestered from the user experience.

### User Roles & Tester Identification

* **Controls:** Access to Admin Core (Role: `admin`) and identification of beta cohorts (Tester Override).
* **Does NOT Touch:** Authentication providers (Google Auth) logic or underlying user account creation.

---

## 2. Capability Maturity

| Capability | Status | Risk Level | Dependency |
| :--- | :--- | :--- | :--- |
| **Broadcast Messaging** | **Active** (Drafting Only) | **Low** | UI + Firestore |
| **Issues Tracking** | **Active** | **Low** | UI + Firestore |
| **Operator Notes** | **Hardened** | **Low** | UI + Firestore |
| **User Roles** | **Hardened** | **Medium** | Backend (Claims) |
| **Data Integrity View** | **Draft** | **Low** | UI (Read-Only) |

**Definitions:**

* **Risk Level:**
  * *Low:* Failure affects Operator experience only.
  * *Medium:* Failure could affect specific User access or features.
  * *High:* Failure could bring down the Platform.
* **Dependency:**
  * *UI Only:* Logic lives ensuring in the localized client.
  * *Backend:* Relies on Firestore rules or simple SDK writes.
  * *Infra:* Requires Cloud Functions, external APIs, or heavy computation.

---

## 3. Design Principles

Admin Core is built to empower the Human Operator without endangering the Platform.

### 1. Control without Disruption

Admin actions should never degrade the performance or stability of the consumer applications (ExamCoach). We prefer "soft" controls (flags, drafts) over "hard" mutations.

### 2. UI before Infrastructure

We solve problems in the Admin UI first. We do not spin up cloud infrastructure (queues, jobs, functions) until the manual/UI-based workflow is proven insufficient.

### 3. Human-in-the-loop by Default

Automation is a force multiplier, not a replacement. Admin Core presents data for *Human Decision*, it does not make decisions for the Human (e.g., no auto-banning, no auto-sending).

---

## 4. Future Capabilities (Non-Commitment)

*The following are potential capabilities for future exploration. They are NOT currently implemented.*

* **[Future] Email Delivery:** Integration with SendGrid/SES to dispatch the Broadcast Drafts.
* **[Future] Cross-App Alerts:** Unified dashboard for health signals across ExamCoach, InterviewPrep, and Marketing sites.
* **[Future] Incident Response:** "Big Red Button" features to toggle maintenance mode or read-only states during outages.
