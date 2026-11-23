# Project: Pitt ISP Website Redesign — Raphael Session Improvements

## Architecture
- **Stack**: Zero-dependency Python 3 static site generator (`redesign/scripts/build.py`) + vanilla HTML5/CSS3/ES2020+ JavaScript. No `package.json`, no npm/Python third-party dependencies.
- **Build & Deploy Pipeline**: `python3 redesign/scripts/build.py` combines `redesign/src/layout.html`, core page fragments (`redesign/src/pages/*.html`), data-driven renderers (`render_people.py`, `render_courses.py`), snapshot importer (`snapshot_content.py` reading read-only `www.isp.pitt.edu/`), and static search indexer (`build_search_index.py`), emitting `redesign/*.html` + `redesign/assets/search-index.json`, appending SHA-256 `?v=` cache-busting hashes, running unit tests + `check.py`, and copying deployable output into `redesign/dist/` (uploaded to GitHub Pages via `.github/workflows/pages.yml`).
- **Governance & Brand Compliance**: Governed by repo root `BRAND.md` (backed by `Brand Guidelines/University_of_Pittsburgh_Brand_Guidelines.pdf`) and `AGENTS.md`. Strictly uses the 7 existing Pitt tokens in `redesign/assets/tokens.css` (zero raw `#hex` or `rgb()/rgba()` in any other CSS file — enforced by `check.py:38`), WCAG 2.1 AA contrast, 320px responsive layout, `prefers-reduced-motion`, zero edits to `Design Assets/`, `Brand Guidelines/`, or `www.isp.pitt.edu/`, and zero fabricated program facts (`TODO: confirm` for unverified facts).
- **Dual-Track Organization**:
  - **Implementation Track (M1 → M2 → M3 → M4 → M5 → M6)**: Captures baseline unmodified old-design screenshots first (`M1`), builds content/data modules (`M2`: Courses/Requirements/Funding; `M3`: Faculty Explorer), integrates shared navigation & site search (`M4`), writes `CHANGES.md` & after-screenshots (`M5`), then executes Final Milestone (`M6`: Phase 1 E2E Tiers 1–4 pass + Phase 2 Tier 5 adversarial hardening).
  - **E2E Testing Track (`E2E`)**: Runs in parallel from `ORIGINAL_REQUEST.md` and `PROJECT.md § Interface Contracts` (opaque-box, requirement-driven), builds 4-tier automated test suite under `tests/e2e/` using pre-installed headless Chromium 156 + Node 24 / Python 3 stdlib, documents `TEST_INFRA.md`, and publishes `TEST_READY.md`.

## Feature Inventory
Every Step 0 Survey feature (deduplicated across `explorer_survey_1`, `spec_miner_survey_2`, `explorer_survey_3`) is assigned to a milestone below (none unassigned).

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Baseline Old-Design Screenshots | Capture unmodified `HEAD` (`4c8e24e`) desktop (`1440×900`, top & scrolled `scrollY=600`, `people.html?q=AI`) and mobile (`375×812`, `320×568`) PNG screenshots of `redesign/` (plus legacy `www.isp.pitt.edu/` homepage/people captures) into `docs/screenshots/before/` BEFORE any source edits. | M1 | `ORIGINAL_REQUEST.md:24`, survey 1/2/3 |
| F2 | Up-to-Date Courses, Prerequisites & Live Availability | Single-source-of-truth `redesign/src/courses.json` + `render_courses.py` + `courses.html` (and embedded MS/PhD curriculum tables) aligned with 2026–2027 Pitt Catalog `catoid=242` (`ISSP 2071` replacing `ISSP 2230`, `BIOST 2142` replacing `BIOST 2042`, new electives `ISSP 2078/2125/2185/2419/2756/2165`), verified `PREQ:`/`PLAN:` notes, direct per-course `https://courses.sci.pitt.edu/courses/view/<CODE>` links, live SCI schedule (`https://courses.sci.pitt.edu/`) & PeopleSoft (`https://my.pitt.edu/`) verification steps, permission-number workflow, `last_verified` metadata, client-side progressive filters, and `TODO: confirm` on unverified prereqs/term seats. | M2 | `ORIGINAL_REQUEST.md:9`, `catoid=242`, survey 1/2/3 |
| F3 | Easy-to-Find Requirements Under Academics | Elevate scannable `#requirements` summaries & track tables (30-cr MS, 72-cr PhD, B-/3.0 QPA, General & BMI tracks, core/theory/elective counts, milestones, `catoid=242` links) to the top of `academics.html`, `ms.html`, and `phd.html` (preserving `data-source-link` ISP handoffs, breadcrumbs, and MS committee `TODO: confirm`), plus accessible Academics submenu in sticky nav. | M2 (pages/tables) + M4 (sticky nav submenu) | `ORIGINAL_REQUEST.md:13`, survey 1/2/3 |
| F4 | Prominent Scholarships & Funding | Dedicated `funding.html` detailing verified PhD funding (SCI Predoctoral, Provost Predoctoral, GSR via faculty PIs, Summer GSA, Baranger Fellowship, Provost Dissertation Completion, DBMI Training Grant), MS funding (Pitt2Pitt verified MSISP participating up to $7,500/yr, SCI graduate scholarships — King/Howard/Smith — PittFund$Me, rare MS assistantships note), and ISP Student Travel Grants ($750–$1,000/yr + supplemental) with official links & `TODO: confirm` for current deadlines/budgets; surfaced prominently on Home (`index.html`), Admissions (`admissions.html`), Academics (`academics.html`, `ms.html`, `phd.html`), Resources (`resources.html`), sticky navbar (`Funding`), and footer. | M2 (funding page & page callouts) + M4 (nav & footer links) | `ORIGINAL_REQUEST.md:14`, survey 1/2/3 |
| F5 | Faculty Explorer (Replacing People Page) | Transform canonical `people.html` into **Faculty Explorer** (`<h1>Faculty Explorer</h1>`, clean directory scope tabs replacing heavy hidden-banner clutter, preserving all 218 internal links, `#person-<slug>` anchors, `people.html?category=` footer link, keyboard focus retention, `hatice-osmanbeyoglu`'s `topics: []`, no-JS access; optional `faculty.html` redirect stub). Dedicated partial-name search (case/diacritic/punctuation-insensitive, zero bio false positives) + word-boundary & synonym-aware topic/research-area search fixing `"AI"`/`"NLP"`/`"ML"`/`"CV"`/`"HCI"` bugs (zero `"chair"`/`"aims"`/`"brain"`/`"lorraine"` false positives; matches `"Artificial Intelligence"` faculty like Litman, Coelho, Wu + AI research topics; works across Faculty and non-faculty interests) + visible clickable topic filter chips with counts + interactive card topic tags. | M3 (+ M4 nav label integration) | `ORIGINAL_REQUEST.md:18–21`, survey 1/2/3 |
| F6 | Sticky Scroll-Following Navbar & Scroll Offsets | Restructure `layout.html`, `styles.css`, and `main.js` with a compact sticky nav shell (`position: sticky; top: 0; z-index: 100`, token-only background & border — zero `#hex`/`rgb`/`rgba`), raise `.skip` (`z-index: 200`), set `scroll-padding-top` and `scroll-margin-top` so anchors/cards/details are never occluded, keep mobile menu reachable & scrollable (`max-height`/`overflow-y: auto`) down to 320px with `Escape`/outside-click/focus return and no-JS fallback, plus Academics disclosure submenu. | M4 | `ORIGINAL_REQUEST.md:12`, survey 1/2/3 |
| F7 | Zero-Dependency Site-Wide Search | Build-time `redesign/scripts/build_search_index.py` emitting cache-busted `redesign/assets/search-index.json` indexing all core pages, key section anchors, `resources.html` accordions, `courses.json`, `people.json`/`people-facets.json`, research groups, news & events; sticky-nav Search trigger (`/` & `Ctrl/Cmd+K`) opening WCAG AA modal dialog (`role="dialog"`, focus trap, Escape focus return, arrow-key nav, category tabs, `aria-live="polite"`, XSS-safe token-only `<mark>` highlight) + full-page `search.html?q=...` (relative URLs for GitHub Pages subpath, `<noscript>` fallback, hyphen/space & synonym normalization). | M4 | `ORIGINAL_REQUEST.md:17`, survey 1/2/3 |
| F8 | Written Change Log, After-Screenshots & Asset Hash Hygiene | Root `CHANGES.md` documenting every change mapped to `ORIGINAL_REQUEST.md`, exact files modified/created, before/after comparison linking `docs/screenshots/before/*.png` (and `docs/screenshots/after/*.png`), verification results, and open `TODO: confirm` items; rebuild cleanly via `build.py` (resolving pre-existing `people.html`/`people.js` `?v=` mismatch); verify `redesign/dist/` excludes `docs/`, `tests/`, and `CHANGES.md`. | M5 | `ORIGINAL_REQUEST.md:24`, survey 1/2/3 |
| F9 | Opaque-Box E2E Test Suite (Tiers 1–4) & Final Hardening (Tier 5) | Requirement-driven 4-tier E2E test suite (`TEST_INFRA.md`, `tests/e2e/`, `TEST_READY.md`) testing every feature F1–F8, WCAG 2.1 AA/brand invariants, and 320px/1440px browser UX; Final Milestone passes 100% Tiers 1–4 sequentially then runs Tier 5 white-box adversarial coverage hardening and whole-project forensic audit. | E2E + M6 | Dual-Track requirement, survey 1/2/3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Baseline Old-Design Screenshots | Capture unmodified `HEAD` (`4c8e24e`) desktop & mobile screenshots of `redesign/` (plus legacy `www.isp.pitt.edu/` reference) into `docs/screenshots/before/` before any source edits | none | DONE — 15 baseline PNGs in `docs/screenshots/before/` verified & audited (`sub_orch_m1_r3`) |
| M2 | Courses/Prerequisites, Academics Requirements & Scholarships/Funding | Implement F2 (`courses.json`, `render_courses.py`, `courses.html`), F3 (`academics.html`, `ms.html`, `phd.html` requirements), and F4 (`funding.html` + Home/Admissions/Academics/Resources callouts) + `test_courses.py` | M1 (resumes after E2E verification completes to avoid `redesign/dist/` build races) | PAUSED_CHECKPOINT (Explorers DONE + partial Worker on disk; dispatching in r4 next) |
| M3 | Faculty Explorer (Replacing People Page) | Implement F5 (`render_people.py`, `people.js`, `people.css`, `test_people.py`, optional `faculty.html` redirect stub) with partial-name search, acronym/synonym-aware topic search, clickable topic chips/card tags, scope tabs, preserving all 218 links & invariants | M2 | PLANNED |
| M4 | Sticky Navbar, Academics Submenu & Site-Wide Search | Implement F6 (sticky nav shell, scroll offsets, mobile drawer, Academics submenu, top-level `Funding` & `Faculty Explorer` nav/footer links) and F7 (`build_search_index.py`, `search.js`, `search.html`, sticky-nav search modal) + `test_search.py` & `test_navigation.py` | M3 | PLANNED |
| M5 | Change Log & After-Design Verification Screenshots | Implement F8: capture matching post-change screenshots (`docs/screenshots/after/`), write comprehensive root `CHANGES.md` referencing `docs/screenshots/before/` & `after/`, verify clean `build.py`/`check.py`/unit tests and `redesign/dist/` isolation | M4 | PLANNED |
| E2E | E2E Testing Track (Parallel) | Design `TEST_INFRA.md`, implement opaque-box 4-tier E2E test suite (`tests/e2e/`) against `ORIGINAL_REQUEST.md` and Interface Contracts below, and publish `TEST_READY.md` | none | IN_PROGRESS — r4 verification wave (`b3800165bf30cf0de6c6d96e696cf70a`) |
| M6 | Final Milestone — E2E Pass (Tiers 1–4) & Adversarial Hardening (Tier 5) | Phase 1: pass 100% of E2E tests sequentially (Tier 1 -> 2 -> 3 -> 4), updating `CHANGES.md` if fixes are needed. Phase 2: Tier 5 white-box adversarial coverage hardening (Challenger initiates) + whole-project Forensic Audit | M5, E2E (`TEST_READY.md`) | PLANNED |

## Interface Contracts

### Build, Lint & Serving Contract
- **Canonical Build Command**: `python3 redesign/scripts/build.py` (must exit 0; generates `redesign/*.html`, `redesign/assets/search-index.json`, `redesign/dist/`, and executes `test_navigation.py`, `test_people.py`, any new `test_*.py`, and `check.py`).
- **Static Lint Command**: `python3 redesign/scripts/check.py` (must exit 0; verifies all generated pages in `redesign/*.html`, single `<h1>` and `<main>`, unique `id`s, valid heading order, `alt` on every `<img>`, valid local links and `#fragment` anchors, zero raw `#hex` or `rgb()/rgba()` in any CSS file outside `redesign/assets/tokens.css`, and WCAG AA contrast >= 4.5:1).
- **Unit Test Command**: `python3 -m unittest discover -s redesign/scripts -p "test_*.py" -v` (must exit 0).
- **JS Syntax Check**: `node --check redesign/assets/main.js redesign/assets/people.js redesign/assets/search.js` (plus any new JS under `redesign/assets/`).
- **Local Preview Server**: `python3 -m http.server <PORT> --bind 127.0.0.1 --directory redesign/dist` (all internal links and asset/JSON fetches MUST use relative paths so GitHub Pages subpath `/ISP-Website-Redesign/` and local root both work).
- **Deploy Isolation**: `redesign/dist/` contains ONLY generated HTML pages, `README.md`, and `assets/` — NEVER `docs/`, `tests/`, `CHANGES.md`, or `.agents/`.

### Pages & Canonical Routes (`redesign/` & `redesign/dist/`)
- Core pages: `index.html`, `about.html`, `academics.html`, `ms.html`, `phd.html`, `courses.html`, `funding.html`, `admissions.html`, `people.html` (Faculty Explorer; optional `faculty.html` redirect alias), `search.html`, `research.html`, `events.html`, `news.html`, `resources.html`.
- All 11+ core content pages retain `<nav aria-label="On this page">` jump navigation with >=2 valid `#fragment` links (except `search.html` if dedicated utility page, or include `.page-jumps` / register appropriately in `test_people.py`).
- `academics.html`, `admissions.html`, `ms.html`, `phd.html`, and `funding.html` preserve `data-source-link` external official ISP handoff links where applicable (`test_navigation.py:40–46`).
- Breadcrumbs preserved on `ms.html`, `phd.html`, `courses.html`, `funding.html`, and all 66 imported snapshot pages.

### Sticky Navbar & Academics Submenu Contract (`layout.html` ↔ `styles.css` ↔ `main.js`)
- Top `<header class="site-banner">` holds `.university` utility bar and desktop `.masthead` (preserving `.mark-placeholder` >= 220px on desktop).
- Direct `<body>` sibling `<div class="sticky-nav-shell">` uses `position: sticky; top: 0; z-index: 100;` with opaque `var(--pitt-white)` background and `var(--pitt-royal)` / `var(--pitt-gray)` bottom border (NO `rgba()` box-shadow).
- Contains: compact sticky brand link, `<nav class="nav" aria-label="Main navigation">` (`#main-navigation`), Site Search trigger button (`#site-search-open` + `<noscript><a href="search.html">Search</a></noscript>`), and mobile toggle button (`button.menu` on `<=760px`).
- Skip link (`a.skip[href="#main"]`) uses `position: fixed; z-index: 200;` with explicit `background: var(--pitt-gold); color: var(--pitt-medium-blue);`.
- `html` sets `scroll-padding-top: calc(var(--sticky-nav-height, 64px) + 16px);` and `main[id], section[id], h2[id], h3[id], details[id], .person-card` set `scroll-margin-top: calc(var(--sticky-nav-height, 64px) + 16px);` (synced dynamically by `main.js` on resize).
- Sticky nav includes top-level links for **Academics** (with accessible disclosure submenu `<button aria-expanded="false" aria-controls="nav-academics-menu">` linking to `academics.html#requirements`, `ms.html#requirements`, `phd.html#requirements`, `courses.html`, `funding.html`), **Funding** (`funding.html`), and **Faculty Explorer** (`people.html`).
- Mobile menu (`<=760px`, down to `320px`): zero horizontal overflow, expanded menu constrained to `max-height: calc(100dvh - var(--sticky-nav-height, 64px)); overflow-y: auto;`, `Escape` closes and returns focus to `.menu`, outside-click closes.
- Footer preserves `people.html?category=` ("Faculty and students" showing all 190 profiles) and adds `"Scholarships & funding"` (`funding.html`).

### Courses & Academics Requirements Contract (`courses.json` ↔ `render_courses.py` ↔ `academics.html`/`ms.html`/`phd.html`/`courses.html`)
- `redesign/src/courses.json` schema:
  - Top-level: `catalog_edition` (`"2026-2027"`), `catalog_urls` (`ms`, `phd`), `last_verified` (ISO date), `live_links` (`sci_courses`, `sci_schedule`, `peoplesoft`, `sci_permission`, `sci_permission_qualtrics`), `courses` array.
  - Each course object: `code` (e.g., `"ISSP 2071"`), `cross_listed` (list of strings), `title`, `unit` (`"SCI"` or outside-SCI department), `programs` (`["MS"]`, `["PhD"]`, or `["MS", "PhD"]`), `tracks` (`["General"]`, `["Biomedical Informatics"]`, or both), `group` (e.g., `"Core"`, `"Theory — Statistics"`, `"Theory — Computation & Algorithms"`, `"Biomedical Informatics Core"`, `"Approved Advanced Courses"`, `"First-Year & Research"`), `course_url` (normalized `https://courses.sci.pitt.edu/courses/view/<SUBJ>-<NUM>` for SCI courses or catalog/dept URL), `prerequisites` (verified `PREQ:`/`PLAN:` string OR explicit `"Verify in SCI Course Catalog & PeopleSoft (TODO: confirm)"`), `prereq_verified` (boolean), `term_status` (`"verify_live"` default — extensible enum `verify_live | fall | spring | both | not_offered`), `permission_route`.
- `academics.html` promotes `#requirements` above the fold (MS 30 cr. / PhD 72 cr. summary, General & BMI tracks, core/theory/elective overview, direct links to `ms.html#requirements`, `phd.html#requirements`, `courses.html`, `funding.html`, and 2026–2027 catalog `catoid=242`).
- `ms.html` and `phd.html` each feature `#requirements` as their top curriculum section with rendered course/requirement tables and live verification links (preserving MS committee contradiction `TODO: confirm` and flagging PhD General Core "choose two" confirmation against `catoid=242` as `TODO: confirm`).
- `courses.html` renders all courses from `courses.json` statically (readable without JS), with progressive-enhancement filters (Degree, Track, Requirement Group, keyword/code search normalizing `ISSP-2170` == `ISSP 2170`) and prominent PeopleSoft + SCI Schedule live availability guidance.

### Scholarships & Funding Contract (`funding.html` ↔ Core Pages)
- `funding.html` organizes verified funding by audience:
  - **PhD Funding**: SCI Predoctoral Fellowships, Provost Predoctoral Fellowships, Graduate Research Assistantships (GSR via faculty PIs), Summer GSA Fellowships, Elizabeth U. Baranger Predoctoral Fellowship, Provost's Dissertation Completion Fellowship, DBMI Training Grant (MD + US citizen/PR).
  - **MS Funding**: Pitt2Pitt Scholarship (MSISP verified participating program, up to $7,500/yr full-time / $3,750/yr part-time for Pitt undergrads/alumni), SCI graduate scholarships (Barbara E. King, Russell "Rusty" A. Howard II, Jerry & Cathy Smith), PittFund$Me, transparent note that MS assistantships/fellowships are rare.
  - **All ISP Students**: ISP Student Travel Grants ($750–$1,000/yr + supplemental awards, apply >=1 month prior), external fellowships (NSF, Fulbright), Pitt Graduate Studies Funding & Stipends (`gradstudies.pitt.edu/funding`, `/funding/stipends`), SCI Tuition & Financial Aid (`sci.pitt.edu/admissions/tuition-and-financial-aid`, `/admissions/scholarships`).
  - Explicit `TODO: confirm` markers on Jan 15 priority deadline, current-year fellowship slots, and travel-grant budget.
- Surfaced prominently on `index.html` (4th pathway card + featured high-contrast funding band), `admissions.html` (`#funding`), `academics.html`, `ms.html`, `phd.html`, `resources.html` (cross-link from `#travel-grants`), sticky navbar (`Funding`), and footer.

### Site-Wide Search Contract (`build_search_index.py` ↔ `assets/search-index.json` ↔ `assets/search.js` ↔ `search.html`)
- `redesign/assets/search-index.json` generated at build time (cache-busted via `?v=<sha256[:12]>` passed via `<meta>`/`data-search-index` attribute in `layout.html` using relative path `assets/search-index.json?v=...`).
- Index item schema: `id`, `title`, `url` (relative path, optionally with `#anchor`), `category` (`Pages & Requirements`, `Courses`, `Funding & Aid`, `Faculty & People`, `Student Guides`, `Research`, `News & Events`), `keywords` (array/string), `snippet` (plain text), `priority` (numeric weight).
- Accessible modal dialog (`role="dialog" aria-modal="true"`) triggered from `#site-search-open` or `/` / `Ctrl+K` / `Cmd+K` (when not typing in a form field), plus dedicated `search.html?q=...` page.
- Features: partial-word & multi-token search, case/diacritic/hyphen normalization (`ISSP-2170` == `ISSP 2170`), word-boundary short-acronym matching (`ai`, `ml`, `nlp`, `cv`, `hci`, `gsr`, `gsa`, `aar`), domain synonym expansion, category tabs, `role="status" aria-live="polite"` result count, arrow-key navigation, XSS-safe DOM rendering (no unescaped `innerHTML`), Escape/backdrop close with focus return, and `<noscript>` fallback.

### Faculty Explorer Contract (`render_people.py` ↔ `assets/people.js` ↔ `assets/people.css` ↔ `people.html`)
- Canonical URL remains `people.html` (optional `faculty.html` redirect stub to `people.html` preserving query/hash). Page `<title>`, `<h1>`, and nav label become **"Faculty Explorer"**.
- Directory scope tabs (`Faculty` default [30], `Graduate students` [32], `Emeriti faculty` [6], `Staff` [1], `Alumni` [123], `All people` [190]) with accessible `aria-pressed` (and `#people-category` compatibility for URL `?category=` and keyboard focus retention).
- **Partial-name search** (`#people-name`): case-, diacritic-, and punctuation-normalized (`H.J.` == `HJ`, `Yu-Ru` == `Yu Ru`) multi-token substring match strictly against person name (zero bio/role false positives).
- **Topic / research-area search** (`#people-topic-search`) + **clickable topic filter chips** (with live counts) + **clickable card topic tags**:
  - Short acronyms (`<=3` chars) use word-boundary matching (`\b...\b`) — NEVER matching substrings inside `"chair"`, `"aims"`, `"brain"`, `"email"`, `"training"`, or `"lorraine"`.
  - Curated synonym expansion maps `"ai"` ↔ `"artificial intelligence"` + verified AI research topic areas; `"nlp"` ↔ `"natural language"` / `"computational linguistics"` / `"language and information retrieval"`; `"ml"` ↔ `"machine learning"` / `"deep learning"` / `"machine learning and reasoning"`; `"cv"` ↔ `"computer vision"` / `"imaging"`; `"hci"` ↔ `"human-computer interaction"`; `"biomedical"`/`"health"` ↔ `"health and biomedicine"` / `"clinical"`; `"education"`/`"tutoring"` ↔ `"learning and education"` / `"intelligent tutoring"`.
  - Topic search works across ALL directory scopes (not disabled for Graduate Students/Alumni with `interests`).
- Preserved invariants: all 190 profiles visible without JS, `#person-<slug>` deep links & auto-reveal, `people.html?category=` shows all 190 people, `hatice-osmanbeyoglu` keeps `topics: []` (zero invented expertise), URL query sync (`?q=`, `?name=`, `?topic=`, `?area=`, `?school=`, `?category=`, `?sort=`), accessible empty-state recovery with focus management.

### Deliverables Contract (`docs/screenshots/before/` & `CHANGES.md`)
- `docs/screenshots/before/`: Non-empty PNGs captured from unmodified `HEAD` (`4c8e24e`) BEFORE any code edits (desktop `1440×900` full & scrolled `scrollY=600`, `people.html?q=AI`, mobile `375×812` & `320×568` across key pages, plus legacy `www.isp.pitt.edu/` homepage & people captures).
- `CHANGES.md` (repo root): Structured human-readable summary mapping every item in `ORIGINAL_REQUEST.md` to exact changes, file paths, embedded/linked `docs/screenshots/before/` (and `docs/screenshots/after/`) screenshots, test/lint verification summary, and remaining `TODO: confirm` items.

## Code Layout
```text
/home/antigravity/andrewnoonan2004/ISP-Website-Redesign/
├── AGENTS.md                        # Repo coding & brand rules (read-only reference)
├── BRAND.md                         # Authoritative Pitt brand & contrast guide (read-only)
├── PROJECT.md                       # Living Project Orchestrator index (Orchestrator-owned)
├── TEST_INFRA.md                    # E2E Testing Track design & coverage plan (E2E Track-owned)
├── TEST_READY.md                    # E2E completion signal & runner command (E2E Track-owned)
├── CHANGES.md                       # Written changelog & before/after visual guide (M5-owned)
├── Design Assets/                   # Official Pitt brand assets (NEVER EDIT)
├── Brand Guidelines/                # Official Pitt brand PDF (NEVER EDIT)
├── www.isp.pitt.edu/                # Legacy Drupal archive snapshot (NEVER EDIT)
├── docs/
│   └── screenshots/
│       ├── before/                  # Unmodified baseline PNGs from 4c8e24e (M1-owned)
│       └── after/                   # Post-implementation PNGs for visual comparison (M5-owned)
├── tests/
│   └── e2e/                         # Opaque-box 4-tier E2E test runner & suites (E2E Track-owned)
└── redesign/
    ├── *.html                       # Generated preview pages (rebuilt by build.py)
    ├── dist/                        # Gitignored deploy output (rebuilt by build.py)
    ├── assets/
    │   ├── tokens.css               # Approved Pitt CSS tokens (DO NOT ADD RAW COLORS)
    │   ├── styles.css               # Global styles & sticky nav/search styles (M2/M4)
    │   ├── main.js                  # Nav toggle, sticky height sync, disclosures (M4)
    │   ├── people.css               # Faculty Explorer styles (M3)
    │   ├── people.js                # Faculty Explorer search/filter engine (M3)
    │   ├── courses.js               # Optional progressive filter script for courses.html (M2)
    │   ├── search.js                # Zero-dependency site search modal & page (M4)
    │   └── search-index.json        # Build-generated site search index (M4)
    ├── src/
    │   ├── layout.html              # Shared shell: site-banner, sticky-nav-shell, modal, footer (M4)
    │   ├── courses.json             # Single-source-of-truth 2026-2027 ISP courses/prereqs (M2)
    │   ├── people.json              # Deduplicated 190 people profiles (read-only baseline)
    │   ├── people-facets.json       # Curated 30 faculty facets (preserve hatice-osmanbeyoglu: [])
    │   └── pages/                   # Core page HTML fragments (academics, ms, phd, funding, courses, index, admissions, resources, search, etc.)
    └── scripts/
        ├── build.py                 # Main static site build + test + lint + dist export
        ├── check.py                 # Static HTML/link/heading/alt/token/contrast linter
        ├── render_courses.py        # Courses & curriculum table renderer (M2)
        ├── render_people.py         # Faculty Explorer renderer (M3)
        ├── build_search_index.py    # Static JSON search index builder (M4)
        ├── snapshot_content.py      # Legacy snapshot importer (66 pages)
        ├── test_navigation.py       # Navigation, link rewriting & asset hash tests
        ├── test_people.py           # Faculty Explorer & page-jumps unit tests
        ├── test_courses.py          # Courses/prereqs/funding data & rendering tests (M2)
        └── test_search.py           # Search index & search page tests (M4)
```
