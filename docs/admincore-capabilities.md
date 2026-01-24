# Admin Core Capability: Broadcast Messaging

## 1. Overview

Admin Core serves as the "Command Center" for platform operators. It is distinct from the end-user product apps (ExamCoach, InterviewPrep). Its purpose is to provide high-leverage control, visibility, and safety for manual interventions, decoupling operator risk from product stability.

## 2. Capability: Broadcast Messaging

Broadcast Messaging is a **draft-first**, **audience-scoped**, and **operator-controlled** communication capability within Admin Core.

It allows operators to:

* Define specific user segments (e.g., Testers).
* Draft communication content safely.
* Log the intent to communicate without triggering immediate side effects.

**Crucially, this capability:**

* **Does NOT send emails automatically.**
* **Does NOT touch product apps** (it leaves the ExamCoach codebase entirely untouched).

## 3. Canonical Use Case: Tester Expectation Reset

The defining scenario for this capability is the **Desktop vs. Mobile Expectation Reset**.

* **Trigger:** Testers reported confusion and bugs regarding phone support, which is not yet optimized.
* **Action:** An operator drafts a clear, strictly targeted "Broadcast Message" apologizing for the confusion and guiding users to Desktop.
* **Audience:** `Testers` only (identified via the `testerOverride` flag).
* **Outcome:** Expectations are reset, feedback quality improves, and trust is preserved—all without deploying a hotfix to the product UI or running dangerous scripts on the production database.

## 4. Operator Value

* **Reduces Operational Risk:** By forcing a "Draft & Preview" step, it eliminates the "fat finger" risk of emailing the wrong 10,000 users.
* **Preserves Production Stability:** Communication logic lives in the Admin tool, not the User App. If the messaging logic breaks, the User App stays online.
* **Enables Cross-App Control:** A single Admin Core can manage communication for multiple distinct product lines.
* **Scales:** It provides standard tooling that works whether you have 10 testers or 10,000.

## 5. Explicit Non-Goals

Broadcast Messaging deliberately avoids:

* **Auto-sending:** There are no automated triggers or cron jobs.
* **Infrastructure Coupling:** It does not depend on specific providers like SendGrid or AWS SES within the codebase.
* **Firebase Functions:** It does not invoke cloud functions to perform its work.
* **Product UI Modification:** It never injects banners, toasts, or modals into the user's application experience.
