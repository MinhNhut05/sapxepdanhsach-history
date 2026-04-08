---
phase: 02-allocation-engine
status: passed
verified: 2026-04-08T10:36:44Z
requirements_checked: 11
requirements_passed: 11
human_verification: []
---

# Phase 2 Verification

Phase 2 passed verification. The project now supports deterministic room allocation with three strategies, balanced room sizes, Vietnamese-safe ordering, candidate number generation, and persisted saved runs.

## Automated Checks

- `npm run lint`
- `npx prisma validate`
- `npx prisma db push`
- `node "$HOME/.codex/get-shit-done/bin/gsd-tools.cjs" verify schema-drift "02"`
- `npm run typecheck`
- `npm run test`
- `npm run build`

All checks passed on the verified code state.

## Requirement Coverage

### ALOC-01
Passed. The homepage renders allocation controls in `src/features/allocation/ui/allocation-form.tsx`, and `src/features/allocation/ui/allocation-workspace.tsx` submits the chosen room count and strategy to `/api/allocations` only after a successful import.

### ALOC-02
Passed. `src/features/allocation/domain/assign-even-mix.ts` implements the `even_mix` strategy, and `tests/allocation/strategy-algorithms.test.ts` verifies it deterministically distributes students across rooms.

### ALOC-03
Passed. `src/features/allocation/domain/assign-class-grouped.ts` groups students by canonical class name while respecting capacity targets, and `tests/allocation/strategy-algorithms.test.ts` covers the class-grouped mode.

### ALOC-04
Passed. `src/features/allocation/domain/assign-representative-ratio.ts` uses explicit proportional quotas and deterministic tie-breaks, and `tests/allocation/strategy-algorithms.test.ts` covers the representative-ratio mode.

### ALOC-05
Passed. `src/features/allocation/domain/create-allocation-run.ts` centralizes deterministic orchestration, and `tests/allocation/create-allocation-run.test.ts` plus `tests/api/allocations-route.test.ts` prove repeated runs with the same canonical payload return identical assignments and candidate numbers.

### ALOC-06
Passed. `src/features/allocation/domain/build-room-capacities.ts` enforces the `floor + remainder` balancing rule, `src/features/allocation/domain/validate-allocation-result.ts` rejects size spreads above `1`, and K19A-derived tests verify the `272 / 13` baseline produces `12x21` and `1x20`.

### ALOC-07
Passed. Allocation orchestration and candidate-number generation both reuse the Vietnamese comparator from `src/features/roster/lib/sort-students.ts`, so room ordering stays sorted by `TÊN`, then `HỌ LÓT`, then `MSHV`.

### ALOC-08
Passed. `src/features/allocation/domain/generate-candidate-numbers.ts` produces `Pxx-yyy` values after final per-room ordering, and the domain, API, and UI tests assert the expected candidate-number format.

### HIST-01
Passed. `src/features/allocation/server/save-allocation-run.ts` persists each allocation run through `prisma.allocationRun.create`, and `/api/allocations` returns the saved run payload.

### HIST-03
Passed. `prisma/schema.prisma`, `src/features/allocation/server/run-allocation.ts`, and `src/features/allocation/ui/allocation-result-summary.tsx` preserve and display metadata including source file, sheet name, timestamp, strategy, room count, and algorithm summary.

### HIST-04
Passed. Saved runs store `sourceFileName`, `sourceSheetName`, `roomCount`, `strategy`, `algorithmVersion`, `rosterFingerprint`, `inputSnapshot`, `resultSnapshot`, and `summary`, which is sufficient to reproduce how a result was generated.

## Evidence

- Persistence foundation: `prisma/schema.prisma`, `prisma/migrations/20260408135500_add_allocation_run/migration.sql`, `src/lib/prisma.ts`
- Allocation engine and invariants: `src/features/allocation/domain/*`, `tests/allocation/*.test.ts`
- API route and persistence wiring: `src/app/api/allocations/route.ts`, `src/features/allocation/server/*`, `tests/api/allocations-route.test.ts`
- Operator workflow and rendered results: `src/features/allocation/ui/*`, `src/features/roster/ui/upload-panel.tsx`, `tests/ui/allocation-workspace.test.tsx`
- Plan summaries: `02-01-SUMMARY.md`, `02-02-SUMMARY.md`, `02-03-SUMMARY.md`, `02-04-SUMMARY.md`

## Result

Phase 2 achieved its goal: the application can produce deterministic, reproducible, persisted allocation results from an imported roster, surface them on the homepage, and enforce the balancing and traceability requirements needed for later editing and export phases.
