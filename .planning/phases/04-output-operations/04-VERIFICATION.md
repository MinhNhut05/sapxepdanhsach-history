---
phase: 04-output-operations
status: passed
verified: 2026-04-08T12:20:00Z
requirements_checked: 8
requirements_passed: 8
human_verification: []
---

# Phase 4 Verification

Phase 4 passed verification. The project now supports retention-aware history reopening, authoritative workbook export, room-specific print routes, and homepage operations that drive those outputs from one saved-run contract.

## Automated Checks

- `npm run test`
- `npm run build`
- `npm run typecheck`

All checks passed on the verified code state.

## Requirement Coverage

### EXPT-01
Passed. `src/features/allocation/server/export-allocation-workbook.ts`, `src/app/api/allocations/[id]/export/route.ts`, and `src/features/allocation/ui/allocation-output-actions.tsx` provide a real `.xlsx` export flow from the authoritative saved run.

### EXPT-02
Passed. The workbook generator creates a `Tổng hợp` sheet containing the full exported roster.

### EXPT-03
Passed. The same generator creates one `Phòng XX` worksheet per room.

### EXPT-04
Passed. `src/features/allocation/server/project-output-records.ts` defines the shared output-row contract, and workbook generation preserves `Phòng thi`, `Số báo danh`, `Thứ tự trong phòng`, and the original student fields.

### EXPT-05
Passed. `src/app/allocations/[id]/print/page.tsx`, `src/features/allocation/ui/print-room-view.tsx`, and `src/app/globals.css` provide a dedicated room print page with print-friendly formatting.

### EXPT-06
Passed. Both export and print consume the same authoritative output projection, and the regression tests confirm edited ordering plus candidate numbers stay in sync with the approved preview.

### HIST-02
Passed. `GET /api/allocations` exposes reopenable history metadata, `GET /api/allocations/[id]` remains the reopen detail endpoint, and the homepage workspace can reopen a saved run without requiring a fresh import.

### SAFE-03
Passed. `src/features/allocation/server/history-retention.ts` computes the retention policy, list/reopen/export paths prune expired runs, and the operations UI displays the retention window to the operator.

## Evidence

- Server contracts and retention: `src/features/allocation/domain/allocation-types.ts`, `src/features/allocation/server/project-output-records.ts`, `src/features/allocation/server/history-retention.ts`, `src/features/allocation/server/list-allocation-runs.ts`, `src/features/allocation/server/load-allocation-run.ts`
- Export path: `src/features/allocation/server/export-allocation-workbook.ts`, `src/app/api/allocations/[id]/export/route.ts`
- Print path: `src/app/allocations/[id]/print/page.tsx`, `src/features/allocation/ui/print-room-view.tsx`, `src/features/allocation/ui/print-room-actions.tsx`, `src/app/globals.css`
- Workspace operations: `src/features/allocation/ui/allocation-history-panel.tsx`, `src/features/allocation/ui/allocation-output-actions.tsx`, `src/features/allocation/ui/allocation-workspace.tsx`
- Tests: `tests/allocation/project-output-records.test.ts`, `tests/allocation/export-allocation-workbook.test.ts`, `tests/api/allocations-route.test.ts`, `tests/api/allocation-run-route.test.ts`, `tests/api/allocation-export-route.test.ts`, `tests/ui/print-room-view.test.tsx`, `tests/ui/allocation-operations-panel.test.tsx`, `tests/ui/allocation-workspace.test.tsx`, `tests/smoke/homepage.test.tsx`
- Plan summaries: `04-01-SUMMARY.md`, `04-02-SUMMARY.md`, `04-03-SUMMARY.md`, `04-04-SUMMARY.md`

## Result

Phase 4 achieved its goal: operators can reopen retained saved runs, export authoritative Excel workbooks, print room-specific rosters from the web, and drive the whole operations flow from the homepage workspace without duplicating output logic or exposing expired data.
