---
phase: 06-customer-feedback-hardening-flexible-import-sheet-detection-strict-room-class-fairness-template-locked-export-parity-and-ai-verification-gate
plan: 02
subsystem: allocation
tags: [allocation, fairness, representative_ratio, validation, review-ui, vitest]
requires:
  - phase: 02-allocation-engine
    provides: deterministic room allocation strategies and capacity balancing
  - phase: 03-review-manual-editing
    provides: review summary and fairness dashboard surfaces
provides:
  - feasibility-aware strict fairness assignment for representative allocation
  - class spread validation and machine-readable fairness diagnostics
  - review summary and fairness matrix visibility for strict fairness status
  - regression fixtures for feasible and infeasible fairness cases
affects: [allocation, preview, manual-editing, fairness-ui, regression-tests]
tech-stack:
  added: []
  patterns: [feasibility-aware allocation metadata, strict class spread diagnostics, deterministic fallback signaling]
key-files:
  created:
    - tests/allocation/strict-class-fairness.test.ts
  modified:
    - src/features/allocation/domain/allocation-types.ts
    - src/features/allocation/domain/assign-representative-ratio.ts
    - src/features/allocation/domain/create-allocation-run.ts
    - src/features/allocation/domain/validate-allocation-result.ts
    - src/features/allocation/domain/build-review-summary.ts
    - src/features/allocation/ui/allocation-fairness-matrix.tsx
    - tests/allocation/create-allocation-run.test.ts
    - tests/allocation/build-review-summary.test.ts
    - tests/allocation/strategy-algorithms.test.ts
key-decisions:
  - "Representative ratio now computes strict fairness feasibility before assignment and falls back deterministically with explicit reason metadata when strict spread cannot be satisfied."
  - "Per-class spread diagnostics are emitted by validation/review summary instead of being recomputed in the UI."
patterns-established:
  - "Allocation strategies can return machine-readable feasibility metadata alongside room drafts when strategy behavior has hardening modes."
  - "Strict fairness validation only blocks feasible runs; infeasible runs stay usable but carry explicit fallback diagnostics."
requirements-completed: [ALOC-04, ALOC-06, PREV-04, EDIT-04, CF-FAIRNESS-01]
duration: 20 min
completed: 2026-04-10
---

# Phase 06 Plan 02: Strict class fairness feasibility, fallback, and diagnostics Summary

**Representative-ratio allocation now enforces per-class spread <= 1 when feasible and exposes deterministic fallback diagnostics in validation and review UI when infeasible.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-04-10T15:56:16Z
- **Completed:** 2026-04-10T16:16:17Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Added feasibility-aware representative allocation that computes strict class targets and returns deterministic fallback metadata.
- Extended validation and review summary contracts with `classSpreadByClass`, `classSpreadViolations`, and `fairnessFeasibility`.
- Added regression coverage for feasible strict fairness, infeasible fallback behavior, and result determinism.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add feasibility-aware strict class-fairness assignment for representative strategy** - `87bdeff` (feat)
2. **Task 2: Enforce class spread validation and expose violations in review summary** - `8713a02` (feat)
3. **Task 3: Add strict-fairness regression fixtures for feasible and infeasible datasets** - `31f3db7` (fix)

## Files Created/Modified
- `src/features/allocation/domain/allocation-types.ts` - added fairness feasibility and class spread diagnostic types.
- `src/features/allocation/domain/assign-representative-ratio.ts` - implemented strict feasibility planning and deterministic fallback signaling.
- `src/features/allocation/domain/create-allocation-run.ts` - threaded fairness metadata through validation and summary building.
- `src/features/allocation/domain/validate-allocation-result.ts` - computes per-class spread metrics and feasibility-aware violations.
- `src/features/allocation/domain/build-review-summary.ts` - surfaces fairness diagnostics and fallback warnings for review consumers.
- `src/features/allocation/ui/allocation-fairness-matrix.tsx` - renders strict fairness status, fallback messaging, and spread tables.
- `tests/allocation/strict-class-fairness.test.ts` - feasible/infeasible fixture coverage for strict fairness behavior.
- `tests/allocation/create-allocation-run.test.ts` - verifies fairness metadata on representative runs.
- `tests/allocation/build-review-summary.test.ts` - verifies machine-readable diagnostics and fallback warnings.
- `tests/allocation/strategy-algorithms.test.ts` - updated strategy test for fairness-aware allocator return shape.

## Decisions Made
- Representative allocation keeps existing deterministic capacity balancing, but now treats strict fairness as an explicit feasibility contract instead of a soft best-effort heuristic.
- Review/UI consumers read fairness diagnostics directly from the summary object so API, saved-run, and UI behavior stay aligned.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed extra-seat distribution so one class cannot receive multiple strict-fairness extras in the same room**
- **Found during:** Task 3 (Add strict-fairness regression fixtures for feasible and infeasible datasets)
- **Issue:** The first strict allocation implementation could repeatedly assign remainder seats for the same class into one room, which violated the intended spread `<= 1` construction.
- **Fix:** Changed extra-seat distribution to allocate extras to distinct eligible rooms in deterministic capacity order.
- **Files modified:** `src/features/allocation/domain/assign-representative-ratio.ts`
- **Verification:** `npm run test -- tests/allocation/strict-class-fairness.test.ts tests/allocation/create-allocation-run.test.ts tests/allocation/build-review-summary.test.ts`
- **Committed in:** `31f3db7`

**2. [Rule 3 - Blocking] Updated existing strategy test for new representative allocator return shape**
- **Found during:** Final verification
- **Issue:** `assignRepresentativeRatio()` now returns rooms plus fairness metadata, which broke an older algorithm test expecting only room drafts.
- **Fix:** Updated `tests/allocation/strategy-algorithms.test.ts` to assert against `allocation.rooms`.
- **Files modified:** `tests/allocation/strategy-algorithms.test.ts`
- **Verification:** `npm run typecheck`
- **Committed in:** `31f3db7`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes were necessary to make strict fairness behavior correct and to keep verification green. No scope creep.

## Issues Encountered
- The initial infeasible regression fixture accidentally described a feasible global room-capacity layout, so the test was refined to exercise infeasibility through custom capacities at the allocator level.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Strict fairness behavior is now explicit, deterministic, and reviewable for representative allocation.
- Phase 06-03 can build on these saved-run fairness diagnostics without re-deriving allocation state.

## Self-Check: PASSED
- Verified commit hashes `87bdeff`, `8713a02`, and `31f3db7` exist in git history.
- Verified key artifact exists: `/home/minhnhut_dev/projects/sapxepdanhsach/tests/allocation/strict-class-fairness.test.ts`.

---
*Phase: 06-customer-feedback-hardening-flexible-import-sheet-detection-strict-room-class-fairness-template-locked-export-parity-and-ai-verification-gate*
*Completed: 2026-04-10*
