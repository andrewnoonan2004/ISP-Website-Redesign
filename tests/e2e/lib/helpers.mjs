/**
 * Reusable opaque-box helpers for the Pitt ISP Website Redesign E2E suite.
 * Zero third-party dependencies — Node 24 built-ins only.
 *
 * Design discipline:
 * - Semantic ARIA roles, landmarks, accessible names, canonical interface-contract
 *   URLs/IDs, and computed styles first; zero brittle private CSS class selectors.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

export const CORE_PAGES_14 = Object.freeze([
  'index.html',
  'about.html',
  'academics.html',
  'ms.html',
  'phd.html',
  'courses.html',
  'funding.html',
  'admissions.html',
  'people.html',
  'search.html',
  'research.html',
  'events.html',
  'news.html',
  'resources.html',
]);

// All 15 approved BRAND.md colors (2 Primary, 6 Secondary, 7 Accent)
export const APPROVED_BRAND_HEX = new Set([
  // Primary
  '#003594', // Pitt Royal
  '#FFB81C', // Pitt Gold
  // Secondary
  '#DBEEFF', // New Sky
  '#C8C9C7', // Gray
  '#FFFFFF', // White
  '#00205B', // Medium Blue
  '#B87333', // Bronze
  '#000000', // Black
  // Accent (max 4 on screen simultaneously)
  '#FFE939', // Golden Haze
  '#66B2E3', // Light Blue
  '#00AD6E', // Light Green
  '#F7911E', // Orange
  '#FF5B45', // Infrared
  '#FFDECD', // White Peach
  '#770538', // Merlot
]);

export const ACCENT_BRAND_RGB = Object.freeze([
  { name: 'Golden Haze', hex: '#FFE939', r: 255, g: 233, b: 57 },
  { name: 'Light Blue', hex: '#66B2E3', r: 102, g: 178, b: 227 },
  { name: 'Light Green', hex: '#00AD6E', r: 0, g: 173, b: 110 },
  { name: 'Orange', hex: '#F7911E', r: 247, g: 145, b: 30 },
  { name: 'Infrared', hex: '#FF5B45', r: 255, g: 91, b: 69 },
  { name: 'White Peach', hex: '#FFDECD', r: 255, g: 222, b: 205 },
  { name: 'Merlot', hex: '#770538', r: 119, g: 5, b: 56 },
]);

// Exact raw-color regex matching redesign/scripts/check.py:38
export const RAW_COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;

const CURATED_FACULTY_TOPICS = [
  'Machine learning and reasoning',
  'Health and biomedicine',
  'Language and information retrieval',
  'Learning and education',
  'Human-computer interaction',
  'Social computing',
  'Computer vision',
  'AI and law',
  'Recommender systems',
  'Security and privacy',
];

// ---------------------------------------------------------------------------
// Config & Lifecycle
// ---------------------------------------------------------------------------

export function getConfig() {
  const repoRoot = process.env.E2E_REPO_ROOT
    ? path.resolve(process.env.E2E_REPO_ROOT)
    : DEFAULT_REPO_ROOT;
  const distIndex = path.join(repoRoot, 'redesign', 'dist', 'index.html');
  const defaultSiteDir = fs.existsSync(distIndex)
    ? path.join(repoRoot, 'redesign', 'dist')
    : path.join(repoRoot, 'redesign');

  return {
    wsUrl: process.env.E2E_WS_URL || '',
    baseUrl: process.env.E2E_BASE_URL || '',
    subpathUrl: process.env.E2E_SUBPATH_URL || '',
    siteDir: process.env.E2E_SITE_DIR
      ? path.resolve(process.env.E2E_SITE_DIR)
      : defaultSiteDir,
    repoRoot,
  };
}

export function pageUrl(rel = '') {
  const { baseUrl } = getConfig();
  if (!baseUrl) {
    throw new Error('E2E_BASE_URL is not set.');
  }
  const baseWithSlash = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  if (!rel || rel === '.') return baseWithSlash;
  return new URL(rel, baseWithSlash).href;
}

export function subpathUrl(rel = '') {
  const { subpathUrl: sub } = getConfig();
  if (!sub) {
    throw new Error('E2E_SUBPATH_URL is not set.');
  }
  const baseWithSlash = sub.endsWith('/') ? sub : `${sub}/`;
  if (!rel || rel === '.') return baseWithSlash;
  return new URL(rel, baseWithSlash).href;
}

export async function withPage(browser, optsOrFn, maybeFn) {
  let opts = {};
  let fn = maybeFn;
  if (typeof optsOrFn === 'function') {
    fn = optsOrFn;
  } else {
    opts = optsOrFn || {};
  }
  if (typeof fn !== 'function') {
    throw new Error('withPage(browser, [opts], fn) requires a callback function');
  }
  const page = await browser.newPage(opts);
  try {
    return await fn(page);
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------------
// Brand, CSS, Hash, PNG & Git Helpers
// ---------------------------------------------------------------------------

export function findRawColorsInCss(cssText) {
  const matches = [];
  const lines = String(cssText).split(/\r?\n/);
  const globalRe = new RegExp(RAW_COLOR_RE.source, 'g');
  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    globalRe.lastIndex = 0;
    let m;
    while ((m = globalRe.exec(lineText)) !== null) {
      matches.push({
        match: m[0],
        line: i + 1,
        column: m.index + 1,
      });
    }
  }
  return matches;
}

export function extractHexColors(cssText) {
  const found = [];
  const re = /#([0-9a-fA-F]{3,8})\b/g;
  const text = String(cssText);
  let m;
  while ((m = re.exec(text)) !== null) {
    const hex = m[1].toUpperCase();
    if (hex.length === 3) {
      found.push(`#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`);
    } else if (hex.length === 6) {
      found.push(`#${hex}`);
    } else {
      found.push(`#${hex}`);
    }
  }
  return found;
}

export function sha256Hex12(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 12);
}

export function verifyHtmlAssetHashes(htmlText, siteDir = getConfig().siteDir) {
  const re = /\b((?:\.?\/)?assets\/[^"'\s<>?#]+)\?v=([0-9a-fA-F]{12})\b/g;
  const checked = [];
  const mismatches = [];
  const missing = [];
  const seen = new Set();

  let m;
  while ((m = re.exec(String(htmlText))) !== null) {
    const rawRel = m[1].replace(/^\.\//, '').replace(/^\//, '');
    const expected = m[2].toLowerCase();
    const key = `${rawRel}?v=${expected}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const diskPath = path.join(siteDir, rawRel);
    if (!fs.existsSync(diskPath) || !fs.statSync(diskPath).isFile()) {
      missing.push({ asset: rawRel, expected, diskPath });
      continue;
    }
    const actual = sha256Hex12(diskPath);
    const entry = { asset: rawRel, expected, actual };
    checked.push(entry);
    if (actual !== expected) {
      mismatches.push(entry);
    }
  }

  return {
    checked,
    mismatches,
    missing,
    ok: mismatches.length === 0 && missing.length === 0,
  };
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function inspectPngBuffer(buf) {
  if (!Buffer.isBuffer(buf)) {
    return { valid: false, reason: 'Input is not a Buffer', bytes: 0 };
  }
  const bytes = buf.length;
  if (bytes < 33) {
    return { valid: false, reason: `Too small to be a valid PNG (${bytes} bytes)`, bytes };
  }
  if (!buf.subarray(0, 8).equals(PNG_SIG)) {
    return { valid: false, reason: 'Invalid 8-byte PNG signature', bytes };
  }

  let offset = 8;
  let ihdr = null;
  let plte = null;
  const idatChunks = [];
  let hasIend = false;
  let chunkIndex = 0;

  while (offset < bytes) {
    if (offset + 12 > bytes) {
      return { valid: false, reason: `Truncated chunk header at offset ${offset}`, bytes };
    }
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes) {
      return {
        valid: false,
        reason: `Truncated chunk data/CRC for ${type} at offset ${offset}`,
        bytes,
      };
    }

    const expectedCrc = buf.readUInt32BE(dataEnd);
    const actualCrc = zlib.crc32(buf.subarray(offset + 4, dataEnd)) >>> 0;
    if (actualCrc !== expectedCrc) {
      return {
        valid: false,
        reason: `CRC32 mismatch on ${type} chunk (expected 0x${expectedCrc.toString(16)}, got 0x${actualCrc.toString(16)})`,
        bytes,
      };
    }

    const chunkData = buf.subarray(dataStart, dataEnd);
    if (chunkIndex === 0) {
      if (type !== 'IHDR' || length !== 13) {
        return {
          valid: false,
          reason: `First chunk must be 13-byte IHDR, found ${type} (${length} bytes)`,
          bytes,
        };
      }
      const width = chunkData.readUInt32BE(0);
      const height = chunkData.readUInt32BE(4);
      const bitDepth = chunkData[8];
      const colorType = chunkData[9];
      const compression = chunkData[10];
      const filter = chunkData[11];
      const interlace = chunkData[12];
      if (width <= 0 || height <= 0) {
        return { valid: false, reason: `Invalid IHDR dimensions ${width}x${height}`, bytes };
      }
      if (compression !== 0 || filter !== 0 || (interlace !== 0 && interlace !== 1)) {
        return { valid: false, reason: 'Invalid IHDR compression/filter/interlace flags', bytes };
      }
      if (!Object.prototype.hasOwnProperty.call(PNG_CHANNELS, colorType)) {
        return { valid: false, reason: `Unsupported PNG colorType ${colorType}`, bytes };
      }
      ihdr = { width, height, bitDepth, colorType, compression, filter, interlace };
    } else if (type === 'PLTE') {
      plte = chunkData;
    } else if (type === 'IDAT') {
      idatChunks.push(chunkData);
    } else if (type === 'IEND') {
      if (length !== 0) {
        return { valid: false, reason: `IEND chunk must be 0 bytes, got ${length}`, bytes };
      }
      hasIend = true;
      offset = dataEnd + 4;
      break;
    }

    offset = dataEnd + 4;
    chunkIndex += 1;
  }

  if (!ihdr) {
    return { valid: false, reason: 'Missing IHDR chunk', bytes };
  }
  if (idatChunks.length === 0) {
    return { valid: false, reason: 'Missing IDAT chunk(s)', bytes };
  }
  if (!hasIend) {
    return { valid: false, reason: 'Missing IEND chunk (truncated PNG)', bytes };
  }

  let inflated;
  try {
    inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  } catch (err) {
    return {
      valid: false,
      reason: `IDAT zlib inflate failed: ${err.message}`,
      bytes,
      width: ihdr.width,
      height: ihdr.height,
    };
  }

  const { width, height, bitDepth, colorType, interlace } = ihdr;
  const channels = PNG_CHANNELS[colorType];
  let distinctColors = 0;
  let nonUniform = false;

  if (interlace === 0 && bitDepth === 8) {
    const stride = width * channels;
    const expectedLen = height * (1 + stride);
    if (inflated.length !== expectedLen) {
      return {
        valid: false,
        reason: `Inflated pixel stream length mismatch (expected ${expectedLen}, got ${inflated.length})`,
        bytes,
        width,
        height,
      };
    }

    const rowStep = Math.max(1, Math.floor(height / 64));
    const colStep = Math.max(1, Math.floor(width / 64));
    const colorSet = new Set();

    let prev = new Uint8Array(stride);
    let cur = new Uint8Array(stride);
    const bpp = channels;

    for (let y = 0; y < height; y++) {
      const rowPos = y * (1 + stride);
      const filterType = inflated[rowPos];
      const srcStart = rowPos + 1;

      if (filterType === 0) {
        for (let i = 0; i < stride; i++) {
          cur[i] = inflated[srcStart + i];
        }
      } else if (filterType === 1) {
        for (let i = 0; i < stride; i++) {
          const a = i >= bpp ? cur[i - bpp] : 0;
          cur[i] = (inflated[srcStart + i] + a) & 0xff;
        }
      } else if (filterType === 2) {
        for (let i = 0; i < stride; i++) {
          cur[i] = (inflated[srcStart + i] + prev[i]) & 0xff;
        }
      } else if (filterType === 3) {
        for (let i = 0; i < stride; i++) {
          const a = i >= bpp ? cur[i - bpp] : 0;
          const b = prev[i];
          cur[i] = (inflated[srcStart + i] + ((a + b) >> 1)) & 0xff;
        }
      } else if (filterType === 4) {
        for (let i = 0; i < stride; i++) {
          const a = i >= bpp ? cur[i - bpp] : 0;
          const b = prev[i];
          const c = i >= bpp ? prev[i - bpp] : 0;
          cur[i] = (inflated[srcStart + i] + paethPredictor(a, b, c)) & 0xff;
        }
      } else {
        return {
          valid: false,
          reason: `Unknown PNG scanline filter type ${filterType} on row ${y}`,
          bytes,
          width,
          height,
        };
      }

      if (y % rowStep === 0 || y === height - 1) {
        for (let x = 0; x < width; x += colStep) {
          let key;
          if (colorType === 3 && plte) {
            const idx = cur[x] * 3;
            key =
              idx + 2 < plte.length
                ? `${plte[idx]},${plte[idx + 1]},${plte[idx + 2]}`
                : `idx:${cur[x]}`;
          } else if (channels === 1) {
            key = `${cur[x]}`;
          } else if (channels === 2) {
            const p = x * 2;
            key = `${cur[p]},${cur[p + 1]}`;
          } else if (channels === 3) {
            const p = x * 3;
            key = `${cur[p]},${cur[p + 1]},${cur[p + 2]}`;
          } else {
            const p = x * 4;
            key = `${cur[p]},${cur[p + 1]},${cur[p + 2]},${cur[p + 3]}`;
          }
          colorSet.add(key);
        }
      }

      const tmp = prev;
      prev = cur;
      cur = tmp;
    }

    distinctColors = colorSet.size;
    nonUniform = distinctColors > 1;
  } else {
    // Valid non-8-bit or interlaced PNG: sample inflated stream for basic variation.
    const sampleSet = new Set();
    const step = Math.max(1, Math.floor(inflated.length / 4096));
    for (let i = 0; i < inflated.length; i += step) {
      sampleSet.add(inflated[i]);
    }
    distinctColors = sampleSet.size;
    nonUniform = distinctColors > 1;
  }

  return {
    valid: true,
    bytes,
    width,
    height,
    bitDepth,
    colorType,
    interlace,
    idatCount: idatChunks.length,
    distinctColors,
    nonUniform,
  };
}

export function inspectPng(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, reason: `File does not exist: ${filePath}`, bytes: 0 };
    }
    const buf = fs.readFileSync(filePath);
    return inspectPngBuffer(buf);
  } catch (err) {
    return { valid: false, reason: `Unable to read PNG ${filePath}: ${err.message}`, bytes: 0 };
  }
}

export function checkGitProtectedDirsClean(repoRoot = getConfig().repoRoot) {
  const output = execFileSync(
    'git',
    ['status', '--porcelain', '--', 'Design Assets', 'Brand Guidelines', 'www.isp.pitt.edu'],
    { cwd: repoRoot, encoding: 'utf8' }
  );
  const lines = output
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter(Boolean);
  return {
    clean: lines.length === 0,
    lines,
  };
}

// ---------------------------------------------------------------------------
// WCAG 2.1 AA Contrast Math & In-Page Evaluator
// ---------------------------------------------------------------------------

export function parseCssColor(str) {
  if (!str || typeof str !== 'string') return null;
  const s = str.trim().toLowerCase();
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
    return null;
  }

  const m = s.match(
    /^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/
  );
  if (!m) return null;
  let a = 1;
  if (m[4] !== undefined) {
    a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  }
  return {
    r: Math.max(0, Math.min(255, Math.round(parseFloat(m[1])))),
    g: Math.max(0, Math.min(255, Math.round(parseFloat(m[2])))),
    b: Math.max(0, Math.min(255, Math.round(parseFloat(m[3])))),
    a: Math.max(0, Math.min(1, Number.isNaN(a) ? 1 : a)),
  };
}

export function blendRgba(fg, bg) {
  const fgA = fg.a ?? 1;
  const bgA = bg.a ?? 1;
  const outA = fgA + bgA * (1 - fgA);
  if (outA <= 0) return { r: 255, g: 255, b: 255, a: 0 };
  return {
    r: Math.round((fg.r * fgA + bg.r * bgA * (1 - fgA)) / outA),
    g: Math.round((fg.g * fgA + bg.g * bgA * (1 - fgA)) / outA),
    b: Math.round((fg.b * fgA + bg.b * bgA * (1 - fgA)) / outA),
    a: outA,
  };
}

export function relativeLuminance(rgb) {
  const toLinear = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

export function contrastRatio(rgb1, rgb2) {
  const c1 = typeof rgb1 === 'string' ? parseCssColor(rgb1) : rgb1;
  const c2 = typeof rgb2 === 'string' ? parseCssColor(rgb2) : rgb2;
  if (!c1 || !c2) {
    throw new Error(`Invalid color(s) passed to contrastRatio: ${JSON.stringify([rgb1, rgb2])}`);
  }
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

export async function auditPageContrast(page, { rootSelector = 'body', selectors = null } = {}) {
  return await page.evaluate(
    (rootSel, explicitSelectors) => {
      const parseColor = (str) => {
        if (!str) return null;
        const s = str.trim().toLowerCase();
        if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
        const m = s.match(
          /^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/
        );
        if (!m) return null;
        let a = 1;
        if (m[4] !== undefined) {
          a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
        }
        return {
          r: Math.round(parseFloat(m[1])),
          g: Math.round(parseFloat(m[2])),
          b: Math.round(parseFloat(m[3])),
          a: Number.isNaN(a) ? 1 : a,
        };
      };

      const blend = (fg, bg) => {
        const fgA = fg.a ?? 1;
        const bgA = bg.a ?? 1;
        const outA = fgA + bgA * (1 - fgA);
        if (outA <= 0) return { r: 255, g: 255, b: 255, a: 0 };
        return {
          r: Math.round((fg.r * fgA + bg.r * bgA * (1 - fgA)) / outA),
          g: Math.round((fg.g * fgA + bg.g * bgA * (1 - fgA)) / outA),
          b: Math.round((fg.b * fgA + bg.b * bgA * (1 - fgA)) / outA),
          a: outA,
        };
      };

      const lum = (rgb) => {
        const lin = (c) => {
          const v = c / 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
      };

      const ratio = (c1, c2) => {
        const l1 = lum(c1);
        const l2 = lum(c2);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      };

      const effectiveBg = (el) => {
        const layers = [];
        let cur = el;
        while (cur && cur.nodeType === 1) {
          const cs = getComputedStyle(cur);
          const bg = parseColor(cs.backgroundColor);
          if (bg && bg.a > 0) {
            layers.push(bg);
            if (bg.a >= 0.999) break;
          }
          cur = cur.parentElement;
        }
        let acc = { r: 255, g: 255, b: 255, a: 1 };
        for (let i = layers.length - 1; i >= 0; i--) {
          acc = blend(layers[i], acc);
        }
        return acc;
      };

      const isVisuallyHidden = (el, cs, rect) => {
        if (el.hidden || el.closest('[hidden]')) return true;
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
          return true;
        }
        if (rect.width <= 0 || rect.height <= 0) return true;
        // Skip sr-only (1x1 clipped) elements.
        if (
          rect.width <= 2 &&
          rect.height <= 2 &&
          (cs.overflow === 'hidden' ||
            (cs.clipPath && cs.clipPath !== 'none') ||
            (cs.clip && cs.clip !== 'auto'))
        ) {
          return true;
        }
        // Skip intentionally offscreen unfocused links (such as unfocused skip links at top: -100px).
        const docBottom = rect.bottom + window.scrollY;
        const docRight = rect.right + window.scrollX;
        if ((docBottom <= 0 || docRight <= 0) && document.activeElement !== el) {
          return true;
        }
        // Check ancestor opacity/visibility/overflow hiding.
        let anc = el.parentElement;
        while (anc && anc !== document.documentElement) {
          const acs = getComputedStyle(anc);
          if (acs.display === 'none' || acs.visibility === 'hidden' || parseFloat(acs.opacity) === 0) {
            return true;
          }
          anc = anc.parentElement;
        }
        return false;
      };

      const root = document.querySelector(rootSel);
      if (!root) {
        return {
          checkedCount: 0,
          violations: [{ reason: `Root selector not found: ${rootSel}` }],
          goldOnLightViolations: [],
          ok: false,
        };
      }

      let candidates;
      if (Array.isArray(explicitSelectors) && explicitSelectors.length > 0) {
        const set = new Set();
        for (const sel of explicitSelectors) {
          for (const el of root.querySelectorAll(sel)) set.add(el);
        }
        candidates = [...set];
      } else {
        candidates = [...root.querySelectorAll('*')].filter((el) => {
          const tag = el.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'SVG' || tag === 'PATH') {
            return false;
          }
          if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
            return el.type !== 'hidden';
          }
          for (const node of el.childNodes) {
            if (node.nodeType === 3 && node.textContent.trim().length > 0) {
              return true;
            }
          }
          return false;
        });
      }

      const violations = [];
      const goldOnLightViolations = [];
      let checkedCount = 0;

      for (const el of candidates) {
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (isVisuallyHidden(el, cs, rect)) continue;

        const fontSize = parseFloat(cs.fontSize) || 0;
        if (fontSize <= 0) continue;

        const rawFg = parseColor(cs.color);
        if (!rawFg || rawFg.a <= 0) continue;

        const bg = effectiveBg(el);
        const fg = rawFg.a < 1 ? blend(rawFg, bg) : rawFg;
        const fontWeight = parseInt(cs.fontWeight, 10) || (cs.fontWeight === 'bold' ? 700 : 400);
        const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
        const required = isLarge ? 3.0 : 4.5;
        const cr = ratio(fg, bg);

        checkedCount += 1;

        const textSample = (el.textContent || el.value || el.getAttribute('aria-label') || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 80);

        const isPittGold =
          Math.abs(fg.r - 255) <= 3 && Math.abs(fg.g - 184) <= 3 && Math.abs(fg.b - 28) <= 3;
        const bgLum = lum(bg);
        if (isPittGold && bgLum > 0.5) {
          goldOnLightViolations.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            text: textSample,
            fg: `rgb(${fg.r}, ${fg.g}, ${fg.b})`,
            bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
            ratio: Number(cr.toFixed(2)),
          });
        }

        if (cr + 0.005 < required) {
          violations.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            text: textSample,
            fg: `rgb(${fg.r}, ${fg.g}, ${fg.b})`,
            bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
            fontSize: Number(fontSize.toFixed(2)),
            fontWeight,
            isLarge,
            ratio: Number(cr.toFixed(2)),
            required,
          });
        }
      }

      return {
        checkedCount,
        violations,
        goldOnLightViolations,
        ok: violations.length === 0 && goldOnLightViolations.length === 0,
      };
    },
    rootSelector,
    selectors
  );
}

// ---------------------------------------------------------------------------
// Opaque-Box Semantic DOM Helpers
// ---------------------------------------------------------------------------

export async function checkNoHorizontalOverflow(page) {
  return await page.evaluate(() => {
    const docEl = document.documentElement;
    const scrollWidth = docEl.scrollWidth;
    const clientWidth = docEl.clientWidth;
    const innerWidth = window.innerWidth;
    const overflowPx = Math.max(0, scrollWidth - clientWidth);
    return {
      scrollWidth,
      clientWidth,
      innerWidth,
      overflowPx,
      ok: scrollWidth <= clientWidth + 1,
    };
  });
}

export async function auditPageStructure(page) {
  return await page.evaluate((accentTable) => {
    const parseColor = (str) => {
      if (!str) return null;
      const m = str
        .trim()
        .toLowerCase()
        .match(/^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
      if (!m) return null;
      const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
      return {
        r: Math.round(parseFloat(m[1])),
        g: Math.round(parseFloat(m[2])),
        b: Math.round(parseFloat(m[3])),
        a: Number.isNaN(a) ? 1 : a,
      };
    };

    const isRendered = (el) => {
      if (!el || el.hidden || el.closest('[hidden]')) return false;
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) !== 0;
    };

    const h1s = [...document.querySelectorAll('h1')];
    const mains = [...document.querySelectorAll('main')];

    // Heading hierarchy check (matching redesign/scripts/check.py:19-22)
    const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')];
    const headingViolations = [];
    let lastLevel = 0;
    for (const h of headings) {
      const level = parseInt(h.tagName.slice(1), 10);
      if (lastLevel > 0 && level > lastLevel + 1) {
        headingViolations.push({
          tag: h.tagName.toLowerCase(),
          prevLevel: lastLevel,
          level,
          text: (h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        });
      }
      lastLevel = level;
    }

    // Duplicate ID check
    const idCounts = new Map();
    for (const el of document.querySelectorAll('[id]')) {
      const id = el.getAttribute('id');
      if (!id) continue;
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    }
    const duplicateIds = [...idCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([id, count]) => ({ id, count }));

    // Image alt check
    const imagesWithoutAlt = [...document.querySelectorAll('img')]
      .filter((img) => !img.hasAttribute('alt'))
      .map((img) => img.getAttribute('src') || '(no src)');

    // Typography guardrails
    const bodyCs = getComputedStyle(document.body);
    const bodyFontFamily = bodyCs.fontFamily || '';
    const bodyUsesInstrumentSerif = /instrument\s*serif/i.test(bodyFontFamily);
    const bodyDeclaresApprovedFont = /roboto|merriweather/i.test(bodyFontFamily);

    const visibleMajorHeadings = [...document.querySelectorAll('h1, h2, h3')].filter(isRendered);
    const typographyHeadingViolations = [];
    for (const h of visibleMajorHeadings) {
      const hcs = getComputedStyle(h);
      const ff = hcs.fontFamily || '';
      const tt = hcs.textTransform || '';
      const hasCondensedStack = /alternate-gothic|league\s*gothic/i.test(ff);
      const isUppercase = tt === 'uppercase';
      if (!hasCondensedStack || !isUppercase) {
        typographyHeadingViolations.push({
          tag: h.tagName.toLowerCase(),
          text: (h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
          fontFamily: ff,
          textTransform: tt,
        });
      }
    }

    // Distinct BRAND.md accent colors used simultaneously (<= 4)
    const accentsSet = new Set();
    const colorProps = [
      'color',
      'backgroundColor',
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
    ];
    for (const el of document.querySelectorAll('*')) {
      if (!isRendered(el)) continue;
      const cs = getComputedStyle(el);
      for (const prop of colorProps) {
        const c = parseColor(cs[prop]);
        if (!c || c.a <= 0) continue;
        for (const acc of accentTable) {
          if (
            Math.abs(c.r - acc.r) <= 1 &&
            Math.abs(c.g - acc.g) <= 1 &&
            Math.abs(c.b - acc.b) <= 1
          ) {
            accentsSet.add(acc.hex);
          }
        }
      }
    }

    const fullText = document.body ? document.body.textContent || '' : '';
    const hasProhibitedTagline = /hail\s+to\s+possible/i.test(fullText);

    const h1Count = h1s.length;
    const mainCount = mains.length;
    const accentsUsed = [...accentsSet];

    return {
      title: document.title || '',
      h1Count,
      h1Text: h1s[0] ? h1s[0].textContent.replace(/\s+/g, ' ').trim() : '',
      mainCount,
      headingOrderOk: headingViolations.length === 0,
      headingViolations,
      duplicateIds,
      imagesWithoutAlt,
      typography: {
        bodyFontFamily,
        bodyUsesInstrumentSerif,
        bodyDeclaresApprovedFont,
        headingsChecked: visibleMajorHeadings.length,
        headingViolations: typographyHeadingViolations,
        ok:
          !bodyUsesInstrumentSerif &&
          bodyDeclaresApprovedFont &&
          typographyHeadingViolations.length === 0,
      },
      accentsUsed,
      accentCount: accentsUsed.length,
      accentsOk: accentsUsed.length <= 4,
      hasProhibitedTagline,
      ok:
        h1Count === 1 &&
        mainCount === 1 &&
        headingViolations.length === 0 &&
        duplicateIds.length === 0 &&
        imagesWithoutAlt.length === 0 &&
        !bodyUsesInstrumentSerif &&
        accentsUsed.length <= 4 &&
        !hasProhibitedTagline,
    };
  }, ACCENT_BRAND_RGB);
}

export async function findStickyNavInfo(page) {
  return await page.evaluate(() => {
    const parseColor = (str) => {
      if (!str) return null;
      const s = str.trim().toLowerCase();
      if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
      const m = s.match(
        /^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/
      );
      if (!m) return null;
      const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
      return {
        r: Math.round(parseFloat(m[1])),
        g: Math.round(parseFloat(m[2])),
        b: Math.round(parseFloat(m[3])),
        a: Number.isNaN(a) ? 1 : a,
      };
    };

    const mainNav =
      document.querySelector('nav[aria-label="Main navigation"]') ||
      document.querySelector('nav#main-navigation') ||
      [...document.querySelectorAll('nav')].find((n) => {
        const lbl = (n.getAttribute('aria-label') || '').toLowerCase();
        return lbl !== 'breadcrumb' && lbl !== 'on this page';
      });

    if (!mainNav) {
      return { found: false, reason: 'Main navigation element not found' };
    }

    let cur = mainNav;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      const cs = getComputedStyle(cur);
      if (cs.position === 'sticky' || cs.position === 'fixed') {
        const rect = cur.getBoundingClientRect();
        const bg = parseColor(cs.backgroundColor) || { r: 0, g: 0, b: 0, a: 0 };
        const zNum = parseInt(cs.zIndex, 10);
        return {
          found: true,
          tag: cur.tagName.toLowerCase(),
          id: cur.id || '',
          position: cs.position,
          top: Number(rect.top.toFixed(2)),
          bottom: Number(rect.bottom.toFixed(2)),
          height: Number(rect.height.toFixed(2)),
          width: Number(rect.width.toFixed(2)),
          zIndex: Number.isNaN(zNum) ? 0 : zNum,
          bgRgba: cs.backgroundColor,
          bgAlpha: bg.a,
          containsMainNav: cur === mainNav || cur.contains(mainNav),
        };
      }
      cur = cur.parentElement;
    }

    return { found: false, reason: 'No sticky or fixed ancestor found for Main navigation' };
  });
}

export async function findMobileMenuToggle(page) {
  return await page.evaluate(() => {
    const isVisible = (el) => {
      if (!el || el.hidden || el.closest('[hidden]')) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
        return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    const getName = (el) => {
      if (!el) return '';
      const al = el.getAttribute('aria-label');
      if (al) return al.trim();
      const lb = el.getAttribute('aria-labelledby');
      if (lb) {
        const t = lb
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent || '')
          .join(' ')
          .trim();
        if (t) return t;
      }
      return (el.getAttribute('title') || el.textContent || '')
        .replace(/[→↗↓↑✕×☰]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const mainNav = document.querySelector('nav[aria-label="Main navigation"]');
    let stickyRoot = null;
    if (mainNav) {
      let cur = mainNav;
      while (cur && cur !== document.body) {
        const pos = getComputedStyle(cur).position;
        if (pos === 'sticky' || pos === 'fixed') {
          stickyRoot = cur;
          break;
        }
        cur = cur.parentElement;
      }
    }

    const scope = stickyRoot || document.querySelector('header') || document.body;
    const buttons = [...scope.querySelectorAll('button')].filter(isVisible);
    const toggle = buttons.find((btn) => {
      if (!btn.hasAttribute('aria-controls') && !btn.hasAttribute('aria-expanded')) return false;
      const name = getName(btn);
      const controlsId = btn.getAttribute('aria-controls') || '';
      const controlled = controlsId ? document.getElementById(controlsId) : null;
      return (
        /\b(menu|navigation)\b/i.test(name) ||
        controlsId === 'main-navigation' ||
        (controlled && mainNav && (controlled === mainNav || controlled.contains(mainNav) || mainNav.contains(controlled)))
      );
    });

    if (!toggle) {
      return { found: false };
    }

    const r = toggle.getBoundingClientRect();
    const controlsId = toggle.getAttribute('aria-controls') || '';
    const drawer = (controlsId && document.getElementById(controlsId)) || mainNav || null;

    let drawerInfo = null;
    if (drawer) {
      const dr = drawer.getBoundingClientRect();
      const dcs = getComputedStyle(drawer);
      let scrollableContainer = ['auto', 'scroll'].includes(dcs.overflowY);
      if (!scrollableContainer && drawer.parentElement) {
        const pcs = getComputedStyle(drawer.parentElement);
        scrollableContainer = ['auto', 'scroll'].includes(pcs.overflowY);
      }
      drawerInfo = {
        visible: isVisible(drawer),
        top: Number(dr.top.toFixed(2)),
        bottom: Number(dr.bottom.toFixed(2)),
        height: Number(dr.height.toFixed(2)),
        overflowY: dcs.overflowY,
        maxHeight: dcs.maxHeight,
        viewportBounded: dr.bottom <= window.innerHeight + 2 || scrollableContainer,
      };
    }

    return {
      found: true,
      text: getName(toggle),
      id: toggle.id || '',
      expanded: toggle.getAttribute('aria-expanded') === 'true',
      ariaExpanded: toggle.getAttribute('aria-expanded'),
      controlsId,
      isFocused: document.activeElement === toggle,
      rect: {
        top: Number(r.top.toFixed(2)),
        left: Number(r.left.toFixed(2)),
        right: Number(r.right.toFixed(2)),
        bottom: Number(r.bottom.toFixed(2)),
        width: Number(r.width.toFixed(2)),
        height: Number(r.height.toFixed(2)),
        centerX: Number((r.left + r.width / 2).toFixed(2)),
        centerY: Number((r.top + r.height / 2).toFixed(2)),
      },
      drawerInfo,
    };
  });
}

export async function findAcademicsDisclosure(page) {
  return await page.evaluate(() => {
    const isVisible = (el) => {
      if (!el || el.hidden || el.closest('[hidden]')) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
        return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    const getName = (el) => {
      if (!el) return '';
      const al = el.getAttribute('aria-label');
      if (al) return al.trim();
      return (el.getAttribute('title') || el.textContent || '')
        .replace(/[→↗↓↑▾▸▼▶]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const mainNav =
      document.querySelector('nav[aria-label="Main navigation"]') ||
      document.querySelector('nav#main-navigation') ||
      document.body;

    const buttons = [...mainNav.querySelectorAll('button[aria-expanded]')];
    const btn = buttons.find((b) => {
      if (/academics/i.test(getName(b))) return true;
      const parent = b.parentElement;
      return Boolean(parent && parent.querySelector('a[href$="academics.html"], a[href*="academics.html"]'));
    });

    const academicsLink = mainNav.querySelector('a[href$="academics.html"], a[href*="academics.html#"]');
    if (!btn) {
      return {
        found: false,
        academicsLinkHref: academicsLink ? academicsLink.getAttribute('href') : null,
      };
    }

    const controlsId = btn.getAttribute('aria-controls') || '';
    let panel = controlsId ? document.getElementById(controlsId) : null;
    if (!panel && btn.parentElement) {
      panel = [...btn.parentElement.children].find(
        (c) => c !== btn && /^(UL|DIV|NAV)$/.test(c.tagName) && c.querySelector('a[href]')
      );
    }

    const r = btn.getBoundingClientRect();
    const menuVisible = panel ? isVisible(panel) : false;
    const menuLinks = panel
      ? [...panel.querySelectorAll('a[href]')].map((a) => ({
          href: a.getAttribute('href') || '',
          text: getName(a),
          visible: isVisible(a),
        }))
      : [];

    return {
      found: true,
      visible: isVisible(btn),
      text: getName(btn),
      expanded: btn.getAttribute('aria-expanded') === 'true',
      ariaExpanded: btn.getAttribute('aria-expanded'),
      controlsId,
      isFocused: document.activeElement === btn,
      academicsLinkHref: academicsLink ? academicsLink.getAttribute('href') : null,
      menuVisible,
      menuLinks,
      rect: {
        top: Number(r.top.toFixed(2)),
        left: Number(r.left.toFixed(2)),
        width: Number(r.width.toFixed(2)),
        height: Number(r.height.toFixed(2)),
        centerX: Number((r.left + r.width / 2).toFixed(2)),
        centerY: Number((r.top + r.height / 2).toFixed(2)),
      },
    };
  });
}

export async function findSkipLinkInfo(page) {
  return await page.evaluate(() => {
    const parseColor = (str) => {
      if (!str) return null;
      const m = str
        .trim()
        .toLowerCase()
        .match(/^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
      if (!m) return null;
      const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
      return {
        r: Math.round(parseFloat(m[1])),
        g: Math.round(parseFloat(m[2])),
        b: Math.round(parseFloat(m[3])),
        a: Number.isNaN(a) ? 1 : a,
      };
    };

    const blend = (fg, bg) => {
      const outA = fg.a + bg.a * (1 - fg.a);
      if (outA <= 0) return { r: 255, g: 255, b: 255, a: 0 };
      return {
        r: Math.round((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / outA),
        g: Math.round((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / outA),
        b: Math.round((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / outA),
        a: outA,
      };
    };

    const lum = (rgb) => {
      const lin = (c) => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
    };

    const skip =
      document.querySelector('a[href="#main"]') ||
      [...document.querySelectorAll('a')].find((a) =>
        /skip to (?:main )?content/i.test(a.textContent || '')
      );

    if (!skip) {
      return { found: false };
    }

    const r = skip.getBoundingClientRect();
    const cs = getComputedStyle(skip);
    const zNum = parseInt(cs.zIndex, 10);
    const visibleInViewport =
      r.width > 0 &&
      r.height > 0 &&
      r.top >= 0 &&
      r.left >= 0 &&
      r.bottom <= window.innerHeight &&
      r.right <= window.innerWidth;

    let hitTestOk = false;
    if (visibleInViewport) {
      const cx = Math.min(window.innerWidth - 1, Math.max(0, r.left + r.width / 2));
      const cy = Math.min(window.innerHeight - 1, Math.max(0, r.top + r.height / 2));
      const hit = document.elementFromPoint(cx, cy);
      hitTestOk = Boolean(hit && (hit === skip || skip.contains(hit)));
    }

    // Effective bg + fg contrast
    const layers = [];
    let cur = skip;
    while (cur && cur.nodeType === 1) {
      const c = parseColor(getComputedStyle(cur).backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 0.999) break;
      }
      cur = cur.parentElement;
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) bg = blend(layers[i], bg);
    const rawFg = parseColor(cs.color) || { r: 0, g: 0, b: 0, a: 1 };
    const fg = rawFg.a < 1 ? blend(rawFg, bg) : rawFg;
    const l1 = lum(fg);
    const l2 = lum(bg);
    const cr = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    return {
      found: true,
      href: skip.getAttribute('href') || '',
      text: (skip.textContent || '').replace(/\s+/g, ' ').trim(),
      isFocused: document.activeElement === skip,
      visibleInViewport,
      zIndex: Number.isNaN(zNum) ? 0 : zNum,
      position: cs.position,
      hitTestOk,
      fg: `rgb(${fg.r}, ${fg.g}, ${fg.b})`,
      bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
      contrastRatio: Number(cr.toFixed(2)),
      rect: {
        top: Number(r.top.toFixed(2)),
        left: Number(r.left.toFixed(2)),
        bottom: Number(r.bottom.toFixed(2)),
        right: Number(r.right.toFixed(2)),
        width: Number(r.width.toFixed(2)),
        height: Number(r.height.toFixed(2)),
      },
    };
  });
}

export async function checkAnchorNotOccluded(page, targetId) {
  const sticky = await findStickyNavInfo(page);
  const res = await page.evaluate(
    (id, stickyInfo) => {
      const el = document.getElementById(id);
      if (!el) {
        return { found: false, targetId: id };
      }
      const r = el.getBoundingClientRect();
      const stickyBottom = stickyInfo && stickyInfo.found ? stickyInfo.bottom : 0;
      const viewportHeight = window.innerHeight;
      return {
        found: true,
        targetId: id,
        targetTop: Number(r.top.toFixed(2)),
        targetBottom: Number(r.bottom.toFixed(2)),
        stickyFound: Boolean(stickyInfo && stickyInfo.found),
        stickyBottom: Number(stickyBottom.toFixed(2)),
        viewportHeight,
        scrollY: window.scrollY,
        unobstructed: r.top >= stickyBottom - 2 && r.top < viewportHeight,
      };
    },
    targetId,
    sticky
  );
  return res;
}

// ---------------------------------------------------------------------------
// Site Search Helpers
// ---------------------------------------------------------------------------

export async function findSearchTrigger(page) {
  return await page.evaluate(() => {
    const isVisible = (el) => {
      if (!el || el.hidden || el.closest('[hidden]')) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
        return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    const getName = (el) => {
      if (!el) return '';
      const al = el.getAttribute('aria-label');
      if (al) return al.trim();
      return (el.getAttribute('title') || el.textContent || '')
        .replace(/[→↗↓↑🔍]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const mainNav = document.querySelector('nav[aria-label="Main navigation"]');
    let stickyRoot = null;
    if (mainNav) {
      let cur = mainNav;
      while (cur && cur !== document.body) {
        const pos = getComputedStyle(cur).position;
        if (pos === 'sticky' || pos === 'fixed') {
          stickyRoot = cur;
          break;
        }
        cur = cur.parentElement;
      }
    }

    const containers = [stickyRoot, document.querySelector('header')].filter(Boolean);
    if (containers.length === 0) containers.push(document.body);

    // Prefer explicit #site-search-open button, then any visible Search button in nav/header.
    const explicit = document.getElementById('site-search-open');
    let buttonEl = explicit && isVisible(explicit) ? explicit : null;
    if (!buttonEl) {
      for (const scope of containers) {
        const btn = [...scope.querySelectorAll('button, [role="button"]')].find(
          (el) => isVisible(el) && /\bsearch\b/i.test(getName(el))
        );
        if (btn) {
          buttonEl = btn;
          break;
        }
      }
    }

    let linkEl = null;
    for (const scope of containers) {
      const a = [...scope.querySelectorAll('a[href]')].find(
        (el) =>
          isVisible(el) &&
          /(?:^|\/)search\.html(?:[?#]|$)/i.test(el.getAttribute('href') || '')
      );
      if (a) {
        linkEl = a;
        break;
      }
    }

    const primary = buttonEl || linkEl;
    if (!primary) {
      return { found: false, isButton: false, isLink: false };
    }

    const r = primary.getBoundingClientRect();
    return {
      found: true,
      isButton: Boolean(buttonEl),
      isLink: !buttonEl && Boolean(linkEl),
      hasLinkFallback: Boolean(linkEl),
      id: primary.id || '',
      text: getName(primary),
      href: linkEl ? linkEl.getAttribute('href') : null,
      isFocused: document.activeElement === primary,
      rect: {
        top: Number(r.top.toFixed(2)),
        left: Number(r.left.toFixed(2)),
        right: Number(r.right.toFixed(2)),
        bottom: Number(r.bottom.toFixed(2)),
        width: Number(r.width.toFixed(2)),
        height: Number(r.height.toFixed(2)),
        centerX: Number((r.left + r.width / 2).toFixed(2)),
        centerY: Number((r.top + r.height / 2).toFixed(2)),
      },
    };
  });
}

export async function getSearchDialogState(page) {
  return await page.evaluate(() => {
    const isVisible = (el) => {
      if (!el || el.hidden || el.closest('[hidden]')) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
        return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    const getName = (el) => {
      if (!el) return '';
      const al = el.getAttribute('aria-label');
      if (al) return al.trim();
      if (el.id) {
        const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (lbl) return lbl.textContent.replace(/\s+/g, ' ').trim();
      }
      return (el.getAttribute('title') || el.textContent || '')
        .replace(/[→↗↓↑✕×]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const dialog =
      [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].find(isVisible) ||
      [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(isVisible) ||
      null;

    if (!dialog) {
      return {
        open: false,
        ariaModal: false,
        inputFocused: false,
        inputValue: '',
        results: [],
        categories: [],
        statusText: '',
        hasLiveRegion: false,
      };
    }

    const inputs = [
      ...dialog.querySelectorAll('input[type="search"], input[type="text"], input:not([type])'),
    ].filter(isVisible);
    const input =
      inputs.find((el) => /search/i.test(`${getName(el)} ${el.placeholder || ''}`)) ||
      inputs[0] ||
      null;

    // Result links
    let resultLinks = [
      ...dialog.querySelectorAll(
        '[role="listbox"] a[href], [role="list"] a[href], [data-search-results] a[href], ol a[href], ul a[href]'
      ),
    ].filter((a) => isVisible(a) && !a.closest('[role="tablist"]'));

    if (resultLinks.length === 0) {
      resultLinks = [...dialog.querySelectorAll('a[href]')].filter(
        (a) =>
          isVisible(a) &&
          !a.closest('[role="tablist"]') &&
          !(a.getAttribute('href') || '').startsWith('#')
      );
    }

    const results = resultLinks.map((a) => ({
      href: a.href,
      rawHref: a.getAttribute('href') || '',
      text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
      isFocused: document.activeElement === a,
      ariaSelected: a.getAttribute('aria-selected') === 'true',
    }));

    // Category controls (tabs, aria-pressed buttons, or select)
    const categories = [];
    const tabBtns = [...dialog.querySelectorAll('button[role="tab"], [role="tablist"] button')].filter(
      isVisible
    );
    if (tabBtns.length > 0) {
      for (const b of tabBtns) {
        categories.push({
          tag: 'button',
          text: getName(b),
          active:
            b.getAttribute('aria-selected') === 'true' ||
            b.getAttribute('aria-pressed') === 'true',
        });
      }
    } else {
      const pressedBtns = [
        ...dialog.querySelectorAll('button[aria-pressed], button[data-category]'),
      ].filter((b) => isVisible(b) && !/^(close|clear|reset|search|submit)$/i.test(getName(b)));
      if (pressedBtns.length > 0) {
        for (const b of pressedBtns) {
          categories.push({
            tag: 'button',
            text: getName(b),
            active: b.getAttribute('aria-pressed') === 'true',
          });
        }
      } else {
        const sel = [...dialog.querySelectorAll('select')].find(
          (s) => isVisible(s) && /category|filter|type/i.test(getName(s))
        );
        if (sel) {
          for (const opt of sel.options) {
            categories.push({
              tag: 'option',
              text: opt.textContent.trim(),
              active: opt.selected,
            });
          }
        }
      }
    }

    const liveEl =
      dialog.querySelector('[role="status"], [aria-live="polite"], [aria-live="assertive"]') ||
      null;

    return {
      open: true,
      ariaModal: dialog.getAttribute('aria-modal') === 'true',
      role: dialog.getAttribute('role') || dialog.tagName.toLowerCase(),
      hasInput: Boolean(input),
      inputFocused: Boolean(input && document.activeElement === input),
      inputValue: input ? input.value : '',
      focusInsideDialog: dialog.contains(document.activeElement),
      results,
      categories,
      statusText: liveEl ? (liveEl.textContent || '').replace(/\s+/g, ' ').trim() : '',
      hasLiveRegion: Boolean(liveEl),
      dialogText: (dialog.textContent || '').replace(/\s+/g, ' ').trim(),
    };
  });
}

export async function openSiteSearch(page, method = 'click') {
  if (method === 'click') {
    const trig = await findSearchTrigger(page);
    if (!trig.found || !trig.isButton) {
      throw new Error('Site Search button trigger not found in sticky nav or header');
    }
    await page.clickAt(trig.rect.centerX, trig.rect.centerY);
  } else if (method === '/') {
    await page.pressKey('/');
  } else if (method === 'ctrl+k') {
    await page.pressKey('k', { ctrl: true });
  } else {
    throw new Error(`Unsupported openSiteSearch method: ${method}`);
  }

  await page.waitFor(
    () => {
      const dlg =
        [...document.querySelectorAll('[role="dialog"], dialog[open]')].find((el) => {
          if (el.hidden || el.closest('[hidden]')) return false;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
      return Boolean(dlg);
    },
    { timeoutMs: 4000, message: `Site Search dialog did not open via "${method}"` }
  );

  return await getSearchDialogState(page);
}

export async function fillSiteSearch(page, query, { inDialog = true } = {}) {
  const focusOk = await page.evaluate((useDialog) => {
    const isVisible = (el) => {
      if (!el || el.hidden || el.closest('[hidden]')) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    const container = useDialog
      ? [...document.querySelectorAll('[role="dialog"], dialog[open]')].find(isVisible)
      : document.querySelector('main');
    if (!container) return { ok: false, reason: useDialog ? 'No open search dialog' : 'No <main>' };

    const inputs = [
      ...container.querySelectorAll('input[type="search"], input[type="text"], input:not([type])'),
    ].filter(isVisible);
    const input = inputs[0];
    if (!input) return { ok: false, reason: 'No visible search input found' };

    input.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    input.focus();
    return { ok: document.activeElement === input };
  }, inDialog);

  if (!focusOk || !focusOk.ok) {
    throw new Error(`Could not focus site search input: ${focusOk?.reason || 'focus failed'}`);
  }

  await page.pressKey('a', { ctrl: true });
  await page.pressKey('Backspace');
  const str = query === null || query === undefined ? '' : String(query);
  if (str.length > 0) {
    await page.typeText(str);
  }
  await page.evaluate(() => {
    const el = document.activeElement;
    if (el && 'value' in el) {
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}

export async function getSearchPageState(page) {
  return await page.evaluate(() => {
    const isVisible = (el) => {
      if (!el || el.hidden || el.closest('[hidden]')) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
        return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    const getName = (el) => {
      if (!el) return '';
      const al = el.getAttribute('aria-label');
      if (al) return al.trim();
      if (el.id) {
        const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (lbl) return lbl.textContent.replace(/\s+/g, ' ').trim();
      }
      return (el.getAttribute('title') || el.textContent || '')
        .replace(/[→↗↓↑✕×]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const main = document.querySelector('main');
    if (!main) {
      return {
        hasInput: false,
        inputValue: '',
        results: [],
        categories: [],
        statusText: '',
        hasLiveRegion: false,
        noscriptText: '',
        mainText: '',
      };
    }

    const inputs = [
      ...main.querySelectorAll('input[type="search"], input[type="text"], input:not([type])'),
    ].filter(isVisible);
    const input =
      inputs.find((el) => /search/i.test(`${getName(el)} ${el.placeholder || ''}`)) ||
      inputs[0] ||
      null;

    const resultLinks = [
      ...main.querySelectorAll(
        '[data-search-results] a[href], [role="list"] a[href], [role="listbox"] a[href], ol a[href], ul a[href], article a[href]'
      ),
    ].filter(
      (a) =>
        isVisible(a) &&
        !a.closest('nav[aria-label="Breadcrumb"]') &&
        !a.closest('nav[aria-label="On this page"]') &&
        !a.closest('[role="tablist"]')
    );

    const results = resultLinks.map((a) => ({
      href: a.href,
      rawHref: a.getAttribute('href') || '',
      text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
    }));

    const categories = [];
    const tabBtns = [
      ...main.querySelectorAll('button[role="tab"], [role="tablist"] button, button[aria-pressed], button[data-category]'),
    ].filter((b) => isVisible(b) && !/^(clear|reset|search|submit)$/i.test(getName(b)));
    for (const b of tabBtns) {
      categories.push({
        tag: 'button',
        text: getName(b),
        active:
          b.getAttribute('aria-selected') === 'true' ||
          b.getAttribute('aria-pressed') === 'true',
      });
    }

    const liveEl = main.querySelector('[role="status"], [aria-live="polite"], [aria-live="assertive"]');
    const noscriptEl = main.querySelector('noscript');

    return {
      hasInput: Boolean(input),
      inputValue: input ? input.value : '',
      results,
      categories,
      statusText: liveEl ? (liveEl.textContent || '').replace(/\s+/g, ' ').trim() : '',
      hasLiveRegion: Boolean(liveEl),
      noscriptText: noscriptEl ? (noscriptEl.textContent || '').replace(/\s+/g, ' ').trim() : '',
      mainText: (main.textContent || '').replace(/\s+/g, ' ').trim(),
    };
  });
}

// ---------------------------------------------------------------------------
// Faculty Explorer (people.html) Helpers
// ---------------------------------------------------------------------------

export async function getFacultyExplorerState(page) {
  return await page.evaluate((curatedTopics) => {
    const isVisible = (el) => {
      if (!el || el.hidden || el.closest('[hidden]')) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
        return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    const isRendered = (el) => {
      if (!el || el.hidden || el.closest('[hidden]')) return false;
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    };

    const getName = (el) => {
      if (!el) return '';
      const al = el.getAttribute('aria-label');
      if (al) return al.trim();
      const lb = el.getAttribute('aria-labelledby');
      if (lb) {
        const t = lb
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent || '')
          .join(' ')
          .trim();
        if (t) return t;
      }
      if (el.id) {
        const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (lbl) return lbl.textContent.replace(/\s+/g, ' ').trim();
      }
      const parentLabel = el.closest('label');
      if (parentLabel) return parentLabel.textContent.replace(/\s+/g, ' ').trim();
      return (el.getAttribute('title') || el.textContent || '')
        .replace(/[→↗↓↑✕×]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const main = document.querySelector('main') || document.body;
    const h1 = document.querySelector('h1');

    const textInputs = [
      ...main.querySelectorAll('input[type="search"], input[type="text"], input:not([type])'),
    ].filter(isVisible);

    // Partial-name input: #people-name OR labeled/placeholder matching /\bname\b/i and NOT topic/keyword
    let nameInput = document.getElementById('people-name');
    if (nameInput && !isVisible(nameInput)) nameInput = null;
    if (!nameInput) {
      nameInput =
        textInputs.find((el) => {
          const desc = `${getName(el)} ${el.placeholder || ''}`;
          return /\bname\b/i.test(desc) && !/\b(topic|research\s*area|keyword)\b/i.test(desc);
        }) || null;
    }

    // Topic/research-area text input: #people-topic-search OR labeled/placeholder matching topic/research
    let topicInput = document.getElementById('people-topic-search');
    if (topicInput && !isVisible(topicInput)) topicInput = null;
    if (!topicInput) {
      topicInput =
        textInputs.find((el) => {
          if (el === nameInput) return false;
          const desc = `${getName(el)} ${el.placeholder || ''}`;
          return /topic|research\s*(area|interest|topic)|expertise/i.test(desc);
        }) || null;
    }

    // Scopes (buttons/tabs OR select#people-category)
    const scopeBtns = [
      ...main.querySelectorAll('button[aria-pressed], [role="tab"], button[data-category], button[data-scope]'),
    ].filter((b) => {
      if (!isVisible(b)) return false;
      const t = getName(b);
      return /^(faculty|graduate students?|emeriti(?: faculty)?|staff|alumni|all(?: people)?)\b/i.test(t);
    });

    const scopes = [];
    if (scopeBtns.length > 0) {
      for (const b of scopeBtns) {
        scopes.push({
          kind: 'button',
          label: getName(b),
          active:
            b.getAttribute('aria-pressed') === 'true' ||
            b.getAttribute('aria-selected') === 'true',
        });
      }
    } else {
      const catSelect =
        document.getElementById('people-category') ||
        [...main.querySelectorAll('select')].find((s) =>
          /category|directory|scope|role/i.test(getName(s))
        );
      if (catSelect) {
        for (const opt of catSelect.options) {
          scopes.push({
            kind: 'select',
            label: opt.textContent.replace(/\s+/g, ' ').trim(),
            value: opt.value,
            active: opt.selected,
          });
        }
      }
    }

    // Topic filter chips outside person cards
    const topicRegexes = curatedTopics.map((t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    const chipEls = [...main.querySelectorAll('button, a, input[type="checkbox"]')].filter((el) => {
      if (!isVisible(el) || el.closest('[id^="person-"]')) return false;
      const t = getName(el);
      return topicRegexes.some((re) => re.test(t));
    });
    const topicChips = chipEls.map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: getName(el),
      active:
        el.getAttribute('aria-pressed') === 'true' ||
        el.getAttribute('aria-current') === 'true' ||
        Boolean(el.checked),
    }));

    // Person cards
    const allCards = [...document.querySelectorAll('[id^="person-"]')];
    const visibleCards = allCards.filter(isRendered);
    const visibleSlugs = visibleCards.map((el) => el.id.replace(/^person-/, ''));

    // Live status region
    const liveEl = main.querySelector('[role="status"], [aria-live="polite"], [aria-live="assertive"]');

    // Empty-state recovery controls
    const recoveryButtons = [...main.querySelectorAll('button')]
      .filter((b) => isVisible(b) && /clear|reset|show all|all people/i.test(getName(b)))
      .map((b) => ({
        id: b.id || '',
        text: getName(b),
      }));

    return {
      title: document.title || '',
      h1Text: h1 ? h1.textContent.replace(/\s+/g, ' ').trim() : '',
      hasNameInput: Boolean(nameInput),
      nameInputId: nameInput ? nameInput.id || '' : '',
      nameInputValue: nameInput ? nameInput.value : '',
      hasTopicInput: Boolean(topicInput),
      topicInputId: topicInput ? topicInput.id || '' : '',
      topicInputValue: topicInput ? topicInput.value : '',
      topicInputDisabled: topicInput ? Boolean(topicInput.disabled) : false,
      scopes,
      topicChips,
      visibleSlugs,
      visibleCount: visibleSlugs.length,
      totalCards: allCards.length,
      statusText: liveEl ? (liveEl.textContent || '').replace(/\s+/g, ' ').trim() : '',
      hasLiveRegion: Boolean(liveEl),
      recoveryButtons,
    };
  }, CURATED_FACULTY_TOPICS);
}

export async function selectPeopleScope(page, label) {
  const result = await page.evaluate((targetLabel) => {
    const isVisible = (el) => {
      if (!el || el.hidden || el.closest('[hidden]')) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
        return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    const getName = (el) => {
      if (!el) return '';
      const al = el.getAttribute('aria-label');
      if (al) return al.trim();
      return (el.getAttribute('title') || el.textContent || '')
        .replace(/[→↗↓↑✕×]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const esc = targetLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^${esc}(?:\\b|\\s*\\(|\\s+\\d)`, 'i');
    const isAllTarget = /^all(?:\s+people)?$/i.test(targetLabel.trim());

    const main = document.querySelector('main') || document.body;
    const btns = [
      ...main.querySelectorAll('button[aria-pressed], [role="tab"], button[data-category], button[data-scope]'),
    ].filter(isVisible);

    const matchBtn = btns.find((b) => {
      const name = getName(b);
      if (re.test(name)) return true;
      if (isAllTarget && /^all(?:\s+people)?(?:\b|\s*\(|\s+\d)/i.test(name)) return true;
      return false;
    });

    if (matchBtn) {
      matchBtn.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
      const r = matchBtn.getBoundingClientRect();
      return {
        mode: 'click',
        x: Math.max(1, Math.min(window.innerWidth - 1, r.left + r.width / 2)),
        y: Math.max(1, Math.min(window.innerHeight - 1, r.top + r.height / 2)),
      };
    }

    const select =
      document.getElementById('people-category') ||
      [...main.querySelectorAll('select')].find((s) =>
        isVisible(s) && /category|directory|scope/i.test(getName(s))
      );

    if (select) {
      const opt = [...select.options].find((o) => {
        const t = o.textContent.replace(/\s+/g, ' ').trim();
        if (re.test(t) || o.value.toLowerCase() === targetLabel.toLowerCase()) return true;
        if (isAllTarget && (o.value === '' || /^all/i.test(t))) return true;
        return false;
      });
      if (!opt) {
        return { mode: 'error', reason: `Scope option "${targetLabel}" not found in <select>` };
      }
      select.value = opt.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { mode: 'select', value: opt.value };
    }

    return { mode: 'error', reason: `No scope tab or select found for "${targetLabel}"` };
  }, label);

  if (result.mode === 'error') {
    throw new Error(result.reason);
  }
  if (result.mode === 'click') {
    await page.clickAt(result.x, result.y);
  } else {
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
  }
}

export async function setPeopleNameQuery(page, value) {
  const focusRes = await page.evaluate(() => {
    const isVisible = (el) => {
      if (!el || el.hidden || el.closest('[hidden]')) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const getName = (el) => {
      if (!el) return '';
      const al = el.getAttribute('aria-label');
      if (al) return al.trim();
      if (el.id) {
        const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (lbl) return lbl.textContent.replace(/\s+/g, ' ').trim();
      }
      const pl = el.closest('label');
      return pl ? pl.textContent.replace(/\s+/g, ' ').trim() : '';
    };

    const main = document.querySelector('main') || document.body;
    let input = document.getElementById('people-name');
    if (input && !isVisible(input)) input = null;
    if (!input) {
      const inputs = [
        ...main.querySelectorAll('input[type="search"], input[type="text"], input:not([type])'),
      ].filter(isVisible);
      input =
        inputs.find((el) => {
          const desc = `${getName(el)} ${el.placeholder || ''}`;
          return /\bname\b/i.test(desc) && !/\b(topic|research\s*area|keyword)\b/i.test(desc);
        }) || null;
    }

    if (!input) {
      return { ok: false, reason: 'Dedicated partial-name input not found on people.html' };
    }
    input.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    input.focus();
    return { ok: document.activeElement === input };
  });

  if (!focusRes || !focusRes.ok) {
    throw new Error(focusRes?.reason || 'Failed to focus partial-name input');
  }

  await page.pressKey('a', { ctrl: true });
  await page.pressKey('Backspace');
  const str = value === null || value === undefined ? '' : String(value);
  if (str.length > 0) {
    await page.typeText(str);
  }
  await page.evaluate(() => {
    const el = document.activeElement;
    if (el && 'value' in el) el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

export async function setPeopleTopicQuery(page, value) {
  const focusRes = await page.evaluate(() => {
    const isVisible = (el) => {
      if (!el || el.hidden || el.closest('[hidden]')) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const getName = (el) => {
      if (!el) return '';
      const al = el.getAttribute('aria-label');
      if (al) return al.trim();
      if (el.id) {
        const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (lbl) return lbl.textContent.replace(/\s+/g, ' ').trim();
      }
      const pl = el.closest('label');
      return pl ? pl.textContent.replace(/\s+/g, ' ').trim() : '';
    };

    const main = document.querySelector('main') || document.body;
    const inputs = [
      ...main.querySelectorAll('input[type="search"], input[type="text"], input:not([type])'),
    ].filter(isVisible);

    const nameInput =
      document.getElementById('people-name') ||
      inputs.find((el) => {
        const desc = `${getName(el)} ${el.placeholder || ''}`;
        return /\bname\b/i.test(desc) && !/\b(topic|research\s*area|keyword)\b/i.test(desc);
      }) ||
      null;

    let input = document.getElementById('people-topic-search');
    if (input && !isVisible(input)) input = null;
    if (!input) {
      input =
        inputs.find((el) => {
          if (el === nameInput) return false;
          const desc = `${getName(el)} ${el.placeholder || ''}`;
          return /topic|research\s*(area|interest|topic)|expertise/i.test(desc);
        }) || null;
    }

    if (!input) {
      return { ok: false, reason: 'Dedicated topic/research-area input not found on people.html' };
    }
    if (input.disabled) {
      return { ok: false, reason: 'Topic/research-area input is disabled' };
    }
    input.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    input.focus();
    return { ok: document.activeElement === input };
  });

  if (!focusRes || !focusRes.ok) {
    throw new Error(focusRes?.reason || 'Failed to focus topic/research-area input');
  }

  await page.pressKey('a', { ctrl: true });
  await page.pressKey('Backspace');
  const str = value === null || value === undefined ? '' : String(value);
  if (str.length > 0) {
    await page.typeText(str);
  }
  await page.evaluate(() => {
    const el = document.activeElement;
    if (el && 'value' in el) el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

export async function clickTopicChip(page, labelPattern) {
  const patternSource = labelPattern instanceof RegExp ? labelPattern.source : String(labelPattern);
  const patternFlags = labelPattern instanceof RegExp ? labelPattern.flags : 'i';

  const pt = await page.evaluate(
    (src, flags) => {
      const re = new RegExp(src, flags);
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
      const chip = [...main.querySelectorAll('button, a, input[type="checkbox"]')].find((el) => {
        if (!isVisible(el) || el.closest('[id^="person-"]')) return false;
        const label = (el.getAttribute('aria-label') || el.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();
        return re.test(label);
      });
      if (!chip) return { found: false };
      chip.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
      const r = chip.getBoundingClientRect();
      return {
        found: true,
        text: (chip.textContent || '').replace(/\s+/g, ' ').trim(),
        x: Math.max(1, Math.min(window.innerWidth - 1, r.left + r.width / 2)),
        y: Math.max(1, Math.min(window.innerHeight - 1, r.top + r.height / 2)),
      };
    },
    patternSource,
    patternFlags
  );

  if (!pt || !pt.found) {
    throw new Error(`Clickable topic filter chip matching /${patternSource}/${patternFlags} not found`);
  }
  await page.clickAt(pt.x, pt.y);
  return pt.text;
}

export async function clickCardTopicTag(page, slug, labelPattern = null) {
  const patternSource =
    labelPattern instanceof RegExp
      ? labelPattern.source
      : labelPattern
        ? String(labelPattern)
        : '';
  const patternFlags = labelPattern instanceof RegExp ? labelPattern.flags : 'i';

  const pt = await page.evaluate(
    (cardSlug, src, flags) => {
      const re = src ? new RegExp(src, flags) : null;
      const isVisible = (el) => {
        if (!el || el.hidden || el.closest('[hidden]')) return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
          return false;
        }
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const card = document.getElementById(`person-${cardSlug}`);
      if (!card) return { found: false, reason: `Card #person-${cardSlug} not found` };

      const interactives = [
        ...card.querySelectorAll('ul button, ul a, button[data-topic], button[data-area], a[href*="topic"], a[href*="area"]'),
      ].filter(isVisible);

      const target = re
        ? interactives.find((el) => re.test((el.textContent || '').replace(/\s+/g, ' ').trim()))
        : interactives[0];

      if (!target) {
        return {
          found: false,
          reason: `No clickable topic tag found inside #person-${cardSlug}`,
        };
      }
      target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
      const r = target.getBoundingClientRect();
      return {
        found: true,
        text: (target.textContent || '').replace(/\s+/g, ' ').trim(),
        x: Math.max(1, Math.min(window.innerWidth - 1, r.left + r.width / 2)),
        y: Math.max(1, Math.min(window.innerHeight - 1, r.top + r.height / 2)),
      };
    },
    slug,
    patternSource,
    patternFlags
  );

  if (!pt || !pt.found) {
    throw new Error(pt?.reason || `Clickable card topic tag not found on #person-${slug}`);
  }
  await page.clickAt(pt.x, pt.y);
  return pt.text;
}

// ---------------------------------------------------------------------------
// Courses (courses.html) Helpers
// ---------------------------------------------------------------------------

export async function getVisibleCourses(page) {
  return await page.evaluate(() => {
    const isRendered = (el) => {
      if (!el || el.hidden || el.closest('[hidden]')) return false;
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    };

    const CODE_RE = /\b(?:ISSP|INFSCI|BIOST|BIOINF|CS|CMPINF|STAT|BMFI|LING|PSY|LAW|ECE|IE|HIM|FTDJ|SMSJ)\s+\d{4}\b/;
    const structuredRows = [
      ...document.querySelectorAll('main tr[data-course-code], #course-table tbody tr'),
    ].filter(isRendered);

    const candidates =
      structuredRows.length > 0
        ? structuredRows
        : [
            ...document.querySelectorAll(
              'main tbody tr, main article, main [data-course-code], main [data-course]'
            ),
          ].filter((el) => isRendered(el) && CODE_RE.test(el.textContent || ''));

    const leaves = candidates.filter(
      (el) => !candidates.some((other) => other !== el && el.contains(other))
    );

    return leaves.map((el) => {
      const cells = [...el.querySelectorAll('td, th')];
      const rawText =
        cells.length > 0
          ? cells.map((c) => c.textContent || '').join(' | ')
          : el.textContent || '';
      const text = rawText.replace(/\s+/g, ' ').trim();
      const m = text.match(CODE_RE);
      const code = (el.dataset && el.dataset.courseCode) || (m ? m[0] : '');
      return {
        code,
        text,
        hrefs: [...el.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || ''),
      };
    });
  });
}

export async function setCourseFilter(page, { degree, track, group, query } = {}) {
  const applyFacet = async (facetLabelReSource, value) => {
    const res = await page.evaluate(
      (labelReSrc, val) => {
        const isVisible = (el) => {
          if (!el || el.hidden || el.closest('[hidden]')) return false;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        };
        const getName = (el) => {
          if (!el) return '';
          const al = el.getAttribute('aria-label');
          if (al) return al.trim();
          if (el.id) {
            const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
            if (lbl) return lbl.textContent.replace(/\s+/g, ' ').trim();
          }
          const pl = el.closest('label');
          if (pl) return pl.textContent.replace(/\s+/g, ' ').trim();
          return (el.getAttribute('title') || el.textContent || '').replace(/\s+/g, ' ').trim();
        };

        const labelRe = new RegExp(labelReSrc, 'i');
        const valEsc = String(val).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const valRe = new RegExp(`^${valEsc}$|\\b${valEsc}\\b`, 'i');
        const main = document.querySelector('main') || document.body;

        // 1. Try <select> matching label/id or containing matching option
        const selects = [...main.querySelectorAll('select')].filter(isVisible);
        let select = selects.find((s) => labelRe.test(`${getName(s)} ${s.id || ''} ${s.name || ''}`));
        if (!select) {
          select = selects.find((s) =>
            [...s.options].some((o) => valRe.test(o.textContent.trim()) || valRe.test(o.value))
          );
        }
        if (select) {
          const opt =
            [...select.options].find(
              (o) =>
                o.value.toLowerCase() === String(val).toLowerCase() ||
                o.textContent.trim().toLowerCase() === String(val).toLowerCase()
            ) ||
            [...select.options].find(
              (o) => valRe.test(o.textContent.trim()) || valRe.test(o.value)
            );
          if (opt) {
            select.value = opt.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return { mode: 'select', value: opt.value };
          }
        }

        // 2. Fallback: button[aria-pressed], [role="tab"], or radio label
        const btn = [
          ...main.querySelectorAll('button[aria-pressed], [role="tab"], label'),
        ].find((el) => isVisible(el) && valRe.test(getName(el)));

        if (btn) {
          btn.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
          const r = btn.getBoundingClientRect();
          return {
            mode: 'click',
            x: Math.max(1, Math.min(window.innerWidth - 1, r.left + r.width / 2)),
            y: Math.max(1, Math.min(window.innerHeight - 1, r.top + r.height / 2)),
          };
        }

        return { mode: 'error', reason: `Course filter control for "${val}" not found` };
      },
      facetLabelReSource,
      value
    );

    if (res.mode === 'error') {
      throw new Error(res.reason);
    }
    if (res.mode === 'click') {
      await page.clickAt(res.x, res.y);
    } else {
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    }
  };

  if (degree !== undefined) {
    await applyFacet('degree|program', degree);
  }
  if (track !== undefined) {
    await applyFacet('track', track);
  }
  if (group !== undefined) {
    await applyFacet('group|requirement|category', group);
  }

  if (query !== undefined) {
    const focusRes = await page.evaluate(() => {
      const isVisible = (el) => {
        if (!el || el.hidden || el.closest('[hidden]')) return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const getName = (el) => {
        if (!el) return '';
        const al = el.getAttribute('aria-label');
        if (al) return al.trim();
        if (el.id) {
          const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (lbl) return lbl.textContent.replace(/\s+/g, ' ').trim();
        }
        return el.placeholder || '';
      };
      const main = document.querySelector('main') || document.body;
      const inputs = [
        ...main.querySelectorAll('input[type="search"], input[type="text"], input:not([type])'),
      ].filter(isVisible);
      const input =
        inputs.find((el) => /search|course|code|keyword|filter/i.test(`${getName(el)} ${el.placeholder || ''}`)) ||
        inputs[0] ||
        null;
      if (!input) return { ok: false, reason: 'Course search input not found in <main>' };
      input.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
      input.focus();
      return { ok: document.activeElement === input };
    });

    if (!focusRes || !focusRes.ok) {
      throw new Error(focusRes?.reason || 'Failed to focus course search input');
    }

    await page.pressKey('a', { ctrl: true });
    await page.pressKey('Backspace');
    const str = query === null ? '' : String(query);
    if (str.length > 0) {
      await page.typeText(str);
    }
    await page.evaluate(() => {
      const el = document.activeElement;
      if (el && 'value' in el) el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
}
