# Phase 2 Research: Allocation Engine

**Phase:** 2
**Researched:** 2026-04-08
**Confidence:** MEDIUM-HIGH

## Executive Summary

Phase 2 should introduce a pure, deterministic allocation domain on top of the Phase 1 canonical roster pipeline, then wrap it with a thin persistence and UI layer. The codebase already has trustworthy canonical student records, Vietnamese sorting helpers, and an upload/preview flow. What it does not yet have is any allocation domain model, any persisted run model, any Prisma setup, or any UI for room-count/strategy selection.

The planning consequence is clear: do not scatter the allocator across React components or route handlers. Keep the algorithm pure, deterministic, and heavily unit-tested. Persist one authoritative run snapshot with enough metadata to reproduce the result. Keep the new UI thin and driven from the saved run payload, the same way Phase 1 kept upload rendering driven by the server response.

## Current Starting Point

### What Phase 1 already gives Phase 2

- Canonical student records with both raw and normalized fields in `src/features/roster/domain/student-record.ts`
- Vietnamese-safe name sorting with a stable final `rowIndex` tie-break in `src/features/roster/lib/sort-students.ts`
- Guarded server import pipeline in `src/features/roster/server/import-roster.ts`
- Operator-facing upload flow in `src/features/roster/ui/upload-panel.tsx`
- A homepage shell in `src/app/page.tsx` that can be extended instead of replaced

### What is still missing

- Prisma schema, generated client, and DB singleton
- Any allocation-specific domain contracts or services
- Any persisted model for saved allocation runs
- Any route/action for running an allocation
- Any room-allocation preview driven by saved run data

## Planning-Critical Decisions To Lock

### 1. Deterministic input ordering

All strategies should start from the same canonical ordering so repeated runs are reproducible:

1. Use the Phase 1 Vietnamese comparator on canonical student data.
2. Fall back to canonical `studentCode`.
3. Fall back to `rowIndex` as the terminal tie-break.

No plan should use `Math.random()` or object-key iteration order as an allocation input.

### 2. Room-balance rule

The balancing rule should be explicit and testable:

- Let `n = totalStudents`, `r = roomCount`
- Base room size is `Math.floor(n / r)`
- Remainder is `n % r`
- Exactly the first `remainder` rooms receive `base + 1`
- All other rooms receive `base`
- Therefore `maxRoomSize - minRoomSize <= 1`

This is the core fairness floor that all three strategies must obey.

### 3. Strategy definitions

The roadmap language is still too soft. Planning should convert it into exact domain behavior.

#### Strategy 1: Even Mix

Recommended deterministic rule:

- Sort all students once using the canonical comparator
- Assign students round-robin across rooms `1..r`
- Within each room, re-sort by the same canonical comparator before SBD generation

This gives the cleanest interpretation of “mix all students evenly” while preserving deterministic outputs and room-size balance.

#### Strategy 2: Relative Class Grouping

Recommended measurable rule:

- Group students by canonical class name
- Sort classes by class name ascending
- Sort students inside each class with the canonical comparator
- Fill room capacities in room order while keeping each class split across as few rooms as possible
- When a class must span multiple rooms, spill into the next lowest-index room with remaining capacity

The objective for this strategy should be:

1. Respect target room capacities first
2. Minimize class splits second
3. Preserve deterministic class and student order third

This is concrete enough to test and explain without over-claiming “perfect preservation”.

#### Strategy 3: Representative Ratio

Recommended measurable rule:

- Compute each class’s proportion of the total roster
- Compute per-room target seats from the room capacities above
- For each class, distribute seats across rooms by proportional quota using largest-remainder tie-breaking
- Break quota ties by lower room number, then canonical class name
- Fill room assignments from class buckets using canonical student order

The objective for this strategy should be:

1. Respect target room capacities
2. Keep each room’s class mix as close as possible to the global roster distribution
3. Remain fully deterministic under tie cases

### 4. SBD rule

Recommended rule:

- After room assignment is final, sort each room’s students with the canonical comparator
- Generate `Pxx-yyy` where `xx = roomNumber.padStart(2, "0")` and `yyy = seatIndex.padStart(3, "0")`
- `seatIndex` starts at `1` inside each room

Planning should explicitly decide what happens if:

- `roomCount > 99`
- a room could exceed `999` students

Given the product context, the practical v1 answer is to validate against those bounds and fail early rather than silently widening the format.

## Recommended Module And File Shape

The codebase already uses `src/features/<feature>/{domain,lib,server,ui}` rather than the more abstract `modules/` layout from project research. Phase 2 should stay consistent with the real repo, not switch architectures midstream.

### Allocation domain

- `src/features/allocation/domain/allocation-types.ts`
- `src/features/allocation/domain/allocation-strategy.ts`
- `src/features/allocation/domain/build-room-capacities.ts`
- `src/features/allocation/domain/assign-even-mix.ts`
- `src/features/allocation/domain/assign-class-grouped.ts`
- `src/features/allocation/domain/assign-representative-ratio.ts`
- `src/features/allocation/domain/generate-candidate-numbers.ts`
- `src/features/allocation/domain/validate-allocation-result.ts`
- `src/features/allocation/domain/create-allocation-run.ts`

### Server/application layer

- `src/features/allocation/server/run-allocation.ts`
- `src/features/allocation/server/save-allocation-run.ts`
- `src/features/allocation/server/list-allocation-runs.ts`

### UI layer

- `src/features/allocation/ui/allocation-form.tsx`
- `src/features/allocation/ui/allocation-result-summary.tsx`
- `src/features/allocation/ui/allocation-room-table.tsx`
- `src/features/allocation/ui/allocation-run-panel.tsx`

### Delivery layer

- `src/app/api/allocations/route.ts`
- `src/app/page.tsx` updated to compose the new allocation panel beneath or beside the existing upload panel

### Persistence foundation

- `prisma/schema.prisma`
- `prisma/migrations/*`
- `src/lib/prisma.ts`

These file paths should appear in the plans explicitly. They are schema-relevant and should trigger a blocking schema-push task during execution.

## Persistence Recommendation

Do not over-normalize the DB immediately. For this app size and v1 scope, one authoritative run record with JSON snapshots is the pragmatic default.

### Recommended Prisma model direction

Use a primary `AllocationRun` model with:

- `id`
- `createdAt`
- `sourceFileName`
- `roomCount`
- `strategy`
- `totalStudents`
- `algorithmVersion`
- `rosterFingerprint`
- `inputSnapshot` as JSON
- `resultSnapshot` as JSON
- `summary` as JSON or concrete columns for counts

Why this is the right Phase 2 move:

- Phase 2 only needs saved reproducible runs, not complex reporting yet
- Phase 3 and 4 can still consume one authoritative snapshot without reconstructing state from partial relational rows
- A 272-student roster is small enough that whole-run JSON snapshots are operationally cheap
- It avoids prematurely designing edit-log or normalized assignment tables before the manual-edit workflow is planned

### Snapshot contents

`inputSnapshot` should contain:

- canonical students from Phase 1
- source file metadata
- normalization/version metadata

`resultSnapshot` should contain:

- room capacities
- per-room assigned students
- canonical student ordering per room
- generated candidate numbers
- summary metrics needed by preview and history

### Reproducibility metadata

Each saved run should also store:

- allocation strategy key
- room count
- algorithm version string
- any deterministic seed if a strategy ever needs one
- roster fingerprint or content hash

This is enough to satisfy `HIST-01`, `HIST-03`, and `HIST-04` without waiting for the full history-reopen UX in Phase 4.

For baseline reproducibility, planning should treat `K19A.xlsx` as the first golden fixture:
- compute and store roster fingerprint from canonical payload derived from K19A
- assert stable deterministic output for repeated runs with the same strategy and room count
- persist the source worksheet name from the real workbook baseline (`Worksheet 1`)
- include the expected `272/13` capacity signature in regression checks

## API / UI Recommendation

Stay consistent with Phase 1’s fetch-based UI pattern:

- `allocation-form.tsx` should collect room count and strategy
- it should send a POST to `/api/allocations`
- the route should accept the canonical roster payload already in memory from the upload result or a saved snapshot input
- the route should call the pure allocation service, persist the run, and return the saved run payload

This keeps the browser thin and keeps the domain/persistence logic server-owned.

### Minimum Phase 2 UI scope

Phase 2 should not absorb the full Phase 3 review/dashboard workload. It only needs enough UI to satisfy the roadmap success criteria:

- choose room count
- choose one of three strategies
- run allocation
- see the resulting room assignments
- see enough summary data to confirm evenness and strategy outcome

Detailed fairness charts, drag-and-drop, and corrective editing should stay out of Phase 2 plans.

## Validation And Invariants

The allocation domain should expose one validation layer that every strategy passes through before persistence:

- every student assigned exactly once
- no room exceeds its target capacity
- no room assignment missing from result
- candidate numbers unique across the run
- candidate numbers conform to `Pxx-yyy`
- room count matches the requested configuration
- room sizes differ by at most 1

For Strategy 2 additionally:

- class split count should be measurable and included in run summary

For Strategy 3 additionally:

- per-room class distribution deltas versus global distribution should be measurable and included in run summary

The summary metrics matter because Phase 3’s preview dashboard will depend on them later.

## Testing Strategy

Phase 2 is domain-heavy. The test budget should reflect that.

### Pure unit tests

Add focused Vitest coverage under `tests/allocation/` for:

- room-capacity builder
- each strategy with deterministic fixture data
- SBD generation
- invariant validation
- same input + same config => byte-for-byte stable logical output

### Recommended fixtures

Use in-memory canonical student fixtures instead of `.xlsx` files for most Phase 2 tests, but anchor those fixtures to one real baseline workbook.

**Baseline fixture:** `K19A.xlsx`
- worksheet count: `1`
- worksheet name: `Worksheet 1`
- non-empty rows: `273` total (`1` header + `272` data rows)
- total students: `272`
- classes: `7` (`A1`, `A2`, `A3`, `A4`, `A5`, `A6`, `A7`)
- headers: `Lớp`, `MSHV`, `HỌ LÓT`, `TÊN`, `NGÀY SINH`, `NƠI SINH`
- optional `GHI CHÚ`: absent in baseline (must still be supported)
- duplicate full-name sample exists (`Nguyễn Thanh Tuấn` appears twice), which is useful for tie-break checks

**Derived deterministic capacity expectation for v1 default scenario:**
- with `roomCount = 13` and `totalStudents = 272`
- capacity distribution must be exactly: **12 rooms with 21 students, 1 room with 20 students**
- therefore `maxRoomSize - minRoomSize = 1`

Include fixtures and assertions for:
- multiple Vietnamese names with diacritics
- uneven class sizes
- room counts that divide evenly and unevenly
- small edge cases like `roomCount = 1` and `roomCount = totalStudents`
- K19A-derived scenario (`272 / 13`) as a regression case

### Integration tests

Add server-level tests for:

- `/api/allocations` rejects invalid room counts or unknown strategy keys
- the route persists a run and returns metadata
- rerunning with the same canonical input and settings returns the same room assignments and SBD values
- rerunning with K19A-derived canonical payload (`272 students`, `13 rooms`) keeps the expected room-size distribution (`12x21`, `1x20`)

If Prisma setup is introduced in this phase, include at least one repository/service test that verifies the saved run can round-trip through the schema unchanged.

## Likely Plan Breakdown

The planner should probably split Phase 2 into four execution plans:

1. Persistence foundation
Create Prisma setup, `AllocationRun` schema, migration, DB client, and shared allocation contracts.

2. Pure allocation engine
Implement room-capacity logic, three deterministic strategies, SBD generation, invariant checks, and unit tests.

3. Allocation application service and API
Add the run-allocation server service, persistence orchestration, and `/api/allocations` route with integration tests.

4. Operator UI for running allocations
Extend the homepage with room-count/strategy controls and a result panel driven entirely by the saved allocation response.

That breakdown keeps schema work, domain logic, server orchestration, and UI changes separated cleanly.

## Blockers And Ambiguities The Planner Must Resolve Explicitly

### Fairness language is still partly qualitative

The plans must translate:

- “giữ tương đối theo lớp”
- “phân bổ tỉ lệ đại diện”

into measurable acceptance criteria. If the plans leave those phrases vague, execution will drift.

### Input handoff between import and allocation

The current app shows import results in the upload panel, but there is no shared persisted roster state yet. The plans must decide whether Phase 2:

- posts the in-memory canonical students directly from the client to `/api/allocations`, or
- first stores a temporary imported roster snapshot server-side

The pragmatic answer for now is direct POST of canonical students from the import result payload, because Phase 1 already trusts that payload and Phase 2 only needs reproducible saved runs after allocation.

### Prisma bootstrap scope

Prisma is not installed yet despite being a project constraint. The plans must include:

- `prisma` and `@prisma/client` dependencies
- initial schema
- generated client wiring in `src/lib/prisma.ts`
- migration generation/apply workflow

### Schema push gate

Because Phase 2 will touch `prisma/schema.prisma`, execution plans must include a blocking schema push or migration apply task after schema edits and before verification. The planner should treat this as mandatory, not optional.

## Planning Implications

- Keep the allocator pure and deterministic first; do not let UI work drive the domain shape.
- Persist authoritative run snapshots in Phase 2 so later preview, edit, export, and history all read from the same source of truth.
- Use the existing `src/features/...` repo pattern instead of introducing a new architecture vocabulary mid-project.
- Keep Phase 2 UI intentionally thin. Review analytics and manual edits belong in Phase 3.
- Make fairness and reproducibility measurable in tests and plan acceptance criteria, or the phase will pass superficially while still being operationally ambiguous.

## RESEARCH COMPLETE
