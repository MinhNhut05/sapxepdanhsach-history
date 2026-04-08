---
phase: 04-output-operations
plan: 04
status: completed
completed: 2026-04-08
requirements_completed:
  - EXPT-01
  - EXPT-05
  - HIST-02
  - SAFE-03
verification:
  - npm run test -- tests/ui/allocation-operations-panel.test.tsx tests/ui/allocation-workspace.test.tsx tests/ui/print-room-view.test.tsx tests/smoke/homepage.test.tsx
  - npm run build
  - npm run typecheck
---

# Phase 4 Plan 04 Summary

Plan `04-04` integrated history reopening and output actions into the homepage workspace.

## Accomplishments

- Added `allocation-history-panel.tsx` to surface retention-aware saved-run history and `Mở lại` actions on the homepage.
- Added `allocation-output-actions.tsx` so the current authoritative saved run exposes `Xuất Excel` and room-specific print links.
- Updated `allocation-workspace.tsx` to load history independently, reopen saved runs without requiring a new import, and keep warnings/output actions consistent with the current authoritative source.
- Added focused operations panel tests plus expanded workspace tests covering history fetch, reopen success, retention-aware reopen failures, and persistent export/print links.
- Removed the homepage smoke-test `act(...)` warning by waiting for the history load to settle in the test.

## Key Files

- `src/features/allocation/ui/allocation-history-panel.tsx`
- `src/features/allocation/ui/allocation-output-actions.tsx`
- `src/features/allocation/ui/allocation-workspace.tsx`
- `tests/ui/allocation-operations-panel.test.tsx`
- `tests/ui/allocation-workspace.test.tsx`
- `tests/smoke/homepage.test.tsx`

## Notes

- This plan was executed inline in the working tree; no per-task git commits were created.
