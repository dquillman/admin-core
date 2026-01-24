# Operator Playbook: Broadcast Messaging

## 1. Purpose

**When to use:**
Use Broadcast Messaging to perform high-priority, strictly operational communication. It is designed for "Expectation Setting" and "Incident Management" where the goal is to align user behavior with platform reality.

**When NOT to use:**
Do NOT use for marketing campaigns, feature announcements, sales prompts, or automated transactional notifications (e.g., password resets).

## 2. Approved Audiences

* **Testers:**
  * *Definition:* Users with `testerOverride: true`.
  * *Usage:* Beta features, testing instructions, feedback requests.
* **All Users:**
  * *Definition:* All registered non-admin users.
  * *Usage:* Critical outages, major breaking changes, Terms of Service updates.

**Guidance:** Always bias towards the smallest effective audience. If the message sits between "Testing" and "General", send to **Testers** first.

## 3. Approved Message Types

* **Expectation Resets:** Correcting widespread user misconceptions (e.g., "Mobile is not supported yet").
* **Incident Clarifications:** Explaining downtime or bugs to prevent influx of support tickets.
* **Testing Guidance:** Directing attention to specific areas of the app for a limited time.
* **Temporary Limitations:** Warning about known issues (e.g., "Search is slow today").

**Excluded:** Marketing promos, "Upgrade Now" messages, or "New Feature" hype.

## 4. Canonical Template

**Subject:** [Action Required / Important Update]: [Topic]

[Opening Acknowledgment]
Hi everyone, we've noticed [confusion/issue] regarding [Topic].

[Clarification]
We want to clarify that [Correct Behavior/Expectation].

[What to do now]
For the time being, please [Instruction]. This is necessary because [Reason].

[Appreciation]
Thanks for sticking with us as we improve.

[Signature]
Best,
The Team

## 5. Safety Checklist (Pre-Send)

* [ ] **Correct Audience Selected:** Double-check "Testers" vs "All Users".
* [ ] **No Promises:** Avoid specific dates (e.g., "Fixed by Tuesday") unless 100% certain.
* [ ] **No UI References:** Ensure you aren't describing UI elements that might change tomorrow.
* [ ] **Draft Saved:** Save the message as a draft in Admin Core before taking any external action.

## 6. Post-Send Notes

After creating/sending a broadcast:

* Watch for a **reduction** in related issue reports (the primary success metric).
* Observe **changes in tester behavior** (e.g., stopping mobile logins).
* Note any **follow-up needs** if the message generated confusion.
