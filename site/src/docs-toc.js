// "On this page": the contents list beside an article. tocHtml() runs at build time (the list is plain
// HTML, so it works without JavaScript). The browser only adds scroll-spy highlighting.
const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// headings: [{ level: 2 | 3, id, text }]. A page with fewer than two headings gets no contents list.
export function tocHtml(headings) {
  if (!headings || headings.length < 2) return '';
  const items = headings.map(h => `<li${h.level === 3 ? ' class="docs-toc-sub"' : ''}><a href="#${esc(h.id)}">${esc(h.text)}</a></li>`).join('');
  return `<aside class="docs-toc"><nav aria-labelledby="docs-toc-title"><p class="docs-toc-title" id="docs-toc-title">On this page</p><ul>${items}</ul></nav></aside>`;
}

// Which heading the reader is in: the last one whose top edge has reached `offset` pixels from the top
// of the window, or -1 before the first.
export function activeIndex(tops, offset = 140) {
  let active = -1;
  tops.forEach((top, i) => { if (top <= offset) active = i; });
  return active;
}

export function mountToc() {
  const links = [...document.querySelectorAll('.docs-toc a')];
  const targets = links.map(a => document.getElementById(decodeURIComponent(a.hash.slice(1))));
  if (!links.length || targets.some(t => !t)) return;
  let current = -2;
  const update = () => {
    const i = activeIndex(targets.map(t => t.getBoundingClientRect().top));
    if (i === current) return;
    current = i;
    links.forEach((a, n) => { if (n === i) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
  };
  // The observer wakes us when a heading crosses the top band; a throttled scroll listener covers the
  // time between crossings, so the highlight is right wherever the reader stops.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(update, { rootMargin: '0px 0px -60% 0px', threshold: [0, 1] });
    targets.forEach(t => observer.observe(t));
  }
  let waiting = false;
  addEventListener('scroll', () => {
    if (waiting) return;
    waiting = true;
    requestAnimationFrame(() => { waiting = false; update(); });
  }, { passive: true });
  addEventListener('hashchange', update);
  update();
}
