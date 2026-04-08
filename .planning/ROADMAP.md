# Roadmap: ExamRoomAllocator

**Created:** 2026-04-08
**Mode:** yolo
**Granularity:** coarse
**Phases:** 4
**Coverage:** 36/36 v1 requirements mapped

## Overview

This roadmap follows the dependency chain surfaced by research:
1. Data foundation first
2. Deterministic allocation engine second
3. Review and manual correction workflow third
4. Export, print, history, and operational safeguards last

All v1 requirements map to exactly one phase.

## Phase Summary

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Data Foundation | Establish canonical data model, import pipeline, validation, Vietnamese normalization, and SBD rules | IMPT-01, IMPT-02, IMPT-03, IMPT-04, IMPT-05, IMPT-06, SAFE-01, SAFE-02 | 4 |
| 2 | Allocation Engine | Deliver deterministic room allocation with three strategies, room balancing, Vietnamese ordering, and reproducible persisted runs | ALOC-01, ALOC-02, ALOC-03, ALOC-04, ALOC-05, ALOC-06, ALOC-07, ALOC-08, HIST-01, HIST-03, HIST-04 | 4 |
| 3 | Review & Manual Editing | Let users inspect fairness, preview results, and safely adjust allocations with drag-and-drop/manual edits | PREV-01, PREV-02, PREV-03, PREV-04, PREV-05, EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05 | 4 |
| 4 | Output & Operations | Produce final usable outputs, reopening/history flows, and retention/operational safeguards | EXPT-01, EXPT-02, EXPT-03, EXPT-04, EXPT-05, EXPT-06, HIST-02, SAFE-03 | 4 |

## Phase Details

### Phase 1: Data Foundation
**Goal:** Build a trustworthy foundation for roster import, canonical student data, validation, and shared domain rules.

**Requirements:**
- IMPT-01
- IMPT-02
- IMPT-03
- IMPT-04
- IMPT-05
- IMPT-06
- SAFE-01
- SAFE-02

**Success criteria:**
1. User uploads a valid `.xlsx` roster and sees parsed student data with required fields mapped correctly.
2. User imports files with or without `GHI CHÚ` and receives specific row-level validation errors for bad data.
3. Vietnamese names and birth dates are normalized consistently so downstream sort/display/export use the same canonical values.
4. Unsupported file types, oversized files, or invalid server-side payloads are rejected before allocation starts.

### Phase 2: Allocation Engine
**Goal:** Implement deterministic, explainable allocation logic and persist reproducible allocation runs.

**Requirements:**
- ALOC-01
- ALOC-02
- ALOC-03
- ALOC-04
- ALOC-05
- ALOC-06
- ALOC-07
- ALOC-08
- HIST-01
- HIST-03
- HIST-04

**Success criteria:**
1. User selects room count and one of the three allocation strategies, then receives a valid room assignment for all imported students.
2. Re-running the same input with the same settings produces the same allocation result and SBD values.
3. Allocation results keep room sizes as even as possible while applying the chosen strategy and Vietnamese sort order.
4. Saved allocation runs include enough metadata to reproduce how the result was generated.

### Phase 3: Review & Manual Editing
**Goal:** Give operators confidence in the allocation and safe tools to adjust it before finalization.

**Requirements:**
- PREV-01
- PREV-02
- PREV-03
- PREV-04
- PREV-05
- EDIT-01
- EDIT-02
- EDIT-03
- EDIT-04
- EDIT-05

**Success criteria:**
1. User previews the full allocation result, including per-room lists, room sizes, and overall balance metrics.
2. User sees fairness/class-distribution indicators and warnings when allocation or edits violate expected rules.
3. User moves or reorders students manually, including drag-and-drop between rooms, without losing any students or creating silent inconsistencies.
4. After edits are saved, the preview remains the single source of truth for later export and print outputs.

### Phase 4: Output & Operations
**Goal:** Generate production-ready outputs and complete the operational loop with history reopening and cleanup policy.

**Requirements:**
- EXPT-01
- EXPT-02
- EXPT-03
- EXPT-04
- EXPT-05
- EXPT-06
- HIST-02
- SAFE-03

**Success criteria:**
1. User exports a final `.xlsx` workbook containing one master sheet and one sheet per room with all required columns.
2. User prints room-specific lists directly from the web with formatting suitable for operational use.
3. Exported Excel and printed outputs match the approved preview exactly for ordering, room assignment, and SBD values.
4. User reopens previously saved runs, while stored data follows the defined retention/cleanup policy.

## Phase Ordering Rationale

- Phase 1 must come first because import correctness, normalization, and validation are prerequisites for everything else.
- Phase 2 comes next because allocation logic and persisted runs define the authoritative state used by preview, editing, export, and history.
- Phase 3 depends on Phase 2 because manual editing must operate on valid saved allocations with invariant checks.
- Phase 4 is last because outputs and reopening flows only make sense once import, allocation, and editing are stable.

## Coverage Check

| Category | Count |
|----------|-------|
| v1 requirements total | 36 |
| Mapped to phases | 36 |
| Unmapped | 0 |

Coverage status: ✓ Complete

## Research Flags

- **Phase 2:** Needs deeper planning around fairness metrics, deterministic tie-break rules, and strategy-specific validation.
- **Phase 3:** Needs careful planning for drag-and-drop state flow and post-edit invariant enforcement.
- **Phase 4:** Needs implementation-time validation for workbook formatting parity and print CSS behavior.

---
*Roadmap created: 2026-04-08*
