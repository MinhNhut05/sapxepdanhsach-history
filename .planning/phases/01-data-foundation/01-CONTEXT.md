# Phase 1: Data Foundation - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 establishes the canonical student-data foundation for the whole app: strict `.xlsx` roster intake, deterministic header detection, row-level validation, Vietnamese-safe normalization, and shared import rules that later allocation, preview, edit, export, and history flows will trust.

</domain>

<decisions>
## Implementation Decisions

### Import Contract
- **D-01:** Required columns are recognized with light normalization only: tolerate casing, extra spaces, and Unicode-form differences, but do not support broad semantic aliases.
- **D-02:** Required columns may appear in any order. Extra columns are ignored.
- **D-03:** v1 imports only the first worksheet.
- **D-04:** The header row must be the first row in the sheet. Any leading non-header rows are invalid.

### Validation And Error Handling
- **D-05:** Any blocking row or schema error stops the whole import. Partial import is not allowed in Phase 1.
- **D-06:** Validation feedback must be row-level and column-level, with the problematic value shown when safe.
- **D-07:** Validation severity has three levels: `blocking`, `warning`, and `info`.
- **D-08:** `info` is only for harmless automatic cleanup or observations, such as trimming whitespace or skipping trailing blank rows.
- **D-09:** If there are only `warning` and `info` entries, import may continue, but both groups must be shown clearly.
- **D-10:** Failed imports should prioritize a centralized error table for fast source-file correction rather than mixing errors into a parsed-data preview.

### Canonical Data Rules
- **D-11:** Name fields are normalized for Unicode, whitespace, and display casing. Canonical display should be clean and standardized.
- **D-12:** The system keeps both raw imported values and canonical normalized values for audit, comparison, and downstream deterministic behavior.
- **D-13:** Text birth dates should be parsed broadly enough for real operational files, but any ambiguous date string must become a `blocking` error rather than being guessed.
- **D-14:** Whenever the canonical value differs from the raw value but remains valid, the import succeeds and records an `info` entry explaining the normalization.

### Duplicate And Ambiguous Data
- **D-15:** Duplicate `MSHV` values in the same file are `blocking` errors.
- **D-16:** Same full name plus same birth date with different `MSHV` values remains valid, but should raise a `warning` for operator review.
- **D-17:** Blank rows inside the data region are skipped, but should raise a `warning` so the operator knows the file was not clean.
- **D-18:** Any row missing a required field is a `blocking` error and contributes to stopping the full import.

### the agent's Discretion
- Exact supported non-ambiguous text date formats can be finalized during planning and implementation, as long as they remain broad in practice and ambiguous strings are rejected.
- The exact normalized display-casing algorithm may be selected during planning, but it must preserve raw values and keep Vietnamese text safe.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product And Scope
- `.planning/PROJECT.md` — product shape, operational constraints, v1 boundaries, stack direction, and Vietnamese-first requirements.
- `.planning/REQUIREMENTS.md` — authoritative requirement mapping for Phase 1 import, validation, and safeguards.
- `.planning/ROADMAP.md` — phase goal, success criteria, and sequence constraints for Data Foundation.
- `.planning/STATE.md` — current project status and phase focus.

### Research Context
- `.planning/research/SUMMARY.md` — project-level architecture and risk summary, especially Excel parsing, Vietnamese normalization, and deterministic data handling.

### External Specs
- No external specs or ADRs were referenced during discussion. Requirements are fully captured in the planning docs and decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No application code exists yet. Phase 1 should define reusable import, validation, and normalization modules from scratch.

### Established Patterns
- The repo currently contains planning artifacts only. Code should follow the project constraint of Next.js fullstack + TypeScript + Prisma with pragmatic clean boundaries.

### Integration Points
- Phase 1 should create the canonical data contracts that later phases will consume for allocation, preview, editing, export, and persisted run history.

</code_context>

<specifics>
## Specific Ideas

- The operator wants a web app that is fully usable in practice, not artificially restricted, so import behavior should be flexible where safe and strict where silent corruption would be dangerous.
- Error handling should help staff fix the source Excel in one pass rather than forcing repeated trial-and-error.
- Output-facing student data should look clean and standardized, but the original imported values must remain available for audit.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-data-foundation*
*Context gathered: 2026-04-08*
