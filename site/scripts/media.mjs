// Docs clips and posters live on a public bucket (DigitalOcean Spaces), not in git.
// Markdown keeps the logical path (/assets/docs/<section>/<name>.mp4). site/docs/media.json maps
// each one to the CDN address of a content-hashed copy. This file holds what build, check,
// the upload script and the tests share.
import { createHash, createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const CDN_BASE = 'https://clara-docs-media.fra1.cdn.digitaloceanspaces.com';
export const ENDPOINT_HOST = 'clara-docs-media.fra1.digitaloceanspaces.com';
export const REGION = 'fra1';
export const LOGICAL_PREFIX = '/assets/docs/';
export const CACHE_CONTROL = 'public, max-age=31536000, immutable';

const TYPES = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
export const manifestFile = fileURLToPath(new URL('../docs/media.json', import.meta.url));
export const loadMedia = async (file = manifestFile) => JSON.parse(await readFile(file, 'utf8'));
export const contentType = ext => TYPES[ext.toLowerCase()];

export const sha256 = data => createHash('sha256').update(data).digest('hex');

// docs/<section>/<name>.<first 8 hex of the file's sha-256>.<ext>: new content gets a new address.
export function objectKey(relative, hash) {
  const dot = relative.lastIndexOf('.');
  return `docs/${relative.slice(0, dot)}.${hash.slice(0, 8)}${relative.slice(dot)}`;
}
export const logicalPath = relative => `${LOGICAL_PREFIX}${relative}`;
export const cdnUrl = key => `${CDN_BASE}/${key}`;

// Swaps logical clip and poster paths for their CDN addresses. Paths not in the manifest stay as they are
// (check.mjs reports those).
export function applyManifest(text, manifest = {}) {
  if (!Object.keys(manifest).length) return text;
  return text.replace(/(?<![\w./-])\/assets\/docs\/[^\s"'()<>]+/g, path => manifest[path] ?? path);
}

// Problems with the manifest itself: every address must be a hashed object on the CDN.
export function manifestProblems(manifest) {
  const problems = [];
  for (const [path, url] of Object.entries(manifest)) {
    if (!path.startsWith(LOGICAL_PREFIX)) problems.push(`media.json: ${path} must start with ${LOGICAL_PREFIX}`);
    if (!url.startsWith(`${CDN_BASE}/docs/`) || !/\.[0-9a-f]{8}\.\w+$/.test(url)) problems.push(`media.json: ${path} must point to a hashed object under ${CDN_BASE}/docs/`);
  }
  return problems;
}

const hmac = (key, data) => createHmac('sha256', key).update(data).digest();
const encodePath = path => path.split('/').map(part => encodeURIComponent(part).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)).join('/');

// AWS Signature Version 4 for one S3 request. `headers` are signed along with host, x-amz-date and
// x-amz-content-sha256. Returns every header to send, including Authorization.
export function signRequest({ method, host, path, query = '', headers = {}, payloadHash, accessKey, secretKey, region = REGION, service = 's3', now = new Date() }) {
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const day = amzDate.slice(0, 8);
  const all = { ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim()])), host, 'x-amz-date': amzDate, 'x-amz-content-sha256': payloadHash };
  const names = Object.keys(all).sort();
  const canonicalHeaders = names.map(n => `${n}:${all[n]}\n`).join('');
  const signedHeaders = names.join(';');
  const canonical = [method, encodePath(path), query, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${day}/${region}/${service}/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, day), region), service), 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(toSign).digest('hex');
  return { ...all, authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope},SignedHeaders=${signedHeaders},Signature=${signature}` };
}
