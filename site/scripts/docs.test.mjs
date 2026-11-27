import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontMatter, pageProblems, referenceProblems, prepareVideos, renderMarkdown, absoluteLinks, redirectPage, prettyHref, llmsTxt, llmsFullTxt, retiredName, LIMITED, LIMITED_NOTE } from './docs.mjs';

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
  assert.deepEqual(referenceProblems(page({ body: '[md](/docs/create/campaigns.md#x) [t](/docs/create/campaigns "A title")' }), keys, new Set(), exists), []);
  assert.equal(referenceProblems(page({ body: '[bad](/docs/nope/page "A title")' }), keys, new Set(), exists).length, 1);
  const old = referenceProblems(page({ body: '[old](/docs/getting-started/)' }), keys, new Set(['/docs/getting-started']), exists);
  assert.ok(old.length === 1 && old[0].includes('old address'));
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

test('front matter quotes are only stripped when they wrap the whole value', () => {
  const read = value => parseFrontMatter(`---\ntitle: ${value}\n---\n`).data.title;
  assert.equal(read('"Plays"'), 'Plays');
  assert.equal(read("'Plays'"), 'Plays');
  assert.equal(read('"A" and "B"'), '"A" and "B"');
  assert.equal(read('"Say \\"hi\\""'), 'Say "hi"');
  assert.equal(read("'It''s'"), "It's");
  assert.equal(parseFrontMatter('---\ntitle: x\n---x\n# A').data, null);
  assert.deepEqual(parseFrontMatter('---\ntitle: x\n---  \n# A').data, { title: 'x' });
});

test('Next steps must be the last section, and unsafe addresses are rejected', () => {
  assert.ok(pageProblems(page({ body: `${body}\n## FAQ\n**Q?** A.\n` })).some(p => p.includes('last')));
  assert.ok(pageProblems(page({ body: `${body}\n[x](javascript:alert(1))` })).some(p => p.includes('javascript')));
  assert.ok(pageProblems(page({ body: `${body}\n<a href="data:text/html,x">x</a>` })).length > 0);
  assert.match(renderMarkdown('[x](javascript:alert(1))'), /<p>x<\/p>/);
});

test('the Next steps box stops at the next heading', () => {
  const html = renderMarkdown('# A\n\n## Next steps\n- [x](/docs/a/b)\n\n## FAQ\n\nAfter.\n');
  assert.match(html, /<section class="docs-next-steps"[\s\S]*<\/section>\s*<h2 id="faq">/);
});

test('copies read away from the site get absolute links', () => {
  const md = 'See [x](/docs/a/b) and [y](/early-access/) and [z](https://example.com/).\n<video src="/assets/docs/a.mp4" poster="/assets/docs/a.jpg"></video>';
  const out = absoluteLinks(md);
  assert.match(out, /\]\(https:\/\/claragtm\.com\/docs\/a\/b\)/);
  assert.match(out, /\(https:\/\/claragtm\.com\/early-access\/\)/);
  assert.match(out, /src="https:\/\/claragtm\.com\/assets\/docs\/a\.mp4" poster="https:\/\/claragtm\.com\/assets\/docs\/a\.jpg"/);
  assert.match(out, /\]\(https:\/\/example\.com\/\)/);
});

test('redirect pages carry the hash over', () => {
  const html = redirectPage('/docs/a/b/');
  assert.match(html, /location\.replace\("\/docs\/a\/b\/"\+location\.hash\)/);
  assert.match(html, /http-equiv="refresh"/);
});
