---
phase: 05-smart-intake-core
verified: 2026-04-08T16:30:00Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "Users have one smart intake flow that keeps clean imports on the fast path, routes uncertain repairs into review, and then unlocks allocation from the same reachable workspace"
    status: failed
    reason: "The review-and-gating flow exists in code and tests, but the actual app entrypoint still renders only UploadPanel. AllocationWorkspace is not mounted by any app route, so the end-to-end smart flow is not reachable in the running app."
    artifacts:
      - path: "src/app/page.tsx"
        issue: "Homepage imports and renders UploadPanel directly instead of the integrated AllocationWorkspace."
      - path: "src/features/allocation/ui/allocation-workspace.tsx"
        issue: "Workspace is substantive but orphaned; no app page imports it."
    missing:
      - "Mount AllocationWorkspace (or equivalent integrated screen) from a real route so review_required imports can continue into review and allocation gating in the actual app."
      - "Update reachable page coverage so the shipped UI exercises the same smart-intake path that tests cover."
---

# Phase 05: Smart Intake Core Verification Report

**Phase Goal:** Harden intake so users can feed noisy roster files into one smart flow that preserves the clean-file fast path, routes uncertain repairs into review, and keeps every machine-generated change auditable.
**Verified:** 2026-04-08T16:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Clean roster files stay on the fast path and return ready payloads with students for downstream use. | ✓ VERIFIED | `src/features/roster/server/import-roster.ts`, `src/app/api/rosters/import/route.ts`, `tests/roster/import-roster.test.ts`, `tests/api/rosters-import-route.test.ts` |
| 2 | Noisy roster files can be read from `.xlsx`, `.xls`, and `.csv`, recover headers, and route recoverable problems into `review_required` instead of hard failure. | ✓ VERIFIED | `src/features/roster/server/read-intake-file.ts`, `src/features/roster/server/detect-header-row.ts`, `src/features/roster/lib/map-headers.ts`, `tests/roster/read-intake-file.test.ts`, `tests/roster/import-roster.test.ts` |
| 3 | Sensitive or uncertain machine-generated repairs remain in review with audit metadata instead of auto-applying. | ✓ VERIFIED | `src/features/roster/server/build-intake-review.ts`, `src/features/roster/server/row-validation.ts`, `src/features/roster/domain/intake-review.ts`, `tests/roster/import-roster.test.ts`, `tests/api/rosters-import-route.test.ts` |
| 4 | Optional AI assistance degrades safely to rule-based review and records fallback signals instead of blocking intake. | ✓ VERIFIED | `src/features/roster/server/intake-config.ts`, `src/features/roster/server/intake-ai-provider.ts`, `src/features/roster/server/intake-ai-fallback.ts`, `src/features/roster/server/import-roster.ts`, related tests in `tests/roster/import-roster.test.ts` and `tests/api/rosters-import-route.test.ts` |
| 5 | Users have one reachable smart intake flow that continues from upload to review to allocation gating in the actual app. | ✗ FAILED | `src/features/allocation/ui/allocation-workspace.tsx` implements the flow, but `src/app/page.tsx` still renders only `UploadPanel`; no app page mounts `AllocationWorkspace`. |

**Score:** 4/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `/home/minhnhut_dev/projects/sapxepdanhsach/.claude/worktrees/phase5-05-04-resume/src/features/roster/server/read-intake-file.ts` | Unified `.xlsx`/`.xls`/`.csv` intake reader | ✓ VERIFIED | Reads all three formats and preserves row snapshots for downstream validation. |
| `/home/minhnhut_dev/projects/sapxepdanhsach/.claude/worktrees/phase5-05-04-resume/src/features/roster/server/detect-header-row.ts` | Recoverable header detection | ✓ VERIFIED | Scans up to 8 meaningful rows and returns best header candidate. |
| `/home/minhnhut_dev/projects/sapxepdanhsach/.claude/worktrees/phase5-05-04-resume/src/features/roster/server/import-roster.ts` | Smart intake orchestration | ✓ VERIFIED | Wires reading, header detection, validation, review building, AI fallback, and ready/review_required/failed states. |
| `/home/minhnhut_dev/projects/sapxepdanhsach/.claude/worktrees/phase5-05-04-resume/src/app/api/rosters/import/route.ts` | Reachable import API contract | ✓ VERIFIED | Returns HTTP 200 for recoverable ready/review_required paths, 422 for failed validation, and includes source metadata. |
| `/home/minhnhut_dev/projects/sapxepdanhsach/.claude/worktrees/phase5-05-04-resume/src/features/roster/ui/intake-review-panel.tsx` | Review UI with confirmations and audit details | ✓ VERIFIED | Substantive component, used by workspace, blocks continue until confirmations complete. |
| `/home/minhnhut_dev/projects/sapxepdanhsach/.claude/worktrees/phase5-05-04-resume/src/features/allocation/ui/allocation-workspace.tsx` | Unified upload-review-allocation workspace | ⚠️ ORPHANED | Implemented and tested, but not imported by any app route. |
| `/home/minhnhut_dev/projects/sapxepdanhsach/.claude/worktrees/phase5-05-04-resume/src/app/page.tsx` | Real entrypoint for the smart flow | ✗ STUB FOR PHASE GOAL | Reachable page still exposes only the older upload shell and `UploadPanel`, not the integrated smart flow. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `UploadPanel` | `/api/rosters/import` | `fetch` submit handler | WIRED | `src/features/roster/ui/upload-panel.tsx:87-91` |
| `/api/rosters/import` route | `importRosterWorkbook` | direct server call | WIRED | `src/app/api/rosters/import/route.ts:59-69` |
| `importRosterWorkbook` | `readIntakeFile` + `detectHeaderRow` + `buildIntakeReview` | direct orchestration | WIRED | `src/features/roster/server/import-roster.ts:247-345` |
| `importRosterWorkbook` | AI config/provider/fallback | `getSmartIntakeConfig` + `createIntakeAiProvider` + `handleIntakeAiFailure` | WIRED | `src/features/roster/server/import-roster.ts:341-381` |
| `AllocationWorkspace` | `IntakeReviewPanel` | conditional render for `review_required` | WIRED | `src/features/allocation/ui/allocation-workspace.tsx:452-463` |
| App route | `AllocationWorkspace` | page import/render | NOT_WIRED | No app page imports `AllocationWorkspace`; `src/app/page.tsx` imports `UploadPanel` directly. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| INTK-01 | User-provided phase scope | Smart intake accepts noisy roster inputs in the same intake system | ✓ SATISFIED | Multi-format reader and upload guard support `.xlsx`, `.xls`, `.csv`; header recovery exists. |
| INTK-02 | User-provided phase scope | Preserve clean-file fast path | ✓ SATISFIED | Ready path returns students directly; tested in route and server tests. |
| INTK-03 | User-provided phase scope | Recoverable intake routes to review instead of failing outright | ✓ SATISFIED | `review_required` path implemented and tested. |
| INTK-04 | User-provided phase scope | Recoverable imports expose source metadata and staged data | ✓ SATISFIED | Route includes `sourceFileName`, `sourceFormat`, `fallbackUsed`; review payload includes `stagedStudents`. |
| REVW-01 | User-provided phase scope | Review payload includes structured confidence/audit data | ✓ SATISFIED | `IntakeReviewPayload` and `buildIntakeReview` provide summary, items, auditTrail, unresolvedCount. |
| REVW-02 | User-provided phase scope | Operator-facing review workspace exists | ✓ SATISFIED | `IntakeReviewPanel` implemented and tested inside workspace. |
| REVW-03 | User-provided phase scope | Allocation unlocks only after review is resolved | ✓ SATISFIED | `allocationDisabled` checks `intakeState !== "ready"`; tested in workspace tests. |
| AUDT-01 | User-provided phase scope | Machine-generated changes are auditable | ✓ SATISFIED | Audit records contain raw/proposed/source/confidence/reason/autoApplied/sensitive and are carried through payload/UI. |
| SAFE-04 | User-provided phase scope | Sensitive repairs remain review-only | ✓ SATISFIED | `studentCode` and `className` are forced non-auto-applied; tests cover this. |
| SAFE-05 | User-provided phase scope | AI assistance fails safe to review | ✓ SATISFIED | Provider/config/quota failures set `fallbackUsed` and keep review flow alive. |

Note: `/home/minhnhut_dev/projects/sapxepdanhsach/.claude/worktrees/phase5-05-04-resume/.planning/REQUIREMENTS.md` does not define these phase-05 IDs, so they are currently orphaned from the checked-in requirements registry.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `/home/minhnhut_dev/projects/sapxepdanhsach/.claude/worktrees/phase5-05-04-resume/src/features/roster/server/intake-ai-provider.ts` | 45-46 | `suggestHeaderMapping()` returns `[]` and is unused | Warning | Provider abstraction is incomplete for header-mapping AI, but this does not block the current verified rule-based flow. |
| `/home/minhnhut_dev/projects/sapxepdanhsach/.claude/worktrees/phase5-05-04-resume/src/app/page.tsx` | 1-65 | Reachable page still renders legacy upload shell only | Blocker | Prevents the integrated smart review/allocation flow from being delivered to users. |

### Human Verification Required

None beyond the blocking wiring gap. The main failure is programmatically verifiable.

### Gaps Summary

Phase 05 delivered most of the backend and UI pieces: tolerant readers, recoverable review payloads, audit trail metadata, safe AI fallback, and allocation gating logic. However, the phase goal is about one smart intake flow that users can actually use. That final wiring is missing in the real app entrypoint. The integrated workspace exists and is tested, but it is not mounted by any route, so the shipped code does not yet achieve the full phase goal.

---

_Verified: 2026-04-08T16:30:00Z_
_Verifier: Claude (gsd-verifier)_
