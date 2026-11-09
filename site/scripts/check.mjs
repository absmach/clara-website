import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

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
  assert.doesNotMatch(html, /\bMotif\b/i, `Retired brand: ${file}`);
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
    if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
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
console.log(`Checked ${pages.size} pages: local links, fragments, assets, IDs, metadata, accessible references, and Clara branding.`);
