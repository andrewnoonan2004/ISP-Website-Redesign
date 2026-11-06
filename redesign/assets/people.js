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
  const params = new URLSearchParams(location.search);

  // Only accept known facet values; a stale or hand-edited link still works.
  category.value = 'Faculty';
  for (const [key, control] of Object.entries(controls)) {
    if (!params.has(key)) continue;
    const value = params.get(key);
    if (control === search || [...control.options].some(option => option.value === value)) control.value = value;
  }

  function filterPeople(updateUrl = true) {
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
    const active = [category.value || 'All people', topic.value, school.value === 'unlisted' ? 'School not listed' : school.value].filter(Boolean);
    count.textContent = `${visible} ${visible === 1 ? 'person' : 'people'} shown · ${active.join(' · ')}`;
    directory.querySelector('#people-empty').hidden = visible !== 0;
    if (updateUrl) {
      const url = new URL(location.href);
      url.search = '';
      // Keep the empty category explicit so All people survives reloading.
      url.searchParams.set('category', category.value);
      for (const [key, control] of Object.entries(controls)) {
        if (key !== 'category' && control.value && !(key === 'sort' && control.value === 'last')) url.searchParams.set(key, control.value);
      }
      history.replaceState(null, '', url);
    }
  }
  const form = directory.querySelector('.directory-controls');
  form.hidden = false;
  form.addEventListener('submit', event => event.preventDefault());
  search.addEventListener('input', () => filterPeople());
  for (const control of [category, topic, school, sort]) control.addEventListener('change', () => filterPeople());
  directory.querySelector('#people-reset').addEventListener('click', () => {
    search.value = category.value = topic.value = school.value = '';
    sort.value = 'last';
    filterPeople();
    search.focus();
  });
  filterPeople(false);
}
