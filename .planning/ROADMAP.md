# Roadmap: ExamRoomAllocator

**Created:** 2026-04-08
**Mode:** yolo
**Granularity:** coarse
**Phases:** 6
**Coverage:** 51/51 active requirements mapped

## Overview

This roadmap follows the dependency chain surfaced by research:
1. Data foundation first
2. Deterministic allocation engine second
3. Review and manual correction workflow third
4. Export, print, history, and operational safeguards fourth
5. Smart intake hardening fifth
6. Customer-feedback hardening sixth

All currently active requirements map to exactly one phase.

## Phase Summary

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Data Foundation | Establish canonical data model, import pipeline, validation, Vietnamese normalization, and SBD rules | IMPT-01, IMPT-02, IMPT-03, IMPT-04, IMPT-05, IMPT-06, SAFE-01, SAFE-02 | 4 |
| 2 | Allocation Engine | Deliver deterministic room allocation with three strategies, room balancing, Vietnamese ordering, and reproducible persisted runs | ALOC-01, ALOC-02, ALOC-03, ALOC-04, ALOC-05, ALOC-06, ALOC-07, ALOC-08, HIST-01, HIST-03, HIST-04 | 4 |
| 3 | Review & Manual Editing | Let users inspect fairness, preview results, and safely adjust allocations with drag-and-drop/manual edits | PREV-01, PREV-02, PREV-03, PREV-04, PREV-05, EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05 | 4 |
| 4 | Output & Operations | Produce final usable outputs, reopening/history flows, and retention/operational safeguards | EXPT-01, EXPT-02, EXPT-03, EXPT-04, EXPT-05, EXPT-06, HIST-02, SAFE-03 | 4 |
| 5 | Smart Intake Core | Harden roster intake so messy spreadsheet inputs can still be recognized, repaired safely, reviewed, and handed to the current allocation flow | INTK-01, INTK-02, INTK-03, INTK-04, REVW-01, REVW-02, REVW-03, AUDT-01, SAFE-04, SAFE-05 | 4 |
| 6 | Customer Feedback Hardening | Resolve customer hardening gaps across sheet detection, strict class fairness, template-locked export parity, room-only template policy, and AI verification gate | CF-IMPORT-01, CF-FAIRNESS-01, CF-EXPORT-01, CF-EXPORT-02, CF-AI-GATE-01 | 4 |

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

### Phase 5: Smart Intake Core
**Goal:** Harden intake so users can feed noisy roster files into one smart flow that preserves the clean-file fast path, routes uncertain repairs into review, and keeps every machine-generated change auditable.

**Requirements:**
- INTK-01
- INTK-02
- INTK-03
- INTK-04
- REVW-01
- REVW-02
- REVW-03
- AUDT-01
- SAFE-04
- SAFE-05

**Success criteria:**
1. User can upload `.xlsx`, `.xls`, or `.csv` files with mild layout/header noise and still reach a recoverable intake result from one shared flow.
2. Clean files proceed directly into the existing allocation flow, while messy files branch into an intake review workspace with high/medium/low-confidence mapping and repair decisions.
3. Sensitive fields such as `MSHV` and `Lớp` are never silently auto-corrected; safe normalizations can auto-apply only when confidence is high and the audit trail records what changed.
4. If the AI provider is unavailable, the app still offers rule-based parsing plus review instead of blocking the operator.

### Phase 6: Customer Feedback Hardening
**Goal:** Close customer-reported hardening gaps without rewriting core architecture by adding deterministic worksheet selection, strict class fairness behavior, template-locked export parity, explicit room-only template handling, and deterministic-first AI verification gate behavior.

**Requirements:**
- CF-IMPORT-01
- CF-FAIRNESS-01
- CF-EXPORT-01
- CF-EXPORT-02
- CF-AI-GATE-01

**Success criteria:**
1. Workbook intake deterministically selects the roster sheet even when sheet 1 is blank/title-only, and the selected sheet reason is visible in import metadata.
2. In strict fairness mode, every class spread across rooms is `<= 1` when feasible; infeasible cases return deterministic fallback output with machine-readable violation reasons.
3. Export output is generated from a versioned template parity contract, preserving split-name columns and layout/print settings; room-only export follows a defined template mode with explicit fallback metadata.
4. Pre-export verification always runs deterministic checks, AI advisories cannot override deterministic blockers, and AI provider failure degrades to deterministic verification instead of blocking export.

## Phase Ordering Rationale

- Phase 1 must come first because import correctness, normalization, and validation are prerequisites for everything else.
- Phase 2 comes next because allocation logic and persisted runs define the authoritative state used by preview, editing, export, and history.
- Phase 3 depends on Phase 2 because manual editing must operate on valid saved allocations with invariant checks.
- Phase 4 follows because outputs and reopening flows require stable import, allocation, and editing contracts.
- Phase 5 then hardens intake with confidence/review flows while preserving the existing downstream contracts.
- Phase 6 comes last because it hardens edge cases and parity expectations based on customer feedback after core workflows already exist.

## Coverage Check

| Category | Count |
|----------|-------|
| Active requirements total | 51 |
| Mapped to phases | 51 |
| Unmapped | 0 |

Coverage status: ✓ Complete

## Research Flags

- **Phase 2:** Needs deeper planning around fairness metrics, deterministic tie-break rules, and strategy-specific validation.
- **Phase 3:** Needs careful planning for drag-and-drop state flow and post-edit invariant enforcement.
- **Phase 4:** Needs implementation-time validation for workbook formatting parity and print CSS behavior.
- **Phase 5:** Needs planning around multi-format sniffing, confidence scoring, intake review UX, audit persistence, and AI fallback boundaries.
- **Phase 6:** Needs strict traceability between template parity contract artifacts, room-only export policy, and deterministic verification gate behavior.

### Phase 5: Smart Intake Core

**Goal:** Harden intake so messy spreadsheet inputs can still be recognized, repaired safely, reviewed, and handed to the current allocation flow.
**Requirements**: INTK-01, INTK-02, INTK-03, INTK-04, REVW-01, REVW-02, REVW-03, AUDT-01, SAFE-04, SAFE-05
**Depends on:** Phase 4
**Plans:** 4 plans

Plans:
- [ ] 05-01 — Intake contracts and tolerant file readers
- [ ] 05-02 — Rule-based smart intake orchestration and audit payload
- [ ] 05-03 — Review workspace and allocation gating
- [ ] 05-04 — AI assistance, fallback hardening, and regression coverage

### Phase 6: Customer feedback hardening: flexible import sheet detection, strict room class fairness, template-locked export parity, and AI verification gate

**Goal:** Deliver customer-requested hardening on top of the existing flow by making import sheet selection deterministic, fairness strict and feasibility-aware, export template-locked with explicit room-only mode fallback, and verification deterministic-first with AI advisories.
**Requirements**: CF-IMPORT-01, CF-FAIRNESS-01, CF-EXPORT-01, CF-EXPORT-02, CF-AI-GATE-01
**Depends on:** Phase 5
**Plans:** 4 plans

Plans:
- [x] 06-01 — Flexible workbook sheet detection and import diagnostics
- [x] 06-02 — Strict class fairness feasibility, fallback, and diagnostics
- [ ] 06-03 — Template source-of-truth parity contract and room-only policy
- [ ] 06-04 — Deterministic export verification gate with AI advisories

---
*Last updated: 2026-04-10 after Phase 6 revision hardening*
