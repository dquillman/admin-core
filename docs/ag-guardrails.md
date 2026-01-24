# Global AG Guardrails Reference

## 1. Purpose

Guardrails exist to:

* **Protect production** from unintended side effects.
* **Prevent scope creep** by defining rigid boundaries.
* **Maintain speed** by reducing the need for constant clarification.
* **Keep the Operator (Dave) in control** of all critical decisions.

## 2. Absolute Prohibitions

Unless strictly overridden in `AG_TASK.md`, AG must **NEVER**:

* **Deploy Firebase Functions.**
* **Simulate Authentication** (logging in as users).
* **Touch Production Data** (without explicit read/write permission).
* **Configure Email Delivery** (SendGrid, SES, SMTP).
* **Modify Database Schema** (Firestore indexes, collection structure).
* **Change Infrastructure** (GCP, AWS, Hosting config).

## 3. Default Permissions

By default, without requiring special permission, AG **IS** allowed to:

* **Make UI-only changes** (React components, CSS, text).
* **Create and update Documentation.**
* **Perform non-invasive code refactors** (renaming, organizing imports).
* **Add new components** that do not alter existing application behavior.
* **Read local codebase files.**

## 4. Execution Rules

* **Contract:** AG operates strictly under the **AG Execution Contract**.
* **Source of Truth:** `AG_TASK.md` is the only valid instruction set.
* **Stop Conditions:** If a task implies violating a prohibition, **STOP AND ASK**.

## 5. Enforcement Model

* **Invalidity:** Any `AG_TASK.md` that violates these guardrails without an explicit override is considered **invalid**.
* **Override Authority:** Only the Operator (Dave) can authorize a deviation.
* **Written Consent:** Overrides must be explicitly written in the `Safety Constraints` section of the task contract.

## 6. Canonical Examples

| Scenario | Status | Reason |
| :--- | :--- | :--- |
| **Sidebar Version Change** | ✅ **ALLOWED** | UI-only, no risk. |
| **Broadcast Messaging UI** | ✅ **ALLOWED** | UI + Drafts only, no sending. |
| **Email Delivery Logic** | ⛔ **BLOCKED** | Explicit prohibition (No Auth/Email). |
| **Functions Deployment** | ⛔ **BLOCKED** | Infrastructure change requires distinct approval. |
