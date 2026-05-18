---
phase: 06-customer-feedback-hardening-flexible-import-sheet-detection-strict-room-class-fairness-template-locked-export-parity-and-ai-verification-gate
plan: 03
subsystem: api
tags: [exceljs, export, workbook, template-contract, parity]
requires:
  - phase: 04-output-operations
    provides: authoritative saved-run workbook export and print parity baseline
  - phase: 06-customer-feedback-hardening-flexible-import-sheet-detection-strict-room-class-fairness-template-locked-export-parity-and-ai-verification-gate
    provides: fairness and diagnostics hardening used by authoritative saved runs
provides:
  - versioned workbook template parity contract linked to planning artifact
  - explicit room-only export fallback mode metadata and template version headers
  - regression coverage for merged ranges, print setup, split-name mapping, and fallback behavior
affects: [export, api, workbook, room-only-mode, regression-tests]
tech-stack:
  added: []
  patterns: [versioned export template contract, authoritative split-name projection, explicit room-only fallback metadata]
key-files:
  created:
    - .planning/phases/06-customer-feedback-hardening-flexible-import-sheet-detection-strict-room-class-fairness-template-locked-export-parity-and-ai-verification-gate/06-03-TEMPLATE-PARITY-CONTRACT.md
    - src/features/allocation/server/export-template-contract.ts
  modified:
    - src/features/allocation/server/export-allocation-workbook.ts
    - src/app/api/allocations/[id]/export/route.ts
    - tests/allocation/export-allocation-workbook.test.ts
    - tests/api/allocation-export-route.test.ts
key-decisions:
  - "Locked workbook layout behind a versioned runtime contract linked to a phase-local parity spec instead of scattered styling constants."
  - "Room-only exports now declare deterministic fallback mode via metadata headers when no dedicated room template contract is configured."
patterns-established:
  - "Export parity changes must flow through export-template-contract.ts and applyTemplateContract()."
  - "Route-level export responses expose template version and mode for audit/debug without changing binary workbook download behavior."
requirements-completed: [EXPT-01, EXPT-04, EXPT-06, CF-EXPORT-01, CF-EXPORT-02]
duration: 10 min
completed: 2026-04-10
---

# Phase 06 Plan 03: Template source-of-truth parity contract and room-only policy Summary

**Versioned workbook parity contract with split-name columns, print-locked layout, and explicit room-only fallback metadata for authoritative saved-run exports**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-10T16:35:32Z
- **Completed:** 2026-04-10T16:45:48Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Added a phase-local template parity artifact and a versioned runtime contract that centralizes workbook structure, labels, styling, and print setup.
- Refactored workbook generation to use one `applyTemplateContract()` path while preserving authoritative split `middleName` and `firstName` mapping from saved-run projection.
- Made room-only export mode deterministic and auditable through response metadata, then protected parity behavior with workbook and route regression tests.

## Task Commits

Each task was committed atomically:

1. **Task 1: Establish template source-of-truth artifact and runtime parity contract linkage** - `b6de619` (feat)
2. **Task 2: Enforce authoritative split-name mapping and room-only mode policy** - `9193457` (feat)
3. **Task 3: Add parity regression tests for structure, print setup, and room-only fallback behavior** - `bf69250` (test)

## Files Created/Modified
- `.planning/phases/06-customer-feedback-hardening-flexible-import-sheet-detection-strict-room-class-fairness-template-locked-export-parity-and-ai-verification-gate/06-03-TEMPLATE-PARITY-CONTRACT.md` - Source-of-truth parity contract for sheet structure, labels, split-name mapping, and room-only policy.
- `src/features/allocation/server/export-template-contract.ts` - Runtime template contract with locked columns, print setup, template version, and room-only fallback resolver.
- `src/features/allocation/server/export-allocation-workbook.ts` - Contract-driven workbook writer returning binary bytes plus template version and export mode metadata.
- `src/app/api/allocations/[id]/export/route.ts` - Export route validation for room-only mode with template version and export mode response headers.
- `tests/allocation/export-allocation-workbook.test.ts` - Regression tests for merged ranges, print setup, header contract, split-name mapping, and fallback workbook behavior.
- `tests/api/allocation-export-route.test.ts` - Route tests for metadata headers, room-only fallback mode, and authoritative split-name parity.

## Decisions Made
- Locked workbook layout behind a versioned runtime contract linked to a planning artifact so parity drift becomes testable and auditable.
- Preserved `middleName` and `firstName` as first-class export columns while keeping `fullName` only where the contract explicitly requires it.
- Exposed room-only export selection through `x-export-template-version` and `x-export-mode` headers so binary downloads remain compatible while audit/debug metadata becomes explicit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed unsupported workbook comments metadata field**
- **Found during:** Task 3 (Add parity regression tests for structure, print setup, and room-only fallback behavior)
- **Issue:** `Workbook.comments` is not part of the ExcelJS workbook type, so `npm run typecheck` failed after adding metadata.
- **Fix:** Removed the unsupported property and kept audit metadata in the returned export result plus HTTP headers.
- **Files modified:** `src/features/allocation/server/export-allocation-workbook.ts`
- **Verification:** `npm run test -- tests/allocation/export-allocation-workbook.test.ts tests/api/allocation-export-route.test.ts` and `npm run typecheck`
- **Committed in:** `bf69250` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix preserved the intended audit/debug behavior without changing workbook output shape or route contract.

## Issues Encountered
- ExcelJS workbook typing does not support a generic `comments` property on `Workbook`; metadata had to stay in the structured export result and response headers instead.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness
- Export parity is now contract-driven and regression-protected, so Phase 06-04 can consume explicit template metadata instead of reverse-engineering workbook shape.
- Room-only behavior is deterministic and visible, reducing ambiguity for downstream verification-gate work.

## Self-Check: PASSED
- Found summary dependency files: parity contract artifact and runtime contract exist on disk.
- Verified task commits exist in git history: `b6de619`, `9193457`, `bf69250`.

---
*Phase: 06-customer-feedback-hardening-flexible-import-sheet-detection-strict-room-class-fairness-template-locked-export-parity-and-ai-verification-gate*
*Completed: 2026-04-10*
