/**
 * Tier 2: Boundary & Corner Cases E2E Suite (tier2_boundaries.test.mjs)
 *
 * Implements all 43 Tier 2 boundary, edge-case, negative, accessibility,
 * responsive (320x568), no-JS, reduced-motion, XSS, subpath, and asset/deploy
 * isolation tests across features F1–F8 as specified in TEST_INFRA.md § 3.
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';

import { connectBrowser } from './lib/cdp.mjs';
import {
  CORE_PAGES_14,
  auditPageContrast,
  auditPageStructure,
  checkAnchorNotOccluded,
  checkGitProtectedDirsClean,
  checkNoHorizontalOverflow,
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
  selectPeopleScope,
  setCourseFilter,
  setPeopleNameQuery,
  setPeopleTopicQuery,
  subpathUrl,
  verifyHtmlAssetHashes,
} from './lib/helpers.mjs';

function walkFilesRecursive(dirPath) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return [];
  }
  const results = [];
  const stack = [dirPath];
  while (stack.length > 0) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        results.push(full);
      }
    }
  }
  return results.sort();
}

function extractHtmlIds(htmlText) {
  const ids = new Set();
  const re = /\bid\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>"']+))/gi;
  let m;
  while ((m = re.exec(String(htmlText))) !== null) {
    const id = m[1] ?? m[2] ?? m[3];
    if (id) ids.add(id);
  }
  return ids;
}

function extractHtmlRefs(htmlText) {
  const refs = [];
  const re = /\b(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let m;
  while ((m = re.exec(String(htmlText))) !== null) {
    refs.push({
      attr: m[1].toLowerCase(),
      raw: (m[2] ?? m[3] ?? '').trim(),
    });
  }
  return refs;
}

async function waitForCheck(
  page,
  asyncPredicate,
  { timeoutMs = 4000, message = 'waitForCheck timed out' } = {}
) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() <= deadline) {
    try {
      const value = await asyncPredicate();
      if (value) return value;
    } catch (err) {
      lastError = err;
    }
    await page
      .evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(true))))
      .catch(() => null);
  }
  const extra = lastError ? ` (last error: ${lastError.message})` : '';
  throw new Error(`${message} after ${timeoutMs}ms${extra}`);
}

describe('Tier 2: Boundary & Corner Cases (F1–F8)', () => {
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
  // Feature F1: Baseline Old-Design Screenshots (5 tests)
  // =========================================================================

  test('T2-F1-01: docs/screenshots/before/ has >= 1 file and zero 0-byte, truncated, blank, or non-PNG corrupt files', () => {
    const { repoRoot } = getConfig();
    const beforeDir = path.join(repoRoot, 'docs', 'screenshots', 'before');
    assert.equal(
      fs.existsSync(beforeDir) && fs.statSync(beforeDir).isDirectory(),
      true,
      `Expected baseline screenshot directory to exist at ${beforeDir}`
    );

    const allFiles = walkFilesRecursive(beforeDir);
    assert.ok(
      allFiles.length >= 1,
      `Expected >= 1 file in ${beforeDir}, found ${allFiles.length}`
    );

    const invalidFiles = [];
    for (const filePath of allFiles) {
      const rel = path.relative(repoRoot, filePath);
      if (path.extname(filePath).toLowerCase() !== '.png') {
        invalidFiles.push({ file: rel, reason: 'Non-.png file in docs/screenshots/before/' });
        continue;
      }
      const stat = fs.statSync(filePath);
      if (stat.size <= 0) {
        invalidFiles.push({ file: rel, reason: '0-byte empty file' });
        continue;
      }
      const info = inspectPng(filePath);
      if (!info.valid) {
        invalidFiles.push({ file: rel, reason: info.reason || 'Corrupt PNG' });
        continue;
      }
      if (!info.nonUniform) {
        invalidFiles.push({
          file: rel,
          reason: `Degenerate uniform/blank PNG (${info.distinctColors} sampled color)`,
        });
      }
    }

    assert.deepEqual(
      invalidFiles,
      [],
      `Found corrupt, empty, or non-PNG files in docs/screenshots/before/: ${JSON.stringify(invalidFiles)}`
    );
  });

  test('T2-F1-02: Multi-page coverage breadth (>= 8 distinct before-state PNG captures across key routes/states)', () => {
    const { repoRoot } = getConfig();
    const beforeDir = path.join(repoRoot, 'docs', 'screenshots', 'before');
    assert.equal(
      fs.existsSync(beforeDir) && fs.statSync(beforeDir).isDirectory(),
      true,
      `Expected ${beforeDir} directory to exist`
    );

    const pngFiles = walkFilesRecursive(beforeDir).filter((f) =>
      f.toLowerCase().endsWith('.png')
    );
    assert.ok(
      pngFiles.length >= 8,
      `Expected >= 8 before-state PNG captures in docs/screenshots/before/, found ${pngFiles.length}`
    );

    const distinctDigests = new Set();
    for (const filePath of pngFiles) {
      const info = inspectPng(filePath);
      assert.equal(
        info.valid,
        true,
        `Invalid PNG ${path.basename(filePath)}: ${info.reason}`
      );
      const digest = crypto
        .createHash('sha256')
        .update(fs.readFileSync(filePath))
        .digest('hex');
      distinctDigests.add(digest);
    }

    assert.ok(
      distinctDigests.size >= 8,
      `Expected >= 8 distinct PNG image contents (no duplicate copies), found ${distinctDigests.size} unique hashes across ${pngFiles.length} files`
    );

    const namesJoined = pngFiles.map((f) => path.basename(f).toLowerCase()).join(' ');
    const coverageBuckets = [
      { name: 'home/index', re: /home|index/ },
      { name: 'academics/ms/phd', re: /academic|ms|phd/ },
      { name: 'people/faculty', re: /people|faculty/ },
      { name: 'admissions/resources', re: /admission|resource/ },
      { name: 'scrolled-state', re: /scroll|600/ },
      { name: 'mobile-viewport', re: /mobile|375|320/ },
    ];
    const matchedBuckets = coverageBuckets.filter((b) => b.re.test(namesJoined));
    assert.ok(
      matchedBuckets.length >= 5,
      `Expected before-screenshots to span >= 5 route/viewport categories, matched ${matchedBuckets.length}: ${matchedBuckets.map((b) => b.name).join(', ')}`
    );
  });

  test('T2-F1-03: Deploy isolation — docs/screenshots/before/ is never copied into redesign/dist/ and build.py never copies docs/', () => {
    const { repoRoot } = getConfig();
    const buildPyPath = path.join(repoRoot, 'redesign', 'scripts', 'build.py');
    assert.equal(fs.existsSync(buildPyPath), true, 'Expected redesign/scripts/build.py to exist');

    const buildPyText = fs.readFileSync(buildPyPath, 'utf8');
    assert.equal(
      /copytree\([^)]*['"]docs['"]/i.test(buildPyText) ||
        /['"]docs\/screenshots/i.test(buildPyText),
      false,
      'redesign/scripts/build.py must never copy docs/ or docs/screenshots/ into redesign/dist/'
    );

    const distDir = path.join(repoRoot, 'redesign', 'dist');
    if (fs.existsSync(distDir) && fs.statSync(distDir).isDirectory()) {
      assert.equal(
        fs.existsSync(path.join(distDir, 'docs')),
        false,
        'redesign/dist/docs must not exist'
      );
      assert.equal(
        fs.existsSync(path.join(distDir, 'screenshots')),
        false,
        'redesign/dist/screenshots must not exist'
      );
      const distPngs = walkFilesRecursive(distDir).filter(
        (f) =>
          f.toLowerCase().endsWith('.png') &&
          !f.replace(/\\/g, '/').includes('/assets/people/')
      );
      assert.equal(
        distPngs.length,
        0,
        `Expected zero screenshot PNGs inside redesign/dist/, found: ${JSON.stringify(distPngs)}`
      );
    }
  });

  test('T2-F1-04: Before-screenshots are strictly stored outside redesign/assets/ and outside .agents/teamwork/', () => {
    const { repoRoot } = getConfig();
    const beforeDir = path.join(repoRoot, 'docs', 'screenshots', 'before');
    assert.equal(
      fs.existsSync(beforeDir) && fs.statSync(beforeDir).isDirectory(),
      true,
      `Expected ${beforeDir} to exist`
    );

    const beforePngs = walkFilesRecursive(beforeDir).filter((f) =>
      f.toLowerCase().endsWith('.png')
    );
    assert.ok(beforePngs.length >= 1, 'Expected >= 1 PNG in docs/screenshots/before/');

    const beforeHashes = new Set(
      beforePngs.map((f) =>
        crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
      )
    );

    const assetsDir = path.join(repoRoot, 'redesign', 'assets');
    const assetFiles = walkFilesRecursive(assetsDir);
    const leakedInAssets = assetFiles.filter((f) => {
      if (!f.toLowerCase().endsWith('.png')) return false;
      const h = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
      return (
        beforeHashes.has(h) ||
        /before|screenshot|1440|375|320|legacy-isp/i.test(path.basename(f))
      );
    });
    assert.deepEqual(
      leakedInAssets,
      [],
      `Before-screenshots must not be stored inside redesign/assets/: ${JSON.stringify(leakedInAssets)}`
    );

    const teamworkDir = path.join(repoRoot, '.agents', 'teamwork');
    if (fs.existsSync(teamworkDir)) {
      const teamworkPngs = walkFilesRecursive(teamworkDir).filter((f) =>
        f.toLowerCase().endsWith('.png')
      );
      assert.deepEqual(
        teamworkPngs,
        [],
        `Screenshots must not be stored inside .agents/teamwork/: ${JSON.stringify(teamworkPngs)}`
      );
    }
  });

  test('T2-F1-05: All before-screenshot filenames are portable URL/Markdown-safe relative ASCII names', () => {
    const { repoRoot } = getConfig();
    const beforeDir = path.join(repoRoot, 'docs', 'screenshots', 'before');
    assert.equal(
      fs.existsSync(beforeDir) && fs.statSync(beforeDir).isDirectory(),
      true,
      `Expected ${beforeDir} to exist`
    );

    const files = walkFilesRecursive(beforeDir);
    assert.ok(files.length >= 1, 'Expected >= 1 file in docs/screenshots/before/');

    const unsafe = [];
    const safeRelRe = /^docs\/screenshots\/before\/[A-Za-z0-9][A-Za-z0-9._-]*\.png$/;
    for (const filePath of files) {
      const rel = path.relative(repoRoot, filePath).split(path.sep).join('/');
      if (!safeRelRe.test(rel) || encodeURI(rel) !== rel) {
        unsafe.push(rel);
      }
    }

    assert.deepEqual(
      unsafe,
      [],
      `Found non-portable or URL-unsafe screenshot paths: ${JSON.stringify(unsafe)}`
    );
  });

  // =========================================================================
  // Feature F2: Up-to-Date Courses, Prerequisites & Live Availability (5 tests)
  // =========================================================================

  test('T2-F2-01: Course code normalization ("ISSP-2170" hyphen and "issp 2170" lowercase space both match ISSP 2170)', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('courses.html'));
      assert.equal(nav.status, 200, 'Expected courses.html to load with HTTP 200');

      const initialCourses = await getVisibleCourses(page);
      assert.ok(
        initialCourses.length >= 10,
        `Expected >= 10 initial courses on courses.html, got ${initialCourses.length}`
      );
      assert.equal(
        initialCourses.some((c) => /\bISSP\s+2170\b/i.test(`${c.code} ${c.text}`)),
        true,
        'Expected ISSP 2170 to be present in initial course list'
      );

      // 1. Hyphenated uppercase query: "ISSP-2170"
      await setCourseFilter(page, { query: 'ISSP-2170' });
      await waitForCheck(
        page,
        async () => {
          const list = await getVisibleCourses(page);
          return list.length >= 1 && list.length < initialCourses.length;
        },
        { timeoutMs: 4000, message: 'Filtering courses by "ISSP-2170" did not narrow results' }
      );
      const hyphenMatches = await getVisibleCourses(page);
      assert.equal(
        hyphenMatches.some((c) => /\bISSP\s+2170\b/i.test(`${c.code} ${c.text}`)),
        true,
        `Expected "ISSP-2170" query to match ISSP 2170, got ${JSON.stringify(hyphenMatches.map((c) => c.code))}`
      );

      // 2. Lowercase space query: "issp 2170"
      await setCourseFilter(page, { query: 'issp 2170' });
      await waitForCheck(
        page,
        async () => {
          const list = await getVisibleCourses(page);
          return (
            list.length >= 1 &&
            list.length < initialCourses.length &&
            list.some((c) => /\bISSP\s+2170\b/i.test(`${c.code} ${c.text}`))
          );
        },
        { timeoutMs: 4000, message: 'Filtering courses by "issp 2170" did not match ISSP 2170' }
      );

      assert.equal(page.pageErrors.length, 0, `Unexpected page errors: ${JSON.stringify(page.pageErrors)}`);
      assert.equal(page.consoleErrors.length, 0, `Unexpected console errors: ${JSON.stringify(page.consoleErrors)}`);
    } finally {
      await page.close();
    }
  });

  test('T2-F2-02: Zero-match course filter query ("ZZZ 9999") renders helpful empty-state message with zero console errors and resets cleanly', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('courses.html'));
      assert.equal(nav.status, 200, 'Expected courses.html to load with HTTP 200');

      const initialCourses = await getVisibleCourses(page);
      assert.ok(
        initialCourses.length >= 10,
        `Expected >= 10 initial courses on courses.html, got ${initialCourses.length}`
      );

      await setCourseFilter(page, { query: 'ZZZ 9999' });
      await waitForCheck(
        page,
        async () => (await getVisibleCourses(page)).length === 0,
        { timeoutMs: 4000, message: 'Expected 0 visible courses for unmatched query "ZZZ 9999"' }
      );

      const emptyInfo = await page.evaluate(() => {
        const isVisible = (el) => {
          if (!el || el.hidden || el.closest('[hidden]')) return false;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
            return false;
          }
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        };
        const main = document.querySelector('main') || document.body;
        const statusEl = main.querySelector('[role="status"], [aria-live="polite"], [aria-live="assertive"]');
        const statusText = statusEl ? (statusEl.textContent || '').replace(/\s+/g, ' ').trim() : '';
        const mainText = (main.textContent || '').replace(/\s+/g, ' ').trim();
        const resetBtn = [...main.querySelectorAll('button, input[type="reset"]')].find(
          (b) =>
            isVisible(b) &&
            /reset|clear|show all|all courses/i.test(
              `${b.getAttribute('aria-label') || ''} ${b.textContent || ''} ${b.value || ''}`
            )
        );
        let resetPoint = null;
        if (resetBtn) {
          resetBtn.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
          const r = resetBtn.getBoundingClientRect();
          resetPoint = {
            x: Math.max(1, Math.min(window.innerWidth - 1, r.left + r.width / 2)),
            y: Math.max(1, Math.min(window.innerHeight - 1, r.top + r.height / 2)),
          };
        }
        return {
          statusText,
          hasEmptyGuidance:
            /no\s+(?:matching\s+)?courses|0\s+courses|no\s+results|none\s+found|no\s+matches/i.test(
              `${statusText} ${mainText}`
            ),
          resetPoint,
        };
      });

      assert.equal(
        emptyInfo.hasEmptyGuidance,
        true,
        `Expected helpful empty-state or 0-courses message for "ZZZ 9999", got status="${emptyInfo.statusText}"`
      );

      if (emptyInfo.resetPoint) {
        await page.clickAt(emptyInfo.resetPoint.x, emptyInfo.resetPoint.y);
      } else {
        await setCourseFilter(page, { query: '' });
      }

      await waitForCheck(
        page,
        async () => (await getVisibleCourses(page)).length === initialCourses.length,
        {
          timeoutMs: 4000,
          message: `Expected resetting course filter to restore all ${initialCourses.length} courses`,
        }
      );

      assert.equal(page.pageErrors.length, 0, `Unexpected page errors: ${JSON.stringify(page.pageErrors)}`);
      assert.equal(page.consoleErrors.length, 0, `Unexpected console errors: ${JSON.stringify(page.consoleErrors)}`);
    } finally {
      await page.close();
    }
  });

  test('T2-F2-03: JavaScript disabled: courses.html statically renders all curriculum courses, prerequisite text, and live SCI/PeopleSoft links', async () => {
    const page = await browser.newPage({
      width: 1440,
      height: 900,
      javascriptEnabled: false,
    });
    try {
      const nav = await page.goto(pageUrl('courses.html'));
      assert.equal(nav.status, 200, 'Expected courses.html to load HTTP 200 with JS disabled');

      const courses = await getVisibleCourses(page);
      assert.ok(
        courses.length >= 12,
        `Expected >= 12 statically rendered courses on courses.html without JS, got ${courses.length}`
      );

      const staticAudit = await page.evaluate(() => {
        const main = document.querySelector('main');
        const text = main ? (main.textContent || '').replace(/\s+/g, ' ').trim() : '';
        const hrefs = main
          ? [...main.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || '')
          : [];
        return {
          text,
          hrefs,
          hasIssp2071: /\bISSP\s+2071\b/.test(text),
          hasBiost2142: /\bBIOST\s+2142\b/.test(text),
          hasInfsci2440: /\bINFSCI\s+2440\b/.test(text),
          hasIssp2160: /\bISSP\s+2160\b/.test(text),
          hasIssp2170: /\bISSP\s+2170\b/.test(text),
          hasPrereqInfo: /\b(?:PREQ|PLAN|Prerequisite)/i.test(text),
          hasSciCourseViewLinks: hrefs.some((h) =>
            /^https:\/\/courses\.sci\.pitt\.edu\/courses\/view\//i.test(h)
          ),
          hasSciScheduleLink: hrefs.some((h) =>
            /^https:\/\/courses\.sci\.pitt\.edu\/?$/i.test(h)
          ),
          hasPeoplesoftLink: hrefs.some((h) => /my\.pitt\.edu/i.test(h)),
        };
      });

      assert.equal(staticAudit.hasIssp2071, true, 'Expected ISSP 2071 rendered statically without JS');
      assert.equal(staticAudit.hasBiost2142, true, 'Expected BIOST 2142 rendered statically without JS');
      assert.equal(staticAudit.hasInfsci2440, true, 'Expected INFSCI 2440 rendered statically without JS');
      assert.equal(staticAudit.hasIssp2160, true, 'Expected ISSP 2160 rendered statically without JS');
      assert.equal(staticAudit.hasIssp2170, true, 'Expected ISSP 2170 rendered statically without JS');
      assert.equal(staticAudit.hasPrereqInfo, true, 'Expected prerequisite text rendered statically without JS');
      assert.equal(
        staticAudit.hasSciCourseViewLinks,
        true,
        'Expected https://courses.sci.pitt.edu/courses/view/ links rendered statically without JS'
      );
      assert.equal(
        staticAudit.hasPeoplesoftLink,
        true,
        'Expected PeopleSoft (https://my.pitt.edu/) link rendered statically without JS'
      );
    } finally {
      await page.close();
    }
  });

  test('T2-F2-04: redesign/src/courses.json schema & honesty boundary (2026-2027, ISO last_verified, live_links, TODO: confirm, zero http:// SCI links)', () => {
    const { repoRoot } = getConfig();
    const coursesJsonPath = path.join(repoRoot, 'redesign', 'src', 'courses.json');
    assert.equal(
      fs.existsSync(coursesJsonPath),
      true,
      `Expected ${coursesJsonPath} to exist`
    );

    const rawText = fs.readFileSync(coursesJsonPath, 'utf8');
    assert.equal(
      /http:\/\/courses\.sci\.pitt\.edu/i.test(rawText),
      false,
      'courses.json must not contain insecure http://courses.sci.pitt.edu links'
    );

    const data = JSON.parse(rawText);
    assert.ok(
      String(data.catalog_edition || '').includes('2026-2027'),
      `Expected catalog_edition to include "2026-2027", got ${JSON.stringify(data.catalog_edition)}`
    );
    assert.match(
      String(data.last_verified || ''),
      /^\d{4}-\d{2}-\d{2}$/,
      `Expected ISO YYYY-MM-DD last_verified in courses.json, got ${JSON.stringify(data.last_verified)}`
    );
    assert.ok(
      data.live_links && typeof data.live_links === 'object',
      'Expected live_links object in courses.json'
    );

    const liveLinksStr = JSON.stringify(data.live_links);
    assert.match(
      liveLinksStr,
      /https:\/\/courses\.sci\.pitt\.edu/i,
      'Expected live_links to include https://courses.sci.pitt.edu'
    );
    assert.match(
      liveLinksStr,
      /https:\/\/my\.pitt\.edu/i,
      'Expected live_links to include https://my.pitt.edu'
    );

    assert.ok(
      Array.isArray(data.courses) && data.courses.length >= 15,
      `Expected courses array with >= 15 entries in courses.json, got ${data.courses?.length}`
    );

    const codes = new Set();
    let verifiedPrereqCount = 0;
    let unverifiedWithTodoCount = 0;

    for (const course of data.courses) {
      assert.ok(course.code && typeof course.code === 'string', `Missing code on course: ${JSON.stringify(course)}`);
      assert.ok(course.title && typeof course.title === 'string', `Missing title on ${course.code}`);
      assert.ok(Array.isArray(course.programs) && course.programs.length >= 1, `Missing programs on ${course.code}`);
      assert.ok(course.group && typeof course.group === 'string', `Missing group on ${course.code}`);
      assert.equal(typeof course.prereq_verified, 'boolean', `Expected boolean prereq_verified on ${course.code}`);
      assert.ok(
        typeof course.prerequisites === 'string' && course.prerequisites.trim().length > 0,
        `Expected non-empty prerequisites string on ${course.code}`
      );

      codes.add(course.code.trim().toUpperCase());

      if (course.prereq_verified) {
        verifiedPrereqCount += 1;
      } else {
        assert.match(
          course.prerequisites,
          /TODO:\s*confirm/i,
          `Unverified course ${course.code} (prereq_verified: false) must carry explicit "TODO: confirm" in prerequisites`
        );
        unverifiedWithTodoCount += 1;
      }
    }

    assert.equal(codes.has('ISSP 2071'), true, 'Expected ISSP 2071 in courses.json');
    assert.equal(codes.has('BIOST 2142'), true, 'Expected BIOST 2142 in courses.json');
    assert.ok(verifiedPrereqCount >= 5, `Expected >= 5 verified prerequisite entries, found ${verifiedPrereqCount}`);
    assert.ok(
      unverifiedWithTodoCount >= 1,
      'Expected >= 1 unverified prerequisite entry marked with explicit "TODO: confirm"'
    );
  });

  test('T2-F2-05: Mobile 320x568 viewport on courses.html: zero horizontal overflow and interactive filters remain usable', async () => {
    const page = await browser.newPage({ width: 320, height: 568, mobile: true });
    try {
      const nav = await page.goto(pageUrl('courses.html'));
      assert.equal(nav.status, 200, 'Expected courses.html to load HTTP 200 at 320x568');

      const initialOverflow = await checkNoHorizontalOverflow(page);
      assert.equal(
        initialOverflow.ok,
        true,
        `Horizontal overflow on courses.html at 320x568: ${JSON.stringify(initialOverflow)}`
      );

      const initialCourses = await getVisibleCourses(page);
      assert.ok(initialCourses.length >= 10, `Expected >= 10 visible courses at 320x568, got ${initialCourses.length}`);

      await setCourseFilter(page, { query: 'ISSP 2071' });
      await waitForCheck(
        page,
        async () => {
          const list = await getVisibleCourses(page);
          return list.length >= 1 && list.length < initialCourses.length;
        },
        { timeoutMs: 4000, message: 'Course filter did not narrow results at 320x568' }
      );

      const filtered = await getVisibleCourses(page);
      assert.equal(
        filtered.some((c) => /\bISSP\s+2071\b/i.test(`${c.code} ${c.text}`)),
        true,
        'Expected filtered courses at 320x568 to include ISSP 2071'
      );

      const postFilterOverflow = await checkNoHorizontalOverflow(page);
      assert.equal(
        postFilterOverflow.ok,
        true,
        `Horizontal overflow after filtering on courses.html at 320x568: ${JSON.stringify(postFilterOverflow)}`
      );
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature F3: Easy-to-Find Requirements Under Academics (5 tests)
  // =========================================================================

  test('T2-F3-01: Keyboard accessibility on Academics submenu (Enter/Space toggles aria-expanded, Escape closes & returns focus, outside click closes)', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('index.html'));
      assert.equal(nav.status, 200);

      const initial = await findAcademicsDisclosure(page);
      assert.equal(
        initial.found,
        true,
        'Expected an accessible Academics disclosure button (button[aria-expanded]) in Main navigation'
      );
      assert.equal(initial.visible, true, 'Academics disclosure button must be visible on desktop');
      assert.equal(initial.expanded, false, 'Academics submenu should be collapsed initially');

      // Focus the Academics disclosure button and press Enter to open
      const focusedOk = await page.evaluate(() => {
        const mainNav =
          document.querySelector('nav[aria-label="Main navigation"]') ||
          document.querySelector('nav#main-navigation') ||
          document.body;
        const btn = [...mainNav.querySelectorAll('button[aria-expanded]')].find((b) => {
          const name = (b.getAttribute('aria-label') || b.textContent || '').trim();
          if (/academics/i.test(name)) return true;
          const p = b.parentElement;
          return Boolean(p && p.querySelector('a[href$="academics.html"], a[href*="academics.html"]'));
        });
        if (!btn) return false;
        btn.focus();
        return document.activeElement === btn;
      });
      assert.equal(focusedOk, true, 'Failed to focus Academics disclosure button');

      await page.pressKey('Enter');
      await waitForCheck(
        page,
        async () => (await findAcademicsDisclosure(page)).expanded === true,
        { timeoutMs: 3000, message: 'Pressing Enter on Academics disclosure button did not set aria-expanded="true"' }
      );

      const openState = await findAcademicsDisclosure(page);
      assert.equal(openState.menuVisible, true, 'Academics submenu panel must be visible when expanded');
      const menuHrefs = openState.menuLinks.map((l) => l.href);
      for (const expectedTarget of [
        'academics.html#requirements',
        'ms.html#requirements',
        'phd.html#requirements',
        'courses.html',
        'funding.html',
      ]) {
        assert.equal(
          menuHrefs.some((h) => h.endsWith(expectedTarget) || h.includes(expectedTarget)),
          true,
          `Expected Academics submenu to include link to ${expectedTarget}, found ${JSON.stringify(menuHrefs)}`
        );
      }

      // Press Escape -> closes submenu and returns focus to the disclosure button
      await page.pressKey('Escape');
      await waitForCheck(
        page,
        async () => (await findAcademicsDisclosure(page)).expanded === false,
        { timeoutMs: 3000, message: 'Pressing Escape did not close Academics submenu' }
      );
      const afterEscape = await findAcademicsDisclosure(page);
      assert.equal(
        afterEscape.isFocused,
        true,
        'Pressing Escape on Academics submenu must return focus to the disclosure button'
      );

      // Press Space while focused -> re-opens submenu
      await page.pressKey('Space');
      await waitForCheck(
        page,
        async () => (await findAcademicsDisclosure(page)).expanded === true,
        { timeoutMs: 3000, message: 'Pressing Space on Academics disclosure button did not open submenu' }
      );

      // Outside click (on <h1> inside <main>) -> closes submenu
      await page.click('main h1');
      await waitForCheck(
        page,
        async () => (await findAcademicsDisclosure(page)).expanded === false,
        { timeoutMs: 3000, message: 'Clicking outside Academics submenu did not close it' }
      );
    } finally {
      await page.close();
    }
  });

  test('T2-F3-02: ms.html retains TODO: confirm notice for conflicting MS committee composition rule and elevates #requirements', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('ms.html'));
      assert.equal(nav.status, 200);

      const msInfo = await page.evaluate(() => {
        const main = document.querySelector('main');
        const mainText = main ? (main.textContent || '').replace(/\s+/g, ' ').trim() : '';
        const req = document.getElementById('requirements');
        const reqText = req ? (req.textContent || '').replace(/\s+/g, ' ').trim() : '';
        return {
          hasRequirementsId: Boolean(req),
          reqHas30Credits: /\b30\b/.test(reqText),
          hasCommitteeTodo:
            /TODO:\s*confirm/i.test(mainText) && /committee/i.test(mainText),
        };
      });

      assert.equal(
        msInfo.hasRequirementsId,
        true,
        'Expected #requirements curriculum section on ms.html'
      );
      assert.equal(
        msInfo.reqHas30Credits,
        true,
        'Expected #requirements on ms.html to summarize the 30-credit MS requirement'
      );
      assert.equal(
        msInfo.hasCommitteeTodo,
        true,
        'Expected ms.html to preserve the TODO: confirm notice for the conflicting MS committee composition rule'
      );
    } finally {
      await page.close();
    }
  });

  test('T2-F3-03: No stale archived catalog links (catoid=224/226/236/136) remain on academics.html, ms.html, phd.html, or courses.html (all link to catoid=242)', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const routes = ['academics.html', 'ms.html', 'phd.html', 'courses.html'];
      for (const route of routes) {
        const nav = await page.goto(pageUrl(route));
        assert.equal(nav.status, 200, `Expected HTTP 200 on ${route}, got ${nav.status}`);

        const catInfo = await page.evaluate(() => {
          const hrefs = [...document.querySelectorAll('a[href]')].map(
            (a) => a.getAttribute('href') || ''
          );
          const stale = hrefs.filter((h) => /catoid=(?:224|226|236|136)\b/i.test(h));
          const current242 = hrefs.filter((h) => /catoid=242\b/i.test(h));
          return { stale, current242 };
        });

        assert.deepEqual(
          catInfo.stale,
          [],
          `Found stale archived catalog links on ${route}: ${JSON.stringify(catInfo.stale)}`
        );
        assert.ok(
          catInfo.current242.length >= 1,
          `Expected ${route} to link to the 2026-2027 Pitt Catalog (catoid=242)`
        );
      }
    } finally {
      await page.close();
    }
  });

  test('T2-F3-04: Every <nav aria-label="On this page"> jump link on academics.html, ms.html, phd.html, courses.html has >= 2 valid #fragment targets', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const routes = ['academics.html', 'ms.html', 'phd.html', 'courses.html'];
      for (const route of routes) {
        const nav = await page.goto(pageUrl(route));
        assert.equal(nav.status, 200, `Expected HTTP 200 on ${route}, got ${nav.status}`);

        const jumps = await page.evaluate(() => {
          const jumpNav = document.querySelector('nav[aria-label="On this page"]');
          if (!jumpNav) return { found: false, links: [], broken: [] };
          const links = [...jumpNav.querySelectorAll('a[href]')].map((a) => ({
            href: a.getAttribute('href') || '',
            text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
          }));
          const broken = [];
          for (const l of links) {
            if (!l.href.startsWith('#') || l.href.length < 2) {
              broken.push({ href: l.href, reason: 'Not a valid #fragment link' });
              continue;
            }
            const id = l.href.slice(1);
            if (!document.getElementById(id)) {
              broken.push({ href: l.href, reason: `Target #${id} does not exist in DOM` });
            }
          }
          return { found: true, links, broken };
        });

        assert.equal(jumps.found, true, `Expected <nav aria-label="On this page"> on ${route}`);
        assert.ok(
          jumps.links.length >= 2,
          `Expected >= 2 jump links in <nav aria-label="On this page"> on ${route}, got ${jumps.links.length}`
        );
        assert.deepEqual(
          jumps.broken,
          [],
          `Broken "On this page" jump links on ${route}: ${JSON.stringify(jumps.broken)}`
        );

        if (route !== 'courses.html') {
          assert.equal(
            jumps.links.some((l) => l.href === '#requirements'),
            true,
            `Expected <nav aria-label="On this page"> on ${route} to include #requirements`
          );
        }
      }
    } finally {
      await page.close();
    }
  });

  test('T2-F3-05: Mobile 320x568 on academics.html, ms.html, and phd.html: zero horizontal overflow with #requirements curriculum section rendered', async () => {
    const page = await browser.newPage({ width: 320, height: 568, mobile: true });
    try {
      for (const route of ['academics.html', 'ms.html', 'phd.html']) {
        const nav = await page.goto(pageUrl(route));
        assert.equal(nav.status, 200, `Expected HTTP 200 on ${route} at 320x568`);

        const hasReq = await page.evaluate(() => {
          const el = document.getElementById('requirements');
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        assert.equal(
          hasReq,
          true,
          `Expected visible #requirements section on ${route} at 320x568`
        );

        const overflow = await checkNoHorizontalOverflow(page);
        assert.equal(
          overflow.ok,
          true,
          `Horizontal overflow on ${route} at 320x568: ${JSON.stringify(overflow)}`
        );
      }
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature F4: Prominent Scholarships & Funding (5 tests)
  // =========================================================================

  test('T2-F4-01: funding.html includes explicit TODO: confirm markers for dynamic unverified items (deadlines, slots, travel-grant budget)', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('funding.html'));
      assert.equal(nav.status, 200, 'Expected funding.html to load with HTTP 200');

      const todoAudit = await page.evaluate(() => {
        const main = document.querySelector('main');
        const text = main ? (main.textContent || '').replace(/\s+/g, ' ').trim() : '';
        const matches = text.match(/TODO:\s*confirm/gi) || [];
        return {
          todoCount: matches.length,
          hasDeadlineContext: /(?:jan(?:uary)?\s*15|priority\s+deadline|deadline)/i.test(text),
          hasTravelContext: /(?:travel\s+grant|\$750|\$1,000)/i.test(text),
          hasFellowshipContext: /(?:predoctoral|fellowship|assistantship|stipend)/i.test(text),
        };
      });

      assert.ok(
        todoAudit.todoCount >= 2,
        `Expected >= 2 explicit "TODO: confirm" markers on funding.html for dynamic unverified deadlines/slots/budgets, found ${todoAudit.todoCount}`
      );
      assert.equal(todoAudit.hasDeadlineContext, true, 'Expected funding deadline context on funding.html');
      assert.equal(todoAudit.hasTravelContext, true, 'Expected travel grant budget context on funding.html');
      assert.equal(todoAudit.hasFellowshipContext, true, 'Expected fellowship/stipend context on funding.html');
    } finally {
      await page.close();
    }
  });

  test('T2-F4-02: Computed WCAG 2.1 AA contrast on featured funding bands, cards, badges, and buttons on index.html and funding.html (zero Pitt Gold text on light bg)', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      // 1. index.html funding callout & full page contrast
      const homeNav = await page.goto(pageUrl('index.html'));
      assert.equal(homeNav.status, 200);

      const hasHomeFundingCta = await page.evaluate(() => {
        const main = document.querySelector('main');
        if (!main) return false;
        const link = [...main.querySelectorAll('a[href*="funding.html"]')].find((a) => {
          const r = a.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        return Boolean(link);
      });
      assert.equal(
        hasHomeFundingCta,
        true,
        'Expected a visible funding CTA/callout inside <main> on index.html'
      );

      const homeContrast = await auditPageContrast(page);
      assert.equal(
        homeContrast.goldOnLightViolations.length,
        0,
        `Pitt Gold text on light background on index.html: ${JSON.stringify(homeContrast.goldOnLightViolations)}`
      );
      assert.equal(
        homeContrast.violations.length,
        0,
        `WCAG 2.1 AA contrast violations on index.html: ${JSON.stringify(homeContrast.violations)}`
      );

      // 2. funding.html full page contrast
      const fundingNav = await page.goto(pageUrl('funding.html'));
      assert.equal(fundingNav.status, 200, 'Expected funding.html to load with HTTP 200');

      const fundingContrast = await auditPageContrast(page);
      assert.ok(
        fundingContrast.checkedCount >= 20,
        `Expected >= 20 audited text elements on funding.html, got ${fundingContrast.checkedCount}`
      );
      assert.equal(
        fundingContrast.goldOnLightViolations.length,
        0,
        `Pitt Gold text on light background on funding.html: ${JSON.stringify(fundingContrast.goldOnLightViolations)}`
      );
      assert.equal(
        fundingContrast.violations.length,
        0,
        `WCAG 2.1 AA contrast violations on funding.html: ${JSON.stringify(fundingContrast.violations)}`
      );
    } finally {
      await page.close();
    }
  });

  test('T2-F4-03: Navigating directly to resources.html#travel-grants auto-expands #travel-grants <details> and provides a live link to funding.html', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('resources.html#travel-grants'));
      assert.equal(nav.status, 200);

      await page.waitFor(
        () => {
          const d = document.getElementById('travel-grants');
          return Boolean(d && d.tagName === 'DETAILS' && d.open === true);
        },
        { timeoutMs: 4000, message: 'Navigating to resources.html#travel-grants did not auto-expand <details id="travel-grants">' }
      );

      const linkInfo = await page.evaluate(() => {
        const d = document.getElementById('travel-grants');
        if (!d) return { found: false };
        const a = [...d.querySelectorAll('a[href*="funding.html"]')].find((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        if (!a) return { found: false };
        return {
          found: true,
          href: a.getAttribute('href') || '',
          text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
        };
      });

      assert.equal(
        linkInfo.found,
        true,
        'Expected auto-expanded #travel-grants on resources.html to provide a visible link to funding.html'
      );

      const destUrl = await page.clickAndWaitForNavigation(
        '#travel-grants a[href*="funding.html"]'
      );
      assert.ok(
        destUrl.includes('funding.html'),
        `Expected clicking funding link in #travel-grants to navigate to funding.html, got ${destUrl}`
      );
    } finally {
      await page.close();
    }
  });

  test('T2-F4-04: funding.html retains breadcrumbs, <nav aria-label="On this page"> with >= 2 valid fragment targets, and data-source-link handoff', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('funding.html'));
      assert.equal(nav.status, 200, 'Expected funding.html to load with HTTP 200');

      const audit = await page.evaluate(() => {
        const bc = document.querySelector('nav[aria-label="Breadcrumb"]');
        const hasHomeCrumb = Boolean(bc && bc.querySelector('a[href="index.html"], a[href$="index.html"]'));
        const hasCurrentCrumb = Boolean(bc && bc.querySelector('[aria-current="page"]'));

        const jumps = document.querySelector('nav[aria-label="On this page"]');
        const jumpLinks = jumps
          ? [...jumps.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href') || '')
          : [];
        const brokenJumps = jumpLinks.filter(
          (h) => h.length < 2 || !document.getElementById(h.slice(1))
        );

        const sourceLinks = [...document.querySelectorAll('a[data-source-link]')].map(
          (a) => a.getAttribute('href') || ''
        );
        const invalidHtmlSourceLinks = sourceLinks.filter(
          (h) => /isp\.pitt\.edu/i.test(h) && /\.html(?:$|[?#])/i.test(h)
        );

        return {
          hasBreadcrumb: Boolean(bc),
          hasHomeCrumb,
          hasCurrentCrumb,
          hasPageJumps: Boolean(jumps),
          jumpLinks,
          brokenJumps,
          sourceLinks,
          invalidHtmlSourceLinks,
        };
      });

      assert.equal(audit.hasBreadcrumb, true, 'Expected <nav aria-label="Breadcrumb"> on funding.html');
      assert.equal(audit.hasHomeCrumb, true, 'Expected Home link in funding.html breadcrumb');
      assert.equal(audit.hasCurrentCrumb, true, 'Expected [aria-current="page"] in funding.html breadcrumb');
      assert.equal(audit.hasPageJumps, true, 'Expected <nav aria-label="On this page"> on funding.html');
      assert.ok(
        audit.jumpLinks.length >= 2,
        `Expected >= 2 jump links on funding.html, got ${audit.jumpLinks.length}`
      );
      assert.deepEqual(
        audit.brokenJumps,
        [],
        `Broken jump links on funding.html: ${JSON.stringify(audit.brokenJumps)}`
      );
      assert.ok(
        audit.sourceLinks.length >= 1,
        'Expected >= 1 official [data-source-link] external handoff on funding.html'
      );
      assert.deepEqual(
        audit.invalidHtmlSourceLinks,
        [],
        `External ISP source links must not end in .html: ${JSON.stringify(audit.invalidHtmlSourceLinks)}`
      );
    } finally {
      await page.close();
    }
  });

  test('T2-F4-05: Mobile 320x568 on funding.html and index.html: zero horizontal overflow and funding CTAs remain visible/clickable', async () => {
    const page = await browser.newPage({ width: 320, height: 568, mobile: true });
    try {
      const homeNav = await page.goto(pageUrl('index.html'));
      assert.equal(homeNav.status, 200);

      const homeOverflow = await checkNoHorizontalOverflow(page);
      assert.equal(
        homeOverflow.ok,
        true,
        `Horizontal overflow on index.html at 320x568: ${JSON.stringify(homeOverflow)}`
      );

      const destUrl = await page.clickAndWaitForNavigation('main a[href*="funding.html"]');
      assert.ok(
        destUrl.includes('funding.html'),
        `Expected clicking funding CTA on mobile index.html to navigate to funding.html, got ${destUrl}`
      );

      const fundingOverflow = await checkNoHorizontalOverflow(page);
      assert.equal(
        fundingOverflow.ok,
        true,
        `Horizontal overflow on funding.html at 320x568: ${JSON.stringify(fundingOverflow)}`
      );
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature F5: Faculty Explorer Replacing People Page (7 tests)
  // =========================================================================

  test('T2-F5-01: "AI" false-positive regression trap: excludes pure non-AI substring traps (dana-l-tudorascu, na-du, hatice-osmanbeyoglu) while matching all 10 explicit AI/Artificial Intelligence faculty', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('people.html'));
      assert.equal(nav.status, 200);

      await setPeopleTopicQuery(page, 'AI');
      await waitForCheck(
        page,
        async () => {
          const st = await getFacultyExplorerState(page);
          return st.visibleCount >= 10 && st.visibleCount < 30;
        },
        { timeoutMs: 4000, message: 'Topic search for "AI" did not filter Faculty profiles' }
      );

      const state = await getFacultyExplorerState(page);
      const slugs = new Set(state.visibleSlugs);

      // 1. Strictly exclude pure non-AI substring traps ("brain", "aims", and empty topics)
      assert.equal(
        slugs.has('dana-l-tudorascu'),
        false,
        'dana-l-tudorascu ("brain" in bio, Health & biomedicine only) MUST NOT match topic "AI"'
      );
      assert.equal(
        slugs.has('na-du'),
        false,
        'na-du ("aims" in bio, HCI only) MUST NOT match topic "AI"'
      );
      assert.equal(
        slugs.has('hatice-osmanbeyoglu'),
        false,
        'hatice-osmanbeyoglu (empty topics: []) MUST NOT match topic "AI"'
      );

      // 2. Must include all 10 verified explicit \bAI\b + "Artificial Intelligence" faculty
      const mustInclude10 = [
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
      ];
      for (const reqSlug of mustInclude10) {
        assert.equal(
          slugs.has(reqSlug),
          true,
          `Expected topic "AI" to include verified AI/Artificial Intelligence faculty ${reqSlug}, visible=${JSON.stringify(state.visibleSlugs)}`
        );
      }

      // 3. Peer-facet guard if michael-colaresi ("Chair" in bio, "Machine learning and reasoning" facet) is included
      if (slugs.has('michael-colaresi')) {
        assert.equal(
          slugs.has('madhavi-ganapathiraju') && slugs.has('leming-zhou'),
          true,
          'michael-colaresi matched "AI" without non-"chair" Machine Learning peers (madhavi-ganapathiraju, leming-zhou) — indicates "Chair" substring leakage!'
        );
      }
    } finally {
      await page.close();
    }
  });

  test('T2-F5-02: Punctuation, hyphen & multi-token partial-name normalization ("HJ Park", "Yu Ru", "Peter B")', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('people.html'));
      assert.equal(nav.status, 200);

      // 1. "HJ Park" -> Hyung Jung (H.J.) Park (#person-hyung-jung-hj-park)
      await setPeopleNameQuery(page, 'HJ Park');
      await waitForCheck(
        page,
        async () => {
          const st = await getFacultyExplorerState(page);
          return st.visibleCount === 1 && st.visibleSlugs[0] === 'hyung-jung-hj-park';
        },
        {
          timeoutMs: 4000,
          message: 'Partial-name query "HJ Park" did not match #person-hyung-jung-hj-park (Hyung Jung (H.J.) Park)',
        }
      );

      // 2. "Yu Ru" -> Yu-Ru Lin (#person-yu-ru-lin)
      await setPeopleNameQuery(page, 'Yu Ru');
      await waitForCheck(
        page,
        async () => {
          const st = await getFacultyExplorerState(page);
          return st.visibleCount === 1 && st.visibleSlugs[0] === 'yu-ru-lin';
        },
        {
          timeoutMs: 4000,
          message: 'Partial-name query "Yu Ru" did not match #person-yu-ru-lin (Yu-Ru Lin)',
        }
      );

      // 3. "Peter B" -> Peter Brusilovsky (#person-peter-brusilovsky)
      await setPeopleNameQuery(page, 'Peter B');
      await waitForCheck(
        page,
        async () => {
          const st = await getFacultyExplorerState(page);
          return st.visibleCount === 1 && st.visibleSlugs[0] === 'peter-brusilovsky';
        },
        {
          timeoutMs: 4000,
          message: 'Partial-name query "Peter B" did not match #person-peter-brusilovsky (Peter Brusilovsky)',
        }
      );
    } finally {
      await page.close();
    }
  });

  test('T2-F5-03: hatice-osmanbeyoglu integrity invariant: card exists in Faculty Explorer view and renders ZERO fabricated research topic tags', async () => {
    const { repoRoot } = getConfig();
    const facetsPath = path.join(repoRoot, 'redesign', 'src', 'people-facets.json');
    const facetsData = JSON.parse(fs.readFileSync(facetsPath, 'utf8'));
    const haticeEntry =
      facetsData?.people?.['hatice-osmanbeyoglu'] ??
      facetsData?.faculty?.['hatice-osmanbeyoglu'] ??
      facetsData?.['hatice-osmanbeyoglu'];
    assert.ok(haticeEntry, 'Expected hatice-osmanbeyoglu entry in people-facets.json');
    assert.deepEqual(
      haticeEntry.topics,
      [],
      'hatice-osmanbeyoglu topics in people-facets.json must remain []'
    );

    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('people.html'));
      assert.equal(nav.status, 200);

      const state = await getFacultyExplorerState(page);
      assert.match(
        state.h1Text,
        /faculty\s+explorer/i,
        `Expected people.html <h1> to be branded "Faculty Explorer", got "${state.h1Text}"`
      );
      assert.equal(
        state.visibleSlugs.includes('hatice-osmanbeyoglu'),
        true,
        'Expected #person-hatice-osmanbeyoglu to be visible in default Faculty Explorer view'
      );

      const cardAudit = await page.evaluate(() => {
        const card = document.getElementById('person-hatice-osmanbeyoglu');
        if (!card) return { found: false, topicTagsCount: -1 };
        const topicItems = card.querySelectorAll(
          '.person-topics li, [data-topic], [data-area], ul[aria-label*="topic" i] li'
        );
        return {
          found: true,
          topicTagsCount: topicItems.length,
          text: (card.textContent || '').replace(/\s+/g, ' ').trim(),
        };
      });

      assert.equal(cardAudit.found, true);
      assert.equal(
        cardAudit.topicTagsCount,
        0,
        `#person-hatice-osmanbeyoglu must render zero research topic tags, found ${cardAudit.topicTagsCount}`
      );
    } finally {
      await page.close();
    }
  });

  test('T2-F5-04: Backwards compatibility & deep links: people.html?category= shows all 190 profiles; #person-peter-brusilovsky, #person-kevin-ashley, and non-faculty #person-heidi-davis auto-reveal unobstructed below sticky nav', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      // 1. Footer backwards-compatibility URL: people.html?category= -> all 190 profiles
      const allNav = await page.goto(pageUrl('people.html?category='));
      assert.equal(allNav.status, 200);

      const allState = await getFacultyExplorerState(page);
      assert.equal(
        allState.visibleCount,
        190,
        `Expected people.html?category= to display all 190 profiles, got ${allState.visibleCount}`
      );

      // 2. Deep links (including non-faculty Staff profile heidi-davis) auto-reveal & clear sticky navbar
      for (const slug of ['peter-brusilovsky', 'kevin-ashley', 'heidi-davis']) {
        await page.goto(pageUrl(`people.html#person-${slug}`));
        await page.waitFor(
          (s) => {
            const el = document.getElementById(`person-${s}`);
            if (!el || el.hidden || el.closest('[hidden]')) return false;
            const cs = getComputedStyle(el);
            return cs.display !== 'none' && cs.visibility !== 'hidden';
          },
          {
            timeoutMs: 4000,
            args: [slug],
            message: `Deep link people.html#person-${slug} did not reveal #person-${slug}`,
          }
        );

        const clearance = await checkAnchorNotOccluded(page, `person-${slug}`);
        assert.equal(
          clearance.stickyFound,
          true,
          `Expected sticky navbar to be active when checking deep link #person-${slug}`
        );
        assert.equal(
          clearance.unobstructed,
          true,
          `Expected #person-${slug} to land unobstructed below sticky navbar: ${JSON.stringify(clearance)}`
        );
      }
    } finally {
      await page.close();
    }
  });

  test('T2-F5-05: Topic search works across non-faculty scopes (Graduate students topic "AI" matches documented interests and excludes name substring traps)', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('people.html'));
      assert.equal(nav.status, 200);

      await selectPeopleScope(page, 'Graduate students');
      await waitForCheck(
        page,
        async () => (await getFacultyExplorerState(page)).visibleCount === 32,
        { timeoutMs: 4000, message: 'Switching to Graduate students should display 32 profiles' }
      );

      const gradState = await getFacultyExplorerState(page);
      assert.equal(
        gradState.hasTopicInput,
        true,
        'Expected dedicated topic/research-area search input on people.html'
      );
      assert.equal(
        gradState.topicInputDisabled,
        false,
        'Topic search input must remain enabled when viewing Graduate students'
      );

      await setPeopleTopicQuery(page, 'AI');
      await waitForCheck(
        page,
        async () => {
          const st = await getFacultyExplorerState(page);
          return st.visibleCount >= 4 && st.visibleCount < 32;
        },
        { timeoutMs: 4000, message: 'Topic search "AI" in Graduate students did not filter profiles' }
      );

      const filteredGrad = await getFacultyExplorerState(page);
      const slugs = new Set(filteredGrad.visibleSlugs);

      for (const expectedStudent of [
        'raphael-adewale',
        'joshua-w-anderson',
        'yuya-asano',
        'ellie-sagheb-hossein-pour',
      ]) {
        assert.equal(
          slugs.has(expectedStudent),
          true,
          `Expected Graduate students topic "AI" to match ${expectedStudent}, got ${JSON.stringify(filteredGrad.visibleSlugs)}`
        );
      }

      // Exclude surname/first-name substring traps ("Paine", "Haiyi")
      assert.equal(
        slugs.has('nathaniel-paine'),
        false,
        'nathaniel-paine ("ai" only in surname Paine; interests="biomedical informatics") must NOT match topic "AI"'
      );
      assert.equal(
        slugs.has('haiyi-ma'),
        false,
        'haiyi-ma ("ai" only in first name Haiyi; empty interests) must NOT match topic "AI"'
      );
    } finally {
      await page.close();
    }
  });

  test('T2-F5-06: Empty-state recovery & keyboard focus retention in Faculty Explorer (never drops focus to document.body)', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('people.html'));
      assert.equal(nav.status, 200);

      const initial = await getFacultyExplorerState(page);
      assert.match(
        initial.h1Text,
        /faculty\s+explorer/i,
        `Expected people.html <h1> to be "Faculty Explorer", got "${initial.h1Text}"`
      );

      await setPeopleNameQuery(page, 'ZZZ_NO_MATCH_999');
      await waitForCheck(
        page,
        async () => (await getFacultyExplorerState(page)).visibleCount === 0,
        { timeoutMs: 4000, message: 'Expected 0 visible cards for unmatched name query' }
      );

      const emptyState = await getFacultyExplorerState(page);
      assert.ok(
        emptyState.recoveryButtons.length >= 1,
        'Expected >= 1 visible recovery button (Clear / Reset / All people) in empty state'
      );

      // Focus the first recovery button and activate via keyboard Enter
      const focusedRecovery = await page.evaluate(() => {
        const isVisible = (el) => {
          if (!el || el.hidden || el.closest('[hidden]')) return false;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        };
        const main = document.querySelector('main') || document.body;
        const btn = [...main.querySelectorAll('button')].find(
          (b) =>
            isVisible(b) &&
            /clear|reset|show all|all people/i.test(
              `${b.getAttribute('aria-label') || ''} ${b.textContent || ''}`
            )
        );
        if (!btn) return false;
        btn.focus();
        return document.activeElement === btn;
      });
      assert.equal(focusedRecovery, true, 'Failed to focus empty-state recovery button');

      await page.pressKey('Enter');
      await waitForCheck(
        page,
        async () => (await getFacultyExplorerState(page)).visibleCount >= 30,
        { timeoutMs: 4000, message: 'Activating empty-state recovery button did not restore profiles' }
      );

      const focusAfterRecovery = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body || el === document.documentElement) {
          return { retained: false, tag: el ? el.tagName : 'null', id: '' };
        }
        const r = el.getBoundingClientRect();
        return {
          retained: r.width > 0 && r.height > 0,
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
        };
      });

      assert.equal(
        focusAfterRecovery.retained,
        true,
        `Expected keyboard focus to remain on a visible interactive control after empty-state recovery, got ${JSON.stringify(focusAfterRecovery)}`
      );
    } finally {
      await page.close();
    }
  });

  test('T2-F5-07: JavaScript disabled: people.html is branded "Faculty Explorer" and all 190 profiles remain rendered and readable without JS', async () => {
    const page = await browser.newPage({
      width: 1440,
      height: 900,
      javascriptEnabled: false,
    });
    try {
      const nav = await page.goto(pageUrl('people.html'));
      assert.equal(nav.status, 200);

      const state = await getFacultyExplorerState(page);
      assert.match(
        state.h1Text,
        /faculty\s+explorer/i,
        `Expected people.html <h1> to contain "Faculty Explorer" without JS, got "${state.h1Text}"`
      );
      assert.match(
        state.title,
        /faculty\s+explorer/i,
        `Expected people.html <title> to contain "Faculty Explorer", got "${state.title}"`
      );
      assert.equal(state.totalCards, 190, 'Expected 190 total person cards in people.html');
      assert.equal(
        state.visibleCount,
        190,
        `Expected all 190 profile cards to be visible when JS is disabled, got ${state.visibleCount}`
      );
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature F6: Sticky Scroll-Following Navbar & Anchor Offsets (5 tests)
  // =========================================================================

  test('T2-F6-01: Mobile 320x568 expanded menu scrollability at scrollY=600 (viewport-bounded drawer, zero horizontal overflow)', async () => {
    const page = await browser.newPage({ width: 320, height: 568, mobile: true });
    try {
      const nav = await page.goto(pageUrl('index.html'));
      assert.equal(nav.status, 200);

      await page.scrollTo(600);
      const sticky = await findStickyNavInfo(page);
      assert.equal(sticky.found, true, 'Expected sticky navbar container at 320x568');
      assert.ok(
        Math.abs(sticky.top) <= 1,
        `Expected sticky navbar pinned at top ≈ 0 when scrolled at 320x568, got top=${sticky.top}`
      );
      assert.ok(
        sticky.height > 0 && sticky.height <= 140,
        `Expected compact sticky navbar height <= 140px at 320x568, got ${sticky.height}`
      );

      const toggleBefore = await findMobileMenuToggle(page);
      assert.equal(toggleBefore.found, true, 'Expected visible mobile menu toggle button at 320x568');
      assert.equal(toggleBefore.expanded, false, 'Mobile menu should be collapsed initially');

      await page.clickAt(toggleBefore.rect.centerX, toggleBefore.rect.centerY);
      await waitForCheck(
        page,
        async () => (await findMobileMenuToggle(page)).expanded === true,
        { timeoutMs: 3000, message: 'Clicking mobile menu toggle at scrollY=600 did not expand drawer' }
      );

      const toggleOpen = await findMobileMenuToggle(page);
      assert.ok(toggleOpen.drawerInfo, 'Expected controlled drawer element for mobile menu');
      assert.equal(toggleOpen.drawerInfo.visible, true, 'Expanded mobile drawer must be visible');
      assert.equal(
        toggleOpen.drawerInfo.viewportBounded,
        true,
        `Expanded mobile drawer must be viewport-bounded or scrollable (overflow-y: auto|scroll), got ${JSON.stringify(toggleOpen.drawerInfo)}`
      );

      const overflow = await checkNoHorizontalOverflow(page);
      assert.equal(
        overflow.ok,
        true,
        `Horizontal overflow with mobile drawer open at 320x568: ${JSON.stringify(overflow)}`
      );
    } finally {
      await page.close();
    }
  });

  test('T2-F6-02: prefers-reduced-motion: reduce emulation — sticky nav, anchor jump non-occlusion, and mobile drawer work cleanly', async () => {
    const page = await browser.newPage({
      width: 1440,
      height: 900,
      reducedMotion: true,
    });
    try {
      const nav = await page.goto(pageUrl('academics.html'));
      assert.equal(nav.status, 200);

      const mediaCheck = await page.evaluate(() => ({
        reducedMotionMatches: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      }));
      assert.equal(mediaCheck.reducedMotionMatches, true);
      assert.equal(
        mediaCheck.scrollBehavior,
        'auto',
        'Expected scroll-behavior: auto when prefers-reduced-motion: reduce is active'
      );

      await page.scrollTo(600);
      const sticky = await findStickyNavInfo(page);
      assert.equal(sticky.found, true, 'Expected sticky navbar with reduced motion enabled');
      assert.ok(Math.abs(sticky.top) <= 1, `Expected sticky top ≈ 0, got ${sticky.top}`);

      await page.scrollTo(0);
      const jumpUrl = await page.clickAndWaitForNavigation(
        'nav[aria-label="On this page"] a[href^="#"]'
      );
      const targetId = jumpUrl.split('#')[1];
      assert.ok(targetId, `Expected hash fragment after clicking jump link, got ${jumpUrl}`);

      const clearance = await checkAnchorNotOccluded(page, targetId);
      assert.equal(
        clearance.unobstructed,
        true,
        `Anchor #${targetId} occluded under sticky nav with reduced-motion: ${JSON.stringify(clearance)}`
      );

      // Mobile drawer open/Escape under reduced-motion
      await page.setViewport(320, 568, { mobile: true });
      const toggle = await findMobileMenuToggle(page);
      assert.equal(toggle.found, true);
      await page.clickAt(toggle.rect.centerX, toggle.rect.centerY);
      await waitForCheck(
        page,
        async () => (await findMobileMenuToggle(page)).expanded === true,
        { timeoutMs: 3000, message: 'Mobile drawer did not open under reduced-motion' }
      );
      await page.pressKey('Escape');
      await waitForCheck(
        page,
        async () => (await findMobileMenuToggle(page)).expanded === false,
        { timeoutMs: 3000, message: 'Mobile drawer did not close on Escape under reduced-motion' }
      );
    } finally {
      await page.close();
    }
  });

  test('T2-F6-03: JavaScript disabled: sticky navbar still sticks via pure CSS and scroll-padding-top/scroll-margin-top prevents anchor occlusion', async () => {
    const page = await browser.newPage({
      width: 1440,
      height: 900,
      javascriptEnabled: false,
    });
    try {
      const nav = await page.goto(pageUrl('academics.html'));
      assert.equal(nav.status, 200);

      await page.scrollTo(600);
      const sticky = await findStickyNavInfo(page);
      assert.equal(
        sticky.found,
        true,
        'Expected sticky navbar to work via pure CSS when JavaScript is disabled'
      );
      assert.ok(
        Math.abs(sticky.top) <= 1,
        `Expected pure-CSS sticky navbar pinned at top ≈ 0 at scrollY=600, got top=${sticky.top}`
      );

      const cssOffsets = await page.evaluate(() => {
        const htmlPad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
        const target =
          document.getElementById('requirements') ||
          document.querySelector('main section[id], main h2[id]');
        const targetMargin = target ? parseFloat(getComputedStyle(target).scrollMarginTop) || 0 : 0;
        return {
          htmlPad,
          targetId: target ? target.id : '',
          targetMargin,
        };
      });

      assert.ok(
        cssOffsets.htmlPad >= 50 || cssOffsets.targetMargin >= 50,
        `Expected pure-CSS scroll-padding-top or scroll-margin-top >= 50px without JS, got ${JSON.stringify(cssOffsets)}`
      );

      if (cssOffsets.targetId) {
        await page.goto(pageUrl(`academics.html#${cssOffsets.targetId}`));
        const clearance = await checkAnchorNotOccluded(page, cssOffsets.targetId);
        assert.equal(
          clearance.unobstructed,
          true,
          `Expected #${cssOffsets.targetId} to be unobstructed below sticky navbar with JS disabled: ${JSON.stringify(clearance)}`
        );
      }
    } finally {
      await page.close();
    }
  });

  test('T2-F6-04: Dynamic viewport resize (1440x900 -> 375x812 -> 1440x900) keeps desktop sticky nav visible with zero horizontal overflow', async () => {
    const page = await browser.newPage({ width: 1440, height: 900, mobile: false });
    try {
      const nav = await page.goto(pageUrl('index.html'));
      assert.equal(nav.status, 200);

      await page.scrollTo(600);
      const stickyDesktop1 = await findStickyNavInfo(page);
      assert.equal(stickyDesktop1.found, true, 'Expected sticky navbar on initial 1440x900 viewport');
      assert.ok(Math.abs(stickyDesktop1.top) <= 1);

      // Resize to 375x812 mobile and open mobile drawer
      await page.setViewport(375, 812, { mobile: true });
      const mobileToggle = await findMobileMenuToggle(page);
      assert.equal(mobileToggle.found, true, 'Expected mobile menu toggle at 375x812');
      await page.clickAt(mobileToggle.rect.centerX, mobileToggle.rect.centerY);
      await waitForCheck(
        page,
        async () => (await findMobileMenuToggle(page)).expanded === true,
        { timeoutMs: 3000, message: 'Mobile menu did not open at 375x812' }
      );
      assert.equal((await checkNoHorizontalOverflow(page)).ok, true);

      // Resize back to 1440x900 desktop
      await page.setViewport(1440, 900, { mobile: false });
      await page.scrollTo(600);

      const stickyDesktop2 = await findStickyNavInfo(page);
      assert.equal(
        stickyDesktop2.found,
        true,
        'Expected sticky navbar to remain active after round-trip resize to 1440x900'
      );
      assert.ok(Math.abs(stickyDesktop2.top) <= 1);
      assert.ok(stickyDesktop2.height > 0);

      const desktopNavLinksVisible = await page.evaluate(() => {
        const navEl = document.querySelector('nav[aria-label="Main navigation"]');
        if (!navEl) return 0;
        return [...navEl.querySelectorAll('a[href]')].filter((a) => {
          const r = a.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        }).length;
      });
      assert.ok(
        desktopNavLinksVisible >= 5,
        `Expected >= 5 visible desktop nav links after round-trip resize, got ${desktopNavLinksVisible}`
      );
      assert.equal((await checkNoHorizontalOverflow(page)).ok, true);
    } finally {
      await page.close();
    }
  });

  test('T2-F6-05: Opaque background & brand mark sizing: sticky bar computed background alpha is 1 and desktop Institutional Mark / placeholder width >= 220px', async () => {
    const page = await browser.newPage({ width: 1440, height: 900, mobile: false });
    try {
      const nav = await page.goto(pageUrl('index.html'));
      assert.equal(nav.status, 200);

      const markInfo = await page.evaluate(() => {
        const mark =
          document.querySelector('.mark-placeholder') ||
          document.querySelector('header img[alt*="Pittsburgh" i], header [class*="mark"]');
        if (!mark) return { found: false, width: 0 };
        const r = mark.getBoundingClientRect();
        return {
          found: true,
          width: Number(r.width.toFixed(2)),
          height: Number(r.height.toFixed(2)),
        };
      });

      assert.equal(
        markInfo.found,
        true,
        'Expected Institutional Mark or .mark-placeholder in desktop header'
      );
      assert.ok(
        markInfo.width >= 220,
        `BRAND.md requires Institutional Mark / placeholder width >= 220px on desktop (1440x900), got ${markInfo.width}px`
      );

      await page.scrollTo(600);
      const sticky = await findStickyNavInfo(page);
      assert.equal(sticky.found, true, 'Expected sticky navbar at scrollY=600');
      assert.equal(
        sticky.bgAlpha,
        1,
        `Expected sticky navbar computed background to be 100% opaque (alpha === 1), got alpha=${sticky.bgAlpha} (${sticky.bgRgba})`
      );
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature F7: Zero-Dependency Site-Wide Search (6 tests)
  // =========================================================================

  test('T2-F7-01: XSS injection safety: querying <img onerror><script> in both search modal and search.html?q=... executes zero scripts and injects zero raw nodes', async () => {
    const xssPayload =
      '<img src=x onerror="window.__e2eXss=1"><script>window.__e2eXss=2</script>';

    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      // 1. Modal XSS test on index.html
      const nav = await page.goto(pageUrl('index.html'));
      assert.equal(nav.status, 200);

      await openSiteSearch(page, 'click');
      await fillSiteSearch(page, xssPayload, { inDialog: true });

      const modalCheck = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"], dialog[open]');
        const injectedNodes = dlg
          ? dlg.querySelectorAll('script, img[onerror], img[src="x"]').length
          : 0;
        return {
          xssFlag: window.__e2eXss,
          injectedNodes,
        };
      });
      assert.equal(modalCheck.xssFlag, undefined, 'XSS payload must not execute in search modal');
      assert.equal(
        modalCheck.injectedNodes,
        0,
        'Search modal must not inject raw <script> or <img onerror> DOM elements'
      );

      // 2. Full-page search.html?q=... XSS test
      const searchNav = await page.goto(
        pageUrl(`search.html?q=${encodeURIComponent(xssPayload)}`)
      );
      assert.equal(searchNav.status, 200, 'Expected search.html to load with HTTP 200');

      await fillSiteSearch(page, xssPayload, { inDialog: false });

      const pageCheck = await page.evaluate(() => {
        const main = document.querySelector('main') || document.body;
        const injectedNodes = main.querySelectorAll(
          'script, img[onerror], img[src="x"]'
        ).length;
        return {
          xssFlag: window.__e2eXss,
          injectedNodes,
        };
      });
      assert.equal(pageCheck.xssFlag, undefined, 'XSS payload must not execute on search.html');
      assert.equal(
        pageCheck.injectedNodes,
        0,
        'search.html must not inject raw <script> or <img onerror> DOM elements'
      );
      assert.equal(page.pageErrors.length, 0, `Unexpected page errors: ${JSON.stringify(page.pageErrors)}`);
    } finally {
      await page.close();
    }
  });

  test('T2-F7-02: Hyphen/case/synonym normalization in site search ("ISSP-2170", "prereq", "scholarship")', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('index.html'));
      assert.equal(nav.status, 200);

      await openSiteSearch(page, 'click');

      // 1. Hyphenated course code: "ISSP-2170" -> matches "ISSP 2170" / courses.html
      await fillSiteSearch(page, 'ISSP-2170', { inDialog: true });
      await waitForCheck(
        page,
        async () => {
          const st = await getSearchDialogState(page);
          return st.results.some(
            (r) => /ISSP\s*2170/i.test(r.text) || /courses\.html/i.test(r.rawHref)
          );
        },
        { timeoutMs: 4000, message: 'Site search for "ISSP-2170" did not match ISSP 2170 / courses.html' }
      );

      // 2. Partial/synonym: "prereq" -> matches prerequisites / courses.html
      await fillSiteSearch(page, 'prereq', { inDialog: true });
      await waitForCheck(
        page,
        async () => {
          const st = await getSearchDialogState(page);
          return st.results.some(
            (r) =>
              /prereq|course|requirement/i.test(r.text) ||
              /courses\.html|academics\.html|ms\.html|phd\.html/i.test(r.rawHref)
          );
        },
        { timeoutMs: 4000, message: 'Site search for "prereq" did not match prerequisites/courses' }
      );

      // 3. Synonym/domain term: "scholarship" -> matches funding.html / scholarships / fellowships
      await fillSiteSearch(page, 'scholarship', { inDialog: true });
      await waitForCheck(
        page,
        async () => {
          const st = await getSearchDialogState(page);
          return st.results.some(
            (r) =>
              /funding|scholarship|fellowship|pitt2pitt/i.test(r.text) ||
              /funding\.html/i.test(r.rawHref)
          );
        },
        { timeoutMs: 4000, message: 'Site search for "scholarship" did not match funding.html' }
      );
    } finally {
      await page.close();
    }
  });

  test('T2-F7-03: Boundary queries — empty "", whitespace "   ", 500-char string, and unmatched "qxqz_no_match_999" produce zero JS errors and helpful empty/no-result guidance', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('index.html'));
      assert.equal(nav.status, 200);

      await openSiteSearch(page, 'click');

      // 1. Empty string ""
      await fillSiteSearch(page, '', { inDialog: true });
      assert.equal((await getSearchDialogState(page)).open, true);

      // 2. Whitespace-only "   "
      await fillSiteSearch(page, '   ', { inDialog: true });
      assert.equal((await getSearchDialogState(page)).open, true);

      // 3. 500-char string
      await fillSiteSearch(page, 'a'.repeat(500), { inDialog: true });
      await waitForCheck(
        page,
        async () => (await getSearchDialogState(page)).results.length === 0,
        { timeoutMs: 4000, message: 'Expected 0 results for 500-char query' }
      );

      // 4. Unmatched "qxqz_no_match_999"
      await fillSiteSearch(page, 'qxqz_no_match_999', { inDialog: true });
      await waitForCheck(
        page,
        async () => {
          const st = await getSearchDialogState(page);
          return (
            st.results.length === 0 &&
            /no\s+(?:matching\s+)?results|0\s+results|nothing\s+found|no\s+matches/i.test(
              `${st.statusText} ${st.dialogText}`
            )
          );
        },
        {
          timeoutMs: 4000,
          message: 'Expected helpful no-results guidance for unmatched query "qxqz_no_match_999"',
        }
      );

      assert.equal(page.pageErrors.length, 0, `Unexpected page errors: ${JSON.stringify(page.pageErrors)}`);
      assert.equal(page.consoleErrors.length, 0, `Unexpected console errors: ${JSON.stringify(page.consoleErrors)}`);
    } finally {
      await page.close();
    }
  });

  test('T2-F7-04: Shortcut isolation inside inputs: pressing "/" outside input opens search modal, but pressing "/" inside a focused text <input> types "/" and does NOT open modal', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const nav = await page.goto(pageUrl('people.html'));
      assert.equal(nav.status, 200);

      // Step 1 (Vacuity guard): verify pressing "/" when NOT in an input DOES open the site-search modal
      await page.evaluate(() => {
        if (document.activeElement && document.activeElement !== document.body) {
          document.activeElement.blur();
        }
      });
      const openedViaSlash = await openSiteSearch(page, '/');
      assert.equal(
        openedViaSlash.open,
        true,
        'Vacuity guard: pressing "/" outside inputs must open the site-search modal'
      );

      await page.pressKey('Escape');
      await waitForCheck(
        page,
        async () => (await getSearchDialogState(page)).open === false,
        { timeoutMs: 3000, message: 'Pressing Escape did not close site-search modal' }
      );

      // Step 2: Focus a text input inside <main> on people.html and press "/"
      const focusedInput = await page.evaluate(() => {
        const input =
          document.getElementById('people-name') ||
          document.getElementById('people-topic-search') ||
          document.getElementById('people-search') ||
          document.querySelector('main input[type="search"], main input[type="text"]');
        if (!input) return false;
        input.value = '';
        input.focus();
        return document.activeElement === input;
      });
      assert.equal(focusedInput, true, 'Expected a focusable text input inside <main> on people.html');

      await page.pressKey('/');

      const afterSlash = await page.evaluate(() => ({
        activeValue: document.activeElement && 'value' in document.activeElement ? document.activeElement.value : '',
      }));
      assert.equal(
        afterSlash.activeValue,
        '/',
        `Expected "/" to be typed into the focused input, got ${JSON.stringify(afterSlash.activeValue)}`
      );

      const dlgState = await getSearchDialogState(page);
      assert.equal(
        dlgState.open,
        false,
        'Site-search modal must NOT open when "/" is pressed inside a focused text <input>'
      );
    } finally {
      await page.close();
    }
  });

  test('T2-F7-05: GitHub Pages subpath hosting (/ISP-Website-Redesign/): relative fetch of assets/search-index.json returns HTTP 200 and result links stay inside subpath', async () => {
    const page = await browser.newPage({
      width: 1440,
      height: 900,
      baseUrl: getConfig().subpathUrl,
    });
    try {
      // 1. Subpath index.html modal search
      const nav = await page.goto(subpathUrl('index.html'));
      assert.equal(nav.status, 200);

      await openSiteSearch(page, 'click');
      await fillSiteSearch(page, 'funding', { inDialog: true });

      await waitForCheck(
        page,
        async () => (await getSearchDialogState(page)).results.length >= 1,
        { timeoutMs: 4000, message: 'Subpath modal search for "funding" returned no results' }
      );

      const indexFetch = page.responses.find((r) =>
        r.url.includes('/ISP-Website-Redesign/assets/search-index.json')
      );
      assert.ok(
        indexFetch && indexFetch.status === 200,
        `Expected HTTP 200 for /ISP-Website-Redesign/assets/search-index.json, responses=${JSON.stringify(page.responses.map((r) => ({ url: r.url, status: r.status })))}`
      );
      assert.equal(
        page.localFailedRequests.length,
        0,
        `Unexpected failed subpath requests: ${JSON.stringify(page.localFailedRequests)}`
      );

      // 2. Subpath search.html?q=funding -> click result -> stays in /ISP-Website-Redesign/
      const searchNav = await page.goto(subpathUrl('search.html?q=funding'));
      assert.equal(searchNav.status, 200, 'Expected subpath search.html?q=funding to return HTTP 200');

      await waitForCheck(
        page,
        async () => (await getSearchPageState(page)).results.length >= 1,
        { timeoutMs: 4000, message: 'Subpath search.html?q=funding rendered no results' }
      );
      assert.equal(
        page.localFailedRequests.length,
        0,
        `Unexpected failed subpath requests on search.html: ${JSON.stringify(page.localFailedRequests)}`
      );

      const targetUrl = await page.clickAndWaitForNavigation(() => {
        const main = document.querySelector('main');
        if (!main) return null;
        return (
          [...main.querySelectorAll('a[href*="funding.html"]')].find((a) => {
            const r = a.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          }) || null
        );
      });

      assert.ok(
        targetUrl.includes('/ISP-Website-Redesign/funding.html'),
        `Expected clicking search result under subpath to stay in /ISP-Website-Redesign/, landed at ${targetUrl}`
      );
    } finally {
      await page.close();
    }
  });

  test('T2-F7-06: JavaScript disabled: sticky nav <noscript> exposes a working <a href*="search.html"> fallback link, and search.html renders readable <noscript> fallback navigation', async () => {
    const page = await browser.newPage({
      width: 1440,
      height: 900,
      javascriptEnabled: false,
    });
    try {
      const nav = await page.goto(pageUrl('index.html'));
      assert.equal(nav.status, 200);

      const trig = await findSearchTrigger(page);
      assert.equal(
        trig.found && trig.hasLinkFallback,
        true,
        `Expected sticky nav / header to expose a visible <a href*="search.html"> fallback when JS is disabled, got ${JSON.stringify(trig)}`
      );

      const searchNav = await page.goto(pageUrl('search.html'));
      assert.equal(searchNav.status, 200, 'Expected search.html to load HTTP 200 with JS disabled');

      const fallbackInfo = await page.evaluate(() => {
        const main = document.querySelector('main');
        if (!main) return { linkCount: 0, hrefs: [], textLen: 0 };
        const links = [...main.querySelectorAll('a[href]')].filter((a) => {
          const r = a.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        return {
          linkCount: links.length,
          hrefs: links.map((a) => a.getAttribute('href') || ''),
          textLen: (main.textContent || '').replace(/\s+/g, ' ').trim().length,
        };
      });

      assert.ok(
        fallbackInfo.linkCount >= 4,
        `Expected search.html without JS to provide >= 4 visible fallback navigation links, got ${fallbackInfo.linkCount}`
      );
      assert.ok(fallbackInfo.textLen >= 40, 'Expected readable fallback guidance on search.html without JS');
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature F8: Written Change Log, Brand & WCAG 2.1 AA Compliance (5 tests)
  // =========================================================================

  test('T2-F8-01: Minimum 320x568 zero horizontal overflow sweep across ALL 14 core pages', async () => {
    const { siteDir } = getConfig();
    const missingPages = CORE_PAGES_14.filter(
      (name) => !fs.existsSync(path.join(siteDir, name))
    );
    assert.deepEqual(
      missingPages,
      [],
      `All 14 core pages must exist in ${siteDir}; missing: ${JSON.stringify(missingPages)}`
    );

    const page = await browser.newPage({ width: 320, height: 568, mobile: true });
    try {
      const failures = [];
      for (const pageName of CORE_PAGES_14) {
        const nav = await page.goto(pageUrl(pageName));
        if (nav.status !== 200) {
          failures.push({ page: pageName, reason: `HTTP ${nav.status}` });
          continue;
        }
        const ov = await checkNoHorizontalOverflow(page);
        if (!ov.ok) {
          failures.push({
            page: pageName,
            reason: `Horizontal overflow: scrollWidth=${ov.scrollWidth} > clientWidth=${ov.clientWidth}`,
          });
        }
      }

      assert.deepEqual(
        failures,
        [],
        `320x568 horizontal overflow sweep failed across 14 core pages: ${JSON.stringify(failures)}`
      );
    } finally {
      await page.close();
    }
  });

  test('T2-F8-02: Deploy & protected-directory isolation (redesign/dist/ excludes docs/, tests/, CHANGES.md, .agents/; protected dirs have zero git changes)', () => {
    const { repoRoot } = getConfig();

    const gitCheck = checkGitProtectedDirsClean(repoRoot);
    assert.equal(
      gitCheck.clean,
      true,
      `Protected directories ("Design Assets", "Brand Guidelines", "www.isp.pitt.edu") must have zero git modifications: ${JSON.stringify(gitCheck.lines)}`
    );

    const buildPyPath = path.join(repoRoot, 'redesign', 'scripts', 'build.py');
    const buildPyText = fs.readFileSync(buildPyPath, 'utf8');
    for (const forbidden of ['docs', 'tests', 'CHANGES.md', '.agents']) {
      const esc = forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      assert.equal(
        new RegExp(`copy(?:tree|2)?\\([^)]*['"]${esc}['"]`, 'i').test(buildPyText),
        false,
        `redesign/scripts/build.py must never copy ${forbidden} into redesign/dist/`
      );
    }

    const distDir = path.join(repoRoot, 'redesign', 'dist');
    if (fs.existsSync(distDir) && fs.statSync(distDir).isDirectory()) {
      for (const forbidden of ['docs', 'tests', 'CHANGES.md', '.agents']) {
        assert.equal(
          fs.existsSync(path.join(distDir, forbidden)),
          false,
          `redesign/dist/${forbidden} must not exist in deploy output`
        );
      }

      const entries = fs.readdirSync(distDir);
      const unexpected = entries.filter(
        (name) => name !== 'assets' && name !== 'README.md' && !name.endsWith('.html')
      );
      assert.deepEqual(
        unexpected,
        [],
        `redesign/dist/ must contain only *.html, README.md, and assets/, found: ${JSON.stringify(unexpected)}`
      );
    }
  });

  test('T2-F8-03: Asset cache-busting ?v= hash integrity: every local CSS/JS/JSON ?v=<12-hex> reference matches actual SHA-256[:12] on disk', () => {
    const { siteDir } = getConfig();
    const htmlFiles = fs
      .readdirSync(siteDir)
      .filter((f) => f.endsWith('.html'))
      .sort();
    assert.ok(htmlFiles.length >= 11, `Expected >= 11 HTML files in ${siteDir}, found ${htmlFiles.length}`);

    const mismatches = [];
    const missing = [];
    for (const file of htmlFiles) {
      const htmlText = fs.readFileSync(path.join(siteDir, file), 'utf8');
      const report = verifyHtmlAssetHashes(htmlText, siteDir);
      for (const m of report.mismatches) {
        mismatches.push({ page: file, ...m });
      }
      for (const miss of report.missing) {
        missing.push({ page: file, ...miss });
      }
    }

    assert.deepEqual(
      missing,
      [],
      `Missing hashed assets referenced in generated HTML: ${JSON.stringify(missing)}`
    );
    assert.deepEqual(
      mismatches,
      [],
      `Stale ?v=<sha256[:12]> asset hashes in generated HTML: ${JSON.stringify(mismatches)}`
    );
  });

  test('T2-F8-04: Typography & accent guardrails: computed body font is never Instrument Serif, headings use uppercase condensed sans stack, and <= 4 brand accent colors per page', async () => {
    const { siteDir } = getConfig();
    const availablePages = CORE_PAGES_14.filter((p) =>
      fs.existsSync(path.join(siteDir, p))
    );
    assert.ok(
      availablePages.length >= 11,
      `Expected >= 11 core pages in ${siteDir}, found ${availablePages.length}`
    );

    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      const violations = [];
      for (const pageName of availablePages) {
        const nav = await page.goto(pageUrl(pageName));
        if (nav.status !== 200) {
          violations.push({ page: pageName, reason: `HTTP ${nav.status}` });
          continue;
        }
        const st = await auditPageStructure(page);
        if (st.typography.bodyUsesInstrumentSerif) {
          violations.push({
            page: pageName,
            reason: `Body uses prohibited Instrument Serif (${st.typography.bodyFontFamily})`,
          });
        }
        if (!st.typography.bodyDeclaresApprovedFont) {
          violations.push({
            page: pageName,
            reason: `Body does not declare Roboto or Merriweather (${st.typography.bodyFontFamily})`,
          });
        }
        if (st.typography.headingViolations.length > 0) {
          violations.push({
            page: pageName,
            reason: 'Heading font/uppercase violation',
            details: st.typography.headingViolations,
          });
        }
        if (!st.accentsOk) {
          violations.push({
            page: pageName,
            reason: `Page uses > 4 distinct brand accent colors (${st.accentCount}: ${st.accentsUsed.join(', ')})`,
          });
        }
      }

      assert.deepEqual(
        violations,
        [],
        `Typography or brand accent guardrail violations: ${JSON.stringify(violations)}`
      );
    } finally {
      await page.close();
    }
  });

  test('T2-F8-05: Zero broken local href/src links and zero broken #fragment targets across all 14 core pages', () => {
    const { siteDir } = getConfig();
    const missingCore = CORE_PAGES_14.filter(
      (name) => !fs.existsSync(path.join(siteDir, name))
    );
    assert.deepEqual(
      missingCore,
      [],
      `All 14 core pages must exist in ${siteDir} before link/anchor audit passes; missing: ${JSON.stringify(missingCore)}`
    );

    const idCache = new Map();
    const getIdsForFile = (absPath) => {
      if (!idCache.has(absPath)) {
        const text = fs.readFileSync(absPath, 'utf8');
        idCache.set(absPath, extractHtmlIds(text));
      }
      return idCache.get(absPath);
    };

    const brokenLinks = [];
    const brokenFragments = [];

    for (const pageName of CORE_PAGES_14) {
      const pagePath = path.join(siteDir, pageName);
      const htmlText = fs.readFileSync(pagePath, 'utf8');
      const refs = extractHtmlRefs(htmlText);

      for (const { attr, raw } of refs) {
        if (
          !raw ||
          /^(?:https?:\/\/|mailto:|tel:|data:|javascript:|\/\/)/i.test(raw)
        ) {
          continue;
        }

        const [pathPart, hashPart] = raw.split('#');
        const cleanPath = (pathPart || '').split('?')[0].trim();

        let targetAbsPath = pagePath;
        if (cleanPath.length > 0) {
          targetAbsPath = path.resolve(path.dirname(pagePath), cleanPath);
          if (!fs.existsSync(targetAbsPath) || !fs.statSync(targetAbsPath).isFile()) {
            brokenLinks.push({
              sourcePage: pageName,
              attr,
              ref: raw,
              resolvedPath: path.relative(siteDir, targetAbsPath),
            });
            continue;
          }
        }

        if (hashPart !== undefined && hashPart.length > 0 && targetAbsPath.endsWith('.html')) {
          const decodedHash = decodeURIComponent(hashPart);
          const targetIds = getIdsForFile(targetAbsPath);
          if (!targetIds.has(decodedHash)) {
            brokenFragments.push({
              sourcePage: pageName,
              ref: raw,
              targetFile: path.relative(siteDir, targetAbsPath),
              missingId: decodedHash,
            });
          }
        }
      }
    }

    assert.deepEqual(
      brokenLinks,
      [],
      `Found broken local href/src links across 14 core pages: ${JSON.stringify(brokenLinks)}`
    );
    assert.deepEqual(
      brokenFragments,
      [],
      `Found broken #fragment targets across 14 core pages: ${JSON.stringify(brokenFragments)}`
    );
  });
});
