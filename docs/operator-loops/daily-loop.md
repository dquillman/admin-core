# Daily Operator Loop: Sustaining the Factory

## 1. Purpose

The Daily Operator Loop exists to:

* **Maintain progress** without heroic effort.
* **Prevent thrash** by limiting context switching.
* **Keep decisions small and reversible** to avoid "big bang" failures.
* **Protect the Operator** from burnout.

## 2. Start of Day (5–10 minutes)

Before any code is written:

1. **Review [START-HERE](../START-HERE.md):** Re-orient yourself to the Golden Path.
2. **Check Factory Freeze:** Ask "Am I rested enough to be dangerous?" If no, stay frozen.
3. **Identify One Target:** Pick **ONE** small feature or fix for the day.
4. **Confirm Readiness:** Is the Kickoff/Pre-Flight done for this target?

## 3. Build Window

When the Factory is running:

* **One Task:** Execute exactly one `AG_TASK.md` at a time.
* **No Chaining:** Do not start Task B until Task A is fully verified.
* **Stop on Friction:** If AG gets confused or stuck, STOP. Do not fight it.

## 4. Verification Window

After AG reports completion:

1. **Deploy:** Push to staging/production if applicable.
2. **Manual QA:** Open the browser. Click the buttons. verify the fix.
3. **Decision:**
    * **PASS:** Merge and close.
    * **ROLLBACK:** Revert immediate if issues found.
    * **DEFER:** If complex debugging needed, pause and plan.

## 5. Close of Day (5 minutes)

1. **Commit Status:** Ensure no uncommitted work is left in `git status`.
2. **Capture Notes:** Write down what was easy/hard today for future reference.
3. **Evaluate Freeze:** If today was exhausting, declare a preemptive Freeze for tomorrow morning.

## 6. What Not to Do

* **Late-night Scope Expansion:** "While I'm here" at 11 PM is forbidden.
* **Multiple Parallel Builds:** One brain, one build.
* **Skipping Pre-Flight:** "It's just a text change" is a lie.
* **"I'll clean it up tomorrow":** Leave the codebase clean today.
