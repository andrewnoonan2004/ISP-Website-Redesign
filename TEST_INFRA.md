# E2E Test Infrastructure & Coverage Plan (`TEST_INFRA.md`)

**Project:** Pitt Intelligent Systems Program (ISP) Website Redesign — Raphael Session Improvements  
**Track:** Opaque-Box E2E Testing Track (`sub_orch_e2e`)  
**Requirements Source:** `.agents/teamwork/ORIGINAL_REQUEST.md`, `PROJECT.md`, `BRAND.md`, `AGENTS.md`

---

## 1. Architecture & Zero-Dependency Runtime Stack

To comply with `AGENTS.md` (no third-party dependencies) and match the target environment, the E2E suite uses **only pre-installed runtimes and standard libraries**:

| Component | Runtime / Tool | Role |
|-----------|----------------|------|
| **CLI Orchestrator & Static Server** | Python 3.11+ stdlib (`http.server`, `socketserver`, `subprocess`, `argparse`, `tempfile`, `urllib`, `pathlib`) | Parses `--tier`, serves `redesign/dist/` (auto-falling back to `redesign/` if `dist/index.html` is absent) on an ephemeral `127.0.0.1:0` port mounted at both `/` and `/ISP-Website-Redesign/`, launches headless Chromium 156 with `--remote-debugging-port=0` and an isolated `--user-data-dir`, runs the selected Node 24 test suites, and guarantees clean teardown on exit/timeout/interrupt. |
| **Browser Engine** | Headless Chromium 156 (`/usr/bin/chromium`, fallback `/usr/bin/google-chrome`) | Executes real DOM, layout, CSS sticky positioning, viewport emulation (`1440×900`, `375×812`, `320×568`), `prefers-reduced-motion`, JavaScript-disabled rendering, keyboard focus/events, computed WCAG contrast, and network fetches. |
| **CDP Driver & Test Runner** | Node.js 24 built-in `WebSocket`, `fetch`, `node:test`, `node:assert/strict`, `node:fs`, `node:crypto` | Drives Chromium directly via Chrome DevTools Protocol (`Target`, `Page`, `Runtime`, `DOM`, `Emulation`, `Input`, `Network`, `Log`), exposes deterministic wait helpers (no arbitrary `sleep()` polling), and prints structured per-test pass/fail diagnostics. |

### Canonical CLI Runner Contract
```bash
python3 tests/e2e/run_e2e.py --tier 1|2|3|4|all   # default: --tier all
```
Optional flags:
- `--tier {1,2,3,4,all,self}`: Select a single tier, all 4 tiers (`all`, default), or harness self-check (`self`).
- `--root <path>`: Override static site directory (default: `redesign/dist` if `redesign/dist/index.html` exists, else `redesign`).
- `--filter <pattern>`: Pass a Node `--test-name-pattern` filter for targeted debugging.
- `--timeout <seconds>`: Per-invocation timeout safeguard (default: `300`).

Exit code contract:
- Exits `0` **ONLY** when `>= 1` test ran and **100%** of selected tests passed (zero failures, zero skipped/cancelled tests, zero harness crashes).
- Exits non-zero on any test failure, harness crash, timeout, or zero discovered tests.

---

## 2. File Layout & Shared Harness Contract (`tests/e2e/`)

```text
tests/e2e/
├── run_e2e.py                  # Python 3 CLI runner, dual-mount HTTP server, Chromium lifecycle manager
├── self_check.test.mjs         # Harness smoke self-check (validates server, CDP, viewports, emulation, teardown)
├── lib/
│   ├── cdp.mjs                 # Zero-dependency Node 24 WebSocket CDP Browser & Page wrapper
│   └── helpers.mjs             # Opaque-box DOM/ARIA queries, WCAG contrast math, PNG/CSS/hash/git helpers
├── tier1_features.test.mjs     # Tier 1: Isolated Feature Coverage (>= 45 tests; >= 5 per feature F1–F8)
├── tier2_boundaries.test.mjs   # Tier 2: Boundary & Corner Cases (>= 43 tests; >= 5 per feature F1–F8)
├── tier3_combinations.test.mjs # Tier 3: Cross-Feature Pairwise Combinations (>= 12 tests)
└── tier4_scenarios.test.mjs    # Tier 4: Real-World Multi-Feature Application Scenarios (>= 6 tests)
```

### Environment Variables Exported by `run_e2e.py` to Test Processes
- `E2E_WS_URL`: Browser-level CDP WebSocket URL (`ws://127.0.0.1:<port>/devtools/browser/<id>`).
- `E2E_BASE_URL`: Ephemeral root URL (`http://127.0.0.1:<port>`).
- `E2E_SUBPATH_URL`: Ephemeral GitHub Pages subpath URL (`http://127.0.0.1:<port>/ISP-Website-Redesign`).
- `E2E_SITE_DIR`: Absolute path of served site directory (`redesign/dist` or `redesign`).
- `E2E_REPO_ROOT`: Absolute path of repository root (`/home/antigravity/andrewnoonan2004/ISP-Website-Redesign`).

### Shared `lib/cdp.mjs` Page API Contract
Every test creates an isolated browser target/page via `await browser.newPage({ width, height, reducedMotion, javascriptEnabled })` and closes it in `finally`:
- `page.goto(urlOrRelPath, { waitUntil })` — navigates and awaits `load` event + document readiness; tracks HTTP responses (`page.responses`) and console/page exceptions (`page.consoleErrors`, `page.pageErrors`).
- `page.setViewport(width, height, { mobile })` — updates device metrics via `Emulation.setDeviceMetricsOverride`.
- `page.setReducedMotion(enabled)` — toggles `prefers-reduced-motion: reduce` via `Emulation.setEmulatedMedia`.
- `page.setJavaScriptEnabled(enabled)` — toggles JS execution via `Emulation.setScriptExecutionDisabled`.
- `page.evaluate(fn, ...args)` — serializes and executes an expression/function in the page context, returning value by value (propagating exceptions clearly).
- `page.waitFor(predicateFn, { timeoutMs, intervalMs, args, message })` — deterministic condition waiter (no blind sleeps).
- `page.click(selectorOrEval)` / `page.focus(selector)` / `page.fill(selector, value)` / `page.typeText(text)` / `page.pressKey(key, modifiers)` — real user/CDP interaction via DOM focus + `Input.dispatchKeyEvent` / `Input.dispatchMouseEvent`.
- `page.scrollTo(y)` — scrolls window smoothly/immediately and waits for `window.scrollY` / next animation frame.
- `page.getUrl()` — returns current `window.location.href`.

### Opaque-Box Design Discipline (Anti-Brittleness Rules)
1. **Semantic selectors first**: Prefer ARIA roles (`role="dialog"`, `role="status"`, `aria-label`, `aria-expanded`, `aria-pressed`), semantic landmarks (`header`, `nav`, `main`, `footer`, `h1`–`h6`, `details`), accessible names/labels (`label` text, `placeholder`, visible button/link text), canonical URLs/fragments from `PROJECT.md § Interface Contracts` (`courses.html`, `funding.html`, `people.html`, `search.html`, `#requirements`, `#travel-grants`, `#person-<slug>`), and computed layout/style properties (`getBoundingClientRect()`, `getComputedStyle()`).
2. **No brittle coupling to internal CSS class names**: Where an interface contract specifies an ID or URL (e.g., `people.html?category=`, `#person-peter-brusilovsky`, `#requirements`, `#travel-grants`), tests may use it; otherwise tests locate controls semantically (e.g., finding the sticky nav container by `getComputedStyle(el).position === 'sticky' || 'fixed'` containing `<nav aria-label="Main navigation">`, finding the Search button by accessible name `"Search"`, finding Faculty Explorer inputs by `<label>` / accessible name / placeholder / role).
3. **Genuine non-vacuous assertions**: Tests MUST fail against the unimplemented baseline (`4c8e24e`) for unimplemented features (F1–F8 gaps) and pass ONLY when real user-observable requirements are satisfied. No `try/catch` swallowing failures, no trivial `assert(true)`, no hardcoded mock DOMs.

---

## 3. Feature-to-Test Coverage Matrix (`F1`–`F8`)

Coverage target for `N = 8` features:
- **Tier 1 (Feature Coverage):** >= 40 tests (>= 5 per feature) -> **45 planned**
- **Tier 2 (Boundary & Corner Cases):** >= 40 tests (>= 5 per feature) -> **43 planned**
- **Tier 3 (Cross-Feature Pairwise Combinations):** >= 8 tests -> **12 planned**
- **Tier 4 (Real-World Application Scenarios):** >= 5 tests -> **6 planned**
- **Total Suite Size:** >= 93 tests -> **106 planned**

### Feature F1: Baseline Old-Design Screenshots (`docs/screenshots/before/`)
- **Tier 1 (5 tests):**
  1. `T1-F1-01`: `docs/screenshots/before/` exists and contains valid PNG files (`\x89PNG\r\n\x1a\n` signature, valid IHDR width/height > 0).
  2. `T1-F1-02`: Desktop (`>= 1200px` wide, e.g., `1440×900`) before-screenshots exist covering Home, Academics/MS/PhD, People, Admissions/Resources.
  3. `T1-F1-03`: Scrolled desktop before-screenshot (documenting old non-sticky navbar) and `people` AI-search before-screenshot exist.
  4. `T1-F1-04`: Mobile viewport (`<= 420px` wide, e.g., `375×812` and/or `320×568`) before-screenshots exist.
  5. `T1-F1-05`: Before-screenshots contain genuine rendered page content (non-blank byte size / non-degenerate PNG dimensions and multiple distinct pages captured).
- **Tier 2 (5 tests):**
  1. `T2-F1-01`: Zero empty (`0`-byte), truncated, or non-PNG corrupt files in `docs/screenshots/before/`.
  2. `T2-F1-02`: Multi-page coverage breadth check (`>= 8` distinct before-state PNG captures spanning key redesigned routes and/or legacy reference).
  3. `T2-F1-03`: Deploy isolation — `docs/screenshots/before/` is never copied into `redesign/dist/`.
  4. `T2-F1-04`: Before-screenshots are strictly stored outside `redesign/assets/` and outside `.agents/teamwork/`.
  5. `T2-F1-05`: All before-screenshot filenames are portable relative paths (URL/Markdown-safe characters, lowercase/hyphenated or clean ASCII without broken path chars).

### Feature F2: Up-to-Date Course Prerequisites & Classes Offered (`courses.html`, `ms.html`, `phd.html`, `courses.json`)
- **Tier 1 (6 tests):**
  1. `T1-F2-01`: `courses.html` loads cleanly (HTTP 200), renders 2026–2027 `catoid=242` core/theory updates (`ISSP 2071`, `BIOST 2142`, `INFSCI 2440`, `ISSP 2160`, `ISSP 2170`, `ISSP 2180`) and new electives (`ISSP 2078`, `ISSP 2125`, `ISSP 2185`, `ISSP 2419`, `ISSP 2756`, `ISSP 2165`).
  2. `T1-F2-02`: `courses.html` displays verified `PREQ:` / `PLAN:` prerequisites for documented courses (`INFSCI 2440`, `INFSCI 2591`, `INFSCI 2160`, `ISSP 3120`, `ISSP 3535`, `ISSP 3565`, `CS 2150`/`CS 2012`) and explicit verification/TODO guidance for unverified prerequisites.
  3. `T1-F2-03`: Listed SCI courses link directly via HTTPS to `https://courses.sci.pitt.edu/courses/view/` (normalized HTTPS, never mispointing schedule links to `/permission`).
  4. `T1-F2-04`: Live term availability & enrollment verification panel links directly to SCI schedules (`https://courses.sci.pitt.edu/`), PeopleSoft (`https://my.pitt.edu/`), 2026–2027 Pitt Catalog (`catoid=242`), and permission-number workflow.
  5. `T1-F2-05`: Interactive client-side filters on `courses.html` filter courses by degree (`MS`/`PhD`), track (`General`/`Biomedical Informatics`), requirement group, and keyword/code search.
  6. `T1-F2-06`: `ms.html` and `phd.html` include updated 2026–2027 curriculum courses (`ISSP 2071` / `BIOST 2142`), prerequisites/availability guidance, and direct links to `courses.html`.
- **Tier 2 (5 tests):**
  1. `T2-F2-01`: Course code normalization: searching `"ISSP-2170"` (hyphen) and `"issp 2170"` (space, lowercase) both match `ISSP 2170`.
  2. `T2-F2-02`: Zero-match course filter query (e.g., `"ZZZ 9999"`) renders a helpful empty-state message with zero console errors and cleanly resets back to full list.
  3. `T2-F2-03`: JavaScript disabled: `courses.html` still statically renders all curriculum courses, prerequisite text, and live SCI/PeopleSoft links.
  4. `T2-F2-04`: `redesign/src/courses.json` schema & honesty boundary: valid JSON with `catalog_edition` (`2026-2027`), ISO `last_verified`, `live_links`, explicit `TODO: confirm` discipline for unverified prereqs, and no broken `http://` SCI links.
  5. `T2-F2-05`: Mobile `320×568` viewport on `courses.html`: zero horizontal document overflow (`scrollWidth <= innerWidth`), interactive filters & course tables remain usable.

### Feature F3: Easy-to-Find Requirements Under Academics (`academics.html`, `ms.html`, `phd.html`, Academics Nav Submenu)
- **Tier 1 (5 tests):**
  1. `T1-F3-01`: `academics.html` surfaces `#requirements` near the top of `<main>` summarizing 30-credit MS, 72-credit PhD, B-/3.0 QPA, General & Biomedical Informatics tracks, core/theory/elective counts, and links to `ms.html#requirements`, `phd.html#requirements`, `courses.html`, `funding.html`, and `catoid=242`.
  2. `T1-F3-02`: `ms.html` elevates `#requirements` as its top major curriculum section with 30-credit breakdown, General & BMI track tables, and `catoid=242` catalog link.
  3. `T1-F3-03`: `phd.html` elevates `#requirements` as its top major curriculum section with 72-credit breakdown, first-year sequence (`ISSP 2020`, `ISSP 2030`, `INFSCI 3005`), milestones, and `catoid=242` link.
  4. `T1-F3-04`: Sticky navigation includes an accessible Academics disclosure submenu (`aria-expanded` button) linking directly to `academics.html#requirements`, `ms.html#requirements`, `phd.html#requirements`, `courses.html`, and `funding.html`, while keeping `Academics` link navigable to `academics.html`.
  5. `T1-F3-05`: Breadcrumbs (`ms.html`, `phd.html`, `courses.html`) and `data-source-link` official ISP handoffs (`academics.html`, `ms.html`, `phd.html`) are preserved.
- **Tier 2 (5 tests):**
  1. `T2-F3-01`: Keyboard accessibility on Academics submenu: `Enter`/`Space` toggles `aria-expanded`, `Escape` closes and returns focus to the disclosure button, outside click closes menu.
  2. `T2-F3-02`: `ms.html` retains `TODO: confirm` notice for the conflicting MS committee composition rule (3 ISP faculty vs 2 of 3 ISP faculty).
  3. `T2-F3-03`: No stale archived catalog links (`catoid=224`, `catoid=226`, `catoid=236`, `catoid=136`) remain as primary current curriculum catalog links on `academics.html`, `ms.html`, `phd.html`, or `courses.html`.
  4. `T2-F3-04`: Every `<nav aria-label="On this page">` jump link on `academics.html`, `ms.html`, `phd.html`, `courses.html` has `>= 2` valid `#fragment` targets resolving to live DOM IDs.
  5. `T2-F3-05`: Mobile `320×568` on `academics.html`, `ms.html`, and `phd.html`: zero document horizontal overflow (`scrollWidth <= innerWidth`).

### Feature F4: Prominent Scholarships & Funding (`funding.html`, Home, Admissions, Academics, Resources, Nav, Footer)
- **Tier 1 (6 tests):**
  1. `T1-F4-01`: Dedicated `funding.html` loads cleanly (HTTP 200), single `<h1>` and `<main>`, clearly organizes PhD Funding, MS Funding, and All ISP Students / Travel Grants.
  2. `T1-F4-02`: `funding.html` documents verified PhD funding: SCI Predoctoral Fellowships, Provost Predoctoral Fellowships, Graduate Research Assistantships (GSR via faculty PIs), Summer GSA Fellowships, Baranger Fellowship, Provost Dissertation Completion Fellowship, and DBMI Training Grant.
  3. `T1-F4-03`: `funding.html` documents verified MS funding: Pitt2Pitt Scholarship (MSISP participating, up to `$7,500`/yr), SCI graduate scholarships (King, Howard, Smith), PittFund$Me, and transparent note that MS assistantships/fellowships are rare.
  4. `T1-F4-04`: `funding.html` documents ISP Student Travel Grants (`$750–$1,000`/yr + supplemental awards), external fellowships (NSF, Fulbright), and links to SCI Tuition & Financial Aid and Pitt Graduate Studies Funding/Stipends.
  5. `T1-F4-05`: Scholarships & Funding is featured prominently on `index.html` (pathway/featured funding band), in the top-level sticky navigation (`Funding` -> `funding.html`), and in the site footer (`Scholarships & funding` -> `funding.html`).
  6. `T1-F4-06`: Scholarships & Funding links/callouts appear visibly on `admissions.html` (`#funding`), `academics.html`, `ms.html`, `phd.html`, and cross-linked from `resources.html#travel-grants`.
- **Tier 2 (5 tests):**
  1. `T2-F4-01`: `funding.html` includes explicit `TODO: confirm` markers for dynamic unverified items (e.g., priority funding deadlines, current-year fellowship slots, travel-grant budget).
  2. `T2-F4-02`: Computed WCAG 2.1 AA contrast (`>= 4.5:1` normal / `>= 3.0:1` large) on featured funding bands, cards, badges, and buttons on `index.html` and `funding.html` (strictly zero Pitt Gold text on white/light backgrounds).
  3. `T2-F4-03`: Navigating directly to `resources.html#travel-grants` auto-expands the `#travel-grants` `<details>` element and provides a live link to `funding.html`.
  4. `T2-F4-04`: `funding.html` retains breadcrumbs, `<nav aria-label="On this page">` with `>= 2` valid fragment targets, and `data-source-link` official ISP financial aid handoff.
  5. `T2-F4-05`: Mobile `320×568` on `funding.html` and `index.html`: zero horizontal overflow and funding CTAs remain visible/clickable.

### Feature F5: Faculty Explorer Replacing People Page (`people.html`)
- **Tier 1 (6 tests):**
  1. `T1-F5-01`: `people.html` is branded **Faculty Explorer** (`<h1>` contains `"Faculty Explorer"`, `<title>` contains `"Faculty Explorer"`, sticky nav links to `people.html` as `"Faculty Explorer"`), defaults to the 30 Faculty profiles, and provides directory scope switching (`Faculty`, `Graduate students`, `Emeriti faculty`, `Staff`, `Alumni`, `All people`).
  2. `T1-F5-02`: Partial-name search matches substrings accurately (`"Brus"` -> Peter Brusilovsky; `"Kov"` -> Adriana Kovashka; `"Lit"` -> Diane Litman ONLY in Faculty, with zero bio/role false positives like Michael Colaresi, Yu-Ru Lin, Janet Liu, Xinghua Lu, Amin Rahimian, Ahmad P Tafti, Leming Zhou).
  3. `T1-F5-03`: Topic / research-area search for `"AI"` matches all 10 verified explicit `\bAI\b` & `"Artificial Intelligence"` faculty (`diane-litman`, `raquel-coelho`, `shandong-wu`, `yanshan-wang`, `kevin-ashley`, `milos-hauskrecht`, `yufei-huang`, `ryan-shi`, `ahmad-p-tafti`, `shyam-visweswaran`, total `>= 10`).
  4. `T1-F5-04`: Acronym & synonym topic searches (`"NLP"`, `"ML"`, `"CV"`, `"HCI"`) expand accurately (`"NLP"` matches `>= 9` language/NLP faculty including Diane Litman, Daqing He, Lorraine Xiang Li, Janet Liu, Yanshan Wang; `"ML"` matches `>= 12` ML faculty; `"CV"` matches `>= 3` computer vision faculty including Adriana Kovashka, Ahmad P Tafti, Shandong Wu; `"HCI"` matches `>= 5` HCI faculty including Peter Brusilovsky, Na Du, Harry Hochheiser, Michael Lewis, Erin Walker).
  5. `T1-F5-05`: Clickable topic filter chips (displaying counts) and clickable topic tags on faculty cards filter results accurately and announce updated count in a live status region (`aria-live="polite"`).
  6. `T1-F5-06`: Combined filters (partial-name + topic, or topic + school) compose via logical AND and persist cleanly across page reload via URL query parameters.
- **Tier 2 (7 tests):**
  1. `T2-F5-01`: `"AI"` false-positive regression trap: searching topic `"AI"` MUST strictly exclude pure non-AI substring traps (`dana-l-tudorascu` [`"brain"`], `na-du` [`"aims"`], and `hatice-osmanbeyoglu` [empty topics]); if `michael-colaresi` (`"Chair"`, who also holds `"Machine learning and reasoning"`) appears, non-`"chair"` ML peers (`madhavi-ganapathiraju`, `leming-zhou`) must also appear, proving facet expansion rather than substring leakage.
  2. `T2-F5-02`: Punctuation, hyphen & multi-token partial-name normalization: `"HJ Park"` matches `Hyung Jung (H.J.) Park` (`#person-hyung-jung-hj-park`), `"Yu Ru"` matches `Yu-Ru Lin` (`#person-yu-ru-lin`), `"Peter B"` matches `Peter Brusilovsky` (`#person-peter-brusilovsky`).
  3. `T2-F5-03`: `hatice-osmanbeyoglu` integrity invariant: card exists in Faculty view and renders ZERO fabricated research topic tags (`topics: []` preserved).
  4. `T2-F5-04`: Backwards compatibility & deep links: `people.html?category=` (empty param, used by footer "Faculty and students") displays all 190 profiles; `people.html#person-peter-brusilovsky`, `people.html#person-kevin-ashley`, and non-faculty `people.html#person-heidi-davis` auto-reveal and scroll unobstructed below sticky navbar.
  5. `T2-F5-05`: Topic search works across non-faculty scopes (switching to `Graduate students` keeps topic search enabled and matches documented student `interests`, e.g., `"AI"` matches `raphael-adewale`, `joshua-w-anderson`, `yuya-asano`, `ellie-sagheb-hossein-pour` while excluding surname/name traps `nathaniel-paine` and `haiyi-ma`).
  6. `T2-F5-06`: Empty-state recovery & keyboard focus retention: zero-match query displays accessible recovery buttons (`Clear` / `Reset` / `All people`) and activating recovery or changing category retains keyboard focus on a visible interactive control (never dropped to `document.body`).
  7. `T2-F5-07`: JavaScript disabled: all 190 profiles in `people.html` remain rendered and readable without JS.

### Feature F6: Sticky Scroll-Following Navbar & Anchor Offsets (`layout.html`, `styles.css`, `main.js`)
- **Tier 1 (5 tests):**
  1. `T1-F6-01`: Desktop `1440×900` across `index.html`, `academics.html`, `people.html`, `funding.html`, `courses.html`: at `scrollY = 600` and `scrollY = 800`, sticky nav bar remains pinned at `top ≈ 0` (`|rect.top| <= 1`), `height > 0`, `position` is `sticky`/`fixed`, opaque background.
  2. `T1-F6-02`: Mobile `375×812` and `320×568`: at `scrollY = 600`, sticky navbar remains pinned at `top ≈ 0`, compact (`height <= 140px`, <= 25% of 568px viewport), keeping Menu toggle & Search button reachable.
  3. `T1-F6-03`: Skip link (`Skip to main content`): when keyboard-focused (`Tab`), renders visibly inside viewport above the sticky navbar (`z-index` > sticky bar) with AA-compliant contrast.
  4. `T1-F6-04`: Anchor jump non-occlusion: clicking in-page `<nav aria-label="On this page">` jumps on `academics.html`, `ms.html`, `phd.html`, `resources.html` and opening `people.html#person-peter-brusilovsky` positions the target element below the sticky navbar (`targetRect.top >= stickyBottom - 2`).
  5. `T1-F6-05`: Mobile menu open/Escape/outside-click on `375×812` and `320×568`: toggling menu sets `aria-expanded="true"`, `Escape` closes (`aria-expanded="false"`) and returns focus to toggle button, clicking outside closes it.
- **Tier 2 (5 tests):**
  1. `T2-F6-01`: Mobile `320×568` expanded menu scrollability: when scrolled and menu is expanded, drawer is viewport-bounded (`overflow-y: auto`/`scroll` or fits cleanly inside 568px) with zero page horizontal overflow.
  2. `T2-F6-02`: `prefers-reduced-motion: reduce` emulation: sticky nav, anchor navigation, and mobile drawer work cleanly with zero long animation blockers.
  3. `T2-F6-03`: JavaScript disabled: sticky navbar still sticks via pure CSS (`position: sticky`), navigation links remain accessible, and CSS fallback `scroll-padding-top` / `scroll-margin-top` prevents anchor occlusion.
  4. `T2-F6-04`: Dynamic viewport resize (`1440×900` -> `375×812` -> `1440×900`): desktop nav remains visible after round-trip resize, sticky height recalculates cleanly, zero horizontal overflow.
  5. `T2-F6-05`: Opaque background & brand mark sizing: sticky bar computed background alpha is `1` (no text bleed-through), and desktop (`1440×900`) Institutional Mark / placeholder preserves width `>= 220px`.

### Feature F7: Zero-Dependency Site-Wide Search (`search-index.json`, `search.js`, `search.html`, Modal)
- **Tier 1 (6 tests):**
  1. `T1-F7-01`: Sticky navbar exposes a visible Search trigger on core pages; clicking it opens an accessible modal (`role="dialog"`, `aria-modal="true"`) and moves focus into the search input.
  2. `T1-F7-02`: Keyboard shortcuts: pressing `/` or `Ctrl+K` (outside form inputs) opens the search modal and focuses input; pressing `Escape` closes it and returns focus to the Search trigger button.
  3. `T1-F7-03`: Real domain queries (`"scholarship"`, `"AI"`, `"ISSP 2170"`, `"prerequisites"`, `"Brusilovsky"`, `"travel grant"`) return relevant ranked results, announce count in `aria-live="polite"` status region, and support category tabs/filters.
  4. `T1-F7-04`: Keyboard navigation & focus trap: `ArrowDown` / `ArrowUp` traverses results, `Enter` navigates to active result, and `Tab` stays trapped within the open dialog.
  5. `T1-F7-05`: Dedicated `search.html?q=funding` pre-fills `"funding"`, displays matching results including `funding.html`, and updates URL/results on subsequent queries.
  6. `T1-F7-06`: `assets/search-index.json` loads via HTTP 200, is valid non-empty JSON indexing core pages, courses, funding, faculty/people, student guides, research, and news/events with exclusively relative URLs (no leading `/`).
- **Tier 2 (6 tests):**
  1. `T2-F7-01`: XSS injection safety: querying `<img src=x onerror="window.__e2eXss=1"><script>window.__e2eXss=2</script>` in both modal and `search.html?q=...` triggers zero script execution (`window.__e2eXss === undefined`) and injects zero raw `<script>`/`<img>` nodes.
  2. `T2-F7-02`: Hyphen/case/synonym normalization: `"ISSP-2170"` matches `"ISSP 2170"` course entry; `"prereq"` matches prerequisites/courses; `"scholarship"` matches funding/fellowships.
  3. `T2-F7-03`: Boundary queries — empty `""`, whitespace `"   "`, 500-char string, and unmatched `"qxqz_no_match_999"` — produce zero JS errors and show clear helpful empty/no-result guidance.
  4. `T2-F7-04`: Shortcut isolation inside inputs: pressing `/` while focused inside a text `<input>` (e.g., on `people.html` or `courses.html`) types `/` into that input and does NOT open the site-search modal.
  5. `T2-F7-05`: GitHub Pages subpath hosting (`/ISP-Website-Redesign/index.html` and `/ISP-Website-Redesign/search.html?q=funding`): relative fetch of `assets/search-index.json` returns HTTP 200 (zero 404s) and clicking a result stays inside `/ISP-Website-Redesign/`.
  6. `T2-F7-06`: JavaScript disabled: sticky nav `<noscript>` exposes a working `<a href="search.html">` fallback link, and `search.html` renders readable `<noscript>` fallback navigation/guidance.

### Feature F8: Written Change Log (`CHANGES.md`), Brand & WCAG 2.1 AA Compliance
- **Tier 1 (6 tests):**
  1. `T1-F8-01`: Root `CHANGES.md` exists, is well-structured, maps every requirement from `ORIGINAL_REQUEST.md`, lists modified/created files, and documents open `TODO: confirm` items.
  2. `T1-F8-02`: Every relative image/screenshot link inside `CHANGES.md` (e.g., `docs/screenshots/before/*.png`, `docs/screenshots/after/*.png`) resolves to an existing non-empty PNG file.
  3. `T1-F8-03`: Brand CSS token enforcement: ZERO raw `#hex`, `rgb(`, or `rgba(` literals appear in any `redesign/assets/*.css` file outside `tokens.css`; `tokens.css` defines only approved `BRAND.md` hex values.
  4. `T1-F8-04`: Prohibited tagline check: `"Hail to Possible"` (case-insensitive) occurs ZERO times across all generated HTML pages.
  5. `T1-F8-05`: Full structural & runtime cleanliness sweep across all 14 core pages (`index`, `about`, `academics`, `ms`, `phd`, `courses`, `funding`, `admissions`, `people`, `search`, `research`, `events`, `news`, `resources`): exact 1 `<h1>`, exact 1 `<main>`, no skipped heading levels, unique IDs, `alt` on every `<img>`, zero console/page errors, zero failed local asset requests.
  6. `T1-F8-06`: Computed WCAG 2.1 AA contrast (`>= 4.5:1` normal / `>= 3.0:1` large) verified in headless Chromium across primary text, nav links, buttons, funding callouts, topic chips, search dialog, and footer links.
- **Tier 2 (5 tests):**
  1. `T2-F8-01`: Minimum `320×568` zero horizontal overflow sweep across ALL 14 core pages.
  2. `T2-F8-02`: Deploy & protected-directory isolation: `redesign/dist/` (when present) excludes `docs/`, `tests/`, `CHANGES.md`, `.agents/`; protected `Design Assets/`, `Brand Guidelines/`, and `www.isp.pitt.edu/` have zero git modifications.
  3. `T2-F8-03`: Asset cache-busting `?v=` hash integrity: every local CSS/JS/JSON `?v=<12-hex>` reference across generated HTML matches the actual SHA-256[:12] of the file on disk.
  4. `T2-F8-04`: Typography & accent guardrails: computed `body` font is never `Instrument Serif`, headings use uppercase condensed sans stack, and no page uses > 4 distinct brand accent colors simultaneously.
  5. `T2-F8-05`: Zero broken local `href`/`src` links and zero broken `#fragment` targets across all 14 core pages.

### Tier 3: Cross-Feature Pairwise Combinations (12 tests)
- `T3-01` (`F6 + F7`): Scrolled sticky nav -> open Site Search modal -> query `"travel grant"` -> click result -> lands on `resources.html#travel-grants` auto-expanded & unobstructed below sticky bar.
- `T3-02` (`F6 + F3 + F2`): Scrolled sticky nav -> Academics disclosure submenu -> `courses.html` -> filter `MS` + `Core` -> verify `ISSP 2071` & live SCI/PeopleSoft links.
- `T3-03` (`F4 + F5`): Home prominent funding CTA -> `funding.html` -> GSR advisor link -> Faculty Explorer (`people.html`) -> topic search `"AI"` -> verify AI faculty results.
- `T3-04` (`F5 + F6`): `about.html` deep link -> `people.html#person-peter-brusilovsky` unobstructed below sticky bar -> footer `people.html?category=` restores all 190 profiles.
- `T3-05` (`F7 + F5`): Keyboard `/` Site Search on `academics.html` -> query `"Litman"` -> navigate to `people.html#person-diane-litman` -> filter `"NLP"` in Faculty Explorer.
- `T3-06` (`F7 + F2`): Site Search on `index.html` -> hyphenated query `"ISSP-2170"` -> navigate to `courses.html` -> verify `ISSP 2170` prereq/plan info and `courses.sci.pitt.edu/courses/view/ISSP-2170`.
- `T3-07` (`F3 + F4`): `academics.html#requirements` -> `ms.html#requirements` -> MS funding callout -> `funding.html` Pitt2Pitt MSISP details.
- `T3-08` (`F6 + F7 + F5` Mobile `320×568`): Scrolled `people.html` -> open mobile drawer -> `Escape` close -> open sticky Site Search modal -> navigate to `funding.html` with zero horizontal overflow at every step.
- `T3-09` (`F5` History + Multi-Filter): Faculty Explorer topic `"ML"` + partial name `"Haus"` + chip interaction -> `history.back()` restores prior state cleanly without focus loss.
- `T3-10` (`F1 + F8`): `CHANGES.md` -> every linked `docs/screenshots/before/*.png` exists & is valid PNG -> `redesign/dist/` cleanly excludes both `CHANGES.md` and `docs/`.
- `T3-11` (`F7 + F8` Subpath): `/ISP-Website-Redesign/index.html` -> Site Search `"prerequisites"` -> navigate to `/ISP-Website-Redesign/courses.html` -> zero 404s, subpath preserved, AA contrast verified.
- `T3-12` (`F2 + F3 + F6 + F7` No-JS): JS-disabled navigation across `index.html` -> `academics.html#requirements` -> `courses.html` -> `funding.html` -> `people.html` -> `search.html` verifying sticky CSS, anchor clearance, static courses, 190 people, and `<noscript>` search fallback.

### Tier 4: Real-World Multi-Feature Application Scenarios (6 tests)
- `T4-01`: **Raphael's End-to-End Student Session** — Home -> scrolled sticky Academics submenu -> MS Requirements -> Courses & Prerequisites (`ISSP 2071`, `ISSP 2170`, SCI/PeopleSoft/Permission links) -> Site Search `"funding"` -> `funding.html` (MS Pitt2Pitt + Travel Grants) -> Faculty Explorer partial-name `"Brus"` + topic `"AI"`.
- `T4-02`: **Prospective PhD Applicant Journey** — Home featured funding band -> `funding.html` (SCI/Provost/GSR/Baranger) -> `admissions.html#funding` -> `phd.html#requirements` (72 cr., `ISSP 2020`/`ISSP 2030`, milestones) -> Faculty Explorer topic chips + `"NLP"`/`"AI"` search.
- `T4-03`: **Pitt Undergrad Exploring MSISP + Pitt2Pitt Scholarship** — Home `Ctrl+K` Site Search `"Pitt2Pitt"` -> `funding.html` (`$7,500`/yr MSISP) -> `academics.html#requirements` -> `ms.html#requirements` -> `courses.html` filtered to `Biomedical Informatics` (`ISSP 2083`, `ISSP 2016`, `BIOST 2142`).
- `T4-04`: **Mobile Phone (`320×568`) Student Workflow** — Home scrolled sticky nav -> mobile drawer -> `resources.html` -> sticky Site Search `"travel grant"` -> `resources.html#travel-grants` auto-expanded & unobstructed -> `funding.html` -> `people.html` partial-name `"Kov"` + topic `"CV"`, verifying zero horizontal overflow at every step.
- `T4-05`: **Keyboard-Only & Accessibility Navigation Journey** — `Tab` to skip link above sticky bar -> `#main` -> keyboard Academics disclosure (`Enter`/`Escape`) -> `/` Site Search -> `ArrowDown`/`Enter` into `people.html` -> keyboard scope switch & empty-state recovery -> verify focus preservation and zero WCAG/heading violations across journey.
- `T4-06`: **GitHub Pages Subpath & Release Readiness Journey** — Serve under `/ISP-Website-Redesign/`, traverse all 14 core routes verifying zero HTTP errors, zero console/page errors, valid `?v=` cache hashes, `CHANGES.md` + `docs/screenshots/before/` integrity, zero `"Hail to Possible"`, token-only CSS, and clean `redesign/dist/` isolation.

---

## 4. Dry-Run Baseline Validation Criteria

Because this track runs in parallel with the Implementation Track, the E2E suite is validated before publishing `TEST_READY.md` by:
1. Running `python3 -m py_compile tests/e2e/run_e2e.py` and `node --check tests/e2e/lib/*.mjs tests/e2e/*.test.mjs`.
2. Running `python3 tests/e2e/run_e2e.py --tier self` -> must exit `0` with 100% pass (proving Chromium 156, CDP, dual-mount server, viewports, emulation, and cleanup work cleanly).
3. Running `python3 tests/e2e/run_e2e.py --tier 1`, `--tier 2`, `--tier 3`, `--tier 4`, and `--tier all` against the current repo state -> verifying **zero harness/CDP runtime crashes**, clean per-test diagnostics, genuine PASS on already-satisfied invariants (e.g., token-only CSS, `hatice-osmanbeyoglu`, no `"Hail to Possible"`, no-JS 190 profiles), and genuine FAIL on unimplemented features (proving tests are NOT vacuous or tautological).
