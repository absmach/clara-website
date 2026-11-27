// User guide: Markdown pages in site/docs/<section>/<slug>.md, rendered by build.mjs.
// This file holds everything that is not file output, so check.mjs and the tests can reuse it.
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Marked } from 'marked';

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

const UNSAFE_URL = /(?:\]\(\s*<?|\b(?:href|src|poster)\s*=\s*["']?\s*)(?:javascript|data|vbscript):/i;

// Problems with one page's own content. Returns a list of messages.
export function pageProblems(page) {
  const problems = [];
  const where = `docs/${page.section}/${page.slug}.md`;
  const need = message => problems.push(`${where}: ${message}`);
  if (!page.title) need('front matter needs a title');
  if (!page.description) need('front matter needs a description');
  if (!Number.isFinite(page.order)) need('front matter needs a numeric order');
  if (page.tag && page.tag !== LIMITED) need(`unknown tag "${page.tag}" (only "${LIMITED}" is supported)`);
  const prose = page.body.replace(/^(```|~~~)[\s\S]*?^\1/gm, '');
  if ((prose.match(/^# \S/gm) || []).length !== 1) need('needs exactly one "# " heading');
  if (!/^## Next steps\s*$/m.test(prose)) need('needs a "## Next steps" section');
  else {
    const tail = prose.slice(prose.search(/^## Next steps\s*$/m)).replace(/^## Next steps\s*$/m, '');
    if (/^## /m.test(tail)) need('"Next steps" must be the last "## " section');
    if (!/\]\(\/docs\//.test(tail)) need('"Next steps" needs at least one link to another docs page');
  }
  if (UNSAFE_URL.test(page.body)) need('links and clips can\'t use javascript:, data: or vbscript: addresses');
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
      else if (!exists(url)) problems.push(`${where}: ${kind} ${url} not found in site/src${url}`);
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
  let html = prepareVideos(marked.parse(body));
  if (page.tag === LIMITED) html = html.replace('</h1>', `</h1>\n<p class="docs-note docs-note-limited"><strong>${LIMITED}.</strong> ${LIMITED_NOTE}</p>`);
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
      const page = { section: section.id, sectionTitle: section.title, slug, route: `docs/${section.id}/${slug}`, title: parsed.data.title, description: parsed.data.description, order: Number(parsed.data.order), tag: parsed.data.tag || '', body: parsed.body, raw };
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

// Sidebar: sections > pages. The open section is the current one.
export function sidebar(sections, current) {
  const body = sections.map(s => {
    const open = current && s.id === current.section;
    const items = s.pages.map(p => {
      const here = current && p.route === current.route;
      return `<li><a href="/${p.route}/"${here ? ' aria-current="page"' : ''}>${escapeHtml(p.title)}${p.tag ? `<span class="docs-pill">${escapeHtml(p.tag)}</span>` : ''}</a></li>`;
    }).join('');
    return `<details class="docs-group"${open ? ' open' : ''}><summary>${escapeHtml(s.title)}</summary><ul>${items}</ul></details>`;
  }).join('');
  return `<div class="docs-nav-list"><a class="docs-overview${current ? '' : ' is-current'}" href="/docs/"${current ? '' : ' aria-current="page"'}>All docs</a>${body}</div>`;
}

export function docPage({ page, sections, pages }) {
  const i = pages.indexOf(page);
  const prev = pages[i - 1];
  const next = pages[i + 1];
  const nav = sidebar(sections, page);
  const pager = link => (link ? `<a href="/${link.route}/"><span>${link === prev ? 'Previous' : 'Next'}</span><strong>${escapeHtml(link.title)}</strong></a>` : '<span></span>');
  return `<div class="container docs-shell"><aside class="docs-sidebar"><p class="eyebrow">CLARA DOCS</p><nav aria-label="Documentation">${nav}</nav><a class="docs-help" href="/contact/">Need a hand? Talk to us →</a></aside><article class="docs-article"><details class="docs-mobile-nav"><summary><span>Browse the docs</span><strong>${escapeHtml(page.sectionTitle)}</strong></summary><nav aria-label="Documentation menu">${nav}</nav></details><a class="breadcrumb" href="/docs/">Docs / ${escapeHtml(page.sectionTitle)}</a><div class="docs-body">${renderMarkdown(page.body, page)}</div><nav class="docs-pager" aria-label="Previous and next pages">${pager(prev)}${pager(next)}</nav><p class="docs-raw"><a href="/${page.route}.md">View this page as Markdown</a></p></article></div>`;
}

export function docsIndex({ sections, pages }) {
  const first = pages[0];
  const cards = sections.map(s => `<section class="docs-index-section" aria-labelledby="idx-${s.id}"><h2 id="idx-${s.id}">${escapeHtml(s.title)}</h2>${s.description ? `<p>${escapeHtml(s.description)}</p>` : ''}<ul>${s.pages.map(p => `<li><a href="/${p.route}/"><strong>${escapeHtml(p.title)}</strong>${p.tag ? `<span class="docs-pill">${escapeHtml(p.tag)}</span>` : ''}<span>${escapeHtml(p.description)}</span></a></li>`).join('')}</ul></section>`).join('');
  return `<section class="page-hero resource-hero"><div class="container"><h1>A little guidance. <em>A good place to start.</em></h1><p class="lead">Learn how to use Clara, step by step. Every page is also plain Markdown for assistants and other tools.</p></div></section><div class="container docs-index">${first ? `<a class="docs-start" href="/${first.route}/"><span class="eyebrow">NEW TO CLARA?</span><h2>${escapeHtml(first.title)}</h2><p>${escapeHtml(first.description)}</p><span class="quiet-link">Start here ↗</span></a>` : ''}<div class="docs-index-grid">${cards}</div><p class="docs-raw">For assistants and other tools: <a href="/llms.txt">llms.txt</a> lists every page, and <a href="/llms-full.txt">llms-full.txt</a> holds them all in one file.</p></div>`;
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
export const absoluteLinks = md => md.replace(/\]\(\/(?!\/)/g, `](${siteUrl}/`).replace(/\b(href|src|poster)="\/(?!\/)/g, `$1="${siteUrl}/`);

export function llmsFullTxt({ pages }) {
  const intro = '# Clara user guide\n\nEvery page of the Clara user guide, in reading order. Each page starts with its address.\n';
  return [intro, ...pages.map(p => `---\n\nSource: ${siteUrl}/${p.route}/${p.tag ? `\nAvailability: ${p.tag}` : ''}\n\n${absoluteLinks(p.body.trim())}\n`)].join('\n');
}

export function redirectPage(to) {
  const target = escapeHtml(to);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><script>if(location.hash)location.replace(${JSON.stringify(to)}+location.hash)</script><title>This page has moved — Clara Docs</title><meta name="description" content="This Clara guide page has moved."/><meta name="robots" content="noindex"/><link rel="canonical" href="${siteUrl}${target}"/><meta http-equiv="refresh" content="0;url=${target}"/><link rel="stylesheet" href="/styles.css"/></head><body><main class="container section"><h1>This page has moved.</h1><p><a href="${target}">Continue to the new page →</a></p></main></body></html>`;
}
