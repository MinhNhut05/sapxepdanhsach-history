# Phase 5: Smart Intake Core - PRD

**Status:** Ready for planning
**Date:** 2026-04-08

## Goal

Make roster intake resilient to messy spreadsheet inputs so operators can upload slightly dirty `.xlsx`, `.xls`, or `.csv` files, recover usable student data through one smart flow, and only stop to review when the system is not confident.

## Problem

The current import path assumes a relatively clean `.xlsx` workbook with a predictable first worksheet and recognizable headers. Real-world operators may receive files with title rows, alias headers, inconsistent date formats, CSV exports with unknown delimiter/encoding, or values that need light repair. If intake fails too easily, users must go back to Excel and clean data by hand. If intake guesses too aggressively, bad data poisons allocation and every downstream output.

## In Scope

- One intake flow for `.xlsx`, `.xls`, and `.csv`
- Deterministic parsing and heuristic recovery before/alongside AI-assisted repair
- Confidence bands: high, medium, low
- Fast path for clean files
- Review workspace for messy/uncertain files before allocation
- Audit trail for each repair or inferred mapping
- Server-side AI provider configuration and hidden model routing
- Rule-based fallback when AI is unavailable
- Final output remains canonical students consumable by the existing allocation flow

## Out of Scope

- Admin UI for API keys, provider settings, or model selection
- Intake metrics dashboards, provider usage analytics, or policy tuning UI
- Side-by-side comparison of multiple repair candidates
- Rewriting allocation, manual editing, export, print, or history features

## Locked Product Decisions

### Flow Design

- Clean files must continue directly into the current allocation flow.
- Messy files must branch into an intake review step before allocation.
- The product should feel automatic for good inputs and deliberately cautious for uncertain inputs.

### Safety Rules

- `MSHV` and `Lớp` are sensitive fields and must never be silently auto-corrected.
- Safe normalization may auto-apply when confidence is high: whitespace, casing, benign header aliases, supported date cleanup, birthplace cleanup, note cleanup.
- Name inference that changes semantics should not silently auto-apply.

### AI Policy

- AI may participate in mapping and repair, but the phase is not AI-only; deterministic logic and heuristics remain part of the core intake stack.
- The architecture should remain provider-agnostic.
- Provider base URL, API key, and model configuration live in server-side env/config only.
- Planning and code must not commit private secrets into the repo.

### Degradation Behavior

- If the AI provider fails or is quota-limited, the operator must still be able to continue through rule-based intake plus review.
- AI failure should reduce automation, not create a dead end.

## Acceptance Criteria

1. User can upload `.xlsx`, `.xls`, or `.csv` through one shared intake entry point.
2. Intake can recover from mild file noise such as title rows, blank rows, alias headers, inconsistent whitespace, and non-uniform supported birth-date text.
3. Clean files go straight to the existing allocation flow without forcing the operator through a heavy review screen.
4. Messy files open an intake review experience that shows confidence bands and requires review for medium/low-confidence changes before allocation.
5. Every repair decision exposes audit data: raw value, proposed value, decision source (`rule` or `ai`), confidence, and short reasoning.
6. `MSHV` and `Lớp` are never silently auto-corrected.
7. If the AI provider is unavailable, the operator can still complete intake using rule-based parsing plus review.
8. The final confirmed intake payload remains compatible with the current allocation workflow; Phase 5 does not redesign downstream contracts.

## Suggested Requirement Mapping

- `INTK-01` to `INTK-04`
- `REVW-01` to `REVW-03`
- `AUDT-01`
- `SAFE-04` to `SAFE-05`

## Phase 6 Candidate

If Phase 5 grows too large, split the following into Phase 6 instead of bloating the core intake milestone:

- Provider/admin tooling
- Intake metrics and observability dashboards
- Policy tuning UI
- Advanced comparison/replay tools for candidate repairs

---

*Use with:* `/gsd-plan-phase 5` or `/gsd-plan-phase 5 --prd .planning/phases/05-smart-intake-core/05-PRD.md`
