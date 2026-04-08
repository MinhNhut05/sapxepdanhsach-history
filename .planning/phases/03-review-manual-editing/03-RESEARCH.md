# Phase 3 Research: Review & Manual Editing

**Phase:** 3
**Researched:** 2026-04-08
**Confidence:** MEDIUM-HIGH

## Executive Summary

Phase 3 should extend the Phase 2 saved-run flow instead of creating a second preview/editing model. The current app already gives us one persisted `AllocationRun`, one homepage workspace, one saved-run response shape, and deterministic room/candidate-number generation. The planning consequence is clear: manual editing should reuse that backbone, add one authoritative edited snapshot when operators save changes, and keep the original auto-allocation snapshot intact for reproducibility.

The biggest risk in this phase is silent inconsistency. Drag-and-drop feels like a frontend feature, but the real requirements are data-integrity requirements:

- no student can disappear during a move
- no student can be duplicated
- room order and seat order must stay explicit
- candidate numbers must be regenerated deterministically after edits
- preview must stay aligned with what later export/print flows consume

The right planning shape is therefore:

1. Extend the saved-run contract and persistence model for optional edited snapshots
2. Add shared domain utilities that can recompute preview metrics, warnings, room ordering, and candidate numbers from a manual draft
3. Build the review dashboard and editor UI on top of that shared projection logic
4. Save drafts through the server and replace the workspace state with the server-returned authoritative snapshot

## Current Starting Point

### What Phase 2 already provides

- Persisted `AllocationRun` records in `prisma/schema.prisma`
- One saved-run POST route in `src/app/api/allocations/route.ts`
- Pure allocation-domain utilities in `src/features/allocation/domain/*`
- One homepage workspace in `src/features/allocation/ui/allocation-workspace.tsx`
- Saved-run summary and per-room table components in `src/features/allocation/ui/allocation-result-summary.tsx` and `src/features/allocation/ui/allocation-room-table.tsx`
- Deterministic Vietnamese ordering via `src/features/roster/lib/sort-students.ts`
- Stable candidate-number generation and invariant checks in the Phase 2 domain layer

### What is still missing

- No fairness/class-distribution metrics beyond room-size spread
- No warning model that distinguishes blocking integrity failures from operator-visible warnings
- No editable draft state
- No drag-and-drop or reorder interactions
- No API for loading/updating a saved run after the initial POST
- No persistence fields for edited snapshots or optimistic concurrency

## Planning-Critical Decisions To Lock

### 1. Preserve the original auto-allocation snapshot

Do not overwrite the original `resultSnapshot` and `summary` fields blindly.

Recommended persistence direction:

- Keep existing `resultSnapshot` and `summary` as the original auto-allocation baseline
- Add optional `editedResultSnapshot` and `editedSummary`
- Add `editVersion` for optimistic concurrency
- Add `lastEditedAt` and `updatedAt` timestamps

Then define one server-side resolver rule:

- authoritative preview = `editedResultSnapshot ?? resultSnapshot`
- authoritative summary = `editedSummary ?? summary`

This satisfies `EDIT-05` without sacrificing Phase 2 reproducibility requirements.

### 2. Save edited room order, not ad-hoc client-computed SBDs

The client should be allowed to maintain a provisional draft for responsive UI, but the server must still rebuild the authoritative snapshot on save.

Recommended save contract:

- Client PATCH payload sends:
  - `allocationRunId`
  - `expectedEditVersion`
  - ordered room lists identified by stable student keys (`studentCode + rowIndex`)
- Server reconstructs the edited room assignments from the persisted roster snapshot
- Server regenerates seat indexes, candidate numbers, summary metrics, and warnings
- Server persists the edited snapshot and returns the resolved authoritative run

This keeps preview/export parity and prevents stale or forged candidate numbers from becoming truth.

### 3. Separate blocking integrity issues from operator warnings

Phase 3 must not treat every rule deviation the same way.

Recommended severity split:

- **Blocking**
  - missing student
  - duplicate student
  - unknown student key
  - duplicate candidate number after recomputation
  - malformed room identifier / impossible payload
- **Warning**
  - room-size spread greater than `1`
  - class concentration or class-split indicators outside the auto-allocation baseline
  - imported roster warnings that still matter during review

This matches the requirement language: the operator should see warnings, but only true integrity failures should block save.

### 4. Use shared projection utilities between draft preview and save path

Do not duplicate draft-recompute logic separately in React and on the server.

Recommended shared domain utilities:

- `project-manual-edits.ts` — rebuild ordered room assignments from draft input
- `build-review-summary.ts` — compute room-size histogram, class-distribution metrics, and warnings
- `validate-manual-edits.ts` — classify blocking vs warning issues

The client can call these utilities for immediate feedback; the server must call the same utilities again before persistence.

### 5. Stay on the existing route-handler mutation pattern

Project research suggested Server Actions for operator mutations, but the real repo already uses route handlers and `fetch()` for allocation flows. Phase 3 should stay consistent with the live codebase:

- keep `POST /api/allocations` for initial runs
- add `GET` and `PATCH` support under `src/app/api/allocations/[id]/route.ts`

This keeps tests, error handling, and workspace wiring aligned with the existing implementation.

### 6. Use `dnd-kit`, but do not add a charting dependency yet

The project-level research called out `dnd-kit + charting`, but only the drag-and-drop half is necessary for this phase.

Recommended UI dependency choice:

- add `@dnd-kit/core`
- add `@dnd-kit/sortable`
- add `@dnd-kit/utilities`

Avoid adding a chart library right now. `PREV-04` can be satisfied with deterministic tables, badges, and per-room/per-class breakdowns. That keeps scope under control and avoids introducing a second new dependency surface.

### 7. Candidate numbers must regenerate after every manual reorder

Manual editing changes room membership and room order. Therefore:

- `seatIndex` cannot be preserved from the auto-allocation result
- `candidateNumber` cannot be preserved from the auto-allocation result

Both must be regenerated from:

1. room number
2. student order inside that room

Any planning that keeps old candidate numbers after a reorder will violate `EDIT-04` and Phase 4 parity.

### 8. Add optimistic concurrency now

Manual editing introduces real stale-write risk.

Recommended minimum concurrency rule:

- add `editVersion` to `AllocationRun`
- PATCH requests must send `expectedEditVersion`
- server rejects stale requests with `409`

This prevents one browser tab or operator action from silently overwriting another.

## Recommended Module And File Shape

### Domain / shared logic

- `src/features/allocation/domain/allocation-types.ts` — extend saved-run contracts with warnings, fairness metrics, and edit metadata
- `src/features/allocation/domain/project-manual-edits.ts`
- `src/features/allocation/domain/build-review-summary.ts`
- `src/features/allocation/domain/validate-manual-edits.ts`

### Server / application layer

- `src/features/allocation/server/load-allocation-run.ts`
- `src/features/allocation/server/save-manual-edits.ts`
- `src/app/api/allocations/[id]/route.ts`

### UI layer

- `src/features/allocation/ui/allocation-warning-panel.tsx`
- `src/features/allocation/ui/allocation-fairness-matrix.tsx`
- `src/features/allocation/ui/allocation-editor.tsx`
- `src/features/allocation/ui/editable-room-column.tsx`
- `src/features/allocation/ui/use-allocation-draft.ts`
- `src/features/allocation/ui/allocation-save-bar.tsx`

### Tests

- `tests/allocation/build-review-summary.test.ts`
- `tests/allocation/validate-manual-edits.test.ts`
- `tests/api/allocation-run-route.test.ts`
- `tests/ui/allocation-review-dashboard.test.tsx`
- `tests/ui/allocation-editor.test.tsx`
- `tests/ui/allocation-workspace.test.tsx`

## Persistence Recommendation

Use the existing `AllocationRun` table and extend it for edited state. Do **not** add a second table for edit history in this phase.

### Recommended Prisma direction

Add fields like:

- `editedResultSnapshot Json?`
- `editedSummary Json?`
- `editVersion Int @default(0)`
- `lastEditedAt DateTime?`
- `updatedAt DateTime @updatedAt`

Why this is the right Phase 3 move:

- It preserves the original auto-allocation output for audit/reproducibility
- It gives Phase 4 a single resolved preview source of truth
- It keeps the persistence shape close to the current Phase 2 schema
- It avoids premature design of a separate edit-event model before history/reopen flows are implemented

## Fairness Metrics Recommendation

`PREV-04` only requires that operators can judge fairness. That does not require a mathematically dense score.

Recommended Phase 3 metrics:

- room-size histogram
- per-room class counts
- per-class room coverage count
- per-room dominant-class percentage
- comparison badges showing whether the run is still balanced (`sizeSpread <= 1`)

This gives operators enough signal to review edits without over-engineering a scoring model.

## Testing Implications

Phase 3 plans should require test coverage for:

- duplicate/missing-student detection
- candidate-number regeneration after reorder
- room-size warnings after cross-room moves
- stale `editVersion` rejection on PATCH
- authoritative preview replacement after save
- unsaved draft reset behavior

For UI coverage, testing pure drag events alone is fragile. Plans should include both:

- drag-and-drop support via `dnd-kit`
- explicit accessible move/reorder controls or deterministic helper paths that tests can trigger reliably

## Recommended Execution Shape

The phase should be split into four plans:

1. Backend/domain foundation for editable snapshots, validation, and routes
2. Review dashboard and fairness/warning UI
3. Draft editing interactions and drag-and-drop
4. Save/sync workflow and regression coverage

That decomposition keeps the server foundation first, allows UI work to parallelize after the contracts are stable, and delays save/sync wiring until both the dashboard and editor exist.

---
*Phase: 03-review-manual-editing*
*Research completed: 2026-04-08*
