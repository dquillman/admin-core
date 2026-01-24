# Start Here: The AG Factory Entry Point

## 1. What This Is

This is the official entry point for all development within Admin Core. It ensures every task follows the safe, standard, and operator-controlled "Golden Path" to production.

## 2. The Golden Path (5 Steps)

1. **Define Phase:** Fill out [`docs/templates/app-kickoff.md`](./templates/app-kickoff.md).
2. **Safety Check:** Review [`docs/ag-guardrails.md`](./ag-guardrails.md) to confirm safety.
3. **Contract Phase:** Generate `AG_TASK.md`. (See [`docs/ag-build-pipeline.md`](./ag-build-pipeline.md)).
4. **Execution Phase:** AG executes the task, commits, and stops.
5. **Verification Phase:** Operator performs deploys and [Manual QA](./ag-quick-start.md).

## 3. When to Use Which Document

| Situation | Document |
| :--- | :--- |
| **"I have a new idea"** | [`docs/templates/app-kickoff.md`](./templates/app-kickoff.md) |
| **"I need to build fast"** | [`docs/ag-quick-start.md`](./ag-quick-start.md) |
| **"I need to message users"** | [`docs/operator-playbooks/broadcast-messaging.md`](./operator-playbooks/broadcast-messaging.md) |
| **"I need to check rules"** | [`docs/ag-guardrails.md`](./ag-guardrails.md) |
| **"I want to understand capabilities"** | [`docs/admincore-capabilities.md`](./admincore-capabilities.md) |

## 4. Absolute Rules (Read First)

* **No build without kickoff.**
* **No code without `AG_TASK.md`.**
* **No Functions** unless explicitly authorized.
* **AG never deploys.**
* **Operator always verifies** via manual QA.

## 5. If Something Goes Wrong

1. **Stop** immediately.
2. **Re-read** [`docs/ag-guardrails.md`](./ag-guardrails.md).
3. **Split** the task into smaller execution units.
4. **Escalate** to operator decision if logic is ambiguous.
