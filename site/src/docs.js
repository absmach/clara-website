// Docs clips. The build removes `autoplay` and adds controls, so without this script
// (or with reduced motion) visitors see the poster and can press play.
function startClips() {
  const clips = [...document.querySelectorAll('video[data-autoplay]')];
  if (!clips.length) return;
  const quiet = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (quiet.matches) return;
  const watcher = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting && !quiet.matches) target.play().catch(() => { target.controls = true; });
      else target.pause();
    }
  }, { threshold: 0.4 }) : null;
  for (const clip of clips) {
    clip.muted = true;
    clip.loop = true;
    clip.controls = false;
    if (watcher) watcher.observe(clip);
    else clip.play().catch(() => { clip.controls = true; });
  }
  // If the preference changes while the page is open, hand control back.
  quiet.addEventListener('change', () => {
    if (!quiet.matches) return;
    for (const clip of clips) { clip.pause(); clip.controls = true; }
  });
}
startClips();

// Search. The field is hidden in the HTML and shown here, so without JavaScript nothing looks broken.
// It matches words against /docs/search-index.json, weighting titles above headings above text.
function startSearch() {
  const boxes = [...document.querySelectorAll('[data-docs-search]')];
  if (!boxes.length) return;
  let index = null;
  let loading = null;
  const load = () => loading || (loading = fetch('/docs/search-index.json').then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))).then(data => { index = data; return data; }).catch(() => { loading = null; return null; }));
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const words = text => text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

  // Returns up to `limit` hits: { entry, heading, score }, best first. Every word must match somewhere.
  function search(query, limit = 8) {
    const terms = words(query);
    if (!terms.length || !index) return [];
    const hits = [];
    for (const entry of index) {
      const title = entry.title.toLowerCase();
      const description = entry.description.toLowerCase();
      const excerpt = (entry.excerpt || '').toLowerCase();
      const section = entry.section.toLowerCase();
      let score = 0;
      let best = null;
      let bestScore = 0;
      let ok = true;
      for (const term of terms) {
        let hit = 0;
        if (title.includes(term)) hit += words(title).some(w => w.startsWith(term)) ? 12 : 6;
        if (title === term) hit += 10;
        let headingHit = 0;
        for (const heading of entry.headings) {
          const text = heading.text.toLowerCase();
          if (!text.includes(term)) continue;
          const value = words(text).some(w => w.startsWith(term)) ? 6 : 3;
          headingHit = Math.max(headingHit, value);
          if (value > bestScore) { best = heading; bestScore = value; }
        }
        hit += headingHit;
        if (description.includes(term)) hit += 3;
        if (section.includes(term)) hit += 2;
        if (excerpt.includes(term)) hit += 1;
        if (!hit) { ok = false; break; }
        score += hit;
      }
      if (ok) hits.push({ entry, heading: terms.every(t => title.includes(t)) ? null : best, score });
    }
    return hits.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title)).slice(0, limit);
  }

  for (const box of boxes) {
    const input = box.querySelector('input');
    const list = box.querySelector('[role=listbox]');
    const status = box.querySelector('[data-search-status]');
    const hint = box.querySelector('[data-search-hint]');
    let active = -1;
    let options = [];
    if (hint) hint.textContent = mac ? '\u2318K' : 'Ctrl K';
    box.hidden = false;

    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
    const setActive = n => {
      if (!options.length) return;
      active = (n + options.length) % options.length;
      options.forEach((o, i) => { o.setAttribute('aria-selected', String(i === active)); if (i === active) { input.setAttribute('aria-activedescendant', o.id); o.scrollIntoView({ block: 'nearest' }); } });
    };
    const render = () => {
      const query = input.value.trim();
      list.textContent = '';
      options = [];
      active = -1;
      input.removeAttribute('aria-activedescendant');
      if (!query) { close(); status.textContent = ''; return; }
      const hits = search(query);
      if (!index) { status.textContent = 'Loading search'; return; }
      if (!hits.length) {
        const li = document.createElement('li');
        li.className = 'docs-search-empty';
        li.setAttribute('role', 'presentation');
        li.textContent = `No pages match \u201c${query}\u201d. Try fewer or different words.`;
        list.append(li);
        status.textContent = 'No results';
      } else {
        hits.forEach(({ entry, heading }, i) => {
          const li = document.createElement('li');
          li.setAttribute('role', 'presentation');
          const a = document.createElement('a');
          a.id = `${list.id}-${i}`;
          a.setAttribute('role', 'option');
          a.setAttribute('aria-selected', 'false');
          a.href = entry.route + (heading ? `#${heading.id}` : '');
          const t = document.createElement('strong');
          t.textContent = heading ? `${entry.title}: ${heading.text}` : entry.title;
          const m = document.createElement('span');
          m.textContent = `${entry.section} \u2014 ${entry.description}`;
          a.append(t, m);
          a.addEventListener('mousemove', () => { if (active !== i) setActive(i); });
          li.append(a);
          list.append(li);
          options.push(a);
        });
        status.textContent = `${hits.length} ${hits.length === 1 ? 'result' : 'results'}`;
        setActive(0);
      }
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    };

    input.addEventListener('focus', load);
    input.addEventListener('input', () => { load().then(render); render(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (list.hidden && input.value.trim()) render();
        if (!options.length) return;
        e.preventDefault();
        setActive(active + (e.key === 'ArrowDown' ? 1 : -1));
      } else if (e.key === 'Enter') {
        const target = options[active] || options[0];
        if (target) { e.preventDefault(); location.href = target.href; }
      } else if (e.key === 'Escape') {
        if (!list.hidden) { e.preventDefault(); close(); } else if (input.value) { input.value = ''; status.textContent = ''; }
      }
    });
    box.addEventListener('focusout', () => setTimeout(() => { if (!box.contains(document.activeElement)) close(); }, 0));
    input.addEventListener('focus', () => { if (input.value.trim()) render(); });
  }

  // Ctrl K, Cmd K and "/" jump to the first search field that is on screen.
  document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '') || document.activeElement?.isContentEditable;
    const shortcut = ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') || (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !typing);
    if (!shortcut) return;
    const input = boxes.map(b => b.querySelector('input')).find(i => i.offsetParent !== null);
    if (!input) return;
    e.preventDefault();
    input.focus();
    input.select();
  });
}
startSearch();
