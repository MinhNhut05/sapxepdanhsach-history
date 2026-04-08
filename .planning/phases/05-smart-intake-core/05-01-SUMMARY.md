---
phase: 05-smart-intake-core
plan: 01
subsystem: intake
tags: [smart-intake, xlsx, csv, headers, review-contracts]
requires:
  - phase: 04-output-operations
    provides: stable import-to-allocation and output workflow contracts
provides:
  - Shared Smart Intake review contracts for ready, review-required, and failed intake states
  - Unified `.xlsx`, `.xls`, and `.csv` row snapshot readers with CSV delimiter detection
  - Recoverable header-row detection and alias-based column mapping for noisy roster files
affects: [roster-intake, allocation-gating, intake-review-ui]
tech-stack:
  added: [xlsx]
  patterns: [shared intake state contract, unified multi-format snapshot reader, bounded header scan with alias matching]
key-files:
  created:
    - src/features/roster/domain/intake-review.ts
    - src/features/roster/server/detect-csv-format.ts
    - src/features/roster/server/read-intake-file.ts
    - src/features/roster/server/detect-header-row.ts
    - tests/roster/read-intake-file.test.ts
  modified:
    - package.json
    - package-lock.json
    - src/features/roster/server/file-guard.ts
    - src/features/roster/ui/import-state.ts
    - src/features/roster/lib/map-headers.ts
    - tests/roster/map-headers.test.ts
    - tests/ui/upload-panel.test.tsx
key-decisions:
  - "Use xlsx as the unified intake parser for .xlsx, .xls, and .csv inputs while keeping existing ExcelJS-based flows intact."
  - "Represent intake progress with explicit ready/review_required/failed states instead of overloading import success alone."
  - "Recover noisy headers by scanning the first eight meaningful rows and matching against a fixed alias dictionary."
patterns-established:
  - "Pattern 1: Smart intake server responses extend ImportResultPayload with intakeState, sourceFormat, review, and fallback metadata."
  - "Pattern 2: All supported source formats normalize into one IntakeSheetSnapshot before later validation layers run."
requirements-completed: [INTK-01, INTK-02, REVW-01]
duration: 17 min
completed: 2026-04-08
---

# Phase 05 Plan 01: Intake contracts and tolerant file readers Summary

**Shared Smart Intake contracts, unified `.xlsx`/`.xls`/`.csv` readers, and tolerant header recovery for noisy roster uploads**

## Performance

- **Duration:** 17 min
- **Started:** 2026-04-08T14:48:00Z
- **Completed:** 2026-04-08T15:05:19Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Added the shared Smart Intake contract so later plans can distinguish clean fast-path imports, review-required imports, and hard failures.
- Broadened intake coverage to `.xlsx`, `.xls`, and `.csv` with deterministic CSV delimiter and encoding detection.
- Made header discovery tolerant of title rows, blank rows, and common Vietnamese/English alias labels without weakening required-column failures.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Smart Intake contracts and expand upload guardrails to `.xlsx`, `.xls`, and `.csv`** - `3c93699` (feat)
2. **Task 2: Build unified workbook/CSV readers with deterministic delimiter and encoding detection** - `0ec0df5` (feat)
3. **Task 3: Add recoverable header-row detection and alias-header matching** - `224e1cf` (feat)

## Next Phase Readiness
- The intake stack now has the shared contracts and normalized file-reader layer needed for rule-based review routing.
- Phase 05-02 can build orchestration, audit generation, and review-required branching on top of the new intake snapshots and contracts.

## Self-Check: PASSED
- Found summary file on disk.
- Verified task commits `3c93699`, `0ec0df5`, and `224e1cf` exist in git history.
