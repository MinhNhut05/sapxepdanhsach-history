# Project Research Summary

**Project:** ExamRoomAllocator
**Domain:** Exam room allocation web app for Vietnamese education operations
**Researched:** 2026-04-08
**Confidence:** MEDIUM-HIGH

## Executive Summary

This product is a focused operational web app, not a full exam management suite. The strongest research signal is that success depends less on flashy UI and more on trust in the end-to-end workflow: import `.xlsx` correctly, sort Vietnamese names correctly, allocate fairly and deterministically, let staff review and fix edge cases, then export/print results that are usable immediately.

The recommended implementation approach is a modular monolith in Next.js fullstack with a clear domain core for allocation logic. Use PostgreSQL + Prisma for saved runs/history, ExcelJS for high-quality `.xlsx` export, and `Intl.Collator('vi')` with Unicode normalization for Vietnamese sorting. Keep allocation, SBD generation, manual edits, export, and history as separate modules even within one app.

The biggest risks are not infrastructure risks; they are domain integrity risks: vague fairness rules, incorrect Vietnamese collation, fragile Excel parsing, non-deterministic allocation results, and manual edits breaking invariants like room balance or unique SBDs. The roadmap should therefore front-load import normalization, domain rules, deterministic allocation, and validation before richer UI editing and export polish.

## Key Findings

### Recommended Stack

The best-fit stack is a one-repo Next.js 16 fullstack app with React 19, TypeScript, PostgreSQL 18, and Prisma 7.7.0. This matches the project’s Vercel deployment preference, keeps implementation simple for v1, and avoids premature FE/BE splitting. The app’s real complexity is business logic, not service boundaries.

ExcelJS should be the primary workbook engine because this product needs polished `.xlsx` output with multiple sheets, room-specific formatting, and print-friendly structure. For Vietnamese sorting, use `Intl.Collator('vi')` in application logic rather than relying on ASCII/default sort or DB-only ordering.

**Core technologies:**
- **Next.js 16.2.2**: fullstack app shell — one deployable app on Vercel, suitable for upload/preview/export workflow
- **PostgreSQL 18 + Prisma 7.7.0**: persistence and history — reliable structured storage with junior-friendly DX
- **ExcelJS 4.4.0**: Excel import/export — supports styled workbooks, multi-sheet output, and print-oriented formatting
- **Intl.Collator('vi') + Unicode NFC normalization**: Vietnamese sorting — ensures preview/export/print all use the same correct ordering
- **@dnd-kit/core 6.3.1**: drag-and-drop editing — current practical choice for room reassignment UX

### Expected Features

Research confirms that the true table stakes are operational, not aspirational: import Excel with schema validation, allocate students into rooms, generate SBD, preview before finalization, export Excel, print room lists, and allow manual correction after auto-allocation. In this domain, “output usable immediately” matters at least as much as the allocator itself.

The clearest differentiator for this project is support for multiple allocation strategies combined with a strong correction workflow. Saved runs/history and fairness dashboarding are also valuable because exam-room allocation is often rerun after roster or policy changes.

**Must have (table stakes):**
- Excel `.xlsx` import with row-level validation — users expect to start from existing rosters
- Automatic room allocation + SBD generation — core job-to-be-done
- Vietnamese-correct sorting — official outputs must match naming conventions
- Preview before export — staff need a checkpoint before finalizing
- Excel export + print-ready room lists — the workflow ends in printable/useable artifacts
- Manual correction after auto-allocation — real operations always contain exceptions

**Should have (competitive):**
- Multiple allocation strategies — strongest product differentiator for different exam policies
- Distribution quality dashboard — makes fairness visible and explainable
- Saved allocation runs/history — supports reruns, comparison, and auditability
- Interactive drag-and-drop reallocation — speeds up last-mile adjustments

**Defer (v2+):**
- Institution-specific print/export templates — useful later once multiple schools require different paperwork
- Generic rule builder / complex exception engine — too much scope for early versions
- Full exam management suite — adjacent product, not the MVP

### Architecture Approach

The recommended architecture is a modular monolith inside Next.js fullstack. Separate import/normalization, allocation domain engine, manual edit commands, export/print generation, and persistence/history. The canonical data flow should be: upload → validate/normalize → allocate → persist → preview/edit → export/print. Persisted run snapshots should be the source of truth so preview, export, print, and history always agree.

**Major components:**
1. **Import pipeline** — parse `.xlsx`, detect headers, normalize Unicode/text/date fields, validate required/optional columns
2. **Allocation domain engine** — Vietnamese sort, strategy execution, fairness checks, SBD generation, deterministic tie-breaks
3. **Preview + editor** — render room assignments, fairness metrics, warnings, and manual move operations
4. **Export/print module** — create master sheet + room sheets and print-friendly HTML from persisted run state
5. **Persistence/history module** — save allocation runs, config, audit metadata, and reproducible snapshots

### Critical Pitfalls

1. **Vague fairness rules** — define measurable fairness constraints before implementation; show metrics in the dashboard
2. **Incorrect Vietnamese sorting / missing Unicode normalization** — centralize one comparator and normalize all imported text to NFC
3. **Fragile Excel parsing assumptions** — validate schema explicitly, handle optional `GHI CHÚ`, blank rows/cells, and date parsing carefully
4. **Non-deterministic allocation output** — use stable tie-breaks and seeded randomization only if needed; persist config and seed
5. **Manual edits breaking invariants** — every move/edit must revalidate room balance, student counts, and SBD uniqueness
6. **Export that opens but is not usable immediately** — test generated workbooks and print layouts with real operational workflows
7. **Insufficient audit trail for a public no-auth v1** — save file hash, config, timestamp, strategy, and output snapshot so results can be reproduced

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Data Foundation
**Rationale:** Everything depends on a trustworthy import and canonical data model.
**Delivers:** Prisma schema, saved run model, Excel import, schema validation, Unicode normalization, Vietnamese sorting helpers, SBD generation rules.
**Addresses:** Excel import, Vietnamese sorting, candidate numbering.
**Avoids:** Fragile parsing, Unicode bugs, date handling errors.

### Phase 2: Allocation Engine
**Rationale:** The core product value is deterministic, explainable allocation with clear fairness rules.
**Delivers:** Fairness spec, three allocation strategies, simulation/unit tests, persisted allocation runs, reproducible results.
**Uses:** TypeScript domain layer, Prisma persistence.
**Implements:** Allocation domain engine.

### Phase 3: Review and Correction Workflow
**Rationale:** Users need confidence and override capability before they trust exports.
**Delivers:** Preview dashboard, room summaries, fairness metrics, manual edits, drag-and-drop, server-side invariant validation.
**Uses:** React UI + dnd-kit + charting.
**Implements:** Preview/editor components and edit command services.

### Phase 4: Output and Operations
**Rationale:** The product is only “done” when outputs are immediately usable by staff.
**Delivers:** Excel export (master + per-room sheets), print-friendly pages, run history, audit metadata, operational safeguards.
**Uses:** ExcelJS, print CSS, history storage.
**Implements:** Export/print/history modules.

### Phase Ordering Rationale

- Import normalization must come before allocation because garbage-in-garbage-out is severe in this domain.
- Vietnamese sort and SBD rules must be finalized early because they affect preview, edits, export, and print.
- Allocation should be persisted before rich editing so drag-and-drop operates on authoritative state rather than transient UI state.
- Export/print should read from saved snapshots to guarantee parity with what users reviewed.
- History/audit belongs in the final operational phase but its data model should be anticipated from the start.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Fairness metrics and strategy behavior need explicit domain formalization with test datasets.
- **Phase 3:** Drag-and-drop validation UX and invariant-preserving manual edit flows need careful interaction design.
- **Phase 4:** Print formatting and workbook layout parity should be tested against real Excel/printing workflows.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Next.js + Prisma + validation + Excel import pipeline uses well-established patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions and tool choices are well supported by official docs and fit stated constraints closely |
| Features | MEDIUM | Strong product-shape signal, but niche domain still needs real-user validation on what stays in MVP |
| Architecture | MEDIUM | Sound modular-monolith recommendation, but some details depend on actual file/UX complexity during implementation |
| Pitfalls | MEDIUM-HIGH | Risks are concrete and directly relevant to this domain, especially sorting, Excel I/O, and auditability |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Fairness spec:** Need exact measurable definitions for “giữ tương đối theo lớp” and “phân bổ tỉ lệ đại diện” during phase planning.
- **Dataset edge cases:** Need implementation-time validation with real Vietnamese names, duplicate names, mixed date formats, optional note column, and messy headers.
- **Print/output conventions:** Need confirmation of actual sheet/print layouts used by the target institution.
- **Public no-auth operations:** Need minimal safeguards for file size, rate limiting, session tracing, and retention policy.

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` — official-version-backed stack recommendations
- `.planning/research/ARCHITECTURE.md` — architecture, boundaries, data flow, build order
- `.planning/research/PITFALLS.md` — domain-specific risks and prevention mapping
- MDN `Intl.Collator` docs — locale-aware Vietnamese sorting approach
- PostgreSQL official collation docs — collation/ICU support
- Prisma official docs — ORM and migration fit for TypeScript/Postgres

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` — domain feature patterns and prioritization
- `xepphongthi.com` — Vietnamese room-allocation product conventions
- OpenEduCat exam management feature pages — broader exam-operations feature context

### Tertiary (LOW confidence)
- Vendor marketing pages for exam hall allocation products — useful for recurring feature patterns but not authoritative for local workflow decisions

---
*Research completed: 2026-04-08*
*Ready for roadmap: yes*
