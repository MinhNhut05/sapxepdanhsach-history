---
phase: 04-output-operations
plan: 01
status: completed
completed: 2026-04-08
requirements_completed:
  - EXPT-04
  - EXPT-06
  - HIST-02
  - SAFE-03
verification:
  - npm run test -- tests/allocation/project-output-records.test.ts tests/api/allocations-route.test.ts tests/api/allocation-run-route.test.ts
  - npm run typecheck
---

# Phase 4 Plan 01 Summary

Plan `04-01` established the server foundation for every later output and reopen flow in Phase 4.

## Accomplishments

- Added explicit output/history/retention contracts to `allocation-types.ts`, including `AllocationOutputRow`, `AllocationHistoryItem`, and `AllocationHistoryResponse`.
- Created `project-output-records.ts` so export and print can read one authoritative row projection instead of rebuilding room rows independently.
- Added retention-aware history helpers and a list service that prunes expired runs before returning reopen metadata.
- Hardened `loadAllocationRun` so expired runs fail closed as not found and are pruned on access.
- Extended `GET /api/allocations` to return retention metadata plus saved-run history for the homepage workspace.

## Key Files

- `src/features/allocation/domain/allocation-types.ts`
- `src/features/allocation/server/project-output-records.ts`
- `src/features/allocation/server/history-retention.ts`
- `src/features/allocation/server/list-allocation-runs.ts`
- `src/features/allocation/server/load-allocation-run.ts`
- `src/app/api/allocations/route.ts`
- `tests/allocation/project-output-records.test.ts`
- `tests/api/allocations-route.test.ts`
- `tests/api/allocation-run-route.test.ts`

## Notes

- This plan was executed inline in the working tree; no per-task git commits were created.
