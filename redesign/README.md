# ISP local redesign prototype

Dependency-free static HTML, CSS, and JavaScript. All eight existing primary navigation categories are retained, with separate MS and PhD pages. No publication or deployment is configured.

## Run

From `redesign/`: `python3 -m http.server 8000`. Open http://localhost:8000.

## Checks and build

`python3 scripts/check.py` checks local links, document structure, image alternatives, and approved color token use. `python3 scripts/build.py` runs those checks and copies deployable files to `dist/`.

## Sources and review

Content is condensed from the local website snapshot and all three root Word documents: ISP Website Updates-2026, General Information-MS Students, and PhD General Information. External links are taken from those sources; they have not been independently verified as current. Catalog references are fixed editions from the supplied documents, not a claim of current-year requirements.

TODO before publication:
- Obtain the official institutional mark and UCM program lockup; labeled placeholder used in header.
- Confirm approved Alternate Gothic Demi subheading font / Adobe kit. With explicit user approval, the prototype uses League Gothic for all heading levels pending the final Adobe kit; Roboto for body. Fonts load from Google Fonts and require network access.
- Confirm provenance and permission for the pre-existing assets/pitt-campus.jpg. It is labeled on the prototype and has descriptive alternative text.
- Confirm director and link to a verified SCI profile; confirm current MS/PhD enrollment counts.
- Confirm catalog year, admissions requirements, deadlines, funding, and policy details with SCI.
- Resolve contradictory MS committee membership statements in the source document.
- Confirm research groups and update publications, directories, news, and approved photography.
- Complete browser and assistive technology review at 320px, tablet, and desktop widths. Static checks do not establish WCAG compliance.

The deprecated Dietrich handbook and COVID links have not been carried into the prototype. Existing production files and Design Assets are untouched. No dependencies, new image assets, or font files were added. The approved initial styles and Google Fonts imports are scoped to this redesign.

## Editing

Edit `src/pages/*.html` for page content, `src/layout.html` for the shared header/footer, and `assets/styles.css` for layout. Run `python3 scripts/build.py` to regenerate the root preview pages and `dist/`. No third-party dependencies are required.

The homepage and news listing were cross-checked against https://www.isp.pitt.edu/ on November 3, 2026. Catalog requests returned HTTP 403; degree requirements remain pending verification. News links use published ISP headlines without fabricated summaries or dates.

Typography exception: the user approved League Gothic for prototype subheads. The original heading font remains a production TODO.

## People directory

The directory now includes 190 deduplicated people, 172 portraits (18 campus-photo stand-ins omitted), and 28 person-specific Google Scholar links from the supplied website snapshot. `src/people.json` stores editable records with source URLs, roles, research interests, short biography excerpts, and contact/profile links. `scripts/render_people.py` generates the cards at build time. `scripts/import_people.py` refreshes the import from the local snapshot (overwriting curated JSON); it does not claim live synchronization. No guessed Scholar profiles are included. The faculty directory and Peter Brusilovsky profile were spot-checked against the live ISP site. All other imported roles and affiliations require editorial review for freshness.

Search matches names, roles, research interests, and biography text; category filters default to faculty when JavaScript is enabled. Without JavaScript, all records and source links remain accessible. Portraits are copied from the supplied website assets, with no new or AI-generated portraits.

Directory validation: static lint and build pass, including local image paths and heading structure. Interactive browser verification of the directory was blocked by browser origin approval; search, category filters, and mobile layout still need a browser review.

## Expanded local content

The redesign now generates 77 pages: the original 11 redesigned pages plus 66 pages reproduced from the supplied local ISP snapshot. This includes 48 news stories, eight research group/center pages, five past-event archives (2018–2022), three publication archives (2017–2019), the secondary faculty appointment process, and reading/research groups. Research, News, Events, and Resources link to the local copies; matching original ISP links in page content are rewritten to local destinations. Other external links remain external.

Historical stories, events, and publications are labeled as archives. Research activity, group membership, contacts, appointment procedures, and reading-group schedules require review. Each imported page links back to its original ISP source. These pages reproduce supplied content rather than asserting it is current. Source scripts, theme markup, and unreviewed images are not imported.

The migration preserves the documented exceptions: no Dietrich handbook or COVID resources; no obsolete “Current ISP Research” page; no duplicate computer-vision page. Handbook policies, old admissions rules, approved elective lists, and unverified financial-aid/travel award terms were not republished as current guidance. Existing redesigned degree and advising guidance remains in place. People directory behavior is unchanged.

Implementation: `redesign/scripts/snapshot_content.py` reads the supplied snapshot at build time; `redesign/src/content-manifest.json` records all 66 source-to-page mappings. Keep the snapshot beside `redesign/` when rebuilding. The generated `redesign/dist/` folder can be served independently without Python generation scripts or the snapshot.

Validation after this expansion: `python3 redesign/scripts/build.py` passed for all 77 pages. Additional checks confirmed all 66 source mappings, preview/dist copies, section links, provenance notices, source links, and removal of executable source markup. External destinations and browser/mobile behavior remain unverified because of the saved browser origin restriction.

## GitHub Pages deployment

The `.github/workflows/pages.yml` workflow builds and lints the site on every push to `main`, then publishes only `redesign/dist/`. It can also be run manually from the GitHub Actions tab. Set the repository's Pages publishing source to **GitHub Actions**. No third-party Python packages or deployment secrets are needed.

Published address: https://andrewnoonan2004.github.io/ISP-Website-Redesign/

The generated site uses relative page and asset paths to support the repository URL prefix. The original website snapshot and Word documents are build inputs, not part of the Pages deployment artifact. Prototype notes and outstanding content/brand TODOs remain visible until resolved.
