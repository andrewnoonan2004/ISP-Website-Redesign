const menu = document.querySelector('.menu');
const navigation = document.querySelector('#main-navigation');
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
// Open a linked resource so its instructions are immediately available.
function revealResource() {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target instanceof HTMLDetailsElement) target.open = true;
}
window.addEventListener('hashchange', revealResource);
revealResource();
