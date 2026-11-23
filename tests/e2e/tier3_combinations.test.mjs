/**
 * Tier 3: Cross-Feature Pairwise Combinations (tier3_combinations.test.mjs)
 *
 * Implements 12 opaque-box E2E combination tests (T3-01 through T3-12)
 * verifying multi-feature interactions across F1–F8 as specified in
 * TEST_INFRA.md § 3 (Tier 3).
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';

import { connectBrowser } from './lib/cdp.mjs';
import {
  auditPageContrast,
  auditPageStructure,
  checkAnchorNotOccluded,
  checkNoHorizontalOverflow,
  clickTopicChip,
  fillSiteSearch,
  findAcademicsDisclosure,
  findMobileMenuToggle,
  findSearchTrigger,
  findStickyNavInfo,
  getConfig,
  getFacultyExplorerState,
  getSearchDialogState,
  getSearchPageState,
  getVisibleCourses,
  inspectPng,
  openSiteSearch,
  pageUrl,
  setCourseFilter,
  setPeopleNameQuery,
  setPeopleTopicQuery,
  subpathUrl,
} from './lib/helpers.mjs';

const VERIFIED_AI_FACULTY_10 = Object.freeze([
  'diane-litman',
  'raquel-coelho',
  'shandong-wu',
  'yanshan-wang',
  'kevin-ashley',
  'milos-hauskrecht',
  'yufei-huang',
  'ryan-shi',
  'ahmad-p-tafti',
  'shyam-visweswaran',
]);

function assertZeroRuntimeErrors(page, contextLabel) {
  assert.equal(
    page.localFailedRequests.length,
    0,
    `Unexpected local HTTP/network failures on ${contextLabel}: ${JSON.stringify(page.localFailedRequests)}`
  );
  assert.equal(
    page.pageErrors.length,
    0,
    `Unexpected uncaught page errors on ${contextLabel}: ${JSON.stringify(page.pageErrors)}`
  );
  assert.equal(
    page.consoleErrors.length,
    0,
    `Unexpected console errors on ${contextLabel}: ${JSON.stringify(page.consoleErrors)}`
  );
}

describe('Tier 3: Cross-Feature Pairwise Combinations', () => {
  let browser;

  before(async () => {
    browser = await connectBrowser();
  });

  after(async () => {
    if (browser) {
      await browser.close();
      browser = null;
    }
  });

  test('T3-01 (F6 + F7): Scrolled sticky nav -> Site Search modal -> query "travel grant" -> lands on resources.html#travel-grants auto-expanded & unobstructed with funding.html link', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('index.html'));
      assert.equal(nav.status, 200, 'Expected HTTP 200 on index.html');
      assertZeroRuntimeErrors(page, 'index.html');

      const scrollY = await page.scrollTo(600);
      assert.ok(scrollY >= 400, `Expected page to scroll down on index.html, got scrollY=${scrollY}`);

      const sticky = await findStickyNavInfo(page);
      assert.equal(sticky.found, true, `Expected sticky nav container when scrolled: ${JSON.stringify(sticky)}`);
      assert.ok(Math.abs(sticky.top) <= 2, `Expected sticky nav pinned near top=0 at scrollY=600, got top=${sticky.top}`);
      assert.ok(sticky.height > 0, 'Expected non-zero sticky nav height');

      const dialogState = await openSiteSearch(page, 'click');
      assert.equal(dialogState.open, true, 'Expected Site Search dialog to open from scrolled sticky nav');
      assert.equal(dialogState.inputFocused, true, 'Expected search input to receive focus when dialog opens');

      await fillSiteSearch(page, 'travel grant', { inDialog: true });

      await page.waitFor(
        () => {
          const dlg = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(
            (el) => !el.hidden && getComputedStyle(el).display !== 'none'
          );
          if (!dlg) return false;
          return [...dlg.querySelectorAll('a[href]')].some((a) =>
            /resources\.html(?:#travel-grants)?/i.test(a.getAttribute('href') || '')
          );
        },
        { timeoutMs: 4000, message: 'Expected Site Search results for "travel grant" to include resources.html#travel-grants' }
      );

      const destUrl = await page.clickAndWaitForNavigation(() => {
        const dlg = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(
          (el) => !el.hidden && getComputedStyle(el).display !== 'none'
        );
        if (!dlg) return null;
        return (
          [...dlg.querySelectorAll('a[href]')].find((a) =>
            /resources\.html#travel-grants/i.test(a.getAttribute('href') || '')
          ) ||
          [...dlg.querySelectorAll('a[href]')].find((a) =>
            /resources\.html/i.test(a.getAttribute('href') || '')
          ) ||
          null
        );
      });

      assert.match(destUrl, /resources\.html(?:#travel-grants)?$/i, `Expected navigation to resources.html#travel-grants, got ${destUrl}`);
      if (!destUrl.endsWith('#travel-grants')) {
        await page.goto(pageUrl('resources.html#travel-grants'), { clearDiagnostics: false });
      }
      assertZeroRuntimeErrors(page, 'resources.html#travel-grants');

      const clearance = await checkAnchorNotOccluded(page, 'travel-grants');
      assert.equal(clearance.found, true, 'Expected #travel-grants target to exist on resources.html');
      assert.equal(clearance.stickyFound, true, 'Expected sticky navbar on resources.html');
      assert.equal(
        clearance.unobstructed,
        true,
        `Expected #travel-grants unobstructed below sticky bar: ${JSON.stringify(clearance)}`
      );

      const travelGrantDetails = await page.evaluate(() => {
        const el = document.getElementById('travel-grants');
        if (!el) return { found: false };
        const details = el.tagName === 'DETAILS' ? el : el.closest('details') || el.querySelector('details');
        const isOpen = details ? Boolean(details.open) : true;
        const scope = details || el;
        const fundingLink = [...scope.querySelectorAll('a[href]')].find((a) =>
          /funding\.html/i.test(a.getAttribute('href') || '')
        );
        return {
          found: true,
          isOpen,
          hasFundingLink: Boolean(fundingLink),
          fundingHref: fundingLink ? fundingLink.getAttribute('href') : null,
        };
      });

      assert.equal(travelGrantDetails.found, true);
      assert.equal(travelGrantDetails.isOpen, true, 'Expected #travel-grants <details> to auto-expand on hash navigation');
      assert.equal(
        travelGrantDetails.hasFundingLink,
        true,
        'Expected #travel-grants on resources.html to cross-link to funding.html'
      );
    } finally {
      await page.close();
    }
  });

  test('T3-02 (F6 + F3 + F2): Scrolled sticky nav -> Academics disclosure submenu -> courses.html -> filter MS + Core -> verify ISSP 2071 & live SCI/PeopleSoft links', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('index.html'));
      assert.equal(nav.status, 200);
      assertZeroRuntimeErrors(page, 'index.html');

      await page.scrollTo(600);
      const sticky = await findStickyNavInfo(page);
      assert.equal(sticky.found, true, 'Expected sticky navbar at scrollY=600');
      assert.ok(Math.abs(sticky.top) <= 2, `Expected sticky navbar pinned at top, got ${sticky.top}`);

      const discBefore = await findAcademicsDisclosure(page);
      assert.equal(discBefore.found, true, 'Expected Academics disclosure button in sticky navbar');
      assert.equal(discBefore.visible, true, 'Expected Academics disclosure button to be visible');

      await page.clickAt(discBefore.rect.centerX, discBefore.rect.centerY);
      await page.waitFor(
        async () => {
          const d = await findAcademicsDisclosure(page);
          return d.found && d.expanded && d.menuVisible;
        },
        { timeoutMs: 3000, message: 'Academics disclosure submenu did not open on click' }
      );

      const discOpen = await findAcademicsDisclosure(page);
      const submenuHrefs = discOpen.menuLinks.map((l) => l.href);
      assert.ok(
        submenuHrefs.some((h) => /courses\.html/i.test(h)),
        `Expected courses.html in Academics submenu links, got ${JSON.stringify(submenuHrefs)}`
      );

      const coursesUrl = await page.clickAndWaitForNavigation(() => {
        const mainNav = document.querySelector('nav[aria-label="Main navigation"]') || document.body;
        const links = [...mainNav.querySelectorAll('a[href*="courses.html"]')];
        return links.find((a) => {
          const r = a.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
      });

      assert.match(coursesUrl, /courses\.html/i, `Expected navigation to courses.html, got ${coursesUrl}`);
      assertZeroRuntimeErrors(page, 'courses.html');

      await setCourseFilter(page, { degree: 'MS', group: 'Core' });

      await page.waitFor(
        async () => {
          const list = await getVisibleCourses(page);
          return list.length > 0 && list.some((c) => c.code === 'ISSP 2071');
        },
        { timeoutMs: 3000, message: 'Expected ISSP 2071 in visible MS + Core filtered courses' }
      );

      const visibleCourses = await getVisibleCourses(page);
      const issp2071 = visibleCourses.find((c) => c.code === 'ISSP 2071');
      assert.ok(issp2071, 'Expected ISSP 2071 to be visible under MS + Core filter');
      assert.ok(
        issp2071.hrefs.some((h) => h === 'https://courses.sci.pitt.edu/courses/view/ISSP-2071'),
        `Expected ISSP 2071 to link to https://courses.sci.pitt.edu/courses/view/ISSP-2071, got ${JSON.stringify(issp2071.hrefs)}`
      );

      const liveLinks = await page.evaluate(() => {
        const hrefs = [...document.querySelectorAll('main a[href]')].map((a) => a.getAttribute('href') || '');
        return {
          hasSciCourses: hrefs.some((h) => /^https:\/\/courses\.sci\.pitt\.edu\/?$/i.test(h) || /^https:\/\/courses\.sci\.pitt\.edu\//i.test(h)),
          hasPeopleSoft: hrefs.some((h) => /^https:\/\/my\.pitt\.edu\/?/i.test(h)),
        };
      });
      assert.equal(liveLinks.hasSciCourses, true, 'Expected live SCI Courses link (https://courses.sci.pitt.edu/) on courses.html');
      assert.equal(liveLinks.hasPeopleSoft, true, 'Expected live PeopleSoft link (https://my.pitt.edu/) on courses.html');
    } finally {
      await page.close();
    }
  });

  test('T3-03 (F4 + F5): Home prominent funding CTA -> funding.html -> GSR / Faculty Explorer link (people.html) -> topic search "AI" -> verify 10 AI faculty & exclusions', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('index.html'));
      assert.equal(nav.status, 200);
      assertZeroRuntimeErrors(page, 'index.html');

      const hasHomeFundingCta = await page.evaluate(() => {
        const links = [...document.querySelectorAll('main a[href*="funding.html"]')];
        return links.some((a) => {
          const r = a.getBoundingClientRect();
          return !a.hidden && getComputedStyle(a).display !== 'none' && r.width > 0 && r.height > 0;
        });
      });
      assert.equal(hasHomeFundingCta, true, 'Expected prominent funding.html CTA inside <main> on index.html');

      const fundingUrl = await page.clickAndWaitForNavigation(() => {
        return [...document.querySelectorAll('main a[href*="funding.html"]')].find((a) => {
          const r = a.getBoundingClientRect();
          return !a.hidden && getComputedStyle(a).display !== 'none' && r.width > 0 && r.height > 0;
        });
      });
      assert.match(fundingUrl, /funding\.html/i, `Expected navigation to funding.html, got ${fundingUrl}`);
      assertZeroRuntimeErrors(page, 'funding.html');

      const fundingContent = await page.evaluate(() => {
        const text = (document.querySelector('main')?.textContent || '').replace(/\s+/g, ' ');
        const mainPeopleLink = [...document.querySelectorAll('main a[href*="people.html"], main a[href*="faculty.html"]')].find((a) => {
          const r = a.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        return {
          mentionsGsr: /\bGSR\b|Graduate Student Researcher|Graduate Research Assistant/i.test(text),
          hasMainPeopleLink: Boolean(mainPeopleLink),
        };
      });
      assert.equal(fundingContent.mentionsGsr, true, 'Expected funding.html to document GSR / Graduate Research Assistantships');

      const peopleUrl = await page.clickAndWaitForNavigation(() => {
        return (
          [...document.querySelectorAll('main a[href*="people.html"], main a[href*="faculty.html"]')].find((a) => {
            const r = a.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          }) ||
          document.querySelector('nav[aria-label="Main navigation"] a[href*="people.html"]')
        );
      });
      assert.match(peopleUrl, /people\.html/i, `Expected navigation to people.html, got ${peopleUrl}`);
      assertZeroRuntimeErrors(page, 'people.html');

      const explorerInit = await getFacultyExplorerState(page);
      assert.match(explorerInit.h1Text, /Faculty Explorer/i, `Expected <h1>Faculty Explorer</h1>, got ${explorerInit.h1Text}`);

      await setPeopleTopicQuery(page, 'AI');
      await page.waitFor(
        async () => {
          const s = await getFacultyExplorerState(page);
          return s.visibleCount >= 10 && VERIFIED_AI_FACULTY_10.every((slug) => s.visibleSlugs.includes(slug));
        },
        { timeoutMs: 3000, message: 'Expected topic search "AI" to match all 10 verified AI faculty' }
      );

      const aiState = await getFacultyExplorerState(page);
      assert.ok(aiState.visibleCount >= 10, `Expected >= 10 AI faculty matches, got ${aiState.visibleCount}`);
      for (const reqSlug of VERIFIED_AI_FACULTY_10) {
        assert.ok(
          aiState.visibleSlugs.includes(reqSlug),
          `Expected verified AI faculty "${reqSlug}" in AI topic results, got ${JSON.stringify(aiState.visibleSlugs)}`
        );
      }
      assert.ok(
        !aiState.visibleSlugs.includes('dana-l-tudorascu'),
        'Expected "dana-l-tudorascu" ("brain" trap) to be excluded from AI topic search'
      );
      assert.ok(
        !aiState.visibleSlugs.includes('na-du'),
        'Expected "na-du" ("aims" trap) to be excluded from AI topic search'
      );
      assert.ok(
        !aiState.visibleSlugs.includes('hatice-osmanbeyoglu'),
        'Expected "hatice-osmanbeyoglu" (empty topics) to be excluded from AI topic search'
      );
    } finally {
      await page.close();
    }
  });

  test('T3-04 (F5 + F6): about.html deep link -> people.html#person-peter-brusilovsky unobstructed below sticky bar -> footer people.html?category= restores all 190 profiles', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('about.html'));
      assert.equal(nav.status, 200);
      assertZeroRuntimeErrors(page, 'about.html');

      const deepUrl = await page.clickAndWaitForNavigation(
        'main a[href="people.html#person-peter-brusilovsky"]'
      );
      assert.ok(
        deepUrl.endsWith('people.html#person-peter-brusilovsky'),
        `Expected URL to end with people.html#person-peter-brusilovsky, got ${deepUrl}`
      );
      assertZeroRuntimeErrors(page, 'people.html#person-peter-brusilovsky');

      const clearance = await checkAnchorNotOccluded(page, 'person-peter-brusilovsky');
      assert.equal(clearance.found, true, 'Expected #person-peter-brusilovsky card to exist');
      assert.equal(clearance.stickyFound, true, 'Expected sticky navbar on people.html');
      assert.equal(
        clearance.unobstructed,
        true,
        `Expected #person-peter-brusilovsky unobstructed below sticky navbar: ${JSON.stringify(clearance)}`
      );

      const allPeopleUrl = await page.clickAndWaitForNavigation(
        'footer a[href="people.html?category="]'
      );
      assert.ok(
        allPeopleUrl.includes('people.html?category='),
        `Expected navigation to people.html?category=, got ${allPeopleUrl}`
      );
      assertZeroRuntimeErrors(page, 'people.html?category=');

      await page.waitFor(
        async () => {
          const s = await getFacultyExplorerState(page);
          return s.visibleCount === 190;
        },
        { timeoutMs: 3000, message: 'Expected footer people.html?category= link to display all 190 profiles' }
      );

      const allState = await getFacultyExplorerState(page);
      assert.equal(allState.visibleCount, 190, `Expected 190 visible profiles for ?category=, got ${allState.visibleCount}`);
    } finally {
      await page.close();
    }
  });

  test('T3-05 (F7 + F5): Keyboard "/" Site Search on academics.html -> query "Litman" -> navigate to people.html (#person-diane-litman) -> filter topic "NLP" (>= 9 matches)', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('academics.html'));
      assert.equal(nav.status, 200);
      assertZeroRuntimeErrors(page, 'academics.html');

      const dlg = await openSiteSearch(page, '/');
      assert.equal(dlg.open, true, 'Expected "/" shortcut on academics.html to open Site Search modal');

      await fillSiteSearch(page, 'Litman', { inDialog: true });

      await page.waitFor(
        () => {
          const d = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(
            (el) => !el.hidden && getComputedStyle(el).display !== 'none'
          );
          if (!d) return false;
          return [...d.querySelectorAll('a[href]')].some((a) =>
            /people\.html/i.test(a.getAttribute('href') || '')
          );
        },
        { timeoutMs: 4000, message: 'Expected Site Search for "Litman" to return a people.html result' }
      );

      const peopleUrl = await page.clickAndWaitForNavigation(() => {
        const d = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(
          (el) => !el.hidden && getComputedStyle(el).display !== 'none'
        );
        if (!d) return null;
        return (
          [...d.querySelectorAll('a[href]')].find((a) =>
            /people\.html#person-diane-litman/i.test(a.getAttribute('href') || '')
          ) ||
          [...d.querySelectorAll('a[href]')].find((a) =>
            /people\.html/i.test(a.getAttribute('href') || '') && /litman/i.test(a.textContent || '')
          ) ||
          [...d.querySelectorAll('a[href]')].find((a) =>
            /people\.html/i.test(a.getAttribute('href') || '')
          )
        );
      });

      assert.match(peopleUrl, /people\.html/i, `Expected navigation to people.html, got ${peopleUrl}`);
      assertZeroRuntimeErrors(page, 'people.html');

      const litmanVisible = await page.evaluate(() => {
        const el = document.getElementById('person-diane-litman');
        if (!el) return false;
        return !el.hidden && getComputedStyle(el).display !== 'none';
      });
      assert.equal(litmanVisible, true, 'Expected #person-diane-litman to be visible after navigating from Site Search');

      await setPeopleNameQuery(page, '');
      await setPeopleTopicQuery(page, 'NLP');

      await page.waitFor(
        async () => {
          const s = await getFacultyExplorerState(page);
          return (
            s.visibleCount >= 9 &&
            s.visibleSlugs.includes('diane-litman') &&
            s.visibleSlugs.includes('daqing-he')
          );
        },
        { timeoutMs: 3000, message: 'Expected topic "NLP" in Faculty Explorer to match >= 9 faculty including diane-litman & daqing-he' }
      );

      const nlpState = await getFacultyExplorerState(page);
      assert.ok(nlpState.visibleCount >= 9, `Expected >= 9 NLP faculty matches, got ${nlpState.visibleCount}`);
      for (const slug of ['diane-litman', 'daqing-he', 'lorraine-xiang-li', 'janet-liu', 'yanshan-wang']) {
        assert.ok(
          nlpState.visibleSlugs.includes(slug),
          `Expected NLP faculty "${slug}" to be visible, got ${JSON.stringify(nlpState.visibleSlugs)}`
        );
      }
      assert.ok(!nlpState.visibleSlugs.includes('hatice-osmanbeyoglu'));
      assert.ok(!nlpState.visibleSlugs.includes('dana-l-tudorascu'));
    } finally {
      await page.close();
    }
  });

  test('T3-06 (F7 + F2): Site Search on index.html -> hyphenated query "ISSP-2170" -> navigate to courses.html -> verify ISSP 2170 prereq/plan info and SCI course link', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('index.html'));
      assert.equal(nav.status, 200);
      assertZeroRuntimeErrors(page, 'index.html');

      await openSiteSearch(page, 'click');
      await fillSiteSearch(page, 'ISSP-2170', { inDialog: true });

      await page.waitFor(
        () => {
          const d = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(
            (el) => !el.hidden && getComputedStyle(el).display !== 'none'
          );
          if (!d) return false;
          return [...d.querySelectorAll('a[href]')].some(
            (a) =>
              /courses\.html/i.test(a.getAttribute('href') || '') &&
              /2170/i.test(`${a.textContent || ''} ${a.getAttribute('href') || ''}`)
          );
        },
        { timeoutMs: 4000, message: 'Expected hyphenated query "ISSP-2170" in Site Search to match ISSP 2170 on courses.html' }
      );

      const coursesUrl = await page.clickAndWaitForNavigation(() => {
        const d = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(
          (el) => !el.hidden && getComputedStyle(el).display !== 'none'
        );
        if (!d) return null;
        return (
          [...d.querySelectorAll('a[href]')].find(
            (a) =>
              /courses\.html/i.test(a.getAttribute('href') || '') &&
              /2170/i.test(`${a.textContent || ''} ${a.getAttribute('href') || ''}`)
          ) ||
          [...d.querySelectorAll('a[href]')].find((a) =>
            /courses\.html/i.test(a.getAttribute('href') || '')
          )
        );
      });

      assert.match(coursesUrl, /courses\.html/i, `Expected navigation to courses.html, got ${coursesUrl}`);
      assertZeroRuntimeErrors(page, 'courses.html');

      await setCourseFilter(page, { query: 'ISSP-2170' });
      await page.waitFor(
        async () => {
          const list = await getVisibleCourses(page);
          return list.some((c) => c.code === 'ISSP 2170');
        },
        { timeoutMs: 3000, message: 'Expected ISSP 2170 to be visible on courses.html for query "ISSP-2170"' }
      );

      const visibleCourses = await getVisibleCourses(page);
      const issp2170 = visibleCourses.find((c) => c.code === 'ISSP 2170');
      assert.ok(issp2170, 'Expected ISSP 2170 entry on courses.html');
      assert.ok(
        issp2170.hrefs.includes('https://courses.sci.pitt.edu/courses/view/ISSP-2170'),
        `Expected https://courses.sci.pitt.edu/courses/view/ISSP-2170 link on ISSP 2170, got ${JSON.stringify(issp2170.hrefs)}`
      );
      assert.match(
        issp2170.text,
        /PREQ:|PLAN:|Prerequisite|Verify in SCI Course Catalog|PeopleSoft|TODO:\s*confirm/i,
        `Expected prerequisite/plan or verification info on ISSP 2170 entry, got: ${issp2170.text}`
      );
    } finally {
      await page.close();
    }
  });

  test('T3-07 (F3 + F4): academics.html#requirements -> ms.html#requirements -> MS funding callout -> funding.html Pitt2Pitt MSISP $7,500 details', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('academics.html#requirements'));
      assert.equal(nav.status, 200);
      assertZeroRuntimeErrors(page, 'academics.html#requirements');

      const acadClearance = await checkAnchorNotOccluded(page, 'requirements');
      assert.equal(acadClearance.found, true, 'Expected #requirements section on academics.html');
      assert.equal(acadClearance.stickyFound, true, 'Expected sticky navbar on academics.html');
      assert.equal(
        acadClearance.unobstructed,
        true,
        `Expected academics.html#requirements unobstructed below sticky bar: ${JSON.stringify(acadClearance)}`
      );

      const msUrl = await page.clickAndWaitForNavigation(
        'main a[href="ms.html#requirements"], main a[href*="ms.html#requirements"]'
      );
      assert.match(msUrl, /ms\.html#requirements$/i, `Expected navigation to ms.html#requirements, got ${msUrl}`);
      assertZeroRuntimeErrors(page, 'ms.html#requirements');

      const msClearance = await checkAnchorNotOccluded(page, 'requirements');
      assert.equal(msClearance.found, true, 'Expected #requirements section on ms.html');
      assert.equal(
        msClearance.unobstructed,
        true,
        `Expected ms.html#requirements unobstructed below sticky bar: ${JSON.stringify(msClearance)}`
      );

      const fundingUrl = await page.clickAndWaitForNavigation(() => {
        return [...document.querySelectorAll('main a[href*="funding.html"]')].find((a) => {
          const r = a.getBoundingClientRect();
          return !a.hidden && getComputedStyle(a).display !== 'none' && r.width > 0 && r.height > 0;
        });
      });
      assert.match(fundingUrl, /funding\.html/i, `Expected MS funding callout to navigate to funding.html, got ${fundingUrl}`);
      assertZeroRuntimeErrors(page, 'funding.html');

      const msFundingText = await page.evaluate(() =>
        (document.querySelector('main')?.textContent || '').replace(/\s+/g, ' ')
      );
      assert.match(msFundingText, /Pitt2Pitt/i, 'Expected funding.html to document Pitt2Pitt Scholarship');
      assert.match(msFundingText, /MSISP|Master of Science|MS in Intelligent Systems/i, 'Expected funding.html to note MSISP participation');
      assert.match(msFundingText, /\$7,500/, 'Expected funding.html to document up to $7,500 Pitt2Pitt award');
    } finally {
      await page.close();
    }
  });

  test('T3-08 (F6 + F7 + F5 Mobile 320x568): Scrolled people.html -> open mobile drawer -> Escape close -> sticky Site Search modal -> query "funding" -> funding.html with zero horizontal overflow at every step', async () => {
    const page = await browser.newPage({ width: 320, height: 568, mobile: true });
    try {
      const nav = await page.goto(pageUrl('people.html'));
      assert.equal(nav.status, 200);
      assertZeroRuntimeErrors(page, 'people.html (320x568)');

      const ovInitial = await checkNoHorizontalOverflow(page);
      assert.equal(ovInitial.ok, true, `Horizontal overflow on people.html at 320x568: ${JSON.stringify(ovInitial)}`);

      await page.scrollTo(600);
      const sticky = await findStickyNavInfo(page);
      assert.equal(sticky.found, true, 'Expected sticky navbar on people.html at 320x568 scrollY=600');
      assert.ok(Math.abs(sticky.top) <= 2, `Expected sticky navbar pinned at top=0, got ${sticky.top}`);
      assert.ok(sticky.height <= 140, `Expected compact sticky bar <= 140px at 320x568, got ${sticky.height}px`);

      const ovScrolled = await checkNoHorizontalOverflow(page);
      assert.equal(ovScrolled.ok, true, `Horizontal overflow on scrolled people.html: ${JSON.stringify(ovScrolled)}`);

      const toggleBefore = await findMobileMenuToggle(page);
      assert.equal(toggleBefore.found, true, 'Expected mobile menu toggle button at 320x568');
      await page.clickAt(toggleBefore.rect.centerX, toggleBefore.rect.centerY);

      await page.waitFor(
        async () => {
          const t = await findMobileMenuToggle(page);
          return t.found && t.expanded;
        },
        { timeoutMs: 3000, message: 'Expected mobile drawer to expand on toggle click' }
      );

      const toggleOpen = await findMobileMenuToggle(page);
      assert.equal(toggleOpen.expanded, true);
      assert.ok(
        toggleOpen.drawerInfo && toggleOpen.drawerInfo.visible && toggleOpen.drawerInfo.viewportBounded,
        `Expected open mobile drawer to be visible and viewport-bounded at 320x568: ${JSON.stringify(toggleOpen.drawerInfo)}`
      );

      const ovDrawerOpen = await checkNoHorizontalOverflow(page);
      assert.equal(ovDrawerOpen.ok, true, `Horizontal overflow with mobile drawer open: ${JSON.stringify(ovDrawerOpen)}`);

      await page.pressKey('Escape');
      await page.waitFor(
        async () => {
          const t = await findMobileMenuToggle(page);
          return t.found && !t.expanded;
        },
        { timeoutMs: 3000, message: 'Expected Escape to close mobile navigation drawer' }
      );

      const toggleAfterEsc = await findMobileMenuToggle(page);
      assert.equal(toggleAfterEsc.expanded, false, 'Expected aria-expanded="false" after Escape');
      assert.equal(toggleAfterEsc.isFocused, true, 'Expected Escape to return focus to mobile menu toggle button');

      const dlg = await openSiteSearch(page, 'click');
      assert.equal(dlg.open, true, 'Expected Site Search modal to open from scrolled mobile sticky bar');

      const ovModalOpen = await checkNoHorizontalOverflow(page);
      assert.equal(ovModalOpen.ok, true, `Horizontal overflow with Site Search modal open at 320x568: ${JSON.stringify(ovModalOpen)}`);

      await fillSiteSearch(page, 'funding', { inDialog: true });
      await page.waitFor(
        () => {
          const d = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(
            (el) => !el.hidden && getComputedStyle(el).display !== 'none'
          );
          if (!d) return false;
          return [...d.querySelectorAll('a[href*="funding.html"]')].length > 0;
        },
        { timeoutMs: 4000, message: 'Expected mobile Site Search for "funding" to return funding.html' }
      );

      const fundingUrl = await page.clickAndWaitForNavigation(() => {
        const d = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(
          (el) => !el.hidden && getComputedStyle(el).display !== 'none'
        );
        return d ? d.querySelector('a[href*="funding.html"]') : null;
      });
      assert.match(fundingUrl, /funding\.html/i, `Expected navigation to funding.html, got ${fundingUrl}`);
      assertZeroRuntimeErrors(page, 'funding.html (320x568)');

      const ovFunding = await checkNoHorizontalOverflow(page);
      assert.equal(ovFunding.ok, true, `Horizontal overflow on funding.html at 320x568: ${JSON.stringify(ovFunding)}`);
    } finally {
      await page.close();
    }
  });

  test('T3-09 (F5 History + Multi-Filter): Faculty Explorer topic "ML" + partial name "Haus" (milos-hauskrecht) + chip interaction -> reload & history.back() restore state cleanly without focus loss', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('people.html'));
      assert.equal(nav.status, 200);
      assertZeroRuntimeErrors(page, 'people.html');

      await clickTopicChip(page, /Machine learning and reasoning/i);
      await page.waitFor(
        async () => {
          const s = await getFacultyExplorerState(page);
          return s.visibleCount === 15 && s.visibleSlugs.includes('milos-hauskrecht');
        },
        { timeoutMs: 3000, message: 'Expected clicking "Machine learning and reasoning" chip to show 15 ML faculty' }
      );

      await setPeopleTopicQuery(page, 'ML');
      await setPeopleNameQuery(page, 'Haus');

      await page.waitFor(
        async () => {
          const s = await getFacultyExplorerState(page);
          return s.visibleCount === 1 && s.visibleSlugs[0] === 'milos-hauskrecht';
        },
        { timeoutMs: 3000, message: 'Expected combining topic "ML" + partial name "Haus" to narrow to milos-hauskrecht' }
      );

      const combinedUrl = await page.getUrl();
      assert.ok(combinedUrl.includes('?'), `Expected filter state to sync to URL query parameters, got ${combinedUrl}`);

      // Reload the combined URL directly to verify deterministic URL state persistence.
      await page.goto(combinedUrl);
      assertZeroRuntimeErrors(page, 'people.html (reloaded combined filter URL)');
      const reloadedState = await getFacultyExplorerState(page);
      assert.deepEqual(
        reloadedState.visibleSlugs,
        ['milos-hauskrecht'],
        `Expected reload of ${combinedUrl} to preserve ['milos-hauskrecht'], got ${JSON.stringify(reloadedState.visibleSlugs)}`
      );

      // Navigate from unfiltered people.html -> filtered URL -> history.back()
      await page.goto(pageUrl('people.html'));
      await page.goto(combinedUrl);
      assert.deepEqual((await getFacultyExplorerState(page)).visibleSlugs, ['milos-hauskrecht']);

      await page.goBack();
      await page.waitFor(
        async () => {
          const s = await getFacultyExplorerState(page);
          return s.visibleCount === 30;
        },
        { timeoutMs: 3000, message: 'Expected history.back() to restore default 30 Faculty view' }
      );

      const focusValid = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active) return false;
        if (active === document.body || active === document.documentElement) return true;
        return !active.hidden && getComputedStyle(active).display !== 'none';
      });
      assert.equal(focusValid, true, 'Expected active focus not to be stranded on a hidden DOM node after history.back()');
    } finally {
      await page.close();
    }
  });

  test('T3-10 (F1 + F8): CHANGES.md exists -> every linked docs/screenshots/before/*.png exists & passes inspectPng -> redesign/dist/ cleanly excludes CHANGES.md and docs/', () => {
    const { repoRoot } = getConfig();
    const changesPath = path.join(repoRoot, 'CHANGES.md');
    assert.equal(fs.existsSync(changesPath), true, 'Expected CHANGES.md to exist at repository root');

    const changesText = fs.readFileSync(changesPath, 'utf8');
    assert.ok(changesText.trim().length >= 500, 'Expected comprehensive content in CHANGES.md');

    const pngLinkRe = /(?:docs\/screenshots\/(?:before|after(?:-\d{4}-\d{2}-\d{2})?)\/[A-Za-z0-9._/-]+\.png)/g;
    const allLinkedPngs = [...new Set(changesText.match(pngLinkRe) || [])];
    const beforeLinkedPngs = allLinkedPngs.filter((p) => p.startsWith('docs/screenshots/before/'));

    assert.ok(
      beforeLinkedPngs.length >= 8,
      `Expected CHANGES.md to link >= 8 baseline screenshots under docs/screenshots/before/, found ${beforeLinkedPngs.length}: ${JSON.stringify(beforeLinkedPngs)}`
    );

    for (const relPng of allLinkedPngs) {
      const absPng = path.join(repoRoot, relPng);
      assert.equal(fs.existsSync(absPng), true, `Screenshot linked in CHANGES.md does not exist: ${relPng}`);
      const info = inspectPng(absPng);
      assert.equal(info.valid, true, `Invalid PNG linked in CHANGES.md (${relPng}): ${JSON.stringify(info)}`);
      assert.equal(info.nonUniform, true, `Blank/solid PNG linked in CHANGES.md (${relPng}): ${JSON.stringify(info)}`);
      assert.ok(info.width >= 320 && info.height >= 400, `Unexpected PNG dimensions for ${relPng}: ${info.width}x${info.height}`);
    }

    const distDir = path.join(repoRoot, 'redesign', 'dist');
    if (fs.existsSync(distDir)) {
      assert.equal(
        fs.existsSync(path.join(distDir, 'CHANGES.md')),
        false,
        'redesign/dist/ must NOT contain CHANGES.md'
      );
      assert.equal(
        fs.existsSync(path.join(distDir, 'docs')),
        false,
        'redesign/dist/ must NOT contain docs/'
      );
      assert.equal(
        fs.existsSync(path.join(distDir, 'tests')),
        false,
        'redesign/dist/ must NOT contain tests/'
      );
    }
  });

  test('T3-11 (F7 + F8 Subpath): Navigate via E2E_SUBPATH_URL (/ISP-Website-Redesign/index.html) -> Site Search "prerequisites" -> /ISP-Website-Redesign/courses.html -> zero local 404s, subpath preserved, WCAG AA contrast verified', async () => {
    const { subpathUrl: baseSubpath } = getConfig();
    const page = await browser.newPage({ width: 1440, height: 900, baseUrl: baseSubpath });
    try {
      const nav = await page.goto(subpathUrl('index.html'));
      assert.equal(nav.status, 200, 'Expected HTTP 200 on /ISP-Website-Redesign/index.html');
      assert.ok(
        nav.url.includes('/ISP-Website-Redesign/index.html'),
        `Expected subpath URL, got ${nav.url}`
      );
      assertZeroRuntimeErrors(page, '/ISP-Website-Redesign/index.html');

      const dlg = await openSiteSearch(page, 'click');
      assert.equal(dlg.open, true, 'Expected Site Search modal to open under subpath');

      await fillSiteSearch(page, 'prerequisites', { inDialog: true });
      await page.waitFor(
        () => {
          const d = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(
            (el) => !el.hidden && getComputedStyle(el).display !== 'none'
          );
          if (!d) return false;
          return [...d.querySelectorAll('a[href*="courses.html"]')].length > 0;
        },
        { timeoutMs: 4000, message: 'Expected subpath Site Search for "prerequisites" to return courses.html' }
      );

      // Verify search-index.json was loaded from the subpath without any 404
      assertZeroRuntimeErrors(page, '/ISP-Website-Redesign/index.html (after search-index fetch)');
      const indexFetch = page.responses.find((r) => r.url.includes('search-index.json'));
      assert.ok(indexFetch, 'Expected search-index.json network fetch under subpath');
      assert.equal(indexFetch.status, 200, `Expected HTTP 200 for search-index.json, got ${indexFetch.status}`);
      assert.ok(
        indexFetch.url.includes('/ISP-Website-Redesign/assets/search-index.json'),
        `Expected relative subpath fetch for search-index.json, got ${indexFetch.url}`
      );

      const modalContrast = await auditPageContrast(page, { rootSelector: '[role="dialog"], dialog[open]' });
      assert.equal(
        modalContrast.ok,
        true,
        `WCAG AA contrast violation inside Site Search modal: ${JSON.stringify(modalContrast)}`
      );

      const nextUrl = await page.clickAndWaitForNavigation(() => {
        const d = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(
          (el) => !el.hidden && getComputedStyle(el).display !== 'none'
        );
        return d ? d.querySelector('a[href*="courses.html"]') : null;
      });

      assert.ok(
        nextUrl.includes('/ISP-Website-Redesign/courses.html'),
        `Expected subpath preserved on navigation to courses.html, got ${nextUrl}`
      );
      assertZeroRuntimeErrors(page, '/ISP-Website-Redesign/courses.html');

      const coursesContrast = await auditPageContrast(page);
      assert.equal(
        coursesContrast.ok,
        true,
        `WCAG AA contrast violations on subpath courses.html: ${JSON.stringify(coursesContrast)}`
      );
    } finally {
      await page.close();
    }
  });

  test('T3-12 (F2 + F3 + F6 + F7 No-JS): JS-disabled navigation across index -> academics#requirements -> courses -> funding -> people -> search verifying CSS sticky navbar, anchor clearance, static courses, 190 people, and <noscript> search fallback', async () => {
    const page = await browser.newPage({ width: 1440, height: 900, javascriptEnabled: false });
    try {
      // 1. index.html: pure CSS sticky navbar & <noscript> search link
      const navIndex = await page.goto(pageUrl('index.html'));
      assert.equal(navIndex.status, 200);
      await page.scrollTo(600);
      const sticky = await findStickyNavInfo(page);
      assert.equal(sticky.found, true, 'Expected pure-CSS sticky navbar when JS is disabled');
      assert.ok(Math.abs(sticky.top) <= 2, `Expected CSS sticky navbar pinned at top=0 without JS, got ${sticky.top}`);

      const searchTrig = await findSearchTrigger(page);
      assert.equal(searchTrig.found, true, 'Expected search trigger/fallback in sticky navbar when JS is disabled');
      assert.equal(
        searchTrig.hasLinkFallback,
        true,
        'Expected <noscript><a href="search.html">Search</a></noscript> fallback link when JS is disabled'
      );

      // 2. academics.html#requirements: anchor clearance via CSS scroll-padding-top / scroll-margin-top
      const navAcad = await page.goto(pageUrl('academics.html#requirements'));
      assert.equal(navAcad.status, 200);
      const clearance = await checkAnchorNotOccluded(page, 'requirements');
      assert.equal(clearance.found, true, 'Expected #requirements on academics.html without JS');
      assert.equal(
        clearance.unobstructed,
        true,
        `Expected CSS scroll-margin-top / scroll-padding-top to keep #requirements unobstructed without JS: ${JSON.stringify(clearance)}`
      );

      // 3. courses.html: all courses statically rendered in HTML
      const navCourses = await page.goto(pageUrl('courses.html'));
      assert.equal(navCourses.status, 200);
      const staticCourses = await getVisibleCourses(page);
      assert.ok(staticCourses.length >= 15, `Expected >= 15 statically rendered courses without JS, got ${staticCourses.length}`);
      assert.ok(staticCourses.some((c) => c.code === 'ISSP 2071'), 'Expected ISSP 2071 statically rendered without JS');
      assert.ok(staticCourses.some((c) => c.code === 'BIOST 2142'), 'Expected BIOST 2142 statically rendered without JS');

      // 4. funding.html: statically rendered PhD, MS, and Travel Grant sections
      const navFunding = await page.goto(pageUrl('funding.html'));
      assert.equal(navFunding.status, 200);
      const fundingText = await page.evaluate(() => (document.querySelector('main')?.textContent || '').replace(/\s+/g, ' '));
      assert.match(fundingText, /Pitt2Pitt/i);
      assert.match(fundingText, /SCI Predoctoral/i);
      assert.match(fundingText, /Travel Grant/i);

      // 5. people.html: all 190 profiles visible without JS
      const navPeople = await page.goto(pageUrl('people.html'));
      assert.equal(navPeople.status, 200);
      const noJsPeople = await getFacultyExplorerState(page);
      assert.equal(noJsPeople.totalCards, 190, 'Expected 190 total person cards in people.html');
      assert.equal(noJsPeople.visibleCount, 190, 'Expected all 190 person cards visible when JS is disabled');

      // 6. search.html: readable <noscript> fallback guidance/links
      const navSearch = await page.goto(pageUrl('search.html'));
      assert.equal(navSearch.status, 200);
      const searchPageState = await getSearchPageState(page);
      assert.ok(
        searchPageState.noscriptText.length > 15 || searchPageState.mainText.length > 40,
        'Expected readable <noscript> fallback content on search.html when JS is disabled'
      );
    } finally {
      await page.close();
    }
  });
});
