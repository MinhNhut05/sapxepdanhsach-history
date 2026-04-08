---
phase: 05-smart-intake-core
plan: 03
subsystem: intake-review-ui
tags: [smart-intake, review, allocation-gating, workspace]
requires:
  - phase: 05-smart-intake-core
    provides: smart intake contracts and review-required payloads
provides:
  - Upload surface that distinguishes ready, review_required, and failed intake states
  - Intake review workspace with confidence groups, audit details, and operator confirmations
  - Allocation gating that unlocks only when intakeState becomes ready
affects: [roster-upload, intake-review-ui, allocation-workspace]
tech-stack:
  added: []
  patterns: [review workspace, readiness gating, shared warning surface]
key-files:
  created:
    - src/features/roster/ui/intake-review-panel.tsx
  modified:
    - src/features/roster/ui/upload-panel.tsx
    - src/features/allocation/ui/allocation-workspace.tsx
    - src/features/allocation/ui/allocation-warning-panel.tsx
    - tests/ui/upload-panel.test.tsx
    - tests/ui/allocation-workspace.test.tsx
key-decisions:
  - "Keep clean-file imports on the existing fast path while holding review_required imports inside the homepage workspace."
  - "Require explicit operator confirmation before studentCode/className repairs can promote the intake payload to ready."
  - "Reuse the allocation warning surface so intake review warnings stay visible through the same workspace flow."
patterns-established:
  - "Pattern 1: allocationDisabled remains true whenever importResult.intakeState !== ready."
  - "Pattern 2: review payloads render through IntakeReviewPanel before downstream allocation actions unlock."
requirements-completed: [REVW-02, REVW-03, AUDT-01, SAFE-04]
duration: 40 min
completed: 2026-04-08
---

# Phase 05 Plan 03: Review workspace and allocation gating Summary

**Operator-facing Smart Intake review surface and allocation gating for review_required imports**

## Performance

- **Duration:** khoảng 40 phút
- **Tasks:** 3

## Accomplishments
- Updated the upload surface to accept `.xlsx`, `.xls`, and `.csv`, and to distinguish `ready`, `review_required`, and `failed` intake states.
- Added a Smart Intake review workspace with confidence groups, audit details (`rawValue`, `proposedValue`, `source`, `confidence`, `reasoning`), and required confirmations for `studentCode`/`className`.
- Gated the allocation workspace on `importResult.intakeState !== "ready"` so allocation only unlocks after operator confirmation.

## Task Commits

Each task was committed atomically:

1. **Task 1: Update the upload surface to understand ready, review_required, and failed Smart Intake states** - `c555d4d` (feat)
2. **Task 2: Build the intake review panel with confidence groups, audit details, and operator confirmation controls** - `94f2473` (feat)
3. **Task 3: Gate allocation on Smart Intake readiness and verify the review flow in workspace tests** - `b8f882b` (feat)

## Verification

- `npm run test -- tests/ui/upload-panel.test.tsx tests/ui/allocation-workspace.test.tsx`
- `npm run typecheck`

## Deviations from Plan

- Brought forward Phase 05-01 foundation commits before implementing the UI work because the execution worktree lacked the intended smart-intake base.
- Synced baseline allocation workspace files into the worktree because repo drift had left the checkout without the current allocation UI layer.

## Issues Encountered
- Planning metadata could not be finalized in the original execution worktree because `.planning/phases/05-smart-intake-core` was missing there.

## Next Phase Readiness
- The homepage now preserves the clean-file flow while safely stopping messy files in review until the operator clears them.
- Phase 05-04 can add optional AI assistance on top of the same review and gating model without changing downstream allocation semantics.

## Self-Check: PASSED
- Verified task commits `c555d4d`, `94f2473`, and `b8f882b` exist in git history.
- Verified targeted UI tests and typecheck passed during execution.
