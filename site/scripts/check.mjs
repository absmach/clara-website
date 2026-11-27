import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { loadMedia, manifestProblems, CDN_BASE } from './media.mjs';
import { loadDocs, referenceProblems, pageKeys, redirectKeys, retiredName, REDIRECT_TARGET } from './docs.mjs';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    files.push(...(entry.isDirectory() ? await walk(file) : [file]));
  }
  return files;
}
const files = await walk(root);
const pages = new Map();
for (const file of files.filter(file => file.endsWith('.html'))) {
  const html = await readFile(file, 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, `Duplicate IDs: ${file}`);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `One h1 required: ${file}`);
  assert.match(html, /<title>[^<]+<\/title>/, `Missing title: ${file}`);
  assert.match(html, /<meta name="description" content="[^"]+"/, `Missing description: ${file}`);
  assert.doesNotMatch(html, retiredName, `Retired brand: ${file}`);
  for (const image of html.matchAll(/<img\b[^>]*>/g)) {
    assert.match(image[0], /\balt="[^"]*"/, `Missing image alt: ${file}`);
    assert.match(image[0], /\bwidth="\d+"/, `Missing image width: ${file}`);
    assert.match(image[0], /\bheight="\d+"/, `Missing image height: ${file}`);
  }
  pages.set(file, { html, ids });
}
for (const [file, { html, ids }] of pages) {
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const href = match[1];
    if (/^(https?:|mailto:)/.test(href)) continue;
    const [pathname, fragment] = href.split('#');
    let target = pathname ? path.resolve(root, '.' + pathname) : file;
    const info = await stat(target).catch(() => null);
    assert.ok(info, `Missing local resource ${href} in ${file}`);
    if (info.isDirectory()) target = path.join(target, 'index.html');
    assert.ok(files.includes(target), `Missing local resource ${href} in ${file}`);
    if (fragment) assert.ok(pages.get(target)?.ids.includes(fragment), `Missing fragment ${href} in ${file}`);
  }
  for (const match of html.matchAll(/\b(?:aria-controls|aria-labelledby|for)="([^"]+)"/g)) {
    for (const id of match[1].split(' ')) assert.ok(ids.includes(id), `Missing ID ${id} in ${file}`);
  }
}
for (const file of files.filter(file => file.endsWith('.css'))) {
  const css = await readFile(file, 'utf8');
  for (const match of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) {
    assert.ok(files.includes(path.resolve(root, '.' + match[1])), `Missing CSS asset: ${match[1]}`);
  }
}

// User guide: front matter, template, links, clips, raw Markdown and llms files.
const docs = await loadDocs().catch(error => assert.fail(error.message));
const keys = pageKeys(docs.pages);
const redirects = redirectKeys(docs.redirects);
const problems = [];
const media = await loadMedia().catch(error => assert.fail(`docs/media.json: ${error.message}`));
problems.push(...manifestProblems(media));
const clipExists = url => url in media;
for (const page of docs.pages) {
  problems.push(...referenceProblems(page, keys, redirects, clipExists));
  if (!files.includes(path.join(root, page.route, 'index.html'))) problems.push(`${page.route}: no HTML page in dist (run pnpm run build)`);
  if (!files.includes(path.join(root, `${page.route}.md`))) problems.push(`${page.route}.md: not in dist (run pnpm run build)`);
  const html = pages.get(path.join(root, page.route, 'index.html'))?.html ?? '';
  for (const [, url] of html.matchAll(/\b(?:src|poster)="(\/assets\/docs\/[^"]+)"/g)) problems.push(`${page.route}: clip address ${url} wasn't rewritten to a ${CDN_BASE} address (is it in docs/media.json?)`);
  if (!html.includes('rel="alternate" type="text/markdown"')) problems.push(`${page.route}: missing the Markdown alternate link`);
}
for (const [from, to] of Object.entries(docs.redirects)) {
  if (!files.includes(path.join(root, from, 'index.html'))) problems.push(`${from}: redirect page missing from dist`);
  if (!REDIRECT_TARGET.test(to)) problems.push(`${from}: redirect target ${to} must look like /docs/section/page/`);
  if (!keys.has(to.replace(/\/+$/, ''))) problems.push(`${from}: redirects to ${to}, which is not a docs page`);
}
for (const name of ['llms.txt', 'llms-full.txt']) if (!files.includes(path.join(root, name))) problems.push(`${name} missing from dist`);
const llms = files.includes(path.join(root, 'llms.txt')) ? await readFile(path.join(root, 'llms.txt'), 'utf8') : '';
for (const page of docs.pages) if (!llms.includes(`/${page.route}.md`)) problems.push(`llms.txt doesn't list ${page.route}`);
assert.deepEqual(problems, [], `Docs problems:\n  - ${problems.join('\n  - ')}`);
const contributing = await readFile(new URL('../docs/CONTRIBUTING.md', import.meta.url), 'utf8');
assert.doesNotMatch(contributing, retiredName, 'Retired brand: docs/CONTRIBUTING.md');
assert.ok(!files.some(file => file.endsWith('CONTRIBUTING.md')), 'CONTRIBUTING.md must not be published');

console.log(`Checked ${pages.size} pages: local links, fragments, assets, IDs, metadata, accessible references, and Clara branding. Docs: ${docs.pages.length} pages with front matter, links, clips and llms files.`);
