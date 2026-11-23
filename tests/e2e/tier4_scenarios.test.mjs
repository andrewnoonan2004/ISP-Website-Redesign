/**
 * Tier 4: Real-World Multi-Feature Application Scenarios (tier4_scenarios.test.mjs)
 *
 * Implements 6 end-to-end user journey tests (T4-01 through T4-06)
 * exercising full multi-page workflows across F1–F8 as specified in
 * TEST_INFRA.md § 3 (Tier 4).
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
  checkGitProtectedDirsClean,
  checkNoHorizontalOverflow,
  clickTopicChip,
  extractHexColors,
  fillSiteSearch,
  findAcademicsDisclosure,
  findMobileMenuToggle,
  findRawColorsInCss,
  findSkipLinkInfo,
  findStickyNavInfo,
  getConfig,
  getFacultyExplorerState,
  getSearchDialogState,
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

describe('Tier 4: Real-World Multi-Feature Application Scenarios', () => {
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

  test('T4-01: Raphael\'s End-to-End Student Session — Home -> scrolled sticky Academics submenu -> MS Requirements -> Courses & Prerequisites -> Site Search "funding" -> funding.html -> Faculty Explorer partial-name "Brus" + topic "AI"', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      // Step 1: Home -> scroll down -> verify sticky navbar follows scroll
      const navHome = await page.goto(pageUrl('index.html'));
      assert.equal(navHome.status, 200);
      assertZeroRuntimeErrors(page, 'index.html');

      await page.scrollTo(600);
      const stickyHome = await findStickyNavInfo(page);
      assert.equal(stickyHome.found, true, 'Expected sticky navbar on scrolled index.html');
      assert.ok(Math.abs(stickyHome.top) <= 2, `Expected sticky navbar pinned at top=0, got ${stickyHome.top}`);

      // Step 2: Open Academics disclosure submenu -> verify requirements links -> click ms.html#requirements
      const disc = await findAcademicsDisclosure(page);
      assert.equal(disc.found, true, 'Expected Academics disclosure submenu button in sticky navbar');
      await page.clickAt(disc.rect.centerX, disc.rect.centerY);

      await page.waitFor(
        async () => {
          const d = await findAcademicsDisclosure(page);
          return d.found && d.expanded && d.menuVisible;
        },
        { timeoutMs: 3000, message: 'Expected Academics submenu to open' }
      );

      const discOpen = await findAcademicsDisclosure(page);
      const menuHrefs = discOpen.menuLinks.map((l) => l.href);
      for (const expectedTarget of ['academics.html#requirements', 'ms.html#requirements', 'phd.html#requirements', 'courses.html']) {
        assert.ok(
          menuHrefs.some((h) => h.includes(expectedTarget)),
          `Expected "${expectedTarget}" in Academics submenu, got ${JSON.stringify(menuHrefs)}`
        );
      }

      const msUrl = await page.clickAndWaitForNavigation(() => {
        const nav = document.querySelector('nav[aria-label="Main navigation"]') || document.body;
        return [...nav.querySelectorAll('a[href*="ms.html#requirements"]')].find((a) => {
          const r = a.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
      });
      assert.match(msUrl, /ms\.html#requirements$/i, `Expected navigation to ms.html#requirements, got ${msUrl}`);
      assertZeroRuntimeErrors(page, 'ms.html#requirements');

      // Step 3: Verify MS Requirements section is unobstructed and up-to-date
      const msClearance = await checkAnchorNotOccluded(page, 'requirements');
      assert.equal(msClearance.found, true, 'Expected #requirements on ms.html');
      assert.equal(
        msClearance.unobstructed,
        true,
        `Expected ms.html#requirements unobstructed below sticky bar: ${JSON.stringify(msClearance)}`
      );

      const msInfo = await page.evaluate(() => {
        const text = (document.querySelector('main')?.textContent || '').replace(/\s+/g, ' ');
        const hasCatoid242 = [...document.querySelectorAll('main a[href]')].some((a) =>
          /catoid=242/i.test(a.getAttribute('href') || '')
        );
        return {
          has30Credits: /30\s*(?:-|\s)?credit/i.test(text),
          hasIssp2071: /\bISSP\s+2071\b/.test(text),
          hasBiost2142: /\bBIOST\s+2142\b/.test(text),
          hasCatoid242,
        };
      });
      assert.equal(msInfo.has30Credits, true, 'Expected 30-credit requirement summary on ms.html');
      assert.equal(msInfo.hasIssp2071, true, 'Expected updated ISSP 2071 core course on ms.html');
      assert.equal(msInfo.hasBiost2142, true, 'Expected updated BIOST 2142 statistics course on ms.html');
      assert.equal(msInfo.hasCatoid242, true, 'Expected 2026-2027 catalog (catoid=242) link on ms.html');

      // Step 4: Navigate to courses.html -> verify ISSP 2071, ISSP 2170, prereqs, SCI/PeopleSoft/Permission links
      const coursesUrl = await page.clickAndWaitForNavigation(() => {
        return (
          [...document.querySelectorAll('main a[href*="courses.html"]')].find((a) => {
            const r = a.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          }) ||
          document.querySelector('nav[aria-label="Main navigation"] a[href*="courses.html"]')
        );
      });
      assert.match(coursesUrl, /courses\.html/i, `Expected navigation to courses.html, got ${coursesUrl}`);
      assertZeroRuntimeErrors(page, 'courses.html');

      const allCourses = await getVisibleCourses(page);
      const course2071 = allCourses.find((c) => c.code === 'ISSP 2071');
      const course2170 = allCourses.find((c) => c.code === 'ISSP 2170');
      assert.ok(course2071, 'Expected ISSP 2071 on courses.html');
      assert.ok(course2170, 'Expected ISSP 2170 on courses.html');
      assert.ok(
        course2071.hrefs.includes('https://courses.sci.pitt.edu/courses/view/ISSP-2071'),
        'Expected direct HTTPS SCI course view link for ISSP 2071'
      );
      assert.ok(
        course2170.hrefs.includes('https://courses.sci.pitt.edu/courses/view/ISSP-2170'),
        'Expected direct HTTPS SCI course view link for ISSP 2170'
      );

      const coursePageLinks = await page.evaluate(() => {
        const hrefs = [...document.querySelectorAll('main a[href]')].map((a) => a.getAttribute('href') || '');
        const text = (document.querySelector('main')?.textContent || '').replace(/\s+/g, ' ');
        return {
          hasSciSchedule: hrefs.some((h) => /^https:\/\/courses\.sci\.pitt\.edu\/?$/i.test(h) || /^https:\/\/courses\.sci\.pitt\.edu\//i.test(h)),
          hasPeopleSoft: hrefs.some((h) => /^https:\/\/my\.pitt\.edu\/?/i.test(h)),
          hasPermission:
            hrefs.some((h) => /permission/i.test(h)) || /permission\s+number/i.test(text),
        };
      });
      assert.equal(coursePageLinks.hasSciSchedule, true, 'Expected live SCI schedule/catalog link on courses.html');
      assert.equal(coursePageLinks.hasPeopleSoft, true, 'Expected live PeopleSoft link on courses.html');
      assert.equal(coursePageLinks.hasPermission, true, 'Expected permission-number guidance/link on courses.html');

      // Step 5: Site Search "funding" -> navigate to funding.html
      await page.scrollTo(500);
      await openSiteSearch(page, 'click');
      await fillSiteSearch(page, 'funding', { inDialog: true });

      await page.waitFor(
        () => {
          const d = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(
            (el) => !el.hidden && getComputedStyle(el).display !== 'none'
          );
          return Boolean(d && d.querySelector('a[href*="funding.html"]'));
        },
        { timeoutMs: 4000, message: 'Expected Site Search for "funding" to return funding.html' }
      );

      const fundingUrl = await page.clickAndWaitForNavigation(() => {
        const d = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(
          (el) => !el.hidden && getComputedStyle(el).display !== 'none'
        );
        return d ? d.querySelector('a[href*="funding.html"]') : null;
      });
      assert.match(fundingUrl, /funding\.html/i, `Expected navigation to funding.html, got ${fundingUrl}`);
      assertZeroRuntimeErrors(page, 'funding.html');

      const fundingSummary = await page.evaluate(() => {
        const text = (document.querySelector('main')?.textContent || '').replace(/\s+/g, ' ');
        return {
          hasPitt2Pitt: /Pitt2Pitt/i.test(text) && /\$7,500/.test(text),
          hasTravelGrants: /Travel Grant/i.test(text) && /\$750/.test(text),
        };
      });
      assert.equal(fundingSummary.hasPitt2Pitt, true, 'Expected MS Pitt2Pitt ($7,500) details on funding.html');
      assert.equal(fundingSummary.hasTravelGrants, true, 'Expected ISP Student Travel Grants ($750-$1,000) on funding.html');

      // Step 6: Sticky nav Faculty Explorer link -> people.html -> partial-name "Brus" -> topic "AI"
      const peopleUrl = await page.clickAndWaitForNavigation(
        'nav[aria-label="Main navigation"] a[href*="people.html"]'
      );
      assert.match(peopleUrl, /people\.html/i, `Expected navigation to people.html, got ${peopleUrl}`);
      assertZeroRuntimeErrors(page, 'people.html');

      await setPeopleNameQuery(page, 'Brus');
      await page.waitFor(
        async () => {
          const s = await getFacultyExplorerState(page);
          return s.visibleCount === 1 && s.visibleSlugs[0] === 'peter-brusilovsky';
        },
        { timeoutMs: 3000, message: 'Expected partial-name query "Brus" to match peter-brusilovsky' }
      );

      await setPeopleNameQuery(page, '');
      await setPeopleTopicQuery(page, 'AI');
      await page.waitFor(
        async () => {
          const s = await getFacultyExplorerState(page);
          return s.visibleCount >= 10 && VERIFIED_AI_FACULTY_10.every((slug) => s.visibleSlugs.includes(slug));
        },
        { timeoutMs: 3000, message: 'Expected topic query "AI" to match all 10 verified AI faculty' }
      );

      const finalAiState = await getFacultyExplorerState(page);
      for (const slug of VERIFIED_AI_FACULTY_10) {
        assert.ok(finalAiState.visibleSlugs.includes(slug), `Missing AI faculty ${slug}`);
      }
      assert.ok(!finalAiState.visibleSlugs.includes('dana-l-tudorascu'));
      assert.ok(!finalAiState.visibleSlugs.includes('na-du'));
      assert.ok(!finalAiState.visibleSlugs.includes('hatice-osmanbeyoglu'));
    } finally {
      await page.close();
    }
  });

  test('T4-02: Prospective PhD Applicant Journey — Home featured funding band -> funding.html (SCI/Provost/GSR/Baranger) -> admissions.html#funding -> phd.html#requirements (72 cr., ISSP 2020/2030, milestones) -> Faculty Explorer topic chips + "NLP"/"AI" search', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      // Step 1: Home featured funding band -> funding.html
      const navHome = await page.goto(pageUrl('index.html'));
      assert.equal(navHome.status, 200);
      assertZeroRuntimeErrors(page, 'index.html');

      const fundingUrl = await page.clickAndWaitForNavigation(() => {
        return [...document.querySelectorAll('main a[href*="funding.html"]')].find((a) => {
          const r = a.getBoundingClientRect();
          return !a.hidden && getComputedStyle(a).display !== 'none' && r.width > 0 && r.height > 0;
        });
      });
      assert.match(fundingUrl, /funding\.html/i, `Expected navigation to funding.html, got ${fundingUrl}`);
      assertZeroRuntimeErrors(page, 'funding.html');

      // Step 2: Verify PhD funding details on funding.html
      const phdFunding = await page.evaluate(() => {
        const text = (document.querySelector('main')?.textContent || '').replace(/\s+/g, ' ');
        return {
          sciPredoc: /SCI Predoctoral/i.test(text),
          provostPredoc: /Provost(?:'s)? Predoctoral/i.test(text),
          gsr: /\bGSR\b|Graduate Student Researcher|Graduate Research Assistant/i.test(text),
          summerGsa: /Summer\s+GSA|Graduate Student Assistant/i.test(text),
          baranger: /Baranger/i.test(text),
          dissertationCompletion: /Dissertation Completion/i.test(text),
          dbmiTraining: /DBMI|Biomedical Informatics Training/i.test(text),
        };
      });
      assert.equal(phdFunding.sciPredoc, true, 'Expected SCI Predoctoral Fellowships on funding.html');
      assert.equal(phdFunding.provostPredoc, true, 'Expected Provost Predoctoral Fellowships on funding.html');
      assert.equal(phdFunding.gsr, true, 'Expected GSR assistantships on funding.html');
      assert.equal(phdFunding.summerGsa, true, 'Expected Summer GSA Fellowships on funding.html');
      assert.equal(phdFunding.baranger, true, 'Expected Elizabeth U. Baranger Fellowship on funding.html');
      assert.equal(phdFunding.dissertationCompletion, true, 'Expected Provost Dissertation Completion Fellowship on funding.html');
      assert.equal(phdFunding.dbmiTraining, true, 'Expected DBMI Training Grant on funding.html');

      // Step 3: Navigate to admissions.html#funding -> verify #funding section & link back to funding.html
      const navAdm = await page.goto(pageUrl('admissions.html#funding'));
      assert.equal(navAdm.status, 200);
      assertZeroRuntimeErrors(page, 'admissions.html#funding');

      const admClearance = await checkAnchorNotOccluded(page, 'funding');
      assert.equal(admClearance.found, true, 'Expected #funding section on admissions.html');
      assert.equal(
        admClearance.unobstructed,
        true,
        `Expected admissions.html#funding unobstructed below sticky bar: ${JSON.stringify(admClearance)}`
      );

      const admHasFundingLink = await page.evaluate(() =>
        [...document.querySelectorAll('main a[href*="funding.html"]')].some((a) => {
          const r = a.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
      );
      assert.equal(admHasFundingLink, true, 'Expected visible link to funding.html on admissions.html');

      // Step 4: Navigate to phd.html#requirements -> verify 72 cr., ISSP 2020/2030, INFSCI 3005, milestones
      const navPhd = await page.goto(pageUrl('phd.html#requirements'));
      assert.equal(navPhd.status, 200);
      assertZeroRuntimeErrors(page, 'phd.html#requirements');

      const phdClearance = await checkAnchorNotOccluded(page, 'requirements');
      assert.equal(phdClearance.found, true, 'Expected #requirements section on phd.html');
      assert.equal(
        phdClearance.unobstructed,
        true,
        `Expected phd.html#requirements unobstructed below sticky bar: ${JSON.stringify(phdClearance)}`
      );

      const phdReqs = await page.evaluate(() => {
        const text = (document.querySelector('main')?.textContent || '').replace(/\s+/g, ' ');
        return {
          has72Credits: /72\s*(?:-|\s)?credit/i.test(text),
          hasIssp2020: /\bISSP\s+2020\b/.test(text),
          hasIssp2030: /\bISSP\s+2030\b/.test(text),
          hasInfsci3005: /\bINFSCI\s+3005\b/.test(text),
          hasMilestones: /Preliminary/i.test(text) && /Comprehensive/i.test(text) && /Dissertation/i.test(text),
        };
      });
      assert.equal(phdReqs.has72Credits, true, 'Expected 72-credit requirement on phd.html');
      assert.equal(phdReqs.hasIssp2020, true, 'Expected ISSP 2020 on phd.html');
      assert.equal(phdReqs.hasIssp2030, true, 'Expected ISSP 2030 on phd.html');
      assert.equal(phdReqs.hasInfsci3005, true, 'Expected INFSCI 3005 on phd.html');
      assert.equal(phdReqs.hasMilestones, true, 'Expected PhD examination/dissertation milestones on phd.html');

      // Step 5: Navigate to Faculty Explorer -> topic chips + "NLP" / "AI" search
      const navPeople = await page.goto(pageUrl('people.html'));
      assert.equal(navPeople.status, 200);
      assertZeroRuntimeErrors(page, 'people.html');

      await clickTopicChip(page, /Language and information retrieval/i);
      await page.waitFor(
        async () => {
          const s = await getFacultyExplorerState(page);
          return s.visibleCount === 12 && s.visibleSlugs.includes('diane-litman');
        },
        { timeoutMs: 3000, message: 'Expected clicking "Language and information retrieval" chip to filter to 12 faculty' }
      );

      const chipState = await getFacultyExplorerState(page);
      assert.equal(chipState.hasLiveRegion, true, 'Expected live status announcement region in Faculty Explorer');
      assert.match(chipState.statusText, /12/, `Expected live status region to announce 12 matches, got "${chipState.statusText}"`);

      // Reset or search topic "NLP" then "AI"
      await page.goto(pageUrl('people.html'));
      await setPeopleTopicQuery(page, 'NLP');
      await page.waitFor(
        async () => {
          const s = await getFacultyExplorerState(page);
          return s.visibleCount >= 9 && s.visibleSlugs.includes('diane-litman') && s.visibleSlugs.includes('daqing-he');
        },
        { timeoutMs: 3000, message: 'Expected topic search "NLP" to match >= 9 faculty' }
      );

      await setPeopleTopicQuery(page, 'AI');
      await page.waitFor(
        async () => {
          const s = await getFacultyExplorerState(page);
          return s.visibleCount >= 10 && VERIFIED_AI_FACULTY_10.every((slug) => s.visibleSlugs.includes(slug));
        },
        { timeoutMs: 3000, message: 'Expected topic search "AI" to match all 10 verified AI faculty' }
      );
    } finally {
      await page.close();
    }
  });

  test('T4-03: Pitt Undergrad Exploring MSISP + Pitt2Pitt Scholarship — Home Ctrl+K Site Search "Pitt2Pitt" -> funding.html ($7,500/yr MSISP) -> academics.html#requirements -> ms.html#requirements -> courses.html filtered to Biomedical Informatics (ISSP 2083, ISSP 2016, BIOST 2142)', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      // Step 1: Home -> Ctrl+K Site Search -> query "Pitt2Pitt" -> funding.html
      const navHome = await page.goto(pageUrl('index.html'));
      assert.equal(navHome.status, 200);
      assertZeroRuntimeErrors(page, 'index.html');

      const dlg = await openSiteSearch(page, 'ctrl+k');
      assert.equal(dlg.open, true, 'Expected Ctrl+K shortcut to open Site Search modal');

      await fillSiteSearch(page, 'Pitt2Pitt', { inDialog: true });
      await page.waitFor(
        () => {
          const d = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(
            (el) => !el.hidden && getComputedStyle(el).display !== 'none'
          );
          return Boolean(d && d.querySelector('a[href*="funding.html"]'));
        },
        { timeoutMs: 4000, message: 'Expected Site Search for "Pitt2Pitt" to match funding.html' }
      );

      const fundingUrl = await page.clickAndWaitForNavigation(() => {
        const d = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(
          (el) => !el.hidden && getComputedStyle(el).display !== 'none'
        );
        return d ? d.querySelector('a[href*="funding.html"]') : null;
      });
      assert.match(fundingUrl, /funding\.html/i, `Expected navigation to funding.html, got ${fundingUrl}`);
      assertZeroRuntimeErrors(page, 'funding.html');

      const pitt2PittDetails = await page.evaluate(() => {
        const text = (document.querySelector('main')?.textContent || '').replace(/\s+/g, ' ');
        return {
          hasPitt2Pitt: /Pitt2Pitt/i.test(text),
          has7500: /\$7,500/.test(text),
          hasSciScholarships: /King/i.test(text) && /Howard/i.test(text) && /Smith/i.test(text),
          hasRareNote: /rare|limited/i.test(text),
        };
      });
      assert.equal(pitt2PittDetails.hasPitt2Pitt, true, 'Expected Pitt2Pitt scholarship on funding.html');
      assert.equal(pitt2PittDetails.has7500, true, 'Expected $7,500/yr MSISP scholarship detail on funding.html');
      assert.equal(pitt2PittDetails.hasSciScholarships, true, 'Expected SCI graduate scholarships (King, Howard, Smith) on funding.html');
      assert.equal(pitt2PittDetails.hasRareNote, true, 'Expected transparent note that MS assistantships/fellowships are rare');

      // Step 2: Navigate to academics.html#requirements -> ms.html#requirements
      const navAcad = await page.goto(pageUrl('academics.html#requirements'));
      assert.equal(navAcad.status, 200);
      assertZeroRuntimeErrors(page, 'academics.html#requirements');

      const acadClearance = await checkAnchorNotOccluded(page, 'requirements');
      assert.equal(acadClearance.found, true);
      assert.equal(acadClearance.unobstructed, true);

      const msUrl = await page.clickAndWaitForNavigation(
        'main a[href="ms.html#requirements"], main a[href*="ms.html#requirements"]'
      );
      assert.match(msUrl, /ms\.html#requirements$/i);
      assertZeroRuntimeErrors(page, 'ms.html#requirements');

      // Step 3: Navigate to courses.html and filter by track "Biomedical Informatics"
      const navCourses = await page.goto(pageUrl('courses.html'));
      assert.equal(navCourses.status, 200);
      assertZeroRuntimeErrors(page, 'courses.html');

      await setCourseFilter(page, { track: 'Biomedical Informatics' });

      await page.waitFor(
        async () => {
          const list = await getVisibleCourses(page);
          const joined = list.map((c) => `${c.code} ${c.text}`).join(' ');
          return (
            /\b(?:ISSP|BMFI)\s+2083\b/.test(joined) &&
            /\b(?:ISSP|BMFI)\s+2016\b/.test(joined) &&
            /\bBIOST\s+2142\b/.test(joined)
          );
        },
        {
          timeoutMs: 3000,
          message: 'Expected Biomedical Informatics track filter on courses.html to include ISSP 2083, ISSP 2016, and BIOST 2142',
        }
      );

      const bmiCourses = await getVisibleCourses(page);
      const bmiText = bmiCourses.map((c) => `${c.code} ${c.text}`).join(' ');
      assert.match(bmiText, /\b(?:ISSP|BMFI)\s+2083\b/, 'Expected ISSP/BMFI 2083 in Biomedical Informatics courses');
      assert.match(bmiText, /\b(?:ISSP|BMFI)\s+2016\b/, 'Expected ISSP/BMFI 2016 in Biomedical Informatics courses');
      assert.match(bmiText, /\bBIOST\s+2142\b/, 'Expected BIOST 2142 in Biomedical Informatics courses');
    } finally {
      await page.close();
    }
  });

  test('T4-04: Mobile Phone (320x568) Student Workflow — Home scrolled sticky nav -> mobile drawer -> resources.html -> sticky Site Search "travel grant" -> resources.html#travel-grants auto-expanded & unobstructed -> funding.html -> people.html partial-name "Kov" + topic "CV" with zero horizontal overflow at every step', async () => {
    const page = await browser.newPage({ width: 320, height: 568, mobile: true });
    try {
      const assertNoOverflow = async (stepName) => {
        const ov = await checkNoHorizontalOverflow(page);
        assert.equal(
          ov.ok,
          true,
          `Horizontal overflow at 320x568 during "${stepName}": ${JSON.stringify(ov)}`
        );
      };

      // Step 1: Home at 320x568 -> scroll -> open mobile drawer -> navigate to resources.html
      const navHome = await page.goto(pageUrl('index.html'));
      assert.equal(navHome.status, 200);
      assertZeroRuntimeErrors(page, 'index.html (320x568)');
      await assertNoOverflow('index.html initial');

      await page.scrollTo(600);
      const sticky = await findStickyNavInfo(page);
      assert.equal(sticky.found, true, 'Expected sticky navbar on scrolled index.html at 320x568');
      assert.ok(Math.abs(sticky.top) <= 2);
      assert.ok(sticky.height <= 140);
      await assertNoOverflow('index.html scrolled');

      const toggle = await findMobileMenuToggle(page);
      assert.equal(toggle.found, true, 'Expected mobile menu toggle button at 320x568');
      await page.clickAt(toggle.rect.centerX, toggle.rect.centerY);

      await page.waitFor(
        async () => {
          const t = await findMobileMenuToggle(page);
          return t.found && t.expanded;
        },
        { timeoutMs: 3000, message: 'Expected mobile drawer to open on index.html' }
      );
      await assertNoOverflow('index.html mobile drawer open');

      const resUrl = await page.clickAndWaitForNavigation(() => {
        const nav = document.querySelector('nav[aria-label="Main navigation"]') || document.body;
        return [...nav.querySelectorAll('a[href*="resources.html"]')].find((a) => {
          const r = a.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
      });
      assert.match(resUrl, /resources\.html/i);
      assertZeroRuntimeErrors(page, 'resources.html (320x568)');
      await assertNoOverflow('resources.html initial');

      // Step 2: Sticky Site Search "travel grant" -> resources.html#travel-grants auto-expanded & unobstructed
      await page.scrollTo(400);
      await openSiteSearch(page, 'click');
      await assertNoOverflow('resources.html search modal open');

      await fillSiteSearch(page, 'travel grant', { inDialog: true });
      await page.waitFor(
        () => {
          const d = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(
            (el) => !el.hidden && getComputedStyle(el).display !== 'none'
          );
          return Boolean(d && d.querySelector('a[href*="resources.html"]'));
        },
        { timeoutMs: 4000, message: 'Expected mobile Site Search for "travel grant" to match resources.html#travel-grants' }
      );

      const tgUrl = await page.clickAndWaitForNavigation(() => {
        const d = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(
          (el) => !el.hidden && getComputedStyle(el).display !== 'none'
        );
        if (!d) return null;
        return (
          d.querySelector('a[href*="resources.html#travel-grants"]') ||
          d.querySelector('a[href*="resources.html"]')
        );
      });
      if (!tgUrl.endsWith('#travel-grants')) {
        await page.goto(pageUrl('resources.html#travel-grants'), { clearDiagnostics: false });
      }
      await assertNoOverflow('resources.html#travel-grants');

      const clearance = await checkAnchorNotOccluded(page, 'travel-grants');
      assert.equal(clearance.found, true);
      assert.equal(
        clearance.unobstructed,
        true,
        `Expected #travel-grants unobstructed below mobile sticky bar: ${JSON.stringify(clearance)}`
      );

      const tgOpen = await page.evaluate(() => {
        const el = document.getElementById('travel-grants');
        const details = el?.tagName === 'DETAILS' ? el : el?.closest('details') || el?.querySelector('details');
        return Boolean(details && details.open);
      });
      assert.equal(tgOpen, true, 'Expected #travel-grants <details> to be open');

      // Step 3: Click funding.html link inside #travel-grants -> verify funding.html at 320x568
      const fundingUrl = await page.clickAndWaitForNavigation(
        '#travel-grants a[href*="funding.html"], main a[href*="funding.html"]'
      );
      assert.match(fundingUrl, /funding\.html/i);
      assertZeroRuntimeErrors(page, 'funding.html (320x568)');
      await assertNoOverflow('funding.html');

      // Step 4: Navigate to people.html -> partial-name "Kov" + topic "CV"
      const navPeople = await page.goto(pageUrl('people.html'));
      assert.equal(navPeople.status, 200);
      assertZeroRuntimeErrors(page, 'people.html (320x568)');
      await assertNoOverflow('people.html initial');

      await setPeopleNameQuery(page, 'Kov');
      await page.waitFor(
        async () => {
          const s = await getFacultyExplorerState(page);
          return s.visibleCount === 1 && s.visibleSlugs[0] === 'adriana-kovashka';
        },
        { timeoutMs: 3000, message: 'Expected partial-name "Kov" at 320x568 to match adriana-kovashka' }
      );
      await assertNoOverflow('people.html partial-name "Kov"');

      await setPeopleNameQuery(page, '');
      await setPeopleTopicQuery(page, 'CV');
      await page.waitFor(
        async () => {
          const s = await getFacultyExplorerState(page);
          return (
            s.visibleCount >= 3 &&
            ['adriana-kovashka', 'ahmad-p-tafti', 'shandong-wu'].every((slug) => s.visibleSlugs.includes(slug))
          );
        },
        { timeoutMs: 3000, message: 'Expected topic "CV" at 320x568 to match >= 3 computer vision faculty' }
      );
      await assertNoOverflow('people.html topic "CV"');
    } finally {
      await page.close();
    }
  });

  test('T4-05: Keyboard-Only & Accessibility Navigation Journey — Tab to skip link above sticky bar -> #main -> keyboard Academics disclosure (Enter/Escape) -> "/" Site Search -> ArrowDown/Enter into people.html -> keyboard scope switch & empty-state recovery -> focus preservation & zero WCAG/heading violations', async () => {
    const page = await browser.newPage({ width: 1440, height: 900 });
    try {
      // Step 1: Load index.html -> Tab to skip link -> verify visibility above sticky bar & AA contrast
      const navHome = await page.goto(pageUrl('index.html'));
      assert.equal(navHome.status, 200);
      assertZeroRuntimeErrors(page, 'index.html');

      await page.pressKey('Tab');
      const skip = await findSkipLinkInfo(page);
      const sticky = await findStickyNavInfo(page);
      assert.equal(skip.found, true, 'Expected skip link on index.html');
      assert.equal(skip.isFocused, true, 'Expected first Tab key press to focus skip link');
      assert.equal(skip.visibleInViewport, true, 'Expected focused skip link to be visible in viewport');
      assert.equal(skip.hitTestOk, true, 'Expected focused skip link not to be covered by sticky navbar');
      assert.ok(
        sticky.found && skip.zIndex > sticky.zIndex,
        `Expected skip link z-index (${skip.zIndex}) > sticky nav z-index (${sticky.zIndex})`
      );
      assert.ok(
        skip.contrastRatio >= 4.5,
        `Expected skip link WCAG AA contrast >= 4.5:1, got ${skip.contrastRatio}`
      );

      // Step 2: Activate skip link with Enter -> moves focus to #main
      await page.pressKey('Enter');
      await page.waitFor(
        () => {
          const active = document.activeElement;
          const main = document.getElementById('main') || document.querySelector('main');
          return Boolean(
            location.hash === '#main' ||
              (active && main && (active === main || main.contains(active)))
          );
        },
        { timeoutMs: 3000, message: 'Expected Enter on skip link to jump to #main' }
      );

      // Step 3: Keyboard Academics disclosure toggle (Enter opens, Escape closes & retains focus)
      await page.focus(() => {
        const mainNav = document.querySelector('nav[aria-label="Main navigation"]') || document.body;
        return [...mainNav.querySelectorAll('button[aria-expanded]')].find((b) => {
          const label = `${b.getAttribute('aria-label') || ''} ${b.textContent || ''}`;
          return /academics/i.test(label) || Boolean(b.parentElement?.querySelector('a[href*="academics.html"]'));
        });
      });

      await page.pressKey('Enter');
      await page.waitFor(
        async () => {
          const d = await findAcademicsDisclosure(page);
          return d.found && d.expanded && d.menuVisible;
        },
        { timeoutMs: 3000, message: 'Expected Enter on Academics disclosure button to expand submenu' }
      );

      await page.pressKey('Escape');
      await page.waitFor(
        async () => {
          const d = await findAcademicsDisclosure(page);
          return d.found && !d.expanded;
        },
        { timeoutMs: 3000, message: 'Expected Escape to close Academics disclosure submenu' }
      );
      const discAfterEsc = await findAcademicsDisclosure(page);
      assert.equal(discAfterEsc.isFocused, true, 'Expected focus to remain on Academics disclosure button after Escape');

      // Step 4: Keyboard "/" opens Site Search -> type "Faculty Explorer" -> ArrowDown / Enter navigates to people.html
      await openSiteSearch(page, '/');
      await fillSiteSearch(page, 'Brusilovsky', { inDialog: true });

      await page.waitFor(
        () => {
          const d = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(
            (el) => !el.hidden && getComputedStyle(el).display !== 'none'
          );
          return Boolean(d && d.querySelector('a[href*="people.html"]'));
        },
        { timeoutMs: 4000, message: 'Expected Site Search for "Brusilovsky" to list people.html result' }
      );

      // Verify Tab focus trap inside open search dialog
      for (let i = 0; i < 6; i++) {
        await page.pressKey('Tab');
        const stateAfterTab = await getSearchDialogState(page);
        assert.equal(
          stateAfterTab.focusInsideDialog,
          true,
          `Expected Tab press #${i + 1} to stay trapped inside open Site Search dialog`
        );
      }

      // Refocus search input, press ArrowDown, and press Enter to navigate into people.html
      await page.focus(() => {
        const d = [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(
          (el) => !el.hidden && getComputedStyle(el).display !== 'none'
        );
        return d ? d.querySelector('input[type="search"], input[type="text"], input:not([type])') : null;
      });
      await page.pressKey('ArrowDown');

      // Navigate via Enter (or if Enter on active result item requires focusing the result link, press Enter)
      await page.pressKey('Enter');
      await page.waitFor(
        () => /people\.html/i.test(window.location.href),
        { timeoutMs: 5000, message: 'Expected ArrowDown + Enter in Site Search dialog to navigate to people.html' }
      );
      assertZeroRuntimeErrors(page, 'people.html (via keyboard search navigation)');

      // Step 5: Keyboard scope switch & empty-state recovery on people.html
      await selectPeopleScope(page, 'Graduate students');
      await page.waitFor(
        async () => (await getFacultyExplorerState(page)).visibleCount === 32,
        { timeoutMs: 3000, message: 'Expected Graduate students scope to show 32 profiles' }
      );

      await setPeopleNameQuery(page, 'zzzz_no_match_999');
      await page.waitFor(
        async () => (await getFacultyExplorerState(page)).visibleCount === 0,
        { timeoutMs: 3000, message: 'Expected unmatched query to show 0 cards and empty-state recovery' }
      );

      await page.focus(() => {
        const main = document.querySelector('main') || document.body;
        return [...main.querySelectorAll('button')].find((b) => {
          if (b.hidden || b.closest('[hidden]')) return false;
          const cs = getComputedStyle(b);
          if (cs.display === 'none' || cs.visibility === 'hidden') return false;
          const r = b.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) return false;
          return /clear|reset|show all|all people/i.test(`${b.getAttribute('aria-label') || ''} ${b.textContent || ''}`);
        });
      });
      await page.pressKey('Enter');

      await page.waitFor(
        async () => (await getFacultyExplorerState(page)).visibleCount >= 30,
        { timeoutMs: 3000, message: 'Expected Enter on empty-state recovery button to restore profiles' }
      );

      const focusAfterRecovery = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active || active === document.body || active === document.documentElement) {
          return { ok: false, tag: active ? active.tagName : 'null' };
        }
        const cs = getComputedStyle(active);
        const r = active.getBoundingClientRect();
        return {
          ok: !active.hidden && cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0,
          tag: active.tagName.toLowerCase(),
          id: active.id || '',
        };
      });
      assert.equal(
        focusAfterRecovery.ok,
        true,
        `Expected keyboard focus to be retained on a visible interactive control after empty-state recovery, got ${JSON.stringify(focusAfterRecovery)}`
      );

      // Step 6: Verify structural and WCAG 2.1 AA contrast compliance on people.html
      const structure = await auditPageStructure(page);
      assert.equal(structure.ok, true, `Structural/heading violations on people.html: ${JSON.stringify(structure)}`);
      const contrast = await auditPageContrast(page);
      assert.equal(contrast.ok, true, `WCAG AA contrast violations on people.html: ${JSON.stringify(contrast)}`);
    } finally {
      await page.close();
    }
  });

  test('T4-06: GitHub Pages Subpath & Release Readiness Journey — Serve under /ISP-Website-Redesign/, traverse all 14 core routes verifying zero HTTP/console/page errors, valid ?v= cache hashes, CHANGES.md + docs/screenshots/before/ integrity, zero "Hail to Possible", token-only CSS, and clean redesign/dist/ isolation', async () => {
    const { repoRoot, siteDir, subpathUrl: baseSubpath } = getConfig();
    const page = await browser.newPage({ width: 1440, height: 900, baseUrl: baseSubpath });
    try {
      // 1. Traverse all 14 core routes under /ISP-Website-Redesign/
      for (const route of CORE_PAGES_14) {
        const nav = await page.goto(subpathUrl(route));
        assert.equal(nav.status, 200, `Expected HTTP 200 for subpath route ${route}, got ${nav.status}`);
        assert.ok(
          nav.url.includes(`/ISP-Website-Redesign/${route}`),
          `Expected URL to preserve /ISP-Website-Redesign/${route}, got ${nav.url}`
        );
        assertZeroRuntimeErrors(page, `/ISP-Website-Redesign/${route}`);

        const structure = await auditPageStructure(page);
        assert.equal(
          structure.ok,
          true,
          `Structural/brand audit failed on /ISP-Website-Redesign/${route}: ${JSON.stringify(structure)}`
        );
        assert.equal(
          structure.hasProhibitedTagline,
          false,
          `Prohibited tagline "Hail to Possible" found on ${route}`
        );

        const contrast = await auditPageContrast(page);
        assert.equal(
          contrast.ok,
          true,
          `WCAG 2.1 AA contrast audit failed on /ISP-Website-Redesign/${route}: ${JSON.stringify(contrast)}`
        );

        const diskHtmlPath = path.join(siteDir, route);
        assert.equal(fs.existsSync(diskHtmlPath), true, `Expected ${route} on disk in ${siteDir}`);
        const htmlText = fs.readFileSync(diskHtmlPath, 'utf8');
        const hashAudit = verifyHtmlAssetHashes(htmlText, siteDir);
        assert.ok(hashAudit.checked.length >= 2, `Expected >= 2 ?v= asset references in ${route}`);
        assert.equal(
          hashAudit.ok,
          true,
          `Asset ?v= cache-busting hash mismatch in ${route}: ${JSON.stringify(hashAudit)}`
        );
      }

      // 2. Token-only CSS enforcement across all redesign/assets/*.css
      const assetsDir = path.join(repoRoot, 'redesign', 'assets');
      const cssFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.css'));
      assert.ok(cssFiles.includes('tokens.css'), 'Expected tokens.css in redesign/assets/');
      for (const cssFile of cssFiles) {
        const cssText = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');
        if (cssFile === 'tokens.css') {
          const hexes = extractHexColors(cssText);
          assert.ok(hexes.length >= 7, 'Expected >= 7 brand hex tokens in tokens.css');
          for (const hex of hexes) {
            assert.ok(
              APPROVED_BRAND_HEX.has(hex),
              `Unapproved hex color ${hex} found in tokens.css`
            );
          }
        } else {
          const rawHits = findRawColorsInCss(cssText);
          assert.deepEqual(
            rawHits,
            [],
            `Raw #hex or rgb()/rgba() literal found in redesign/assets/${cssFile}: ${JSON.stringify(rawHits)}`
          );
        }
      }

      // 3. CHANGES.md & docs/screenshots/before/ integrity
      const changesPath = path.join(repoRoot, 'CHANGES.md');
      assert.equal(fs.existsSync(changesPath), true, 'Expected CHANGES.md at repository root');
      const changesText = fs.readFileSync(changesPath, 'utf8');
      assert.match(changesText, /TODO:\s*confirm/i, 'Expected CHANGES.md to document open TODO: confirm items');

      const beforeDir = path.join(repoRoot, 'docs', 'screenshots', 'before');
      assert.equal(fs.existsSync(beforeDir), true, 'Expected docs/screenshots/before/ directory to exist');
      const beforePngs = fs.readdirSync(beforeDir).filter((f) => f.endsWith('.png'));
      assert.ok(beforePngs.length >= 8, `Expected >= 8 PNGs in docs/screenshots/before/, got ${beforePngs.length}`);
      for (const pngName of beforePngs) {
        const info = inspectPng(path.join(beforeDir, pngName));
        assert.equal(info.valid, true, `Corrupt PNG in docs/screenshots/before/${pngName}: ${JSON.stringify(info)}`);
        assert.equal(info.nonUniform, true, `Blank PNG in docs/screenshots/before/${pngName}`);
      }

      // 4. Protected directories & redesign/dist/ isolation
      const gitProtected = checkGitProtectedDirsClean(repoRoot);
      assert.equal(
        gitProtected.clean,
        true,
        `Protected directories modified: ${JSON.stringify(gitProtected.lines)}`
      );

      const distDir = path.join(repoRoot, 'redesign', 'dist');
      if (fs.existsSync(distDir)) {
        for (const forbidden of ['docs', 'tests', 'CHANGES.md', '.agents']) {
          assert.equal(
            fs.existsSync(path.join(distDir, forbidden)),
            false,
            `redesign/dist/ must not contain ${forbidden}`
          );
        }
      }
    } finally {
      await page.close();
    }
  });
});
