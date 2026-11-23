const directory = document.querySelector('.people-directory');
if (directory) {
  const nameInput = directory.querySelector('#people-name');
  const topicSearchInput = directory.querySelector('#people-topic-search');
  const category = directory.querySelector('#people-category');
  const topic = directory.querySelector('#people-topic');
  const school = directory.querySelector('#people-school');
  const sort = directory.querySelector('#people-sort');
  const count = directory.querySelector('#people-count');
  const grid = directory.querySelector('.people-grid');
  const cards = [...grid.querySelectorAll('.person-card')];
  const scopeTabs = [...directory.querySelectorAll('.scope-tab[data-category]')];
  const topicChips = [...directory.querySelectorAll('.topic-chip[data-topic-chip]')];
  const feedback = directory.querySelector('#people-feedback');

  // Normalize diacritics, hyphens, dots, and parentheses into clean space-separated tokens
  const normalizeText = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/['’.]/g, '')
      .replace(/[-–—_/, :;()[\]]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  // For partial-name search: keep both space-separated tokens ("hyung jung hj park", "yu ru lin")
  // and compact form ("hyungjunghjpark", "yurulin") so "HJ Park", "H.J. Park", "Yu Ru", "Yu-Ru", "Brus", "Lit" all match strictly on name.
  const cardNameMap = new Map(
    cards.map((card) => {
      const normName = normalizeText(card.dataset.name || '');
      const compactName = normName.replace(/\s+/g, '');
      return [card, { normName, compactName }];
    })
  );

  // For topic / research-area search: strictly uses topics + interests + research_summary + bio (excludes name and role)
  const cardTopicSearchMap = new Map(
    cards.map((card) => {
      const rawTopicBlob =
        card.dataset.topicSearch ||
        `${card.dataset.topics || ''}`;
      return [card, normalizeText(rawTopicBlob)];
    })
  );

  // Curated domain synonym dictionary for topic / research-area search
  const TOPIC_SYNONYMS = {
    ai: [
      'ai',
      'artificial intelligence',
      'ai and law',
      'machine learning and reasoning',
      'language and information retrieval',
      'computer vision',
    ],
    'artificial intelligence': [
      'ai',
      'artificial intelligence',
      'ai and law',
      'machine learning and reasoning',
      'language and information retrieval',
      'computer vision',
    ],
    nlp: [
      'nlp',
      'natural language',
      'computational linguistics',
      'language and information retrieval',
      'human language',
      'large language model',
      'llm',
      'text analytics',
      'dialogue',
    ],
    'natural language': [
      'nlp',
      'natural language',
      'computational linguistics',
      'language and information retrieval',
      'human language',
    ],
    'natural language processing': [
      'nlp',
      'natural language',
      'computational linguistics',
      'language and information retrieval',
      'human language',
    ],
    ml: [
      'ml',
      'machine learning',
      'deep learning',
      'machine learning and reasoning',
      'reinforcement learning',
      'statistical learning',
    ],
    'machine learning': [
      'ml',
      'machine learning',
      'deep learning',
      'machine learning and reasoning',
      'reinforcement learning',
    ],
    cv: ['cv', 'computer vision', 'image analysis', 'medical imaging'],
    'computer vision': ['cv', 'computer vision', 'image analysis', 'medical imaging'],
    hci: ['hci', 'human computer interaction'],
    'human computer interaction': ['hci', 'human computer interaction'],
    biomedical: [
      'biomedical',
      'biomedicine',
      'health and biomedicine',
      'bioinformatics',
      'clinical informatics',
    ],
    biomedicine: [
      'biomedical',
      'biomedicine',
      'health and biomedicine',
      'bioinformatics',
      'clinical informatics',
    ],
    health: ['health', 'health and biomedicine', 'biomedical', 'clinical', 'medicine'],
    education: ['education', 'learning and education', 'intelligent tutoring', 'educational'],
    tutoring: ['tutoring', 'intelligent tutoring', 'learning and education'],
    law: ['law', 'ai and law', 'legal'],
    legal: ['legal', 'ai and law', 'law'],
    security: ['security', 'security and privacy', 'privacy'],
    privacy: ['privacy', 'security and privacy', 'security'],
    recommender: ['recommender', 'recommender systems', 'personalization'],
  };

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function matchesVariantInBlob(blob, variant) {
    if (!variant) return true;
    // Short terms (<= 3 chars like "ai", "ml", "nlp", "cv", "hci") MUST match on word boundaries
    // so "ai" never matches "chair", "aims", "brain", "training", "paine", or "haiyi".
    if (variant.length <= 3) {
      const re = new RegExp(`\\b${escapeRegex(variant)}\\b`, 'i');
      return re.test(blob);
    }
    return blob.includes(variant);
  }

  function matchesNameQuery(card, rawNameQuery) {
    const normQuery = normalizeText(rawNameQuery);
    if (!normQuery) return true;
    const { normName, compactName } = cardNameMap.get(card);
    const tokens = normQuery.split(' ').filter(Boolean);
    return tokens.every(
      (token) => normName.includes(token) || compactName.includes(token)
    );
  }

  function matchesTopicQuery(card, rawTopicQuery) {
    const normQuery = normalizeText(rawTopicQuery);
    if (!normQuery) return true;
    const blob = cardTopicSearchMap.get(card) || '';
    if (!blob) return false;

    if (Object.prototype.hasOwnProperty.call(TOPIC_SYNONYMS, normQuery)) {
      const variants = TOPIC_SYNONYMS[normQuery];
      return variants.some((v) => matchesVariantInBlob(blob, v));
    }

    const terms = normQuery.split(' ').filter(Boolean);
    return terms.every((term) => {
      if (Object.prototype.hasOwnProperty.call(TOPIC_SYNONYMS, term)) {
        return TOPIC_SYNONYMS[term].some((v) => matchesVariantInBlob(blob, v));
      }
      return matchesVariantInBlob(blob, term);
    });
  }

  let editingSearch = false;
  let lastAllMatches = cards.length;
  let lastVisibleCount = cards.length;

  function syncScopeTabsAndChips() {
    for (const btn of scopeTabs) {
      const active = btn.dataset.category === category.value;
      btn.setAttribute('aria-pressed', String(active));
    }
    for (const chip of topicChips) {
      const active = chip.dataset.topicChip === topic.value;
      chip.setAttribute('aria-pressed', String(active));
    }
  }

  function readUrl() {
    const params = new URLSearchParams(location.search);
    if (nameInput) nameInput.value = '';
    if (topicSearchInput) topicSearchInput.value = '';
    topic.value = school.value = '';
    category.value = 'Faculty';
    sort.value = 'last';

    const invalid = [];

    if (params.has('category')) {
      const val = params.get('category');
      if ([...category.options].some((o) => o.value === val)) {
        category.value = val;
      } else {
        invalid.push('Directory scope');
      }
    }

    if (params.has('topic')) {
      const val = params.get('topic');
      const matchOpt = [...topic.options].find(
        (o) => o.value.toLowerCase() === val.toLowerCase()
      );
      if (matchOpt) {
        topic.value = matchOpt.value;
      } else if (topicSearchInput && val) {
        topicSearchInput.value = val;
      } else {
        invalid.push('Research topic category');
      }
    }

    if (params.has('school')) {
      const val = params.get('school');
      if ([...school.options].some((o) => o.value === val)) {
        school.value = val;
      } else {
        invalid.push('Pitt school');
      }
    }

    if (params.has('sort')) {
      const val = params.get('sort');
      if ([...sort.options].some((o) => o.value === val)) {
        sort.value = val;
      } else {
        invalid.push('Sort by name');
      }
    }

    if (nameInput && params.has('name')) {
      nameInput.value = params.get('name');
    }
    if (topicSearchInput && (params.has('topic_q') || params.has('area'))) {
      topicSearchInput.value = params.get('topic_q') || params.get('area') || '';
    }
    // Backwards-compatible ?q= support (e.g. people.html?q=AI or people.html?q=Litman)
    if (params.has('q') && !params.has('name') && !params.has('topic_q')) {
      const qVal = params.get('q') || '';
      const normQ = normalizeText(qVal);
      const anyNameMatch =
        normQ && cards.some((card) => matchesNameQuery(card, qVal));
      const isTopicKeyword =
        Object.prototype.hasOwnProperty.call(TOPIC_SYNONYMS, normQ) ||
        !anyNameMatch;
      if (isTopicKeyword && topicSearchInput) {
        topicSearchInput.value = qVal;
      } else if (nameInput) {
        nameInput.value = qVal;
      }
    }

    feedback.textContent = invalid.length
      ? `This link contains an unavailable choice for ${invalid.join(', ')}. The default choice is shown; select another option below.`
      : '';
    feedback.hidden = !invalid.length;
    syncScopeTabsAndChips();
  }

  function filterPeople(historyMode = null) {
    // Curated topic dropdown/chips and school dropdown cover faculty profiles only,
    // while #people-topic-search works across ALL directory scopes (including Graduate students & Alumni).
    const facultyScope = !category.value || category.value === 'Faculty';
    if (!facultyScope) {
      topic.value = '';
      school.value = '';
    }
    topic.disabled = !facultyScope;
    school.disabled = !facultyScope;
    if (topicSearchInput) {
      topicSearchInput.disabled = false;
    }

    directory.querySelector('#people-filter-help').textContent = facultyScope
      ? 'Partial-name and topic/research-area search work across all directory scopes. Curated topic chips and school filters highlight faculty appointments.'
      : 'Partial-name and topic/research-area search remain active for this directory scope. Curated faculty topic chips and school dropdown are cleared for non-faculty views.';

    const rawName = nameInput ? nameInput.value.trim() : '';
    const rawTopicQ = topicSearchInput ? topicSearchInput.value.trim() : '';

    let visible = 0;
    let allMatches = 0;

    cards.forEach((card) => {
      const categories = card.dataset.categories.split('|');
      const topics = card.dataset.topics.split('|').filter(Boolean);
      const schools = card.dataset.schools.split('|').filter(Boolean);

      const nameOk = matchesNameQuery(card, rawName);
      const topicQueryOk = matchesTopicQuery(card, rawTopicQ);
      const queryMatch = nameOk && topicQueryOk;
      if (queryMatch) allMatches++;

      const categoryOk = !category.value || categories.includes(category.value);
      const topicFacetOk = !topic.value || topics.includes(topic.value);
      const schoolOk =
        !school.value ||
        (school.value === 'unlisted'
          ? schools.length === 0
          : schools.includes(school.value));

      const matches = categoryOk && topicFacetOk && schoolOk && queryMatch;
      card.hidden = !matches;
      if (matches) visible++;
    });

    lastAllMatches = allMatches;
    lastVisibleCount = visible;

    const sortKey = sort.value === 'first' ? 'name' : 'sortName';
    [...cards]
      .sort((a, b) =>
        a.dataset[sortKey].localeCompare(b.dataset[sortKey], 'en', {
          sensitivity: 'base',
        })
      )
      .forEach((card) => grid.append(card));

    syncScopeTabsAndChips();

    const active = [
      category.value || 'All people',
      topic.value ? `Topic: ${topic.value}` : '',
      rawTopicQ ? `Research area: “${rawTopicQ}”` : '',
      school.value === 'unlisted' ? 'School not listed' : school.value,
      rawName ? `Name: “${rawName}”` : '',
      sort.selectedOptions[0].textContent,
    ].filter(Boolean);

    const hiddenCount = cards.length - visible;
    count.textContent = `${visible} of ${cards.length} ${
      visible === 1 ? 'person' : 'people'
    } shown · ${active.join(' · ')}`;

    const hiddenBanner = directory.querySelector('#people-hidden-banner');
    const hiddenText = directory.querySelector('#people-hidden-text');
    if (hiddenBanner && hiddenText) {
      if (visible > 0 && hiddenCount > 0) {
        const strong = document.createElement('strong');
        strong.textContent = `Showing ${visible} ${
          category.value || 'matching'
        } ${visible === 1 ? 'profile' : 'profiles'} (${hiddenCount} additional ${
          hiddenCount === 1 ? 'profile' : 'profiles'
        } in other directory scopes).`;
        const detail =
          ' Use the directory scope tabs above or shortcuts below to switch scopes:';
        hiddenText.replaceChildren(strong, detail);
        hiddenBanner.hidden = false;
        hiddenBanner.querySelectorAll('[data-switch-category]').forEach((btn) => {
          btn.hidden =
            btn.dataset.switchCategory !== '' &&
            btn.dataset.switchCategory === category.value;
        });
      } else {
        hiddenBanner.hidden = true;
      }
    }

    directory.querySelector('#people-empty').hidden = visible !== 0;
    const emptyMsg = directory.querySelector('#people-empty-message');
    const searchAllBtn = directory.querySelector('#people-search-all');
    const hasSearchQuery = Boolean(rawName || rawTopicQ);

    if (visible === 0 && hasSearchQuery && allMatches > 0) {
      const strong = document.createElement('strong');
      strong.textContent = `No people match in ${
        category.value || 'the current filters'
      }.`;
      emptyMsg.replaceChildren(
        strong,
        ` However, ${allMatches} ${
          allMatches === 1 ? 'person matches' : 'people match'
        } across All people.`
      );
      searchAllBtn.textContent = `Show ${allMatches} matching ${
        allMatches === 1 ? 'person' : 'people'
      } in All people`;
      searchAllBtn.hidden = false;
    } else {
      const strong = document.createElement('strong');
      strong.textContent = 'No people match these filters.';
      emptyMsg.replaceChildren(
        strong,
        ' Check the spelling or remove a filter. Missing topic or school information does not mean a person has no expertise or affiliation.'
      );
      searchAllBtn.hidden = true;
    }

    directory.querySelector('#people-clear-search').hidden = !hasSearchQuery;

    if (historyMode) {
      const url = new URL(location.href);
      for (const key of [
        'q',
        'name',
        'topic_q',
        'area',
        'category',
        'topic',
        'school',
        'sort',
      ]) {
        url.searchParams.delete(key);
      }
      // Keep the empty category explicit so All people survives reloading.
      url.searchParams.set('category', category.value);
      if (rawName) url.searchParams.set('name', rawName);
      if (rawTopicQ) url.searchParams.set('topic_q', rawTopicQ);
      if (topic.value) url.searchParams.set('topic', topic.value);
      if (school.value) url.searchParams.set('school', school.value);
      if (sort.value && sort.value !== 'last') {
        url.searchParams.set('sort', sort.value);
      }
      if (url.href !== location.href) history[historyMode](null, '', url);
    }
  }

  function revealPerson() {
    let id;
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch {
      return;
    }
    if (!id.startsWith('person-')) return;
    const target = document.getElementById(id);
    if (!target || !target.classList.contains('person-card')) return;
    if (target.hidden) {
      const categories = target.dataset.categories.split('|');
      if (category.value && !categories.includes(category.value)) {
        category.value = '';
      }
      topic.value = school.value = '';
      if (nameInput) nameInput.value = '';
      if (topicSearchInput) topicSearchInput.value = '';
      filterPeople();
    }
    const details = target.querySelector('details');
    if (details) details.open = true;
    target.scrollIntoView({ block: 'start' });
  }

  const form = directory.querySelector('.directory-controls');
  form.hidden = false;
  form.addEventListener('submit', (event) => event.preventDefault());

  function changeFilters() {
    editingSearch = false;
    feedback.hidden = true;
    filterPeople('pushState');
  }

  for (const input of [nameInput, topicSearchInput]) {
    if (!input) continue;
    input.addEventListener('input', () => {
      feedback.hidden = true;
      filterPeople(editingSearch ? 'replaceState' : 'pushState');
      editingSearch = true;
    });
    input.addEventListener('blur', () => {
      editingSearch = false;
    });
  }

  for (const control of [category, topic, school, sort]) {
    control.addEventListener('change', changeFilters);
  }

  // Directory scope tab buttons
  scopeTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      // If user clicks a scope tab while stuck in a 0-match empty state across the whole directory,
      // clear dead search filters so the selected scope immediately displays profiles.
      if (lastVisibleCount === 0 && lastAllMatches === 0) {
        if (nameInput) nameInput.value = '';
        if (topicSearchInput) topicSearchInput.value = '';
        topic.value = '';
        school.value = '';
      }
      category.value = btn.dataset.category;
      if (category.value && category.value !== 'Faculty') {
        topic.value = '';
        school.value = '';
      }
      changeFilters();
      btn.focus();
    });
  });

  // Curated topic filter chips
  topicChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const targetTopic = chip.dataset.topicChip;
      if (targetTopic && category.value && category.value !== 'Faculty') {
        category.value = 'Faculty';
      }
      topic.value =
        topic.value === targetTopic && targetTopic !== '' ? '' : targetTopic;
      if (topicSearchInput && targetTopic === '') {
        topicSearchInput.value = '';
      }
      changeFilters();
      chip.focus();
    });
  });

  // Interactive topic tags inside faculty cards
  directory.addEventListener('click', (event) => {
    const tagBtn = event.target.closest('.topic-tag[data-topic]');
    if (!tagBtn) return;
    const selectedTopic = tagBtn.dataset.topic;
    if (!selectedTopic) return;
    if (category.value && category.value !== 'Faculty') {
      category.value = 'Faculty';
    }
    topic.value = selectedTopic;
    changeFilters();
    const matchingChip = topicChips.find(
      (c) => c.dataset.topicChip === selectedTopic
    );
    if (matchingChip) matchingChip.focus();
  });

  function showEveryone() {
    if (nameInput) nameInput.value = '';
    if (topicSearchInput) topicSearchInput.value = '';
    category.value = '';
    topic.value = '';
    school.value = '';
    sort.value = 'last';
    changeFilters();
    if (nameInput) nameInput.focus();
  }

  directory.querySelector('#people-reset').addEventListener('click', showEveryone);
  directory
    .querySelector('#people-empty-reset')
    .addEventListener('click', showEveryone);

  directory.querySelectorAll('[data-switch-category]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (lastVisibleCount === 0 && lastAllMatches === 0) {
        if (nameInput) nameInput.value = '';
        if (topicSearchInput) topicSearchInput.value = '';
      }
      category.value = btn.dataset.switchCategory;
      topic.value = school.value = '';
      changeFilters();
      const matchingScopeTab = scopeTabs.find(
        (t) => t.dataset.category === category.value
      );
      if (matchingScopeTab) matchingScopeTab.focus();
      else category.focus();
    });
  });

  directory.querySelector('#people-search-all').addEventListener('click', () => {
    category.value = topic.value = school.value = '';
    changeFilters();
    if (nameInput) nameInput.focus();
  });

  directory
    .querySelector('#people-clear-search')
    .addEventListener('click', () => {
      if (nameInput) nameInput.value = '';
      if (topicSearchInput) topicSearchInput.value = '';
      topic.value = '';
      changeFilters();
      if (nameInput) nameInput.focus();
    });

  window.addEventListener('popstate', () => {
    editingSearch = false;
    readUrl();
    filterPeople();
    revealPerson();
  });
  window.addEventListener('hashchange', revealPerson);
  readUrl();
  filterPeople();
  revealPerson();
}
