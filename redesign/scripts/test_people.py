"""Directory regressions: identity, provenance, escaping and no-JavaScript access."""
import json
from pathlib import Path
import unittest
from unittest.mock import patch

from render_people import load_people, render
from snapshot_content import Tree

ROOT = Path(__file__).resolve().parents[1]


class PeopleTests(unittest.TestCase):
    def test_enrichment_preserves_all_original_people_and_identity(self):
        original = json.loads((ROOT / 'src/people.json').read_text())
        merged = list(load_people())
        self.assertEqual(len(original), len(merged))
        self.assertEqual(len({p['slug'] for p in merged}), len(merged))
        for before, after in zip(original, merged):
            for key in ('slug', 'name', 'source', 'email', 'image', 'categories'):
                self.assertEqual(before.get(key), after.get(key))

    def test_faculty_browse_labels_have_sources_and_missing_data_stays_empty(self):
        for person in load_people():
            if 'Faculty' in person['categories']:
                self.assertTrue(person['schools'], person['name'])
                self.assertTrue(person['sources'], person['name'])
            else:
                self.assertEqual(person['schools'], [])
                self.assertEqual(person['topics'], [])
        # No expertise is invented for a profile without research information.
        hatice = next(p for p in load_people() if p['slug'] == 'hatice-osmanbeyoglu')
        self.assertEqual(hatice['topics'], [])

    def test_all_profiles_and_contacts_work_without_javascript(self):
        nodes = list(Tree(render()).root.walk())
        cards = [n for n in nodes if n.tag == 'article']
        self.assertEqual(len(cards), len(list(load_people())))
        for card in cards:
            self.assertNotIn('hidden', card.attrs)
            self.assertTrue(any(n.tag == 'summary' for n in card.walk()))
            self.assertTrue(any(n.tag == 'a' and n.attrs.get('href', '').startswith('https://www.isp.pitt.edu/people/') for n in card.walk()))

    def test_source_text_cannot_inject_markup_or_attributes(self):
        person = next(load_people())
        person.update(name='A <script>bad()</script> " & name', bio='<img src=x onerror=bad()>', topics=['A " topic'])
        with patch('render_people.load_people', return_value=iter([person])):
            output = render()
        self.assertIn('&lt;script&gt;', output)
        self.assertIn('&lt;img', output)
        self.assertIn('A &quot; topic', output)
        self.assertNotIn('<script>', output)
        self.assertNotIn('<img src=x', output)

    def test_home_shortcuts_point_to_visible_sections(self):
        nodes = list(Tree((ROOT / 'index.html').read_text()).root.walk())
        jump_nav = next(n for n in nodes if n.attrs.get('aria-label') == 'On this page')
        targets = {n.attrs['id'] for n in nodes if n.tag == 'section' and 'id' in n.attrs}
        links = [n.attrs['href'] for n in jump_nav.walk() if n.tag == 'a']
        self.assertEqual(len(links), 4)
        self.assertTrue(all(link.removeprefix('#') in targets for link in links))

    def test_all_core_pages_have_on_this_page_jump_indicators_pointing_to_valid_ids(self):
        core_pages = [
            'index', 'about', 'academics', 'admissions', 'ms', 'phd',
            'people', 'research', 'events', 'news', 'resources',
        ]
        for slug in core_pages:
            with self.subTest(page=slug):
                nodes = list(Tree((ROOT / f'{slug}.html').read_text()).root.walk())
                jump_nav = next((n for n in nodes if n.attrs.get('aria-label') == 'On this page'), None)
                self.assertIsNotNone(jump_nav, f'{slug}.html is missing On this page jump bar')
                ids = {n.attrs['id'] for n in nodes if 'id' in n.attrs}
                links = [n.attrs.get('href', '') for n in jump_nav.walk() if n.tag == 'a']
                self.assertGreaterEqual(len(links), 2, f'{slug}.html should have at least 2 jump links')
                for link in links:
                    self.assertTrue(link.startswith('#'), f'{slug}.html jump link {link} must be a fragment')
                    self.assertIn(link.removeprefix('#'), ids, f'{slug}.html missing target {link}')

    def test_people_directory_has_hidden_content_indicators_and_category_counts(self):
        markup = render()
        nodes = list(Tree(markup).root.walk())
        self.assertTrue(any(n.attrs.get('id') == 'people-hidden-banner' for n in nodes))
        cat_select = next(n for n in nodes if n.attrs.get('id') == 'people-category')
        options = [n.text() for n in cat_select.walk() if n.tag == 'option']
        self.assertTrue(any('All people (' in opt for opt in options))
        self.assertTrue(any('Faculty (' in opt for opt in options))
        summaries = [n for n in nodes if n.tag == 'span' and n.attrs.get('class') == 'summary-meta']
        self.assertEqual(len(summaries), len(list(load_people())))
        self.assertTrue(all(s.text().startswith('Includes:') for s in summaries))


if __name__ == '__main__':
    unittest.main()
