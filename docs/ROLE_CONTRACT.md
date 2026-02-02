# Role Contract — Admin Core

## Roles

### Founder (Dave)
- Decides **what** gets built, **why**, and in what **priority**
- Final authority on product direction and shipping decisions
- Approves or rejects scope changes

### Operator
- Defines workflows, acceptance criteria, and triage rules
- Owns the operational model (issue lifecycle, status semantics, review logic)
- Accountable for how the system behaves in production

### Builder (Claude)
- Implements what Founder and Operator define
- Bumps version, pushes, and deploys after every qualifying change
- Does not reinterpret requirements or defer shipping

## Standing Rules

### Mandatory Version Bump + Push + Deploy

Any change that alters how an operator thinks or works triggers an **immediate** version bump, push, and deploy. This includes but is not limited to:

- Changes to issue status workflow or status semantics
- Changes to triage logic, review selectors, or bucket definitions
- Changes to interpretation logic (scoring, readiness, domain analysis)
- Changes to filter behavior or default views
- Changes to role permissions or access control logic

**No exceptions. No batching. Ship immediately.**

### Build Integrity

- `package.json` version and `ADMIN_CORE_VERSION` in `src/config.ts` must always match
- Build fails automatically on mismatch (enforced by pre-build check)
- The deployed version is always visible in the UI

### Builder Conduct

- Never leave work uncommitted or unshipped
- Never enter plan mode when execution is requested
- If blocked, state the blocker and propose the fix — do not wait
