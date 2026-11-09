# UX evaluation log

## 2026-11-08 — Baseline and directory focus investigation

Source reviewed: `9b0eb5d0c109b68fcc75022c313c77e5f8cbc684`. Read AGENTS.md and root BRAND.md (the docs/BRAND.md path in AGENTS.md is stale). No previous UX-Lab implementation changes or overlapping experiments were present.

Deployment: initial GitHub Pages run 42552848910 succeeded. Original ISP-Website-Redesign remains the comparison control and was not modified.

Validation: `python3 redesign/scripts/check.py` passed for 77 pages (local links, anchors, heading order, image alt attributes, color tokens and text contrast). `python3 redesign/scripts/build.py` passed, including 11 people tests and 7 navigation tests. These checks are not a full accessibility audit.

Source review: mobile menu has Escape handling and returns focus to its toggle; directory offers URL-persisted filtering, empty-result recovery and explicit hidden-profile counts; resource deep links open containing disclosures. Prior change added page jump navigation and disclosure cues. These are source observations, not new browser-test results.

Pending hypothesis: category shortcut buttons in people.js hide the selected category shortcut after activation. Keyboard focus may be lost when that focused button becomes hidden. Reproduce using Enter and Space on Staff/Graduate students shortcuts at desktop and 320px widths. If confirmed, move focus to the category select after changing filters, then test visible focus, continued Tab navigation, counts, search retention and Back navigation. Do not combine with another experiment.

Validation blocker: local Playwright is available but Chromium is absent. Chromium downloads returned invalid/truncated archives (End of central directory record signature not found). No implementation fix has been committed or published without browser validation. Mobile/desktop rendered layout and keyboard behavior still require browser testing.

No visitor assignment or conversion analytics are configured; no measured A/B improvements are claimed.
