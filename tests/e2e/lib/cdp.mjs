/**
 * Zero-dependency Chrome DevTools Protocol (CDP) client built on Node 24's
 * native WebSocket. Provides isolated Browser/Page targets, deterministic
 * navigation (handling both full loads and same-document #hash changes),
 * real CDP keyboard/mouse input, viewport/media/no-JS emulation, and
 * same-origin vs external request/console diagnostics.
 */

const DEFAULT_COMMAND_TIMEOUT_MS = 15000;

const SPECIAL_KEYS = {
  Tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
  Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
  Esc: { key: 'Escape', code: 'Escape', keyCode: 27 },
  Space: { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
  ' ': { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
  Backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
  Delete: { key: 'Delete', code: 'Delete', keyCode: 46 },
  ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  Home: { key: 'Home', code: 'Home', keyCode: 36 },
  End: { key: 'End', code: 'End', keyCode: 35 },
  '/': { key: '/', code: 'Slash', keyCode: 191, text: '/' },
  '-': { key: '-', code: 'Minus', keyCode: 189, text: '-' },
  '.': { key: '.', code: 'Period', keyCode: 190, text: '.' },
  ',': { key: ',', code: 'Comma', keyCode: 188, text: ',' },
  ';': { key: ';', code: 'Semicolon', keyCode: 186, text: ';' },
  '=': { key: '=', code: 'Equal', keyCode: 187, text: '=' },
};

function resolveKeySpec(key, modifiers = {}) {
  const shift = Boolean(modifiers.shift);
  if (Object.prototype.hasOwnProperty.call(SPECIAL_KEYS, key)) {
    const spec = SPECIAL_KEYS[key];
    return {
      key: spec.key,
      code: spec.code,
      windowsVirtualKeyCode: spec.keyCode,
      nativeVirtualKeyCode: spec.keyCode,
      text: spec.text ?? null,
    };
  }
  if (typeof key === 'string' && key.length === 1) {
    const upper = key.toUpperCase();
    const codePoint = upper.charCodeAt(0);
    if (codePoint >= 65 && codePoint <= 90) {
      const charOut = shift ? upper : key;
      return {
        key: charOut,
        code: `Key${upper}`,
        windowsVirtualKeyCode: codePoint,
        nativeVirtualKeyCode: codePoint,
        text: charOut,
      };
    }
    if (codePoint >= 48 && codePoint <= 57) {
      return {
        key,
        code: `Digit${key}`,
        windowsVirtualKeyCode: codePoint,
        nativeVirtualKeyCode: codePoint,
        text: key,
      };
    }
    return {
      key,
      code: '',
      windowsVirtualKeyCode: key.charCodeAt(0),
      nativeVirtualKeyCode: key.charCodeAt(0),
      text: key,
    };
  }
  throw new Error(`Unsupported key in pressKey(): ${JSON.stringify(key)}`);
}

function sleep(ms) {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    if (typeof t.unref === 'function') t.unref();
  });
}

function stripHash(urlStr) {
  try {
    const u = new URL(urlStr);
    u.hash = '';
    return u.href;
  } catch {
    return String(urlStr || '').split('#')[0];
  }
}

export class Browser {
  constructor(ws, wsUrl, { commandTimeoutMs = DEFAULT_COMMAND_TIMEOUT_MS } = {}) {
    this._ws = ws;
    this.wsUrl = wsUrl;
    this._commandTimeoutMs = commandTimeoutMs;
    this._nextId = 1;
    this._pending = new Map();
    this._listeners = new Map();
    this._pages = new Set();
    this._closed = false;

    this._onMessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));
      } catch {
        return;
      }

      if (msg.id !== undefined) {
        const entry = this._pending.get(msg.id);
        if (!entry) return;
        clearTimeout(entry.timer);
        this._pending.delete(msg.id);
        if (msg.error) {
          entry.reject(
            new Error(
              `CDP ${entry.method} failed (${msg.error.code}): ${msg.error.message}`
            )
          );
        } else {
          entry.resolve(msg.result || {});
        }
        return;
      }

      if (msg.method) {
        const key = `${msg.sessionId || ''}:${msg.method}`;
        const set = this._listeners.get(key);
        if (set) {
          for (const fn of [...set]) {
            try {
              fn(msg.params || {}, msg);
            } catch {
              // Never allow listener errors to break the CDP message loop.
            }
          }
        }
      }
    };

    this._onClose = (event) => {
      this._closed = true;
      const reason = `CDP WebSocket closed (code=${event?.code ?? 'unknown'})`;
      for (const [id, entry] of this._pending.entries()) {
        clearTimeout(entry.timer);
        this._pending.delete(id);
        entry.reject(new Error(`${reason} while waiting for ${entry.method}`));
      }
    };

    this._ws.addEventListener('message', this._onMessage);
    this._ws.addEventListener('close', this._onClose);
    this._ws.addEventListener('error', () => {
      // 'close' event immediately follows and rejects all pending RPCs.
    });
  }

  static async connect(wsUrl = process.env.E2E_WS_URL, opts = {}) {
    return connectBrowser(wsUrl, opts);
  }

  send(method, params = {}, sessionId = undefined, timeoutMs = this._commandTimeoutMs) {
    if (this._closed || this._ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(
        new Error(`Cannot send CDP ${method}: WebSocket is not open (state=${this._ws.readyState})`)
      );
    }

    const id = this._nextId++;
    const payload = sessionId
      ? { id, method, params, sessionId }
      : { id, method, params };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pending.delete(id);
        reject(new Error(`CDP command timed out after ${timeoutMs}ms: ${method}`));
      }, timeoutMs);
      if (typeof timer.unref === 'function') timer.unref();

      this._pending.set(id, { resolve, reject, timer, method });
      try {
        this._ws.send(JSON.stringify(payload));
      } catch (err) {
        clearTimeout(timer);
        this._pending.delete(id);
        reject(err);
      }
    });
  }

  on(sessionId, method, handler) {
    const key = `${sessionId || ''}:${method}`;
    let set = this._listeners.get(key);
    if (!set) {
      set = new Set();
      this._listeners.set(key, set);
    }
    set.add(handler);
    return () => {
      const existing = this._listeners.get(key);
      if (existing) {
        existing.delete(handler);
        if (existing.size === 0) this._listeners.delete(key);
      }
    };
  }

  waitForEvent(sessionId, method, { predicate = null, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS } = {}) {
    let settled = false;
    let unsubscribe = null;
    let timer = null;

    let resolveFn;
    let rejectFn;
    const promise = new Promise((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };

    unsubscribe = this.on(sessionId, method, (params) => {
      if (settled) return;
      if (predicate && !predicate(params)) return;
      settled = true;
      cleanup();
      resolveFn(params);
    });

    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      rejectFn(new Error(`Timed out after ${timeoutMs}ms waiting for CDP event ${method}`));
    }, timeoutMs);
    if (typeof timer.unref === 'function') timer.unref();

    const cancel = () => {
      if (settled) return;
      settled = true;
      cleanup();
    };

    return { promise, cancel };
  }

  async newPage({
    width = 1440,
    height = 900,
    mobile = undefined,
    deviceScaleFactor = 1,
    reducedMotion = false,
    javascriptEnabled = true,
    baseUrl = process.env.E2E_BASE_URL,
  } = {}) {
    const { targetId } = await this.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await this.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });

    const page = new Page(this, targetId, sessionId, { baseUrl });
    this._pages.add(page);

    try {
      await Promise.all([
        page.send('Page.enable'),
        page.send('Runtime.enable'),
        page.send('Network.enable'),
        page.send('Log.enable'),
      ]);

      // Apply viewport, reduced-motion, and script-disabled emulation BEFORE navigation.
      const effectiveMobile = mobile === undefined ? width <= 760 : Boolean(mobile);
      await page.setViewport(width, height, {
        mobile: effectiveMobile,
        deviceScaleFactor,
        waitForFrame: false,
      });

      if (reducedMotion) {
        await page.setReducedMotion(true);
      }

      if (javascriptEnabled === false) {
        await page.setJavaScriptEnabled(false);
      }

      page._attachDiagnosticListeners();
      return page;
    } catch (err) {
      await page.close().catch(() => {});
      throw err;
    }
  }

  async close() {
    if (this._closed && this._ws.readyState === WebSocket.CLOSED) return;

    for (const page of [...this._pages]) {
      await page.close().catch(() => {});
    }
    this._pages.clear();

    if (
      this._ws.readyState === WebSocket.OPEN ||
      this._ws.readyState === WebSocket.CONNECTING
    ) {
      await new Promise((resolve) => {
        const done = () => {
          clearTimeout(fallbackTimer);
          resolve();
        };
        const fallbackTimer = setTimeout(done, 1500);
        if (typeof fallbackTimer.unref === 'function') fallbackTimer.unref();
        this._ws.addEventListener('close', done, { once: true });
        try {
          this._ws.close();
        } catch {
          done();
        }
      });
    }
    this._closed = true;
  }
}

export async function connectBrowser(
  wsUrl = process.env.E2E_WS_URL,
  { timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS, commandTimeoutMs = DEFAULT_COMMAND_TIMEOUT_MS } = {}
) {
  if (!wsUrl) {
    throw new Error(
      'E2E_WS_URL is not set. Run tests through `python3 tests/e2e/run_e2e.py` or pass wsUrl explicitly.'
    );
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch {
        // ignore
      }
      reject(new Error(`Timed out after ${timeoutMs}ms connecting to CDP WebSocket: ${wsUrl}`));
    }, timeoutMs);
    if (typeof timer.unref === 'function') timer.unref();

    const onOpen = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      ws.removeEventListener('error', onError);
      ws.removeEventListener('close', onClose);
      resolve();
    };
    const onError = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      ws.removeEventListener('open', onOpen);
      ws.removeEventListener('close', onClose);
      reject(new Error(`Failed to connect to CDP WebSocket: ${wsUrl}`));
    };
    const onClose = (event) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      ws.removeEventListener('open', onOpen);
      ws.removeEventListener('error', onError);
      reject(new Error(`CDP WebSocket closed during handshake (code=${event?.code}): ${wsUrl}`));
    };

    ws.addEventListener('open', onOpen, { once: true });
    ws.addEventListener('error', onError, { once: true });
    ws.addEventListener('close', onClose, { once: true });
  });

  return new Browser(ws, wsUrl, { commandTimeoutMs });
}

export class Page {
  constructor(browser, targetId, sessionId, { baseUrl = process.env.E2E_BASE_URL } = {}) {
    this.browser = browser;
    this.targetId = targetId;
    this.sessionId = sessionId;
    this.baseUrl = baseUrl || '';
    this._closed = false;
    this._jsEnabled = true;
    this._unsubscribers = [];
    this._requests = new Map();
    this._localOrigins = new Set();

    for (const candidate of [baseUrl, process.env.E2E_BASE_URL, process.env.E2E_SUBPATH_URL]) {
      this._registerOriginIfLocal(candidate);
    }

    this.responses = [];
    this.localFailedRequests = [];
    this.externalFailedRequests = [];
    this.allFailedRequests = [];
    this.consoleErrors = [];
    this.pageErrors = [];
  }

  _registerOriginIfLocal(urlStr) {
    if (!urlStr) return;
    try {
      const u = new URL(urlStr);
      if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') {
        this._localOrigins.add(u.origin);
      }
    } catch {
      // ignore invalid URLs
    }
  }

  _isLocalOrigin(urlStr) {
    if (!urlStr) return false;
    try {
      const u = new URL(urlStr);
      return (
        this._localOrigins.has(u.origin) ||
        u.hostname === '127.0.0.1' ||
        u.hostname === 'localhost'
      );
    } catch {
      return false;
    }
  }

  _isFavicon(urlStr) {
    if (!urlStr) return false;
    try {
      const p = new URL(urlStr).pathname;
      return p === '/favicon.ico' || p === '/ISP-Website-Redesign/favicon.ico';
    } catch {
      return false;
    }
  }

  _attachDiagnosticListeners() {
    this._unsubscribers.push(
      this.browser.on(this.sessionId, 'Network.requestWillBeSent', (params) => {
        if (params.requestId && params.request?.url) {
          this._requests.set(params.requestId, {
            url: params.request.url,
            type: params.type || 'Other',
          });
        }
      }),
      this.browser.on(this.sessionId, 'Network.responseReceived', (params) => {
        const res = params.response;
        if (!res) return;
        const url = res.url || '';
        const isLocal = this._isLocalOrigin(url);
        const isFav = this._isFavicon(url);
        this.responses.push({
          requestId: params.requestId,
          url,
          status: res.status,
          statusText: res.statusText || '',
          mimeType: res.mimeType || '',
          isLocal,
        });
        if (res.status >= 400 && !isFav) {
          const entry = {
            url,
            status: res.status,
            errorText: res.statusText || `HTTP ${res.status}`,
            type: 'http',
            isLocal,
          };
          this.allFailedRequests.push(entry);
          if (isLocal) {
            this.localFailedRequests.push(entry);
          } else {
            this.externalFailedRequests.push(entry);
          }
        }
      }),
      this.browser.on(this.sessionId, 'Network.loadingFailed', (params) => {
        if (params.canceled) return;
        const req = this._requests.get(params.requestId);
        const url = req?.url || '';
        if (this._isFavicon(url)) return;
        const isLocal = url ? this._isLocalOrigin(url) : false;
        const entry = {
          url,
          status: 0,
          errorText: params.errorText || 'loadingFailed',
          type: 'network',
          isLocal,
        };
        this.allFailedRequests.push(entry);
        if (isLocal) {
          this.localFailedRequests.push(entry);
        } else {
          this.externalFailedRequests.push(entry);
        }
      }),
      this.browser.on(this.sessionId, 'Runtime.consoleAPICalled', (params) => {
        if (params.type !== 'error') return;
        const args = (params.args || []).map((a) => {
          if (a.value !== undefined) return String(a.value);
          if (a.description !== undefined) return String(a.description);
          return `[${a.type || 'object'}]`;
        });
        this.consoleErrors.push({
          source: 'console',
          text: args.join(' '),
          url: '',
          args,
        });
      }),
      this.browser.on(this.sessionId, 'Log.entryAdded', (params) => {
        const e = params.entry;
        if (!e || e.level !== 'error') return;
        // Ignore external non-local network failures (e.g., offline Google Fonts TLS errors)
        // and favicon noise, while recording all local and non-network browser errors.
        if (e.source === 'network' && e.url) {
          if (!this._isLocalOrigin(e.url) || this._isFavicon(e.url)) {
            return;
          }
        }
        this.consoleErrors.push({
          source: e.source || 'log',
          text: e.text || '',
          url: e.url || '',
        });
      }),
      this.browser.on(this.sessionId, 'Runtime.exceptionThrown', (params) => {
        const details = params.exceptionDetails || {};
        this.pageErrors.push({
          text: details.text || 'Uncaught exception',
          description: details.exception?.description || details.text || 'Uncaught exception',
          url: details.url || '',
          lineNumber: details.lineNumber,
          columnNumber: details.columnNumber,
        });
      })
    );
  }

  send(method, params = {}, timeoutMs = undefined) {
    return this.browser.send(method, params, this.sessionId, timeoutMs);
  }

  clearDiagnostics() {
    this.responses = [];
    this.localFailedRequests = [];
    this.externalFailedRequests = [];
    this.allFailedRequests = [];
    this.consoleErrors = [];
    this.pageErrors = [];
    this._requests.clear();
  }

  async _settleFrames(count = 1) {
    if (!this._jsEnabled) {
      await sleep(25);
      return;
    }
    try {
      await this.evaluate(
        (n) =>
          new Promise((resolve) => {
            let remaining = Math.max(1, n);
            const step = () => {
              remaining -= 1;
              if (remaining <= 0) resolve(true);
              else requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          }),
        count
      );
    } catch {
      await sleep(25);
    }
  }

  async _resolveUrl(urlOrRelPath, baseUrl) {
    const raw = String(urlOrRelPath ?? '');
    if (/^(?:https?:\/\/|about:|data:)/i.test(raw)) {
      return raw;
    }

    if (raw.startsWith('#')) {
      try {
        const current = await this.getUrl();
        if (current && current !== 'about:blank') {
          return new URL(raw, current).href;
        }
      } catch {
        // fall through to baseUrl
      }
    }

    const effectiveBase = baseUrl || this.baseUrl || process.env.E2E_BASE_URL;
    if (!effectiveBase) {
      throw new Error(`Cannot resolve relative URL ${JSON.stringify(raw)} without baseUrl`);
    }
    const baseWithSlash = effectiveBase.endsWith('/') ? effectiveBase : `${effectiveBase}/`;
    if (raw === '' || raw === '.') return baseWithSlash;
    return new URL(raw, baseWithSlash).href;
  }

  async goto(urlOrRelPath, { baseUrl = undefined, timeoutMs = 15000, clearDiagnostics = true } = {}) {
    if (clearDiagnostics) {
      this.clearDiagnostics();
    }

    const targetUrl = await this._resolveUrl(urlOrRelPath, baseUrl);
    this._registerOriginIfLocal(targetUrl);

    let prevUrl = '';
    try {
      prevUrl = await this.getUrl();
    } catch {
      prevUrl = '';
    }

    const loadWait = this.browser.waitForEvent(this.sessionId, 'Page.loadEventFired', {
      timeoutMs,
    });
    const sameDocWait = this.browser.waitForEvent(
      this.sessionId,
      'Page.navigatedWithinDocument',
      { timeoutMs: Math.min(timeoutMs, 2500) }
    );

    try {
      const navRes = await this.send('Page.navigate', { url: targetUrl }, timeoutMs);
      if (navRes.errorText) {
        loadWait.cancel();
        sameDocWait.cancel();
        throw new Error(`Page.navigate to ${targetUrl} failed: ${navRes.errorText}`);
      }

      if (navRes.loaderId) {
        sameDocWait.cancel();
        await loadWait.promise;
        await this.waitFor(() => document.readyState === 'complete', {
          timeoutMs: Math.min(timeoutMs, 5000),
          intervalMs: 25,
          message: `Document did not reach readyState=complete for ${targetUrl}`,
        });
        await this._settleFrames(1);
      } else {
        loadWait.cancel();
        // Same-document hash navigation or already on identical URL.
        if (targetUrl !== prevUrl) {
          await sameDocWait.promise.catch(() => null);
        } else {
          sameDocWait.cancel();
        }
        await this._settleFrames(1);
      }
    } finally {
      loadWait.cancel();
      sameDocWait.cancel();
    }

    const finalUrl = await this.getUrl();
    const docBase = stripHash(finalUrl);
    const matchingResp = [...this.responses]
      .reverse()
      .find((r) => stripHash(r.url) === docBase);
    return {
      url: finalUrl,
      status: matchingResp ? matchingResp.status : null,
    };
  }

  async evaluate(fnOrExpr, ...args) {
    const expression =
      typeof fnOrExpr === 'function'
        ? `(${fnOrExpr.toString()})(...${JSON.stringify(args)})`
        : String(fnOrExpr);

    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });

    if (res.exceptionDetails) {
      const msg =
        res.exceptionDetails.exception?.description ||
        res.exceptionDetails.exception?.value ||
        res.exceptionDetails.text ||
        'Unknown evaluation exception';
      throw new Error(`Page evaluate error: ${msg}`);
    }

    return res.result ? res.result.value : undefined;
  }

  async waitFor(
    predicateFn,
    { timeoutMs = 5000, intervalMs = 50, args = [], message = 'waitFor timed out' } = {}
  ) {
    const deadline = Date.now() + timeoutMs;
    let lastError = null;
    const fnStr = typeof predicateFn === 'function' ? predicateFn.toString() : '';
    const isBrowserPredicate =
      typeof predicateFn !== 'function' ||
      /\b(?:document|window|getComputedStyle|location|navigator)\b/.test(fnStr);
    while (Date.now() <= deadline) {
      try {
        const result = isBrowserPredicate
          ? await this.evaluate(predicateFn, ...args)
          : await predicateFn(...args);
        if (result) return result;
      } catch (err) {
        lastError = err;
      }
      await sleep(intervalMs);
    }
    const extra = lastError ? ` (last error: ${lastError.message})` : '';
    throw new Error(`${message} after ${timeoutMs}ms${extra}`);
  }

  async setViewport(
    width,
    height,
    { mobile = width <= 760, deviceScaleFactor = 1, waitForFrame = true } = {}
  ) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile: Boolean(mobile),
    });
    if (waitForFrame) {
      await this._settleFrames(2);
    }
  }

  async setReducedMotion(enabled) {
    await this.send('Emulation.setEmulatedMedia', {
      features: [
        {
          name: 'prefers-reduced-motion',
          value: enabled ? 'reduce' : 'no-preference',
        },
      ],
    });
  }

  async setJavaScriptEnabled(enabled) {
    this._jsEnabled = Boolean(enabled);
    await this.send('Emulation.setScriptExecutionDisabled', { value: !this._jsEnabled });
  }

  async scrollTo(y) {
    await this.evaluate((top) => {
      window.scrollTo({ top, left: 0, behavior: 'instant' });
    }, y);
    await this._settleFrames(2);
    return await this.evaluate(() => window.scrollY);
  }

  async getUrl() {
    return await this.evaluate(() => window.location.href);
  }

  async _locateElementPoint(selectorOrFn) {
    let info;
    if (typeof selectorOrFn === 'function') {
      const fnSource = selectorOrFn.toString();
      info = await this.evaluate((src) => {
        const resolver = eval(`(${src})`);
        const el = resolver();
        if (!el) return { found: false, reason: 'resolver returned null' };
        el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        const clientRects = [...el.getClientRects()].filter((cr) => cr.width > 2 && cr.height > 2);
        const r = clientRects[0] || el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) {
          return { found: false, reason: `element has zero box (${r.width}x${r.height})` };
        }
        return {
          found: true,
          x: Math.max(1, Math.min(window.innerWidth - 1, r.left + r.width / 2)),
          y: Math.max(1, Math.min(window.innerHeight - 1, r.top + r.height / 2)),
        };
      }, fnSource);
    } else {
      info = await this.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return { found: false, reason: `selector not found: ${sel}` };
        el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        const clientRects = [...el.getClientRects()].filter((cr) => cr.width > 2 && cr.height > 2);
        const r = clientRects[0] || el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) {
          return { found: false, reason: `selector ${sel} has zero box (${r.width}x${r.height})` };
        }
        return {
          found: true,
          x: Math.max(1, Math.min(window.innerWidth - 1, r.left + r.width / 2)),
          y: Math.max(1, Math.min(window.innerHeight - 1, r.top + r.height / 2)),
        };
      }, String(selectorOrFn));
    }

    if (!info || !info.found) {
      throw new Error(`Could not locate clickable element: ${info?.reason || 'unknown reason'}`);
    }
    return info;
  }

  async clickAt(x, y) {
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await this.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount: 1,
    });
    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      clickCount: 1,
    });
    await this._settleFrames(1);
  }

  async click(selectorOrFn) {
    const pt = await this._locateElementPoint(selectorOrFn);
    await this.clickAt(pt.x, pt.y);
  }

  async clickAndWaitForNavigation(selectorOrFn, { timeoutMs = 10000 } = {}) {
    const prevUrl = await this.getUrl();

    const loadWait = this.browser.waitForEvent(this.sessionId, 'Page.loadEventFired', {
      timeoutMs,
    });
    const sameDocWait = this.browser.waitForEvent(
      this.sessionId,
      'Page.navigatedWithinDocument',
      { timeoutMs }
    );
    const stopWait = this.browser.waitForEvent(
      this.sessionId,
      'Page.frameStoppedLoading',
      { timeoutMs }
    );

    // Avoid unhandled rejection warnings when losing branches are cancelled.
    loadWait.promise.catch(() => {});
    sameDocWait.promise.catch(() => {});
    stopWait.promise.catch(() => {});

    try {
      await this.click(selectorOrFn);

      await Promise.race([
        loadWait.promise.then(() => 'load'),
        sameDocWait.promise.then(() => 'sameDoc'),
        stopWait.promise.then(() => 'frameStopped'),
        (async () => {
          const deadline = Date.now() + timeoutMs;
          while (Date.now() < deadline) {
            const state = await this.evaluate(() => ({
              url: window.location.href,
              ready: document.readyState === 'complete',
            })).catch(() => null);
            if (state && state.url && state.url !== prevUrl && state.ready) {
              return 'urlChanged';
            }
            await sleep(40);
          }
          throw new Error(
            `clickAndWaitForNavigation timed out after ${timeoutMs}ms (stayed at ${prevUrl})`
          );
        })(),
      ]);

      await this.waitFor(
        (oldUrl) =>
          document.readyState === 'complete' && window.location.href !== oldUrl,
        {
          timeoutMs: Math.min(timeoutMs, 5000),
          intervalMs: 25,
          args: [prevUrl],
          message: `Document did not finish navigating away from ${prevUrl} after click`,
        }
      );
      await this._settleFrames(2);
      return await this.getUrl();
    } finally {
      loadWait.cancel();
      sameDocWait.cancel();
      stopWait.cancel();
    }
  }

  async goBack({ timeoutMs = 10000 } = {}) {
    const prevUrl = await this.getUrl();

    const loadWait = this.browser.waitForEvent(this.sessionId, 'Page.loadEventFired', {
      timeoutMs,
    });
    const sameDocWait = this.browser.waitForEvent(
      this.sessionId,
      'Page.navigatedWithinDocument',
      { timeoutMs }
    );
    const stopWait = this.browser.waitForEvent(
      this.sessionId,
      'Page.frameStoppedLoading',
      { timeoutMs }
    );

    loadWait.promise.catch(() => {});
    sameDocWait.promise.catch(() => {});
    stopWait.promise.catch(() => {});

    try {
      await this.evaluate(() => window.history.back());

      await Promise.race([
        loadWait.promise.then(() => 'load'),
        sameDocWait.promise.then(() => 'sameDoc'),
        stopWait.promise.then(() => 'frameStopped'),
        (async () => {
          const deadline = Date.now() + timeoutMs;
          while (Date.now() < deadline) {
            const state = await this.evaluate(() => ({
              url: window.location.href,
              ready: document.readyState === 'complete',
            })).catch(() => null);
            if (state && state.url && state.url !== prevUrl && state.ready) {
              return 'urlChanged';
            }
            await sleep(40);
          }
          throw new Error(`goBack() timed out after ${timeoutMs}ms (stayed at ${prevUrl})`);
        })(),
      ]);

      await this.waitFor(
        (oldUrl) =>
          document.readyState === 'complete' && window.location.href !== oldUrl,
        {
          timeoutMs: Math.min(timeoutMs, 5000),
          intervalMs: 25,
          args: [prevUrl],
          message: `Document did not finish navigating back from ${prevUrl}`,
        }
      );
      await this._settleFrames(2);
      return await this.getUrl();
    } finally {
      loadWait.cancel();
      sameDocWait.cancel();
      stopWait.cancel();
    }
  }

  async focus(selectorOrFn) {
    let ok;
    if (typeof selectorOrFn === 'function') {
      const fnSource = selectorOrFn.toString();
      ok = await this.evaluate((src) => {
        const resolver = eval(`(${src})`);
        const el = resolver();
        if (!el) return false;
        el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        el.focus();
        return document.activeElement === el;
      }, fnSource);
    } else {
      ok = await this.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        el.focus();
        return document.activeElement === el;
      }, String(selectorOrFn));
    }

    if (!ok) {
      throw new Error(`Could not focus target: ${typeof selectorOrFn === 'string' ? selectorOrFn : 'resolver'}`);
    }
    await this._settleFrames(1);
  }

  async pressKey(key, modifiers = {}) {
    const spec = resolveKeySpec(key, modifiers);
    const modMask =
      (modifiers.alt ? 1 : 0) |
      (modifiers.ctrl ? 2 : 0) |
      (modifiers.meta ? 4 : 0) |
      (modifiers.shift ? 8 : 0);

    const hasCommandMod = Boolean(modifiers.alt || modifiers.ctrl || modifiers.meta);

    if (spec.text !== null && !hasCommandMod) {
      await this.send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: spec.key,
        code: spec.code,
        text: spec.text,
        unmodifiedText: spec.text,
        windowsVirtualKeyCode: spec.windowsVirtualKeyCode,
        nativeVirtualKeyCode: spec.nativeVirtualKeyCode,
        modifiers: modMask,
      });
    } else {
      await this.send('Input.dispatchKeyEvent', {
        type: 'rawKeyDown',
        key: spec.key,
        code: spec.code,
        windowsVirtualKeyCode: spec.windowsVirtualKeyCode,
        nativeVirtualKeyCode: spec.nativeVirtualKeyCode,
        modifiers: modMask,
      });
    }

    await this.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: spec.key,
      code: spec.code,
      windowsVirtualKeyCode: spec.windowsVirtualKeyCode,
      nativeVirtualKeyCode: spec.nativeVirtualKeyCode,
      modifiers: modMask,
    });
    await this._settleFrames(1);
  }

  async typeText(text) {
    const str = String(text ?? '');
    if (str.length > 0) {
      await this.send('Input.insertText', { text: str });
      await this._settleFrames(1);
    }
  }

  async fill(selectorOrFn, value) {
    const str = value === null || value === undefined ? '' : String(value);
    await this.focus(selectorOrFn);
    await this.pressKey('a', { ctrl: true });
    await this.pressKey('Backspace');

    // Ensure cleared if Ctrl+A did not select in a non-standard input state.
    const stillHasValue = await this.evaluate(() => {
      const el = document.activeElement;
      if (!el || !('value' in el)) return false;
      if (el.value === '') return false;
      if (typeof el.select === 'function') el.select();
      return true;
    });
    if (stillHasValue) {
      await this.pressKey('Backspace');
    }

    if (str.length > 0) {
      await this.typeText(str);
    }

    await this.evaluate(() => {
      const el = document.activeElement;
      if (el && 'value' in el) {
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await this._settleFrames(1);
  }

  async close() {
    if (this._closed) return;
    this._closed = true;

    for (const unsub of this._unsubscribers) {
      try {
        unsub();
      } catch {
        // ignore
      }
    }
    this._unsubscribers = [];
    this.browser._pages.delete(this);

    try {
      await this.browser.send('Target.closeTarget', { targetId: this.targetId });
    } catch {
      // Browser or target may already be closed.
    }
  }
}
