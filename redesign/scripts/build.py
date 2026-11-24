"""Generate the static prototype from shared layout and page fragments."""
from pathlib import Path
import shutil
import subprocess
import sys
import html
import hashlib
import json

from render_people import render as render_people_page
import render_courses
import build_search_index
import snapshot_content

ROOT = Path(__file__).resolve().parents[1]

PAGES = {
    'index': ('Home', ''),
    'about': ('About ISP', 'A multidisciplinary graduate community in the School of Computing and Information.'),
    'academics': ('Academics', 'Degree requirements, curriculum tracks, and courses for the MS and PhD in Intelligent Systems.'),
    'courses': ('Courses & Prerequisites', '2026–2027 ISP graduate courses, prerequisites, live SCI schedules, and PeopleSoft verification.'),
    'funding': ('Scholarships & Funding', 'PhD fellowships, research assistantships, Pitt2Pitt MS scholarships, and student conference travel grants.'),
    'admissions': ('Admissions', 'Explore graduate study, scholarships, and application steps with SCI admissions.'),
    'people': ('Faculty Explorer', 'Search ISP faculty, graduate students, staff, and alumni by partial name or research area.'),
    'research': ('Research', 'Explore the applied AI research areas represented in the ISP community.'),
    'events': ('Events', 'Research talks, forums, and opportunities to connect.'),
    'news': ('News', 'Research and community updates from the Intelligent Systems Program.'),
    'resources': ('Student resources', 'Advising, registration, permission numbers, and practical guidance for MS and PhD students.'),
    'search': ('Search ISP', 'Search degree requirements, 2026–2027 courses, prerequisites, scholarships, faculty, and student resources.'),
    'ms': ('Master of Science', '30-credit curriculum, General and Biomedical Informatics tracks, and MS project requirements.'),
    'phd': ('Doctor of Philosophy', '72-credit doctoral curriculum, research milestones, and dissertation requirements in intelligent systems.'),
}
PAGES.update(snapshot_content.pages())
IMPORTED_BODIES = snapshot_content.bodies()
IMPORTED_PARENTS = snapshot_content.parents()

# Keep src/pages/courses.html and assets/search-index.json fresh on every build.
render_courses.write_page_fragment()
build_search_index.write_search_index()

NAV = ['about', 'academics', 'courses', 'funding', 'admissions', 'people', 'research', 'events', 'news', 'resources']
NAV_LABELS = {
    'about': 'About',
    'academics': 'Academics',
    'courses': 'Courses',
    'funding': 'Funding',
    'admissions': 'Admissions',
    'people': 'Faculty Explorer',
    'research': 'Research',
    'events': 'Events',
    'news': 'News',
    'resources': 'Resources',
}


NAV_SUBMENUS = {
    'about': [
        ('about.html#leadership', 'Leadership & contacts'),
        ('about.html#spaces', 'Spaces & location'),
        ('about.html#directors', 'Program directors (1986–present)'),
        ('about.html#review-notes', 'Prototype review notes'),
    ],
    'academics': [
        ('academics.html#requirements', 'Degree requirements (MS & PhD)'),
        ('ms.html#requirements', 'MS requirements (30 credits)'),
        ('phd.html#requirements', 'PhD requirements (72 credits)'),
        ('academics.html#compare', 'Compare degrees'),
        ('courses.html', 'Courses & prerequisites'),
        ('funding.html', 'Scholarships & funding'),
        ('academics.html#catalog-guidance', 'Catalog & live schedules'),
    ],
    'courses': [
        ('courses.html#live-availability', 'Live availability & PeopleSoft'),
        ('courses.html#course-explorer', 'Filterable course catalog (47)'),
        ('courses.html#catalog-changes', '2026–2027 catalog updates'),
        ('courses.html#permission-numbers', 'Permission numbers & cross-registration'),
    ],
    'funding': [
        ('funding.html#funding-overview', 'At a glance'),
        ('funding.html#phd-funding', 'PhD fellowships & assistantships'),
        ('funding.html#ms-funding', 'MS scholarships & Pitt2Pitt'),
        ('funding.html#travel-grants', 'Conference travel grants ($750–$1,000)'),
        ('funding.html#external-and-university-aid', 'External fellowships & Pitt portals'),
    ],
    'admissions': [
        ('admissions.html#steps', 'Application steps (4)'),
        ('admissions.html#funding', 'Scholarships, fellowships & financial aid'),
        ('admissions.html#contact-admissions', 'Ask about your application'),
    ],
    'people': [
        ('people.html#explorer-title', 'Search by name or topic'),
        ('people.html#topic-chip-bar', 'Research topic filters (10)'),
        ('people.html#people-results', 'Faculty & people directory (190)'),
        ('people.html#directory-notes', 'About this information'),
    ],
    'research': [
        ('research.html#faculty-explorer', 'Faculty directory'),
        ('research.html#areas', 'Research groups & centers (8)'),
    ],
    'events': [
        ('events.html#upcoming-events', 'Upcoming calendar'),
        ('events.html#forums', 'ISP forums'),
        ('events.html#archive', 'Past events archive (2022–2018)'),
    ],
    'news': [
        ('news.html#featured-news', 'Featured stories (3)'),
        ('news.html#archive', 'News archive (48 stories)'),
    ],
    'resources': [
        ('resources.html#advising-guides', 'Registration & policies (8 guides)'),
        ('resources.html#funding-resources', 'Scholarships, funding & travel grants'),
        ('resources.html#campus-links', 'Campus spaces & links'),
        ('resources.html#archive', 'Additional ISP archives (5)'),
    ],
}
NAV_END_ALIGNED = {'research', 'events', 'news', 'resources'}


def build_nav_html(active_slug: str) -> str:
    parts = []
    for s in NAV:
        current = ' aria-current="page"' if s == active_slug else ''
        label = html.escape(NAV_LABELS[s])
        items = NAV_SUBMENUS.get(s, [])
        if items:
            end_cls = ' nav-submenu-end' if s in NAV_END_ALIGNED else ''
            links_html = ''.join(
                f'<a href="{html.escape(href)}">{html.escape(text)}</a>'
                for href, text in items
            )
            parts.append(
                f'<div class="nav-group nav-{s}{end_cls}">'
                f'<a href="{s}.html"{current}>{label}</a>'
                f'<button type="button" class="nav-submenu-toggle" id="{s}-submenu-toggle" aria-expanded="false" aria-controls="nav-{s}-menu" aria-label="{label} sections"><span aria-hidden="true">▾</span></button>'
                f'<div class="nav-submenu" id="nav-{s}-menu" hidden>{links_html}</div>'
                f'</div>'
            )
        else:
            parts.append(f'<a href="{s}.html"{current}>{label}</a>')
    return ''.join(parts)


ms_tables_html = render_courses.render_program_tables('MS')
phd_tables_html = render_courses.render_program_tables('PhD')

for slug, (title, description) in PAGES.items():
    active = 'academics' if slug in ('ms', 'phd') else IMPORTED_PARENTS.get(slug, slug)
    nav = build_nav_html(active)
    parent = 'academics' if slug in ('ms', 'phd', 'courses') else IMPORTED_PARENTS.get(slug)
    parent_link = f' / <a href="{parent}.html">{html.escape(PAGES[parent][0])}</a>' if parent else ''
    heading = (
        ''
        if slug == 'index'
        else f'<section class="page-heading"><div class="wrap"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a>{parent_link} / <span aria-current="page">{html.escape(title)}</span></nav><h1>{html.escape(title)}</h1><p>{html.escape(description)}</p></div></section>'
    )
    if slug in IMPORTED_BODIES:
        body = IMPORTED_BODIES[slug]
    elif slug == 'people':
        body = render_people_page()
    elif slug == 'courses':
        body = render_courses.render()
    else:
        body = (ROOT / 'src/pages' / f'{slug}.html').read_text()
        if slug == 'ms':
            body = body.replace('{{ms_curriculum_tables}}', ms_tables_html)
        elif slug == 'phd':
            body = body.replace('{{phd_curriculum_tables}}', phd_tables_html)

    if slug in ('research', 'news', 'events', 'resources'):
        body += snapshot_content.section(slug)

    if slug == 'people':
        page_assets = '<link rel="stylesheet" href="assets/people.css"><script src="assets/people.js" defer></script>'
    elif slug == 'courses':
        page_assets = '<script src="assets/courses.js" defer></script>'
    else:
        page_assets = ''

    template = (ROOT / 'src/layout.html').read_text()
    for key, value in {
        'title': html.escape(title),
        'description': html.escape(
            description
            or 'Graduate education and research in applied artificial intelligence at the University of Pittsburgh.'
        ),
        'nav': nav,
        'heading': heading,
        'body': body,
        'page_assets': page_assets,
    }.items():
        template = template.replace('{{' + key + '}}', value)

    # Keep returning visitors on matching markup, behavior and styles after a build.
    for asset in ('styles.css', 'main.js', 'search.js', 'search-index.json', 'people.css', 'people.js', 'courses.js'):
        asset_path = ROOT / 'assets' / asset
        if asset_path.exists():
            version = hashlib.sha256(asset_path.read_bytes()).hexdigest()[:12]
            template = template.replace(f'"assets/{asset}"', f'"assets/{asset}?v={version}"')

    (ROOT / f'{slug}.html').write_text(snapshot_content.rewrite_body(template))

subprocess.run([sys.executable, str(ROOT / 'scripts/test_navigation.py')], check=True)
subprocess.run([sys.executable, str(ROOT / 'scripts/test_people.py')], check=True)
subprocess.run([sys.executable, str(ROOT / 'scripts/test_courses.py')], check=True)
subprocess.run([sys.executable, str(ROOT / 'scripts/test_search.py')], check=True)
subprocess.run([sys.executable, str(ROOT / 'scripts/check.py')], check=True)

dist = ROOT / 'dist'
if dist.exists():
    shutil.rmtree(dist)
dist.mkdir(exist_ok=True)
for name in [*(s + '.html' for s in PAGES), 'README.md']:
    shutil.copy2(ROOT / name, dist / name)
shutil.copytree(ROOT / 'assets', dist / 'assets', dirs_exist_ok=True)
(ROOT / 'src/content-manifest.json').write_text(json.dumps(snapshot_content.manifest(), indent=2) + '\n')
print(f'Build passed: {len(PAGES)} pages written to {dist}')
