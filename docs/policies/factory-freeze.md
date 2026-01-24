# Factory Freeze Policy

## 1. Purpose

The AG Factory is a powerful engine for speed, but uncontrolled speed leads to accidents. This policy defines when the Factory must be deliberately **PAUSED** to protect the Operator (Dave) and the Platform from burnout-driven errors.

## 2. When the Factory Is OPEN

The Factory is open for business only when:

* **Clear Objective:** You know exactly what you want to build.
* **Fresh Context:** You are not carrying the cognitive load of 10 previous failed attempts.
* **Pre-Flight Completed:** The checklist is checked, not just skimmed.
* **Time for QA:** You have the energy and time to manually verify the output.

## 3. When the Factory Is FROZEN

The Factory must be immediately **FROZEN** if:

* **Extreme Fatigue:** You are too tired to read the diffs carefully.
* **Emotional Distress:** Frustration or panic is driving the decision-making.
* **Production Instability:** The live site is flickering, and "quick fixes" are making it worse.
* **Multiple Consecutive Fixes:** You have patched the same bug 3 times in a row.
* **"Just One More Thing":** You find yourself saying this past midnight.

## 4. Freeze Rules

When Frozen:

* **NO `AG_TASK` Execution:** The AI is grounded. No new code generation.
* **Documentation Allowed:** You may write notes, journals, or documentation.
* **Notes Allowed:** You may dump context into a scratchpad.
* **Decisions Deferred:** No architectural or deployment decisions until Unfrozen.

## 5. Unfreeze Procedure

To re-open the Factory:

1. **Rest:** Step away physically.
2. **Review:** Read [`docs/START-HERE.md`](../START-HERE.md).
3. **Audit:** Read [`docs/ag-guardrails.md`](../ag-guardrails.md) to recenter on safety.
4. **Check:** Re-run the [`docs/preflight/ag-task-preflight.md`](../preflight/ag-task-preflight.md).
5. **Proceed:** Only then, submit the next task.
