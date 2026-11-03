const directory = document.querySelector('.people-directory');
if (directory) {
  const search = document.querySelector('#people-search');
  const category = document.querySelector('#people-category');
  const count = document.querySelector('#people-count');
  const cards = [...directory.querySelectorAll('.person-card')];
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const searchable = cards.map(card => normalize(card.dataset.search));
  function filterPeople() {
    const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    let visible = 0;
    cards.forEach((card, index) => {
      const matchesCategory = category.value === 'All people' || card.dataset.categories.split('|').includes(category.value);
      const matches = matchesCategory && terms.every(term => searchable[index].includes(term));
      card.hidden = !matches;
      if (matches) visible++;
    });
    count.textContent = `${visible} ${visible === 1 ? 'person' : 'people'} shown · ${category.value}`;
    document.querySelector('#people-empty').hidden = visible !== 0;
  }
  directory.querySelector('.directory-controls').hidden = false;
  category.value = 'Faculty';
  search.addEventListener('input', filterPeople);
  category.addEventListener('change', filterPeople);
  document.querySelector('#people-reset').addEventListener('click', () => {
    search.value = '';
    category.value = 'All people';
    filterPeople();
    search.focus();
  });
  filterPeople();
}
