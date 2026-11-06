const directory = document.querySelector('.people-directory');
if (directory) {
  const search = directory.querySelector('#people-search');
  const category = directory.querySelector('#people-category');
  const topic = directory.querySelector('#people-topic');
  const school = directory.querySelector('#people-school');
  const sort = directory.querySelector('#people-sort');
  const count = directory.querySelector('#people-count');
  const grid = directory.querySelector('.people-grid');
  const cards = [...grid.querySelectorAll('.person-card')];
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const searchable = new Map(cards.map(card => [card, normalize(card.dataset.search)]));
  const controls = {q: search, category, topic, school, sort};
  const feedback = directory.querySelector('#people-feedback');
  let editingSearch = false;

  function readUrl() {
    const params = new URLSearchParams(location.search);
    search.value = topic.value = school.value = '';
    category.value = 'Faculty';
    sort.value = 'last';
    const invalid = [];
    for (const [key, control] of Object.entries(controls)) {
      if (!params.has(key)) continue;
      const value = params.get(key);
      if (control === search || [...control.options].some(option => option.value === value)) control.value = value;
      else invalid.push(directory.querySelector(`label[for="${control.id}"]`).textContent);
    }
    feedback.textContent = invalid.length ? `This link contains an unavailable choice for ${invalid.join(', ')}. The default choice is shown; select another option below.` : '';
    feedback.hidden = !invalid.length;
  }

  function filterPeople(historyMode = null) {
    // Browse labels cover faculty only: don't turn a student/staff search into
    // an accidental empty result because of a previous faculty filter.
    const facultyFilters = !category.value || category.value === 'Faculty';
    if (!facultyFilters) topic.value = school.value = '';
    topic.disabled = school.disabled = !facultyFilters;
    directory.querySelector('#people-filter-help').textContent = facultyFilters
      ? 'Topic and school filters cover faculty profiles only. Search by name across All people to include every directory.'
      : 'Topic and school filters are cleared for this directory because its profiles have not been classified. You can still search by name or keyword.';
    const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    let visible = 0;
    cards.forEach(card => {
      const categories = card.dataset.categories.split('|');
      const topics = card.dataset.topics.split('|');
      const schools = card.dataset.schools.split('|').filter(Boolean);
      const matches = (!category.value || categories.includes(category.value)) &&
        (!topic.value || topics.includes(topic.value)) &&
        (!school.value || (school.value === 'unlisted' ? schools.length === 0 : schools.includes(school.value))) &&
        terms.every(term => searchable.get(card).includes(term));
      card.hidden = !matches;
      if (matches) visible++;
    });
    const key = sort.value === 'first' ? 'name' : 'sortName';
    [...cards].sort((a, b) => a.dataset[key].localeCompare(b.dataset[key], 'en', {sensitivity: 'base'}))
      .forEach(card => grid.append(card));
    const active = [category.value || 'All people', topic.value, school.value === 'unlisted' ? 'School not listed' : school.value,
      search.value.trim() ? `Search: “${search.value.trim()}”` : '', sort.selectedOptions[0].textContent].filter(Boolean);
    count.textContent = `${visible} ${visible === 1 ? 'person' : 'people'} shown · ${active.join(' · ')}`;
    directory.querySelector('#people-empty').hidden = visible !== 0;
    directory.querySelector('#people-clear-search').hidden = !search.value;
    if (historyMode) {
      const url = new URL(location.href);
      for (const key of Object.keys(controls)) url.searchParams.delete(key);
      // Keep the empty category explicit so All people survives reloading.
      url.searchParams.set('category', category.value);
      for (const [key, control] of Object.entries(controls)) {
        if (key !== 'category' && control.value && !(key === 'sort' && control.value === 'last')) url.searchParams.set(key, control.value);
      }
      if (url.href !== location.href) history[historyMode](null, '', url);
    }
  }
  const form = directory.querySelector('.directory-controls');
  form.hidden = false;
  form.addEventListener('submit', event => event.preventDefault());
  function changeFilters() {
    editingSearch = false;
    feedback.hidden = true;
    filterPeople('pushState');
  }
  // One Back step per editing session, rather than per keystroke.
  search.addEventListener('input', () => {
    feedback.hidden = true;
    filterPeople(editingSearch ? 'replaceState' : 'pushState');
    editingSearch = true;
  });
  search.addEventListener('blur', () => { editingSearch = false; });
  for (const control of [category, topic, school, sort]) control.addEventListener('change', changeFilters);
  function showEveryone() {
    search.value = category.value = topic.value = school.value = '';
    sort.value = 'last';
    changeFilters();
    search.focus();
  }
  directory.querySelector('#people-reset').addEventListener('click', showEveryone);
  directory.querySelector('#people-empty-reset').addEventListener('click', showEveryone);
  directory.querySelector('#people-clear-search').addEventListener('click', () => {
    search.value = '';
    changeFilters();
    search.focus();
  });
  window.addEventListener('popstate', () => {
    editingSearch = false;
    readUrl();
    filterPeople();
  });
  readUrl();
  filterPeople();
}
