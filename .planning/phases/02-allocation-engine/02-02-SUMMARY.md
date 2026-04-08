---
phase: 02-allocation-engine
plan: 02
status: completed
completed: 2026-04-08
requirements_completed:
  - ALOC-02
  - ALOC-03
  - ALOC-04
  - ALOC-05
  - ALOC-06
  - ALOC-07
  - ALOC-08
verification:
  - npm run typecheck
  - npm run test -- tests/allocation/build-room-capacities.test.ts tests/allocation/strategy-algorithms.test.ts tests/allocation/create-allocation-run.test.ts
---

# Phase 2 Plan 02 Summary

Plan `02-02` delivered the deterministic allocation engine and its domain-level regression coverage.

## Accomplishments

- Implemented balanced room-capacity generation using the exact `floor + remainder` rule.
- Added three deterministic strategies: `even_mix`, `class_grouped`, and `representative_ratio`.
- Centralized allocation orchestration in `createAllocationRun`.
- Generated candidate numbers in `Pxx-yyy` format only after per-room Vietnamese ordering was finalized.
- Added invariant validation for missing assignments, duplicate candidate numbers, capacity overruns, room-count mismatches, and invalid room spreads.
- Added reproducibility and fairness tests, including the K19A-derived `272 / 13` baseline distribution.

## Key Files

- `src/features/allocation/domain/build-room-capacities.ts`
- `src/features/allocation/domain/assign-even-mix.ts`
- `src/features/allocation/domain/assign-class-grouped.ts`
- `src/features/allocation/domain/assign-representative-ratio.ts`
- `src/features/allocation/domain/generate-candidate-numbers.ts`
- `src/features/allocation/domain/validate-allocation-result.ts`
- `src/features/allocation/domain/create-allocation-run.ts`
- `tests/allocation/build-room-capacities.test.ts`
- `tests/allocation/strategy-algorithms.test.ts`
- `tests/allocation/create-allocation-run.test.ts`

## Notes

- The engine stays pure: it does not read environment state and does not mutate the caller's roster array.
- This plan was executed inline in the working tree; no per-task git commits were created.

