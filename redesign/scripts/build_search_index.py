"""Generate the static JSON site search index for the ISP website."""
from pathlib import Path
import json
import re

from render_courses import load_courses, slugify_code
from render_people import load_people
import snapshot_content

ROOT = Path(__file__).resolve().parents[1]


def _clean(text: str) -> str:
    return re.sub(r'\s+', ' ', (text or '')).strip()


def build_index() -> list:
    items = [
        {
            'id': 'page-academics-requirements',
            'title': 'Academics & Degree Requirements Overview (MS 30 credits & PhD 72 credits)',
            'url': 'academics.html#requirements',
            'category': 'Pages & Requirements',
            'keywords': 'academics degree requirements ms phd 30 credits 72 credits B- 3.0 QPA general track biomedical informatics track catoid=242 curriculum',
            'snippet': 'Compare the 30-credit Master of Science (MS) and 72-credit Doctor of Philosophy (PhD) degree requirements, General and Biomedical Informatics tracks, core and theory courses, and milestones.',
            'priority': 100,
        },
        {
            'id': 'page-ms-requirements',
            'title': 'Master of Science (MS) Degree Requirements & 2026–2027 Curriculum (30 Credits)',
            'url': 'ms.html#requirements',
            'category': 'Pages & Requirements',
            'keywords': 'ms master of science degree requirements 30 credits 10 courses B- 3.0 QPA INFSCI 2440 ISSP 2071 human language technologies BIOST 2142 ms project ISSP 2000 catoid=242',
            'snippet': '30-credit MS requirements: 3 Core courses (9 cr.), 3 Theory courses in Statistics and Computation/Algorithms (9 cr.), 4 Approved Advanced Courses (12 cr.), B-/3.0 QPA, and faculty-advised MS Project.',
            'priority': 98,
        },
        {
            'id': 'page-phd-requirements',
            'title': 'Doctor of Philosophy (PhD) Degree Requirements & 2026–2027 Curriculum (72 Credits)',
            'url': 'phd.html#requirements',
            'category': 'Pages & Requirements',
            'keywords': 'phd doctor of philosophy degree requirements 72 credits B- 3.0 QPA ISSP 2020 ISSP 2030 INFSCI 3005 ISSP 2160 preliminary exam comprehensive exam dissertation FTDJ SMSJ catoid=242',
            'snippet': '72-credit PhD requirements: first-year research sequence (ISSP 2020, INFSCI 3005, ISSP 2030), Core and Theory courses, Preliminary Exam, Comprehensive Exam, Dissertation, and ISP Forum attendance.',
            'priority': 98,
        },
        {
            'id': 'page-courses-explorer',
            'title': '2026–2027 ISP Courses, Prerequisites & Live PeopleSoft Schedule Verification',
            'url': 'courses.html',
            'category': 'Courses',
            'keywords': 'courses prerequisites classes offered peoplesoft highpoint cx sci schedule catoid=242 permission numbers ISSP 2071 BIOST 2142 ISSP 2170 INFSCI 2440',
            'snippet': 'Filter all 47 required and elective ISP courses for 2026–2027, review verified PREQ/PLAN rules, and check live term offerings and open seats in the SCI Schedule and PeopleSoft.',
            'priority': 100,
        },
        {
            'id': 'page-funding-overview',
            'title': 'Scholarships, Fellowships & Funding — Graduate Financial Aid & Travel Grants',
            'url': 'funding.html',
            'category': 'Funding & Aid',
            'keywords': 'scholarships funding financial aid fellowships assistantships phd ms pitt2pitt gsr gsa sci predoctoral provost baranger dbmi travel grant stipend tuition',
            'snippet': 'Explore PhD fellowships (SCI Predoctoral, Provost, GSR, Summer GSA, Baranger, DBMI), MS scholarships (Pitt2Pitt up to $7,500/yr, SCI King/Howard/Smith, PittFund$Me), and $750–$1,000 travel grants.',
            'priority': 100,
        },
        {
            'id': 'page-funding-phd',
            'title': 'PhD Fellowships, Graduate Research Assistantships (GSR) & Training Grants',
            'url': 'funding.html#phd-funding',
            'category': 'Funding & Aid',
            'keywords': 'phd funding sci predoctoral fellowship provost predoctoral fellowship gsr graduate research assistantship summer gsa elizabeth baranger dissertation completion dbmi training grant',
            'snippet': 'Incoming PhD applicants are automatically considered for SCI Predoctoral Fellowships. Learn about GSR appointments with ISP faculty PIs, Provost Fellowships, Summer GSA, Baranger, and DBMI funding.',
            'priority': 96,
        },
        {
            'id': 'page-funding-ms',
            'title': 'MS Scholarships, Pitt2Pitt ($7,500/year) & SCI Graduate Awards',
            'url': 'funding.html#ms-funding',
            'category': 'Funding & Aid',
            'keywords': 'ms funding scholarships pitt2pitt $7,500 $3,750 sci graduate scholarships barbara king rusty howard jerry cathy smith pittfund$me master of science financial aid',
            'snippet': 'MSISP participates in the Pitt2Pitt Scholarship (up to $7,500/year full-time or $3,750/year part-time for Pitt alumni), plus SCI endowed scholarships (King, Howard, Smith) and PittFund$Me.',
            'priority': 96,
        },
        {
            'id': 'page-funding-travel',
            'title': 'ISP Student Conference Travel Grants ($750–$1,000/year)',
            'url': 'funding.html#travel-grants',
            'category': 'Funding & Aid',
            'keywords': 'travel grant conference travel $750 $1,000 reimbursement bobbie coyne bjc134 paper poster acceptance supplemental travel',
            'snippet': 'Active MS and PhD students presenting an accepted paper or poster at an AI conference can apply at least 1 month in advance for $750–$1,000 per academic year in travel support.',
            'priority': 96,
        },
        {
            'id': 'page-faculty-explorer',
            'title': 'Faculty Explorer — Search ISP Faculty & Researchers by Name or Topic (AI, NLP, ML, CV, HCI)',
            'url': 'people.html',
            'category': 'Faculty & People',
            'keywords': 'faculty explorer people directory artificial intelligence ai machine learning ml natural language processing nlp computer vision cv human computer interaction hci biomedical informatics advisors',
            'snippet': 'Search ISP faculty, graduate students, staff, and alumni by partial name or research area (AI, NLP, ML, Computer Vision, HCI, Biomedical Informatics, Education, Law).',
            'priority': 99,
        },
        {
            'id': 'page-admissions',
            'title': 'Graduate Admissions & Application Steps (MS & PhD)',
            'url': 'admissions.html',
            'category': 'Pages & Requirements',
            'keywords': 'admissions apply application deadlines requirements materials sciadmit@pitt.edu january 15 financial aid',
            'snippet': 'Step-by-step application guide for prospective MS and PhD students in Intelligent Systems, including materials, funding deadlines, and SCI admissions contact information.',
            'priority': 92,
        },
        {
            'id': 'page-resources',
            'title': 'Student Resources, Registration, Advising Holds & Policies',
            'url': 'resources.html',
            'category': 'Student Guides',
            'keywords': 'student resources registration advising hold permission numbers peoplesoft aar academic advising report substitutions transfer credits pche graduation heidi davis',
            'snippet': 'Practical guides for lifting advising holds, requesting SCI and outside-SCI permission numbers, retrieving your AAR in PeopleSoft, PCHE cross-registration, and graduation.',
            'priority': 94,
        },
        {
            'id': 'guide-registration-hold',
            'title': 'How to Lift an Advising Hold Before Registration',
            'url': 'resources.html#registration',
            'category': 'Student Guides',
            'keywords': 'lift advising hold registration enroll classes advisor approval heidi davis hld46@pitt.edu peoplesoft',
            'snippet': 'Discuss your term course selection with your ISP faculty advisor and email Heidi Davis (hld46@pitt.edu) with your advisor’s written approval to lift your advising hold.',
            'priority': 90,
        },
        {
            'id': 'guide-permission-numbers',
            'title': 'How to Request a Course Permission Number (SCI & Outside-SCI Courses)',
            'url': 'resources.html#permissions',
            'category': 'Student Guides',
            'keywords': 'permission number instructor approval 7-digit peoplesoft id 5-digit class number courses.sci.pitt.edu/permission qualtrics bioinformatics statistics linguistics law FTDJ SMSJ',
            'snippet': 'Obtain written instructor approval first, then submit your 7-digit PeopleSoft ID and 5-digit class number through the SCI Permission portal or outside-SCI department contact.',
            'priority': 91,
        },
        {
            'id': 'guide-aar',
            'title': 'Retrieve Your Academic Advising Report (AAR) in PeopleSoft / HighPoint CX',
            'url': 'resources.html#aar',
            'category': 'Student Guides',
            'keywords': 'academic advising report aar peoplesoft highpoint cx my pitt degree progress view pdf graduation review',
            'snippet': 'Sign in to My Pitt, open PeopleSoft / HighPoint CX → Academics → Degree Progress → View PDF to check your Academic Advising Report.',
            'priority': 88,
        },
        {
            'id': 'guide-substitutions',
            'title': 'Course Substitutions and Transfer Credits',
            'url': 'resources.html#substitutions',
            'category': 'Student Guides',
            'keywords': 'course substitution waiver transfer credits transfer request form peter brusilovsky heidi davis scirecords@pitt.edu',
            'snippet': 'Obtain written permission from your advisor and ISP Director Peter Brusilovsky before registering for a substitute course, or submit the Transfer Request Form for transfer credits.',
            'priority': 86,
        },
        {
            'id': 'guide-travel-grants',
            'title': 'Student Resources: Travel Grants ($750–$1,000) and Research Computing (CRCD)',
            'url': 'resources.html#travel-grants',
            'category': 'Student Guides',
            'keywords': 'travel grant $750 $1,000 conference reimbursement bobbie coyne research computing crcd scitech@pitt.edu',
            'snippet': 'Apply at least 1 month before an AI conference for $750–$1,000 in travel support, or request a sponsored account with Pitt’s Center for Research Computing and Data (CRCD).',
            'priority': 89,
        },
        {
            'id': 'guide-change-advisor',
            'title': 'How to Change Your ISP Faculty Advisor',
            'url': 'resources.html#change-advisor',
            'category': 'Student Guides',
            'keywords': 'change advisor graduate change of advisor form pdf faculty advisor heidi davis',
            'snippet': 'Obtain approval from your prospective ISP faculty advisor and submit the Graduate Change of Advisor form (PDF), copying Heidi Davis.',
            'priority': 85,
        },
        {
            'id': 'guide-pche',
            'title': 'Take a Course at CMU or Another University (PCHE Cross-Registration)',
            'url': 'resources.html#pche',
            'category': 'Student Guides',
            'keywords': 'pche cross-registration carnegie mellon university cmu duquesne regional universities',
            'snippet': 'Full-time graduate students can cross-register at Carnegie Mellon University (CMU) and other PCHE institutions with prior approval from their advisor and the ISP Director.',
            'priority': 87,
        },
        {
            'id': 'page-about',
            'title': 'About the Intelligent Systems Program (ISP)',
            'url': 'about.html',
            'category': 'Pages & Requirements',
            'keywords': 'about isp history multidisciplinary artificial intelligence school of computing and information sennott square contacts',
            'snippet': 'Learn about the Intelligent Systems Program at the University of Pittsburgh, a multidisciplinary graduate community uniting AI and biomedical informatics.',
            'priority': 82,
        },
        {
            'id': 'page-research',
            'title': 'ISP Research Areas & Multidisciplinary AI Labs',
            'url': 'research.html',
            'category': 'Research',
            'keywords': 'research areas labs machine learning natural language processing biomedical informatics intelligent tutoring computer vision',
            'snippet': 'Explore applied artificial intelligence research groups across machine learning, natural language processing, biomedical informatics, intelligent tutoring, and computer vision.',
            'priority': 88,
        },
        {
            'id': 'page-events',
            'title': 'ISP Events, Seminars & Alternating Friday Forums',
            'url': 'events.html',
            'category': 'Research',
            'keywords': 'events isp forum seminars talks 5317 sennott square fridays',
            'snippet': 'Research talks, ISP Forums (alternating Fridays, 12:30–1:30 p.m. in 5317 Sennott Square), and opportunities to connect.',
            'priority': 80,
        },
        {
            'id': 'page-news',
            'title': 'ISP News, Awards & Community Updates',
            'url': 'news.html',
            'category': 'Research',
            'keywords': 'news awards publications fellowships announcements community updates',
            'snippet': 'Recent faculty and graduate student research highlights, fellowship awards, and community news from the Intelligent Systems Program.',
            'priority': 80,
        },
    ]

    # Index all 47 courses from courses.json
    for course in load_courses():
        code = course['code']
        slug = slugify_code(code)
        cross = ', '.join(course.get('cross_listed', []))
        code_variants = [
            code,
            code.replace(' ', ''),
            code.replace(' ', '-'),
            *[c for c in course.get('cross_listed', [])],
            *[c.replace(' ', '-') for c in course.get('cross_listed', [])],
        ]
        title_str = f'{code}: {course["title"]}' + (f' (Cross-listed: {cross})' if cross else '')
        items.append({
            'id': f'course-{slug}',
            'title': title_str,
            'url': f'courses.html#course-{slug}',
            'category': 'Courses',
            'keywords': _clean(
                ' '.join([
                    *code_variants,
                    course['title'],
                    course['unit'],
                    course['group'],
                    ' '.join(course['programs']),
                    ' '.join(course['tracks']),
                    course['prerequisites'],
                    course['permission_route'],
                    course.get('notes', ''),
                    'course prerequisite schedule peoplesoft',
                ])
            ),
            'snippet': _clean(
                f'{", ".join(course["programs"])} ({", ".join(course["tracks"])} Track) · {course["group"]}. '
                f'Prerequisites: {course["prerequisites"]}'
            ),
            'priority': 90 if course['group'] == 'Core' else 84,
        })

    # Index all 190 people from people.json + people-facets.json
    for person in load_people():
        slug = person['slug']
        name = person['name']
        cats = ', '.join(person['categories'])
        is_faculty = 'Faculty' in person['categories']
        topics_list = person.get('topics', [])
        schools_list = person.get('schools', [])
        depts_list = person.get('departments', [])
        role_str = person.get('role', '') or cats
        summary_parts = [
            f'{cats}.',
            role_str,
            f'Schools: {"; ".join(schools_list)}.' if schools_list else '',
            f'Research topics: {", ".join(topics_list)}.' if topics_list else '',
            person.get('interests', ''),
            person.get('research_summary', ''),
        ]
        snippet = _clean(' '.join(p for p in summary_parts if p))[:260]
        items.append({
            'id': f'person-{slug}',
            'title': f'{name} — {cats}',
            'url': f'people.html#person-{slug}',
            'category': 'Faculty & People',
            'keywords': _clean(
                ' '.join([
                    name,
                    cats,
                    person.get('role', ''),
                    ' '.join(schools_list),
                    ' '.join(depts_list),
                    ' '.join(topics_list),
                    person.get('interests', ''),
                    person.get('research_summary', ''),
                    person.get('bio', ''),
                ])
            ),
            'snippet': snippet or f'{name} ({cats}) in the ISP Faculty Explorer.',
            'priority': 88 if is_faculty else 64,
        })

    # Index imported research group, event, and news pages
    for record in snapshot_content.manifest():
        parent = record.get('parent', '')
        slug = record['slug']
        title = record['title']
        summary = _clean(record.get('summary', ''))
        if parent == 'research':
            cat = 'Research'
            prio = 83
        elif parent in ('news', 'events'):
            cat = 'Research'
            prio = 68
        else:
            cat = 'Pages & Requirements'
            prio = 65
        items.append({
            'id': f'imported-{slug}',
            'title': title,
            'url': f'{slug}.html',
            'category': cat,
            'keywords': _clean(f'{title} {parent} {summary}'),
            'snippet': summary or f'{title} ({parent.title()} archive page).',
            'priority': prio,
        })

    return items


def write_search_index() -> Path:
    items = build_index()
    target = ROOT / 'assets/search-index.json'
    payload = {
        'version': '2026-2027',
        'count': len(items),
        'items': items,
    }
    target.write_text(json.dumps(payload, indent=2) + '\n')
    return target


if __name__ == '__main__':
    path = write_search_index()
    print(f'Wrote {path}')
