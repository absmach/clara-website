// pnpm run media:upload [--dry-run]
// Uploads everything in media/docs/ to the docs media Space and rewrites site/docs/media.json.
// Credentials: DO_SPACES_KEY and DO_SPACES_SECRET, from the environment or a git-ignored .env.media file.
// With --dry-run it only checks which files the Space already has. Entries in media.json whose file
// isn't in media/docs/ are kept (with a warning) unless you pass --prune.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CACHE_CONTROL, ENDPOINT_HOST, cdnUrl, contentType, logicalPath, objectKey, sha256, signRequest } from './media.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const mediaDir = path.join(repo, 'media/docs');
const manifestFile = path.join(repo, 'site/docs/media.json');
const dryRun = process.argv.includes('--dry-run');
const prune = process.argv.includes('--prune');

async function credentials() {
  let { DO_SPACES_KEY: key, DO_SPACES_SECRET: secret } = process.env;
  if (!key || !secret) {
    const file = process.env.MEDIA_ENV_FILE || path.join(repo, '.env.media');
    const text = await readFile(file, 'utf8').catch(() => '');
    const read = name => new RegExp(`^${name}=(.*)$`, 'm').exec(text)?.[1].trim().replace(/^["']|["']$/g, '');
    key ||= read('DO_SPACES_KEY');
    secret ||= read('DO_SPACES_SECRET');
  }
  if (!key || !secret) throw new Error('Set DO_SPACES_KEY and DO_SPACES_SECRET, or put them in .env.media (MEDIA_ENV_FILE names another file).');
  return { accessKey: key, secretKey: secret };
}

async function walk(dir, base = dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await walk(file, base));
    else found.push(path.relative(base, file).split(path.sep).join('/'));
  }
  return found.sort();
}

// Retries a few times: the Space sometimes times out on the first connection.
async function send(auth, method, key, { body, headers = {} } = {}) {
  const payloadHash = sha256(body ?? '');
  for (let attempt = 1; ; attempt++) {
    const signed = signRequest({ method, host: ENDPOINT_HOST, path: `/${key}`, headers, payloadHash, ...auth });
    try {
      const response = await fetch(`https://${ENDPOINT_HOST}/${key}`, { method, headers: signed, body, signal: AbortSignal.timeout(120000) });
      if (response.status < 500 || attempt >= 4) return response;
    } catch (error) {
      if (attempt >= 4) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, attempt * 1500));
  }
}

const files = (await walk(mediaDir).catch(() => [])).filter(f => contentType(path.extname(f)));
if (!files.length) throw new Error('No files in media/docs/. Put clips and posters there as media/docs/<section>/<name>.mp4 and .jpg.');
const auth = await credentials();
const manifest = {};
let uploaded = 0;
let kept = 0;
for (const relative of files) {
  const data = await readFile(path.join(mediaDir, relative));
  const key = objectKey(relative, sha256(data));
  manifest[logicalPath(relative)] = cdnUrl(key);
  const head = await send(auth, 'HEAD', key);
  if (head.ok) { kept++; console.log(`has      ${key}`); continue; }
  if (head.status !== 404 && head.status !== 403) throw new Error(`HEAD ${key}: ${head.status}`);
  if (dryRun) { uploaded++; console.log(`would upload ${key}`); continue; }
  const put = await send(auth, 'PUT', key, { body: data, headers: { 'content-type': contentType(path.extname(relative)), 'cache-control': CACHE_CONTROL, 'x-amz-acl': 'public-read' } });
  // Only the status and the error code: the response body can repeat the access key.
  if (!put.ok) throw new Error(`PUT ${key}: ${put.status} ${/<Code>(\w{1,40})<\/Code>/.exec(await put.text())?.[1] ?? ''}`.trim());
  uploaded++;
  console.log(`uploaded ${key}`);
}
if (dryRun) console.log(`Dry run: ${uploaded} to upload, ${kept} already there. media.json not changed.`);
else {
  // Entries whose file isn't in media/docs/ are kept, so a partial folder can't drop them. --prune removes them.
  const existing = await readFile(manifestFile, 'utf8').then(JSON.parse, () => ({}));
  const missing = Object.keys(existing).filter(k => !(k in manifest));
  const merged = prune ? manifest : { ...existing, ...manifest };
  for (const k of missing) console.warn(`${prune ? 'removed' : 'kept   '} ${k} (no local file in media/docs/)`);
  const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(manifestFile, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`Done: ${uploaded} uploaded, ${kept} already there. Wrote site/docs/media.json (${Object.keys(sorted).length} entries${missing.length && !prune ? `, ${missing.length} kept without a local file; --prune removes them` : ''}). Commit it.`);
}
