// User guide: Markdown pages in site/docs/<section>/<slug>.md, rendered by build.mjs.
// This file holds everything that is not file output, so check.mjs and the tests can reuse it.
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Marked } from 'marked';
import { applyManifest } from './media.mjs';
import { playerHtml } from '../src/docs-player.js';
import { tocHtml } from '../src/docs-toc.js';

export const docsRoot = fileURLToPath(new URL('../docs/', import.meta.url));
export const siteUrl = 'https://claragtm.com';
export const LIMITED = 'Limited availability';
export const LIMITED_NOTE = 'This feature isn’t available in every workspace yet. Contact us if you’d like it turned on.';

export const escapeHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The retired product name, built from parts so this source never contains it.
export const retiredName = new RegExp(`\\b${['Mo', 'tif'].join('')}\\b`, 'i');

// Strips one surrounding pair of quotes, but only when the quote isn't also used inside
// the value (so `"A" and "B"` is kept as is). `\"` and `''` are the escapes.
function unquote(value) {
  const double = /^"((?:[^"\\]|\\.)*)"$/.exec(value);
  if (double) return double[1].replace(/\\(["\\])/g, '$1');
  const single = /^'((?:[^']|'')*)'$/.exec(value);
  if (single) return single[1].replace(/''/g, "'");
  return value;
}

// Front matter is a flat `key: value` list between two `---` lines. No nesting, no lists.
export function parseFrontMatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!match) return { data: null, body: text };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const pair = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!pair) throw new Error(`Unreadable front matter line: "${line}"`);
    let value = pair[2].trim();
    value = unquote(value);
    data[pair[1]] = value;
  }
  return { data, body: text.slice(match[0].length) };
}

// Fenced blocks and inline code are examples, not content: leave them alone.
const CODE = /^[ \t]*(`{3,}|~{3,})[^\n]*(?:\n[\s\S]*?^[ \t]*\1[^\n]*$|(?:\n[\s\S]*)?$)|(?<!`)(`+)(?!`)(?:(?!\n[ \t]*\n)[\s\S])*?(?<!`)\2(?!`)/gm;
const mapProse = (md, fn) => {
  let out = '';
  let last = 0;
  for (const m of md.matchAll(CODE)) { out += fn(md.slice(last, m.index)) + m[0]; last = m.index + m[0].length; }
  return out + fn(md.slice(last));
};
const stripCode = md => md.replace(CODE, '');

const UNSAFE_URL = /(?:\]\(\s*<?|(?<![\w-])(?:href|src|poster)\s*=\s*["']?\s*)(?:javascript|data|vbscript):/i;

// The FAQ section is a list of bold questions, each followed by its answer: **Question?** Answer.
export function faqProblems(prose) {
  const m = /^## FAQ\s*$/m.exec(prose);
  if (!m) return [];
  const rest = prose.slice(m.index + m[0].length);
  const section = rest.split(/^## /m)[0];
  const problems = [];
  let question = null;
  let answered = true;
  // A new bold question starts an entry even without a blank line before it.
  for (const block of section.split(/\n\s*\n|\n(?=\*\*(?:[^*\n]|\*(?!\*))+\?\*\*)/).map(b => b.trim()).filter(Boolean)) {
    const q = /^\*\*((?:[^*]|\*(?!\*))+?)\*\*(?!\*)\s*([\s\S]*)$/.exec(block);
    if (q) {
      if (question && !answered) problems.push(`FAQ question "${question}" has no answer`);
      question = q[1].trim();
      answered = q[2].trim().length > 0;
      if (!question.replace(/[*_`]+$/, '').endsWith('?')) problems.push(`FAQ question "${question}" must end with a question mark`);
    } else if (!question) problems.push('FAQ must start with a bold question, then its answer ("**Question?** Answer.")');
    else answered = true;
  }
  if (question && !answered) problems.push(`FAQ question "${question}" has no answer`);
  return problems;
}

// Problems with one page's own content. Returns a list of messages.
export function pageProblems(page) {
  const problems = [];
  const where = `docs/${page.section}/${page.slug}.md`;
  const need = message => problems.push(`${where}: ${message}`);
  if (!page.title) need('front matter needs a title');
  if (!page.description) need('front matter needs a description');
  if (!Number.isFinite(page.order)) need('front matter needs a numeric order');
  if (page.popular !== undefined && !Number.isFinite(page.popular)) need('"popular" must be a number (its place in Popular tasks)');
  if (page.task !== undefined && !String(page.task).trim()) need('"task" must not be empty (a short, verb-first label such as "Write your first draft")');
  if (page.task !== undefined && page.popular === undefined) need('"task" only appears in Popular tasks, so it needs a "popular" number too');
  if (page.tag && page.tag !== LIMITED) need(`unknown tag "${page.tag}" (only "${LIMITED}" is supported)`);
  const prose = stripCode(page.body);
  if ((prose.match(/^# \S/gm) || []).length !== 1) need('needs exactly one "# " heading');
  if (!/^## Next steps\s*$/m.test(prose)) need('needs a "## Next steps" section');
  else {
    const tail = prose.slice(prose.search(/^## Next steps\s*$/m)).replace(/^## Next steps\s*$/m, '');
    if (/^## /m.test(tail)) need('"Next steps" must be the last "## " section');
    if (!/\]\(\/docs\//.test(tail)) need('"Next steps" needs at least one link to another docs page');
  }
  for (const message of faqProblems(prose)) need(message);
  if (UNSAFE_URL.test(stripCode(page.body))) need('links and clips can\'t use javascript:, data: or vbscript: addresses');
  if (retiredName.test(`${page.title} ${page.description} ${page.body}`)) need('uses the retired product name; the product is Clara');
  return problems;
}

// Links and clips in the Markdown that point at something that doesn't exist.
// `exists(url)` is injected so tests don't need the file system.
export function referenceProblems(page, pageKeys, redirectKeys, exists) {
  const problems = [];
  const where = `docs/${page.section}/${page.slug}.md`;
  const links = [...page.body.matchAll(/\]\((\/docs[^)\s]*)(?:\s+(?:"[^"]*"|'[^']*'))?\)/g), ...page.body.matchAll(/\bhref="(\/docs[^"]*)"/g)].map(m => m[1]);
  for (const link of links) {
    const route = link.split('#')[0].replace(/\.md$/, '').replace(/\/+$/, '');
    if (route === '/docs') continue;
    if (redirectKeys.has(route)) problems.push(`${where}: link ${link} is an old address; link the page it moved to`);
    else if (!pageKeys.has(route)) problems.push(`${where}: link ${link} doesn't match any docs page`);
  }
  for (const [, tag] of page.body.matchAll(/<video\b([^>]*)>/g)) {
    const src = /\bsrc="([^"]+)"/.exec(tag)?.[1];
    const poster = /\bposter="([^"]+)"/.exec(tag)?.[1];
    const label = /\baria-label="([^"]+)"/.exec(tag)?.[1];
    if (!src) { problems.push(`${where}: <video> needs a src`); continue; }
    if (!poster) problems.push(`${where}: clip ${src} needs a poster`);
    if (!label) problems.push(`${where}: clip ${src} needs an aria-label that describes it`);
    for (const [kind, url] of [['clip', src], ['poster', poster]]) {
      if (!url) continue;
      if (!url.startsWith('/assets/docs/')) problems.push(`${where}: ${kind} ${url} must live under /assets/docs/`);
      else if (!exists(url)) problems.push(`${where}: ${kind} ${url} isn't in docs/media.json (put the file in media/docs/ and run pnpm run media:upload)`);
    }
  }
  return problems;
}

const slugify = text => text.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');

// Readers without JavaScript get a poster and play controls. docs.js starts the
// clips that may autoplay. The raw Markdown keeps `autoplay` for everyone else.
export function prepareVideos(html) {
  return html.replace(/<video\b([^>]*)>/g, (all, attrs) => {
    const wants = /\bautoplay\b/.test(attrs);
    let next = attrs.replace(/\s+autoplay(?:="[^"]*")?(?=\s|$)/g, '');
    if (!/\bcontrols\b/.test(next)) next += ' controls';
    if (!/\bpreload=/.test(next)) next += ' preload="metadata"';
    if (!/\bplaysinline\b/.test(next)) next += ' playsinline';
    return `<video${next}${wants ? ' data-autoplay' : ''}>`;
  });
}

// Readers get trailing-slash URLs; the Markdown source keeps the shorter form.
export function prettyHref(href) {
  const m = /^(\/docs\/[^#?]*)(.*)$/.exec(href);
  if (!m || m[1].endsWith('/') || /\.\w+$/.test(m[1])) return href;
  return `${m[1]}/${m[2]}`;
}

// The "## FAQ" section becomes a list of accordions. Only the HTML changes: the Markdown stays plain text.
// Each bold question starts an item, and everything up to the next question is its answer.
export function faqAccordions(html) {
  return html.replace(/(<h2 id="faq">[\s\S]*?<\/h2>)([\s\S]*?)(?=<h2 |$)/, (all, heading, rest) => {
    // Two questions on consecutive lines are one paragraph: split them.
    rest = rest.replace(/\n(?=<strong>(?:(?!<\/strong>)[\s\S])*\?<\/strong>)/g, '</p>\n<p>');
    const parts = rest.split(/(?=<p><strong>)/).filter(p => p.trim());
    if (!parts.length || !parts.every(p => p.startsWith('<p><strong>'))) return all;
    const items = parts.map(part => {
      const m = /^<p><strong>([\s\S]*?)<\/strong>\s*([\s\S]*)$/.exec(part.trim());
      if (!m) return '';
      const answer = m[2].startsWith('</p>') ? m[2].slice(4).trim() : `<p>${m[2]}`;
      return `<details class="docs-faq-item"><summary>${m[1]}</summary><div class="docs-faq-answer">${answer}</div></details>`;
    }).join('');
    return `${heading}<div class="docs-faq">${items}</div>\n`;
  });
}

export function renderMarkdown(body, page = {}) {
  const used = new Map();
  const marked = new Marked({
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        const base = slugify(text) || 'section';
        const n = used.get(base) || 0;
        used.set(base, n + 1);
        const id = n ? `${base}-${n + 1}` : base;
        return `<h${depth} id="${id}">${text}</h${depth}>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        if (/^\s*(?:javascript|data|vbscript):/i.test(href)) return text;
        const target = prettyHref(href);
        return `<a href="${escapeHtml(target)}"${title ? ` title="${escapeHtml(title)}"` : ''}>${text}</a>`;
      },
    },
  });
  // Each clip gets its control bar in the HTML, so the page doesn't shift when the script starts.
  let html = prepareVideos(marked.parse(body)).replace(/(?:<p>)?(<video\b[^>]*>[\s\S]*?<\/video>)(?:<\/p>)?/g, (all, tag) => playerHtml(tag, /\baria-label="([^"]*)"/.exec(tag)?.[1]));
  if (page.tag === LIMITED) html = html.replace('</h1>', `</h1>\n<p class="docs-note docs-note-limited"><strong>${LIMITED}.</strong> ${LIMITED_NOTE}</p>`);
  html = faqAccordions(html);
  // Wrap the closing "Next steps" section so it can be styled as a block.
  html = html.replace(/<h2 id="next-steps">[\s\S]*?(?=<h2 |$)/, m => `<section class="docs-next-steps" aria-labelledby="next-steps">${m}</section>`);
  return html;
}

async function listMarkdown(dir) {
  try { return (await readdir(dir)).filter(f => f.endsWith('.md')).sort(); } catch { return []; }
}

// Reads sections.json and every page. Sections without pages are dropped from the result.
// Throws when anything is wrong, so a bad page fails the build too.
export async function loadDocs(dir = docsRoot) {
  const sectionList = JSON.parse(await readFile(path.join(dir, 'sections.json'), 'utf8'));
  const ids = sectionList.map(s => s.id);
  if (ids.length !== new Set(ids).size) throw new Error('docs/sections.json lists a section twice');
  const known = new Set(ids);
  const entries = await readdir(dir, { withFileTypes: true });
  const strays = entries.filter(e => e.isDirectory() && !known.has(e.name)).map(e => e.name);
  if (strays.length) throw new Error(`docs/${strays[0]}/ is not listed in docs/sections.json`);
  const problems = [];
  const sections = [];
  for (const [index, section] of sectionList.entries()) {
    if (!section.id || !section.title) throw new Error('Every docs/sections.json entry needs an id and a title');
    const pages = [];
    for (const file of await listMarkdown(path.join(dir, section.id))) {
      const raw = await readFile(path.join(dir, section.id, file), 'utf8');
      const slug = file.slice(0, -3);
      let parsed;
      try { parsed = parseFrontMatter(raw); } catch (error) { problems.push(`docs/${section.id}/${file}: ${error.message}`); continue; }
      if (!parsed.data) { problems.push(`docs/${section.id}/${file}: missing front matter (title, description, order)`); continue; }
      const page = { section: section.id, sectionTitle: section.title, slug, route: `docs/${section.id}/${slug}`, title: parsed.data.title, description: parsed.data.description, order: Number(parsed.data.order), tag: parsed.data.tag || '', popular: parsed.data.popular === undefined ? undefined : (parsed.data.popular === '' ? NaN : Number(parsed.data.popular)), task: parsed.data.task, body: parsed.body, raw };
      problems.push(...pageProblems(page));
      pages.push(page);
    }
    pages.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    if (pages.length) sections.push({ ...section, index, pages });
  }
  if (problems.length) throw new Error(`Docs problems:\n${problems.map(p => `  - ${p}`).join('\n')}`);
  const pages = sections.flatMap(s => s.pages);
  const redirects = JSON.parse(await readFile(path.join(dir, 'redirects.json'), 'utf8'));
  return { sections, pages, redirects };
}

export const pageKeys = pages => new Set(pages.map(p => `/${p.route}`));
export const redirectKeys = redirects => new Set(Object.keys(redirects).map(k => k.replace(/\/+$/, '')));

// Small line icons, defined once. Keyed by section id, plus a few interface icons.
const ICON_PATHS = {
  'start-here': '<path d="M5 3v18"/><path d="M5 4h12l-3 4 3 4H5"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>',
  context: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z"/><path d="M4 21h15"/><path d="M9 8h6"/>',
  create: '<path d="m4 20 1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1Z"/><path d="m14 7 3 3"/>',
  video: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/>',
  grow: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  publish: '<path d="M21 3 10 14"/><path d="m21 3-7 18-4-7-7-4 18-7Z"/>',
  automate: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  connections: '<path d="M9 2v5"/><path d="M15 2v5"/><path d="M6 7h12v4a6 6 0 0 1-12 0V7Z"/><path d="M12 17v5"/>',
  account: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  help: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="m5.6 5.6 3.9 3.9"/><path d="m14.5 14.5 3.9 3.9"/><path d="m18.4 5.6-3.9 3.9"/><path d="m9.5 14.5-3.9 3.9"/>',
  fallback: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
};
export const icon = (name, size = 20) => `<svg class="docs-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON_PATHS[name] || ICON_PATHS.fallback}</svg>`;

// "Get started" cards: page route, and an optional clip poster used as the thumbnail.
const GET_STARTED = [
  { route: 'docs/start-here/quickstart', poster: { src: '/assets/docs/start-here/quickstart-first-draft.jpg', width: 1280, height: 800 } },
  { route: 'docs/start-here/concepts' },
  { route: 'docs/start-here/glossary' },
];
export const POPULAR_LIMIT = 7;

// Pages with a `popular` number, in that order. The label is `task` or, without one, the page title.
export function popularTasks(pages, limit = POPULAR_LIMIT) {
  return pages
    .filter(p => Number.isFinite(p.popular))
    .sort((a, b) => a.popular - b.popular || a.order - b.order || a.title.localeCompare(b.title))
    .slice(0, limit)
    .map(page => ({ page, label: String(page.task ?? '').trim() || page.title }));
}

const decodeEntities = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const EXCERPT_LENGTH = 240;

// Plain text of the first paragraphs, before "Next steps": no Markdown, HTML or code.
export function excerpt(body, max = EXCERPT_LENGTH) {
  let text = stripCode(body).split(/^## Next steps\s*$/m)[0]
    .replace(/<video\b[\s\S]*?<\/video>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s.*$/gm, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_]{1,3}([^*_\n]+)[*_]{1,3}/g, '$1');
  text = decodeEntities(text).replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1))}…`;
}

// The h2 and h3 headings of a rendered page, in order.
export const pageHeadings = html => [...html.matchAll(/<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>/g)]
  .map(m => ({ level: Number(m[1]), id: m[2], text: decodeEntities(m[3].replace(/<[^>]+>/g, '')).trim() }));

// What the browser searches: one entry per page, written to /docs/search-index.json.
export function searchIndex({ pages }) {
  return pages.map(page => {
    const html = renderMarkdown(page.body, page);
    const headings = pageHeadings(html).filter(h => h.id !== 'next-steps');
    return { title: page.title, task: String(page.task ?? '').trim(), description: page.description, section: page.sectionTitle, route: `/${page.route}/`, headings, excerpt: excerpt(page.body) };
  });
}

// The search field. docs.js switches it on; without JavaScript it stays hidden.
export function searchBox(prefix, { large = false } = {}) {
  return `<div class="docs-search${large ? ' docs-search-large' : ''}" data-docs-search hidden><label class="docs-search-label" for="${prefix}-search">Search the docs</label><div class="docs-search-field">${icon('search', 18)}<input id="${prefix}-search" type="search" role="combobox" aria-expanded="false" aria-controls="${prefix}-results" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="Search the docs"/><kbd aria-hidden="true" data-search-hint>Ctrl K</kbd></div><div class="docs-search-pop" hidden><ul class="docs-search-results" id="${prefix}-results" role="listbox" aria-label="Search results"></ul></div><p class="docs-search-status" role="status" aria-live="polite" data-search-status></p></div>`;
}

// Sidebar: sections > pages. The open section is the current one.
export function sidebar(sections, current, openId) {
  const body = sections.map(s => {
    const open = current ? s.id === current.section : s.id === openId;
    const items = s.pages.map(p => {
      const here = current && p.route === current.route;
      return `<li><a href="/${p.route}/"${here ? ' aria-current="page"' : ''}>${escapeHtml(p.title)}${p.tag ? `<span class="docs-pill">${escapeHtml(p.tag)}</span>` : ''}</a></li>`;
    }).join('');
    return `<details class="docs-group"${open ? ' open' : ''}><summary>${escapeHtml(s.title)}</summary><ul>${items}</ul></details>`;
  }).join('');
  return `<div class="docs-nav-list"><a class="docs-overview${current ? '' : ' is-current'}" href="/docs/"${current ? '' : ' aria-current="page"'}>All docs</a>${body}</div>`;
}

// The shell shared by the home and the articles: sidebar on wide screens, a menu on small ones.
function shell({ sections, current, main, head = '', sidebarSearch, mobileSearch, mobileLabel, openId }) {
  const nav = sidebar(sections, current, openId);
  return `<div class="container docs-shell"><aside class="docs-sidebar">${sidebarSearch || ''}<nav aria-label="Documentation">${nav}</nav><a class="docs-help" href="/contact/">Need a hand? Talk to us</a></aside><div class="docs-main">${head}${mobileSearch || ''}<details class="docs-mobile-nav"><summary><span>Browse the docs</span><strong>${escapeHtml(mobileLabel)}</strong></summary><nav aria-label="Documentation menu">${nav}</nav></details>${main}</div></div>`;
}

export function docPage({ page, sections, pages, media = {} }) {
  const i = pages.indexOf(page);
  const prev = pages[i - 1];
  const next = pages[i + 1];
  const pager = link => (link ? `<a href="/${link.route}/"><span>${link === prev ? 'Previous' : 'Next'}</span><strong>${escapeHtml(link.title)}</strong></a>` : '<span></span>');
  const body = applyManifest(renderMarkdown(page.body, page), media);
  const toc = tocHtml(pageHeadings(body));
  // The front-matter description is the lede under the title.
  const lede = body.replace('</h1>', `</h1>\n<p class="docs-lede">${escapeHtml(page.description)}</p>`);
  const main = `<div class="docs-page${toc ? ' has-toc' : ''}"><article class="docs-article"><a class="breadcrumb" href="/docs/">Docs / ${escapeHtml(page.sectionTitle)}</a><div class="docs-body">${lede}</div><nav class="docs-pager" aria-label="Previous and next pages">${pager(prev)}${pager(next)}</nav></article>${toc}</div>`;
  return shell({ sections, current: page, main, sidebarSearch: searchBox('sb'), mobileSearch: searchBox('mb'), mobileLabel: page.sectionTitle });
}

export function docsIndex({ sections, pages, media = {} }) {
  const byRoute = new Map(pages.map(p => [p.route, p]));
  const start = GET_STARTED.map(item => ({ ...item, page: byRoute.get(item.route) })).filter(item => item.page);
  const startCards = start.map(({ page, poster }, n) => `<li><a class="docs-card docs-start-card" href="/${page.route}/">${poster ? `<img class="docs-start-thumb" src="${poster.src}" width="${poster.width}" height="${poster.height}" alt="" loading="lazy" decoding="async"/>` : ''}<span class="docs-start-copy"><span class="docs-start-head"><span class="docs-step" aria-hidden="true">${n + 1}</span><strong>${escapeHtml(page.title)}</strong></span><span>${escapeHtml(page.description)}</span><span class="docs-start-go" aria-hidden="true">${icon('chevron', 18)}</span></span></a></li>`).join('');
  const tasks = popularTasks(pages);
  const taskList = tasks.map(({ page, label }) => `<li><a class="docs-card docs-task" href="/${page.route}/"><span>${escapeHtml(label)}</span>${icon('chevron', 16)}</a></li>`).join('');
  // One whole-card link per section, to its first page. The sidebar already lists the pages.
  const topics = sections.map(s => `<li><a class="docs-card docs-topic" href="/${s.pages[0].route}/" id="topic-${s.id}"><span class="docs-topic-icon">${icon(s.id, 22)}</span><div class="docs-topic-copy"><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.description || '')}</p></div><span class="docs-topic-meta">${s.pages.length} ${s.pages.length === 1 ? 'page' : 'pages'}</span></a></li>`).join('');
  const head = `<header class="docs-home-head"><h1>Clara documentation</h1><p>Learn how to use Clara, from your first draft to automated marketing.</p>${searchBox('hero', { large: true })}</header>`;
  const main = `<div class="docs-home">${startCards ? `<section aria-labelledby="docs-get-started"><h2 id="docs-get-started">Get started</h2><ol class="docs-start-grid">${startCards}</ol></section>` : ''}${taskList ? `<section aria-labelledby="docs-popular"><h2 id="docs-popular">Popular tasks</h2><ul class="docs-tasks">${taskList}</ul></section>` : ''}<section aria-labelledby="docs-topics"><h2 id="docs-topics">Browse by topic</h2><ul class="docs-topics">${topics}</ul></section><aside class="docs-card docs-help-card" aria-labelledby="docs-need-help"><div><h2 id="docs-need-help">Need help?</h2><p>Can’t find what you’re looking for? The Clara team will help.</p></div><a class="button" href="/contact/">Talk to the Clara team</a></aside></div>`;
  return applyManifest(shell({ sections, current: null, main, head, mobileSearch: searchBox('mb'), mobileLabel: 'All docs', openId: sections[0]?.id }), media);
}

export function llmsTxt({ sections }) {
  const lines = ['# Clara', '', '> Clara is an AI marketing team. You work with it in chat and through ready-made jobs called plays. It writes drafts grounded in your brand and knowledge, and nothing is published without approval. These are its user guide pages in Markdown.', ''];
  for (const s of sections) {
    lines.push(`## ${s.title}`, '');
    for (const p of s.pages) lines.push(`- [${p.title}](${siteUrl}/${p.route}.md): ${p.description}${p.tag ? ` (${p.tag})` : ''}`);
    lines.push('');
  }
  return lines.join('\n');
}

// Root-relative links and clips become absolute, for copies read away from the site.
export const absoluteLinks = md => mapProse(md, text => text.replace(/\]\(\/(?!\/)/g, `](${siteUrl}/`).replace(/(?<![\w-])(href|src|poster)="\/(?!\/)/g, `$1="${siteUrl}/`));

export function llmsFullTxt({ pages }, media = {}) {
  const intro = '# Clara user guide\n\nEvery page of the Clara user guide, in reading order. Each page starts with its address.\n';
  return [intro, ...pages.map(p => `---\n\nSource: ${siteUrl}/${p.route}/${p.tag ? `\nAvailability: ${p.tag}` : ''}\n\n${absoluteLinks(applyManifest(p.body.trim(), media))}\n`)].join('\n');
}

export const REDIRECT_TARGET = /^\/docs\/[a-z0-9/-]+\/$/;

export function redirectPage(to) {
  const target = escapeHtml(to);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><script>if(location.hash)location.replace(${JSON.stringify(to).replace(/</g, '\\u003c')}+location.hash)</script><title>This page has moved — Clara Docs</title><meta name="description" content="This Clara guide page has moved."/><meta name="robots" content="noindex"/><link rel="canonical" href="${siteUrl}${target}"/><meta http-equiv="refresh" content="0;url=${target}"/><link rel="stylesheet" href="/styles.css"/></head><body><main class="container section"><h1>This page has moved.</h1><p><a href="${target}">Continue to the new page →</a></p></main></body></html>`;
}
