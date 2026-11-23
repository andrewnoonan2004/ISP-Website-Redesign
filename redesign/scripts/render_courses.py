"""Render the 2026-2027 ISP courses & prerequisites explorer and degree curriculum tables."""
from pathlib import Path
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]
e = html.escape

REQUIRED_TOP_KEYS = {
    'catalog_edition',
    'catalog_urls',
    'last_verified',
    'live_links',
    'courses',
}
REQUIRED_COURSE_KEYS = {
    'code',
    'cross_listed',
    'title',
    'unit',
    'programs',
    'tracks',
    'group',
    'course_url',
    'prerequisites',
    'prereq_verified',
    'term_status',
    'permission_route',
}


def slugify_code(code: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', code.lower()).strip('-')


def load_course_catalog() -> dict:
    data = json.loads((ROOT / 'src/courses.json').read_text())
    missing_top = REQUIRED_TOP_KEYS - set(data.keys())
    if missing_top:
        raise ValueError(f'courses.json missing top-level keys: {sorted(missing_top)}')
    seen_codes = set()
    for course in data['courses']:
        missing = REQUIRED_COURSE_KEYS - set(course.keys())
        if missing:
            raise ValueError(f'Course {course.get("code")} missing keys: {sorted(missing)}')
        code = course['code']
        if code in seen_codes:
            raise ValueError(f'Duplicate course code in courses.json: {code}')
        seen_codes.add(code)
        if not course['course_url'].startswith('https://'):
            raise ValueError(f'Course {code} must use an https:// course_url')
        if not course['prereq_verified'] and 'TODO: confirm' not in course['prerequisites']:
            raise ValueError(f'Unverified prerequisites for {code} must include TODO: confirm')
    return data


def load_courses() -> list:
    return list(load_course_catalog()['courses'])


def _build_search_blob(course: dict) -> str:
    codes = [course['code'], *course.get('cross_listed', [])]
    variants = []
    for c in codes:
        variants.append(c)
        variants.append(c.replace(' ', ''))
        variants.append(c.replace(' ', '-'))
    parts = [
        *variants,
        course.get('title', ''),
        course.get('unit', ''),
        course.get('group', ''),
        ' '.join(course.get('programs', [])),
        ' '.join(course.get('tracks', [])),
        course.get('prerequisites', ''),
        course.get('permission_route', ''),
        course.get('notes', ''),
    ]
    return ' '.join(p for p in parts if p)


def _render_course_row(course: dict, include_id: bool = True, row_class: str = 'course-row') -> str:
    code = course['code']
    slug = slugify_code(code)
    cross = course.get('cross_listed', [])
    cross_html = (
        f'<span class="course-meta">Cross-listed: {e(", ".join(cross))}</span>'
        if cross else ''
    )
    unit_html = f'<span class="course-meta">Offering unit: {e(course["unit"])}</span>'
    programs_str = ', '.join(course['programs'])
    tracks_str = ', '.join(course['tracks'])
    notes = course.get('notes', '')
    notes_html = f'<span class="course-meta">{e(notes)}</span>' if notes else ''
    if course['prereq_verified']:
        prereq_badge = '<span class="course-badge-verified">Verified catalog rule</span>'
    else:
        prereq_badge = '<span class="course-badge-verify">Verify live</span>'
    search_blob = _build_search_blob(course)
    id_attr = f' id="course-{e(slug)}"' if include_id else ''
    data_attrs = (
        f'data-course-code="{e(code)}" '
        f'data-programs="{e("|".join(course["programs"]))}" '
        f'data-tracks="{e("|".join(course["tracks"]))}" '
        f'data-group="{e(course["group"])}" '
        f'data-unit="{e(course["unit"])}" '
        f'data-search="{e(search_blob)}"'
    )
    return (
        f'<tr class="{e(row_class)}"{id_attr} {data_attrs}>\n'
        f'<td><strong><a href="{e(course["course_url"])}">{e(code)} <span aria-hidden="true">↗</span></a></strong>'
        f'<br>{e(course["title"])} {cross_html} {unit_html}</td>\n'
        f'<td><strong>{e(programs_str)}</strong> <span class="course-meta">Track: {e(tracks_str)}</span></td>\n'
        f'<td><strong>{e(course["group"])}</strong> {notes_html}</td>\n'
        f'<td>{prereq_badge}<br>{e(course["prerequisites"])}</td>\n'
        f'<td><a href="{e(course["course_url"])}">Check course page <span aria-hidden="true">↗</span></a> · '
        f'<a href="https://courses.sci.pitt.edu/">SCI term schedule <span aria-hidden="true">↗</span></a> · '
        f'<a href="https://my.pitt.edu/">Verify seats in PeopleSoft <span aria-hidden="true">↗</span></a> '
        f'<span class="course-meta">{e(course["permission_route"])}</span></td>\n'
        f'</tr>\n'
    )


def render_program_tables(program: str) -> str:
    """Render 2026-2027 General and Biomedical Informatics curriculum tables for MS or PhD."""
    courses = [c for c in load_courses() if program in c['programs']]
    general_courses = [c for c in courses if 'General' in c['tracks']]
    bmi_courses = [c for c in courses if 'Biomedical Informatics' in c['tracks']]

    def build_table(subset: list, aria_label: str) -> str:
        rows = ''.join(_render_course_row(c, include_id=False, row_class='program-course-row') for c in subset)
        return (
            f'<div class="table-wrap" role="region" aria-label="{e(aria_label)}" tabindex="0" style="overflow-x:auto">'
            f'<table><thead><tr>'
            f'<th scope="col">Course &amp; catalog link</th>'
            f'<th scope="col">Degree &amp; track</th>'
            f'<th scope="col">Requirement group &amp; 2026–2027 notes</th>'
            f'<th scope="col">Prerequisites &amp; enrollment plan</th>'
            f'<th scope="col">Live schedule &amp; permission route</th>'
            f'</tr></thead><tbody>{rows}</tbody></table></div>'
        )

    if program == 'MS':
        return (
            '<h3>General Intelligent Systems Track — 2026–2027 MS courses (30 credits)</h3>'
            '<p>Complete <strong>3 Core courses (9 credits)</strong> — required <strong>INFSCI 2440 / ISSP 2440 (Artificial Intelligence)</strong> plus <strong>two additional core courses</strong> from <strong>ISSP 2071 (Human Language Technologies)</strong>, <strong>INFSCI 2595 (Machine Learning)</strong>, <strong>ISSP 2180 / CS 2770 (Computer Vision)</strong>, <strong>ISSP 2130 / INFSCI 2140 (Information Storage and Retrieval)</strong>, or <strong>INFSCI 2160 (Data Mining)</strong> — along with <strong>3 Theory courses (9 credits)</strong> (at least 1 Statistics, at least 1 Computation &amp; Algorithms, and 1 additional course from either Theory list) and <strong>4 Approved Advanced Courses (12 credits)</strong>.</p>'
            + build_table(general_courses, '2026-2027 MS General Intelligent Systems Track courses and prerequisites')
            + '<h3>Biomedical Informatics Track — 2026–2027 MS courses (30 credits)</h3>'
            '<p>Complete the Biomedical Informatics core sequence (<strong>ISSP 2083 / BIOINF 2032</strong>, <strong>ISSP 2016 / BIOINF 2070</strong>, <strong>BIOINF 2105</strong>, and two additional BMI core selections), an AI/ML/NLP/CV core course, Theory requirements in Statistics and Algorithms, and approved advanced electives.</p>'
            + build_table(bmi_courses, '2026-2027 MS Biomedical Informatics Track courses and prerequisites')
        )
    if program == 'PhD':
        return (
            '<h3>General Intelligent Systems Track &amp; first-year sequence — 2026–2027 PhD courses (72 credits)</h3>'
            '<p>Complete the first-year preliminary research sequence (<strong>ISSP 2020</strong>, <strong>INFSCI 3005 / CS 2001</strong>, and <strong>ISSP 2030</strong>), <strong>ISSP 2160 / CS 2710 (Foundations of Artificial Intelligence)</strong> plus two additional core courses (<code>TODO: confirm</code> exact 2026–2027 PhD General Track Core &ldquo;choose two&rdquo; list against <a href="https://catalog.upp.pitt.edu/preview_program.php?catoid=242&amp;poid=80372&amp;returnto=27720">2026–2027 PhD catalog catoid=242 ↗</a>), <strong>3 Theory courses (9 credits)</strong> (at least 1 Statistics, at least 1 Computation &amp; Algorithms, and 1 additional Theory course), approved 2000- and 3000-level advanced courses, and doctoral dissertation research (<strong>ISSP 3000</strong>, <strong>FTDJ 0000</strong>, <strong>SMSJ 0000</strong>).</p>'
            + build_table(general_courses, '2026-2027 PhD General Intelligent Systems Track courses and prerequisites')
            + '<h3>Biomedical Informatics Track — 2026–2027 PhD courses (72 credits)</h3>'
            '<p>Complete the Biomedical Informatics doctoral core (<strong>ISSP 2083 / BIOINF 2032</strong>, <strong>ISSP 2016 / BIOINF 2070</strong>, <strong>ISSP 2160 / CS 2710</strong>, two additional BMI core selections, and the 3-credit teaching practicum <strong>BIOINF 3998</strong>), first-year preliminary research sequence, Theory requirements in Statistics and Computation/Algorithms, and doctoral research milestones.</p>'
            + build_table(bmi_courses, '2026-2027 PhD Biomedical Informatics Track courses and prerequisites')
        )
    raise ValueError(f'Unsupported program: {program}')


def render() -> str:
    catalog = load_course_catalog()
    courses = list(load_courses())
    edition = catalog['catalog_edition']
    last_verified = catalog['last_verified']
    ms_cat = catalog['catalog_urls']['ms']
    phd_cat = catalog['catalog_urls']['phd']
    links = catalog['live_links']
    rows_html = ''.join(_render_course_row(course) for course in courses)

    return f'''<nav class="page-jumps wrap" aria-label="On this page"><span>On this page ↓</span><a href="#live-availability">Live availability &amp; PeopleSoft</a><a href="#course-explorer">Filterable course catalog ({len(courses)})</a><a href="#catalog-changes">2026–2027 catalog updates</a><a href="#permission-numbers">Permission numbers &amp; cross-registration</a></nav>
<section class="section wrap course-directory" aria-labelledby="course-explorer">
<div class="notice" id="live-availability">
<strong>Catalog edition: {e(edition)} · Last verified: {e(last_verified)}.</strong> Static web pages cannot display real-time open seat counts or term-by-term section cancellations. Before requesting your advising hold release each semester, verify live section availability and enforced registration rules in the <a href="{e(links["sci_schedule"])}">SCI Term Course Schedule <span aria-hidden="true">↗</span></a>, the <a href="{e(links["sci_courses"])}">SCI Course Catalog <span aria-hidden="true">↗</span></a>, and <strong>PeopleSoft / HighPoint CX</strong> via <a href="{e(links["peoplesoft"])}">My Pitt <span aria-hidden="true">↗</span></a>. Where an individual course’s prerequisite is not yet published in the static archive, it is explicitly marked <code>Verify in SCI Course Catalog &amp; PeopleSoft (TODO: confirm)</code> rather than guessed.
</div>
<h2>How to verify live classes offered and seats before registration</h2>
<div class="funding-grid">
<div class="funding-card">
<div><p class="eyebrow">Step 1 · SCI term schedules</p><h3>Check SCI classes offered</h3><p>Open the live School of Computing and Information schedule to see which graduate sections are offered in the upcoming Fall, Spring, or Summer term and review official course descriptions.</p></div>
<p><a href="{e(links["sci_schedule"])}">Open live SCI term schedule <span aria-hidden="true">↗</span></a><br><a href="{e(links["sci_courses"])}">Browse SCI course descriptions <span aria-hidden="true">↗</span></a></p>
</div>
<div class="funding-card">
<div><p class="eyebrow">Step 2 · PeopleSoft / HighPoint CX</p><h3>Verify open seats &amp; enforced prerequisites</h3><p>Sign in to My Pitt and open <strong>PeopleSoft / HighPoint CX → Class Search / Browse Catalog</strong> to check real-time seat availability, meeting times, and enforced registration prerequisites across SCI, Public Health, Medicine, and Dietrich.</p></div>
<p><a href="{e(links["peoplesoft"])}">Sign in to My Pitt (PeopleSoft) <span aria-hidden="true">↗</span></a><br><a href="resources.html#registration">How to lift your advising hold <span aria-hidden="true">→</span></a></p>
</div>
<div class="funding-card">
<div><p class="eyebrow">Step 3 · 2026–2027 Pitt Catalog (catoid=242)</p><h3>Confirm degree requirements</h3><p>Compare your Academic Advising Report (AAR) against the official 2026–2027 University of Pittsburgh Graduate Catalog and the MS and PhD requirement tables on this site.</p></div>
<p><a href="{e(ms_cat)}">2026–2027 MS Catalog (catoid=242) <span aria-hidden="true">↗</span></a><br><a href="{e(phd_cat)}">2026–2027 PhD Catalog (catoid=242) <span aria-hidden="true">↗</span></a></p>
</div>
</div>
<div class="req-actions">
<a class="button" href="academics.html#requirements">Degree requirements overview <span aria-hidden="true">→</span></a>
<a class="button button-secondary" href="ms.html#requirements">MS curriculum &amp; requirements (30 cr.) <span aria-hidden="true">→</span></a>
<a class="button button-secondary" href="phd.html#requirements">PhD curriculum &amp; requirements (72 cr.) <span aria-hidden="true">→</span></a>
<a class="button button-secondary" href="funding.html">Scholarships &amp; funding <span aria-hidden="true">→</span></a>
</div>

<h2 id="course-explorer">2026–2027 ISP courses and prerequisites explorer</h2>
<p>All {len(courses)} required core, theory, biomedical informatics, first-year research, and approved advanced elective courses for the MS and PhD in Intelligent Systems are listed below. Filter by degree program, track, requirement group, or course code/keyword (hyphenated codes such as <code>ISSP-2170</code> match <code>ISSP 2170</code>).</p>
<form class="course-controls" id="course-filters" role="search" aria-label="Filter courses">
<div class="course-search"><label for="course-search">Search course code, title, or prerequisite</label><input type="search" id="course-search" name="q" placeholder="Try ISSP 2071, ISSP-2170, BIOST 2142, or machine learning" autocomplete="off"></div>
<div><label for="course-degree">Degree program</label><select id="course-degree" name="degree"><option value="">All degrees (MS &amp; PhD)</option><option value="MS">MS (Master of Science)</option><option value="PhD">PhD (Doctor of Philosophy)</option></select></div>
<div><label for="course-track">Curriculum track</label><select id="course-track" name="track"><option value="">All tracks</option><option value="General">General</option><option value="Biomedical Informatics">Biomedical Informatics</option></select></div>
<div><label for="course-group">Requirement group</label><select id="course-group" name="group"><option value="">All requirement groups</option><option value="Core">Core</option><option value="Theory — Statistics">Theory — Statistics</option><option value="Theory — Computation &amp; Algorithms">Theory — Computation &amp; Algorithms</option><option value="Biomedical Informatics Core">Biomedical Informatics Core</option><option value="Approved Advanced Courses">Approved Advanced Courses (Electives)</option><option value="First-Year &amp; Research">First-Year &amp; Research</option></select></div>
<button type="button" id="course-reset">Reset filters</button>
</form>
<div class="directory-status"><p id="course-count" role="status" aria-live="polite" aria-atomic="true">Showing all {len(courses)} courses ({e(edition)} catalog edition · Last verified {e(last_verified)})</p><a href="#permission-numbers">Need a permission number? ↓</a></div>
<noscript><p>All {len(courses)} curriculum courses and prerequisite details are listed in the table below. Use your browser’s Find command to search by course code or title; all links work without JavaScript.</p></noscript>
<div id="course-empty" class="notice" hidden>
<p id="course-empty-message"><strong>No courses match these filters.</strong> Check the course code or clear one or more filters to view all 2026–2027 ISP courses.</p>
<button type="button" id="course-empty-reset">Reset all course filters</button>
</div>
<div class="table-wrap" role="region" aria-label="ISP courses and prerequisites" tabindex="0" style="overflow-x:auto">
<table id="course-table">
<thead>
<tr>
<th scope="col">Course &amp; live catalog link</th>
<th scope="col">Degree &amp; track</th>
<th scope="col">Requirement group &amp; 2026–2027 role</th>
<th scope="col">Prerequisites &amp; enrollment plan</th>
<th scope="col">Term availability &amp; permission route</th>
</tr>
</thead>
<tbody id="course-results">{rows_html}</tbody>
</table>
</div>

<div class="prose" id="catalog-changes">
<h2>2026–2027 catalog updates &amp; open verification items</h2>
<p>This course explorer reconciles the legacy ISP website and 2026 MS/PhD program guides against the official <strong>2026–2027 University of Pittsburgh Graduate Catalog (<code>catoid=242</code>)</strong>:</p>
<p><strong>1. MS General Track Core update (Human Language Technologies):</strong> In the 2026–2027 MS catalog (<code>catoid=242&amp;poid=80371</code>), <strong>Human Language Technologies</strong> replaces the older Introductory Natural Language Processing listing in the MS General Track Core &ldquo;choose two&rdquo; options, while Introductory Natural Language Processing remains an Approved Advanced Course for both MS and PhD students.</p>
<p><strong>2. Theory — Statistics update (Applied Regression Analysis):</strong> In the 2026–2027 MS and PhD catalogs (<code>catoid=242</code>), <strong>Applied Regression Analysis</strong> in Biostatistics replaces the older Introductory Statistical Methods 2 listing in the Theory — Statistics &ldquo;choose one&rdquo; requirement group.</p>
<p><strong>3. Six new 2026–2027 Approved Advanced Courses:</strong> The 2026–2027 catalog adds graduate electives in <strong>Introduction to Deep Learning</strong>, <strong>Network Science and Analysis</strong>, <strong>FATE: Fairness, Accountability, Transparency, and Ethics in AI</strong>, <strong>Applied Legal Data Analytics and AI</strong>, <strong>Principles of Data Mining</strong>, and (for PhD students) <strong>Advanced Topics in Data Mining: Social and Heterogeneous Graph Mining</strong>.</p>
<p><strong>4. Items flagged for advisor / administrator confirmation (<code>TODO: confirm</code>):</strong> Confirm with ISP Program Administrator <a href="mailto:hld46@pitt.edu">Heidi Davis (hld46@pitt.edu)</a> whether the 2026–2027 PhD General Track Core &ldquo;choose two&rdquo; list also incorporates Human Language Technologies alongside Machine Learning, Natural Language Processing, and Computer Vision (<code>TODO: confirm</code>); confirm MS enrollment plan eligibility for Computer Vision in PeopleSoft (<code>TODO: confirm</code>); and confirm whether SCI prefers permission requests via <a href="{e(links["sci_permission"])}">courses.sci.pitt.edu/permission <span aria-hidden="true">↗</span></a> or the <a href="{e(links["sci_permission_qualtrics"])}">SCI Permission Qualtrics form <span aria-hidden="true">↗</span></a> (<code>TODO: confirm</code>).</p>
</div>

<div class="prose" id="permission-numbers">
<h2>Permission numbers, outside-SCI contacts &amp; cross-registration</h2>
<p>Some curriculum courses are administered by other SCI departments or other schools at Pitt and carry degree-plan restrictions (such as Computer Science, Computer Engineering, or Biomedical Informatics). When PeopleSoft shows a plan restriction or department consent requirement, follow these steps:</p>
<p><strong>1. Request written instructor approval first:</strong> Email the course instructor to request enrollment permission, and include your <strong>7-digit PeopleSoft ID</strong> and the <strong>5-digit class number</strong> from PeopleSoft.</p>
<p><strong>2. SCI courses (including Full-Time Dissertation Study and Summer Milestone Study):</strong> Submit your instructor approval email through the <a href="{e(links["sci_permission"])}">SCI Permission Number Request portal <span aria-hidden="true">↗</span></a> or the <a href="{e(links["sci_permission_qualtrics"])}">SCI Permission Qualtrics Form <span aria-hidden="true">↗</span></a> (<code>TODO: confirm</code> current preferred SCI form with the ISP administrator).</p>
<p><strong>3. Courses outside SCI (confirm current departmental contacts):</strong> For <strong>Biomedical Informatics</strong> courses, contact Toni Porterfield with instructor approval, your 7-digit PeopleSoft ID, and the 5-digit class number. For <strong>Statistics</strong> courses, submit the Department of Statistics permission form selecting &ldquo;Department Consent Required&rdquo; with instructor approval attached. For <strong>Health Informatics</strong>, contact Lori Kieffer and Mel Newcity; for the <strong>School of Law</strong>, contact Jaime Horensky; for <strong>Linguistics</strong>, contact Amber L. Fontenot (<a href="mailto:alf164@pitt.edu">alf164@pitt.edu</a>) or Jennifer Ann Berkebile (<a href="mailto:JES379@pitt.edu">JES379@pitt.edu</a>).</p>
<p><strong>4. Course substitutions, transfer credits &amp; PCHE cross-registration (CMU and regional universities):</strong> Obtain written approval from your ISP faculty advisor and ISP Director <a href="people.html#person-peter-brusilovsky">Peter Brusilovsky</a> (copying <a href="mailto:hld46@pitt.edu">Heidi Davis</a>) <em>before</em> registering. See <a href="resources.html#permissions">permission number instructions →</a>, <a href="resources.html#substitutions">course substitutions &amp; transfer credits →</a>, and <a href="resources.html#pche">PCHE cross-registration →</a>.</p>
<p><a data-source-link href="https://www.isp.pitt.edu/academics/master-science-intelligent-systems">Official ISP MS curriculum page <span aria-hidden="true">↗</span></a> · <a data-source-link href="https://www.isp.pitt.edu/academics/doctor-philosophy-intelligent-systems">Official ISP PhD curriculum page <span aria-hidden="true">↗</span></a></p>
</div>
</section>'''


def write_page_fragment() -> Path:
    target = ROOT / 'src/pages/courses.html'
    target.write_text(render() + '\n')
    return target


if __name__ == '__main__':
    path = write_page_fragment()
    print(f'Wrote {path}')
