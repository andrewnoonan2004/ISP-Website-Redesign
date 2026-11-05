"""Regression tests for source handoffs and generated navigation; no dependencies."""
import unittest
from pathlib import Path
from urllib.parse import urlsplit
import snapshot_content as content

ROOT = Path(__file__).resolve().parents[1]


def anchors(markup):
    return [node for node in content.Tree(markup).root.walk() if node.tag == 'a']


class NavigationTests(unittest.TestCase):
    def test_official_handoff_survives_while_browsing_link_is_local(self):
        markup = '''<a data-source-link href="https://www.isp.pitt.edu/admissions">Official admissions ↗</a>
        <a href="https://www.isp.pitt.edu/admissions">Browse admissions ↗</a>'''
        official, local = anchors(content.rewrite_body(markup))
        self.assertEqual(official.attrs['href'], 'https://www.isp.pitt.edu/admissions')
        self.assertEqual(local.attrs['href'], 'admissions.html')
        self.assertIn('↗', official.text())
        self.assertIn('→', local.text())

    def test_source_link_preserves_query_fragment_and_accessible_name(self):
        markup = '''<a class="button" href="https://www.isp.pitt.edu/research?topic=ai&amp;view=all#areas" data-source-link aria-label="Official research">Research <span aria-hidden="true">↗</span></a>'''
        result = anchors(content.rewrite_body(markup))[0]
        self.assertEqual(result.attrs['href'], 'https://www.isp.pitt.edu/research?topic=ai&view=all#areas')
        self.assertEqual(result.attrs['aria-label'], 'Official research')
        self.assertEqual(result.attrs['class'], 'button')

    def test_every_imported_page_has_its_own_external_source(self):
        for record in content.manifest():
            with self.subTest(page=record['slug']):
                markup = (ROOT / (record['slug'] + '.html')).read_text()
                sources = [a for a in anchors(markup) if 'data-source-link' in a.attrs]
                expected = content.BASE + record['source'][:-5]
                self.assertIn(expected, [a.attrs['href'] for a in sources])

    def test_generated_admissions_and_degree_handoffs_are_external(self):
        for slug in ['admissions', 'academics', 'ms', 'phd']:
            with self.subTest(page=slug):
                sources = [a for a in anchors((ROOT / f'{slug}.html').read_text()) if 'data-source-link' in a.attrs]
                self.assertTrue(sources)
                for source in sources:
                    self.assertEqual(urlsplit(source.attrs['href']).hostname, 'www.isp.pitt.edu')

    def test_home_research_shortcuts_have_distinct_existing_destinations(self):
        tree = content.Tree((ROOT / 'index.html').read_text()).root
        topics = next(n for n in tree.walk() if n.attrs.get('class') == 'research-list')
        destinations = [n.attrs['href'] for n in topics.walk() if n.tag == 'a']
        self.assertEqual(len(destinations), 5)
        self.assertEqual(len(set(destinations)), 5)
        for destination in destinations:
            self.assertTrue(destination.startswith('research--'))
            self.assertTrue((ROOT / destination).is_file())

    def test_research_lists_each_imported_group_once(self):
        destinations = [a.attrs.get('href') for a in anchors((ROOT / 'research.html').read_text())]
        for record in content.manifest():
            if record['parent'] == 'research':
                self.assertEqual(destinations.count(record['slug'] + '.html'), 1)

    def test_arrow_convention_and_contact_links(self):
        markup = '<a href="resources.html#permissions">Help ↗</a><a href="https://example.org">External →</a><a href="mailto:sciadmit@pitt.edu">Email ↗</a>'
        local, external, email = anchors(content.rewrite_body(markup))
        self.assertEqual(local.attrs['href'], 'resources.html#permissions')
        self.assertIn('→', local.text())
        self.assertIn('↗', external.text())
        self.assertNotIn('↗', email.text())


if __name__ == '__main__':
    unittest.main()
