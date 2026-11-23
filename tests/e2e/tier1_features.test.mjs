/**
 * Tier 1 E2E Test Suite: Isolated Feature Coverage (F1–F8)
 *
 * 45 tests total (>= 5 per feature across F1..F8):
 * - F1 (5 tests): T1-F1-01 .. T1-F1-05 — Baseline old-design screenshots (docs/screenshots/before/)
 * - F2 (6 tests): T1-F2-01 .. T1-F2-06 — Up-to-date courses, prerequisites & live availability
 * - F3 (5 tests): T1-F3-01 .. T1-F3-05 — Easy-to-find requirements under Academics & nav submenu
 * - F4 (6 tests): T1-F4-01 .. T1-F4-06 — Prominent scholarships & funding (funding.html & cross-page)
 * - F5 (6 tests): T1-F5-01 .. T1-F5-06 — Faculty Explorer partial-name & topic/research-area search
 * - F6 (5 tests): T1-F6-01 .. T1-F6-05 — Sticky scroll-following navbar & anchor non-occlusion
 * - F7 (6 tests): T1-F7-01 .. T1-F7-06 — Zero-dependency site-wide search modal, page & index
 * - F8 (6 tests): T1-F8-01 .. T1-F8-06 — Written changelog (CHANGES.md), brand & WCAG 2.1 AA sweep
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';

import { connectBrowser } from './lib/cdp.mjs';
import {
  APPROVED_BRAND_HEX,
  CORE_PAGES_14,
  auditPageContrast,
  auditPageStructure,
  checkAnchorNotOccluded,
  clickCardTopicTag,
  clickTopicChip,
  extractHexColors,
  fillSiteSearch,
  findAcademicsDisclosure,
  findMobileMenuToggle,
  findRawColorsInCss,
  findSearchTrigger,
  findSkipLinkInfo,
  findStickyNavInfo,
  getConfig,
  getFacultyExplorerState,
  getSearchDialogState,
  getSearchPageState,
  getVisibleCourses,
  inspectPng,
  openSiteSearch,
  pageUrl,
  selectPeopleScope,
  setCourseFilter,
  setPeopleNameQuery,
  setPeopleTopicQuery,
  sha256Hex12,
  withPage,
} from './lib/helpers.mjs';

function listBeforeScreenshots() {
  const { repoRoot } = getConfig();
  const beforeDir = path.join(repoRoot, 'docs', 'screenshots', 'before');
  if (!fs.existsSync(beforeDir) || !fs.statSync(beforeDir).isDirectory()) {
    return { beforeDir, exists: false, files: [] };
  }
  const files = fs
    .readdirSync(beforeDir)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .sort()
    .map((name) => {
      const fullPath = path.join(beforeDir, name);
      return {
        name,
        fullPath,
        info: inspectPng(fullPath),
      };
    });
  return { beforeDir, exists: true, files };
}

describe('Tier 1: Isolated Feature Coverage (F1–F8)', () => {
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

  // =========================================================================
  // Feature F1: Baseline Old-Design Screenshots (docs/screenshots/before/)
  // =========================================================================

  test('T1-F1-01: docs/screenshots/before/ exists and contains valid PNG files with non-uniform pixel content', () => {
    const { beforeDir, exists, files } = listBeforeScreenshots();
    assert.equal(exists, true, `Expected baseline screenshot directory to exist at ${beforeDir}`);
    assert.ok(files.length >= 1, `Expected >= 1 PNG file in ${beforeDir}, found 0`);

    for (const file of files) {
      assert.equal(
        file.info.valid,
        true,
        `Invalid PNG in docs/screenshots/before/${file.name}: ${file.info.reason}`
      );
      assert.ok(
        file.info.width > 0 && file.info.height > 0,
        `Expected positive IHDR dimensions for ${file.name}, got ${file.info.width}x${file.info.height}`
      );
      assert.equal(
        file.info.nonUniform,
        true,
        `Expected non-blank/non-uniform pixel content in ${file.name} (distinctColors=${file.info.distinctColors})`
      );
    }
  });

  test('T1-F1-02: Desktop (>= 1200px wide) before-screenshots cover Home, Academics/MS/PhD, People, and Admissions/Resources', () => {
    const { exists, files } = listBeforeScreenshots();
    assert.equal(exists, true, 'docs/screenshots/before/ directory must exist');

    const desktopFiles = files.filter(
      (f) => f.info.valid && f.info.width >= 1200 && f.info.height >= 600 && f.info.nonUniform
    );
    assert.ok(
      desktopFiles.length >= 4,
      `Expected >= 4 desktop (>=1200px) before-screenshots, found ${desktopFiles.length}`
    );

    const hasHome = desktopFiles.some((f) => /(?:^|[-_])(home|index)(?:[-_.]|$)/i.test(f.name));
    const hasAcademics = desktopFiles.some((f) =>
      /(?:^|[-_])(academics|ms|phd)(?:[-_.]|$)/i.test(f.name)
    );
    const hasPeople = desktopFiles.some((f) =>
      /(?:^|[-_])(people|faculty)(?:[-_.]|$)/i.test(f.name)
    );
    const hasAdmissionsOrResources = desktopFiles.some((f) =>
      /(?:^|[-_])(admissions|resources)(?:[-_.]|$)/i.test(f.name)
    );

    assert.equal(hasHome, true, 'Expected desktop before-screenshot for Home (index.html)');
    assert.equal(
      hasAcademics,
      true,
      'Expected desktop before-screenshot for Academics / MS / PhD'
    );
    assert.equal(hasPeople, true, 'Expected desktop before-screenshot for People (people.html)');
    assert.equal(
      hasAdmissionsOrResources,
      true,
      'Expected desktop before-screenshot for Admissions and/or Resources'
    );
  });

  test('T1-F1-03: Scrolled desktop before-screenshot and people AI-search before-screenshot exist', () => {
    const { exists, files } = listBeforeScreenshots();
    assert.equal(exists, true, 'docs/screenshots/before/ directory must exist');

    const validDesktop = files.filter(
      (f) => f.info.valid && f.info.width >= 1200 && f.info.nonUniform
    );

    const scrolledCapture = validDesktop.find((f) => /scroll/i.test(f.name));
    assert.ok(
      scrolledCapture,
      `Expected a scrolled desktop before-screenshot documenting the old non-sticky navbar in [${files.map((f) => f.name).join(', ')}]`
    );

    const peopleAiCapture = validDesktop.find((f) =>
      /people.*ai|ai.*search|people.*search/i.test(f.name)
    );
    assert.ok(
      peopleAiCapture,
      `Expected a people AI-search before-screenshot in [${files.map((f) => f.name).join(', ')}]`
    );
  });

  test('T1-F1-04: Mobile viewport (<= 420px wide) before-screenshots exist', () => {
    const { exists, files } = listBeforeScreenshots();
    assert.equal(exists, true, 'docs/screenshots/before/ directory must exist');

    const mobileFiles = files.filter(
      (f) =>
        f.info.valid &&
        f.info.width > 0 &&
        f.info.width <= 420 &&
        f.info.height >= 480 &&
        f.info.nonUniform
    );
    assert.ok(
      mobileFiles.length >= 2,
      `Expected >= 2 mobile (<=420px wide) before-screenshots, found ${mobileFiles.length}`
    );
  });

  test('T1-F1-05: Before-screenshots contain genuine rendered page content with distinct file hashes and non-blank sizes', () => {
    const { exists, files } = listBeforeScreenshots();
    assert.equal(exists, true, 'docs/screenshots/before/ directory must exist');
    assert.ok(
      files.length >= 8,
      `Expected >= 8 before-screenshot PNGs, found ${files.length}`
    );

    const digests = new Set();
    for (const file of files) {
      assert.equal(file.info.valid, true, `Invalid PNG ${file.name}: ${file.info.reason}`);
      assert.ok(
        file.info.bytes >= 10000,
        `Expected non-trivial byte size (>= 10 KB) for rendered page screenshot ${file.name}, got ${file.info.bytes} bytes`
      );
      assert.ok(
        file.info.distinctColors >= 4,
        `Expected >= 4 distinct sampled colors in ${file.name}, got ${file.info.distinctColors}`
      );
      digests.add(sha256Hex12(file.fullPath));
    }

    assert.ok(
      digests.size >= 8,
      `Expected >= 8 distinct screenshot digests (no duplicate copies), found ${digests.size}`
    );
  });

  // =========================================================================
  // Feature F2: Up-to-Date Course Prerequisites & Classes Offered
  // =========================================================================

  test('T1-F2-01: courses.html loads HTTP 200 and renders 2026-2027 catoid=242 core/theory updates and new electives', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      const nav = await page.goto(pageUrl('courses.html'));
      assert.equal(nav.status, 200, `Expected HTTP 200 for courses.html, got ${nav.status}`);
      assert.equal(
        page.localFailedRequests.length,
        0,
        `Unexpected failed local requests on courses.html: ${JSON.stringify(page.localFailedRequests)}`
      );
      assert.equal(
        page.pageErrors.length,
        0,
        `Unexpected JS errors on courses.html: ${JSON.stringify(page.pageErrors)}`
      );

      const courses = await getVisibleCourses(page);
      const visibleCodes = new Set(courses.map((c) => c.code));
      const mainInfo = await page.evaluate(() => {
        const main = document.querySelector('main');
        return {
          text: main ? main.textContent.replace(/\s+/g, ' ').trim() : '',
          hrefs: main ? [...main.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || '') : [],
        };
      });

      const requiredCoreTheory = [
        'ISSP 2071',
        'BIOST 2142',
        'INFSCI 2440',
        'ISSP 2160',
        'ISSP 2170',
        'ISSP 2180',
      ];
      for (const code of requiredCoreTheory) {
        assert.ok(
          visibleCodes.has(code) || mainInfo.text.includes(code),
          `Expected 2026-2027 core/theory course "${code}" on courses.html`
        );
      }

      const requiredElectives = [
        'ISSP 2078',
        'ISSP 2125',
        'ISSP 2185',
        'ISSP 2419',
        'ISSP 2756',
        'ISSP 2165',
      ];
      for (const code of requiredElectives) {
        assert.ok(
          visibleCodes.has(code) || mainInfo.text.includes(code),
          `Expected 2026-2027 approved elective "${code}" on courses.html`
        );
      }

      assert.ok(
        mainInfo.hrefs.some((h) => h.includes('catoid=242')) || mainInfo.text.includes('catoid=242'),
        'Expected 2026-2027 Pitt Catalog (catoid=242) link on courses.html'
      );
    });
  });

  test('T1-F2-02: courses.html displays verified PREQ:/PLAN: prerequisites and explicit TODO: confirm verification guidance', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      const nav = await page.goto(pageUrl('courses.html'));
      assert.equal(nav.status, 200, `Expected HTTP 200 for courses.html, got ${nav.status}`);

      const courses = await getVisibleCourses(page);
      const mainText = await page.evaluate(() =>
        (document.querySelector('main')?.textContent || '').replace(/\s+/g, ' ').trim()
      );

      const findEntryText = (code) => {
        const entry = courses.find((c) => c.code === code);
        return entry ? entry.text : '';
      };

      const verifiedPrereqCourses = [
        'INFSCI 2440',
        'INFSCI 2591',
        'INFSCI 2160',
        'ISSP 3120',
        'ISSP 3535',
        'ISSP 3565',
      ];

      for (const code of verifiedPrereqCourses) {
        const entryText = findEntryText(code);
        assert.ok(
          entryText.length > 0 || mainText.includes(code),
          `Expected course ${code} to be rendered on courses.html`
        );
        const targetText = entryText || mainText;
        assert.match(
          targetText,
          /PREQ|PLAN|prerequisite|Intelligent Systems|MAJOR|PROG/i,
          `Expected prerequisite/plan requirement details for ${code}, got: ${targetText.slice(0, 180)}`
        );
      }

      // CS 2150 or CS 2012 prerequisite representation
      const csText = findEntryText('CS 2150') || findEntryText('CS 2012') || mainText;
      assert.ok(
        /CS\s+2150|CS\s+2012/.test(mainText) &&
          /PREQ|PLAN|CS\s+1501|CS\s+0445|prerequisite|Intelligent\s+Systems/i.test(csText),
        'Expected CS 2150 / CS 2012 prerequisite information on courses.html'
      );

      assert.match(
        mainText,
        /TODO:\s*confirm/i,
        'Expected explicit "TODO: confirm" marker for unverified course prerequisites on courses.html'
      );
      assert.match(
        mainText,
        /PeopleSoft|SCI Course Catalog/i,
        'Expected live verification guidance mentioning PeopleSoft and/or SCI Course Catalog on courses.html'
      );
    });
  });

  test('T1-F2-03: Listed SCI courses on courses.html link directly via HTTPS to https://courses.sci.pitt.edu/courses/view/', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      const nav = await page.goto(pageUrl('courses.html'));
      assert.equal(nav.status, 200, `Expected HTTP 200 for courses.html, got ${nav.status}`);

      const linkAudit = await page.evaluate(() => {
        const main = document.querySelector('main') || document.body;
        const anchors = [...main.querySelectorAll('a[href]')];
        const hrefs = anchors.map((a) => ({
          href: a.getAttribute('href') || '',
          text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
        }));
        const sciCourseViewLinks = hrefs.filter((a) =>
          a.href.startsWith('https://courses.sci.pitt.edu/courses/view/')
        );
        const insecureSciLinks = hrefs.filter((a) =>
          a.href.toLowerCase().startsWith('http://courses.sci.pitt.edu')
        );
        const mispointedScheduleLinks = hrefs.filter(
          (a) =>
            /schedule|course\s+catalog/i.test(a.text) &&
            !/permission/i.test(a.text) &&
            /\/permission\b/i.test(a.href)
        );
        return {
          sciCourseViewLinks,
          insecureSciLinks,
          mispointedScheduleLinks,
        };
      });

      assert.ok(
        linkAudit.sciCourseViewLinks.length >= 8,
        `Expected >= 8 direct https://courses.sci.pitt.edu/courses/view/<CODE> links on courses.html, found ${linkAudit.sciCourseViewLinks.length}`
      );
      assert.equal(
        linkAudit.insecureSciLinks.length,
        0,
        `Expected zero insecure http://courses.sci.pitt.edu links, found ${JSON.stringify(linkAudit.insecureSciLinks)}`
      );
      assert.equal(
        linkAudit.mispointedScheduleLinks.length,
        0,
        `Schedule/catalog links must not mispoint to /permission: ${JSON.stringify(linkAudit.mispointedScheduleLinks)}`
      );
    });
  });

  test('T1-F2-04: Live term availability & enrollment verification panel links to SCI schedules, PeopleSoft, catoid=242, and permission workflow', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      const nav = await page.goto(pageUrl('courses.html'));
      assert.equal(nav.status, 200, `Expected HTTP 200 for courses.html, got ${nav.status}`);

      const panelInfo = await page.evaluate(() => {
        const main = document.querySelector('main') || document.body;
        const hrefs = [...main.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || '');
        const text = (main.textContent || '').replace(/\s+/g, ' ').trim();
        return {
          hrefs,
          text,
          hasSciSchedule: hrefs.some(
            (h) =>
              h === 'https://courses.sci.pitt.edu/' ||
              h === 'https://courses.sci.pitt.edu' ||
              h.startsWith('https://courses.sci.pitt.edu/courses')
          ),
          hasPeopleSoft: hrefs.some((h) => /^https:\/\/my\.pitt\.edu\/?/i.test(h)),
          hasCatalog242: hrefs.some((h) => h.includes('catoid=242')),
          hasPermissionLink: hrefs.some(
            (h) =>
              h.includes('courses.sci.pitt.edu/permission') ||
              h.includes('qualtrics.com') ||
              h.includes('resources.html#permissions')
          ),
        };
      });

      assert.equal(
        panelInfo.hasSciSchedule,
        true,
        `Expected live SCI schedule link (https://courses.sci.pitt.edu/) on courses.html, found hrefs: ${JSON.stringify(panelInfo.hrefs)}`
      );
      assert.equal(
        panelInfo.hasPeopleSoft,
        true,
        `Expected PeopleSoft link (https://my.pitt.edu/) on courses.html, found hrefs: ${JSON.stringify(panelInfo.hrefs)}`
      );
      assert.equal(
        panelInfo.hasCatalog242,
        true,
        'Expected 2026-2027 Pitt Catalog link (catoid=242) on courses.html'
      );
      assert.equal(
        panelInfo.hasPermissionLink,
        true,
        'Expected permission-number workflow link on courses.html'
      );
      assert.match(
        panelInfo.text,
        /permission/i,
        'Expected permission-number workflow guidance on courses.html'
      );
    });
  });

  test('T1-F2-05: Interactive client-side filters on courses.html filter by degree, track, requirement group, and keyword/code query', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      const nav = await page.goto(pageUrl('courses.html'));
      assert.equal(nav.status, 200, `Expected HTTP 200 for courses.html, got ${nav.status}`);

      const initial = await getVisibleCourses(page);
      assert.ok(
        initial.length >= 12,
        `Expected >= 12 initial visible courses on courses.html, found ${initial.length}`
      );

      // 1. Filter by Degree = MS
      await setCourseFilter(page, { degree: 'MS' });
      await page.waitFor(
        async () => {
          const cur = await getVisibleCourses(page);
          return cur.length > 0 && cur.length < initial.length;
        },
        { timeoutMs: 3000, message: 'Filtering courses by degree=MS should reduce visible course list' }
      );
      const msCourses = await getVisibleCourses(page);
      const msCodes = new Set(msCourses.map((c) => c.code));
      assert.ok(msCodes.has('ISSP 2071'), 'MS filter should retain MS core course ISSP 2071');
      assert.ok(
        !msCodes.has('ISSP 3120') && !msCodes.has('INFSCI 3005'),
        `MS filter should exclude PhD-only courses (ISSP 3120 / INFSCI 3005), got ${JSON.stringify([...msCodes])}`
      );

      // 2. Reload and filter by Track = Biomedical Informatics
      await page.goto(pageUrl('courses.html'));
      await setCourseFilter(page, { track: 'Biomedical Informatics' });
      const bmiCourses = await getVisibleCourses(page);
      const bmiCodes = new Set(bmiCourses.map((c) => c.code));
      assert.ok(
        bmiCourses.length > 0 && bmiCourses.length < initial.length,
        `Biomedical Informatics track filter should show a non-empty subset (< ${initial.length}), got ${bmiCourses.length}`
      );
      assert.ok(
        bmiCodes.has('BIOST 2142') || bmiCodes.has('ISSP 2083') || bmiCodes.has('ISSP 2016'),
        `Expected Biomedical Informatics track courses (BIOST 2142 / ISSP 2083 / ISSP 2016), got ${JSON.stringify([...bmiCodes])}`
      );

      // 3. Reload and filter by Requirement Group = Core
      await page.goto(pageUrl('courses.html'));
      await setCourseFilter(page, { group: 'Core' });
      const coreCourses = await getVisibleCourses(page);
      const coreCodes = new Set(coreCourses.map((c) => c.code));
      assert.ok(
        coreCourses.length > 0 && coreCourses.length < initial.length,
        `Core group filter should show a non-empty subset (< ${initial.length}), got ${coreCourses.length}`
      );
      assert.ok(coreCodes.has('ISSP 2071'), 'Core group filter should include ISSP 2071');

      // 4. Reload and filter by keyword/code search = "ISSP 2170"
      await page.goto(pageUrl('courses.html'));
      await setCourseFilter(page, { query: 'ISSP 2170' });
      await page.waitFor(
        async () => {
          const cur = await getVisibleCourses(page);
          return cur.length >= 1 && cur.length <= 3 && cur.some((c) => c.code === 'ISSP 2170');
        },
        { timeoutMs: 3000, message: 'Searching "ISSP 2170" on courses.html should match ISSP 2170' }
      );
    });
  });

  test('T1-F2-06: ms.html and phd.html include updated 2026-2027 curriculum courses (ISSP 2071, BIOST 2142) and link to courses.html', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      for (const route of ['ms.html', 'phd.html']) {
        const nav = await page.goto(pageUrl(route));
        assert.equal(nav.status, 200, `Expected HTTP 200 for ${route}`);

        const info = await page.evaluate(() => {
          const main = document.querySelector('main');
          return {
            text: main ? main.textContent.replace(/\s+/g, ' ').trim() : '',
            hasCoursesLink: Boolean(main && main.querySelector('a[href*="courses.html"]')),
          };
        });

        assert.ok(
          info.text.includes('ISSP 2071'),
          `Expected updated core course "ISSP 2071" on ${route}`
        );
        assert.ok(
          info.text.includes('BIOST 2142'),
          `Expected updated statistics course "BIOST 2142" on ${route}`
        );
        assert.equal(
          info.hasCoursesLink,
          true,
          `Expected direct link to courses.html inside <main> on ${route}`
        );
      }
    });
  });

  // =========================================================================
  // Feature F3: Easy-to-Find Requirements Under Academics
  // =========================================================================

  test('T1-F3-01: academics.html surfaces #requirements near top of <main> with 30-cr MS, 72-cr PhD, B-/3.0 QPA, tracks, and direct links', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      const nav = await page.goto(pageUrl('academics.html'));
      assert.equal(nav.status, 200, 'Expected HTTP 200 for academics.html');

      const audit = await page.evaluate(() => {
        const main = document.querySelector('main');
        const req = document.getElementById('requirements');
        if (!main || !req) {
          return { found: false };
        }
        const mainRect = main.getBoundingClientRect();
        const reqRect = req.getBoundingClientRect();
        const scope = req.tagName === 'SECTION' || req.tagName === 'DIV' ? req : req.closest('section, div') || main;
        const text = (scope.textContent || '').replace(/\s+/g, ' ').trim();
        const mainText = (main.textContent || '').replace(/\s+/g, ' ').trim();
        const hrefs = [...main.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || '');

        return {
          found: true,
          offsetFromMainTop: Number((reqRect.top - mainRect.top).toFixed(2)),
          text,
          mainText,
          hrefs,
        };
      });

      assert.equal(audit.found, true, 'Expected #requirements element inside <main> on academics.html');
      assert.ok(
        audit.offsetFromMainTop < 900,
        `Expected #requirements near the top of <main> on academics.html, got offset ${audit.offsetFromMainTop}px`
      );
      assert.match(audit.mainText, /\b30\b.*credit/i, 'Expected 30-credit MS summary on academics.html');
      assert.match(audit.mainText, /\b72\b.*credit/i, 'Expected 72-credit PhD summary on academics.html');
      assert.match(audit.mainText, /\bB-(?:\s|$|[.,;)])/, 'Expected B- course grade requirement on academics.html');
      assert.match(audit.mainText, /\b3\.0\b/, 'Expected 3.0 QPA/GPA requirement on academics.html');
      assert.match(
        audit.mainText,
        /Biomedical\s+Informatics/i,
        'Expected General & Biomedical Informatics tracks on academics.html'
      );

      assert.ok(
        audit.hrefs.some((h) => h.includes('ms.html#requirements')),
        'Expected link to ms.html#requirements on academics.html'
      );
      assert.ok(
        audit.hrefs.some((h) => h.includes('phd.html#requirements')),
        'Expected link to phd.html#requirements on academics.html'
      );
      assert.ok(
        audit.hrefs.some((h) => h.includes('courses.html')),
        'Expected link to courses.html on academics.html'
      );
      assert.ok(
        audit.hrefs.some((h) => h.includes('funding.html')),
        'Expected link to funding.html on academics.html'
      );
      assert.ok(
        audit.hrefs.some((h) => h.includes('catoid=242')),
        'Expected 2026-2027 catalog link (catoid=242) on academics.html'
      );
    });
  });

  test('T1-F3-02: ms.html elevates #requirements as its top curriculum section with 30-credit breakdown, track tables, and catoid=242 link', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      const nav = await page.goto(pageUrl('ms.html'));
      assert.equal(nav.status, 200, 'Expected HTTP 200 for ms.html');

      const audit = await page.evaluate(() => {
        const main = document.querySelector('main');
        const req = document.getElementById('requirements');
        if (!main || !req) return { found: false };
        const mainRect = main.getBoundingClientRect();
        const reqRect = req.getBoundingClientRect();
        const mainText = (main.textContent || '').replace(/\s+/g, ' ').trim();
        const hrefs = [...main.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || '');
        return {
          found: true,
          offsetFromMainTop: Number((reqRect.top - mainRect.top).toFixed(2)),
          mainText,
          hrefs,
        };
      });

      assert.equal(audit.found, true, 'Expected #requirements section on ms.html');
      assert.ok(
        audit.offsetFromMainTop < 800,
        `Expected #requirements near top of <main> on ms.html, got offset ${audit.offsetFromMainTop}px`
      );
      assert.match(audit.mainText, /\b30\b.*credit/i, 'Expected 30-credit requirement on ms.html');
      assert.match(
        audit.mainText,
        /Biomedical\s+Informatics/i,
        'Expected General & Biomedical Informatics track details on ms.html'
      );
      assert.ok(
        audit.hrefs.some((h) => h.includes('catoid=242')),
        'Expected 2026-2027 catalog link (catoid=242) on ms.html'
      );
    });
  });

  test('T1-F3-03: phd.html elevates #requirements as its top curriculum section with 72 credits, ISSP 2020/2030, INFSCI 3005, milestones, and catoid=242', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      const nav = await page.goto(pageUrl('phd.html'));
      assert.equal(nav.status, 200, 'Expected HTTP 200 for phd.html');

      const audit = await page.evaluate(() => {
        const main = document.querySelector('main');
        const req = document.getElementById('requirements');
        if (!main || !req) return { found: false };
        const mainRect = main.getBoundingClientRect();
        const reqRect = req.getBoundingClientRect();
        const mainText = (main.textContent || '').replace(/\s+/g, ' ').trim();
        const hrefs = [...main.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || '');
        return {
          found: true,
          offsetFromMainTop: Number((reqRect.top - mainRect.top).toFixed(2)),
          mainText,
          hrefs,
        };
      });

      assert.equal(audit.found, true, 'Expected #requirements section on phd.html');
      assert.ok(
        audit.offsetFromMainTop < 800,
        `Expected #requirements near top of <main> on phd.html, got offset ${audit.offsetFromMainTop}px`
      );
      assert.match(audit.mainText, /\b72\b.*credit/i, 'Expected 72-credit requirement on phd.html');
      assert.ok(audit.mainText.includes('ISSP 2020'), 'Expected ISSP 2020 on phd.html');
      assert.ok(audit.mainText.includes('ISSP 2030'), 'Expected ISSP 2030 on phd.html');
      assert.ok(audit.mainText.includes('INFSCI 3005'), 'Expected INFSCI 3005 on phd.html');
      assert.match(
        audit.mainText,
        /comprehensive|preliminary|dissertation/i,
        'Expected PhD milestone details on phd.html'
      );
      assert.ok(
        audit.hrefs.some((h) => h.includes('catoid=242')),
        'Expected 2026-2027 catalog link (catoid=242) on phd.html'
      );
    });
  });

  test('T1-F3-04: Sticky navigation includes an accessible Academics disclosure submenu linking to requirements, courses, and funding while keeping Academics link navigable', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      await page.goto(pageUrl('index.html'));

      const initial = await findAcademicsDisclosure(page);
      assert.equal(
        initial.found,
        true,
        'Expected an accessible Academics disclosure <button[aria-expanded]> in Main navigation'
      );
      assert.equal(initial.visible, true, 'Expected Academics disclosure button to be visible at 1440x900');
      assert.equal(initial.expanded, false, 'Expected Academics submenu to start collapsed (aria-expanded="false")');
      assert.ok(
        initial.academicsLinkHref && initial.academicsLinkHref.endsWith('academics.html'),
        `Expected top-level Academics link to remain directly navigable to academics.html, got ${initial.academicsLinkHref}`
      );

      await page.clickAt(initial.rect.centerX, initial.rect.centerY);
      await page.waitFor(
        async () => (await findAcademicsDisclosure(page)).expanded === true,
        { timeoutMs: 3000, message: 'Clicking Academics disclosure button should expand submenu' }
      );

      const opened = await findAcademicsDisclosure(page);
      assert.equal(opened.expanded, true);
      assert.equal(opened.menuVisible, true, 'Expected Academics submenu panel to be visible when expanded');

      const hrefs = opened.menuLinks.map((l) => l.href);
      const requiredTargets = [
        'academics.html#requirements',
        'ms.html#requirements',
        'phd.html#requirements',
        'courses.html',
        'funding.html',
      ];
      for (const target of requiredTargets) {
        assert.ok(
          hrefs.some((h) => h.endsWith(target) || h.includes(target)),
          `Expected Academics submenu to link to "${target}", found links: ${JSON.stringify(hrefs)}`
        );
      }
    });
  });

  test('T1-F3-05: Breadcrumbs on ms.html, phd.html, courses.html and data-source-link official ISP handoffs on academics.html, ms.html, phd.html are preserved', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      for (const route of ['ms.html', 'phd.html', 'courses.html']) {
        const nav = await page.goto(pageUrl(route));
        assert.equal(nav.status, 200, `Expected HTTP 200 for ${route}`);

        const bc = await page.evaluate(() => {
          const navEl = document.querySelector('nav[aria-label="Breadcrumb"]');
          if (!navEl) return { found: false };
          const hrefs = [...navEl.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || '');
          const current = navEl.querySelector('[aria-current="page"]');
          return {
            found: true,
            hrefs,
            hasCurrent: Boolean(current && current.textContent.trim().length > 0),
          };
        });

        assert.equal(bc.found, true, `Expected <nav aria-label="Breadcrumb"> on ${route}`);
        assert.ok(bc.hrefs.includes('index.html'), `Expected Home (index.html) breadcrumb link on ${route}`);
        if (route === 'ms.html' || route === 'phd.html') {
          assert.deepEqual(
            bc.hrefs,
            ['index.html', 'academics.html'],
            `Expected ['index.html', 'academics.html'] breadcrumb trail on ${route}`
          );
        }
        assert.equal(bc.hasCurrent, true, `Expected [aria-current="page"] breadcrumb item on ${route}`);
      }

      for (const route of ['academics.html', 'ms.html', 'phd.html']) {
        await page.goto(pageUrl(route));
        const sourceLinks = await page.evaluate(() =>
          [...document.querySelectorAll('a[data-source-link]')].map((a) => a.getAttribute('href') || '')
        );
        assert.ok(
          sourceLinks.length >= 1,
          `Expected >= 1 a[data-source-link] official ISP handoff on ${route}`
        );
        for (const href of sourceLinks) {
          assert.ok(
            href.startsWith('https://www.isp.pitt.edu/') && !href.endsWith('.html'),
            `Expected clean official ISP URL on ${route}, got ${href}`
          );
        }
      }
    });
  });

  // =========================================================================
  // Feature F4: Prominent Scholarships & Funding
  // =========================================================================

  test('T1-F4-01: Dedicated funding.html loads HTTP 200 with single <h1> and <main>, organizing PhD Funding, MS Funding, and All ISP Students / Travel Grants', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      const nav = await page.goto(pageUrl('funding.html'));
      assert.equal(nav.status, 200, `Expected HTTP 200 for funding.html, got ${nav.status}`);
      assert.equal(page.localFailedRequests.length, 0);
      assert.equal(page.pageErrors.length, 0);
      assert.equal(page.consoleErrors.length, 0);

      const structure = await auditPageStructure(page);
      assert.equal(structure.h1Count, 1, 'Expected exact 1 <h1> on funding.html');
      assert.equal(structure.mainCount, 1, 'Expected exact 1 <main> on funding.html');
      assert.equal(
        structure.headingOrderOk,
        true,
        `Heading order violations on funding.html: ${JSON.stringify(structure.headingViolations)}`
      );

      const headingsText = await page.evaluate(() =>
        [...document.querySelectorAll('main h1, main h2, main h3')]
          .map((h) => h.textContent.replace(/\s+/g, ' ').trim())
          .join(' | ')
      );
      assert.match(headingsText, /PhD/i, 'Expected PhD funding section heading on funding.html');
      assert.match(headingsText, /\bMS\b|Master/i, 'Expected MS funding section heading on funding.html');
      assert.match(
        headingsText,
        /Travel|All\s+ISP\s+Students|External/i,
        'Expected Travel Grants / All ISP Students section heading on funding.html'
      );
    });
  });

  test('T1-F4-02: funding.html documents all verified PhD funding fellowships, assistantships, and training grants', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      const nav = await page.goto(pageUrl('funding.html'));
      assert.equal(nav.status, 200, 'Expected HTTP 200 for funding.html');

      const text = await page.evaluate(() =>
        (document.querySelector('main')?.textContent || '').replace(/\s+/g, ' ').trim()
      );

      const requiredPhdItems = [
        { name: 'SCI Predoctoral Fellowship', re: /SCI\s+Predoctoral/i },
        { name: 'Provost Predoctoral Fellowship', re: /Provost(?:'s)?\s+Predoctoral/i },
        {
          name: 'Graduate Research Assistantships (GSR)',
          re: /Graduate\s+Student\s+Research|\bGSR\b|Graduate\s+Research\s+Assistantship/i,
        },
        { name: 'Summer GSA Fellowship', re: /Summer\s+GSA|Graduate\s+Student\s+Assistant/i },
        { name: 'Elizabeth U. Baranger Fellowship', re: /Baranger/i },
        { name: 'Provost Dissertation Completion Fellowship', re: /Dissertation\s+Completion/i },
        { name: 'DBMI Training Grant', re: /DBMI\s+Training\s+Grant|Biomedical\s+Informatics\s+Training\s+Grant/i },
      ];

      for (const item of requiredPhdItems) {
        assert.match(
          text,
          item.re,
          `Expected PhD funding item "${item.name}" to be documented on funding.html`
        );
      }
    });
  });

  test('T1-F4-03: funding.html documents verified MS funding (Pitt2Pitt $7,500 MSISP, King/Howard/Smith scholarships, PittFund$Me, rare MS assistantships note)', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      const nav = await page.goto(pageUrl('funding.html'));
      assert.equal(nav.status, 200, 'Expected HTTP 200 for funding.html');

      const text = await page.evaluate(() =>
        (document.querySelector('main')?.textContent || '').replace(/\s+/g, ' ').trim()
      );

      assert.match(text, /Pitt2Pitt/i, 'Expected Pitt2Pitt Scholarship on funding.html');
      assert.match(text, /\$7,500/, 'Expected $7,500 Pitt2Pitt scholarship amount on funding.html');
      assert.match(text, /King/i, 'Expected Barbara E. King scholarship on funding.html');
      assert.match(text, /Howard/i, 'Expected Russell "Rusty" A. Howard II scholarship on funding.html');
      assert.match(text, /Smith/i, 'Expected Jerry & Cathy Smith scholarship on funding.html');
      assert.match(text, /PittFund\$Me/i, 'Expected PittFund$Me database on funding.html');
      assert.match(
        text,
        /rare|limited|primarily\s+reserved\s+for\s+PhD/i,
        'Expected transparent note that MS assistantships/fellowships are rare on funding.html'
      );
    });
  });

  test('T1-F4-04: funding.html documents ISP Student Travel Grants ($750-$1,000), external fellowships (NSF, Fulbright), and links to Pitt Graduate Studies & SCI Aid', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      const nav = await page.goto(pageUrl('funding.html'));
      assert.equal(nav.status, 200, 'Expected HTTP 200 for funding.html');

      const info = await page.evaluate(() => {
        const main = document.querySelector('main') || document.body;
        return {
          text: (main.textContent || '').replace(/\s+/g, ' ').trim(),
          hrefs: [...main.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || ''),
        };
      });

      assert.match(info.text, /Travel\s+Grant/i, 'Expected ISP Student Travel Grants on funding.html');
      assert.match(info.text, /\$750/, 'Expected $750 travel grant figure on funding.html');
      assert.match(info.text, /\$1,000/, 'Expected $1,000 travel grant figure on funding.html');
      assert.match(info.text, /\bNSF\b|National\s+Science\s+Foundation/i, 'Expected NSF external fellowship mention on funding.html');
      assert.match(info.text, /Fulbright/i, 'Expected Fulbright external fellowship mention on funding.html');

      assert.ok(
        info.hrefs.some((h) => h.includes('gradstudies.pitt.edu/funding')),
        `Expected link to gradstudies.pitt.edu/funding on funding.html, found ${JSON.stringify(info.hrefs)}`
      );
      assert.ok(
        info.hrefs.some((h) => h.includes('sci.pitt.edu/admissions/')),
        `Expected link to sci.pitt.edu/admissions/ tuition/scholarships on funding.html, found ${JSON.stringify(info.hrefs)}`
      );
    });
  });

  test('T1-F4-05: Scholarships & Funding is surfaced prominently on index.html, in the top-level sticky navbar, and in the footer', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      const nav = await page.goto(pageUrl('index.html'));
      assert.equal(nav.status, 200, 'Expected HTTP 200 for index.html');

      const prominence = await page.evaluate(() => {
        const isVisible = (el) => {
          if (!el || el.hidden || el.closest('[hidden]')) return false;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
            return false;
          }
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        };

        const mainLinks = [...document.querySelectorAll('main a[href*="funding.html"]')].filter(isVisible);
        const navLinks = [
          ...document.querySelectorAll('nav[aria-label="Main navigation"] a[href$="funding.html"]'),
        ].filter(isVisible);
        const footerLinks = [...document.querySelectorAll('footer a[href$="funding.html"]')].filter(
          isVisible
        );

        return {
          mainFundingLinks: mainLinks.map((a) => ({
            href: a.getAttribute('href') || '',
            text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
          })),
          navFundingLinks: navLinks.map((a) => ({
            href: a.getAttribute('href') || '',
            text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
          })),
          footerFundingLinks: footerLinks.map((a) => ({
            href: a.getAttribute('href') || '',
            text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
          })),
        };
      });

      assert.ok(
        prominence.mainFundingLinks.length >= 1,
        'Expected >= 1 prominent visible link to funding.html inside <main> on index.html'
      );
      assert.ok(
        prominence.navFundingLinks.length >= 1,
        'Expected top-level visible "Funding" link to funding.html in Main navigation'
      );
      assert.ok(
        prominence.footerFundingLinks.length >= 1,
        'Expected visible "Scholarships & funding" link to funding.html in site <footer>'
      );
    });
  });

  test('T1-F4-06: Scholarships & Funding links/callouts appear visibly on admissions.html (#funding), academics.html, ms.html, phd.html, and resources.html#travel-grants', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      for (const route of ['admissions.html', 'academics.html', 'ms.html', 'phd.html']) {
        const nav = await page.goto(pageUrl(route));
        assert.equal(nav.status, 200, `Expected HTTP 200 for ${route}`);

        const check = await page.evaluate((r) => {
          const isVisible = (el) => {
            if (!el || el.hidden || el.closest('[hidden]')) return false;
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return false;
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          };
          const main = document.querySelector('main');
          const links = main
            ? [...main.querySelectorAll('a[href*="funding.html"]')].filter(isVisible)
            : [];
          const hasFundingId = Boolean(document.getElementById('funding'));
          return {
            route: r,
            visibleFundingLinks: links.length,
            hasFundingId,
          };
        }, route);

        assert.ok(
          check.visibleFundingLinks >= 1,
          `Expected >= 1 visible link to funding.html inside <main> on ${route}`
        );
        if (route === 'admissions.html') {
          assert.equal(
            check.hasFundingId,
            true,
            'Expected #funding anchor section on admissions.html'
          );
        }
      }

      // resources.html#travel-grants cross-link
      const resNav = await page.goto(pageUrl('resources.html#travel-grants'));
      assert.equal(resNav.status, 200, 'Expected HTTP 200 for resources.html#travel-grants');
      const travelCheck = await page.evaluate(() => {
        const tg = document.getElementById('travel-grants');
        if (!tg) return { found: false };
        const link = tg.querySelector('a[href*="funding.html"]');
        return {
          found: true,
          open: tg.tagName === 'DETAILS' ? Boolean(tg.open) : true,
          hasFundingLink: Boolean(link),
        };
      });
      assert.equal(travelCheck.found, true, 'Expected #travel-grants on resources.html');
      assert.equal(travelCheck.open, true, 'Expected #travel-grants <details> to auto-open on hash navigation');
      assert.equal(
        travelCheck.hasFundingLink,
        true,
        'Expected #travel-grants on resources.html to cross-link to funding.html'
      );
    });
  });

  // =========================================================================
  // Feature F5: Faculty Explorer Replacing People Page (people.html)
  // =========================================================================

  test('T1-F5-01: people.html is branded Faculty Explorer in <h1>, <title>, and nav, defaults to 30 Faculty, and switches across all 6 directory scopes', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      const nav = await page.goto(pageUrl('people.html'));
      assert.equal(nav.status, 200, 'Expected HTTP 200 for people.html');

      const state = await getFacultyExplorerState(page);
      assert.match(
        state.h1Text,
        /Faculty\s+Explorer/i,
        `Expected <h1> on people.html to contain "Faculty Explorer", got "${state.h1Text}"`
      );
      assert.match(
        state.title,
        /Faculty\s+Explorer/i,
        `Expected <title> on people.html to contain "Faculty Explorer", got "${state.title}"`
      );

      const navLabel = await page.evaluate(() => {
        const a = document.querySelector('nav[aria-label="Main navigation"] a[href$="people.html"]');
        return a ? a.textContent.replace(/\s+/g, ' ').trim() : '';
      });
      assert.match(
        navLabel,
        /Faculty\s+Explorer/i,
        `Expected Main navigation link to people.html to be labeled "Faculty Explorer", got "${navLabel}"`
      );

      assert.equal(state.totalCards, 190, 'Expected 190 total person cards in DOM');
      assert.equal(state.visibleCount, 30, 'Expected default Faculty Explorer scope to show 30 Faculty');

      const expectedScopes = [
        { label: 'Graduate students', count: 32 },
        { label: 'Emeriti faculty', count: 6 },
        { label: 'Staff', count: 1 },
        { label: 'Alumni', count: 123 },
        { label: 'All people', count: 190 },
        { label: 'Faculty', count: 30 },
      ];

      for (const scope of expectedScopes) {
        await selectPeopleScope(page, scope.label);
        await page.waitFor(
          async () => (await getFacultyExplorerState(page)).visibleCount === scope.count,
          {
            timeoutMs: 3000,
            message: `Selecting scope "${scope.label}" should display ${scope.count} profiles`,
          }
        );
      }
    });
  });

  test('T1-F5-02: Dedicated partial-name search matches substrings ("Brus", "Kov", "Lit") strictly on person name with zero bio/role false positives', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      await page.goto(pageUrl('people.html'));

      // 1. "Brus" -> Peter Brusilovsky
      await setPeopleNameQuery(page, 'Brus');
      await page.waitFor(
        async () => {
          const s = await getFacultyExplorerState(page);
          return s.visibleCount === 1 && s.visibleSlugs[0] === 'peter-brusilovsky';
        },
        { timeoutMs: 3000, message: 'Partial-name query "Brus" should match only peter-brusilovsky' }
      );

      // 2. "Kov" -> Adriana Kovashka
      await setPeopleNameQuery(page, 'Kov');
      await page.waitFor(
        async () => {
          const s = await getFacultyExplorerState(page);
          return s.visibleCount === 1 && s.visibleSlugs[0] === 'adriana-kovashka';
        },
        { timeoutMs: 3000, message: 'Partial-name query "Kov" should match only adriana-kovashka' }
      );

      // 3. "Lit" -> ONLY Diane Litman in Faculty (zero bio/role false positives!)
      await setPeopleNameQuery(page, 'Lit');
      const litState = await getFacultyExplorerState(page);
      const bioRoleTrapSlugs = [
        'michael-colaresi', // "Political Science"
        'yu-ru-lin', // "political"
        'janet-liu', // "interpretability"
        'xinghua-lu', // "Literature"
        'amin-rahimian', // "Probability"
        'ahmad-p-tafti', // "Rehabilitation"
        'leming-zhou', // "Rehabilitation"
      ];
      for (const trap of bioRoleTrapSlugs) {
        assert.ok(
          !litState.visibleSlugs.includes(trap),
          `Partial-name query "Lit" must NOT match bio/role/department substring trap "${trap}", got visible: ${JSON.stringify(litState.visibleSlugs)}`
        );
      }
      assert.deepEqual(
        litState.visibleSlugs,
        ['diane-litman'],
        `Expected partial-name query "Lit" in Faculty scope to match only ['diane-litman'], got ${JSON.stringify(litState.visibleSlugs)}`
      );
    });
  });

  test('T1-F5-03: Topic / research-area search for "AI" matches all 10 verified explicit AI & Artificial Intelligence faculty (count >= 10)', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      await page.goto(pageUrl('people.html'));

      await setPeopleTopicQuery(page, 'AI');
      const state = await getFacultyExplorerState(page);

      assert.ok(
        state.visibleCount >= 10 && state.visibleCount < 30,
        `Expected topic query "AI" to match >= 10 (and < 30) Faculty profiles, got ${state.visibleCount}`
      );

      // All 10 verified explicit \bAI\b and "Artificial Intelligence" faculty
      const verifiedAiFaculty = [
        'diane-litman', // "Artificial Intelligence in Education"
        'raquel-coelho', // "artificial intelligence"
        'shandong-wu', // "Artificial Intelligence in Clinical Informatics"
        'yanshan-wang', // "Artificial Intelligence"
        'kevin-ashley', // "AI and law"
        'milos-hauskrecht', // "Applications of AI in Medicine and Finance"
        'yufei-huang', // "cancer AI for precision oncology"
        'ryan-shi', // "Uses AI to address food security..."
        'ahmad-p-tafti', // "Explainable AI; Artificial Intelligence"
        'shyam-visweswaran', // "Artificial Intelligence and Machine Learning (AI/ML)"
      ];

      for (const slug of verifiedAiFaculty) {
        assert.ok(
          state.visibleSlugs.includes(slug),
          `Topic search "AI" must include verified AI / Artificial Intelligence faculty "${slug}", got: ${JSON.stringify(state.visibleSlugs)}`
        );
      }
    });
  });

  test('T1-F5-04: Acronym & synonym topic searches ("NLP", "ML", "CV", "HCI") expand accurately to matching faculty', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      await page.goto(pageUrl('people.html'));

      // 1. "NLP" >= 9
      await setPeopleTopicQuery(page, 'NLP');
      const nlpState = await getFacultyExplorerState(page);
      assert.ok(
        nlpState.visibleCount >= 9,
        `Expected topic query "NLP" to match >= 9 faculty via synonym expansion, got ${nlpState.visibleCount}`
      );
      for (const slug of ['diane-litman', 'daqing-he', 'lorraine-xiang-li', 'janet-liu', 'yanshan-wang']) {
        assert.ok(
          nlpState.visibleSlugs.includes(slug),
          `Expected "NLP" topic search to include "${slug}", got ${JSON.stringify(nlpState.visibleSlugs)}`
        );
      }

      // 2. "ML" >= 12
      await setPeopleTopicQuery(page, 'ML');
      const mlState = await getFacultyExplorerState(page);
      assert.ok(
        mlState.visibleCount >= 12,
        `Expected topic query "ML" to match >= 12 faculty via synonym expansion, got ${mlState.visibleCount}`
      );
      for (const slug of ['milos-hauskrecht', 'daqing-he', 'ahmad-p-tafti', 'shyam-visweswaran', 'shandong-wu']) {
        assert.ok(
          mlState.visibleSlugs.includes(slug),
          `Expected "ML" topic search to include "${slug}", got ${JSON.stringify(mlState.visibleSlugs)}`
        );
      }

      // 3. "CV" >= 3
      await setPeopleTopicQuery(page, 'CV');
      const cvState = await getFacultyExplorerState(page);
      assert.ok(
        cvState.visibleCount >= 3,
        `Expected topic query "CV" to match >= 3 computer vision faculty, got ${cvState.visibleCount}`
      );
      for (const slug of ['adriana-kovashka', 'ahmad-p-tafti', 'shandong-wu']) {
        assert.ok(
          cvState.visibleSlugs.includes(slug),
          `Expected "CV" topic search to include "${slug}", got ${JSON.stringify(cvState.visibleSlugs)}`
        );
      }

      // 4. "HCI" >= 5
      await setPeopleTopicQuery(page, 'HCI');
      const hciState = await getFacultyExplorerState(page);
      assert.ok(
        hciState.visibleCount >= 5,
        `Expected topic query "HCI" to match >= 5 HCI faculty, got ${hciState.visibleCount}`
      );
      for (const slug of ['peter-brusilovsky', 'na-du', 'harry-hochheiser', 'michael-lewis', 'erin-walker']) {
        assert.ok(
          hciState.visibleSlugs.includes(slug),
          `Expected "HCI" topic search to include "${slug}", got ${JSON.stringify(hciState.visibleSlugs)}`
        );
      }
    });
  });

  test('T1-F5-05: Clickable topic filter chips with counts and clickable card topic tags filter results and update aria-live="polite" status', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      await page.goto(pageUrl('people.html'));

      const initial = await getFacultyExplorerState(page);
      assert.ok(
        initial.topicChips.length >= 6,
        `Expected >= 6 visible clickable topic filter chips on people.html, found ${initial.topicChips.length}`
      );
      assert.ok(
        initial.topicChips.some((c) => /\d+/.test(c.text)),
        `Expected topic filter chips to display counts, got ${JSON.stringify(initial.topicChips)}`
      );
      assert.equal(initial.hasLiveRegion, true, 'Expected aria-live="polite" / role="status" region on people.html');

      await clickTopicChip(page, /Computer\s+vision/i);
      await page.waitFor(
        async () => (await getFacultyExplorerState(page)).visibleCount === 3,
        { timeoutMs: 3000, message: 'Clicking "Computer vision" chip should filter to 3 faculty' }
      );
      const afterChip = await getFacultyExplorerState(page);
      assert.deepEqual(
        [...afterChip.visibleSlugs].sort(),
        ['adriana-kovashka', 'ahmad-p-tafti', 'shandong-wu'],
        'Computer vision chip should show Adriana Kovashka, Ahmad P Tafti, and Shandong Wu'
      );
      assert.match(afterChip.statusText, /\b3\b/, 'Live status region should announce 3 matching profiles');

      // Reload and click an interactive topic tag inside #person-peter-brusilovsky
      await page.goto(pageUrl('people.html'));
      await clickCardTopicTag(page, 'peter-brusilovsky', /Human-computer\s+interaction/i);
      await page.waitFor(
        async () => (await getFacultyExplorerState(page)).visibleCount === 5,
        {
          timeoutMs: 3000,
          message: 'Clicking "Human-computer interaction" tag on Peter Brusilovsky card should filter to 5 HCI faculty',
        }
      );
      const afterTag = await getFacultyExplorerState(page);
      for (const slug of ['peter-brusilovsky', 'na-du', 'harry-hochheiser', 'michael-lewis', 'erin-walker']) {
        assert.ok(afterTag.visibleSlugs.includes(slug));
      }
      assert.match(afterTag.statusText, /\b5\b/, 'Live status region should announce 5 matching profiles');
    });
  });

  test('T1-F5-06: Combined filters (partial-name + topic) compose via logical AND and persist across page reload via URL query parameters', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      await page.goto(pageUrl('people.html'));

      await setPeopleTopicQuery(page, 'Machine learning');
      const topicOnly = await getFacultyExplorerState(page);
      assert.ok(topicOnly.visibleCount >= 12, `Expected >= 12 faculty for "Machine learning", got ${topicOnly.visibleCount}`);

      await setPeopleNameQuery(page, 'Haus');
      await page.waitFor(
        async () => {
          const s = await getFacultyExplorerState(page);
          return s.visibleCount === 1 && s.visibleSlugs[0] === 'milos-hauskrecht';
        },
        {
          timeoutMs: 3000,
          message: 'Combining topic="Machine learning" AND name="Haus" should narrow to milos-hauskrecht',
        }
      );

      const urlWithParams = await page.getUrl();
      assert.ok(
        urlWithParams.includes('?'),
        `Expected active Faculty Explorer filters to sync to URL query string, got ${urlWithParams}`
      );

      // Reload the URL in a fresh navigation and verify state persists
      await page.goto(urlWithParams);
      const reloaded = await getFacultyExplorerState(page);
      assert.deepEqual(
        reloaded.visibleSlugs,
        ['milos-hauskrecht'],
        `Reloading ${urlWithParams} should restore filtered view ['milos-hauskrecht'], got ${JSON.stringify(reloaded.visibleSlugs)}`
      );
    });
  });

  // =========================================================================
  // Feature F6: Sticky Scroll-Following Navbar & Anchor Offsets
  // =========================================================================

  test('T1-F6-01: Desktop 1440x900 sticky navbar stays pinned at top ≈ 0 at scrollY=600 and 800 across index, academics, people, funding, and courses', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      const routes = ['index.html', 'academics.html', 'people.html', 'funding.html', 'courses.html'];
      for (const route of routes) {
        const nav = await page.goto(pageUrl(route));
        assert.equal(nav.status, 200, `Expected HTTP 200 for ${route}`);

        for (const targetY of [600, 800]) {
          const actualY = await page.scrollTo(targetY);
          assert.ok(actualY > 0, `Expected page ${route} to scroll > 0 for target ${targetY}`);

          const sticky = await findStickyNavInfo(page);
          assert.equal(
            sticky.found,
            true,
            `Expected sticky/fixed navigation container on ${route} at scrollY=${targetY}: ${sticky.reason || ''}`
          );
          assert.ok(
            sticky.position === 'sticky' || sticky.position === 'fixed',
            `Expected position sticky or fixed on ${route}, got ${sticky.position}`
          );
          assert.ok(
            Math.abs(sticky.top) <= 1.5,
            `Expected sticky nav pinned at top ≈ 0 on ${route} (scrollY=${actualY}), got top=${sticky.top}`
          );
          assert.ok(
            sticky.height > 20,
            `Expected positive height on sticky nav on ${route}, got ${sticky.height}`
          );
          assert.ok(
            sticky.bgAlpha >= 0.99,
            `Expected opaque background on sticky nav on ${route}, got alpha=${sticky.bgAlpha} (${sticky.bgRgba})`
          );
          assert.equal(sticky.containsMainNav, true);
        }
      }
    });
  });

  test('T1-F6-02: Mobile 375x812 and 320x568 sticky navbar remains pinned at scrollY=600, compact (height <= 140px), with Menu & Search reachable', async () => {
    for (const vp of [
      { width: 375, height: 812 },
      { width: 320, height: 568 },
    ]) {
      await withPage(browser, { width: vp.width, height: vp.height, mobile: true }, async (page) => {
        await page.goto(pageUrl('index.html'));
        await page.scrollTo(600);

        const sticky = await findStickyNavInfo(page);
        assert.equal(
          sticky.found,
          true,
          `Expected sticky navbar at ${vp.width}x${vp.height} when scrolled to 600`
        );
        assert.ok(
          Math.abs(sticky.top) <= 1.5,
          `Expected sticky top ≈ 0 at ${vp.width}x${vp.height}, got ${sticky.top}`
        );
        assert.ok(
          sticky.height > 20 && sticky.height <= 140,
          `Expected compact sticky navbar (20 < height <= 140px) at ${vp.width}x${vp.height}, got ${sticky.height}px`
        );

        const menuToggle = await findMobileMenuToggle(page);
        assert.equal(
          menuToggle.found,
          true,
          `Expected mobile menu toggle button visible at ${vp.width}x${vp.height} scrollY=600`
        );
        assert.ok(
          menuToggle.rect.top >= -1 && menuToggle.rect.bottom <= sticky.bottom + 4,
          `Expected mobile menu toggle inside sticky bar at ${vp.width}x${vp.height}`
        );

        const searchTrig = await findSearchTrigger(page);
        assert.equal(
          searchTrig.found,
          true,
          `Expected Site Search trigger visible at ${vp.width}x${vp.height} scrollY=600`
        );
        assert.ok(
          searchTrig.rect.top >= -1 && searchTrig.rect.bottom <= sticky.bottom + 4,
          `Expected Site Search trigger inside sticky bar at ${vp.width}x${vp.height}`
        );
      });
    }
  });

  test('T1-F6-03: Skip link renders visibly above the sticky navbar with z-index > sticky bar and WCAG AA contrast when keyboard-focused', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      await page.goto(pageUrl('index.html'));

      const sticky = await findStickyNavInfo(page);
      assert.equal(sticky.found, true, 'Expected sticky navbar on index.html');

      await page.pressKey('Tab');
      const skip = await findSkipLinkInfo(page);

      assert.equal(skip.found, true, 'Expected skip link on index.html');
      assert.equal(skip.isFocused, true, 'First Tab press should focus skip link');
      assert.equal(skip.visibleInViewport, true, 'Focused skip link must be visible in viewport');
      assert.ok(
        skip.zIndex > sticky.zIndex,
        `Expected skip link z-index (${skip.zIndex}) > sticky navbar z-index (${sticky.zIndex})`
      );
      assert.equal(
        skip.hitTestOk,
        true,
        'Focused skip link must not be occluded by sticky navbar (elementFromPoint hit test)'
      );
      assert.ok(
        skip.contrastRatio >= 4.5,
        `Expected skip link WCAG AA contrast >= 4.5:1, got ${skip.contrastRatio}:1 (${skip.fg} on ${skip.bg})`
      );
    });
  });

  test('T1-F6-04: In-page "On this page" anchor jumps and people.html#person-peter-brusilovsky land unobstructed below sticky navbar', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      for (const route of ['academics.html', 'ms.html', 'phd.html', 'resources.html']) {
        await page.goto(pageUrl(route));
        const sticky = await findStickyNavInfo(page);
        assert.equal(sticky.found, true, `Expected sticky navbar on ${route}`);

        const firstJumpHref = await page.evaluate(() => {
          const a = document.querySelector('nav[aria-label="On this page"] a[href^="#"]');
          return a ? a.getAttribute('href') || '' : '';
        });
        assert.ok(firstJumpHref.startsWith('#') && firstJumpHref.length > 1, `Expected On this page jump link on ${route}`);
        const targetId = firstJumpHref.slice(1);

        await page.clickAndWaitForNavigation(`nav[aria-label="On this page"] a[href="${firstJumpHref}"]`);
        const clearance = await checkAnchorNotOccluded(page, targetId);
        assert.equal(clearance.found, true, `Expected target #${targetId} on ${route}`);
        assert.equal(clearance.stickyFound, true);
        assert.equal(
          clearance.unobstructed,
          true,
          `Expected #${targetId} on ${route} to land below sticky bar (targetTop=${clearance.targetTop}, stickyBottom=${clearance.stickyBottom})`
        );
      }

      // Direct deep link to people.html#person-peter-brusilovsky
      await page.goto(pageUrl('people.html#person-peter-brusilovsky'));
      const personClearance = await checkAnchorNotOccluded(page, 'person-peter-brusilovsky');
      assert.equal(personClearance.found, true);
      assert.equal(personClearance.stickyFound, true, 'Expected sticky navbar on people.html');
      assert.equal(
        personClearance.unobstructed,
        true,
        `Expected #person-peter-brusilovsky below sticky bar (targetTop=${personClearance.targetTop}, stickyBottom=${personClearance.stickyBottom})`
      );
    });
  });

  test('T1-F6-05: Mobile menu opens, closes on Escape returning focus to toggle button, and closes on outside click at 375x812 and 320x568', async () => {
    for (const vp of [
      { width: 375, height: 812 },
      { width: 320, height: 568 },
    ]) {
      await withPage(browser, { width: vp.width, height: vp.height, mobile: true }, async (page) => {
        await page.goto(pageUrl('index.html'));
        await page.scrollTo(400);

        const sticky = await findStickyNavInfo(page);
        assert.equal(sticky.found, true, `Expected sticky navbar at ${vp.width}x${vp.height}`);

        const initial = await findMobileMenuToggle(page);
        assert.equal(initial.found, true, `Expected mobile menu toggle at ${vp.width}x${vp.height}`);
        assert.equal(initial.expanded, false);

        // Open menu
        await page.clickAt(initial.rect.centerX, initial.rect.centerY);
        await page.waitFor(
          async () => (await findMobileMenuToggle(page)).expanded === true,
          { timeoutMs: 3000, message: `Mobile menu should open on click at ${vp.width}x${vp.height}` }
        );

        // Close with Escape and verify focus returns to toggle button
        await page.pressKey('Escape');
        await page.waitFor(
          async () => (await findMobileMenuToggle(page)).expanded === false,
          { timeoutMs: 3000, message: `Mobile menu should close on Escape at ${vp.width}x${vp.height}` }
        );
        const afterEscape = await findMobileMenuToggle(page);
        assert.equal(
          afterEscape.isFocused,
          true,
          `Focus must return to mobile menu toggle button after Escape at ${vp.width}x${vp.height}`
        );

        // Re-open menu and close by clicking outside on <main>
        await page.clickAt(afterEscape.rect.centerX, afterEscape.rect.centerY);
        await page.waitFor(
          async () => (await findMobileMenuToggle(page)).expanded === true,
          { timeoutMs: 3000, message: 'Mobile menu should re-open on click' }
        );

        await page.clickAt(Math.floor(vp.width / 2), vp.height - 20);
        await page.waitFor(
          async () => (await findMobileMenuToggle(page)).expanded === false,
          { timeoutMs: 3000, message: `Mobile menu should close on outside click at ${vp.width}x${vp.height}` }
        );
      });
    }
  });

  // =========================================================================
  // Feature F7: Zero-Dependency Site-Wide Search
  // =========================================================================

  test('T1-F7-01: Sticky navbar exposes visible Search trigger; clicking it opens accessible role="dialog" aria-modal="true" modal and focuses input', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      await page.goto(pageUrl('index.html'));

      const trig = await findSearchTrigger(page);
      assert.equal(trig.found, true, 'Expected visible Site Search trigger in sticky navbar');
      assert.equal(trig.isButton, true, 'Expected Site Search trigger to be an interactive button when JS is enabled');

      const dlg = await openSiteSearch(page, 'click');
      assert.equal(dlg.open, true, 'Expected Site Search modal dialog to open on click');
      assert.equal(dlg.ariaModal, true, 'Expected aria-modal="true" on Site Search dialog');
      assert.equal(dlg.hasInput, true, 'Expected search input inside Site Search dialog');
      assert.equal(dlg.inputFocused, true, 'Opening Site Search dialog must move focus into the search input');
    });
  });

  test('T1-F7-02: Pressing "/" or Ctrl+K outside form inputs opens search modal and focuses input; Escape closes and returns focus to trigger', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      await page.goto(pageUrl('index.html'));

      // 1. Open via '/' shortcut
      const dlgSlash = await openSiteSearch(page, '/');
      assert.equal(dlgSlash.open, true, 'Expected "/" shortcut to open Site Search modal');
      assert.equal(dlgSlash.inputFocused, true, 'Expected search input focused after "/" shortcut');

      await page.pressKey('Escape');
      await page.waitFor(
        async () => (await getSearchDialogState(page)).open === false,
        { timeoutMs: 3000, message: 'Escape should close Site Search modal' }
      );
      const trigAfterSlash = await findSearchTrigger(page);
      assert.equal(
        trigAfterSlash.isFocused,
        true,
        'Closing Site Search modal with Escape should return focus to Search trigger button'
      );

      // 2. Open via 'Ctrl+K' shortcut
      const dlgCtrlK = await openSiteSearch(page, 'ctrl+k');
      assert.equal(dlgCtrlK.open, true, 'Expected Ctrl+K shortcut to open Site Search modal');
      assert.equal(dlgCtrlK.inputFocused, true, 'Expected search input focused after Ctrl+K shortcut');

      await page.pressKey('Escape');
      await page.waitFor(
        async () => (await getSearchDialogState(page)).open === false,
        { timeoutMs: 3000, message: 'Escape should close Site Search modal after Ctrl+K' }
      );
      const trigAfterCtrlK = await findSearchTrigger(page);
      assert.equal(trigAfterCtrlK.isFocused, true);
    });
  });

  test('T1-F7-03: Domain queries ("scholarship", "AI", "ISSP 2170", "prerequisites", "Brusilovsky", "travel grant") return ranked results, update aria-live="polite", and support category filters', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      await page.goto(pageUrl('index.html'));
      await openSiteSearch(page, 'click');

      const queries = [
        { q: 'scholarship', expectedHrefPart: 'funding.html' },
        { q: 'AI', expectedHrefPart: 'people.html' },
        { q: 'ISSP 2170', expectedHrefPart: 'courses.html' },
        { q: 'prerequisites', expectedHrefPart: 'courses.html' },
        { q: 'Brusilovsky', expectedHrefPart: 'people.html' },
        { q: 'travel grant', expectedHrefPart: 'funding.html' },
      ];

      for (const item of queries) {
        await fillSiteSearch(page, item.q, { inDialog: true });
        await page.waitFor(
          async () => (await getSearchDialogState(page)).results.length >= 1,
          { timeoutMs: 3000, message: `Expected >= 1 site search result for query "${item.q}"` }
        );
        const state = await getSearchDialogState(page);
        assert.equal(state.hasLiveRegion, true, 'Expected aria-live="polite" status region in search modal');
        assert.ok(state.statusText.length > 0, `Expected non-empty status announcement for query "${item.q}"`);

        const matched = state.results.some(
          (r) =>
            r.rawHref.includes(item.expectedHrefPart) ||
            r.href.includes(item.expectedHrefPart) ||
            (item.q === 'travel grant' &&
              (r.rawHref.includes('resources.html#travel-grants') || r.href.includes('resources.html#travel-grants')))
        );
        assert.equal(
          matched,
          true,
          `Expected search results for "${item.q}" to include "${item.expectedHrefPart}", got: ${JSON.stringify(state.results.map((r) => r.rawHref))}`
        );
      }

      // Verify category tabs/filters exist in search modal
      const stateWithCats = await getSearchDialogState(page);
      assert.ok(
        stateWithCats.categories.length >= 2,
        `Expected >= 2 category tabs/filters in Site Search modal, found ${stateWithCats.categories.length}`
      );
    });
  });

  test('T1-F7-04: ArrowDown/ArrowUp + Enter navigates search results and Tab stays trapped inside the open search dialog', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      await page.goto(pageUrl('index.html'));
      await openSiteSearch(page, 'click');
      await fillSiteSearch(page, 'funding', { inDialog: true });

      await page.waitFor(
        async () => (await getSearchDialogState(page)).results.length >= 1,
        { timeoutMs: 3000, message: 'Expected search results for "funding"' }
      );

      // Verify Tab focus trap inside open dialog
      for (let i = 0; i < 6; i++) {
        await page.pressKey('Tab');
        const st = await getSearchDialogState(page);
        assert.equal(
          st.focusInsideDialog,
          true,
          `Tab press #${i + 1} escaped open Site Search dialog`
        );
      }

      // Focus input, use ArrowDown + Enter to navigate to a result
      await fillSiteSearch(page, 'funding', { inDialog: true });
      await page.waitFor(
        async () => (await getSearchDialogState(page)).results.length >= 1,
        { timeoutMs: 3000 }
      );

      const prevUrl = await page.getUrl();
      await page.pressKey('ArrowDown');
      await page.pressKey('Enter');

      await page.waitFor(
        async () => {
          const curUrl = await page.getUrl();
          return curUrl !== prevUrl && curUrl.includes('funding.html');
        },
        {
          timeoutMs: 5000,
          message: 'ArrowDown + Enter on "funding" search result should navigate to funding.html',
        }
      );
    });
  });

  test('T1-F7-05: Dedicated search.html?q=funding pre-fills "funding", renders results including funding.html, and updates on subsequent query', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      const nav = await page.goto(pageUrl('search.html?q=funding'));
      assert.equal(nav.status, 200, `Expected HTTP 200 for search.html?q=funding, got ${nav.status}`);

      await page.waitFor(
        async () => (await getSearchPageState(page)).results.length >= 1,
        { timeoutMs: 4000, message: 'Expected search.html?q=funding to render >= 1 result' }
      );

      const initial = await getSearchPageState(page);
      assert.equal(
        initial.inputValue.toLowerCase(),
        'funding',
        `Expected search.html?q=funding to pre-fill input with "funding", got "${initial.inputValue}"`
      );
      assert.ok(
        initial.results.some((r) => r.rawHref.includes('funding.html') || r.href.includes('funding.html')),
        `Expected search.html?q=funding results to include funding.html, got ${JSON.stringify(initial.results)}`
      );

      // Update query to "ISSP 2071"
      await fillSiteSearch(page, 'ISSP 2071', { inDialog: false });
      await page.pressKey('Enter');
      await page.waitFor(
        async () => {
          const st = await getSearchPageState(page);
          return st.results.some(
            (r) =>
              r.rawHref.includes('courses.html') ||
              r.href.includes('courses.html') ||
              /ISSP\s+2071/i.test(r.text)
          );
        },
        {
          timeoutMs: 4000,
          message: 'Updating query on search.html to "ISSP 2071" should update results to include courses.html / ISSP 2071',
        }
      );
    });
  });

  test('T1-F7-06: assets/search-index.json loads HTTP 200 as valid JSON indexing all required categories with exclusively relative URLs', async () => {
    const resp = await fetch(pageUrl('assets/search-index.json'));
    assert.equal(
      resp.status,
      200,
      `Expected HTTP 200 for assets/search-index.json, got ${resp.status}`
    );

    const payload = await resp.json();
    const items = Array.isArray(payload)
      ? payload
      : payload.items || payload.entries || payload.documents || [];

    assert.ok(
      Array.isArray(items) && items.length >= 50,
      `Expected >= 50 indexed items in assets/search-index.json, found ${items.length}`
    );

    for (const item of items) {
      assert.ok(item.title, `Search index item missing title: ${JSON.stringify(item)}`);
      assert.ok(item.url, `Search index item missing url: ${JSON.stringify(item)}`);
      assert.ok(
        !item.url.startsWith('/') && !/^https?:\/\//i.test(item.url),
        `Search index URL must be relative for GitHub Pages subpath compatibility, got "${item.url}"`
      );
    }

    const allUrls = items.map((i) => i.url).join(' ');
    const allCategories = items.map((i) => i.category || i.type || '').join(' ');

    assert.ok(allUrls.includes('academics.html') && allUrls.includes('ms.html'), 'Index must cover core academics/requirements pages');
    assert.ok(allUrls.includes('courses.html'), 'Index must cover courses');
    assert.ok(allUrls.includes('funding.html'), 'Index must cover funding');
    assert.ok(allUrls.includes('people.html'), 'Index must cover faculty/people');
    assert.ok(allUrls.includes('resources.html'), 'Index must cover student guides/resources');
    assert.ok(allUrls.includes('research.html'), 'Index must cover research');
    assert.ok(allUrls.includes('news.html') && allUrls.includes('events.html'), 'Index must cover news & events');
    assert.ok(allCategories.length > 0, 'Index items must include category labels');
  });

  // =========================================================================
  // Feature F8: Written Change Log (CHANGES.md), Brand & WCAG 2.1 AA Compliance
  // =========================================================================

  test('T1-F8-01: Root CHANGES.md exists, maps every requirement from ORIGINAL_REQUEST.md, lists modified/created files, and documents TODO: confirm items', () => {
    const { repoRoot } = getConfig();
    const changesPath = path.join(repoRoot, 'CHANGES.md');
    assert.equal(
      fs.existsSync(changesPath),
      true,
      `Expected written changelog at ${changesPath}`
    );

    const content = fs.readFileSync(changesPath, 'utf8');
    assert.ok(
      content.length >= 1000,
      `Expected comprehensive CHANGES.md (>= 1000 chars), got ${content.length} chars`
    );

    // Must cover all 7 areas from ORIGINAL_REQUEST.md
    assert.match(content, /prerequisite|courses\.html|courses\.json/i, 'CHANGES.md must document course prerequisites & classes offered');
    assert.match(content, /sticky|navbar|navigation/i, 'CHANGES.md must document sticky scroll-following navbar');
    assert.match(content, /requirements|academics\.html/i, 'CHANGES.md must document easy-to-find requirements under Academics');
    assert.match(content, /scholarship|funding\.html/i, 'CHANGES.md must document prominent scholarships & funding');
    assert.match(content, /site\s+search|search\.html|search-index\.json/i, 'CHANGES.md must document site-wide search');
    assert.match(content, /Faculty\s+Explorer|partial\s+name|people\.html/i, 'CHANGES.md must document Faculty Explorer partial-name & topic search');
    assert.match(content, /docs\/screenshots\/before\//i, 'CHANGES.md must reference old-design screenshots in docs/screenshots/before/');
    assert.match(content, /TODO:\s*confirm/i, 'CHANGES.md must document open "TODO: confirm" items');
  });

  test('T1-F8-02: Every relative *.png screenshot link inside CHANGES.md resolves to an existing valid non-empty PNG file', () => {
    const { repoRoot } = getConfig();
    const changesPath = path.join(repoRoot, 'CHANGES.md');
    assert.equal(fs.existsSync(changesPath), true, 'Expected CHANGES.md at repository root');

    const content = fs.readFileSync(changesPath, 'utf8');
    const pngPaths = new Set();

    // Match Markdown links/images and explicit docs/screenshots/.../*.png paths
    const mdLinkRe = /\]\(([^)\s]+\.png)\)/gi;
    let m;
    while ((m = mdLinkRe.exec(content)) !== null) {
      const candidate = m[1].trim();
      if (!/^https?:\/\//i.test(candidate)) {
        pngPaths.add(candidate.replace(/^\.\//, ''));
      }
    }

    const rawPathRe = /\b(docs\/screenshots\/(?:before|after(?:-\d{4}-\d{2}-\d{2})?)\/[A-Za-z0-9._-]+\.png)\b/g;
    while ((m = rawPathRe.exec(content)) !== null) {
      pngPaths.add(m[1]);
    }

    assert.ok(
      pngPaths.size >= 5,
      `Expected CHANGES.md to link >= 5 screenshot PNGs, found ${pngPaths.size}`
    );

    const beforeRefs = [...pngPaths].filter((p) => p.includes('docs/screenshots/before/'));
    assert.ok(
      beforeRefs.length >= 5,
      `Expected CHANGES.md to reference >= 5 before-screenshots in docs/screenshots/before/, found ${beforeRefs.length}`
    );

    for (const relPath of pngPaths) {
      const fullPath = path.resolve(repoRoot, relPath);
      assert.equal(
        fs.existsSync(fullPath),
        true,
        `Screenshot linked in CHANGES.md does not exist on disk: ${relPath}`
      );
      const info = inspectPng(fullPath);
      assert.equal(
        info.valid,
        true,
        `Screenshot linked in CHANGES.md is not a valid PNG (${relPath}): ${info.reason}`
      );
      assert.equal(
        info.nonUniform,
        true,
        `Screenshot linked in CHANGES.md is blank/uniform (${relPath})`
      );
    }
  });

  test('T1-F8-03: Brand CSS token enforcement — zero raw #hex, rgb(, or rgba( outside tokens.css, and tokens.css uses only approved BRAND.md hexes', () => {
    const { repoRoot, siteDir } = getConfig();
    const assetDirs = new Set([
      path.join(repoRoot, 'redesign', 'assets'),
      path.join(siteDir, 'assets'),
    ]);

    for (const dir of assetDirs) {
      if (!fs.existsSync(dir)) continue;
      const cssFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.css')).sort();
      assert.ok(cssFiles.includes('tokens.css'), `Expected tokens.css in ${dir}`);

      for (const file of cssFiles) {
        const fullPath = path.join(dir, file);
        const cssText = fs.readFileSync(fullPath, 'utf8');
        if (file === 'tokens.css') {
          const hexes = extractHexColors(cssText);
          assert.ok(hexes.length >= 7, `Expected >= 7 brand hex tokens in ${fullPath}`);
          for (const hex of hexes) {
            assert.ok(
              APPROVED_BRAND_HEX.has(hex),
              `Unapproved hex color ${hex} in ${fullPath} (must be in BRAND.md palette)`
            );
          }
        } else {
          const rawHits = findRawColorsInCss(cssText);
          assert.deepEqual(
            rawHits,
            [],
            `Raw color literals (#hex / rgb / rgba) are prohibited in ${file}: ${JSON.stringify(rawHits)}`
          );
        }
      }
    }
  });

  test('T1-F8-04: Prohibited tagline "Hail to Possible" occurs zero times across all generated HTML pages', () => {
    const { siteDir } = getConfig();
    const htmlFiles = fs.readdirSync(siteDir).filter((f) => f.endsWith('.html')).sort();
    assert.ok(htmlFiles.length >= 11, `Expected >= 11 generated HTML files in ${siteDir}`);

    const violations = [];
    for (const file of htmlFiles) {
      const text = fs.readFileSync(path.join(siteDir, file), 'utf8');
      if (/hail\s+to\s+possible/i.test(text)) {
        violations.push(file);
      }
    }
    assert.deepEqual(
      violations,
      [],
      `Prohibited tagline "Hail to Possible" found in HTML files: ${JSON.stringify(violations)}`
    );
  });

  test('T1-F8-05: Full 14-core-page structural & runtime cleanliness sweep (1 <h1>, 1 <main>, heading order, unique IDs, img[alt], zero errors)', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      for (const route of CORE_PAGES_14) {
        const nav = await page.goto(pageUrl(route));
        assert.equal(
          nav.status,
          200,
          `Expected HTTP 200 for core page ${route}, got ${nav.status}`
        );
        assert.equal(
          page.localFailedRequests.length,
          0,
          `Failed local asset requests on ${route}: ${JSON.stringify(page.localFailedRequests)}`
        );
        assert.equal(
          page.pageErrors.length,
          0,
          `Uncaught JS page errors on ${route}: ${JSON.stringify(page.pageErrors)}`
        );
        assert.equal(
          page.consoleErrors.length,
          0,
          `Console errors on ${route}: ${JSON.stringify(page.consoleErrors)}`
        );

        const st = await auditPageStructure(page);
        assert.equal(st.h1Count, 1, `Expected exact 1 <h1> on ${route}, got ${st.h1Count}`);
        assert.equal(st.mainCount, 1, `Expected exact 1 <main> on ${route}, got ${st.mainCount}`);
        assert.equal(
          st.headingOrderOk,
          true,
          `Skipped heading levels on ${route}: ${JSON.stringify(st.headingViolations)}`
        );
        assert.deepEqual(
          st.duplicateIds,
          [],
          `Duplicate DOM IDs on ${route}: ${JSON.stringify(st.duplicateIds)}`
        );
        assert.deepEqual(
          st.imagesWithoutAlt,
          [],
          `Images missing alt attribute on ${route}: ${JSON.stringify(st.imagesWithoutAlt)}`
        );
        assert.equal(
          st.hasProhibitedTagline,
          false,
          `Prohibited tagline "Hail to Possible" found on ${route}`
        );
      }
    });
  });

  test('T1-F8-06: Computed WCAG 2.1 AA contrast (>= 4.5:1 normal / >= 3.0:1 large) across primary text, nav, buttons, funding, chips, search modal & footer', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      const targetRoutes = [
        'index.html',
        'academics.html',
        'courses.html',
        'funding.html',
        'people.html',
        'search.html',
      ];

      for (const route of targetRoutes) {
        const nav = await page.goto(pageUrl(route));
        assert.equal(
          nav.status,
          200,
          `Expected HTTP 200 on ${route} for WCAG AA contrast audit, got ${nav.status}`
        );

        const report = await auditPageContrast(page);
        assert.ok(
          report.checkedCount >= 10,
          `Expected >= 10 visible text nodes audited on ${route}, got ${report.checkedCount}`
        );
        assert.deepEqual(
          report.goldOnLightViolations,
          [],
          `Pitt Gold text on white/light background is prohibited on ${route}: ${JSON.stringify(report.goldOnLightViolations)}`
        );
        assert.deepEqual(
          report.violations,
          [],
          `WCAG 2.1 AA contrast violations on ${route}: ${JSON.stringify(report.violations)}`
        );
      }

      // Also audit inside the open Site Search modal dialog on index.html
      await page.goto(pageUrl('index.html'));
      await openSiteSearch(page, 'click');
      await fillSiteSearch(page, 'scholarship', { inDialog: true });
      const modalContrast = await auditPageContrast(page, { rootSelector: '[role="dialog"]' });
      assert.deepEqual(
        modalContrast.violations,
        [],
        `WCAG 2.1 AA contrast violations inside Site Search dialog: ${JSON.stringify(modalContrast.violations)}`
      );
    });
  });
});
