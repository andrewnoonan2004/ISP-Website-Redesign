"""Unit tests for 2026-2027 courses, prerequisites, degree requirements, and scholarships/funding."""
import json
from pathlib import Path
import unittest

import render_courses
from snapshot_content import Tree

ROOT = Path(__file__).resolve().parents[1]


class CoursesAndFundingTests(unittest.TestCase):
    def test_course_catalog_schema_and_2026_2027_updates(self):
        catalog = render_courses.load_course_catalog()
        self.assertEqual(catalog['catalog_edition'], '2026-2027')
        self.assertIn('catoid=242', catalog['catalog_urls']['ms'])
        self.assertIn('catoid=242', catalog['catalog_urls']['phd'])
        courses = {c['code']: c for c in catalog['courses']}
        self.assertGreaterEqual(len(courses), 45)
        for required_code in (
            'ISSP 2071', 'BIOST 2142', 'INFSCI 2440', 'INFSCI 2595',
            'ISSP 2160', 'ISSP 2170', 'ISSP 2180', 'ISSP 2130', 'INFSCI 2160',
            'CS 2150', 'INFSCI 2591', 'ISSP 2083', 'ISSP 2016', 'BIOINF 2105',
            'ISSP 2020', 'ISSP 2030', 'INFSCI 3005', 'ISSP 2078', 'ISSP 2125',
            'ISSP 2185', 'ISSP 2419', 'ISSP 2756', 'ISSP 2165',
        ):
            self.assertIn(required_code, courses, f'Missing 2026-2027 course {required_code}')
        self.assertEqual(courses['ISSP 2071']['group'], 'Core')
        self.assertIn('MS', courses['ISSP 2071']['programs'])
        self.assertEqual(courses['BIOST 2142']['group'], 'Theory — Statistics')

    def test_verified_prerequisites_and_todo_confirm_discipline(self):
        courses = {c['code']: c for c in render_courses.load_courses()}
        self.assertTrue(courses['INFSCI 2440']['prereq_verified'])
        self.assertIn('PREQ:', courses['INFSCI 2440']['prerequisites'])
        self.assertTrue(courses['ISSP 2170']['prereq_verified'])
        self.assertIn('PLAN:', courses['ISSP 2170']['prerequisites'])
        self.assertTrue(courses['ISSP 3120']['prereq_verified'])
        self.assertIn('PREQ:', courses['ISSP 3120']['prerequisites'])
        self.assertTrue(courses['CS 2150']['prereq_verified'])
        self.assertIn('PLAN:', courses['CS 2150']['prerequisites'])
        for course in courses.values():
            self.assertTrue(course['course_url'].startswith('https://'))
            self.assertFalse(course['course_url'].startswith('http://'))
            if not course['prereq_verified']:
                self.assertIn('TODO: confirm', course['prerequisites'])

    def test_rendered_courses_page_includes_all_courses_and_live_verification_links(self):
        markup = render_courses.render()
        nodes = list(Tree(markup).root.walk())
        rows = [n for n in nodes if n.tag == 'tr' and n.attrs.get('class') == 'course-row']
        self.assertEqual(len(rows), len(render_courses.load_courses()))
        self.assertIn('https://courses.sci.pitt.edu/', markup)
        self.assertIn('https://my.pitt.edu/', markup)
        self.assertIn('https://courses.sci.pitt.edu/permission', markup)
        self.assertIn('catoid=242', markup)

    def test_academics_ms_phd_and_funding_pages_have_requirements_and_funding_sections(self):
        for slug in ('academics', 'ms', 'phd'):
            path = ROOT / f'{slug}.html'
            if not path.exists():
                continue
            markup = path.read_text()
            self.assertIn('id="requirements"', markup, f'{slug}.html missing #requirements')
            self.assertIn('courses.html', markup, f'{slug}.html missing link to courses.html')
            self.assertIn('funding.html', markup, f'{slug}.html missing link to funding.html')
            self.assertIn('catoid=242', markup, f'{slug}.html missing catoid=242 link')
        funding_path = ROOT / 'funding.html'
        if funding_path.exists():
            f_text = funding_path.read_text()
            for term in (
                'SCI Predoctoral', 'Provost Predoctoral', 'Pitt2Pitt',
                '$7,500', '$750', '$1,000', 'Baranger', 'DBMI', 'TODO: confirm',
            ):
                self.assertIn(term, f_text, f'funding.html missing {term}')


if __name__ == '__main__':
    unittest.main()
