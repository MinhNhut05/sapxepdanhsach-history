---
phase: 05-smart-intake-core
plan: 02
subsystem: api
tags: [smart-intake, roster, csv, audit, review]
requires:
  - phase: 05-01
    provides: shared intake contracts, multi-format readers, tolerant header detection
provides:
  - recoverable smart-intake orchestration for ready vs review_required vs failed imports
  - review payloads with confidenceSummary, unresolvedCount, items, auditTrail, and stagedStudents
  - route responses that return recoverable review work as HTTP 200 with source metadata
affects: [allocation-gating, intake-review-ui, audit-traceability]
tech-stack:
  added: []
  patterns: [rule-based smart intake orchestration, audit-backed repair proposals, review-only sensitive field repairs]
key-files:
  created:
    - src/features/roster/server/build-intake-review.ts
  modified:
    - src/features/roster/server/import-roster.ts
    - src/features/roster/server/row-validation.ts
    - src/features/roster/lib/parse-birth-date.ts
    - src/features/roster/server/read-intake-file.ts
    - src/app/api/rosters/import/route.ts
    - tests/roster/import-roster.test.ts
    - tests/api/rosters-import-route.test.ts
key-decisions:
  - "Recoverable intake now returns ok=true with intakeState review_required instead of collapsing into the old blocking-only path."
  - "Sensitive className and studentCode repairs are always review-only even when rule confidence is high."
patterns-established:
  - "Smart Intake review payloads are built through one shared builder that emits UI items and audit records from the same repair proposals."
  - "Tolerant file reading happens before canonical validation so title rows, CSV inputs, and dotted birth dates can be repaired safely."
requirements-completed: [INTK-03, INTK-04, REVW-01, AUDT-01, SAFE-04]
duration: 3 min
completed: 2026-04-08
---

# Phase 05 Plan 02: Rule-based Smart Intake orchestration Summary

**Recoverable roster intake that separates ready imports from review-required imports and attaches audit-ready repair metadata.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-08T15:44:00Z
- **Completed:** 2026-04-08T15:47:28Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Rebuilt roster import orchestration around `readIntakeFile` and `detectHeaderRow` so noisy `.xlsx` and `.csv` files can be staged instead of hard-failing.
- Added repair proposal classification plus `buildIntakeReview` to emit `confidenceSummary`, `unresolvedCount`, `items`, `auditTrail`, and `stagedStudents`.
- Updated `/api/rosters/import` to return HTTP 200 for both `ready` and `review_required` intake states, including `sourceFileName`, `sourceFormat`, and `fallbackUsed`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rebuild import orchestration around tolerant file reading and recoverable validation** - `462eb35` (feat)
2. **Task 2: Create review-required payloads with confidence bands and audit data** - `0b26a80` (feat)
3. **Task 3: Update the import route to return recoverable review responses and cover them with route tests** - `0b26a80` (feat)
4. **Verification fix: align smart intake types with verification flow** - `23c1ac4` (fix)

## Files Created/Modified
- `src/features/roster/server/build-intake-review.ts` - Builds review items and auditTrail records from repair proposals.
- `src/features/roster/server/import-roster.ts` - Drives readIntakeFile, detectHeaderRow, tolerant validation, and ready vs review_required routing.
- `src/features/roster/server/row-validation.ts` - Defines safe repair categories and emits repair proposals alongside canonical validation.
- `src/features/roster/lib/parse-birth-date.ts` - Accepts dotted day-first dates and short-year recovery needed by Smart Intake.
- `src/app/api/rosters/import/route.ts` - Preserves upload guard errors while returning recoverable review payloads with source metadata.
- `tests/roster/import-roster.test.ts` - Covers clean fast path, noisy CSV title row review path, and sensitive-field review gating.
- `tests/api/rosters-import-route.test.ts` - Covers route-level ready, review_required, and failed response semantics.

## Decisions Made
- Used one shared `buildIntakeReview` builder so UI review items and audit records stay derived from the same repair proposals.
- Kept `studentCode` and `className` proposals review-only by forcing `autoApplied: false` even for high-confidence rule repairs.
- Treated title rows as recoverable warning noise rather than structural failure once header detection succeeds.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Preserved raw CSV date text for dotted-format normalization**
- **Found during:** Task 1
- **Issue:** CSV parsing converted dotted birth dates into a different slash-based short form, causing recoverable files to fail validation.
- **Fix:** Switched workbook row extraction to preserve raw values and verified dotted `dd.MM.yyyy` input reaches the date parser intact.
- **Files modified:** `src/features/roster/server/read-intake-file.ts`, `tests/roster/import-roster.test.ts`, `tests/api/rosters-import-route.test.ts`
- **Verification:** `npm run test -- tests/roster/import-roster.test.ts tests/api/rosters-import-route.test.ts`
- **Committed in:** `462eb35` and `0b26a80`

**2. [Rule 3 - Blocking] Fixed smart-intake type errors discovered by final verification**
- **Found during:** Final verification
- **Issue:** ArrayBuffer normalization and optional note repair typing broke `npm run typecheck`.
- **Fix:** Added safe ArrayBuffer copying and normalized optional note values to `null` for audit payload generation.
- **Files modified:** `src/features/roster/server/import-roster.ts`, `src/features/roster/server/row-validation.ts`
- **Verification:** `npm run typecheck`
- **Committed in:** `23c1ac4`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were required to make recoverable intake and final verification behave as specified. No scope creep.

## Issues Encountered
- The phase-5 planning metadata in this worktree is drifted behind the product branch state, so automated `STATE.md` and `ROADMAP.md` updates were not safely applied here.

## Known Stubs
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Smart Intake now exposes a stable `review_required` server contract for the upcoming review workspace plan.
- Allocation gating can now distinguish clean imports from recoverable noisy imports without losing canonical staged students.
- Planning metadata in this worktree should be reconciled before relying on automated phase-state bookkeeping.

## Self-Check: PASSED
- Found summary file: `.planning/phases/05-smart-intake-core/05-02-SUMMARY.md`
- Found commit: `462eb35`
- Found commit: `0b26a80`
- Found commit: `23c1ac4`
