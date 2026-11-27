import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontMatter, pageProblems, referenceProblems, prepareVideos, renderMarkdown, prettyHref, llmsTxt, llmsFullTxt, retiredName, LIMITED, LIMITED_NOTE } from './docs.mjs';

const body = '# Plays\n\nText.\n\n## Next steps\n- [Other](/docs/create/campaigns)\n';
const page = (extra = {}) => ({ section: 'create', slug: 'plays', route: 'docs/create/plays', title: 'Plays', description: 'Pick a play.', order: 1, tag: '', body, ...extra });

test('front matter is read as flat key/value pairs', () => {
  const { data, body: rest } = parseFrontMatter('---\ntitle: "Plays: new"\ndescription: Pick one.\norder: 2\ntag: Limited availability\n---\n# Hi\n');
  assert.deepEqual(data, { title: 'Plays: new', description: 'Pick one.', order: '2', tag: 'Limited availability' });
  assert.equal(rest, '# Hi\n');
  assert.equal(parseFrontMatter('# No front matter').data, null);
  assert.throws(() => parseFrontMatter('---\nnot valid\n---\n'));
});

test('a complete page has no problems', () => assert.deepEqual(pageProblems(page()), []));

test('missing front matter, headings, next steps and unknown tags are reported', () => {
  assert.equal(pageProblems(page({ title: '' })).length, 1);
  assert.equal(pageProblems(page({ description: '' })).length, 1);
  assert.equal(pageProblems(page({ order: NaN })).length, 1);
  assert.equal(pageProblems(page({ tag: 'Beta' })).length, 1);
  assert.equal(pageProblems(page({ body: '# A\n# B\n\n## Next steps\n- [x](/docs/a/b)\n' })).length, 1);
  assert.equal(pageProblems(page({ body: '# A\n' })).length, 1);
  assert.equal(pageProblems(page({ body: '# A\n\n## Next steps\nNothing.\n' })).length, 1);
});

test('the retired product name is caught without being spelled in this repo', () => {
  const old = ['Mo', 'tif'].join('');
  assert.ok(retiredName.test(`Welcome to ${old}`));
  assert.ok(!retiredName.test('Welcome to Clara, a motivating tool'));
  assert.ok(pageProblems(page({ body: `${body}\n${old} is here.` })).some(p => p.includes('retired product name')));
});

test('links and clips must resolve', () => {
  const keys = new Set(['/docs/create/campaigns']);
  const exists = url => url === '/assets/docs/create/plays.mp4' || url === '/assets/docs/create/plays.jpg';
  const clip = '<video src="/assets/docs/create/plays.mp4" poster="/assets/docs/create/plays.jpg" autoplay muted loop playsinline aria-label="Running a play"></video>';
  assert.deepEqual(referenceProblems(page({ body: `${body}\n${clip}` }), keys, new Set(), exists), []);
  const bad = referenceProblems(page({ body: `${body}\n[x](/docs/nope/page)\n<video src="/assets/docs/create/gone.mp4"></video>` }), keys, new Set(), exists);
  assert.equal(bad.filter(p => p.includes('/docs/nope/page')).length, 1);
  assert.ok(bad.some(p => p.includes('gone.mp4') && p.includes('not found')));
  assert.ok(bad.some(p => p.includes('needs a poster')));
  assert.ok(bad.some(p => p.includes('aria-label')));
  assert.deepEqual(referenceProblems(page({ body: '[old](/docs/getting-started/) [md](/docs/create/campaigns.md#x)' }), keys, new Set(['/docs/getting-started']), exists), []);
});

test('clips lose autoplay in the HTML and gain controls, and the script opts them back in', () => {
  const html = prepareVideos('<video src="/a.mp4" poster="/a.jpg" autoplay muted loop playsinline aria-label="x"></video>');
  assert.doesNotMatch(html, /\sautoplay/);
  assert.match(html, /\bcontrols\b/);
  assert.match(html, /data-autoplay/);
  assert.match(prepareVideos('<video src="/a.mp4"></video>'), /^<video src="\/a.mp4" controls preload="metadata" playsinline>/);
});

test('rendering adds heading ids, trailing-slash links, the limited note and a Next steps block', () => {
  const html = renderMarkdown('# Comments\n\n## Reply to a comment\n\nSee [Plays](/docs/create/plays).\n\n## Next steps\n- [Plays](/docs/create/plays#x)\n', { tag: LIMITED });
  assert.match(html, /<h2 id="reply-to-a-comment">/);
  assert.match(html, /href="\/docs\/create\/plays\/"/);
  assert.match(html, /href="\/docs\/create\/plays\/#x"/);
  assert.ok(html.includes(LIMITED_NOTE.replace('’', '’')));
  assert.match(html, /<section class="docs-next-steps"/);
  assert.doesNotMatch(renderMarkdown('# A\n'), /docs-note/);
});

test('prettyHref leaves files and other links alone', () => {
  assert.equal(prettyHref('/docs/a/b'), '/docs/a/b/');
  assert.equal(prettyHref('/docs/a/b#c'), '/docs/a/b/#c');
  assert.equal(prettyHref('/docs/a/b.md'), '/docs/a/b.md');
  assert.equal(prettyHref('/early-access/'), '/early-access/');
});

test('llms files list every page', () => {
  const sections = [{ id: 'create', title: 'Create', pages: [page(), page({ slug: 'x', route: 'docs/create/x', title: 'X', tag: LIMITED })] }];
  const docs = { sections, pages: sections[0].pages };
  const index = llmsTxt(docs);
  assert.match(index, /^# Clara/);
  assert.match(index, /\[Plays\]\(https:\/\/claragtm\.com\/docs\/create\/plays\.md\): Pick a play\./);
  assert.match(index, /\(Limited availability\)/);
  assert.match(llmsFullTxt(docs), /Source: https:\/\/claragtm\.com\/docs\/create\/plays\/[\s\S]*# Plays/);
});
