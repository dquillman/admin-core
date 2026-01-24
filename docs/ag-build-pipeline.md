# AG Build Pipeline: End-to-End Operator Flow

## 1. Purpose

The AG Build Pipeline exists to:

* **Reduce build time:** Eliminate back-and-forth clarification cycles.
* **Eliminate ambiguity:** Force design decisions to happen *before* execution starts.
* **Prevent unsafe changes:** Ensure strict adherence to safety protocols (frontend only, no auth/functions without permission).
* **Keep the Operator (Dave) in control:** Human judgment always precedes and succeeds AI execution.

## 2. Phase 0: App Definition

* **Action:** Operator fills out `docs/templates/app-kickoff.md`.
* **Rule:** No build starts without a completed kickoff document.
* **Goal:** Define Identity, Scope, Data Model constraints, and Integration points explicitly.

## 3. Phase 1: Task Contract Creation

* **Action:** Translate the completed Kickoff Template into an `AG_TASK.md` artifact.
* **Requirements:**
  * **Scope** must be explicit (files to touch, features to build).
  * **Safety Rules** must be copied verbatim (e.g., "NO Firebase Functions").
  * **Forbidden Areas** must be stated (e.g., "Do not touch ExamCoach codebase").
* **Output:** A rigid execution contract for the AI.

## 4. Phase 2: AG Execution

* **Mode:** AG runs in **EXECUTION MODE** only.
* **Behavior:**
  * Reads `AG_TASK.md` (Source of Truth).
  * Validates requirements.
  * Implements changes.
  * Commits code.
  * **STOPS.**
* **Constraints:** No login attempts. No deployments. No inference of intent. No "thinking loops."

## 5. Phase 3: Operator Verification

* **Actor:** Dave (Operator).
* **Actions:**
  * Deploys to staging/production (if applicable).
  * Performs manual QA execution in the browser.
  * Validates against the "Definition of Done" from Phase 0.
* **Rule:** AG **never** performs this phase. Verification requiring browser interaction is strictly a human responsibility.

## 6. Phase 4: Admin Core Integration

* **Integration:** How the new feature fits into the Command Center.
* **Capabilities:**
  * **Broadcast Messaging:** For announcements/incidents.
  * **Issues & Severity:** For tracking bugs found in the new app.
  * **Operator Notes:** For internal context.
* **Philosophy:** Admin Core is the "Control Plane." It is never bypassed for operational tasks.

## 7. Failure Modes & Corrections

* **AG drifts:** STOP immediately. Restate the task in `AG_TASK.md` with tighter constraints.
* **Functions touched:** Immediate rollback. Investigate why constraints were ignored.
* **Scope creep:** Split the task. Finish the current unit, then create a new `AG_TASK.md` for the extra scope.
* **Auth issues:** Operator fixes these manually. AG is not trusted with Auth debugging unless strictly documented.

## 8. What This Pipeline Deliberately Avoids

* **No Autonomous Agents:** The AI does not wander the codebase looking for work.
* **No Orchestration Tools:** We do not use complex multi-agent frameworks.
* **No Background Automation:** No unauthorized cron jobs or listeners.
* **No n8n:** Logic stays in code, not low-code flows.
* **No "AI Thinking Loops":** Execution is linear and finite.
