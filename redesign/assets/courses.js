const courseDirectory = document.querySelector('.course-directory');
if (courseDirectory) {
  const form = courseDirectory.querySelector('#course-filters');
  const searchInput = courseDirectory.querySelector('#course-search');
  const degreeSelect = courseDirectory.querySelector('#course-degree');
  const trackSelect = courseDirectory.querySelector('#course-track');
  const groupSelect = courseDirectory.querySelector('#course-group');
  const resetBtn = courseDirectory.querySelector('#course-reset');
  const emptyBox = courseDirectory.querySelector('#course-empty');
  const emptyResetBtn = courseDirectory.querySelector('#course-empty-reset');
  const countEl = courseDirectory.querySelector('#course-count');
  const rows = [...courseDirectory.querySelectorAll('tr.course-row[data-course-code]')];

  // Normalize hyphens, punctuation, and diacritics so "ISSP-2170" === "issp 2170" === "ISSP 2170".
  const normalize = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[-–—_/.,:;()[\]]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const rowSearchMap = new Map(
    rows.map((row) => {
      const norm = normalize(row.dataset.search || row.textContent || '');
      const compact = norm.replace(/\s+/g, '');
      return [row, `${norm} ${compact}`];
    })
  );

  function readUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || params.get('query') || '';
    const degree = params.get('degree') || params.get('program') || '';
    const track = params.get('track') || '';
    const group = params.get('group') || '';

    if (searchInput && q) searchInput.value = q;
    if (degreeSelect && degree) {
      const opt = [...degreeSelect.options].find(
        (o) => o.value.toLowerCase() === degree.toLowerCase()
      );
      if (opt) degreeSelect.value = opt.value;
    }
    if (trackSelect && track) {
      const opt = [...trackSelect.options].find(
        (o) => o.value.toLowerCase() === track.toLowerCase()
      );
      if (opt) trackSelect.value = opt.value;
    }
    if (groupSelect && group) {
      const opt = [...groupSelect.options].find(
        (o) =>
          o.value.toLowerCase() === group.toLowerCase() ||
          o.textContent.toLowerCase().includes(group.toLowerCase())
      );
      if (opt) groupSelect.value = opt.value;
    }
  }

  function filterCourses() {
    const degreeVal = degreeSelect ? degreeSelect.value : '';
    const trackVal = trackSelect ? trackSelect.value : '';
    const groupVal = groupSelect ? groupSelect.value : '';
    const rawQuery = searchInput ? searchInput.value.trim() : '';
    const terms = normalize(rawQuery).split(' ').filter(Boolean);

    let visibleCount = 0;
    for (const row of rows) {
      const programs = (row.dataset.programs || '').split('|').filter(Boolean);
      const tracks = (row.dataset.tracks || '').split('|').filter(Boolean);
      const group = row.dataset.group || '';
      const haystack = rowSearchMap.get(row) || '';

      const matchesDegree = !degreeVal || programs.includes(degreeVal);
      const matchesTrack = !trackVal || tracks.includes(trackVal);
      const matchesGroup = !groupVal || group === groupVal;
      const matchesQuery =
        terms.length === 0 || terms.every((term) => haystack.includes(term));

      const show = matchesDegree && matchesTrack && matchesGroup && matchesQuery;
      row.hidden = !show;
      if (show) visibleCount += 1;
    }

    if (emptyBox) {
      emptyBox.hidden = visibleCount !== 0;
    }

    if (countEl) {
      const activeFilters = [
        degreeVal ? `Degree: ${degreeVal}` : '',
        trackVal ? `Track: ${trackVal}` : '',
        groupVal ? `Group: ${groupVal}` : '',
        rawQuery ? `Search: “${rawQuery}”` : '',
      ].filter(Boolean);
      const suffix = activeFilters.length
        ? ` · ${activeFilters.join(' · ')}`
        : ' · 2026–2027 catalog edition · Last verified 2026-11-20';
      countEl.textContent = `Showing ${visibleCount} of ${rows.length} ${
        visibleCount === 1 ? 'course' : 'courses'
      }${suffix}`;
    }
  }

  function resetFilters() {
    if (searchInput) searchInput.value = '';
    if (degreeSelect) degreeSelect.value = '';
    if (trackSelect) trackSelect.value = '';
    if (groupSelect) groupSelect.value = '';
    filterCourses();
    if (searchInput) searchInput.focus();
  }

  if (form) {
    form.hidden = false;
    form.addEventListener('submit', (event) => event.preventDefault());
  }
  if (searchInput) {
    searchInput.addEventListener('input', filterCourses);
    searchInput.addEventListener('change', filterCourses);
  }
  for (const select of [degreeSelect, trackSelect, groupSelect]) {
    if (select) select.addEventListener('change', filterCourses);
  }
  if (resetBtn) resetBtn.addEventListener('click', resetFilters);
  if (emptyResetBtn) emptyResetBtn.addEventListener('click', resetFilters);

  readUrlParams();
  filterCourses();
}
