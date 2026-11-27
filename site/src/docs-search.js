// Docs search: matching only, no DOM. docs.js shows the results, and the tests import this file.
// Words are reduced to a light stem and matched by prefix, so "approve" finds "approvals"
// and "share" finds "sharing". Titles (and the short `task` label) outweigh headings, then text.
const SUFFIXES = ['ations', 'ation', 'ings', 'ing', 'ions', 'ion', 'als', 'al', 'ed', 'es', 's', 'e'];

export const words = text => String(text ?? '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

export function stem(word) {
  for (const suffix of SUFFIXES) if (word.length - suffix.length >= 3 && word.endsWith(suffix)) return word.slice(0, -suffix.length);
  return word;
}

const stems = text => words(text).map(stem);
const has = (list, term) => list.some(s => s.startsWith(term));
const cache = new WeakMap();
function prepare(entry) {
  let p = cache.get(entry);
  if (!p) {
    p = {
      title: stems(entry.title),
      task: stems(entry.task),
      description: stems(entry.description),
      section: stems(entry.section),
      excerpt: stems(entry.excerpt),
      headings: (entry.headings || []).map(h => ({ heading: h, stems: stems(h.text) })),
    };
    cache.set(entry, p);
  }
  return p;
}

// Up to `limit` hits, best first: { entry, heading, score }. Every word must match somewhere.
// `heading` is the section of the page that matches the most words, or null when the title already covers them all.
export function search(index, query, limit = 8) {
  const terms = words(query).map(stem);
  if (!terms.length || !Array.isArray(index)) return [];
  const hits = [];
  for (const entry of index) {
    const p = prepare(entry);
    let score = 0;
    let ok = true;
    for (const term of terms) {
      let hit = 0;
      if (has(p.title, term)) hit += 12;
      if (has(p.task, term)) hit += 6;
      if (p.headings.some(h => has(h.stems, term))) hit += 5;
      if (has(p.description, term)) hit += 3;
      if (has(p.section, term)) hit += 2;
      if (has(p.excerpt, term)) hit += 1;
      if (!hit) { ok = false; break; }
      score += hit;
    }
    if (!ok) continue;
    const named = [...p.title, ...p.task];
    let heading = null;
    if (!terms.every(t => has(named, t))) {
      let bestCount = 0;
      for (const h of p.headings) {
        const count = terms.filter(t => has(h.stems, t)).length;
        if (count > bestCount) { bestCount = count; heading = h.heading; }
      }
    }
    hits.push({ entry, heading, score });
  }
  return hits.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title)).slice(0, limit);
}
