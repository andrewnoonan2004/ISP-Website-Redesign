/**
 * Harness Self-Check Suite (self_check.test.mjs)
 *
 * Verifies the zero-dependency E2E runtime stack end-to-end:
 * - Dual-mount static HTTP server (/ and /ISP-Website-Redesign/)
 * - Isolated headless Chromium 156 CDP targets & sessions
 * - Desktop (1440x900) and mobile (320x568) viewport emulation
 * - Reduced-motion and JavaScript-disabled (<noscript>) emulation
 * - Real CDP keyboard/mouse/text input, same-document hash navigation, scrolling
 * - Opaque-box structural, overflow, WCAG 2.1 AA contrast, PNG, CSS, SHA-256 & git helpers
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import zlib from 'node:zlib';

import { connectBrowser } from './lib/cdp.mjs';
import {
  APPROVED_BRAND_HEX,
  auditPageContrast,
  auditPageStructure,
  checkGitProtectedDirsClean,
  checkNoHorizontalOverflow,
  contrastRatio,
  extractHexColors,
  findMobileMenuToggle,
  findRawColorsInCss,
  findSkipLinkInfo,
  getConfig,
  getFacultyExplorerState,
  inspectPng,
  inspectPngBuffer,
  pageUrl,
  selectPeopleScope,
  sha256Hex12,
  subpathUrl,
  verifyHtmlAssetHashes,
  withPage,
} from './lib/helpers.mjs';

function buildSolidRgbPng(width, height, r, g, b) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const makeChunk = (type, data) => {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcInput = Buffer.concat([typeBuf, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(zlib.crc32(crcInput) >>> 0, 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // standard filter
  ihdr[12] = 0; // no interlace

  const stride = width * 3;
  const raw = Buffer.alloc(height * (1 + stride));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + stride);
    raw[rowStart] = 0; // filter None
    for (let x = 0; x < width; x++) {
      raw[rowStart + 1 + x * 3] = r;
      raw[rowStart + 1 + x * 3 + 1] = g;
      raw[rowStart + 1 + x * 3 + 2] = b;
    }
  }
  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

describe('Harness Self-Check', () => {
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

  test('SC-01: Root / static server serves index.html HTTP 200 with zero local failures or JS errors', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      const nav = await page.goto(pageUrl('index.html'));
      assert.equal(nav.status, 200, 'Expected HTTP 200 for /index.html');
      assert.equal(page.localFailedRequests.length, 0, `Unexpected local failures: ${JSON.stringify(page.localFailedRequests)}`);
      assert.equal(page.pageErrors.length, 0, `Unexpected JS page errors: ${JSON.stringify(page.pageErrors)}`);
      assert.equal(page.consoleErrors.length, 0, `Unexpected console errors: ${JSON.stringify(page.consoleErrors)}`);

      const h1Text = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim() || '');
      assert.ok(h1Text.length > 0, 'Expected non-empty <h1> on index.html');
    });
  });

  test('SC-02: Subpath /ISP-Website-Redesign/ serves index.html and all local relative assets HTTP 200', async () => {
    await withPage(browser, { width: 1440, height: 900, baseUrl: getConfig().subpathUrl }, async (page) => {
      const nav = await page.goto(subpathUrl('index.html'));
      assert.equal(nav.status, 200, 'Expected HTTP 200 for /ISP-Website-Redesign/index.html');
      assert.ok(
        nav.url.includes('/ISP-Website-Redesign/index.html'),
        `Expected subpath URL, got ${nav.url}`
      );

      const localAssets = page.responses.filter(
        (r) => r.isLocal && r.url.includes('/ISP-Website-Redesign/assets/')
      );
      assert.ok(localAssets.length >= 2, `Expected >=2 subpath asset responses, got ${localAssets.length}`);
      for (const resp of localAssets) {
        assert.equal(resp.status, 200, `Expected HTTP 200 for subpath asset ${resp.url}, got ${resp.status}`);
      }
      assert.equal(page.localFailedRequests.length, 0, `Unexpected subpath local failures: ${JSON.stringify(page.localFailedRequests)}`);
      assert.equal(page.pageErrors.length, 0, `Unexpected subpath JS errors: ${JSON.stringify(page.pageErrors)}`);
    });
  });

  test('SC-03: Viewport emulation applies accurate desktop (1440x900) and mobile (320x568) metrics', async () => {
    await withPage(browser, { width: 1440, height: 900, mobile: false }, async (page) => {
      await page.goto('index.html');
      const desktop = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        clientWidth: document.documentElement.clientWidth,
      }));
      assert.equal(desktop.innerWidth, 1440);
      assert.equal(desktop.innerHeight, 900);
      assert.ok(desktop.clientWidth >= 1420 && desktop.clientWidth <= 1440);

      await page.setViewport(320, 568, { mobile: true });
      const mobile = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        clientWidth: document.documentElement.clientWidth,
      }));
      assert.equal(mobile.innerWidth, 320);
      assert.equal(mobile.innerHeight, 568);
      assert.equal(mobile.clientWidth, 320, 'Mobile emulation should use overlay scrollbar (clientWidth === 320)');

      const menuToggle = await findMobileMenuToggle(page);
      assert.equal(menuToggle.found, true, 'Mobile menu toggle button should be visible at 320x568');
    });
  });

  test('SC-04: setReducedMotion toggles matchMedia prefers-reduced-motion cleanly true <-> false', async () => {
    await withPage(browser, { width: 1440, height: 900, reducedMotion: true }, async (page) => {
      await page.goto('index.html');
      const initial = await page.evaluate(
        () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
      assert.equal(initial, true, 'Expected prefers-reduced-motion: reduce to match when enabled');

      await page.setReducedMotion(false);
      const afterOff = await page.evaluate(
        () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
      assert.equal(afterOff, false, 'Expected prefers-reduced-motion: reduce to be false after disabling');

      await page.setReducedMotion(true);
      const afterOn = await page.evaluate(
        () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
      assert.equal(afterOn, true, 'Expected prefers-reduced-motion: reduce to re-enable cleanly');
    });
  });

  test('SC-05: setJavaScriptEnabled(false) before navigation renders all 190 cards and parses <noscript>', async () => {
    await withPage(browser, { width: 1440, height: 900, javascriptEnabled: false }, async (page) => {
      const nav = await page.goto('people.html');
      assert.equal(nav.status, 200);

      const noJsState = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('[id^="person-"]')];
        const unhidden = cards.filter((c) => !c.hidden && getComputedStyle(c).display !== 'none');
        const noscriptParagraph = document.querySelector('noscript p');
        return {
          totalCards: cards.length,
          unhiddenCards: unhidden.length,
          hasNoscriptChild: Boolean(noscriptParagraph),
          noscriptText: noscriptParagraph ? noscriptParagraph.textContent.trim() : '',
        };
      });

      assert.equal(noJsState.totalCards, 190, 'Expected 190 total person cards in people.html');
      assert.equal(noJsState.unhiddenCards, 190, 'Expected all 190 cards visible when JS is disabled');
      assert.equal(noJsState.hasNoscriptChild, true, 'Expected <noscript> child DOM to parse when JS is disabled');
      assert.ok(noJsState.noscriptText.length > 10, 'Expected readable <noscript> guidance text');
    });
  });

  test('SC-06: Real CDP keyboard interaction (Tab, Input.insertText, Ctrl+A+Backspace, /, Escape) works on live DOM', async () => {
    // 1. Tab focuses the skip link on index.html
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      await page.goto('index.html');
      await page.pressKey('Tab');
      const skip = await findSkipLinkInfo(page);
      assert.equal(skip.found, true, 'Skip link should exist on index.html');
      assert.equal(skip.isFocused, true, 'First Tab press should focus skip link');
      assert.equal(skip.visibleInViewport, true, 'Focused skip link should be visible in viewport');
    });

    // 2. Real text typing, clearing, '/', and Escape on people.html
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      await page.goto('people.html');

      const inputReady = await page.evaluate(() => {
        const input =
          document.getElementById('people-name') ||
          document.getElementById('people-search') ||
          document.querySelector('main input[type="search"], main input[type="text"]');
        if (!input) return false;
        window.__e2eEscapeCount = 0;
        window.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') window.__e2eEscapeCount += 1;
        });
        input.focus();
        return document.activeElement === input;
      });
      assert.equal(inputReady, true, 'Expected a focusable search/name input on people.html');

      await page.typeText('Brus');
      await page.waitFor(
        () =>
          [...document.querySelectorAll('[id^="person-"]')].filter(
            (c) => !c.hidden && getComputedStyle(c).display !== 'none'
          ).length === 1,
        { timeoutMs: 3000, message: 'Typing "Brus" should filter people.html down to 1 card' }
      );

      await page.pressKey('a', { ctrl: true });
      await page.pressKey('Backspace');
      await page.waitFor(
        () =>
          [...document.querySelectorAll('[id^="person-"]')].filter(
            (c) => !c.hidden && getComputedStyle(c).display !== 'none'
          ).length === 30,
        { timeoutMs: 3000, message: 'Ctrl+A + Backspace should restore all 30 default Faculty cards' }
      );

      await page.pressKey('/');
      const valAfterSlash = await page.evaluate(() => document.activeElement?.value ?? '');
      assert.equal(valAfterSlash, '/', 'Pressing "/" inside focused text input should insert "/"');

      await page.pressKey('Escape');
      const escapeCount = await page.evaluate(() => window.__e2eEscapeCount);
      assert.ok(escapeCount >= 1, 'Pressing Escape should dispatch a real Escape keydown event');
    });
  });

  test('SC-07: Same-document hash navigation (index.html -> index.html#main) resolves promptly without hanging', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      await page.goto('index.html');
      const start = Date.now();
      const hashNav = await page.goto('index.html#main', { clearDiagnostics: false });
      const elapsed = Date.now() - start;

      assert.ok(hashNav.url.endsWith('#main'), `Expected URL ending in #main, got ${hashNav.url}`);
      assert.ok(elapsed < 3000, `Same-document hash navigation took too long (${elapsed}ms)`);
      assert.equal(await page.getUrl(), hashNav.url);
    });
  });

  test('SC-08: scrollTo(600) and structural/overflow/contrast audits return valid results on index.html', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      await page.goto('index.html');

      const y = await page.scrollTo(600);
      assert.ok(y > 0, `Expected window.scrollY > 0 after scrollTo(600), got ${y}`);
      await page.scrollTo(0);

      const overflow = await checkNoHorizontalOverflow(page);
      assert.equal(overflow.ok, true, `Unexpected horizontal overflow on index.html: ${JSON.stringify(overflow)}`);

      const structure = await auditPageStructure(page);
      assert.equal(structure.h1Count, 1);
      assert.equal(structure.mainCount, 1);
      assert.equal(structure.headingOrderOk, true, `Heading violations: ${JSON.stringify(structure.headingViolations)}`);
      assert.equal(structure.duplicateIds.length, 0, `Duplicate IDs: ${JSON.stringify(structure.duplicateIds)}`);
      assert.equal(structure.imagesWithoutAlt.length, 0);
      assert.equal(structure.typography.bodyUsesInstrumentSerif, false);
      assert.equal(structure.accentsOk, true);
      assert.equal(structure.hasProhibitedTagline, false);

      const contrast = await auditPageContrast(page);
      assert.ok(contrast.checkedCount >= 15, `Expected >= 15 audited text nodes, got ${contrast.checkedCount}`);
      assert.equal(contrast.ok, true, `Contrast violations on index.html: ${JSON.stringify(contrast)}`);
    });
  });

  test('SC-09: inspectPng validates real repo PNG, flags uniform solid PNG, and rejects corrupt/truncated PNGs', async () => {
    const { repoRoot } = getConfig();
    const shieldPath = path.join(repoRoot, 'Design Assets', 'Pitt Shield Pattern', 'pitt-shield-pattern.png');
    const realInfo = inspectPng(shieldPath);
    assert.equal(realInfo.valid, true, `Expected valid PNG: ${JSON.stringify(realInfo)}`);
    assert.equal(realInfo.width, 1500);
    assert.equal(realInfo.height, 1500);
    assert.equal(realInfo.nonUniform, true);
    assert.ok(realInfo.idatCount >= 1);

    // Valid solid white PNG should parse as valid: true, nonUniform: false
    const solidPng = buildSolidRgbPng(8, 8, 255, 255, 255);
    const solidInfo = inspectPngBuffer(solidPng);
    assert.equal(solidInfo.valid, true, `Synthetic solid PNG should be valid: ${JSON.stringify(solidInfo)}`);
    assert.equal(solidInfo.width, 8);
    assert.equal(solidInfo.height, 8);
    assert.equal(solidInfo.nonUniform, false, 'Solid white PNG must report nonUniform: false');
    assert.equal(solidInfo.distinctColors, 1);

    // Corrupt CRC & truncated PNG via temp file (cleaned up in finally)
    const corruptBuf = Buffer.from(solidPng);
    corruptBuf[corruptBuf.length - 1] ^= 0xff; // Flip CRC byte on IEND
    const corruptInfo = inspectPngBuffer(corruptBuf);
    assert.equal(corruptInfo.valid, false, 'Flipped CRC byte must fail inspectPngBuffer');

    const tmpCorruptPath = path.join(
      os.tmpdir(),
      `isp_e2e_corrupt_${process.pid}_${Date.now()}.png`
    );
    try {
      fs.writeFileSync(tmpCorruptPath, solidPng.subarray(0, 24)); // Truncated mid-IHDR
      const truncInfo = inspectPng(tmpCorruptPath);
      assert.equal(truncInfo.valid, false, 'Truncated PNG file must fail inspectPng');
    } finally {
      fs.rmSync(tmpCorruptPath, { force: true });
    }
  });

  test('SC-10: WCAG contrast math, CSS raw-color scanner, SHA-256 digest & git protected-dir checks are accurate', () => {
    const royalOnWhite = contrastRatio('#003594', '#FFFFFF');
    assert.ok(Math.abs(royalOnWhite - 10.84) < 0.05, `Expected ~10.84, got ${royalOnWhite}`);

    const goldOnWhite = contrastRatio('#FFB81C', '#FFFFFF');
    assert.ok(Math.abs(goldOnWhite - 1.73) < 0.05, `Expected ~1.73, got ${goldOnWhite}`);

    const medBlueOnGold = contrastRatio('#00205B', '#FFB81C');
    assert.ok(Math.abs(medBlueOnGold - 8.93) < 0.05, `Expected ~8.93, got ${medBlueOnGold}`);

    const goldOnRoyal = contrastRatio('#FFB81C', '#003594');
    assert.ok(Math.abs(goldOnRoyal - 6.26) < 0.05, `Expected ~6.26, got ${goldOnRoyal}`);

    const badCss = 'body { color: #003594; background: rgba(0, 0, 0, 0.5); border-color: #fff; }';
    const rawHits = findRawColorsInCss(badCss);
    assert.equal(rawHits.length, 3, `Expected 3 raw color hits, got ${JSON.stringify(rawHits)}`);

    const { repoRoot } = getConfig();
    const stylesCss = fs.readFileSync(path.join(repoRoot, 'redesign', 'assets', 'styles.css'), 'utf8');
    assert.deepEqual(findRawColorsInCss(stylesCss), [], 'redesign/assets/styles.css must have zero raw colors');

    const tokensPath = path.join(repoRoot, 'redesign', 'assets', 'tokens.css');
    const tokenHexes = extractHexColors(fs.readFileSync(tokensPath, 'utf8'));
    assert.ok(tokenHexes.length >= 7, 'tokens.css should define >= 7 Pitt brand hex tokens');
    for (const hex of tokenHexes) {
      assert.ok(APPROVED_BRAND_HEX.has(hex), `Unapproved brand hex in tokens.css: ${hex}`);
    }

    const digest = sha256Hex12(tokensPath);
    assert.match(digest, /^[0-9a-f]{12}$/, `Expected 12-char lowercase hex SHA-256 prefix, got ${digest}`);

    const gitCheck = checkGitProtectedDirsClean(repoRoot);
    assert.equal(gitCheck.clean, true, `Protected directories must be clean: ${JSON.stringify(gitCheck.lines)}`);
  });

  test('SC-11: clickAndWaitForNavigation and goBack work cleanly for both full-page and hash links', async () => {
    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      await page.goto('index.html');

      // Full-page link click + goBack
      const afterFull = await page.clickAndWaitForNavigation('nav[aria-label="Main navigation"] a[href$="about.html"]');
      assert.ok(afterFull.endsWith('/about.html'), `Expected navigation to about.html, got ${afterFull}`);

      const backToHome = await page.goBack();
      assert.ok(backToHome.endsWith('/index.html'), `Expected goBack to index.html, got ${backToHome}`);

      // Same-document hash jump link + goBack
      const afterHash = await page.clickAndWaitForNavigation('nav[aria-label="On this page"] a[href^="#"]');
      assert.ok(afterHash.includes('#'), `Expected hash fragment in URL, got ${afterHash}`);

      const backFromHash = await page.goBack();
      assert.ok(!backFromHash.includes('#'), `Expected goBack to clear hash, got ${backFromHash}`);
    });
  });

  test('SC-12: verifyHtmlAssetHashes and dual-paradigm People scope switcher execute cleanly', async () => {
    const { siteDir } = getConfig();
    const indexHtml = fs.readFileSync(path.join(siteDir, 'index.html'), 'utf8');
    const hashReport = verifyHtmlAssetHashes(indexHtml, siteDir);
    assert.ok(hashReport.checked.length >= 2, `Expected >=2 checked hashed assets in index.html, got ${hashReport.checked.length}`);
    assert.equal(hashReport.ok, true, `Unexpected hash mismatches in index.html: ${JSON.stringify(hashReport)}`);

    await withPage(browser, { width: 1440, height: 900 }, async (page) => {
      await page.goto('people.html');
      const initial = await getFacultyExplorerState(page);
      assert.equal(initial.totalCards, 190);
      assert.equal(initial.visibleCount, 30, 'Default people.html scope should show 30 Faculty');

      await selectPeopleScope(page, 'Graduate students');
      await page.waitFor(
        () =>
          [...document.querySelectorAll('[id^="person-"]')].filter(
            (c) => !c.hidden && getComputedStyle(c).display !== 'none'
          ).length === 32,
        { timeoutMs: 3000, message: 'Selecting Graduate students scope should show 32 cards' }
      );
      const gradState = await getFacultyExplorerState(page);
      assert.equal(gradState.visibleCount, 32);
    });
  });
});
