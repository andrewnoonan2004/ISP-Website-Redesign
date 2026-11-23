(() => {
  const openBtn = document.getElementById('site-search-open');
  const fallbackLink = document.getElementById('site-search-link');
  const backdrop = document.getElementById('site-search-backdrop');
  const dialog = document.getElementById('site-search-dialog');
  const closeBtn = document.getElementById('site-search-close');
  const modalForm = document.getElementById('site-search-form');
  const modalInput = document.getElementById('site-search-input');
  const modalStatus = document.getElementById('site-search-status');
  const modalResults = document.getElementById('site-search-results');
  const modalCatContainer = document.getElementById('site-search-categories');

  const pageForm = document.getElementById('search-page-form');
  const pageInput = document.getElementById('search-page-input');
  const pageClearBtn = document.getElementById('search-page-clear');
  const pageStatus = document.getElementById('search-page-status');
  const pageResults = document.getElementById('search-page-results');
  const pageCatContainer = document.getElementById('search-page-categories');

  if (openBtn) openBtn.hidden = false;
  if (fallbackLink && openBtn) fallbackLink.hidden = true;

  const FALLBACK_ITEMS = [
    {
      id: 'page-funding-overview',
      title: 'Scholarships, Fellowships & Funding — Graduate Financial Aid & Travel Grants',
      url: 'funding.html',
      category: 'Funding & Aid',
      keywords:
        'scholarships funding financial aid fellowships assistantships phd ms pitt2pitt gsr gsa sci predoctoral provost baranger dbmi travel grant',
      snippet:
        'Explore PhD fellowships (SCI Predoctoral, Provost, GSR, Summer GSA, Baranger, DBMI), MS scholarships (Pitt2Pitt up to $7,500/yr, SCI scholarships), and $750–$1,000 travel grants.',
      priority: 100,
    },
    {
      id: 'page-academics-requirements',
      title: 'Academics & Degree Requirements Overview (MS 30 credits & PhD 72 credits)',
      url: 'academics.html#requirements',
      category: 'Pages & Requirements',
      keywords:
        'academics degree requirements ms phd 30 credits 72 credits B- 3.0 QPA general track biomedical informatics track catoid=242',
      snippet:
        'Compare the 30-credit MS and 72-credit PhD degree requirements, General and Biomedical Informatics tracks, core and theory courses, and milestones.',
      priority: 100,
    },
    {
      id: 'page-courses-explorer',
      title: '2026–2027 ISP Courses, Prerequisites & Live PeopleSoft Schedule Verification',
      url: 'courses.html',
      category: 'Courses',
      keywords:
        'courses prerequisites classes offered peoplesoft highpoint cx sci schedule catoid=242 permission numbers ISSP 2071 BIOST 2142 ISSP 2170 INFSCI 2440',
      snippet:
        'Filter all 47 required and elective ISP courses for 2026–2027, review verified PREQ/PLAN rules, and check live term offerings in PeopleSoft.',
      priority: 100,
    },
    {
      id: 'page-faculty-explorer',
      title: 'Faculty Explorer — Search ISP Faculty by Name or Research Topic (AI, NLP, ML, CV, HCI)',
      url: 'people.html',
      category: 'Faculty & People',
      keywords:
        'faculty explorer people directory artificial intelligence ai machine learning ml natural language processing nlp computer vision cv hci peter brusilovsky diane litman kevin ashley milos hauskrecht',
      snippet:
        'Search ISP faculty, graduate students, staff, and alumni by partial name or research area (AI, NLP, ML, Computer Vision, HCI, Biomedical Informatics).',
      priority: 99,
    },
    {
      id: 'page-resources',
      title: 'Student Resources, Registration, Advising Holds & Permission Numbers',
      url: 'resources.html',
      category: 'Student Guides',
      keywords:
        'student resources registration advising hold permission numbers peoplesoft aar substitutions travel grants pche graduation',
      snippet:
        'Practical guides for lifting advising holds, requesting SCI and outside-SCI permission numbers, retrieving your AAR, and travel grants.',
      priority: 94,
    },
  ];

  let searchIndex = [...FALLBACK_ITEMS];
  let indexLoaded = false;
  let indexPromise = null;

  const normalize = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/['’.]/g, '')
      .replace(/[-–—_/, :;()[\]]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const QUERY_SYNONYMS = {
    ai: ['ai', 'artificial intelligence'],
    nlp: ['nlp', 'natural language', 'human language', 'language and information retrieval'],
    ml: ['ml', 'machine learning', 'deep learning'],
    cv: ['cv', 'computer vision'],
    hci: ['hci', 'human computer interaction'],
    scholarship: ['scholarship', 'scholarships', 'funding', 'pitt2pitt', 'fellowship'],
    scholarships: ['scholarship', 'scholarships', 'funding', 'pitt2pitt', 'fellowship'],
    funding: ['funding', 'scholarships', 'fellowships', 'financial aid', 'pitt2pitt', 'travel grant'],
    prereq: ['prerequisite', 'prerequisites', 'preq', 'courses'],
    prereqs: ['prerequisite', 'prerequisites', 'preq', 'courses'],
    prerequisite: ['prerequisite', 'prerequisites', 'preq', 'courses'],
    prerequisites: ['prerequisite', 'prerequisites', 'preq', 'courses'],
    requirement: ['requirement', 'requirements', 'credits', 'curriculum'],
    requirements: ['requirement', 'requirements', 'credits', 'curriculum'],
  };

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function loadIndex() {
    if (indexLoaded) return Promise.resolve(searchIndex);
    if (indexPromise) return indexPromise;
    const meta = document.querySelector('meta[name="search-index"]');
    const url = (meta && meta.getAttribute('content')) || 'assets/search-index.json';
    indexPromise = fetch(url)
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((data) => {
        if (data) {
          const items = Array.isArray(data) ? data : data.items || [];
          if (items.length > 0) {
            searchIndex = items;
            indexLoaded = true;
          }
        }
        return searchIndex;
      })
      .catch(() => searchIndex);
    return indexPromise;
  }

  function scoreItem(item, rawQuery, categoryFilter) {
    if (categoryFilter && item.category !== categoryFilter) {
      return -1;
    }
    const normQuery = normalize(rawQuery);
    if (!normQuery) {
      return item.priority || 50;
    }

    const titleNorm = normalize(item.title);
    const titleCompact = titleNorm.replace(/\s+/g, '');
    const keywordsNorm = normalize(
      Array.isArray(item.keywords) ? item.keywords.join(' ') : item.keywords
    );
    const snippetNorm = normalize(item.snippet);
    const fullBlob = `${titleNorm} ${keywordsNorm} ${snippetNorm}`;
    const fullCompact = fullBlob.replace(/\s+/g, '');
    const queryCompact = normQuery.replace(/\s+/g, '');

    const tokens = normQuery.split(' ').filter(Boolean);
    let score = 0;

    for (const token of tokens) {
      const variants = QUERY_SYNONYMS[token] || [token];
      let tokenMatched = false;
      let tokenScore = 0;

      for (const variant of variants) {
        if (variant.length <= 2) {
          const re = new RegExp(`\\b${escapeRegex(variant)}\\b`, 'i');
          if (re.test(titleNorm)) {
            tokenMatched = true;
            tokenScore = Math.max(tokenScore, 45);
          } else if (re.test(keywordsNorm) || re.test(snippetNorm)) {
            tokenMatched = true;
            tokenScore = Math.max(tokenScore, 25);
          }
        } else {
          if (titleNorm.includes(variant) || titleCompact.includes(variant)) {
            tokenMatched = true;
            tokenScore = Math.max(tokenScore, 45);
          } else if (
            keywordsNorm.includes(variant) ||
            snippetNorm.includes(variant) ||
            fullCompact.includes(variant)
          ) {
            tokenMatched = true;
            tokenScore = Math.max(tokenScore, 22);
          }
        }
      }

      if (!tokenMatched) {
        // Check if compact query (e.g. "issp2170") matches compact blob
        if (queryCompact.length >= 4 && fullCompact.includes(queryCompact)) {
          tokenScore = 35;
        } else {
          return -1;
        }
      }
      score += tokenScore;
    }

    if (titleNorm.includes(normQuery) || titleCompact.includes(queryCompact)) {
      score += 40;
    }
    score += (item.priority || 50) * 0.5;
    return score;
  }

  function buildHighlightedFragment(text, rawQuery) {
    const frag = document.createDocumentFragment();
    const safeText = String(text || '');
    const terms = normalize(rawQuery)
      .split(' ')
      .filter((t) => t.length >= 2);
    if (terms.length === 0) {
      frag.append(document.createTextNode(safeText));
      return frag;
    }
    const pattern = new RegExp(
      `(${terms.map((t) => escapeRegex(t)).join('|')})`,
      'gi'
    );
    const parts = safeText.split(pattern);
    for (const part of parts) {
      if (!part) continue;
      if (terms.some((t) => part.toLowerCase() === t.toLowerCase())) {
        const mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = part;
        frag.append(mark);
      } else {
        frag.append(document.createTextNode(part));
      }
    }
    return frag;
  }

  function renderResultsList({
    listEl,
    statusEl,
    rawQuery,
    categoryFilter,
    maxResults = 25,
    selectable = false,
  }) {
    if (!listEl || !statusEl) return [];
    const scored = [];
    for (const item of searchIndex) {
      const s = scoreItem(item, rawQuery, categoryFilter);
      if (s >= 0) scored.push({ item, score: s });
    }
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, maxResults).map((x) => x.item);

    listEl.replaceChildren();

    const trimmed = String(rawQuery || '').trim();
    const catSuffix = categoryFilter ? ` in ${categoryFilter}` : '';
    if (!trimmed) {
      statusEl.textContent = `Showing ${top.length} featured destinations${catSuffix}. Type a keyword to search all ${searchIndex.length} indexed pages, courses, faculty, and guides.`;
    } else if (top.length === 0) {
      statusEl.textContent = `No results found for “${trimmed}”${catSuffix}. Try another keyword or switch category to All.`;
    } else {
      statusEl.textContent = `${scored.length} ${
        scored.length === 1 ? 'result' : 'results'
      } for “${trimmed}”${catSuffix} (showing top ${top.length})`;
    }

    if (top.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'search-result-empty';
      emptyLi.textContent =
        'No matching pages, courses, or profiles found. Try searching for "scholarship", "requirements", "ISSP 2071", "AI", or a faculty name.';
      listEl.append(emptyLi);
      return [];
    }

    const links = [];
    top.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'search-result-item';
      if (selectable) {
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
      }

      const a = document.createElement('a');
      a.className = 'search-result-link';
      a.href = item.url;
      if (selectable) {
        a.id = `site-search-option-${idx}`;
        a.setAttribute('aria-selected', 'false');
      }

      const metaRow = document.createElement('span');
      metaRow.className = 'search-result-category';
      metaRow.textContent = item.category || 'ISP';

      const titleEl = document.createElement('strong');
      titleEl.className = 'search-result-title';
      titleEl.append(buildHighlightedFragment(item.title, trimmed));

      const snippetEl = document.createElement('span');
      snippetEl.className = 'search-result-snippet';
      snippetEl.append(buildHighlightedFragment(item.snippet || '', trimmed));

      a.append(metaRow, titleEl, snippetEl);
      li.append(a);
      listEl.append(li);
      links.push(a);
    });

    return links;
  }

  // -------------------------------------------------------------------------
  // Modal Search Controller
  // -------------------------------------------------------------------------
  let modalCategory = '';
  let modalResultLinks = [];
  let activeOptionIndex = -1;
  let lastTriggerEl = null;

  function setActiveOption(nextIndex) {
    if (modalResultLinks.length === 0) {
      activeOptionIndex = -1;
      return;
    }
    if (nextIndex < 0) {
      activeOptionIndex = modalResultLinks.length - 1;
    } else if (nextIndex >= modalResultLinks.length) {
      activeOptionIndex = 0;
    } else {
      activeOptionIndex = nextIndex;
    }
    modalResultLinks.forEach((link, idx) => {
      const selected = idx === activeOptionIndex;
      link.setAttribute('aria-selected', String(selected));
      link.classList.toggle('active-result', selected);
      if (link.parentElement) {
        link.parentElement.setAttribute('aria-selected', String(selected));
      }
      if (selected) {
        link.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  let lastModalQuery = null;
  let lastModalCat = null;
  let lastIndexLen = -1;

  function updateModalSearch(force = false) {
    if (!modalResults || !modalStatus) return;
    const qVal = modalInput ? modalInput.value : '';
    if (
      !force &&
      qVal === lastModalQuery &&
      modalCategory === lastModalCat &&
      searchIndex.length === lastIndexLen
    ) {
      return;
    }
    lastModalQuery = qVal;
    lastModalCat = modalCategory;
    lastIndexLen = searchIndex.length;
    activeOptionIndex = -1;
    modalResultLinks = renderResultsList({
      listEl: modalResults,
      statusEl: modalStatus,
      rawQuery: qVal,
      categoryFilter: modalCategory,
      maxResults: 20,
      selectable: true,
    });
  }

  function isModalOpen() {
    return Boolean(backdrop && !backdrop.hidden);
  }

  function openSearchModal(triggerEl = null) {
    if (!backdrop || !dialog) return;
    lastTriggerEl =
      triggerEl ||
      (document.activeElement && document.activeElement !== document.body
        ? document.activeElement
        : openBtn);
    backdrop.hidden = false;
    dialog.hidden = false;
    document.body.classList.add('search-modal-open');
    updateModalSearch(true);
    if (modalInput) {
      modalInput.focus();
      modalInput.select();
    } else {
      dialog.focus();
    }
    loadIndex().then(() => {
      if (isModalOpen()) updateModalSearch(true);
    });
  }

  function closeSearchModal() {
    if (!backdrop || backdrop.hidden) return;
    backdrop.hidden = true;
    if (dialog) dialog.hidden = true;
    document.body.classList.remove('search-modal-open');
    activeOptionIndex = -1;
    const returnTarget =
      lastTriggerEl && document.contains(lastTriggerEl) ? lastTriggerEl : openBtn;
    if (returnTarget && typeof returnTarget.focus === 'function') {
      returnTarget.focus();
    }
  }

  if (openBtn) {
    openBtn.addEventListener('click', () => openSearchModal(openBtn));
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSearchModal);
  }
  if (backdrop) {
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) closeSearchModal();
    });
  }

  if (modalInput) {
    modalInput.addEventListener('input', () => updateModalSearch(false));
    modalInput.addEventListener('change', () => updateModalSearch(false));
  }

  if (modalForm) {
    modalForm.addEventListener('submit', (event) => {
      if (
        activeOptionIndex >= 0 &&
        modalResultLinks[activeOptionIndex] &&
        modalResultLinks[activeOptionIndex].href
      ) {
        event.preventDefault();
        const targetHref = modalResultLinks[activeOptionIndex].href;
        closeSearchModal();
        window.location.href = targetHref;
      }
    });
  }

  if (modalResults) {
    modalResults.addEventListener('click', (event) => {
      const link = event.target.closest('a[href]');
      if (link) {
        closeSearchModal();
      }
    });
  }

  if (modalCatContainer) {
    const tabs = [...modalCatContainer.querySelectorAll('.search-cat-tab')];
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        modalCategory = tab.dataset.category || '';
        tabs.forEach((t) => {
          const active = t === tab;
          t.setAttribute('aria-selected', String(active));
          t.setAttribute('aria-pressed', String(active));
        });
        updateModalSearch();
      });
    });
  }

  function isEditableTarget(el) {
    if (!el || el === document.body) return false;
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function getFocusableInsideDialog() {
    if (!dialog) return [];
    return [
      ...dialog.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      ),
    ].filter((el) => {
      if (el.hidden || el.closest('[hidden]')) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }

  document.addEventListener('keydown', (event) => {
    if (isModalOpen()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeSearchModal();
        return;
      }
      if (event.key === 'Tab') {
        const focusables = getFocusableInsideDialog();
        if (focusables.length === 0) {
          event.preventDefault();
          dialog.focus();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const current = document.activeElement;
        if (event.shiftKey) {
          if (!dialog.contains(current) || current === first) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (!dialog.contains(current) || current === last) {
            event.preventDefault();
            first.focus();
          }
        }
        return;
      }
      if (event.key === 'ArrowDown') {
        if (modalResultLinks.length > 0) {
          event.preventDefault();
          setActiveOption(activeOptionIndex + 1);
        }
        return;
      }
      if (event.key === 'ArrowUp') {
        if (modalResultLinks.length > 0) {
          event.preventDefault();
          setActiveOption(
            activeOptionIndex <= 0
              ? modalResultLinks.length - 1
              : activeOptionIndex - 1
          );
        }
        return;
      }
      if (event.key === 'Enter' && activeOptionIndex >= 0) {
        const activeLink = modalResultLinks[activeOptionIndex];
        if (activeLink && activeLink.href) {
          event.preventDefault();
          const targetHref = activeLink.href;
          closeSearchModal();
          window.location.href = targetHref;
        }
        return;
      }
      return;
    }

    // Global shortcut:Ctrl+K / Cmd+K or "/" outside editable fields
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openSearchModal();
      return;
    }
    if (
      event.key === '/' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !isEditableTarget(document.activeElement)
    ) {
      event.preventDefault();
      openSearchModal();
    }
  });

  // -------------------------------------------------------------------------
  // Dedicated Full-Page Search (search.html)
  // -------------------------------------------------------------------------
  if (pageForm && pageInput && pageResults && pageStatus) {
    let pageCategory = '';

    function syncPageUrl(qVal) {
      const url = new URL(window.location.href);
      if (qVal) url.searchParams.set('q', qVal);
      else url.searchParams.delete('q');
      if (pageCategory) url.searchParams.set('category', pageCategory);
      else url.searchParams.delete('category');
      if (url.href !== window.location.href) {
        window.history.replaceState(null, '', url);
      }
    }

    let lastPageQuery = null;
    let lastPageCat = null;
    let lastPageIdxLen = -1;

    function updatePageSearch(updateUrl = false, force = false) {
      const qVal = pageInput.value.trim();
      if (updateUrl) syncPageUrl(qVal);
      if (
        !force &&
        qVal === lastPageQuery &&
        pageCategory === lastPageCat &&
        searchIndex.length === lastPageIdxLen
      ) {
        return;
      }
      lastPageQuery = qVal;
      lastPageCat = pageCategory;
      lastPageIdxLen = searchIndex.length;
      renderResultsList({
        listEl: pageResults,
        statusEl: pageStatus,
        rawQuery: qVal,
        categoryFilter: pageCategory,
        maxResults: 50,
        selectable: false,
      });
    }

    const params = new URLSearchParams(window.location.search);
    const initialQ = params.get('q') || params.get('query') || '';
    const initialCat = params.get('category') || '';
    if (initialQ) pageInput.value = initialQ;

    if (pageCatContainer) {
      const tabs = [...pageCatContainer.querySelectorAll('.search-cat-tab')];
      if (initialCat) {
        const matchTab = tabs.find(
          (t) =>
            (t.dataset.category || '').toLowerCase() === initialCat.toLowerCase()
        );
        if (matchTab) {
          pageCategory = matchTab.dataset.category || '';
          tabs.forEach((t) => {
            const active = t === matchTab;
            t.setAttribute('aria-selected', String(active));
            t.setAttribute('aria-pressed', String(active));
          });
        }
      }
      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          pageCategory = tab.dataset.category || '';
          tabs.forEach((t) => {
            const active = t === tab;
            t.setAttribute('aria-selected', String(active));
            t.setAttribute('aria-pressed', String(active));
          });
          updatePageSearch(true);
        });
      });
    }

    pageInput.addEventListener('input', () => updatePageSearch(true));
    pageInput.addEventListener('change', () => updatePageSearch(true));
    pageForm.addEventListener('submit', (event) => {
      event.preventDefault();
      updatePageSearch(true);
    });
    if (pageClearBtn) {
      pageClearBtn.addEventListener('click', () => {
        pageInput.value = '';
        updatePageSearch(true);
        pageInput.focus();
      });
    }

    updatePageSearch(false);
    loadIndex().then(() => updatePageSearch(false));
  } else {
    // Eagerly warm the search index in background so modal search is instantaneous
    loadIndex();
  }
})();
