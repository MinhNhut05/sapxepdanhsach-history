---
phase: 01-data-foundation
plan: 04
subsystem: ui
tags:
  - upload-panel
  - client-fetch
  - preview-table
  - validation-feedback
requires:
  - phase: 01-03
    provides: "Guarded roster import route with stable summary, students, and issues payloads"
provides:
  - "Homepage upload flow backed directly by the import API"
  - "Operator-facing summary, preview, and issue rendering components"
  - "Component-level UI tests for success and validation-error states"
affects:
  - phase-1-usability
  - phase-2-operator-workflow
tech-stack:
  added: []
  patterns:
    - "Client state is driven from server responses, not client-side validation guesses"
    - "Upload UI composes specialized summary, preview, and issue components"
    - "Fetch-driven component tests cover both happy and unhappy import flows"
key-files:
  created:
    - src/features/roster/ui/import-state.ts
    - src/features/roster/ui/upload-panel.tsx
    - src/features/roster/ui/import-summary.tsx
    - src/features/roster/ui/import-preview-table.tsx
    - src/features/roster/ui/import-issues-table.tsx
    - tests/ui/upload-panel.test.tsx
  modified:
    - src/app/page.tsx
key-decisions:
  - "Render preview and validation output only from the API payload so the browser never invents import results."
  - "Show issue groups by severity even on successful imports, because warnings and info are part of the operator workflow."
patterns-established:
  - "The homepage remains server-rendered while the upload workflow lives in a focused client component."
  - "Preview tables expose canonical server values only, including conditional `GHI CHÚ` rendering."
requirements-completed:
  - IMPT-01
  - IMPT-04
duration: 7min
completed: 2026-04-08
---

# Phase 1: Data Foundation Summary

**Operator-facing upload screen with API-backed state, canonical preview rendering, and grouped validation feedback on the homepage**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-08T05:01:20Z
- **Completed:** 2026-04-08T05:08:34Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added the client upload state model and fetch-driven upload panel that posts `.xlsx` files to `/api/rosters/import`.
- Rendered summary metrics, canonical student previews, and grouped blocking/warning/info issues directly from the server response.
- Added upload-panel regression tests that cover successful imports, disabled upload state, and blocking validation failures.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the homepage upload workflow** - `e975083` (feat)
2. **Task 2: Render parsed student previews and validation feedback** - `8e1bfa0` (feat)
3. **Task 3: Add UI tests for successful and failing imports** - `d395671` (test)

**Plan metadata:** recorded in this summary artifact commit

## Files Created/Modified
- `src/features/roster/ui/import-state.ts` - defines the exact `idle`, `uploading`, `success`, and `error` client states plus the import payload contract.
- `src/features/roster/ui/upload-panel.tsx` - handles file selection, API submission, and response-driven rendering on the homepage.
- `src/features/roster/ui/import-summary.tsx` - displays worksheet, row count, and blocking/warning/info totals.
- `src/features/roster/ui/import-preview-table.tsx` - renders canonical `Lớp`, `MSHV`, `Ngày sinh`, `Nơi sinh`, and conditional `GHI CHÚ` columns.
- `src/features/roster/ui/import-issues-table.tsx` - groups row-level issues by severity for operator review.
- `src/app/page.tsx` - composes the upload panel into the existing shell.
- `tests/ui/upload-panel.test.tsx` - mocks the import API to verify upload-state transitions and server-owned rendering paths.

## Decisions Made
- Kept the upload panel intentionally thin: it submits `FormData`, stores the API payload, and delegates all display logic to focused child components.
- Rendered the preview table only for `ok: true` payloads, while still showing warnings and info issues when they exist.
- Used the same issue severity terms (`blocking`, `warning`, `info`) in the UI that the server returns so operators see the canonical validation vocabulary end to end.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Accept array-style file collections in the upload input handler**
- **Found during:** Task 3 (Add UI tests for successful and failing imports)
- **Issue:** The file input change handler assumed a `FileList.item()` API, which broke in the test harness and would also fail in array-like event adapters.
- **Fix:** Switched the handler to read the first file via `files?.[0]`.
- **Files modified:** `src/features/roster/ui/upload-panel.tsx`
- **Verification:** `npm run test -- tests/ui/upload-panel.test.tsx`
- **Committed in:** `d395671`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix tightened the upload handler without changing the intended UI behavior or scope.

## Issues Encountered
- No product-level issues surfaced; the only adjustment came from hardening the file-input event handling while adding regression tests.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 1 now exposes a complete operator loop for upload, parse, preview, and validation feedback.
- Later phases can build on the same preview area instead of replacing it: allocation results, fairness indicators, and manual editing can extend the existing workflow.

## Self-Check: PASSED

---
*Phase: 01-data-foundation*
*Completed: 2026-04-08*
