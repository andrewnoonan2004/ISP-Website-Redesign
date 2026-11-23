"""Unit tests for the static site search index and search.html page."""
import json
from pathlib import Path
import unittest

import build_search_index

ROOT = Path(__file__).resolve().parents[1]


class SearchIndexTests(unittest.TestCase):
    def test_search_index_schema_categories_and_relative_urls(self):
        items = build_search_index.build_index()
        self.assertGreaterEqual(len(items), 250)
        seen_ids = set()
        categories = set()
        urls = set()
        for item in items:
            for key in ('id', 'title', 'url', 'category', 'keywords', 'snippet', 'priority'):
                self.assertIn(key, item)
            self.assertNotIn(item['id'], seen_ids, f'Duplicate search index id {item["id"]}')
            seen_ids.add(item['id'])
            url = item['url']
            self.assertFalse(url.startswith('/'), f'Search index URL must be relative: {url}')
            self.assertFalse(url.startswith('http://') or url.startswith('https://'), f'Search index URL must be local relative: {url}')
            categories.add(item['category'])
            urls.add(url)

        for expected_cat in (
            'Pages & Requirements',
            'Courses',
            'Funding & Aid',
            'Faculty & People',
            'Student Guides',
            'Research',
        ):
            self.assertIn(expected_cat, categories)

        for expected_url in (
            'academics.html#requirements',
            'ms.html#requirements',
            'phd.html#requirements',
            'courses.html',
            'funding.html',
            'people.html',
            'resources.html',
            'courses.html#course-issp-2071',
            'courses.html#course-issp-2170',
            'people.html#person-peter-brusilovsky',
            'people.html#person-diane-litman',
        ):
            self.assertIn(expected_url, urls)

    def test_written_search_index_json_is_valid(self):
        path = ROOT / 'assets/search-index.json'
        if not path.exists():
            build_search_index.write_search_index()
        payload = json.loads(path.read_text())
        self.assertIn('items', payload)
        self.assertGreaterEqual(len(payload['items']), 250)


if __name__ == '__main__':
    unittest.main()
