# UX evaluation log

## 2026-11-08 — Baseline and directory focus investigation

Source reviewed: `9b0eb5d0c109b68fcc75022c313c77e5f8cbc684`. Read AGENTS.md and root BRAND.md (the docs/BRAND.md path in AGENTS.md is stale). No previous UX-Lab implementation changes or overlapping experiments were present.

Deployment: initial GitHub Pages run 42552848910 succeeded. Original ISP-Website-Redesign remains the comparison control and was not modified.

Validation: `python3 redesign/scripts/check.py` passed for 77 pages (local links, anchors, heading order, image alt attributes, color tokens and text contrast). `python3 redesign/scripts/build.py` passed, including 11 people tests and 7 navigation tests. These checks are not a full accessibility audit.

Source review: mobile menu has Escape handling and returns focus to its toggle; directory offers URL-persisted filtering, empty-result recovery and explicit hidden-profile counts; resource deep links open containing disclosures. Prior change added page jump navigation and disclosure cues. These are source observations, not new browser-test results.

Pending hypothesis: category shortcut buttons in people.js hide the selected category shortcut after activation. Keyboard focus may be lost when that focused button becomes hidden. Reproduce using Enter and Space on Staff/Graduate students shortcuts at desktop and 320px widths. If confirmed, move focus to the category select after changing filters, then test visible focus, continued Tab navigation, counts, search retention and Back navigation. Do not combine with another experiment.

Validation blocker: local Playwright is available but Chromium is absent. Chromium downloads returned invalid/truncated archives (End of central directory record signature not found). No implementation fix has been committed or published without browser validation. Mobile/desktop rendered layout and keyboard behavior still require browser testing.

No visitor assignment or conversion analytics are configured; no measured A/B improvements are claimed.

## 2026-11-08 — Directory shortcut focus fix published

Confirmed in Chrome: pressing Enter on Staff (1) hid the shortcut and left document.activeElement on BODY. Commit 67beaab18eb6c8abddbb65e57db577e636c956df moves focus to the Directory selector immediately after shortcut filtering. Hypothesis: retaining a visible, relevant control prevents keyboard users losing their position.

Validation: 77-page lint and production build passed, including all 18 existing tests; JavaScript syntax check passed. GitHub Pages run 42562193276 succeeded. Live browser regression checks passed: Staff via Enter selects Staff with focus on people-category; Graduate students via Space selects 32 profiles with focus on people-category; subsequent Tab reaches people-sort (disabled faculty-only filters are skipped); Back restores Staff. Mobile viewport-specific testing remains outstanding. No measured A/B gain is claimed. Original comparison repository was not changed.

## 2026-11-09 — Admissions task-flow review; no new experiment

Reviewed current AGENTS.md, BRAND.md, admissions and academics source, responsive styles and previous evaluation. Latest deployment for d53ddbe6cd6072ed9544c27c85ee4a47ca4f8725 succeeded (run 42562308130).

Live Chrome checks at 1363px: Admissions loads; keyboard activation of Skip to main content focuses main; no horizontal document overflow; Enter on Compare the MS and PhD programs reaches the Academics comparison with both degrees and a return link to application steps. The four application steps and explicit admissions contact are exposed in the accessibility tree. No new defect was demonstrated in this scoped flow, so no implementation change or overlapping experiment was introduced.

Responsive source review: navigation collapses below 760px; directory controls and cards become a single column below 560px; focus-visible rules and reduced-motion handling are present. This is not a mobile rendered-layout test. Outstanding: 320px visual/keyboard checks, external application-destination verification, and a broader accessibility audit. Existing directory focus regression evidence remains recorded above. No visitor-outcome claims.

## 2026-11-09 — Additional validation and remaining test limitation

Rechecked main at 8e602bd8abcb1b2f1f13586573ac670087f308d2; Pages run 42567330812 succeeded. AGENTS.md and BRAND.md are unchanged. No additional implementation experiment is warranted by the evidence collected so far.

Additional desktop Chrome check: a nonmatching directory search exposes the empty-result recovery action; activating Clear name or keyword with Enter restores 30 faculty results and focus to people-search. No document overflow was observed at 1363px. Official application-requirements, admissions-procedures, and SCI admissions pages were retrieved successfully on November 9; SCI admissions exposes the Apply to Graduate Programs link referenced by the site's instructions. This checks the outbound destination and instructions, not completion of an application or sign-in.

The latest local check.py and build.py run passed for 77 pages and all 18 existing tests. Firefox 153 installed and launched after a download mirror succeeded, but Playwright newPage stalled; the attempted 320/390/768/1366px sweep returned no page results. Do not count this as responsive validation. The previous Chromium download limitation and this page-creation limitation remain test-environment issues, not demonstrated site defects. Avoid repeating installation attempts without new evidence.

Remaining scope: rendered 320px layout and mobile menu/keyboard behavior, plus broader accessibility testing. Source review of main.js confirms Escape handling, resource-disclosure opening for deep links, and table overflow hints; those observations do not substitute for rendered mobile tests. No visitor data or measured A/B gains. Original control repository remains untouched.

## 2026-11-09 — Restore footer destination after a filtering regression

Commit cd656b9707f60004f96c6c90b636697c1751a24d changed the Faculty and students footer link to category=Faculty on the assumption that an empty category was invalid. Live Chrome testing disproved that assumption: the Faculty destination shows 30 profiles and hides students; activating Show all 190 people produces people.html?category=, selects All people, shows 190 profiles, and displays no unavailable-choice feedback. The empty category is intentional and supported by readUrl and filterPeople in people.js. Preserve it for this destination.

Focused correction fb24d19437fe4928244bf4022d48454a20c7c36a restores the original link. Hypothesis: a link promising faculty and students should not initially exclude student profiles. This is a regression correction, not a new visual experiment. The locally built corrected layout passed check.py for 77 pages and build.py with all 18 existing tests. The destination was browser-validated before publication. Mobile-specific validation remains outstanding; no visitor-outcome gain is claimed. Original ISP-Website-Redesign was untouched.
