# Phase 5: Smart Intake Core - Research

**Researched:** 2026-04-08
**Domain:** Smart multi-format roster intake, confidence-based review, and auditable repair flow for Next.js + Prisma
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

Copied from `.planning/phases/05-smart-intake-core/05-CONTEXT.md`. [VERIFIED: context file]

### Locked Decisions
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

### Deferred Ideas
- Provider/admin UI for secrets, model selection, or routing controls
- Intake metrics dashboards and usage analytics
- Editable repair-policy thresholds in the product UI
- Side-by-side comparison of multiple AI repair candidates
</user_constraints>

<phase_requirements>
## Phase Requirements

Descriptions copied from `.planning/REQUIREMENTS.md`. [VERIFIED: requirements file]

| ID | Description | Research Support |
|----|-------------|------------------|
| INTK-01 | User can import `.xlsx`, `.xls`, or `.csv` through one intake flow | Use one staged intake API and a unified row-candidate pipeline backed by `xlsx` for workbook formats plus CSV byte decoding. [CITED: https://docs.sheetjs.com/docs/miscellany/formats/][CITED: https://docs.sheetjs.com/docs/api/parse-options/] |
| INTK-02 | System can detect header row, delimiter/encoding, and column mapping even when files contain title rows, blank rows, alias headers, or mild layout noise | Scan bounded top rows/sheets before validation, decode CSV from raw bytes, and apply header-row scoring plus alias maps instead of exact-row-1 assumptions. [VERIFIED: codebase grep][CITED: https://docs.sheetjs.com/docs/api/parse-options/][CITED: https://docs.sheetjs.com/docs/getting-started/examples/import] |
| INTK-03 | User can ingest recoverable roster files without manually cleaning the spreadsheet first | Replace the current all-or-nothing import response with a staged result that can return `review_required` instead of hard failure for recoverable noise. [VERIFIED: codebase grep][ASSUMED] |
| INTK-04 | System can auto-normalize safe issues such as whitespace, casing, supported date variants, and benign header differences | Keep deterministic repair rules first, but split safe auto-apply from sensitive-field suggestions. [VERIFIED: context file][VERIFIED: codebase grep] |
| REVW-01 | System assigns high, medium, or low confidence to mappings and repairs | Model confidence at the change level, not only at file level, so audit and review can explain each decision. [VERIFIED: context file][ASSUMED] |
| REVW-02 | Clean files proceed directly into the existing allocation flow, while messy files branch into an intake review workspace before allocation | Add `stage` / `allocationReady` metadata to the intake contract and keep `/api/allocations` consuming canonical students. [VERIFIED: codebase grep][ASSUMED] |
| REVW-03 | User must review medium/low-confidence changes before allocation proceeds | Use review-required gating in `AllocationWorkspace` instead of `importResult.ok` alone. [VERIFIED: codebase grep][ASSUMED] |
| AUDT-01 | User can inspect an intake audit trail showing raw value, proposed value, decision source (`rule` or `ai`), confidence, and short reasoning | Introduce structured audit entries for header mappings, field repairs, and review actions; do not collapse them into text-only issue messages. [VERIFIED: context file][VERIFIED: codebase grep][ASSUMED] |
| SAFE-04 | Sensitive fields such as `MSHV` and `Lớp` are never silently auto-corrected | Undo the current normalization behavior for those fields and route them to review-only suggestions. [VERIFIED: codebase grep][VERIFIED: context file] |
| SAFE-05 | When the AI provider is unavailable or quota-limited, user can continue with rule-based intake plus review instead of being blocked | AI must sit behind a provider adapter whose failures downgrade automation, not route status. [VERIFIED: context file][ASSUMED] |
</phase_requirements>

## Summary

The current intake path is intentionally narrow: `POST /api/rosters/import` validates one uploaded file, `file-guard.ts` accepts only `.xlsx`, `read-workbook.ts` loads `workbook.xlsx.load(...)`, the first non-empty row must be row 1, and `map-headers.ts` only accepts exact normalized matches for the canonical headers. [VERIFIED: src/app/api/rosters/import/route.ts][VERIFIED: src/features/roster/server/file-guard.ts][VERIFIED: src/features/roster/server/read-workbook.ts][VERIFIED: src/features/roster/lib/map-headers.ts]

That design is incompatible with Phase 5 as written. The phase needs a staged intake result that can distinguish three outcomes: hard failure, review-required recovery, and allocation-ready fast path. The existing `AllocationWorkspace` currently enables allocation solely from `importResult.ok`, so overloading `ok` to mean both “recoverable import” and “ready for allocation” would create ambiguous UI and brittle tests. [VERIFIED: src/features/allocation/ui/allocation-workspace.tsx][VERIFIED: tests/ui/allocation-workspace.test.tsx][ASSUMED]

The least risky plan is to keep the downstream allocation contract stable, add a separate staged intake layer inside the existing `roster` feature, and make AI strictly optional. Deterministic parsing, header aliasing, row validation, and safe repairs should run first; AI should only propose mappings or repairs that remain unresolved after heuristics, and provider failures should downgrade the stage to review-required rather than block the operator. [VERIFIED: context file][VERIFIED: codebase grep][ASSUMED]

**Primary recommendation:** Add a staged intake subsystem with structured audit entries, `stage` / `allocationReady` contract fields, a unified multi-format row parser, and a server-only AI adapter that is never required for successful intake. [VERIFIED: context file][VERIFIED: codebase grep][ASSUMED]

## Project Constraints (from CLAUDE.md)

- The app must stay on Next.js App Router + TypeScript and remain Vercel-friendly. [VERIFIED: CLAUDE.md]
- Persistent state should continue using PostgreSQL + Prisma. [VERIFIED: CLAUDE.md]
- Code should stay pragmatic and modular, without introducing heavyweight architecture for its own sake. [VERIFIED: CLAUDE.md]
- UI text should remain Vietnamese while code stays in English. [VERIFIED: CLAUDE.md]
- Vietnamese sorting must remain deterministic and correct. [VERIFIED: CLAUDE.md][VERIFIED: src/features/roster/lib/sort-students.ts]
- The original CLAUDE constraint said `.xlsx`-only intake/output, but the current milestone docs and Phase 5 requirements explicitly expand intake to `.xlsx`, `.xls`, and `.csv` while keeping output `.xlsx`; planning should treat that as the active milestone scope. [VERIFIED: CLAUDE.md][VERIFIED: .planning/PROJECT.md][VERIFIED: context file][VERIFIED: requirements file]
- The app remains public/no-auth in v1, so Phase 5 cannot assume authenticated user identity for intake review ownership. [VERIFIED: CLAUDE.md][VERIFIED: .planning/PROJECT.md]
- No project-specific skills were found in `.claude/skills` or `.agents/skills`. [VERIFIED: project skills scan]

## Standard Stack

The stack below is intentionally narrow and phase-specific: preserve the current Next.js/Prisma platform, add only the packages needed to broaden intake safely, and do not rewrite the Phase 4 export path. [VERIFIED: package.json][VERIFIED: prisma/schema.prisma][ASSUMED]

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `xlsx` | `0.18.5` (published 2022-03-24; registry modified 2024-10-22) [VERIFIED: npm registry] | Parse `.xlsx`, `.xls`, and `.csv` into a common workbook/worksheet model. [CITED: https://docs.sheetjs.com/docs/miscellany/formats/][CITED: https://docs.sheetjs.com/docs/solutions/input/] | One documented reader covers every required intake format and exposes `sheets`, `sheetRows`, `codepage`, and delimiter-override options, which reduces format-specific branching before review logic. [CITED: https://docs.sheetjs.com/docs/api/parse-options/][ASSUMED] |
| `exceljs` | `4.4.0` (published 2023-10-19) [VERIFIED: npm registry] | Keep the current `.xlsx` export path and current workbook-based test helpers. [VERIFIED: package.json][VERIFIED: tests/roster/import-roster.test.ts][VERIFIED: tests/api/rosters-import-route.test.ts] | Phase 5 should not destabilize the shipped output workflow; the current codebase and tests already rely on ExcelJS for `.xlsx` operations. [VERIFIED: package.json][VERIFIED: tests tree] |
| `zod` | `4.3.6` (published 2026-01-22) [VERIFIED: npm registry] | Validate staged intake payloads, review-confirmation payloads, and AI response envelopes. [VERIFIED: src/features/allocation/server/allocation-request.ts] | The codebase already uses Zod for server request validation, so the new intake contracts should follow the same pattern. [VERIFIED: src/features/allocation/server/allocation-request.ts] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `chardet` | `2.1.1` (published 2025-10-29) [VERIFIED: npm registry] | Detect likely CSV encoding from raw bytes before decoding. [CITED: https://www.npmjs.com/package/chardet][CITED: https://github.com/runk/node-chardet] | Use for CSV uploads without BOM or clear UTF-8 markers, especially when operators export from legacy spreadsheet tools. [CITED: https://www.npmjs.com/package/chardet][ASSUMED] |
| `iconv-lite` | `0.7.2` (published 2026-01-08) [VERIFIED: npm registry] | Decode CSV buffers using the detected legacy encoding. [CITED: https://github.com/pillarjs/iconv-lite] | Use after `chardet` and before feeding CSV text into the common row pipeline. [CITED: https://github.com/pillarjs/iconv-lite][ASSUMED] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `xlsx` as the unified reader | `exceljs` for `.xlsx` + `csv-parse` for `.csv` + another library for `.xls` | This yields more explicit CSV controls, but it creates at least three intake code paths and still leaves `.xls` unresolved without a third parser. [CITED: https://github.com/exceljs/exceljs][CITED: https://csv.js.org/parse/options/from_line/][ASSUMED] |
| `chardet` + `iconv-lite` | UTF-8/BOM-only CSV support | Simpler implementation, but it is brittle for Vietnamese CSV exports that arrive in legacy encodings. [CITED: https://www.npmjs.com/package/chardet][CITED: https://github.com/pillarjs/iconv-lite][ASSUMED] |
| Keeping `exceljs` for export only | Migrating all import and export work to `xlsx` | Possible, but it widens regression risk into Phase 4 output behavior for no Phase 5 requirement gain. [VERIFIED: tests tree][ASSUMED] |

**Installation:**
```bash
npm install xlsx chardet iconv-lite
```

**Version verification:** `xlsx@0.18.5`, `exceljs@4.4.0`, `zod@4.3.6`, `chardet@2.1.1`, and `iconv-lite@0.7.2` were verified against the npm registry during this research session. [VERIFIED: npm registry]

## Architecture Patterns

### Recommended Project Structure
```text
src/features/roster/
├── domain/
│   ├── intake-audit.ts
│   ├── intake-review.ts
│   └── intake-stage.ts
├── server/
│   ├── detect-upload-format.ts
│   ├── parse-source-file.ts
│   ├── detect-candidate-sheet.ts
│   ├── detect-header-row.ts
│   ├── build-intake-result.ts
│   ├── persist-intake-run.ts
│   └── ai/
│       ├── intake-ai-client.ts
│       └── openai-compatible-provider.ts
└── ui/
    ├── intake-review-workspace.tsx
    ├── intake-audit-table.tsx
    └── upload-panel.tsx
```

Keep the new code inside `src/features/roster` instead of introducing a brand-new top-level feature, because the current import contracts, domain types, and UI entry point already live there. [VERIFIED: codebase file layout][ASSUMED]

### Pattern 1: Staged Intake Contract
**What:** Replace the binary “success or blocking failure” import shape with a staged result that separates route success from allocation readiness. [VERIFIED: src/features/roster/ui/import-state.ts][VERIFIED: src/features/allocation/ui/allocation-workspace.tsx][ASSUMED]

**When to use:** On every import response, including clean fast-path imports. [ASSUMED]

**Example:**
```typescript
// Adapted to fit the current codebase contracts.
// Source basis: current ImportResultPayload + AllocationWorkspace gating.
type IntakeStage = "blocked" | "review_required" | "ready";

interface IntakeAuditEntry {
  id: string;
  scope: "header" | "field";
  rowIndex?: number;
  fieldKey: string;
  rawValue: string | null;
  proposedValue: string | null;
  decisionSource: "rule" | "ai";
  confidence: "high" | "medium" | "low";
  reasoning: string;
  autoApplied: boolean;
  sensitive: boolean;
}

interface IntakeResultPayload {
  ok: boolean;
  stage: IntakeStage;
  allocationReady: boolean;
  sourceFileName: string | null;
  summary: ImportSummaryData;
  students: CanonicalStudentRecord[];
  issues: ImportIssue[];
  audit: IntakeAuditEntry[];
}
```
Source basis: current `ImportResultPayload` / `AllocationWorkspace` contract. [VERIFIED: src/features/roster/ui/import-state.ts][VERIFIED: src/features/allocation/ui/allocation-workspace.tsx][ASSUMED]

### Pattern 2: Unified Row-Candidate Pipeline
**What:** Each file-format reader should emit a common `SheetCandidate -> RowCandidate[]` shape, and all header detection, confidence scoring, canonicalization, and audit generation should happen after that shared boundary. [VERIFIED: src/features/roster/server/read-workbook.ts][CITED: https://docs.sheetjs.com/docs/getting-started/examples/import][ASSUMED]

**When to use:** For `.xlsx`, `.xls`, and `.csv` imports alike. [CITED: https://docs.sheetjs.com/docs/miscellany/formats/]

**Example:**
```typescript
import * as XLSX from "xlsx";

export function extractCandidateSheets(bytes: ArrayBuffer) {
  const workbook = XLSX.read(bytes, {
    type: "array",
    dense: true,
  });

  return workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: true,
    }) as unknown[][];

    return { sheetName, rows };
  });
}
```
Source: SheetJS `read` + `sheet_to_json(..., { header: 1 })`. [CITED: https://docs.sheetjs.com/docs/solutions/input/][CITED: https://docs.sheetjs.com/docs/api/utilities/array/]

### Pattern 3: Rule-First, AI-Optional Repair Layer
**What:** Deterministic logic should classify the easy cases before AI runs; AI should only propose repairs for unresolved headers, ambiguous field mappings, or non-sensitive semantic guesses. [VERIFIED: context file][ASSUMED]

**When to use:** After file-format parsing, header aliasing, required-field checks, safe normalization, and duplicate detection have already executed. [VERIFIED: src/features/roster/server/import-roster.ts][VERIFIED: src/features/roster/server/row-validation.ts][ASSUMED]

**Example:**
```typescript
interface IntakeAiClient {
  suggestHeaderMappings(input: HeaderRepairPrompt): Promise<HeaderSuggestion[]>;
  suggestFieldRepairs(input: FieldRepairPrompt): Promise<FieldSuggestion[]>;
}

async function resolveRepairs(context: IntakeRepairContext) {
  const ruleResult = runDeterministicRepairPass(context);

  if (!ruleResult.needsAi) {
    return ruleResult;
  }

  try {
    const aiSuggestions = await aiClient.suggestFieldRepairs(ruleResult.prompt);
    return mergeAiSuggestions(ruleResult, aiSuggestions);
  } catch {
    return downgradeToReview(ruleResult);
  }
}
```
Source basis: provider-agnostic + fallback decisions from CONTEXT and PRD. [VERIFIED: context file][VERIFIED: .planning/phases/05-smart-intake-core/05-PRD.md][ASSUMED]

### Pattern 4: Structured Intake Audit, Not Issue Strings
**What:** Keep audit as first-class structured data separate from display issues, because review, allocation history, and future replay tooling need raw/proposed/source/confidence metadata, not only human-readable messages. [VERIFIED: context file][VERIFIED: src/features/roster/domain/import-issue.ts][ASSUMED]

**When to use:** For header matches, auto-applied safe repairs, review-required suggestions, AI failures, and user confirmations/rejections. [VERIFIED: context file][ASSUMED]

### Recommended Sequencing

1. Extend the intake contract and types first, because the current `ok`-only gate blocks clean integration of review-required states. [VERIFIED: src/features/roster/ui/import-state.ts][VERIFIED: src/features/allocation/ui/allocation-workspace.tsx][ASSUMED]
2. Replace the format reader next, but keep it behind the existing import route so the rest of the app still sees one entry point. [VERIFIED: src/app/api/rosters/import/route.ts][ASSUMED]
3. Add structured audit generation and sensitive-field safety rules before building the review UI, so the UI can render real change records instead of placeholder strings. [VERIFIED: context file][ASSUMED]
4. Integrate the review workspace into `AllocationWorkspace` after the staged contract exists, because the current tests and UI rely on the import payload shape. [VERIFIED: tests/ui/allocation-workspace.test.tsx][VERIFIED: tests/ui/upload-panel.test.tsx][ASSUMED]
5. Add the AI adapter last, because Phase 5 must already succeed under the fallback path when the provider is missing or unavailable. [VERIFIED: context file]

### Anti-Patterns to Avoid

- **Overloading `importResult.ok`:** The current code uses it as the allocation gate, so turning “recoverable but needs review” into `ok: true` without more state will blur UX and API semantics. [VERIFIED: src/features/allocation/ui/allocation-workspace.tsx][ASSUMED]
- **Format-specific normalization logic:** If `.xlsx`, `.xls`, and `.csv` each produce their own repair rules, the same roster will normalize differently depending on format. [ASSUMED]
- **AI-first orchestration:** Running AI before deterministic recovery wastes tokens, increases latency, and weakens the required fallback path. [VERIFIED: context file][ASSUMED]
- **Text-only audit logs:** `ImportIssue` is too small for the Phase 5 audit contract, so using it as the only trace model will lose raw/proposed/source metadata. [VERIFIED: src/features/roster/domain/import-issue.ts][VERIFIED: context file]
- **Client-visible secrets:** Provider base URL, key, and model selection must stay in server config; do not expose them through client props or `NEXT_PUBLIC_*` variables. [VERIFIED: context file][CITED: https://nextjs.org/docs/14/pages/building-your-application/configuring/environment-variables]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Legacy workbook parsing | A custom `.xls` / BIFF parser | `xlsx` | The official docs explicitly cover `.xlsx`, `.xls`, and CSV/TXT read support under one API. [CITED: https://docs.sheetjs.com/docs/miscellany/formats/] |
| CSV charset handling | UTF-8-only assumptions or ad hoc byte maps | `chardet` + `iconv-lite` | Encoding detection must run on raw bytes, and `iconv-lite` exposes the direct buffer decode API needed afterward. [CITED: https://www.npmjs.com/package/chardet][CITED: https://github.com/pillarjs/iconv-lite] |
| Schema validation | Manual property checks for staged intake payloads and AI envelopes | `zod` | The repo already validates server request boundaries with Zod. [VERIFIED: src/features/allocation/server/allocation-request.ts] |
| CSV record recovery | Splitting lines with regexes | `csv-parse` if the plan needs richer raw-line recovery than the unified SheetJS path provides | `from_line`, `skip_empty_lines`, and `relax_column_count` exist because CSV edge cases are deceptively messy. [CITED: https://csv.js.org/parse/options/from_line/][CITED: https://csv.js.org/parse/options/skip_empty_lines/][CITED: https://csv.js.org/parse/options/relax_column_count/] |

**Key insight:** The dangerous complexity in this phase is not “how do I read a spreadsheet cell,” it is “how do I preserve one canonical normalization path and one auditable decision model across three file formats and two automation layers.” [VERIFIED: context file][VERIFIED: codebase grep][ASSUMED]

## Common Pitfalls

### Pitfall 1: Treating Review-Required Imports as Hard Failures
**What goes wrong:** Recoverable files still end as `422` / `ok: false` with no usable candidate rows, which forces operators back into Excel instead of into a review workspace. [VERIFIED: src/app/api/rosters/import/route.ts][VERIFIED: src/features/roster/server/import-roster.ts]
**Why it happens:** The current import result shape only models “allocation-ready” or “blocking.” [VERIFIED: src/features/roster/ui/import-state.ts]
**How to avoid:** Introduce staged intake states and return canonical candidates plus audit for review-required cases. [ASSUMED]
**Warning signs:** The planner keeps talking about “soft errors” but the contract still only has `ok` and `issues`. [VERIFIED: codebase grep][ASSUMED]

### Pitfall 2: Silently Normalizing Sensitive Fields
**What goes wrong:** `MSHV` or `Lớp` changes appear in canonical output without an explicit review decision. [VERIFIED: src/features/roster/server/row-validation.ts][VERIFIED: context file]
**Why it happens:** The current validator normalizes all text fields uniformly and records them as info issues. [VERIFIED: src/features/roster/server/row-validation.ts]
**How to avoid:** Split repair policy by field sensitivity; allow safe auto-apply only for approved fields and only at high confidence. [VERIFIED: context file][ASSUMED]
**Warning signs:** Review UI shows no audit entry for a changed `MSHV` or `Lớp`, or those fields arrive in canonical students already modified. [ASSUMED]

### Pitfall 3: Divergent Parser Behavior by Format
**What goes wrong:** The same roster parses differently as `.xlsx` and `.csv`, creating inconsistent canonical students or issue counts. [ASSUMED]
**Why it happens:** Parsing, header detection, and normalization are entangled with file-format-specific code. [VERIFIED: src/features/roster/server/read-workbook.ts][ASSUMED]
**How to avoid:** Normalize every reader into one row-candidate pipeline before header mapping and repair classification. [ASSUMED]
**Warning signs:** Fixes added to the CSV reader are not reflected in `.xlsx` or `.xls` behavior, or tests need separate expectation trees by format. [ASSUMED]

### Pitfall 4: AI Prompt Bloat and Prompt Injection Surface
**What goes wrong:** The app sends full workbooks or raw free-form notes to AI, increasing latency, cost, and the chance that spreadsheet content changes model behavior in unsafe ways. [ASSUMED]
**Why it happens:** It feels easier to send “everything” instead of only unresolved headers or cell values. [ASSUMED]
**How to avoid:** Send only the minimum unresolved fields, normalized context, and candidate choices; keep prompts and outputs structured. [VERIFIED: context file][ASSUMED]
**Warning signs:** Prompt payloads contain full row dumps, repeated unchanged fields, or unbounded note text. [ASSUMED]

### Pitfall 5: Storing Audit as Human Messages Only
**What goes wrong:** Operators can read a warning, but the system cannot later answer what changed, why it changed, or whether it was rule-based or AI-generated. [VERIFIED: context file][ASSUMED]
**Why it happens:** The current `ImportIssue` type is intentionally small and presentation-oriented. [VERIFIED: src/features/roster/domain/import-issue.ts]
**How to avoid:** Introduce dedicated audit records and treat UI issues as a derived view of that data. [ASSUMED]
**Warning signs:** The plan says “audit trail” but the schema only adds more `message` strings. [ASSUMED]

## Code Examples

Verified patterns from official sources and the current codebase:

### Multi-Format Sheet Extraction
```typescript
import * as XLSX from "xlsx";

export function readWorkbookCandidates(input: ArrayBuffer) {
  const workbook = XLSX.read(input, {
    type: "array",
    dense: true,
    sheetRows: 100,
  });

  return workbook.SheetNames.map((sheetName) => ({
    sheetName,
    rows: XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      blankrows: true,
    }) as unknown[][],
  }));
}
```
Source: SheetJS `read`, `sheetRows`, and `sheet_to_json(..., { header: 1 })`. [CITED: https://docs.sheetjs.com/docs/api/parse-options/][CITED: https://docs.sheetjs.com/docs/api/utilities/array/]

### CSV Byte Decode Before Parsing
```typescript
import chardet from "chardet";
import iconv from "iconv-lite";

export function decodeCsvBuffer(buffer: Buffer): string {
  const detected = chardet.detect(buffer) ?? "utf-8";
  return iconv.decode(buffer, detected);
}
```
Source basis: `chardet.detect(Buffer)` and `iconv.decode(Buffer, encoding)`. [CITED: https://www.npmjs.com/package/chardet][CITED: https://github.com/pillarjs/iconv-lite]

### ExcelJS CSV Support Is Delimiter-Aware but Not an `.xls` Strategy
```typescript
const workbook = new Excel.Workbook();
const worksheet = await workbook.csv.readFile(filename, {
  parserOptions: {
    delimiter: "\t",
    quote: false,
  },
});
```
Source: ExcelJS CSV read API and parser options. [CITED: https://github.com/exceljs/exceljs]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.xlsx`-only read path using `workbook.xlsx.load(...)` [VERIFIED: src/features/roster/server/read-workbook.ts] | One multi-format intake parser for `.xlsx`, `.xls`, and `.csv` with shared downstream normalization. [CITED: https://docs.sheetjs.com/docs/miscellany/formats/][ASSUMED] | Phase 5 | Meets `INTK-01` without touching the export workflow. [VERIFIED: requirements file][ASSUMED] |
| Hard requirement that the first non-empty row is row 1. [VERIFIED: src/features/roster/server/read-workbook.ts] | Header-row detection over a bounded candidate window. [VERIFIED: context file][ASSUMED] | Phase 5 | Makes title rows and blank spacer rows recoverable instead of blocking. [VERIFIED: context file][ASSUMED] |
| Exact header equality against canonical labels only. [VERIFIED: src/features/roster/lib/map-headers.ts] | Alias-aware header mapping with confidence bands and review fallbacks. [VERIFIED: context file][ASSUMED] | Phase 5 | Supports noisy exports without hiding ambiguous mappings. [VERIFIED: context file][ASSUMED] |
| Normalization issues as info/warning messages only. [VERIFIED: src/features/roster/server/row-validation.ts] | Structured repair audit with raw/proposed/source/confidence/reasoning. [VERIFIED: context file][ASSUMED] | Phase 5 | Makes every machine-generated change explainable and reviewable. [VERIFIED: context file][ASSUMED] |

**Deprecated/outdated:**
- The current `header_row_not_first` hard block is outdated for this phase because title rows and blank rows are explicitly in scope. [VERIFIED: src/features/roster/server/read-workbook.ts][VERIFIED: context file]
- The current `mapRosterHeaders` exact-match behavior is outdated for this phase because alias headers are explicitly in scope. [VERIFIED: src/features/roster/lib/map-headers.ts][VERIFIED: context file]
- The current “normalize every text field the same way” behavior is outdated for this phase because `MSHV` and `Lớp` are now explicitly review-sensitive. [VERIFIED: src/features/roster/server/row-validation.ts][VERIFIED: context file]

## Assumptions Log

> These items are recommendations or inferences that were not fully verified from an official source in this session.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A separate `IntakeRun` persistence model is the least risky way to store staged review/audit data without distorting `AllocationRun`. | Architecture Patterns | Planner may over-design schema work if extending `AllocationRun` would have been enough. |
| A2 | `xlsx` + `chardet` + `iconv-lite` is sufficient for Phase 5 CSV scope without also adopting `csv-parse` as the primary reader. | Standard Stack | CSV edge cases may require a second parser path later. |
| A3 | The intake review workspace can live inside the existing homepage / `AllocationWorkspace` rather than requiring a new route. | Architecture Patterns | UI work may be harder if layout density or history/reopen flows demand route separation. |
| A4 | The import payload can keep `ok` if it is supplemented by `stage` / `allocationReady`. | Architecture Patterns | If this proves too confusing, the contract may need a cleaner breaking change. |
| A5 | Scanning a bounded set of candidate sheets/rows is enough for real user files in this milestone. | Open Questions | Multi-sheet or highly irregular workbooks may still fail too early. |
| A6 | Structured provider prompts should store only normalized structured outputs, not raw model transcripts, in Phase 5. | Open Questions | Debugging future provider issues may be harder without fuller telemetry. |

## Open Questions

1. **How many worksheets should intake scan before giving up?**
   - What we know: the current reader only uses `workbook.worksheets[0]`, while SheetJS can parse all sheets or a bounded subset. [VERIFIED: src/features/roster/server/read-workbook.ts][CITED: https://docs.sheetjs.com/docs/api/parse-options/]
   - What's unclear: whether real operator files commonly place the roster on sheet 2+ or mostly just add title rows inside the first sheet. [ASSUMED]
   - Recommendation: decide this before breaking down plans; a bounded strategy such as “first three non-empty sheets, highest header confidence wins” keeps scope controlled. [ASSUMED]

2. **Does Phase 5 need reopenable intake sessions before allocation is run?**
   - What we know: the current DB only stores `AllocationRun`, and it stores final input/result snapshots after allocation. [VERIFIED: prisma/schema.prisma][VERIFIED: src/features/allocation/server/save-allocation-run.ts]
   - What's unclear: whether operators must be able to leave an intake review and return later before creating an allocation run. [ASSUMED]
   - Recommendation: answer this before schema work; it determines whether Phase 5 needs a real `IntakeRun` table or only transient session state plus copied audit into `AllocationRun`. [ASSUMED]

3. **What exact provider contract should the AI adapter target first?**
   - What we know: the user locked provider-agnostic architecture, server-only secrets, hidden model routing, and graceful fallback. [VERIFIED: context file]
   - What's unclear: whether the first adapter should target an OpenAI-compatible HTTP surface or a provider-specific SDK. [ASSUMED]
   - Recommendation: plan the domain interface first and defer the concrete adapter choice to the implementation wave that adds AI, so the deterministic path is never blocked. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js build/runtime and parser libraries | ✓ [VERIFIED: local environment probe] | `v22.19.0` [VERIFIED: local environment probe] | — |
| npm | Installing parser/encoding packages and running tests | ✓ [VERIFIED: local environment probe] | `10.9.3` [VERIFIED: local environment probe] | — |
| `DATABASE_URL` env var | Prisma persistence | ✓ env name present [VERIFIED: `.env` variable-name scan] | value not inspected [VERIFIED: `.env` variable-name scan] | Could still point to a remote database. [ASSUMED] |
| Local PostgreSQL listener on default socket | Local DB smoke tests | ✗ no response on `/var/run/postgresql:5432` [VERIFIED: local environment probe] | — | Use the configured remote `DATABASE_URL` target or start a local server. [ASSUMED] |
| AI provider env vars | AI-assisted mapping/repair | ✗ none found in repo `.env` names [VERIFIED: `.env` variable-name scan] | — | Rule-based parsing + review remains the required fallback. [VERIFIED: context file] |

**Missing dependencies with no fallback:**
- None identified for planning, because the phase explicitly requires a non-AI fallback path. [VERIFIED: context file]

**Missing dependencies with fallback:**
- AI provider credentials are not currently present in the repo `.env`, but the phase can still ship rule-based intake plus review first. [VERIFIED: `.env` variable-name scan][VERIFIED: context file]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no [VERIFIED: .planning/PROJECT.md][VERIFIED: CLAUDE.md] | Public/no-auth v1; Phase 5 should not assume user identity. [VERIFIED: .planning/PROJECT.md] |
| V3 Session Management | no [VERIFIED: .planning/PROJECT.md] | No authenticated session model exists in the current milestone. [VERIFIED: .planning/PROJECT.md] |
| V4 Access Control | no [VERIFIED: .planning/PROJECT.md] | The relevant access boundary in this phase is server-only config, not user authorization. [VERIFIED: context file][ASSUMED] |
| V5 Input Validation | yes [VERIFIED: requirements file] | File-size/type guard, row/schema validation, bounded header detection, and review confirmation on medium/low-confidence changes. [VERIFIED: src/features/roster/server/file-guard.ts][VERIFIED: src/features/allocation/server/allocation-request.ts][ASSUMED] |
| V6 Cryptography | yes [VERIFIED: context file][CITED: https://nextjs.org/docs/14/pages/building-your-application/configuring/environment-variables] | Keep secrets in server env only and rely on provider HTTPS / platform secret storage; never hand-roll crypto or expose provider config to the client. [VERIFIED: context file][CITED: https://nextjs.org/docs/14/pages/building-your-application/configuring/environment-variables][ASSUMED] |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Oversized or malformed upload causing parser churn | Denial of Service | Preserve file-size limits, add bounded row/sheet scans, and fail early on unsupported types before deep parsing. [VERIFIED: src/features/roster/server/file-guard.ts][CITED: https://docs.sheetjs.com/docs/api/parse-options/][ASSUMED] |
| Silent tampering of `MSHV` / `Lớp` | Tampering | Treat those fields as review-only suggestions and record every proposal in structured audit. [VERIFIED: context file][ASSUMED] |
| Spreadsheet content influencing AI decisions unexpectedly | Tampering / Information Disclosure | Send only unresolved normalized fields to AI, not full workbook contents or secrets. [VERIFIED: context file][ASSUMED] |
| Provider secret exposure in client code | Information Disclosure | Keep non-`NEXT_PUBLIC_` env vars server-only and route provider calls through server code. [CITED: https://nextjs.org/docs/14/pages/building-your-application/configuring/environment-variables][VERIFIED: context file] |
| Inconsistent canonicalization across file formats | Tampering | Use one post-parse normalization pipeline for `.xlsx`, `.xls`, and `.csv`. [ASSUMED] |

## Sources

### Primary (HIGH confidence)
- Codebase: `src/app/api/rosters/import/route.ts`, `src/features/roster/server/import-roster.ts`, `src/features/roster/server/read-workbook.ts`, `src/features/roster/server/row-validation.ts`, `src/features/roster/lib/map-headers.ts`, `src/features/roster/ui/import-state.ts`, `src/features/roster/ui/upload-panel.tsx`, `src/features/allocation/ui/allocation-workspace.tsx`, `prisma/schema.prisma` — current intake/allocation contracts, persistence shape, and gating behavior. [VERIFIED: codebase grep]
- `https://docs.sheetjs.com/docs/miscellany/formats/` — verified `.xlsx`, `.xls`, and `.csv` read support. [CITED: https://docs.sheetjs.com/docs/miscellany/formats/]
- `https://docs.sheetjs.com/docs/api/parse-options/` — verified `sheetRows`, `sheets`, `codepage`, and delimiter-override behavior. [CITED: https://docs.sheetjs.com/docs/api/parse-options/]
- `https://docs.sheetjs.com/docs/api/utilities/array/` — verified `sheet_to_json(..., { header: 1 })` array-of-arrays extraction. [CITED: https://docs.sheetjs.com/docs/api/utilities/array/]
- `https://docs.sheetjs.com/docs/getting-started/examples/import` — verified array-of-arrays extraction for noisy worksheet layouts. [CITED: https://docs.sheetjs.com/docs/getting-started/examples/import]
- `https://github.com/exceljs/exceljs` — verified current ExcelJS `.xlsx` and CSV read/write APIs. [CITED: https://github.com/exceljs/exceljs]
- `https://nextjs.org/docs/14/pages/building-your-application/configuring/environment-variables` — verified server-only env behavior and `NEXT_PUBLIC_` exposure rule. [CITED: https://nextjs.org/docs/14/pages/building-your-application/configuring/environment-variables]
- npm registry (`npm view`) for `xlsx`, `exceljs`, `zod`, `chardet`, `iconv-lite`, `csv-parse` — verified versions and publish metadata. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- `https://csv.js.org/parse/options/from_line/` — verified skipping leading lines for CSV parsing. [CITED: https://csv.js.org/parse/options/from_line/]
- `https://csv.js.org/parse/options/skip_empty_lines/` — verified empty-line skipping behavior. [CITED: https://csv.js.org/parse/options/skip_empty_lines/]
- `https://csv.js.org/parse/options/relax_column_count/` — verified inconsistent-column handling options. [CITED: https://csv.js.org/parse/options/relax_column_count/]
- `https://github.com/pillarjs/iconv-lite` — verified `decode(Buffer, encoding)` and supported-encoding behavior. [CITED: https://github.com/pillarjs/iconv-lite]
- `https://www.npmjs.com/package/chardet` / `https://github.com/runk/node-chardet` — verified raw-byte encoding detection behavior. [CITED: https://www.npmjs.com/package/chardet][CITED: https://github.com/runk/node-chardet]

### Tertiary (LOW confidence)
- None. [VERIFIED: research session]

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM-HIGH - the parser and encoding capabilities are documented, but `xlsx` has an older published version and real operator sample files will still matter for CSV edge cases. [VERIFIED: npm registry][CITED: https://docs.sheetjs.com/docs/miscellany/formats/]
- Architecture: MEDIUM - the current code constraints are clear, but the persistence split between transient state and a dedicated `IntakeRun` model remains a product/operational choice. [VERIFIED: codebase grep][ASSUMED]
- Pitfalls: HIGH - the biggest pitfalls are directly visible in the mismatch between current code and the locked Phase 5 decisions. [VERIFIED: codebase grep][VERIFIED: context file]

**Research date:** 2026-04-08
**Valid until:** 2026-05-08
