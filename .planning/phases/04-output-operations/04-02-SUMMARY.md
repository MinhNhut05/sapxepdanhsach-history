---
phase: 04-output-operations
plan: 02
status: completed
completed: 2026-04-08
requirements_completed:
  - EXPT-01
  - EXPT-02
  - EXPT-03
  - EXPT-04
  - EXPT-06
verification:
  - npm run test -- tests/allocation/export-allocation-workbook.test.ts tests/api/allocation-export-route.test.ts
  - npm run typecheck
---

# Phase 4 Plan 02 Summary

Plan `04-02` delivered the production workbook export path on top of the shared authoritative output projection.

## Accomplishments

- Added `export-allocation-workbook.ts` using `exceljs` to generate one `Tổng hợp` sheet plus one `Phòng XX` sheet per room.
- Kept workbook column order locked to the Phase 4 output contract and froze the header row for operational use.
- Added `/api/allocations/[id]/export` so workbook downloads are generated server-side from the authoritative saved run.
- Reused the retention-aware load path so missing or expired runs fail closed during export.
- Added regression tests that reopen the generated workbook bytes and verify sheet structure plus edited-room parity.

## Key Files

- `src/features/allocation/server/export-allocation-workbook.ts`
- `src/app/api/allocations/[id]/export/route.ts`
- `src/features/allocation/server/project-output-records.ts`
- `tests/allocation/export-allocation-workbook.test.ts`
- `tests/api/allocation-export-route.test.ts`

## Notes

- This plan was executed inline in the working tree; no per-task git commits were created.
