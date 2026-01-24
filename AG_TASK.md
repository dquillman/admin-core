# AG_TASK: Issue Classification Filter

**Task:** Add client-side filtering and sorting by issue classification.

## 🔒 EXECUTION CONSTRAINTS

* **Branch:** `feat/issue-classification-filter`
* **Scope:** `src/pages/Issues.tsx` ONLY.
* **Safety:** UI-only. NO Backend queries.

## 🧩 REQUIREMENTS

1. **Filter Controls**:
    * Add a new dropdown next to the Severity/Type filters.
    * Options: All, Blocking, Misleading, Trust, Cosmetic, Unclassified.
    * State: `filterClassification`.

2. **Filtering Logic**:
    * Update `filteredIssues` useMemo.
    * If `filterClassification` is set, only return issues matching `classification`.
    * Handle "Unclassified" correctly (where `classification` is undefined/null).

3. **Sorting Logic (Group by Risk)**:
    * Add a new sort option: "Risk (Classification)".
    * Order: Blocking > Misleading > Trust > Cosmetic > Unclassified.

4. **Verify Build**:
    * Run `npm run build`.

## 📦 COMPLETION CRITERIA

* Filters working.
* Sorting working.
* Code committed.
* Build passed.
