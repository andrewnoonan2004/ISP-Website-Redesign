const menu = document.querySelector('.menu');
const navigation = document.querySelector('#main-navigation');
// Collapse mobile navigation only after its controls are available.
navigation.classList.add('menu-ready');
menu.hidden = false;
function setMenuExpanded(expanded) {
  menu.setAttribute('aria-expanded', String(expanded));
  menu.textContent = expanded ? 'Close menu' : 'Menu';
  navigation.classList.toggle('open', expanded);
}
menu.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') === 'true';
  setMenuExpanded(!expanded);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    setMenuExpanded(false);
    menu.focus();
  }
});
document.addEventListener('click', (event) => {
  if (menu.getAttribute('aria-expanded') === 'true' && !event.target.closest('header')) {
    setMenuExpanded(false);
  }
});
// Open a linked resource so its instructions are immediately available.
function revealResource() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); }
  catch { return; } // A malformed incoming fragment must not break the page.
  const target = document.getElementById(id);
  if (target instanceof HTMLDetailsElement) target.open = true;
  let ancestor = target?.parentElement;
  while (ancestor) {
    if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
    ancestor = ancestor.parentElement;
  }
}
window.addEventListener('hashchange', revealResource);
revealResource();

const toggleResources = document.getElementById('toggle-resources');
if (toggleResources) {
  const detailsList = [...document.querySelectorAll('main details')];
  const syncLabel = () => {
    const allOpen = detailsList.every(d => d.open);
    toggleResources.textContent = allOpen ? 'Collapse all sections' : 'Expand all sections';
    toggleResources.setAttribute('aria-expanded', String(allOpen));
  };
  toggleResources.hidden = false;
  syncLabel();
  toggleResources.addEventListener('click', () => {
    const nextOpen = !detailsList.every(d => d.open);
    detailsList.forEach(d => { d.open = nextOpen; });
    syncLabel();
  });
  detailsList.forEach(d => d.addEventListener('toggle', syncLabel));
}
