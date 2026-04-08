# Phase 5: Smart Intake Core - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 hardens roster intake so operators can upload messy `.xlsx`, `.xls`, and `.csv` files without manually cleaning them first. The phase must preserve the current clean-file fast path into allocation, add confidence-based repair/review for noisy files, and keep every machine-generated change auditable before allocation proceeds.

</domain>

<decisions>
## Implementation Decisions

### Intake Strategy
- **D-01:** This is a full smart-intake phase, not just parser hardening. The intake flow combines deterministic parsing, heuristic recovery, AI-assisted mapping/repair, user review, and audit.
- **D-02:** Clean files should still go through a fast path and land directly in the existing allocation flow.
- **D-03:** Dirty or ambiguous files should branch into a dedicated intake review workspace before allocation.

### File Coverage
- **D-04:** The intake flow must support `.xlsx`, `.xls`, and `.csv`.
- **D-05:** CSV support should be practical rather than naive: detect delimiter, encoding, header row, and basic structure instead of assuming one perfect format.
- **D-06:** Mild spreadsheet noise must be tolerated, including title rows, blank rows, alias headers, extra whitespace, and uneven date formats.

### Confidence & Review
- **D-07:** Use a three-level confidence model: high, medium, low.
- **D-08:** High-confidence safe repairs may auto-apply.
- **D-09:** Medium- and low-confidence changes must be surfaced for user review before allocation proceeds.
- **D-10:** The review model should optimize for safety over speed because intake mistakes poison every downstream phase.

### Field Safety Rules
- **D-11:** `MSHV` and `Lớp` are sensitive fields and must never be silently auto-corrected.
- **D-12:** Header aliasing, whitespace cleanup, casing normalization, supported birth-date cleanup, birthplace cleanup, and note cleanup are eligible for high-confidence auto-fix.
- **D-13:** Name splitting/merging may be suggested, but should not silently auto-apply when it requires true semantic inference.

### Audit & Traceability
- **D-14:** Every repair decision needs audit data: raw value, proposed value, decision source (`rule` or `ai`), confidence, and short reasoning.
- **D-15:** Audit data is part of the product behavior, not just debug logging.

### AI Provider Use
- **D-16:** The architecture should stay provider-agnostic even if one provider is wired first.
- **D-17:** Provider base URL, API key, and model selection live in server-side configuration only; no UI for entering secrets in this phase.
- **D-18:** Model routing may use a fast model for classify/map work and a stronger model for difficult repair work, but that routing should stay hidden from operators.
- **D-19:** The phase should not commit provider secrets or fixed private endpoints into planning artifacts.

### Failure Handling
- **D-20:** If the AI provider is unavailable or out of quota, intake must degrade to rule-based parsing plus review instead of blocking the user.
- **D-21:** Existing allocation, review, export, and history flows remain the downstream contract. Phase 5 should feed them canonical students, not redesign them.

### Phase Split
- **D-22:** Phase 5 focuses on Smart Intake Core only. Deeper operations/governance concerns such as provider admin tooling, metrics dashboards, policy tuning, and side-by-side candidate comparison can move to a future Phase 6 if scope expands.

### the agent's Discretion
- Exact confidence scoring formula
- Internal AI prompt design and payload minimization strategy
- Storage shape for intake audit artifacts
- Final visual layout of the intake review workspace, as long as clean files stay fast and unsafe repairs stay reviewable

</decisions>

<specifics>
## Specific Ideas

- Operators may upload "bất cứ cái gì" from Excel exports, so the system should recognize intent even when formatting is slightly wrong.
- Accuracy matters more than raw speed because intake errors cascade into room allocation, export, and printing.
- The product should feel automatic when the file is clean, but should visibly slow down and ask for confirmation when the file is noisy or ambiguous.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope
- `.planning/PROJECT.md` — Current milestone goal, active scope, constraints, and key decisions for smart intake.
- `.planning/REQUIREMENTS.md` — Phase 5 requirement IDs (`INTK-*`, `REVW-*`, `AUDT-*`, `SAFE-*`) and traceability targets.
- `.planning/ROADMAP.md` — Phase 5 goal, dependencies, and success criteria.
- `.planning/phases/05-smart-intake-core/05-PRD.md` — Locked acceptance criteria and scope boundaries for this phase.

### Existing Intake Flow
- `src/app/api/rosters/import/route.ts` — Current server contract for roster import responses and status codes.
- `src/features/roster/server/import-roster.ts` — Existing workbook import orchestration, summary model, and blocking/all-or-nothing behavior.
- `src/features/roster/server/read-workbook.ts` — Current worksheet assumptions and read path for `.xlsx`.
- `src/features/roster/server/row-validation.ts` — Existing row validation and normalization behavior.
- `src/features/roster/lib/map-headers.ts` — Current header alias expectations and required column mapping.
- `src/features/roster/lib/parse-birth-date.ts` — Existing birth-date normalization and warning behavior.
- `src/features/roster/server/file-guard.ts` — Current upload-type and size guardrails that Phase 5 will extend beyond `.xlsx`.

### Existing UI Integration
- `src/features/roster/ui/import-state.ts` — Import result payload contract currently consumed by the homepage.
- `src/features/roster/ui/upload-panel.tsx` — Current upload surface and result rendering behavior that should preserve a fast clean-file path.
- `src/features/allocation/ui/allocation-workspace.tsx` — Existing gate where allocation only unlocks when `importResult.ok` is true.
- `src/features/allocation/ui/allocation-warning-panel.tsx` — Existing cross-workflow warning surface that may be reusable for intake review outcomes.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `UploadPanel` already knows how to submit a file and surface summary/issues; Phase 5 can evolve it into a fast-path entry point instead of replacing the homepage flow outright.
- `ImportResultPayload` already provides a shared summary/issues/students contract; Phase 5 should extend this contract rather than inventing an unrelated intake payload.
- `AllocationWorkspace` already disables downstream actions until import succeeds; this is a natural integration point for clean-path auto-advance and review-path gating.

### Established Patterns
- Import validation currently happens on the server and returns typed JSON with blocking/warning/info issue severity.
- Current import is effectively all-or-nothing when blocking issues exist. Phase 5 will need a more nuanced staging model without bypassing server ownership of canonical data.
- The app already treats authoritative server output as the source of truth for downstream phases. Intake review should follow the same pattern.

### Integration Points
- `/api/rosters/import` is the natural place to evolve from simple parsing into smart intake orchestration.
- `src/features/roster/server/*` is the current deterministic intake core and should remain the first layer before AI-assisted recovery.
- Any new intake review workspace must still end by producing canonical students consumable by `/api/allocations`.

</code_context>

<deferred>
## Deferred Ideas

- Provider/admin UI for secrets, model selection, or routing controls
- Intake metrics dashboards and usage analytics
- Editable repair-policy thresholds in the product UI
- Side-by-side comparison of multiple AI repair candidates

</deferred>

---

*Phase: 05-smart-intake-core*
*Context gathered: 2026-04-08*
