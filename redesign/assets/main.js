const stickyShell = document.getElementById('sticky-nav-shell');
const pageJumps = document.querySelector('nav.page-jumps[aria-label="On this page"]');
const menu = document.querySelector('.menu');
const navigation = document.querySelector('#main-navigation');
const navGroups = [...document.querySelectorAll('#main-navigation .nav-group')];

let stickyNavHeight = 48;
let stickyOffsetHeight = 48;

function syncStickyHeights() {
  if (stickyShell) {
    stickyNavHeight = Math.max(40, Math.floor(stickyShell.getBoundingClientRect().height));
    document.documentElement.style.setProperty('--sticky-nav-height', `${stickyNavHeight}px`);
  }
  const jumpsHeight = pageJumps
    ? Math.ceil(pageJumps.getBoundingClientRect().height)
    : 0;
  stickyOffsetHeight = stickyNavHeight + jumpsHeight;
  document.documentElement.style.setProperty('--sticky-jumps-height', `${jumpsHeight}px`);
  document.documentElement.style.setProperty('--sticky-offset-height', `${stickyOffsetHeight}px`);
}
syncStickyHeights();
window.addEventListener('resize', syncStickyHeights);
window.addEventListener('load', syncStickyHeights);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(syncStickyHeights).catch(() => {});
}
if (typeof ResizeObserver === 'function') {
  const ro = new ResizeObserver(syncStickyHeights);
  if (stickyShell) ro.observe(stickyShell);
  if (pageJumps) ro.observe(pageJumps);
}

// Multi-tab accessible category submenus (hover-intent on desktop + click/keyboard everywhere).
const submenuControllers = [];

function closeAllSubmenus(exceptController = null) {
  submenuControllers.forEach((ctrl) => {
    if (ctrl !== exceptController && ctrl.isOpen()) {
      ctrl.setExpanded(false, '');
    }
  });
}

function getOpenSubmenuController() {
  return submenuControllers.find((ctrl) => ctrl.isOpen()) || null;
}

navGroups.forEach((group) => {
  const toggle = group.querySelector('.nav-submenu-toggle');
  const panel = group.querySelector('.nav-submenu');
  if (!toggle || !panel) return;

  let openReason = '';
  let hoverOpenTimer = null;
  let hoverCloseTimer = null;

  const clearTimers = () => {
    if (hoverOpenTimer) {
      clearTimeout(hoverOpenTimer);
      hoverOpenTimer = null;
    }
    if (hoverCloseTimer) {
      clearTimeout(hoverCloseTimer);
      hoverCloseTimer = null;
    }
  };

  const controller = {
    group,
    toggle,
    panel,
    isOpen: () => toggle.getAttribute('aria-expanded') === 'true',
    setExpanded(expanded, reason = '') {
      clearTimers();
      if (expanded) {
        closeAllSubmenus(controller);
        openReason = reason || 'click';
      } else {
        openReason = '';
      }
      toggle.setAttribute('aria-expanded', String(expanded));
      panel.hidden = !expanded;
    },
  };
  submenuControllers.push(controller);

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!controller.isOpen()) {
      controller.setExpanded(true, 'click');
    } else if (openReason === 'hover') {
      // Promote hover-opened menu to click-pinned instead of closing on first click.
      openReason = 'click';
    } else {
      controller.setExpanded(false, '');
    }
  });

  group.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse' || window.innerWidth <= 760) return;
    clearTimers();
    if (controller.isOpen()) return;
    hoverOpenTimer = setTimeout(() => {
      hoverOpenTimer = null;
      if (window.innerWidth > 760 && !controller.isOpen()) {
        controller.setExpanded(true, 'hover');
      }
    }, 120);
  });

  group.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse' || window.innerWidth <= 760) return;
    clearTimers();
    if (controller.isOpen() && openReason === 'hover') {
      hoverCloseTimer = setTimeout(() => {
        hoverCloseTimer = null;
        if (controller.isOpen() && openReason === 'hover') {
          controller.setExpanded(false, '');
        }
      }, 180);
    }
  });

  group.addEventListener('focusout', (event) => {
    if (!controller.isOpen()) return;
    const nextFocus = event.relatedTarget;
    if (nextFocus && !group.contains(nextFocus)) {
      controller.setExpanded(false, '');
    }
  });

  panel.addEventListener('click', (event) => {
    if (event.target.closest('a[href]')) {
      controller.setExpanded(false, '');
      if (menu && menu.getAttribute('aria-expanded') === 'true') {
        menu.setAttribute('aria-expanded', 'false');
        menu.textContent = 'Menu';
        if (navigation) navigation.classList.remove('open');
      }
    }
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const openCtrl = getOpenSubmenuController();
  if (openCtrl) {
    event.stopPropagation();
    openCtrl.setExpanded(false, '');
    openCtrl.toggle.focus();
  }
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.nav-group')) {
    closeAllSubmenus();
  }
});

if (menu && navigation) {
  // Collapse mobile navigation only after its controls are available.
  navigation.classList.add('menu-ready');
  menu.hidden = false;

  function setMenuExpanded(expanded) {
    menu.setAttribute('aria-expanded', String(expanded));
    menu.textContent = expanded ? 'Close menu' : 'Menu';
    navigation.classList.toggle('open', expanded);
    if (!expanded) closeAllSubmenus();
    syncStickyHeights();
  }

  menu.addEventListener('click', () => {
    const expanded = menu.getAttribute('aria-expanded') === 'true';
    setMenuExpanded(!expanded);
  });

  document.addEventListener('keydown', (event) => {
    if (
      event.key === 'Escape' &&
      menu.getAttribute('aria-expanded') === 'true' &&
      !getOpenSubmenuController()
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

// Sticky "On this page" category bar: stuck indicator + active-section scrollspy.
if (pageJumps) {
  const jumpEntries = [...pageJumps.querySelectorAll('a[href^="#"]')]
    .map((link) => {
      const id = decodeURIComponent((link.getAttribute('href') || '').slice(1));
      const target = id ? document.getElementById(id) : null;
      return target ? { id, link, target } : null;
    })
    .filter(Boolean);

  let activeLink = null;
  let scrollTicking = false;

  const updatePageJumpsState = () => {
    scrollTicking = false;
    const jumpsRect = pageJumps.getBoundingClientRect();
    const isStuck = window.scrollY > 8 && jumpsRect.top <= stickyNavHeight + 2;
    pageJumps.classList.toggle('is-stuck', isStuck);

    if (!jumpEntries.length) return;

    const threshold = stickyOffsetHeight + 48;
    const atBottom =
      window.scrollY > 40 &&
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 24;

    let current = null;
    if (atBottom) {
      current = jumpEntries[jumpEntries.length - 1];
    } else {
      for (const entry of jumpEntries) {
        if (entry.target.getBoundingClientRect().top <= threshold) {
          current = entry;
        }
      }
      if (!current && isStuck) {
        current = jumpEntries[0];
      }
      if (!current && location.hash.length > 1) {
        const hashId = decodeURIComponent(location.hash.slice(1));
        current = jumpEntries.find((e) => e.id === hashId) || null;
      }
    }

    const nextLink = current ? current.link : null;
    if (nextLink !== activeLink) {
      jumpEntries.forEach(({ link }) => {
        const isCurrent = link === nextLink;
        link.classList.toggle('is-active', isCurrent);
        if (isCurrent) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      });
      activeLink = nextLink;

      if (activeLink && pageJumps.scrollWidth > pageJumps.clientWidth + 4) {
        const linkLeft = activeLink.offsetLeft;
        const linkRight = linkLeft + activeLink.offsetWidth;
        const viewLeft = pageJumps.scrollLeft;
        const viewRight = viewLeft + pageJumps.clientWidth;
        if (linkLeft < viewLeft + 16 || linkRight > viewRight - 16) {
          pageJumps.scrollLeft = Math.max(0, linkLeft - 24);
        }
      }
    }
  };

  const scheduleUpdate = () => {
    if (!scrollTicking) {
      scrollTicking = true;
      window.requestAnimationFrame(updatePageJumpsState);
    }
  };

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', () => {
    syncStickyHeights();
    scheduleUpdate();
  });
  window.addEventListener('hashchange', scheduleUpdate);
  updatePageJumpsState();
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
