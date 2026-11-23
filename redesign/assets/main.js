const stickyShell = document.getElementById('sticky-nav-shell');
const menu = document.querySelector('.menu');
const navigation = document.querySelector('#main-navigation');
const academicsToggle = document.getElementById('academics-submenu-toggle');
const academicsMenu = document.getElementById('nav-academics-menu');

function syncStickyNavHeight() {
  if (!stickyShell) return;
  const h = Math.max(48, Math.ceil(stickyShell.getBoundingClientRect().height));
  document.documentElement.style.setProperty('--sticky-nav-height', `${h}px`);
}
syncStickyNavHeight();
window.addEventListener('resize', syncStickyNavHeight);

if (menu && navigation) {
  // Collapse mobile navigation only after its controls are available.
  navigation.classList.add('menu-ready');
  menu.hidden = false;

  function setMenuExpanded(expanded) {
    menu.setAttribute('aria-expanded', String(expanded));
    menu.textContent = expanded ? 'Close menu' : 'Menu';
    navigation.classList.toggle('open', expanded);
    syncStickyNavHeight();
  }

  menu.addEventListener('click', () => {
    const expanded = menu.getAttribute('aria-expanded') === 'true';
    setMenuExpanded(!expanded);
  });

  document.addEventListener('keydown', (event) => {
    if (
      event.key === 'Escape' &&
      menu.getAttribute('aria-expanded') === 'true' &&
      (!academicsToggle || academicsToggle.getAttribute('aria-expanded') !== 'true')
    ) {
      setMenuExpanded(false);
      menu.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (
      menu.getAttribute('aria-expanded') === 'true' &&
      !event.target.closest('#sticky-nav-shell') &&
      !event.target.closest('header')
    ) {
      setMenuExpanded(false);
    }
  });
}

if (academicsToggle && academicsMenu) {
  function setAcademicsExpanded(expanded) {
    academicsToggle.setAttribute('aria-expanded', String(expanded));
    academicsMenu.hidden = !expanded;
  }

  academicsToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const expanded = academicsToggle.getAttribute('aria-expanded') === 'true';
    setAcademicsExpanded(!expanded);
  });

  document.addEventListener('keydown', (event) => {
    if (
      event.key === 'Escape' &&
      academicsToggle.getAttribute('aria-expanded') === 'true'
    ) {
      event.stopPropagation();
      setAcademicsExpanded(false);
      academicsToggle.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (
      academicsToggle.getAttribute('aria-expanded') === 'true' &&
      !event.target.closest('.nav-academics')
    ) {
      setAcademicsExpanded(false);
    }
  });
}

// Open a linked resource so its instructions are immediately available.
function revealResource() {
  let id;
  try {
    id = decodeURIComponent(location.hash.slice(1));
  } catch {
    return;
  }
  if (!id) return;
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
const resourcesStatus = document.getElementById('resources-status');
if (toggleResources) {
  const detailsList = [...document.querySelectorAll('main details')];
  const syncLabel = () => {
    const openCount = detailsList.filter((d) => d.open).length;
    const closedCount = detailsList.length - openCount;
    const allOpen = closedCount === 0;
    toggleResources.textContent = allOpen
      ? 'Collapse all sections'
      : `Expand all ${detailsList.length} sections`;
    toggleResources.setAttribute('aria-expanded', String(allOpen));
    if (resourcesStatus) {
      resourcesStatus.textContent = allOpen
        ? `All ${detailsList.length} sections expanded`
        : `${openCount} of ${detailsList.length} expanded · ${closedCount} collapsed below`;
    }
  };
  toggleResources.hidden = false;
  syncLabel();
  toggleResources.addEventListener('click', () => {
    const nextOpen = !detailsList.every((d) => d.open);
    detailsList.forEach((d) => {
      d.open = nextOpen;
    });
    syncLabel();
  });
  detailsList.forEach((d) => d.addEventListener('toggle', syncLabel));
}

// Indicate when wide tables have additional columns off-screen.
const tableRegions = [...document.querySelectorAll('main div[role="region"]')].filter((r) =>
  r.querySelector('table')
);
if (tableRegions.length) {
  const hints = new Map();
  const checkOverflow = () => {
    tableRegions.forEach((region) => {
      const hasOverflow = region.scrollWidth > region.clientWidth + 2;
      const moreRight =
        region.scrollLeft + region.clientWidth < region.scrollWidth - 2;
      region.dataset.overflowing = String(hasOverflow && moreRight);
      let hint = hints.get(region);
      if (hasOverflow && !hint) {
        hint = document.createElement('p');
        hint.className = 'table-scroll-hint';
        hint.textContent = '↔ Scroll horizontally to view all table columns';
        region.before(hint);
        hints.set(region, hint);
      }
      if (hint) hint.hidden = !hasOverflow;
    });
  };
  tableRegions.forEach((r) =>
    r.addEventListener('scroll', checkOverflow, { passive: true })
  );
  window.addEventListener('resize', checkOverflow);
  checkOverflow();
}
