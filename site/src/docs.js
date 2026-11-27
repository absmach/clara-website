// Docs clips. The build removes `autoplay` and adds native controls, so without this script
// (or with reduced motion) visitors see the poster and can press play. With it, each clip gets
// the control bar from docs-player.js, and clips that may autoplay play, muted and looping, only while visible.
async function startClips() {
  let mount = null;
  try { ({ mountPlayer: mount } = await import('/docs-player.js')); } catch {
    // No player: hide the bar the page was built with and keep the native controls.
    document.documentElement.classList.add('no-player');
    for (const video of document.querySelectorAll('.docs-body video')) video.controls = true;
  }
  const videos = [...document.querySelectorAll('.docs-body video')];
  if (mount) for (const video of videos) mount(video);
  // Without the control bar, hand control back to the browser's own.
  const native = clip => { if (!clip.closest('.docs-player')) clip.controls = true; };

  const clips = videos.filter(video => video.hasAttribute('data-autoplay'));
  if (!clips.length) return;
  const quiet = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Reduced motion: no autoplay, and no looping if the reader presses play.
  if (quiet.matches) { for (const video of videos) video.loop = false; return; }
  const watcher = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      // A clip the reader paused stays paused.
      if (isIntersecting && !quiet.matches && !target.dataset.userPaused) target.play().catch(() => native(target));
      else target.pause();
    }
  }, { threshold: 0.4 }) : null;
  for (const clip of clips) {
    clip.muted = true;
    clip.loop = true;
    clip.controls = false;
    if (watcher) watcher.observe(clip);
    else clip.play().catch(() => native(clip));
  }
  // If the preference changes while the page is open, stop the clips.
  quiet.addEventListener('change', () => {
    if (!quiet.matches) return;
    for (const clip of clips) { clip.pause(); clip.loop = false; native(clip); }
  });
}
startClips();

// Search. The field is hidden in the HTML and shown here, so without JavaScript nothing looks broken.
// It matches words against /docs/search-index.json (see docs-search.js for the ranking).
function startSearch(search) {
  const boxes = [...document.querySelectorAll('[data-docs-search]')];
  if (!boxes.length) return;
  let index = null;
  let loading = null;
  const load = () => loading || (loading = fetch('/docs/search-index.json')
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then(data => { index = data; return data; })
    .catch(() => { loading = null; return null; }));
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  for (const box of boxes) {
    const input = box.querySelector('input');
    const list = box.querySelector('[role=listbox]');
    const pop = box.querySelector('.docs-search-pop');
    const status = box.querySelector('[data-search-status]');
    const hint = box.querySelector('[data-search-hint]');
    let active = -1;
    let options = [];
    if (hint) hint.textContent = mac ? '\u2318K' : 'Ctrl K';
    box.hidden = false;

    // Soft fades at the top and bottom edge while there is more list in that direction.
    const fades = () => {
      pop.classList.toggle('has-above', list.scrollTop > 1);
      pop.classList.toggle('has-below', list.scrollTop + list.clientHeight < list.scrollHeight - 1);
    };
    list.addEventListener('scroll', fades, { passive: true });
    const close = () => { pop.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
    const setActive = n => {
      if (!options.length) return;
      active = (n + options.length) % options.length;
      options.forEach((o, i) => { o.setAttribute('aria-selected', String(i === active)); if (i === active) { input.setAttribute('aria-activedescendant', o.id); o.scrollIntoView({ block: 'nearest' }); } });
    };
    const message = text => {
      const li = document.createElement('li');
      li.className = 'docs-search-empty';
      li.setAttribute('role', 'presentation');
      li.textContent = text;
      list.append(li);
    };
    const render = () => {
      const query = input.value.trim();
      list.textContent = '';
      options = [];
      active = -1;
      input.removeAttribute('aria-activedescendant');
      if (!query) { close(); status.textContent = ''; return; }
      if (!index) {
        message('Search isn\u2019t available right now. Browse the docs from the menu.');
        status.textContent = 'Search isn\u2019t available right now';
      } else {
        const hits = search(index, query);
        if (!hits.length) {
          message(`No pages match \u201c${query}\u201d. Try fewer or different words.`);
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
      }
      pop.hidden = false;
      fades();
      input.setAttribute('aria-expanded', 'true');
    };

    // Render once, after the index is here, and only if the field still holds what was typed.
    const update = () => {
      const typed = input.value;
      if (!typed.trim() || index) { render(); return; }
      status.textContent = 'Loading search';
      load().then(() => { if (input.value === typed) render(); });
    };
    input.addEventListener('focus', () => { load(); if (input.value.trim()) update(); });
    input.addEventListener('input', update);
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (pop.hidden && input.value.trim()) render();
        if (!options.length) return;
        e.preventDefault();
        setActive(active + (e.key === 'ArrowDown' ? 1 : -1));
      } else if (e.key === 'Enter') {
        const target = options[active] || options[0];
        if (target) { e.preventDefault(); location.href = target.href; }
      } else if (e.key === 'Escape') {
        if (!pop.hidden) { e.preventDefault(); close(); } else if (input.value) { input.value = ''; status.textContent = ''; }
      }
    });
    box.addEventListener('focusout', () => setTimeout(() => { if (!box.contains(document.activeElement)) close(); }, 0));
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
// Loaded on its own so a missing search file can never stop the clips above.
import('/docs-search.js').then(module => startSearch(module.search)).catch(() => {});
