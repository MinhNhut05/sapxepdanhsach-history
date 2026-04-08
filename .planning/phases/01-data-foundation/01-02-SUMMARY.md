---
phase: 01-data-foundation
plan: 02
subsystem: domain
tags:
  - vietnamese-normalization
  - roster-import
  - birth-date
  - header-mapping
requires:
  - phase: 01-01
    provides: "Buildable Next.js/Vitest foundation for the roster modules"
provides:
  - "Canonical student and issue contracts for imported roster data"
  - "Deterministic Vietnamese text normalization and sort helpers"
  - "Supported birth-date parsing rules and header mapping logic"
affects:
  - 01-03
  - 01-04
tech-stack:
  added: []
  patterns:
    - "Pure roster helper modules with explicit return contracts"
    - "Locale-aware Vietnamese comparison via a shared collator"
    - "Focused Vitest unit tests around the highest-risk parsing rules"
key-files:
  created:
    - src/features/roster/domain/student-record.ts
    - src/features/roster/domain/import-issue.ts
    - src/features/roster/lib/normalize-vietnamese.ts
    - src/features/roster/lib/sort-students.ts
    - src/features/roster/lib/parse-birth-date.ts
    - src/features/roster/lib/map-headers.ts
    - tests/roster/normalize-vietnamese.test.ts
    - tests/roster/parse-birth-date.test.ts
    - tests/roster/map-headers.test.ts
  modified: []
key-decisions:
  - "Reject any text birth date where both day and month are <= 12 so the import pipeline never guesses an ambiguous value."
  - "Keep header matching intentionally narrow: normalize Unicode, whitespace, and casing only, but do not support semantic aliases."
patterns-established:
  - "Canonical roster records keep raw imported values separate from canonical values for later audit and info-level normalization messages."
  - "Header and text normalization reuse the same Unicode-safe whitespace cleanup to keep parsing rules aligned."
requirements-completed:
  - IMPT-05
  - IMPT-06
duration: 8min
completed: 2026-04-08
---

# Phase 1: Data Foundation Summary

**Canonical roster contracts, Vietnamese normalization helpers, deterministic sorting, and strict header/date parsing rules for the import pipeline**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-08T04:41:30Z
- **Completed:** 2026-04-08T04:49:58Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Defined the shared raw/canonical student record contracts plus the unified `blocking`/`warning`/`info` issue schema.
- Implemented Vietnamese-safe normalization, display casing, and deterministic comparator logic that later import/export flows can reuse directly.
- Added strict birth-date parsing and header mapping modules with focused unit coverage for ambiguous inputs, optional `GHI CHÚ`, and missing required columns.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define canonical roster and issue contracts** - `f0e9c64` (feat)
2. **Task 2: Implement Vietnamese normalization, sorting, and birth-date parsing** - `fb652ca` (feat)
3. **Task 3: Implement header mapping with optional `GHI CHÚ` support** - `4edfc30` (feat)

**Plan metadata:** recorded in this summary artifact commit

## Files Created/Modified
- `src/features/roster/domain/student-record.ts` - stores raw imported values beside canonical student fields and `birthDateIso`.
- `src/features/roster/domain/import-issue.ts` - exposes the shared issue severity model for server and UI layers.
- `src/features/roster/lib/normalize-vietnamese.ts` - centralizes Unicode normalization, whitespace cleanup, display casing, and the shared Vietnamese collator.
- `src/features/roster/lib/sort-students.ts` - applies deterministic ordering by `TÊN`, `HỌ LÓT`, then `MSHV`.
- `src/features/roster/lib/parse-birth-date.ts` - parses supported birth-date inputs and rejects ambiguous text values.
- `src/features/roster/lib/map-headers.ts` - resolves exact required roster headers with light normalization and optional `GHI CHÚ` support.
- `tests/roster/normalize-vietnamese.test.ts` - covers diacritic-safe cleanup, display casing, and sort ordering.
- `tests/roster/parse-birth-date.test.ts` - covers supported birth-date formats and ambiguous-date rejection.
- `tests/roster/map-headers.test.ts` - covers reordered columns, optional note handling, and missing-header failures.

## Decisions Made
- Treated day-first text dates with both numeric parts <= 12 as blocking ambiguity instead of trying to infer locale intent.
- Returned header column indexes as 1-based workbook positions so the next import step can map them directly onto Excel row data.
- Kept the header matcher exact on supported labels while still normalizing whitespace, casing, and Unicode form to match real operational files safely.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `01-03` can now build the workbook reader and import orchestrator on top of stable domain contracts and pure helper functions.
- The route and UI layers already have shared contracts for student rows, issue severities, supported headers, and trusted date parsing behavior.

## Self-Check: PASSED

---
*Phase: 01-data-foundation*
*Completed: 2026-04-08*
