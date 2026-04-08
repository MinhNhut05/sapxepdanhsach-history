---
phase: 01-data-foundation
plan: 01
subsystem: infra
tags:
  - nextjs
  - app-router
  - tailwindcss
  - vitest
requires: []
provides:
  - "Next.js 16 App Router repository baseline for the exam-room workflow"
  - "Vietnamese-first upload shell page and shared UI surface styles"
  - "Vitest smoke coverage for the initial homepage"
affects:
  - 01-02
  - 01-03
  - 01-04
tech-stack:
  added:
    - "Next.js 16.2.2"
    - "React 19"
    - "Tailwind CSS 4.2.2"
    - "Vitest"
    - "ExcelJS"
    - "Zod"
  patterns:
    - "App Router shell with server-rendered homepage composition"
    - "Global internal-tool CSS primitives for cards, labels, and status badges"
    - "Testing Library + Vitest smoke tests for page-level regressions"
key-files:
  created:
    - .gitignore
    - package.json
    - package-lock.json
    - tsconfig.json
    - next-env.d.ts
    - next.config.ts
    - eslint.config.mjs
    - postcss.config.mjs
    - vitest.config.ts
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/globals.css
    - src/test/setup.ts
    - tests/smoke/homepage.test.tsx
  modified:
    - package.json
    - tsconfig.json
    - next-env.d.ts
key-decisions:
  - "Use a local Vietnamese-safe font stack instead of next/font/google so builds do not depend on outbound network access."
  - "Run the production build through webpack in this environment because Turbopack hit a sandbox port-binding failure."
patterns-established:
  - "Use the homepage as the single operator workspace that later upload, preview, and issue components compose into."
  - "Keep foundational UI styling in src/app/globals.css with reusable named classes instead of one-off page-only selectors."
requirements-completed:
  - IMPT-01
duration: 20min
completed: 2026-04-08
---

# Phase 1: Data Foundation Summary

**Next.js App Router shell with a Vietnamese-first upload workspace, shared internal-tool styles, and smoke-tested homepage scaffolding**

## Performance

- **Duration:** 20 min
- **Started:** 2026-04-08T04:20:11Z
- **Completed:** 2026-04-08T04:40:18Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments
- Bootstrapped the repository with the agreed Next.js, TypeScript, Tailwind, ESLint, and Vitest toolchain.
- Shipped a real upload-oriented homepage shell with reusable card, label, and status badge styles for later Phase 1 work.
- Added executable smoke coverage that proves the shell renders the expected Vietnamese upload guidance.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the project toolchain and dependency manifest** - `844b295` (chore)
2. **Task 2: Build the base Vietnamese-first app shell** - `457bb73` (feat)
3. **Task 3: Add shared test bootstrap and homepage smoke coverage** - `9090677` (test)

**Plan metadata:** recorded in this summary artifact commit

## Files Created/Modified
- `.gitignore` - ignores build output, dependencies, environment files, coverage, and TypeScript build info.
- `package.json` - defines the app scripts and the initial runtime/dev dependency manifest.
- `vitest.config.ts` - configures jsdom tests with shared setup loading.
- `src/app/layout.tsx` - provides the root App Router layout with Vietnamese metadata and shell wrapper.
- `src/app/page.tsx` - renders the initial operator-facing upload workspace.
- `src/app/globals.css` - defines the warm neutral visual system and reusable internal-tool primitives.
- `src/test/setup.ts` - installs jest-dom assertions and cleanup hooks for Vitest.
- `tests/smoke/homepage.test.tsx` - verifies the homepage heading and `.xlsx` guidance render successfully.

## Decisions Made
- Chose a local office-style font stack (`Aptos`, `Segoe UI`, `Tahoma`) so the shell remains readable and Vietnamese-safe without remote font fetching.
- Kept the first page server-rendered and placeholder-free so later upload and preview components can slot into an already usable workspace.
- Configured the build script to use webpack for deterministic local verification inside the sandbox.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Ignore generated TypeScript build metadata**
- **Found during:** Task 1 (Create the project toolchain and dependency manifest)
- **Issue:** `tsconfig.tsbuildinfo` was generated during verification and would have remained as untracked noise in the repo.
- **Fix:** Added `*.tsbuildinfo` to `.gitignore`.
- **Files modified:** `.gitignore`
- **Verification:** `git status --short` no longer surfaced the generated build info file.
- **Committed in:** `844b295`

**2. [Rule 3 - Blocking] Remove remote Google Font dependency from the shell**
- **Found during:** Task 2 (Build the base Vietnamese-first app shell)
- **Issue:** `next/font/google` failed at build time because the workspace could not fetch Google Fonts.
- **Fix:** Replaced the remote font import with a local Vietnamese-safe font stack in global CSS.
- **Files modified:** `src/app/layout.tsx`, `src/app/globals.css`
- **Verification:** `npm run build`
- **Committed in:** `457bb73`

**3. [Rule 3 - Blocking] Force the build script onto webpack**
- **Found during:** Task 2 (Build the base Vietnamese-first app shell)
- **Issue:** Next 16's default Turbopack build path crashed in the sandbox while trying to bind a port during CSS processing.
- **Fix:** Updated the `build` script to `next build --webpack`.
- **Files modified:** `package.json`
- **Verification:** `npm run build`
- **Committed in:** `457bb73`

---

**Total deviations:** 3 auto-fixed (1 missing critical, 2 blocking)
**Impact on plan:** All deviations were execution-environment fixes required to keep the intended shell, scripts, and verification flow intact. No product scope changed.

## Issues Encountered
- Build verification exposed two environment-specific blockers: remote font fetching and Turbopack's sandbox incompatibility. Both were corrected within Task 2 and the plan still closed with passing lint, typecheck, test, and build checks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The repository is ready for roster domain contracts, normalization helpers, and unit tests in `01-02`.
- The homepage shell already exposes clear integration slots for the import API response, preview table, and issue summaries planned later in Phase 1.

## Self-Check: PASSED

---
*Phase: 01-data-foundation*
*Completed: 2026-04-08*
