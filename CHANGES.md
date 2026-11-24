# ISP Website Redesign — Change Log (`CHANGES.md`)

This document records all content, navigation, layout, search, and Faculty Explorer changes implemented from Raphael's user-testing session (`2026-11-23`) and the follow-up unified navigation and sticky categories refinement (`2026-11-24`), along with before-and-after visual screenshots (`docs/screenshots/before/`, `docs/screenshots/after-2026-11-23/`, and `docs/screenshots/after-2026-11-24/`), modified/created files, verification results, and open `TODO: confirm` items awaiting program verification.

---

## 2026-11-24 Update — Unified Standard Menu Bar, Per-Tab Category Dropdowns & Sticky Page Categories

> **Requirements:**
> 1. *Integrate the separate `ISP` / Search / Menu bar directly into the standard menu bar.*
> 2. *Have each page's section categories follow the scroll down the page AND expose each top-level tab's categories via hover/click dropdown menus.*

### 1. Unified Sticky Standard Menu Bar (`redesign/src/layout.html`, `redesign/assets/styles.css`, `redesign/scripts/test_navigation.py`)
- **Removed the separate `ISP` bar (`.sticky-brand` and `.sticky-controls`).**
- **Desktop (`> 760px`):** The sticky standard menu bar (`#sticky-nav-shell`) now presents all 10 top-level navigation tabs in one balanced horizontal row with the **Search** trigger (`#site-search-open` / `#site-search-link` fallback) integrated cleanly at the **right end** via CSS flex ordering—eliminating the redundant `ISP` label directly underneath the `INTELLIGENT SYSTEMS PROGRAM` masthead.
- **Mobile (`<= 760px`, verified at `375×812` and `320×568`):** Hid the duplicate stacked masthead on mobile and integrated `Intelligent Systems Program` (`.sticky-site-name`), **Search**, and **Menu** (`#mobile-menu-toggle`) onto **one compact sticky header row** (~52–58px tall), with `.nav-actions` placed ahead of `<nav>` in DOM order so keyboard focus order matches visual order. Opening **Menu** reveals a full-width, single-column, viewport-bounded overlay drawer (`flex-wrap: nowrap; overflow-y: auto`) without shifting page content.

### 2. Per-Tab Category Dropdown Menus (`redesign/scripts/build.py`, `redesign/assets/styles.css`, `redesign/assets/main.js`)
- Extended the accessible disclosure submenu pattern from `Academics` alone to **all 10 top-level navigation tabs** (`About`, `Academics`, `Courses`, `Funding`, `Admissions`, `Faculty Explorer`, `Research`, `Events`, `News`, `Resources`), mapping every tab directly to the verified section categories (`#anchors`) on its page (`NAV_SUBMENUS` in `redesign/scripts/build.py`):
  - **About:** Leadership & contacts · Spaces & location · Program directors (1986–present) · Prototype review notes
  - **Academics:** Degree requirements (MS & PhD) · MS requirements (30 credits) · PhD requirements (72 credits) · Compare degrees · Courses & prerequisites · Scholarships & funding · Catalog & live schedules
  - **Courses:** Live availability & PeopleSoft · Filterable course catalog (47) · 2026–2027 catalog updates · Permission numbers & cross-registration
  - **Funding:** At a glance · PhD fellowships & assistantships · MS scholarships & Pitt2Pitt · Conference travel grants ($750–$1,000) · External fellowships & Pitt portals
  - **Admissions:** Application steps (4) · Scholarships, fellowships & financial aid · Ask about your application
  - **Faculty Explorer:** Search by name or topic · Research topic filters (10) · Faculty & people directory (190) · About this information
  - **Research:** Faculty directory · Research groups & centers (8)
  - **Events:** Upcoming calendar · ISP forums · Past events archive (2022–2018)
  - **News:** Featured stories (3) · News archive (48 stories)
  - **Resources:** Registration & policies (8 guides) · Scholarships, funding & travel grants · Campus spaces & links · Additional ISP archives (5)
- **Interaction & Accessibility:**
  - Desktop hover-intent open (`120ms` delay on mouse `pointerenter`) with `180ms` diagonal-movement close grace period, plus click/Enter/Space toggle on every chevron button (`aria-label="{Tab} sections"`) that pins hover-opened menus open instead of fighting clicks.
  - Single-open guarantee across all 10 tabs, `Escape` closes and returns focus to the active toggle button, outside-click and `focusout` dismissal, right-edge alignment (`.nav-submenu-end`) on `Research`, `Events`, `News`, and `Resources` to prevent right-viewport overflow, and inline expandable accordions inside the mobile menu drawer.

### 3. Sticky "On This Page" Categories Bar with Active-Section Scrollspy (`redesign/assets/styles.css`, `redesign/assets/main.js`)
- Made every page's `<nav class="page-jumps" aria-label="On this page">` bar **sticky** (`position: sticky; top: calc(var(--sticky-nav-height, 48px) - 1px); z-index: 90`) so each page's section categories follow the reader directly underneath the main sticky menu bar as they scroll down.
- Styled `.page-jumps.wrap` full-bleed edge-to-edge with an opaque background (`var(--pitt-white)` at rest; `var(--pitt-new-sky)` with `2px solid var(--pitt-royal)` border when `.is-stuck`) while aligning its inner items cleanly to the `1240px` page grid and keeping main dropdown panels (`z-index: 150`) above it.
- Added live **scrollspy active-section highlighting** (`aria-current="location"` + `.is-active`, rendered in high-contrast `var(--pitt-white)` on `var(--pitt-royal)` with a `var(--pitt-gold)` underline when stuck) and a `ResizeObserver`-backed `--sticky-offset-height` (`--sticky-nav-height` + `--sticky-jumps-height`) so `scroll-padding-top` and `scroll-margin-top` keep every jumped anchor completely unobstructed below **both** sticky bars.
- On mobile (`<= 760px`, down to `320px`), `.page-jumps` stays a compact single-row horizontally scrollable strip (~42px tall) that auto-scrolls the active category pill into view without causing document-level horizontal overflow.

---

## 1. Summary of Changes Mapped to Raphael's Session

### A. Content and Accuracy — Up-to-Date Courses, Prerequisites & Live Availability
> **Requirement:** *"Keep course prerequisites and classes offered up to date on the site. Right now they're out of date, so he ends up going to PeopleSoft and finding a class isn't available, or getting info from separate Google Docs / asking the admin instead."*

- **Single-source-of-truth 2026–2027 course catalog (`redesign/src/courses.json` & `redesign/scripts/render_courses.py`):**
  - Reconciled all **47 required and approved ISP courses** against the official **2026–2027 University of Pittsburgh Graduate Catalog (`catoid=242`)** for the MS (`poid=80371`) and PhD (`poid=80372`) in Intelligent Systems (`last_verified: "2026-11-20"`).
  - Updated the MS General Track Core options to feature **`ISSP 2071` (Human Language Technologies)** in place of the older `ISSP 2230` core listing (while retaining `ISSP 2230` as an Approved Advanced Course and PhD option).
  - Updated Theory — Statistics to feature **`BIOST 2142` (Applied Regression Analysis)** in place of the retired `BIOST 2042`.
  - Added the six new 2026–2027 Approved Advanced Courses: **`ISSP 2078` (Introduction to Deep Learning)**, **`ISSP 2125` (Network Science and Analysis)**, **`ISSP 2185` (FATE: Fairness, Accountability, Transparency, and Ethics in AI)**, **`ISSP 2419` (Applied Legal Data Analytics and AI)**, **`ISSP 2756` (Principles of Data Mining)**, and **`ISSP 2165` (Advanced Topics in Data Mining: Social and Heterogeneous Graph Mining)**.
  - Documented verified `PREQ:` and `PLAN:` enrollment rules (`INFSCI 2440`, `INFSCI 2591`, `INFSCI 2160`, `ISSP 2130 / INFSCI 2140`, `ISSP 3120`, `ISSP 3535`, `ISSP 3565`, `ISSP 2170`, `ISSP 2230`, `ISSP 2240`, `ISSP 2030`, `ISSP 2016`, `ISSP 2180`, `CS 2150 / CS 2012`), and explicitly labeled unverified course prerequisites with `"Verify in SCI Course Catalog & PeopleSoft (TODO: confirm)"`.
  - Linked every SCI course directly over HTTPS to `https://courses.sci.pitt.edu/courses/view/<SUBJ>-<NUM>` (eliminating broken `http://` links and misrouted `/permission` links).
- **Filterable Courses & Prerequisites Explorer (`redesign/src/pages/courses.html`, `redesign/assets/courses.js`, `redesign/courses.html`):**
  - Renders all 47 courses statically (100% readable without JavaScript) with progressive client-side filtering by **Degree program (`MS` / `PhD`)**, **Curriculum track (`General` / `Biomedical Informatics`)**, **Requirement group**, and **Course code / keyword** (normalizing `ISSP-2170` == `ISSP 2170`).
  - Features a 3-step live availability verification panel linking directly to the **Live SCI Term Course Schedule (`https://courses.sci.pitt.edu/`)**, **PeopleSoft / HighPoint CX (`https://my.pitt.edu/`)**, and the **2026–2027 Pitt Graduate Catalog (`catoid=242`)**, plus step-by-step **permission number instructions** (`https://courses.sci.pitt.edu/permission` and outside-SCI department contacts).

---

### B. Navigation and Layout — Sticky Scroll-Following Navbar, Easy-to-Find Academics Requirements & Prominent Scholarships/Funding

#### 1. Sticky Scroll-Following Navbar (`redesign/src/layout.html`, `redesign/assets/styles.css`, `redesign/assets/main.js`)
> **Requirement:** *"Make the navbar follow the scroll, so it's always available."*

- Separated the top university utility banner and desktop masthead (`<header class="site-banner">`) from a dedicated direct-`<body>` sticky navigation shell (`<div class="sticky-nav-shell" id="sticky-nav-shell">`) with `position: sticky; top: 0; z-index: 100; background: var(--pitt-white); border-bottom: 2px solid var(--pitt-royal);`.
- Dynamically synchronizes `--sticky-nav-height` and applies `scroll-padding-top` on `html` and `scroll-margin-top` on all anchor targets (`main[id], section[id], h2[id], h3[id], details[id], div[id], tr[id], .person-card`) so in-page jump links and `#person-<slug>` deep links always land unobstructed below the sticky navbar.
- Elevated the keyboard skip link (`a.skip[href="#main"]`) to `position: fixed; z-index: 200;` with high-contrast Pitt Gold (`var(--pitt-gold)`) background and Pitt Medium Blue (`var(--pitt-medium-blue)`) text.
- On mobile viewports (`<= 760px`, tested at `375×812` and `320×568`), the sticky bar remains compact (`<= 140px`) with both the **Search** trigger and **Menu** button always reachable, a viewport-bounded scrollable drawer (`max-height` + `overflow-y: auto`), `Escape` key close with focus return, and outside-click dismissal.

#### 2. Easy-to-Find Requirements Under Academics (`academics.html`, `ms.html`, `phd.html` & Academics Submenu)
> **Requirement:** *"Under Academics, make requirements easy to find."*

- Added an accessible **Academics disclosure submenu** (`<button id="academics-submenu-toggle" aria-expanded="false" aria-controls="nav-academics-menu">`) in the sticky navbar alongside the directly navigable `Academics` link, giving 1-click access from any page to:
  - `academics.html#requirements` — Degree requirements (MS & PhD)
  - `ms.html#requirements` — MS requirements (30 credits)
  - `phd.html#requirements` — PhD requirements (72 credits)
  - `courses.html` — Courses & prerequisites
  - `funding.html` — Scholarships & funding
- Elevated `#requirements` to the top of `<main>` on `academics.html`, `ms.html`, and `phd.html` with scannable credit breakdowns (30-credit MS / 10 courses; 72-credit PhD), `B-` / `3.0 QPA` standing rules, General and Biomedical Informatics track course tables rendered directly from `courses.json`, and 2026–2027 `catoid=242` catalog links.

#### 3. Prominent Scholarships and Funding (`funding.html` & Site-Wide Prominence)
> **Requirement:** *"Feature scholarships and funding more prominently — he specifically called that out."*

- Created a dedicated **`funding.html` (Scholarships & Funding)** page and added top-level **Funding** links in the sticky navbar, Academics submenu, and footer.
- Organized verified funding opportunities by audience:
  - **PhD Fellowships & Assistantships (`#phd-funding`):** SCI Predoctoral Fellowships (automatic consideration with PhD application), Provost Predoctoral Fellowships (typically post-Year 2), Graduate Research Assistantships (GSR via ISP faculty PIs), Summer GSA Fellowships, Elizabeth U. Baranger Predoctoral Fellowship, Provost's Dissertation Completion Fellowship, and the DBMI Training Grant (for MD holders who are U.S. citizens or permanent residents).
  - **MS Scholarships & Financial Aid (`#ms-funding`):** Pitt2Pitt Scholarship (MS in Intelligent Systems / MSISP verified participating program: up to **$7,500/year** full-time or **$3,750/year** part-time for Pitt undergraduates and alumni), SCI Graduate Scholarships (Barbara E. King, Russell "Rusty" A. Howard II, Jerry & Cathy Smith), PittFund$Me, and transparent SCI guidance noting that program-funded assistantships/fellowships for MS students are rare.
  - **All ISP Students (`#travel-grants` & `#external-and-university-aid`):** ISP Student Travel Grants (**$750–$1,000/year** for accepted AI conference papers/posters when requested at least 1 month in advance, plus supplemental travel petitions and reimbursement workflow via Bobbie Coyne, `bjc134@pitt.edu`), external fellowships (NSF, Fulbright), and official Pitt Graduate Studies & SCI financial aid portals.
- Surfaced scholarships and funding prominently across **`index.html`** (hero link, 2nd "Find your path" pathway card, MS/PhD program cards, and dedicated `#funding` callout section), **`admissions.html`** (`#funding` section), **`academics.html`** (`#funding` callout), **`ms.html`** (`#funding` callout), **`phd.html`** (`#funding` callout), and **`resources.html`** (`#travel-grants` and `#funding-resources`).

---

### C. Site-Wide Search (`build_search_index.py`, `assets/search-index.json`, `assets/search.js`, `search.html`)
> **Requirement:** *"Add site search. He said search functionality would be very useful."*

- Implemented `redesign/scripts/build_search_index.py` generating `redesign/assets/search-index.json` at build time (cache-busted via `<meta name="search-index" content="assets/search-index.json?v=...">`), indexing **300+ items** across all core pages, degree requirement sections, all 47 courses from `courses.json`, funding programs, all 190 people from `people.json` / `people-facets.json`, student resource guides, research groups, news, and events using exclusively relative URLs.
- Added a visible **Search** trigger button (`#site-search-open`) in the sticky navbar (plus a non-JS `<a id="site-search-link" href="search.html">Search</a>` link fallback) that opens an accessible modal dialog (`role="dialog" aria-modal="true"`) via click, `/`, or `Ctrl+K` / `Cmd+K` (when not focused inside a form input).
- Built a dedicated full-page **`search.html?q=...`** search experience with category tabs (`All`, `Requirements & Pages`, `Courses`, `Funding & Aid`, `Faculty & People`, `Student Guides`, `Research & News`), `role="status" aria-live="polite"` result announcements, arrow-key (`ArrowDown` / `ArrowUp` + `Enter`) result navigation, strict `Tab` focus trapping inside the modal, `Escape` close with focus return, XSS-safe DOM rendering with token-styled `<mark class="search-highlight">`, and a `<noscript>` directory guide.

---

### D. Faculty Explorer (Replacing the People Page — `render_people.py`, `assets/people.js`, `assets/people.css`, `people.html`)
> **Requirements:**
> - *"Faculty explorer (replacing the people page)"*
> - *"Search shouldn't require a full name — partial names should work."*
> - *"Add the ability to search by topic / research area, so you could find all faculty researching AI, for example."*

- Rebranded canonical `people.html` to **Faculty Explorer** in `<title>`, `<h1>`, main navigation, and breadcrumbs while preserving all 190 profiles in static HTML and all 218 internal `#person-<slug>` and `people.html?category=` links.
- Added interactive **Directory scope tabs** (`Faculty (30)` default, `Graduate students (32)`, `Emeriti faculty (6)`, `Staff (1)`, `Alumni (123)`, `All people (190)`) with `aria-pressed` state synchronized with `#people-category` and URL query parameters.
- Added a dedicated **Partial-name search input (`#people-name`)**:
  - Case-, diacritic-, hyphen-, and punctuation-normalized (`"Brus"` → Peter Brusilovsky, `"Kov"` → Adriana Kovashka, `"Lit"` → Diane Litman, `"HJ Park"` → Hyung Jung (H.J.) Park, `"Yu Ru"` → Yu-Ru Lin, `"Peter B"` → Peter Brusilovsky).
  - Matches strictly against person names (`card.dataset.name`) so partial names like `"Lit"` never produce false positives from bio/department words like *"Political"*, *"Literature"*, or *"Rehabilitation"*.
- Added a dedicated **Topic / research-area search input (`#people-topic-search`)**, **10 clickable research topic filter chips with faculty counts (`.topic-chip`)**, and **clickable topic tags on faculty cards (`.topic-tag`)**:
  - Uses strict word-boundary matching (`\b...\b`) for short acronyms (`<= 3` characters such as `AI`, `ML`, `NLP`, `CV`, `HCI`) and excludes `name` and `role` from topic search blobs (`data-topic-search`), eliminating the old substring bug where searching `"AI"` matched `"Chair"` (`michael-colaresi`), `"aims"` (`na-du`), `"brain"` (`dana-l-tudorascu`), `"Paine"` (`nathaniel-paine`), or `"Haiyi"` (`haiyi-ma`).
  - Expands domain acronyms and synonyms so searching **`"AI"`** matches all 10 explicit AI / Artificial Intelligence faculty (`diane-litman`, `raquel-coelho`, `shandong-wu`, `yanshan-wang`, `kevin-ashley`, `milos-hauskrecht`, `yufei-huang`, `ryan-shi`, `ahmad-p-tafti`, `shyam-visweswaran`) plus AI subarea faculty (24 of 30 total), **`"NLP"`** matches 12 language/retrieval faculty, **`"ML"`** matches 15 machine learning faculty, **`"CV"`** matches 3 computer vision faculty, and **`"HCI"`** matches 5 HCI faculty.
  - Keeps `#people-topic-search` enabled across all directory scopes (including **Graduate students**, where searching `"AI"` matches graduate students with documented AI research interests such as `raphael-adewale`, `joshua-w-anderson`, `yuya-asano`, and `ellie-sagheb-hossein-pour`).
  - Preserves `hatice-osmanbeyoglu` with `topics: []` (zero fabricated research topics).

---

## 2. Files Created and Modified

### Created Files
- `redesign/src/courses.json` — Single-source-of-truth 2026–2027 ISP course catalog (47 courses, verified `PREQ:`/`PLAN:` rules, `catoid=242` metadata, HTTPS SCI course URLs, and `TODO: confirm` markers).
- `redesign/scripts/render_courses.py` — Static HTML generator for `courses.html` and the MS/PhD curriculum tables on `ms.html` and `phd.html`.
- `redesign/src/pages/courses.html` & `redesign/courses.html` — Filterable 2026–2027 Courses & Prerequisites Explorer and live PeopleSoft/SCI schedule verification guide.
- `redesign/assets/courses.js` — Progressive client-side course filtering by degree, track, requirement group, and normalized code/keyword query.
- `redesign/src/pages/funding.html` & `redesign/funding.html` — Dedicated Scholarships, Fellowships, Assistantships & Student Travel Grants page.
- `redesign/scripts/build_search_index.py` — Build-time indexer generating `redesign/assets/search-index.json`.
- `redesign/assets/search-index.json` — Static JSON search index (300+ items across all site categories with relative URLs).
- `redesign/assets/search.js` — Zero-dependency modal and full-page site search controller.
- `redesign/src/pages/search.html` & `redesign/search.html` — Dedicated full-page site search view with `<noscript>` directory links.
- `redesign/scripts/test_courses.py` — Unit tests for `courses.json`, `render_courses.py`, degree requirements, and `funding.html`.
- `redesign/scripts/test_search.py` — Unit tests for `build_search_index.py` and `assets/search-index.json`.
- `docs/screenshots/before/01-home-desktop-1440.png` .. `15-legacy-isp-people-desktop-1440.png` — 15 baseline PNG screenshots of the unmodified old design captured at commit `4c8e24e` before any source edits.
- `docs/screenshots/after-2026-11-23/01-home-desktop-1440.png` .. `16-search-page-desktop-1440.png` — 16 post-change PNG screenshots from the initial `2026-11-23` session iteration (preserved for historical comparison).
- `docs/screenshots/after-2026-11-24/01-home-desktop-1440.png` .. `20-home-mobile-menu-open-375.png` — 20 updated PNG screenshots from the `2026-11-24` unified menu bar, per-tab category dropdowns, and sticky page-categories refinement.
- `tests/e2e/run_e2e.py`, `tests/e2e/lib/cdp.mjs`, `tests/e2e/lib/helpers.mjs`, `tests/e2e/self_check.test.mjs`, `tests/e2e/tier1_features.test.mjs`, `tests/e2e/tier2_boundaries.test.mjs`, `tests/e2e/tier3_combinations.test.mjs`, `tests/e2e/tier4_scenarios.test.mjs`, `TEST_INFRA.md`, `TEST_READY.md` — Automated zero-dependency headless Chromium E2E test suite.
- `PROJECT.md` & `CHANGES.md` — Project architecture plan and comprehensive change log.

### Modified Files
- `redesign/src/layout.html` — Unified `.sticky-nav-shell` removing the separate `ISP` bar (`.sticky-brand`/`.sticky-controls`), integrating `#site-search-open` / `#site-search-link` at the right end of the desktop menu bar and inline with `.sticky-site-name` + `#mobile-menu-toggle` on mobile; updated footer links (`Degree requirements`, `Courses & prerequisites`, `Scholarships & funding`, `Faculty Explorer`, `Faculty and students`, `Site search`) and `#site-search-dialog` modal.
- `redesign/assets/styles.css` — Token-only styles (`var(--pitt-*)`, zero raw `#hex`/`rgb`/`rgba`) for the unified sticky standard menu bar, per-tab category dropdowns (including right-edge alignment `.nav-submenu-end`), full-bleed sticky `.page-jumps` bar with `.is-stuck` and active-section scrollspy highlighting, combined `--sticky-offset-height` scroll offsets, single-column mobile overlay drawer, single-row mobile `.page-jumps` strip, courses/funding components, search modal/page, and 320px responsive layout.
- `redesign/assets/main.js` — `ResizeObserver`-backed sticky height measurement (`--sticky-nav-height`, `--sticky-jumps-height`, `--sticky-offset-height`), generalized multi-tab hover-intent + click/keyboard category submenu controller, mobile menu drawer controller, sticky `.page-jumps` `.is-stuck` + `aria-current="location"` scrollspy, and hash `<details>` auto-reveal.
- `redesign/scripts/render_people.py` — Faculty Explorer markup with scope tabs, dedicated partial-name and topic inputs, topic filter chips with counts, clickable card topic tags, and separated `data-topic-search` attribute.
- `redesign/assets/people.js` — Partial-name search engine, word-boundary + synonym topic search engine, scope tab and chip handlers, empty-state recovery, and URL query/hash synchronization.
- `redesign/assets/people.css` — Token-only styles for Faculty Explorer scope tabs, topic chips, and clickable card topic tags.
- `redesign/src/pages/academics.html` — Elevated `#requirements` comparison table above the fold, added `#funding` callout, and linked to `courses.html`, `funding.html`, and 2026–2027 `catoid=242` catalogs.
- `redesign/src/pages/ms.html` — Elevated 30-credit `#requirements` summary and 2026–2027 General & Biomedical Informatics track tables to top of page, added `#funding` callout (Pitt2Pitt & SCI scholarships).
- `redesign/src/pages/phd.html` — Elevated 72-credit `#requirements` summary and 2026–2027 General & Biomedical Informatics track tables to top of page, added `#funding` callout (SCI/Provost fellowships, GSRs, Baranger, DBMI).
- `redesign/src/pages/index.html` — Added Scholarships & Funding pathway card, dedicated `#funding` callout section, and Courses & Prerequisites student support link.
- `redesign/src/pages/admissions.html` — Added dedicated `#funding` scholarships, fellowships, and financial aid section and linked to `courses.html` and `funding.html`.
- `redesign/src/pages/resources.html` — Cross-linked `funding.html#travel-grants` and `courses.html#permission-numbers` and added `#funding-resources` callout.
- `redesign/scripts/build.py` — Integrated `render_courses`, `build_search_index`, `courses.html`, `funding.html`, `search.html`, `NAV_SUBMENUS` category dropdowns across all 10 top-level nav tabs (`NAV_END_ALIGNED` right-edge alignment), asset SHA-256 `?v=` cache-busting, `test_courses.py`, and `test_search.py`.
- `redesign/scripts/test_navigation.py` & `redesign/scripts/test_people.py` — Extended regression tests to cover the unified navbar, all 10 top-level category submenus, `courses.html`, `funding.html`, `search.html`, new assets, and Faculty Explorer controls.
- Regenerated `redesign/*.html` and `redesign/src/content-manifest.json` via `python3 redesign/scripts/build.py`.

---

## 3. Before & After Visual Comparison Screenshots

All baseline screenshots of the unmodified old design (`HEAD` `4c8e24e`) are preserved in `docs/screenshots/before/`, the initial `2026-11-23` captures are archived in `docs/screenshots/after-2026-11-23/`, and the latest verified captures (`2026-11-24`) are saved in `docs/screenshots/after-2026-11-24/`:

| View / Scenario | Viewport | Old Design (`docs/screenshots/before/`) | Latest Design (`docs/screenshots/after-2026-11-24/`) | Key Visual & UX Improvements |
|---|---|---|---|---|
| **1. Homepage (Top)** | `1440×900` | `docs/screenshots/before/01-home-desktop-1440.png` | `docs/screenshots/after-2026-11-24/01-home-desktop-1440.png` | Unified single-row sticky standard menu bar with `Search /` integrated on the right (no separate `ISP` bar), subtle `▾` category dropdown triggers on all 10 tabs, Scholarships & Funding pathway card, and featured `#funding` section. |
| **2. Homepage (Scrolled)** | `1440×900` | `docs/screenshots/before/02-home-desktop-scrolled-1440.png` | `docs/screenshots/after-2026-11-24/02-home-desktop-scrolled-1440.png` | **Before:** navbar and `"On this page"` bar scrolled completely off-screen. **After:** both the unified standard menu bar (`top = 0px`) AND the full-bleed `"On this page ↓"` categories bar stay docked flush with active-section highlighting (`Graduate programs` in Pitt Royal + Gold). |
| **3. Homepage (Mobile 375px)** | `375×812` | `docs/screenshots/before/03-home-mobile-375.png` | `docs/screenshots/after-2026-11-24/03-home-mobile-375.png` | Single compact sticky mobile header combining `Intelligent Systems Program`, `Search`, and `Menu` on one row (no duplicate `ISP` bar) + single-row horizontally scrollable `"On this page"` strip; zero horizontal overflow. |
| **4. Homepage (Small Mobile 320px)** | `320×568` | `docs/screenshots/before/04-home-mobile-320.png` | `docs/screenshots/after-2026-11-24/04-home-mobile-320.png` | Verified down to 320px viewport width (`scrollWidth == 320px`) with unified sticky header, compact single-row category strip, and funding section. |
| **5. Academics Overview (Desktop)** | `1440×900` | `docs/screenshots/before/05-academics-desktop-1440.png` | `docs/screenshots/after-2026-11-24/05-academics-desktop-1440.png` | Elevated `#requirements` ("Degree requirements at a glance" MS 30 cr. vs PhD 72 cr. table) above the fold with direct action buttons to `ms.html#requirements`, `phd.html#requirements`, `courses.html`, and `funding.html`. |
| **6. Academics Overview (Mobile 375px)** | `375×812` | `docs/screenshots/before/06-academics-mobile-375.png` | `docs/screenshots/after-2026-11-24/06-academics-mobile-375.png` | Unified mobile sticky header, horizontally scrollable `"On this page"` categories strip, and scrollable requirements table with scroll hint. |
| **7. MS Program & Requirements** | `1440×900` | `docs/screenshots/before/07-ms-desktop-1440.png` | `docs/screenshots/after-2026-11-24/07-ms-desktop-1440.png` | Top `#requirements` section with 30-credit breakdown, 2026–2027 General & Biomedical Informatics course/prerequisite tables (`ISSP 2071`, `BIOST 2142`), and Pitt2Pitt MS scholarship callout. |
| **8. PhD Program & Requirements** | `1440×900` | `docs/screenshots/before/08-phd-desktop-1440.png` | `docs/screenshots/after-2026-11-24/08-phd-desktop-1440.png` | Top `#requirements` section with 72-credit breakdown, first-year sequence (`ISSP 2020`, `INFSCI 3005`, `ISSP 2030`), 2026–2027 track tables, and PhD fellowships/GSR callout. |
| **9. Admissions & Financial Aid** | `1440×900` | `docs/screenshots/before/09-admissions-desktop-1440.png` | `docs/screenshots/after-2026-11-24/09-admissions-desktop-1440.png` | Prominent `#funding` callout detailing PhD automatic fellowship consideration, Pitt2Pitt MS scholarships, and January 15 priority deadline note. |
| **10. Student Resources** | `1440×900` | `docs/screenshots/before/10-resources-desktop-1440.png` | `docs/screenshots/after-2026-11-24/10-resources-desktop-1440.png` | Linked `#registration`, `#permissions`, and `#travel-grants` directly to `courses.html` and `funding.html` and added `#funding-resources` callout. |
| **11. Faculty Explorer (Default View)** | `1440×900` | `docs/screenshots/before/11-people-desktop-1440.png` | `docs/screenshots/after-2026-11-24/11-people-desktop-1440.png` | Rebranded from "People" to **Faculty Explorer**; 6 scope tabs (`Faculty (30)` .. `All people (190)`), dedicated Partial Name and Topic/Research Area search inputs, 10 clickable topic filter chips with counts, and interactive card topic tags. |
| **12. Faculty Explorer (`?q=AI` Search)** | `1440×900` | `docs/screenshots/before/12-people-ai-search-desktop-1440.png` | `docs/screenshots/after-2026-11-24/12-people-ai-search-desktop-1440.png` | **Before:** raw substring match returned 11 profiles including false positives (`Dana L Tudorascu` via *"brain"*, `Na Du` via *"aims"*) while missing *"Artificial Intelligence"* faculty. **After:** word-boundary + synonym topic search matches all 24 verified AI faculty and excludes false-positive traps. |
| **13. Faculty Explorer (Mobile 375px)** | `375×812` | `docs/screenshots/before/13-people-mobile-375.png` | `docs/screenshots/after-2026-11-24/13-people-mobile-375.png` | Responsive single-column Faculty Explorer controls, scope tabs, and topic chips under the unified mobile header. |
| **14. Legacy Archive Reference (Home & People)** | `1440×900` | `docs/screenshots/before/14-legacy-isp-home-desktop-1440.png`<br>`docs/screenshots/before/15-legacy-isp-people-desktop-1440.png` | *(Read-only `www.isp.pitt.edu/` archive preserved untouched)* | Reference captures of the original Drupal site prior to redesign. |
| **15. New Pages (Courses, Funding & Site Search)** | `1440×900` | *(Did not exist in old design)* | `docs/screenshots/after-2026-11-24/14-courses-desktop-1440.png`<br>`docs/screenshots/after-2026-11-24/15-funding-desktop-1440.png`<br>`docs/screenshots/after-2026-11-24/16-search-page-desktop-1440.png` | 2026–2027 Courses & Prerequisites Explorer (`courses.html`), Scholarships & Funding guide (`funding.html`), and Site Search page (`search.html?q=scholarship`). |
| **16. Per-Tab Category Dropdown & Sticky Categories Showcase** | `1440×900` & `375×812` | *(Prior `2026-11-23` version in `docs/screenshots/after-2026-11-23/`)* | `docs/screenshots/after-2026-11-24/17-nav-dropdown-funding-desktop-1440.png`<br>`docs/screenshots/after-2026-11-24/18-academics-scrolled-sticky-categories-1440.png`<br>`docs/screenshots/after-2026-11-24/19-home-mobile-scrolled-375.png`<br>`docs/screenshots/after-2026-11-24/20-home-mobile-menu-open-375.png` | Showcases the `Funding` tab dropdown submenu listing all 5 Funding page categories (`#17`), Academics scrolled with flush-docked sticky `"On this page"` categories + active highlight (`#18`), scrolled mobile 375px unified sticky header + pinned category strip (`#19`), and full-width single-column mobile overlay drawer with expanded `Academics` section accordion (`#20`). |

---

## 4. Open `TODO: confirm` Items for Program Administrator / Faculty Review

In accordance with `AGENTS.md` (never invent unverified program facts), the following items are explicitly marked `TODO: confirm` in the site copy and data files:

1. **Unverified individual course prerequisites (`redesign/src/courses.json`, `courses.html`):**
   - 33 courses carry verified `PREQ:`/`PLAN:` rules from the Pitt catalog and SCI course descriptions; the remaining courses are explicitly marked `"Verify in SCI Course Catalog & PeopleSoft (TODO: confirm)"` (`prereq_verified: false`) so students check live PeopleSoft/SCI listings before registration.
2. **2026–2027 PhD General Track Core "choose two" list (`courses.html`, `academics.html`, `phd.html`):**
   - Confirm with the ISP Director and Program Administrator (`hld46@pitt.edu`) whether the 2026–2027 PhD General Track Core "choose two" list incorporates `ISSP 2071 (Human Language Technologies)` alongside `ISSP 2170`, `ISSP 2230`, and `ISSP 2180` (`TODO: confirm`).
3. **Computer Vision (`ISSP 2180 / CS 2770`) MS enrollment plan rule in PeopleSoft (`courses.json`, `courses.html`):**
   - Confirm whether PeopleSoft's enrollment plan rule for `ISSP 2180` has been updated to include `Intelligent Systems (MS)` alongside `Intelligent Systems (PHD)` (`TODO: confirm`).
4. **Preferred SCI Permission Number Request Form (`courses.html`, `resources.html`):**
   - Confirm whether SCI Records currently prefers permission requests via `https://courses.sci.pitt.edu/permission` or the SCI Permission Qualtrics form (`https://pitt.co1.qualtrics.com/jfe/form/SV_eR79buiDGeyjEhw`) (`TODO: confirm`).
5. **MS Project Committee Composition (`ms.html`, `academics.html`):**
   - The 2026 MS program guide contains two different statements on whether 2 of 3 or all 3 MS project committee members must be ISP faculty (`TODO: confirm`).
6. **Financial Aid Priority Deadline, Fellowship Slots, Pitt2Pitt Term Limits & Annual Travel Grant Budget (`funding.html`, `admissions.html`):**
   - Confirm the current entry-term financial aid priority deadline (legacy guide lists **January 15**), current-year SCI Predoctoral and Summer GSA fellowship slot counts/stipends, Pitt2Pitt term limits and GPA tiers for MSISP, current DBMI training grant URL/eligibility, and current-year annual & supplemental ISP Student Travel Grant budget (`TODO: confirm`).

---

## 5. Build, Lint & Test Verification Summary

- `python3 redesign/scripts/build.py` — **PASS** (generates all 80 HTML pages + `assets/search-index.json`, injects SHA-256 `?v=` asset hashes, populates `redesign/dist/`, and runs unit tests + static linter).
- `python3 redesign/scripts/check.py` — **PASS** (80 pages; verifies single `<h1>` and `<main>`, unique IDs, heading hierarchy, image `alt` attributes, valid local links and `#fragment` anchors, zero raw `#hex`/`rgb()`/`rgba()` in component CSS outside `tokens.css`, and WCAG 2.1 AA contrast `>= 4.5:1`).
- `python3 -m unittest discover -s redesign/scripts -p "test_*.py" -v` — **PASS** (25/25 unit tests across `test_courses.py`, `test_navigation.py`, `test_people.py`, and `test_search.py`).
- `node --check redesign/assets/main.js redesign/assets/people.js redesign/assets/courses.js redesign/assets/search.js` — **PASS** (exit code 0).
- **Headless Chromium E2E Suite (`tests/e2e/` Tiers 1–4)** — **PASS** (106/106 automated browser tests passing across desktop `1440×900`, mobile `375×812` & `320×568`, keyboard-only navigation, reduced motion, JS-disabled fallbacks, GitHub Pages `/ISP-Website-Redesign/` subpath hosting, and `CHANGES.md` / screenshot integrity).
- **2026-11-24 New-Feature Browser Verification & Screenshot Suite** — **PASS** (verified unified desktop/mobile sticky bar without separate `ISP` bar, all 10 top-level hover & click dropdowns, single-open & right-edge overflow prevention, flush-docked sticky `"On this page"` categories bar with active-section scrollspy, dual-sticky anchor clearance, and 20 valid PNGs in `docs/screenshots/after-2026-11-24/`).
