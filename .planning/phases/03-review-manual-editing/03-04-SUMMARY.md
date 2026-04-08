---
phase: 03-review-manual-editing
plan: 04
status: completed
completed: 2026-04-08
requirements_completed:
  - PREV-01
  - PREV-05
  - EDIT-04
  - EDIT-05
verification:
  - npm run lint
  - npx prisma validate
  - npx prisma db push
  - npm run test -- tests/ui/allocation-workspace.test.tsx tests/api/allocation-run-route.test.ts
  - npm run build
  - npm run typecheck
---

# Phase 3 Plan 04 Summary

Plan `03-04` closed the review-to-edit loop by wiring save/sync behavior and verifying authoritative rehydration.

## Accomplishments

- Added a dedicated save bar that exposes dirty-state messaging, blocking/warning counts, `Lưu chỉnh sửa`, `Đặt lại`, and stale/conflict feedback.
- Wired `allocation-workspace.tsx` to `PATCH /api/allocations/{id}` with `expectedEditVersion`, draft room payloads, authoritative response rehydration, and distinct `409` / validation / generic error handling.
- Ensured the save action stays disabled when `blockingIssues.length > 0` and that generic PATCH failures do not discard the current draft.
- Added workspace regression coverage for successful save rehydration, save-disabled blocking states, generic PATCH failure retention, and stale-version conflicts.
- Cleared the final close-out gates: lint, Prisma validation, schema push, build, and final typecheck.

## Key Files

- `src/features/allocation/ui/allocation-save-bar.tsx`
- `src/features/allocation/ui/allocation-workspace.tsx`
- `src/app/api/allocations/[id]/route.ts`
- `src/features/allocation/server/save-manual-edits.ts`
- `tests/ui/allocation-workspace.test.tsx`
- `tests/api/allocation-run-route.test.ts`

## Notes

- `npm run typecheck` depends on `.next/types`, so the final verification run executes `npm run build` before the terminal typecheck pass.
- This plan was executed inline in the working tree; no per-task git commits were created.
