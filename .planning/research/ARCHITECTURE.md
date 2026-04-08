# Architecture Research

**Domain:** Exam room allocation web application for Vietnamese education operations
**Researched:** 2026-04-08
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                                Presentation                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│  Upload Screen   Allocation Config   Preview Dashboard   Room Editor        │
│  (xlsx input)    (strategy/rules)    (table + charts)    (drag & drop)      │
└───────────────┬───────────────┬───────────────┬──────────────────────────────┘
                │               │               │
                ▼               ▼               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                             Next.js App Router                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  Server Components        Server Actions          Route Handlers            │
│  - initial page data      - save edits            - file upload/download    │
│  - history list           - run allocation        - print/export endpoints  │
│  - result detail          - rename/session ops    - optional JSON APIs      │
└───────────────┬──────────────────────────┬───────────────────────────────────┘
                │                          │
                ▼                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                               Domain Layer                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│  Excel Import Service   Allocation Engine   Validation Service              │
│  Vietnamese Sorter      Seat/Room Rules     Export Builder                  │
│  Session Orchestrator   Audit/History Log   Metrics Aggregator              │
└───────────────┬──────────────────────────┬───────────────────────────────────┘
                │                          │
                ▼                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                               Persistence                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│  Prisma Repositories     PostgreSQL        File Buffers / Generated XLSX    │
│  - students snapshot     - allocation run  - import parsing in memory       │
│  - rooms snapshot        - room assignment - export file stream/buffer      │
│  - manual edits          - audit trail                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Recommended high-level shape

Use a **modular monolith** inside Next.js fullstack, not microservices.

Why:
- The workflow is linear and tightly coupled: upload -> validate -> allocate -> preview -> adjust -> export.
- v1 has no auth, no multi-tenant, and no real-time collaboration, so service splitting adds cost without real payoff.
- Allocation logic is the real complexity. That logic should live in a clear domain layer, not inside route handlers or React components.

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Upload UI | Accept `.xlsx`, show template expectations, surface validation errors | Client Component with file picker + progress/error state |
| Import endpoint | Receive file, parse workbook, normalize rows, return previewable dataset | Route Handler (`app/api/import/route.ts`) using ExcelJS |
| Allocation configurator | Collect room count, strategy, balancing rules, naming/SBD options | Client Component with form controls |
| Allocation application service | Orchestrate validation, sort, allocation, SBD generation, persistence | Server Action or domain service invoked by action |
| Allocation engine | Pure business logic for distributing students into rooms | `src/modules/allocation/domain/*` pure TypeScript |
| Preview/dashboard | Render room tables, class distribution, imbalance metrics | Server Component for initial data + client charts |
| Manual edit board | Move students between rooms and reorder seats/SBD intent | Client Component with drag-and-drop state |
| Edit command service | Validate a move, recompute affected room stats/SBDs, persist audit | Server Action |
| Export service | Generate final workbook: master sheet + per-room sheets | Route Handler returning file response |
| Print service | Render print-friendly HTML per room/run | App route/page using server-side data |
| History module | Save and load prior allocation runs and result snapshots | Prisma repositories + Server Components |
| Repository layer | Isolate DB queries from domain rules | `src/modules/*/repositories/*.ts` using Prisma |

## Recommended Project Structure

```text
src/
├── app/
│   ├── (dashboard)/                      # Main operator workflow pages
│   │   ├── page.tsx                      # Create new allocation run
│   │   ├── runs/[runId]/page.tsx         # Preview/edit a saved run
│   │   └── runs/[runId]/print/page.tsx   # Print-friendly view
│   ├── api/
│   │   ├── import/route.ts               # Upload + parse xlsx
│   │   ├── export/[runId]/route.ts       # Download generated xlsx
│   │   └── health/route.ts               # Basic runtime check
│   └── actions/
│       ├── allocation.ts                 # Run allocation / save draft
│       └── room-edits.ts                 # Drag-drop/manual edit mutations
├── modules/
│   ├── allocation/
│   │   ├── domain/
│   │   │   ├── entities.ts               # Student, Room, AllocationRun
│   │   │   ├── strategies.ts             # even_mix / class_preserving / representative_ratio
│   │   │   ├── sorter.ts                 # Vietnamese name sort rules
│   │   │   ├── sbd.ts                    # Pxx-yyy generation
│   │   │   └── validators.ts             # Allocation invariants
│   │   ├── application/
│   │   │   ├── run-allocation.ts         # Orchestrate full auto allocation
│   │   │   ├── move-student.ts           # Manual move use case
│   │   │   └── rebuild-room-metrics.ts   # Derived stats recomputation
│   │   ├── infrastructure/
│   │   │   ├── allocation-repository.ts  # Prisma persistence
│   │   │   └── excel-exporter.ts         # Workbook generation
│   │   └── ui/
│   │       ├── allocation-form.tsx
│   │       ├── preview-table.tsx
│   │       ├── room-board.tsx
│   │       └── charts.tsx
│   ├── import/
│   │   ├── application/parse-workbook.ts
│   │   ├── domain/row-schema.ts
│   │   └── infrastructure/excel-reader.ts
│   └── history/
│       ├── application/list-runs.ts
│       └── infrastructure/history-repository.ts
├── lib/
│   ├── prisma.ts                         # Singleton PrismaClient
│   ├── db.ts                             # Transaction helpers
│   ├── excel.ts                          # Shared workbook helpers
│   └── locale.ts                         # Vietnamese collation helpers
├── components/
│   ├── ui/                               # Generic design-system components
│   └── layout/                           # Shell, navbar, print wrappers
├── types/
│   └── api.ts                            # Shared DTOs only, not domain rules
└── tests/
    ├── unit/                             # Allocation engine / sorting / SBD tests
    ├── integration/                      # import -> allocate -> save flows
    └── fixtures/                         # Sample xlsx files
```

### Structure Rationale

- **app/**: Thin delivery layer. It should handle HTTP, rendering, cache revalidation, and calling application services.
- **modules/allocation/**: Core business module. This is the heart of the product and deserves explicit boundaries.
- **modules/import/**: Keep Excel parsing separate from allocation. Import errors and allocation errors are different concerns.
- **modules/history/**: Persistence/reporting concerns should not pollute allocation logic.
- **lib/**: Cross-cutting utilities only. Avoid turning `lib/` into a dumping ground for business logic.
- **tests/**: Allocation correctness is product-critical; keep deterministic fixtures and rule-focused tests.

## Architectural Patterns

### Pattern 1: Thin Route / Thin Action, Fat Domain Service

**What:** Route Handlers and Server Actions only parse input, call a use case, and map output. The real rules stay in domain/application services.
**When to use:** Everywhere a request can mutate allocation state.
**Trade-offs:** Slightly more files, but much easier to test and change than embedding logic in handlers.

**Example:**
```typescript
// app/actions/allocation.ts
'use server'

import { runAllocation } from '@/modules/allocation/application/run-allocation'

export async function runAllocationAction(input: RunAllocationInput) {
  return runAllocation(input)
}
```

### Pattern 2: Pure Allocation Engine + Persisted Snapshots

**What:** Keep allocation computation pure and deterministic. Persist the input snapshot and output snapshot for history, replay, export, and audit.
**When to use:** Auto-allocation, re-allocation after config changes, export regeneration.
**Trade-offs:** More stored data, but much safer than trying to reconstruct old results from partial DB state later.

**Example:**
```typescript
export function allocateStudents(input: AllocationInput): AllocationResult {
  const sorted = sortStudentsVietnamese(input.students)
  const assigned = applyStrategy(sorted, input.rooms, input.strategy)
  return assignCandidateNumbers(assigned)
}
```

### Pattern 3: Optimistic Client Interaction, Authoritative Server Validation

**What:** Drag-and-drop feels instant in the browser, but every move is validated and finalized on the server.
**When to use:** Manual room moves, room reorder, SBD regeneration triggers.
**Trade-offs:** Slightly more orchestration than pure client state, but avoids invalid saved states.

**Example:**
```typescript
const optimisticMove = moveStudentLocally(board, command)
setBoard(optimisticMove)
const saved = await moveStudentAction(command)
setBoard(saved.board)
```

### Pattern 4: Derived Metrics, Not Hand-Edited Stats

**What:** Room counts, class ratios, imbalance percentages, and chart data should be recomputed from assignments, not stored as manually edited columns.
**When to use:** Preview dashboard, validation checks, export summaries.
**Trade-offs:** Small compute cost, but prevents data drift.

### Pattern 5: Import Normalization Boundary

**What:** Convert raw Excel rows into canonical student objects immediately after parsing. After this boundary, the rest of the app should never care about original column spellings or optional note-column variance.
**When to use:** Directly after file upload.
**Trade-offs:** Extra normalization step, but dramatically simpler downstream logic.

## Data Flow

### Request Flow

```text
User uploads .xlsx
    ↓
Upload UI
    ↓ multipart/form-data
/api/import route handler
    ↓
Excel reader + row validator
    ↓
Normalization service
    ↓
Parsed student dataset + validation report
    ↓
Allocation config form
    ↓
runAllocation server action
    ↓
Allocation application service
    ↓
Pure allocation engine → SBD generator → metrics builder
    ↓
Prisma repository saves run snapshot
    ↓
Preview page renders rooms, charts, and edit board
```

### Edit Flow

```text
Drag student from Room A to Room B
    ↓
Client DnD state updates optimistically
    ↓
moveStudent server action
    ↓
Edit validator checks room limits / invariants
    ↓
Affected rooms recomputed (counts, ordering, SBDs if needed)
    ↓
Prisma transaction saves assignment changes + audit log
    ↓
Updated room board returned
    ↓
UI re-renders dashboard and print/export stay consistent
```

### Export Flow

```text
User clicks Export Excel
    ↓
/api/export/[runId] route handler
    ↓
Load persisted run snapshot from PostgreSQL
    ↓
Excel export builder creates workbook
    ↓
Response returns xlsx buffer/stream
```

### Print Flow

```text
User opens print page
    ↓
Server Component loads run data
    ↓
Print-oriented formatter groups by room
    ↓
HTML page rendered with print CSS
    ↓
Browser print dialog / Save as PDF if needed
```

### State Management

Recommended split:
- **Server state:** allocation runs, parsed datasets, edit mutations, exports, history.
- **Client state:** drag state, selection, filters, expanded rooms, temporary edit intents.

For this app, do **not** introduce Redux early. Use:
- React state/context for local UI state
- Server Components for initial data loading
- Server Actions for mutations
- Optional TanStack Query only if live refetching becomes awkward

### Key Data Flows

1. **Import -> Normalize -> Preview:** raw workbook becomes canonical student records plus row-level validation warnings.
2. **Preview -> Allocate -> Persist:** configuration and parsed students become a saved allocation run with reproducible outputs.
3. **Edit -> Recompute -> Save:** manual changes update assignments first, then regenerate derived metrics and possibly SBDs.
4. **Persisted Run -> Export/Print:** export and print should read from saved state, not from transient browser state.

## Component Boundaries

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI ↔ Server Actions | typed function calls | Best for mutations initiated from the Next.js app itself |
| UI ↔ Import/Export endpoints | HTTP multipart/file response | Use Route Handlers for file upload/download |
| App layer ↔ Allocation domain | direct function calls | Keep DTO mapping at the edge |
| Allocation domain ↔ Persistence | repository interface | Domain should not know Prisma specifics |
| Allocation domain ↔ Excel module | one-way dependency via normalized DTOs | Allocation must not depend on worksheet objects |
| History module ↔ Allocation module | read models / snapshots | History reads results; it should not own allocation rules |

### What talks to what

- **Upload UI** talks to **Import route handler**.
- **Import route handler** talks to **Excel reader** and **row validator**.
- **Allocation config UI** talks to **runAllocation Server Action**.
- **runAllocation action** talks to **allocation application service**.
- **Allocation application service** talks to **sorter**, **strategy engine**, **SBD generator**, **metrics builder**, then **repository**.
- **Preview dashboard** reads from **saved run data**.
- **Drag-and-drop editor** talks to **edit Server Actions**.
- **Export route** talks to **repository** then **Excel export builder**.
- **Print page** talks to **repository/read model**, not to the live drag state.

## Suggested Build Order

This order matters because later components depend on earlier normalization and domain guarantees.

1. **Canonical data model + Prisma schema**
   - Define student snapshot, allocation run, room assignment, audit/history tables.
   - Without this, every later layer will invent inconsistent shapes.

2. **Excel import + normalization boundary**
   - Parse `.xlsx`, validate required columns, support optional `GHI CHÚ`, normalize names/dates.
   - This unlocks realistic fixtures for all later work.

3. **Vietnamese sorting + SBD generation utilities**
   - These are foundational domain rules used by allocation, preview, export, and print.

4. **Pure allocation engine**
   - Implement the 3 strategies: even mix, class-preserving, representative ratio.
   - Keep it framework-independent and heavily unit tested.

5. **Allocation orchestration + persistence**
   - Wrap engine with save/load behavior so results are reproducible and history-aware.

6. **Preview dashboard**
   - Once saved runs exist, build table views, room summaries, and class-balance charts.

7. **Manual edits + drag-and-drop**
   - Only build after persisted allocation state exists; otherwise DnD logic becomes throwaway code.

8. **Export Excel + print views**
   - Build on top of saved snapshots to guarantee output matches what users reviewed.

9. **History browsing / compare runs**
   - Lower dependency risk; can come after the main operational loop works.

### Dependency chain

```text
Prisma schema
  → Import normalization
    → Vietnamese sort + SBD helpers
      → Allocation engine
        → Save/load run service
          → Preview/dashboard
            → Manual edit + drag & drop
              → Export/print
                → History UX
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k allocation runs | Single Next.js app + PostgreSQL is more than enough. Keep workbook parsing and export in-process. |
| 1k-100k runs | Add pagination for history, index run/room tables, store compressed snapshots, optimize heavy export queries. |
| 100k+ runs | Consider background jobs for large imports/exports and separating read models for analytics/history. Still likely no need for microservices first. |

### Scaling Priorities

1. **First bottleneck: XLSX parsing/export memory use**
   - Large workbooks can stress serverless memory/time limits. Mitigate with file-size limits, efficient buffering, and possibly background processing if dataset sizes grow.
2. **Second bottleneck: expensive derived recomputation after edits**
   - Recompute only affected rooms/metrics, not the whole run, when a single student move happens.

## Anti-Patterns

### Anti-Pattern 1: Put allocation rules inside React components

**What people do:** Handle sort, room balancing, and SBD generation inside page/component files because the app is “small”.
**Why it's wrong:** Logic becomes untestable, duplicated across preview/export, and fragile when rules change.
**Do this instead:** Keep allocation rules in pure domain functions and call them from actions/services.

### Anti-Pattern 2: Treat Excel rows as the domain model forever

**What people do:** Pass worksheet rows or raw column-name objects through the whole app.
**Why it's wrong:** Every screen then depends on upload shape quirks; optional columns and renamed headers create bugs everywhere.
**Do this instead:** Normalize immediately into canonical `StudentRecord` objects.

### Anti-Pattern 3: Save only final room assignments, not the source snapshot

**What people do:** Persist just `studentId -> roomId` and assume export/history can be rebuilt later.
**Why it's wrong:** For imported one-off datasets, there may be no durable upstream student master. Reproducibility is lost.
**Do this instead:** Save the imported student snapshot and allocation configuration with each run.

### Anti-Pattern 4: Make drag-and-drop the source of truth

**What people do:** Keep the canonical allocation only in browser state until export.
**Why it's wrong:** Refresh loses work, exports can diverge from preview, and history becomes impossible.
**Do this instead:** Persist authoritative state on every meaningful edit or explicit save action.

### Anti-Pattern 5: Over-engineer with queues/microservices on day one

**What people do:** Split import, allocation, export, and dashboard into separate services because “that scales better”.
**Why it's wrong:** Operational complexity will exceed business complexity for this internal app.
**Do this instead:** Start with a modular monolith. Extract jobs/services only when real workload data demands it.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| PostgreSQL (Neon/Supabase) | Prisma ORM | Keep run snapshot and assignment tables indexed by runId |
| Excel library (ExcelJS preferred) | In-process read/write buffers | Needed for `.xlsx` import/export; isolate behind import/export services |
| Vercel runtime | Next.js deployment target | Watch function memory/time limits for large files |

## Build Notes for Next.js Fullstack

- Use **Route Handlers** for upload/download because they map naturally to HTTP file handling.
- Use **Server Actions** for operator-triggered mutations such as run allocation, move student, rename room, regenerate SBD.
- Use **Server Components** for initial run/history loading and print pages.
- Keep Prisma behind a **singleton client** in `src/lib/prisma.ts` to avoid development hot-reload connection churn.

## Roadmap Implications

Recommended implementation phases:

1. **Core data backbone**
   - Prisma schema, import normalization, Vietnamese sort, canonical types.
2. **Auto-allocation MVP**
   - Allocation engine, save run, preview list/table, basic export.
3. **Operator editing workflow**
   - Drag-and-drop, move validation, room metrics recomputation, audit trail.
4. **Operational polish**
   - Charts, print pages, history browsing, performance hardening.

Why this order:
- Import and normalization define truth.
- Allocation depends on clean truth.
- Editing depends on persisted allocation state.
- Export/print/history become reliable only after saved state is stable.

## Sources

- Next.js docs: Route Handlers reference path discovered via docs index — https://nextjs.org/docs/app/getting-started/route-handlers
- Next.js docs: Mutating Data / Server Actions path discovered via docs index — https://nextjs.org/docs/app/getting-started/mutating-data
- Next.js docs: `use server` directive — https://nextjs.org/docs/app/api-reference/directives/use-server
- Prisma docs: Next.js help / singleton PrismaClient guidance — https://www.prisma.io/docs/orm/more/help-and-troubleshooting/nextjs-help
- ExcelJS package/docs entry — https://www.npmjs.com/package/exceljs

---
*Architecture research for: exam room allocation web app*
*Researched: 2026-04-08*
