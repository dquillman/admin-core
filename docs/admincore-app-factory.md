# Admin Core: The App Factory & Control Plane

## 1. Definition

**Admin Core is the App Factory.**
It is not just an admin panel; it is the operational substrate from which all other applications (ExamCoach, InterviewPrep, etc.) are managed, monitored, and maintained.

* **Product Apps** are clients of this infrastructure.
* **AG** is the execution engine that builds within this framework.
* **The Operator (Dave)** is the final authority and architect.

## 2. What “App Factory” Means Here

In this context, an "App Factory" represents a system for **Standardized, Deterministic Output**.

* **Standardized Starts:** Every feature begins with the same Kickoff Template.
* **Deterministic Builds:** We use strict contracts (`AG_TASK.md`) to ensure predictable results.
* **Guardrails-First Execution:** Safety checks run *before* code is written, not after.
* **Human-in-the-loop:** The Factory automates execution, but never strategy or auditing.

**What it relies on:**

* Rigid documentation.
* Strict role separation (AG executes, Dave verifies).
* Zero-trust for unauthorized automation.

**What it explicitly REJECTS:**

* **Full Autonomy:** Agents do not define their own tasks.
* **Self-Directed Agents:** No loops looking for work.
* **Unbounded Generation:** No "make it better" prompts without specific constraints.

## 3. Factory Components

The Factory is composed of these authoritative documents:

1. **[START-HERE](./START-HERE.md):** The single entry point.
2. **[Kickoff Template](./templates/app-kickoff.md):** The definition phase.
3. **[Pre-Flight Checklist](./preflight/ag-task-preflight.md):** The safety gate.
4. **[AG_TASK.md](../AG_TASK.md):** The execution contract.
5. **[Guardrails](./ag-guardrails.md):** The laws of physics for AG.
6. **[Build Pipeline](./ag-build-pipeline.md):** The process map.
7. **[Admin Core Capabilities](./admincore-capabilities.md):** The inventory of tools.

## 4. Why This Exists

* **Speed with Safety:** Move fast without breaking production.
* **Reduced Cognitive Load:** Don't reinvent the "how" for every new feature.
* **Repeatability:** A bug fixed once in the process stays fixed.
* **Trust under Fatigue:** A system to lean on when the Operator is tired.

## 5. Non-Goals

This Factory is **NOT** intended to:

* Replace the Operator's judgment.
* Automate business strategy.
* Generate "creative" code without prompt engineering.
* Run unattended.
