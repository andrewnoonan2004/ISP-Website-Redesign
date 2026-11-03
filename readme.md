# ISP website redesign

Local static prototype for the University of Pittsburgh Intelligent Systems Program. The implementation lives in `redesign/`; the supplied website snapshot remains in `www.isp.pitt.edu/`. No deployment is configured.

## Current changes

- Shared header, footer, navigation, and Pitt brand color tokens across the 11 main pages: Home, About ISP, Academics, Admissions, People, Research, Events, News, Resources, MS, and PhD.
- Content adapted from the supplied website snapshot and the three program Word documents. Deprecated Dietrich handbook and COVID links were omitted.
- League Gothic headings and Roboto body text. The prototype heading substitution has user approval; final brand fonts and official marks still require review.
- Generated people directory with 190 deduplicated people, 172 portraits, and 28 person-specific Google Scholar links from the supplied snapshot. Eighteen campus-photo stand-ins were omitted.
- Directory search across names, roles, research interests, and biography text, combined with category filtering. JavaScript defaults to Faculty; reset clears search and shows All people. A no-results message appears when nothing matches.
- Expandable biography/research details and source/profile/contact links. All records remain available without JavaScript. No guessed Scholar profiles or AI-generated portraits were added.
- Dependency-free Python build and static checks, with generated preview HTML and a deployable `dist/` folder.

## Run locally

Requires Python 3. There is no npm install step, framework server, or third-party Python dependency.

From a terminal:

```bash
cd "/home/andrew/Documents/ISP Website Redesign"
python3 redesign/scripts/build.py
python3 -m http.server 8000 --bind 127.0.0.1 --directory redesign
```

Open:

- Home: http://127.0.0.1:8000/index.html
- People directory: http://127.0.0.1:8000/people.html

Keep the terminal running while viewing the site. Press Ctrl+C to stop the server. If port 8000 is already serving this redesign, use that existing server. Google Fonts require network access; the site otherwise serves its local assets.

To preview the build output instead, stop the preview server and run:

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory redesign/dist
```

## Edit and rebuild

Read `AGENTS.md` and `BRAND.md` before changing the site.

| File or folder | Purpose |
| --- | --- |
| `redesign/src/layout.html` | Shared page layout, header, and footer |
| `redesign/src/pages/*.html` | Page content fragments |
| `redesign/src/people.json` | Editable directory records and source links |
| `redesign/assets/styles.css` | Shared layout and styling |
| `redesign/assets/tokens.css` | Brand design tokens |
| `redesign/assets/people.css`, `people.js` | Directory styling and filtering |
| `redesign/scripts/render_people.py` | Generates directory cards |
| `redesign/scripts/build.py` | Generates all preview pages, runs checks, and copies output into dist |

Edit source files rather than generated HTML or `dist/`. Then run from the project root:

```bash
python3 redesign/scripts/check.py
python3 redesign/scripts/build.py
```

The standalone check inspects the currently generated pages; build regenerates them before checking. Checks cover local links and anchors, heading structure, image alt attributes, shared color token use, and selected text contrast pairs. They do not verify external destinations or establish accessibility compliance.

`redesign/scripts/import_people.py` refreshes directory data from the local snapshot and overwrites curated JSON. Use it only when intentionally reimporting; it is not live synchronization.

## Verification status and remaining work

The previous implementation handoff reports passing static lint, build, and directory data validation. Those checks were not rerun for this documentation update. Prior project notes report homepage/news and limited faculty/profile spot-checks against the live ISP site; most imported roles and affiliations still need editorial review.

Browser verification remains incomplete because access to http://127.0.0.1:8000 was denied by a saved origin permission or managed policy. A fresh chat does not clear that restriction. Resolve the permission before resuming browser tests; do not work around it through another browser, port, or indirect access method.

Pending browser checks: search, combined category filtering, reset, no-results state, expandable details, profile and Scholar destinations, keyboard focus and usability, and layout at 320px, tablet, and desktop widths. Assistive technology review also remains pending.

Before publication, confirm official institutional mark/program lockup, final heading fonts, campus photo provenance, director and enrollment information, catalog year, requirements, deadlines, funding, research groups, and content freshness. Resolve conflicting MS committee statements in the supplied documents. Catalog verification previously encountered HTTP 403. See `redesign/README.md` for existing source and review notes.

## Expanded local content

The redesign now generates 77 pages: the original 11 redesigned pages plus 66 pages reproduced from the supplied local ISP snapshot. This includes 48 news stories, eight research group/center pages, five past-event archives (2018–2022), three publication archives (2017–2019), the secondary faculty appointment process, and reading/research groups. Research, News, Events, and Resources link to the local copies; matching original ISP links in page content are rewritten to local destinations. Other external links remain external.

Historical stories, events, and publications are labeled as archives. Research activity, group membership, contacts, appointment procedures, and reading-group schedules require review. Each imported page links back to its original ISP source. These pages reproduce supplied content rather than asserting it is current. Source scripts, theme markup, and unreviewed images are not imported.

The migration preserves the documented exceptions: no Dietrich handbook or COVID resources; no obsolete “Current ISP Research” page; no duplicate computer-vision page. Handbook policies, old admissions rules, approved elective lists, and unverified financial-aid/travel award terms were not republished as current guidance. Existing redesigned degree and advising guidance remains in place. People directory behavior is unchanged.

Implementation: `redesign/scripts/snapshot_content.py` reads the supplied snapshot at build time; `redesign/src/content-manifest.json` records all 66 source-to-page mappings. Keep the snapshot beside `redesign/` when rebuilding. The generated `redesign/dist/` folder can be served independently without Python generation scripts or the snapshot.

Validation after this expansion: `python3 redesign/scripts/build.py` passed for all 77 pages. Additional checks confirmed all 66 source mappings, preview/dist copies, section links, provenance notices, source links, and removal of executable source markup. External destinations and browser/mobile behavior remain unverified because of the saved browser origin restriction.
