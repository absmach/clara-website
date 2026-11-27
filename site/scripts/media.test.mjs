import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CDN_BASE, applyManifest, cdnUrl, contentType, logicalPath, loadMedia, manifestProblems, objectKey, sha256, signRequest } from './media.mjs';
import { docPage, llmsFullTxt, loadDocs, referenceProblems } from './docs.mjs';

const hash = sha256('clip');
const media = { '/assets/docs/create/plays.mp4': cdnUrl(objectKey('create/plays.mp4', hash)), '/assets/docs/create/plays.jpg': cdnUrl(objectKey('create/plays.jpg', hash)) };

test('objects get a content-hashed key and a public CDN address', () => {
  assert.equal(objectKey('create/plays.mp4', hash), `docs/create/plays.${hash.slice(0, 8)}.mp4`);
  assert.equal(logicalPath('create/plays.mp4'), '/assets/docs/create/plays.mp4');
  assert.equal(cdnUrl('docs/a.12345678.jpg'), `${CDN_BASE}/docs/a.12345678.jpg`);
  assert.equal(contentType('.MP4'), 'video/mp4');
  assert.equal(contentType('.jpg'), 'image/jpeg');
  assert.equal(contentType('.exe'), undefined);
});

test('the manifest swaps clip and poster paths and leaves everything else alone', () => {
  const html = '<video src="/assets/docs/create/plays.mp4" poster="/assets/docs/create/plays.jpg"></video> <a href="/docs/create/plays/">x</a> <img src="/assets/docs/create/missing.jpg"/>';
  const out = applyManifest(html, media);
  assert.ok(out.includes(`src="${media['/assets/docs/create/plays.mp4']}"`));
  assert.ok(out.includes(`poster="${media['/assets/docs/create/plays.jpg']}"`));
  assert.ok(out.includes('href="/docs/create/plays/"'));
  assert.ok(out.includes('src="/assets/docs/create/missing.jpg"'));
  assert.equal(applyManifest('[clip](/assets/docs/create/plays.mp4)', media), `[clip](${media['/assets/docs/create/plays.mp4']})`);
  assert.equal(applyManifest(html, {}), html);
});

test('the manifest only allows hashed objects on the CDN', () => {
  assert.deepEqual(manifestProblems(media), []);
  assert.equal(manifestProblems({ '/assets/docs/a.mp4': 'https://example.com/a.mp4' }).length, 1);
  assert.equal(manifestProblems({ '/assets/docs/a.mp4': `${CDN_BASE}/docs/a.mp4` }).length, 1);
  assert.equal(manifestProblems({ '/elsewhere/a.mp4': `${CDN_BASE}/docs/a.12345678.mp4` }).length, 1);
});

test('a clip must be in the manifest', () => {
  const page = { section: 'create', slug: 'plays', body: '# P\n<video src="/assets/docs/create/plays.mp4" poster="/assets/docs/create/plays.jpg" aria-label="x"></video>' };
  const has = url => url in media;
  assert.deepEqual(referenceProblems(page, new Set(), new Set(), has), []);
  const problems = referenceProblems(page, new Set(), new Set(), () => false);
  assert.equal(problems.length, 2);
  assert.ok(problems.every(p => p.includes('media.json')));
});

test('article HTML, llms-full.txt and the committed manifest all use CDN addresses', async () => {
  const docs = await loadDocs();
  const real = await loadMedia();
  assert.deepEqual(manifestProblems(real), []);
  const page = docs.pages.find(p => /<video/.test(p.body));
  const html = docPage({ page, ...docs, media: real });
  assert.doesNotMatch(html, /(?:src|poster)="\/assets\/docs\//);
  assert.match(html, new RegExp(`src="${CDN_BASE}/docs/`));
  assert.doesNotMatch(llmsFullTxt(docs, real), /\/assets\/docs\//);
  assert.match(llmsFullTxt(docs, real), new RegExp(`${CDN_BASE}/docs/`));
});

// The worked example from the AWS Signature Version 4 documentation (GET Object with a Range header).
test('SigV4 signing matches the AWS documentation example', () => {
  const signed = signRequest({
    method: 'GET', host: 'examplebucket.s3.amazonaws.com', path: '/test.txt', headers: { Range: 'bytes=0-9' },
    payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    accessKey: 'AKIAIOSFODNN7EXAMPLE', secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', region: 'us-east-1', now: new Date('2013-05-24T00:00:00Z'),
  });
  assert.equal(signed.authorization, 'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request,SignedHeaders=host;range;x-amz-content-sha256;x-amz-date,Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41');
  assert.equal(signed['x-amz-date'], '20130524T000000Z');
});

test('uploads sign the ACL, type and cache headers', () => {
  const signed = signRequest({ method: 'PUT', host: 'h', path: '/docs/a b.mp4', headers: { 'x-amz-acl': 'public-read', 'content-type': 'video/mp4', 'cache-control': 'immutable' }, payloadHash: sha256('x'), accessKey: 'K', secretKey: 'S', now: new Date('2026-01-01T00:00:00Z') });
  assert.match(signed.authorization, /SignedHeaders=cache-control;content-type;host;x-amz-acl;x-amz-content-sha256;x-amz-date,/);
});

test('no clip or poster is committed to the site sources', async () => {
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(new URL('../src/assets/', import.meta.url));
  assert.ok(!entries.includes('docs'));
});

test('the credentials file is ignored by git', async () => {
  const ignore = await readFile(new URL('../../.gitignore', import.meta.url), 'utf8');
  assert.match(ignore, /^\.env\*$/m);
  assert.match(ignore, /^media\/$/m);
});

test('each clip is wrapped in its player at build time, so the page does not shift', async () => {
  const docs = await loadDocs();
  const page = docs.pages.find(p => /<video/.test(p.body));
  const html = docPage({ page, ...docs, media: await loadMedia() });
  const clips = (html.match(/<video\b/g) || []).length;
  assert.ok(clips > 0);
  assert.equal((html.match(/class="docs-player"/g) || []).length, clips);
  assert.equal((html.match(/class="docs-player-bar"/g) || []).length, clips);
  assert.match(html, /<div class="docs-player" role="group" aria-label="Video player: [^"]+"><video/);
  assert.match(html, /<button type="button" class="docs-player-btn" aria-label="Play" disabled>/);
  assert.match(html, /role="slider"[^>]*aria-valuenow="0"/);
});
