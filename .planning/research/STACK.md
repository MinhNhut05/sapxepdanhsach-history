# Stack Research

**Domain:** Exam room allocation web app (Vietnamese education operations, Excel-first workflow)
**Researched:** 2026-04-08
**Confidence:** MEDIUM-HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.2 | Full-stack web app, SSR/CSR UI, server actions, route handlers | This is the standard TypeScript full-stack React choice when you want one deployable app on Vercel. For this product, upload/preview/export/admin-style screens do not justify splitting FE/BE yet. Keep the app monorepo-simple and let server routes handle Excel processing and persistence. Confidence: HIGH |
| React | 19.x | UI rendering and interactive exam-room editing | Required by Next.js. React 19 is the current baseline for modern Next apps and is a good fit for drag-and-drop-heavy admin UX. Confidence: MEDIUM |
| TypeScript | 5.x | End-to-end type safety across upload parsing, algorithms, DB models, and exports | This app has many “silent mistake” risks: wrong column names, malformed student rows, bad room assignments, export regressions. TypeScript reduces those mistakes better than plain JavaScript. Confidence: HIGH |
| PostgreSQL | 18.x | Persistent storage for allocation runs, room assignments, audit/history | PostgreSQL is the standard relational choice here because the data is structured, queryable, and needs reliable history. It also gives you ICU collations and strong sorting/query options if some sort logic moves into SQL later. Confidence: HIGH |
| Prisma ORM + Prisma Client | 7.7.0 | Type-safe ORM, schema, migrations, generated DB client | Best fit for a junior-friendly TypeScript/Postgres stack. It is faster to ship than handwritten SQL everywhere, while still letting you drop to SQL for niche sorting/reporting cases. Confidence: HIGH |
| Tailwind CSS | 4.2.2 | Fast styling for internal-tool UI, print layouts, and dense data screens | This app needs lots of pragmatic UI states: tables, room cards, drag handles, print styles, Vietnamese labels. Tailwind is the fastest way to build and maintain that without inventing a design system too early. Confidence: MEDIUM |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ExcelJS | 4.4.0 | Read `.xlsx`, write styled workbooks, generate per-room sheets, control print-oriented workbook output | Use as the primary Excel engine. It is the better fit than SheetJS for this app because export quality matters, not just parsing speed. You need workbook/worksheet styling, multiple sheets, page setup, merged cells, column widths, and print-friendly formatting. Confidence: HIGH |
| zod | 4.3.6 | Validate uploaded row shape and normalize request payloads | Use at every trust boundary: uploaded Excel rows, user-edited room assignments, export requests. This prevents “Excel looked valid but one column was wrong” bugs. Confidence: HIGH |
| @dnd-kit/core | 6.3.1 | Drag-and-drop interactions for moving students between rooms | Use for the manual adjustment screen. It is the current standard React DnD recommendation for sortable/custom interfaces and is more future-safe than deprecated older packages. Confidence: MEDIUM-HIGH |
| @tanstack/react-table | 8.21.3 | High-control data table for preview, filters, sorting indicators, room/student grids | Use when the preview screen becomes more than a simple HTML table. It gives the control needed for internal-tool tables without forcing a heavyweight grid too early. Confidence: MEDIUM-HIGH |
| react-dropzone | 15.0.0 | Robust file drop/upload UX for `.xlsx` files | Use for the upload surface if you want drag-and-drop file selection with accept rules and good browser handling. If the upload UI stays minimal, native file input is also acceptable. Confidence: MEDIUM |
| recharts | 3.8.1 | Simple charts for room balance and class distribution dashboard | Use only for lightweight operational charts. Good enough for counts by room/class; do not overbuild analytics in v1. Confidence: MEDIUM |
| Intl.Collator (built-in) | Browser/Node built-in | Vietnamese-aware sorting for `TÊN`, then `HỌ LÓT`, then `MSHV` | Use `new Intl.Collator('vi', ...)` in application code for deterministic Vietnamese sorting logic. This is the right default because the core sorting rule is domain logic, not just a DB concern. Confidence: MEDIUM-HIGH |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint | Code quality and common bug detection | Keep rules pragmatic. Prioritize import/order, no-unused-vars, and React/TypeScript correctness over style wars. |
| Prettier | Consistent formatting | Necessary for a small team/junior-friendly repo. Remove formatting discussion from code review. |
| Prisma Migrate | Schema migrations | Use for all schema changes. Do not hand-edit production tables without corresponding migration history. |
| Vitest | Unit tests for allocation algorithms and Vietnamese sorting helpers | The algorithm layer is the highest bug-risk part of the product. Test it independently from UI. |
| Playwright | End-to-end tests for upload → allocate → edit → export/print | Use for the critical user journey because this app’s value is end-to-end correctness, not isolated components. |

## Installation

```bash
# Core
npm install next@16.2.2 react react-dom prisma@7.7.0 @prisma/client@7.7.0 zod@4.3.6

# Supporting
npm install exceljs@4.4.0 @dnd-kit/core@6.3.1 @tanstack/react-table@8.21.3 react-dropzone@15.0.0 recharts@3.8.1

# Dev dependencies
npm install -D typescript tailwindcss@4.2.2 eslint prettier vitest playwright
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 16.2.2 | NestJS API + React/Next frontend split | Use the split only if you already know v2 needs separate teams, external API consumers, background workers at scale, or non-web clients. For v1, it adds deployment and coordination overhead without solving a real problem. |
| Prisma 7.7.0 | Drizzle ORM | Use Drizzle if the team strongly prefers SQL-first modeling and lower ORM abstraction. Prisma is better here for speed of delivery and junior-friendly DX. |
| ExcelJS 4.4.0 | SheetJS (`xlsx` 0.18.5) | Use SheetJS mainly if import/parsing breadth matters more than output formatting, or if you need very broad spreadsheet ingestion and can tolerate doing less polished export formatting. |
| @dnd-kit/core 6.3.1 | React Aria / custom pointer interactions | Use alternatives only if you need a stricter accessibility abstraction or a very custom non-list interaction model. For room/student movement UI, dnd-kit is the practical default. |
| Intl.Collator('vi') in app logic | Database-only collation strategy | Use DB collation as a supplement, not the primary rule, if you must sort huge datasets server-side. The app still needs deterministic domain sorting logic in TypeScript for preview/export parity. |
| Neon PostgreSQL | Supabase Postgres | Use Supabase if you later want bundled auth/storage/realtime. Since v1 is explicitly no-auth and single internal tool, Neon is the cleaner managed Postgres default. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-beautiful-dnd` | The package is deprecated. Starting v1 on a deprecated drag-and-drop foundation is a predictable maintenance problem. | `@dnd-kit/core` |
| ASCII or naive `.sort()` string comparison for names | Vietnamese names will sort incorrectly, especially around diacritics and locale rules. That breaks trust in room lists and printed outputs. | `Intl.Collator('vi')` with explicit tie-break rules |
| CSV-first import/export strategy | The project requirement is `.xlsx` only, and CSV loses workbook structure, formatting, multiple sheets, and can mangle Vietnamese text/Excel behavior. | ExcelJS-based `.xlsx` workflow |
| Premature microservices | This is a single workflow-heavy internal application. Splitting upload, allocation, export, and reporting into services now adds failure points and slows delivery. | Next.js full-stack app with clear domain/service boundaries |
| Using PostgreSQL collation as the only sorting layer | DB collation helps, but export/preview/business rules must match exactly in application code. Relying only on DB ordering causes inconsistency across UI, exports, and tests. | Application-level comparator using `Intl.Collator`, optionally backed by ICU in Postgres |
| Heavy enterprise data grids in v1 | AG Grid-class tooling is overkill for the first release unless requirements expand into spreadsheet-like editing across thousands of cells. | `@tanstack/react-table` + focused custom editing UI |

## Stack Patterns by Variant

**If the app stays a single public internal tool on Vercel:**
- Use Next.js + Prisma + Neon
- Because it minimizes infrastructure decisions and keeps deployment simple.

**If exports become the most important output artifact:**
- Keep ExcelJS as the primary workbook engine and move export generation into server-side route handlers/actions
- Because workbook styling, multi-sheet layout, and print setup are easier to control on the server.

**If room allocation logic grows into many configurable policies:**
- Keep the UI stack the same, but isolate algorithm code into a pure `domain/allocations` module with Vitest coverage
- Because the highest long-term complexity is business rules, not rendering.

**If future v2 adds authentication and organization-level data ownership:**
- Consider Supabase instead of Neon
- Because bundled auth and storage may then outweigh the cleaner “just Postgres” setup.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| next@16.2.2 | react@19.x, react-dom@19.x | Next 16 current stable release expects the modern React baseline. |
| prisma@7.7.0 | @prisma/client@7.7.0, PostgreSQL 18.x | Keep Prisma CLI and client versions aligned. |
| @tanstack/react-table@8.21.3 | React 18/19 apps | Good fit for modern React internal tools. |
| recharts@3.8.1 | React 16.8–19 | Registry metadata explicitly lists React 19 compatibility. |
| tailwindcss@4.2.2 | Next.js 16 | Good modern pairing, but verify exact config syntax at implementation time because Tailwind 4 setup differs from older guides. |

## Prescriptive Recommendation

For this project, use this stack unless a later milestone proves a real constraint:

- Next.js 16.2.2
- React 19
- TypeScript 5.x
- PostgreSQL 18 on Neon
- Prisma 7.7.0
- ExcelJS 4.4.0
- `Intl.Collator('vi')` for Vietnamese sorting
- `@dnd-kit/core` 6.3.1 for room reassignment UI
- `@tanstack/react-table` 8.21.3 for preview tables
- Tailwind CSS 4.2.2 for UI and print styling

This is the standard 2025–2026 stack because it optimizes for the actual product risks: correct Excel I/O, reliable Vietnamese sorting, easy internal-tool UX, and simple deployment. Do not optimize for hypothetical scale before the allocation logic and export quality are proven.

## Confidence Notes

| Recommendation Area | Confidence | Reason |
|---------------------|------------|--------|
| Next.js + React + TypeScript | HIGH | Current versions verified from official package registry and aligns with project constraint to deploy on Vercel. |
| PostgreSQL + Prisma | HIGH | Official PostgreSQL and Prisma docs support this strongly for typed relational apps. |
| ExcelJS over SheetJS for this app | HIGH | ExcelJS capabilities better match styled export, worksheet control, and print-oriented output requirements. |
| `Intl.Collator('vi')` for sorting | MEDIUM-HIGH | Official MDN confirms locale-aware sorting; Vietnamese locale behavior is the right built-in tool, but exact edge-case expectations should be validated with sample data. |
| dnd-kit for drag/drop | MEDIUM-HIGH | Current package version verified and deprecated competitor ruled out, but “best” remains ecosystem-sensitive rather than official-doc absolute truth. |
| Neon over Supabase | MEDIUM | Both are viable. Recommendation is opinionated based on your stated v1 scope: no auth, simple managed Postgres, Vercel-friendly deployment. |

## Sources

- `/home/minhnhut_dev/projects/sapxepdanhsach/.planning/PROJECT.md` — project requirements and constraints
- `https://registry.npmjs.org/next/latest` — verified Next.js version 16.2.2
- `https://registry.npmjs.org/react-dom/latest` — verified current React DOM version 19.2.4
- `https://registry.npmjs.org/prisma/latest` — verified Prisma version 7.7.0
- `https://registry.npmjs.org/@prisma/client/latest` — verified Prisma Client version 7.7.0
- `https://registry.npmjs.org/exceljs` — verified ExcelJS version 4.4.0
- `https://github.com/exceljs/exceljs` — verified ExcelJS capabilities for XLSX read/write/style support
- `https://registry.npmjs.org/xlsx/latest` — verified SheetJS version 0.18.5 for comparison
- `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator` — verified locale-aware string comparison approach
- `https://www.postgresql.org/docs/current/collation.html` — verified PostgreSQL collation and ICU support
- `https://www.postgresql.org/download/` — verified current PostgreSQL stable branch listing
- `https://www.prisma.io/docs/orm/overview/introduction/what-is-prisma` — verified Prisma positioning and TypeScript/Postgres fit
- `https://registry.npmjs.org/@dnd-kit/core/latest` — verified dnd-kit version 6.3.1
- `https://dndkit.com/` — attempted official docs fetch; version verified from npm registry instead
- `https://registry.npmjs.org/react-beautiful-dnd/latest` — verified deprecated status
- `https://registry.npmjs.org/@tanstack/react-table/latest` — verified TanStack Table version 8.21.3
- `https://registry.npmjs.org/react-dropzone/latest` — verified react-dropzone version 15.0.0
- `https://registry.npmjs.org/recharts/latest` — verified Recharts version 3.8.1 and React compatibility
- `https://registry.npmjs.org/tailwindcss/latest` — verified Tailwind CSS version 4.2.2
- `https://neon.com/docs/introduction` — verified Neon positioning
- `https://supabase.com/docs/guides/database/overview` — verified Supabase Postgres positioning for comparison

---
*Stack research for: exam room allocation web app*
*Researched: 2026-04-08*
