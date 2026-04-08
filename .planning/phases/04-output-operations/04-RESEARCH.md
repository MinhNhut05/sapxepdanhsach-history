# Phase 4 Research: Output & Operations

**Phase:** 4
**Researched:** 2026-04-08
**Confidence:** HIGH

## Executive Summary

Phase 4 should not invent a second representation of the allocation result. Phase 3 already established the product's most important contract:

- the server owns the authoritative saved run
- the authoritative preview resolves as `editedResultSnapshot ?? resultSnapshot`
- the homepage review UI is expected to treat that saved run as the future source of truth for export and print

The planning consequence is straightforward:

1. Create one shared server-side output projection from the authoritative saved run
2. Reuse that projection for both Excel export and print views so `EXPT-06` is enforceable
3. Add a history/reopen surface on top of the existing `AllocationRun` table instead of creating a second workflow
4. Enforce retention in the same server paths that list, reopen, export, and print runs

The current codebase already contains most of the persistence needed for this. `exceljs` is installed, `AllocationRun` already stores the authoritative edited snapshot fields, and `GET /api/allocations/[id]` can already reopen a single run by ID. What is missing is the operational layer: list/history APIs, retention-aware loading, export generation, print routes, and a UI entrypoint that lets operators act on existing runs without re-importing a roster.

## Current Starting Point

### What Phase 3 already provides

- `prisma/schema.prisma` stores `resultSnapshot`, `summary`, optional `editedResultSnapshot`, optional `editedSummary`, `editVersion`, `lastEditedAt`, and `updatedAt`
- `src/features/allocation/server/load-allocation-run.ts` already resolves the authoritative preview from edited-or-original snapshot data
- `src/app/api/allocations/route.ts` creates and persists saved runs through `POST /api/allocations`
- `src/app/api/allocations/[id]/route.ts` already supports `GET` for reopening one saved run and `PATCH` for saving manual edits
- `src/features/allocation/ui/allocation-workspace.tsx` already treats the server-returned saved run as the source of truth for later export/print work
- `src/features/allocation/ui/allocation-room-table.tsx` already renders the columns most output formats need: room number, candidate number, seat order, class, student code, and full name
- `exceljs` is already a runtime dependency, and Phase 1 import code proves the repo is comfortable reading/writing workbook content

### What is still missing

- no `GET /api/allocations` list endpoint for saved-run history
- no retention policy helper, pruning flow, or expired-run handling
- no export route that returns `.xlsx`
- no print route or print-specific page/CSS
- no UI to reopen a prior saved run from the homepage
- no download/print action surface once a saved run is visible
- no tests that prove workbook rows and print rows match the authoritative preview exactly

## Planning-Critical Decisions To Lock

### 1. Output parity must come from one shared server projection

Do not build Excel rows from one helper and print rows from another. Do not build either output from client draft state.

Recommended direction:

- create one server-side projection module such as `src/features/allocation/server/project-output-records.ts`
- source it from `loadAllocationRun(id)` or the same authoritative resolution logic
- flatten the authoritative rooms into stable output rows containing:
  - `Phòng thi`
  - `Số báo danh`
  - `Thứ tự trong phòng`
  - `Lớp`
  - `MSHV`
  - `HỌ LÓT`
  - `TÊN`
  - `NGÀY SINH`
  - `NƠI SINH`
  - `GHI CHÚ`
- keep row ordering locked to `roomNumber`, then `seatIndex`

This is the cleanest way to satisfy `EXPT-04` and `EXPT-06`.

### 2. Reuse the existing `AllocationRun` model for history reopening

There is no evidence Phase 4 needs a new history table. The existing model already has what reopening needs:

- opaque run ID
- created timestamp
- room count
- strategy
- total students
- source file name
- edited/original snapshot distinction

Recommended direction:

- add a list service and `GET /api/allocations`
- keep `GET /api/allocations/[id]` as the reopen detail endpoint
- return list metadata like:
  - `id`
  - `sourceFileName`
  - `createdAt`
  - `lastEditedAt`
  - `strategy`
  - `roomCount`
  - `totalStudents`
  - `isEdited`

This keeps the history/reopen story consistent with the existing route layout.

### 3. Retention can be enforced without a Prisma schema change

For the current requirement set, no Prisma migration is required.

Why:

- `createdAt` already exists
- `updatedAt` already exists
- `lastEditedAt` already exists
- retained vs expired state can be computed dynamically from those timestamps plus a configured policy

Recommended direction:

- create `src/features/allocation/server/history-retention.ts`
- read a server-side policy from an env var such as `ALLOCATION_RUN_RETENTION_DAYS`
- compute recency from `lastEditedAt ?? updatedAt ?? createdAt`
- prune expired runs when history endpoints or output endpoints are used
- make expired runs fail closed: list should not return them, and reopen/export/print should return not found after pruning

This satisfies `SAFE-03` while keeping Phase 4 focused.

### 4. Excel export should be a server route that returns a generated workbook

Recommended direction:

- create `src/features/allocation/server/export-allocation-workbook.ts`
- create `src/app/api/allocations/[id]/export/route.ts`
- generate a workbook with:
  - one master sheet
  - one sheet per room
  - identical column order across all sheets
  - frozen header row
  - explicit widths for the Vietnamese text columns

Use the shared authoritative output projection. The route should set:

- `content-type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `content-disposition: attachment; filename="phan-phong-{id}.xlsx"`

### 5. Print should be a dedicated room-specific web route, not ad-hoc DOM capture

The current app is one homepage workspace. That is a poor fit for print because the operational UI chrome, import controls, and edit dashboard should not appear on paper.

Recommended direction:

- create a dedicated App Router page such as `src/app/allocations/[id]/print/page.tsx`
- require a room selector via `?room={roomNumber}`
- render a print-specific room view from the same shared output projection used by export
- add `@media print` rules to hide non-print chrome and keep tables readable

This satisfies `EXPT-05` with less risk than trying to print the entire homepage DOM.

### 6. Keep the homepage as the operator control center

Do not create a second primary workspace just for operations.

Recommended direction:

- extend `src/features/allocation/ui/allocation-workspace.tsx`
- add a history panel that loads `GET /api/allocations`
- let the user reopen a saved run into the existing review/output area
- add an output-actions panel that exposes:
  - workbook download
  - room-specific print links

This keeps the user mental model simple: import + create + review + reopen + export + print all happen from the same home control surface.

### 7. Reopened runs should not depend on original import issues

Phase 3's live workspace carries `importResult?.issues` forward after a fresh allocation. But the database does not persist the raw import issue list.

Planning consequence:

- reopened runs should focus on saved-run review/output data
- do not try to reconstruct Phase 1 import issues from thin air
- if desired, show that the run was reopened from history and continue to render saved-run warnings/fairness metrics from the authoritative summary

This is acceptable because `HIST-02` only requires reopening and viewing the saved result.

### 8. Verification must read the generated workbook, not just snapshot JSON

`EXPT-06` is easy to claim and easy to miss.

Recommended verification:

- route-level tests that load the returned workbook bytes back into `exceljs`
- assertions that the master sheet and room sheets match the authoritative saved run rows
- print-view tests that assert the same room rows and candidate numbers appear in the rendered HTML

If the verification only checks JSON before workbook generation, parity bugs can slip through.

## Recommended Module And File Shape

### Shared server foundation

- `src/features/allocation/server/project-output-records.ts`
- `src/features/allocation/server/history-retention.ts`
- `src/features/allocation/server/list-allocation-runs.ts`

### Export

- `src/features/allocation/server/export-allocation-workbook.ts`
- `src/app/api/allocations/[id]/export/route.ts`

### Print

- `src/app/allocations/[id]/print/page.tsx`
- `src/features/allocation/ui/print-room-view.tsx`
- `src/features/allocation/ui/print-room-actions.tsx`
- `src/app/globals.css` (`@media print` additions)

### Workspace / operations UI

- `src/features/allocation/ui/allocation-history-panel.tsx`
- `src/features/allocation/ui/allocation-output-actions.tsx`
- `src/features/allocation/ui/allocation-workspace.tsx`

### Tests

- `tests/allocation/project-output-records.test.ts`
- `tests/allocation/export-allocation-workbook.test.ts`
- `tests/api/allocations-route.test.ts` (history list + retention)
- `tests/api/allocation-export-route.test.ts`
- `tests/ui/print-room-view.test.tsx`
- `tests/ui/allocation-operations-panel.test.tsx`
- `tests/ui/allocation-workspace.test.tsx` (reopen flow)

## Risks To Plan Around

### Workbook and print drift

If Excel and print do not read the same output projection, `EXPT-06` will regress.

### Expired data remaining accessible

If retention is only documented and never enforced in list/load/export paths, `SAFE-03` is not met.

### Workspace state collisions

Reopening a saved run into the existing homepage workspace must reset edit mode, clear stale operation errors, and avoid mixing reopened run data with the current import payload.

### Sheet-name and layout edge cases

Excel sheet names must stay valid, printable layouts must not clip Vietnamese text, and the print route must reject invalid room query values cleanly.

## Planner Recommendation

Use four plans in three waves:

1. Shared authoritative output + history retention foundation
2. Excel export and print route implementation in parallel
3. Homepage operations integration for reopen/download/print actions

This matches the current repo shape and preserves the project's preference for one authoritative saved-run workflow.

## RESEARCH COMPLETE
