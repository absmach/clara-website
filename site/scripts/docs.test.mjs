import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { activeIndex, tocHtml } from '../src/docs-toc.js';
import { search, stem } from '../src/docs-search.js';
import { faqAccordions, faqProblems, pageHeadings, parseFrontMatter, pageProblems, referenceProblems, prepareVideos, renderMarkdown, absoluteLinks, redirectPage, REDIRECT_TARGET, prettyHref, llmsTxt, llmsFullTxt, popularTasks, searchIndex, excerpt, docsIndex, docPage, retiredName, LIMITED, LIMITED_NOTE } from './docs.mjs';

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
  assert.ok(bad.some(p => p.includes('gone.mp4') && p.includes('media.json')));
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

test('code examples are left alone and data-src is not an address', () => {
  const md = 'Link [a](/docs/x) and `[b](/docs/y)`.\n\n```md\n[c](/docs/z)\n<video src="/a.mp4"></video>\n```\n\n<img data-src="/q.png" src="/r.png">';
  const out = absoluteLinks(md);
  assert.match(out, /\[a\]\(https:\/\/claragtm\.com\/docs\/x\)/);
  assert.ok(out.includes('`[b](/docs/y)`'));
  assert.ok(out.includes('[c](/docs/z)\n<video src="/a.mp4">'));
  assert.ok(out.includes('data-src="/q.png" src="https://claragtm.com/r.png"'));
  assert.deepEqual(pageProblems(page({ body: `${body}\n\`\`\`md\n[x](javascript:alert(1))\n\`\`\`\n\nUse \`href="data:x"\` carefully. <img data-src="data:x">` })), []);
});

test('redirect targets are plain docs paths and the script escapes angle brackets', () => {
  assert.ok(REDIRECT_TARGET.test('/docs/a/b/'));
  assert.ok(!REDIRECT_TARGET.test('/docs/a/b'));
  assert.ok(!REDIRECT_TARGET.test('/docs/</script>/'));
  assert.ok(!redirectPage('/docs/<x>/').includes('"/docs/<x>/"'));
});

test('code detection handles indented, unclosed and multi-backtick code', () => {
  const link = '[x](/docs/x)';
  const abs = '[x](https://claragtm.com/docs/x)';
  const indented = `- Step\n\n  ~~~md\n  ${link}\n  ~~~\n\nAfter ${link}`;
  assert.equal(absoluteLinks(indented), indented.replace(/After \[x\]\(\/docs\/x\)/, `After ${abs}`));
  const unclosed = `Before ${link}\n\n\`\`\`md\n${link}\nstill code ${link}\n`;
  assert.equal(absoluteLinks(unclosed), unclosed.replace(`Before ${link}`, `Before ${abs}`));
  const ticks = `Use \`\`double \`tick\` ${link}\`\` and ${link}`;
  assert.equal(absoluteLinks(ticks), ticks.replace(/and \[x\]\(\/docs\/x\)/, `and ${abs}`));
  assert.deepEqual(pageProblems(page({ body: `${body}\n- Item\n\n  \`\`\`md\n  [x](javascript:alert(1))\n  \`\`\`\n` })).filter(p => p.includes('javascript')), []);
  assert.deepEqual(pageProblems(page({ body: '# A\n\n```md\n# not a heading\n```\n\n## Next steps\n- [x](/docs/a/b)\n' })), []);
});

const home = () => {
  const mk = (slug, extra = {}) => page({ slug, route: `docs/start-here/${slug}`, section: 'start-here', sectionTitle: 'Start here', title: slug.toUpperCase(), order: 1, body: '# T\n\nIntro with **bold** and [a link](/docs/a/b).\n\n```md\nsecret code\n```\n\n## Do it & more\n\n### Detail\n\n## Next steps\n- [x](/docs/a/b)\n', ...extra });
  const pages = [mk('quickstart', { popular: 2, task: 'Write your first draft' }), mk('concepts', { popular: 1 }), mk('glossary'), mk('welcome', { popular: 3 })];
  const sections = [{ id: 'start-here', title: 'Start here', description: 'Basics.', pages }];
  return { sections, pages };
};

test('popular tasks are sorted, limited and labelled by task or title', () => {
  const { pages } = home();
  const tasks = popularTasks(pages);
  assert.deepEqual(tasks.map(t => t.label), ['CONCEPTS', 'Write your first draft', 'WELCOME']);
  assert.equal(popularTasks(pages, 2).length, 2);
  assert.ok(!tasks.some(t => t.page.slug === 'glossary'));
});

test('popular and task front matter are validated', () => {
  assert.deepEqual(pageProblems(page({ popular: 1, task: 'Do a thing' })), []);
  assert.ok(pageProblems(page({ popular: NaN })).some(p => p.includes('popular')));
  assert.ok(pageProblems(page({ popular: 1, task: '  ' })).some(p => p.includes('task')));
  assert.ok(pageProblems(page({ task: 'Do a thing' })).some(p => p.includes('popular')));
});

test('the search index has every field and no Markdown, code or llms text', () => {
  const entries = searchIndex(home());
  assert.equal(entries.length, 4);
  const [entry] = entries;
  assert.deepEqual(Object.keys(entry).sort(), ['description', 'excerpt', 'headings', 'route', 'section', 'task', 'title']);
  assert.equal(entry.route, '/docs/start-here/quickstart/');
  assert.deepEqual(entry.headings.map(h => [h.level, h.id, h.text]), [[2, 'do-it-more', 'Do it & more'], [3, 'detail', 'Detail']]);
  assert.equal(entry.excerpt, 'Intro with bold and a link.');
  assert.doesNotMatch(JSON.stringify(entries), /secret code|\*\*|llms|\.md\b/);
  assert.ok(excerpt('# T\n\n' + 'word '.repeat(200)).length <= 241);
});

test('the docs home and articles show nothing meant for assistants', () => {
  const docs = home();
  for (const html of [docsIndex(docs), docPage({ page: docs.pages[0], ...docs })]) {
    assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), /\bllms(-full)?\.txt\b|View this page as Markdown|for assistants/i);
    assert.doesNotMatch(html, /docs-raw|\.md"/);
    assert.match(html, /data-docs-search/);
  }
  const index = docsIndex(docs);
  assert.match(index, /<h1>Clara documentation<\/h1>/);
  assert.match(index, /Popular tasks/);
  assert.match(index, /class="docs-sidebar"/);
  assert.match(index, /Browse the docs/);
  assert.match(index, /href="\/contact\/"/);
  assert.match(index, /<details class="docs-group" open><summary>Start here/);
  // Small screens: heading and intro first, then search, then the menu.
  assert.match(index, /<div class="docs-main"><header class="docs-home-head"><h1>[\s\S]*?<\/header><div class="docs-search"[^>]*data-docs-search[\s\S]*?<details class="docs-mobile-nav">/);
  assert.ok(index.indexOf('>Write your first draft<') > index.indexOf('>CONCEPTS<'));
});

const FIND = [
  { title: 'Review and share your work', task: 'Review and approve work', description: 'Check the details and choose where approvals belong.', section: 'Publish and engage', route: '/docs/publish/review-and-approvals/', headings: [{ level: 2, id: 'approve-a-draft', text: 'Approve a draft' }, { level: 2, id: 'share-a-link', text: 'Share a link' }], excerpt: 'Approvals keep work from going out early.' },
  { title: 'Chat history and sharing', task: 'Share a chat with a teammate', description: 'Find, rename and share your chats.', section: 'Chat', route: '/docs/chat/chats/', headings: [{ level: 2, id: 'share-a-chat', text: 'Share a chat' }], excerpt: 'Choose who can open each one.' },
  { title: 'Notifications', task: 'Choose which notifications to see', description: 'Decide what Clara tells you about.', section: 'Chat', route: '/docs/chat/notifications/', headings: [], excerpt: 'Bell icon.' },
  { title: 'Search', task: 'Find anything with search', description: 'Find pages, plays and your work.', section: 'Chat', route: '/docs/chat/search/', headings: [], excerpt: 'Press Ctrl K.' },
];
const titles = q => search(FIND, q).map(h => h.entry.title);

test('search stems words so approve finds approvals and share finds sharing', () => {
  assert.equal(stem('approvals'), stem('approve'));
  assert.equal(stem('sharing'), stem('share'));
  assert.equal(titles('approve')[0], 'Review and share your work');
  assert.ok(titles('approving').includes('Review and share your work'));
  assert.ok(titles('shared').includes('Chat history and sharing'));
  assert.ok(titles('appro').length > 0);
});

test('a task label boosts the page that is about the query', () => {
  assert.equal(titles('share')[0], 'Chat history and sharing');
  assert.equal(titles('share chat')[0], 'Chat history and sharing');
  assert.equal(search(FIND, 'share chat')[0].heading, null);
});

test('the heading shown is the one that matches the most words', () => {
  const hit = search(FIND, 'approve draft')[0];
  assert.equal(hit.entry.route, '/docs/publish/review-and-approvals/');
  assert.equal(hit.heading.id, 'approve-a-draft');
});

test('nonsense and markup find nothing and never throw', () => {
  assert.deepEqual(search(FIND, 'zxqvbn'), []);
  assert.deepEqual(search(FIND, '   '), []);
  assert.deepEqual(search(FIND, '<img src=x onerror=alert(1)>'), []);
  assert.deepEqual(search(null, 'share'), []);
});

test('the search script shows results as text, never as HTML', async () => {
  const script = await readFile(new URL('../src/docs.js', import.meta.url), 'utf8');
  assert.doesNotMatch(script, /innerHTML|insertAdjacentHTML|outerHTML/);
  assert.match(script, /textContent = /);
});


test('short words, stopwords and partial stems do not over-match', () => {
  assert.equal(stem('notes'), 'note');
  assert.deepEqual(titles('notes'), []);
  assert.ok(titles('notif').includes('Notifications'));
  assert.deepEqual(titles('a'), []);
  assert.deepEqual(titles('i'), []);
  assert.deepEqual(titles('the share'), titles('share'));
  assert.deepEqual(titles('how do I share'), titles('share'));
});

const faqMd = '# T\n\n## FAQ\n\n**Is it free?** Yes. It is.\n\n**Who sees it?** Only you.\n\n- A list in that answer.\n\n## Next steps\n- [x](/docs/a/b)\n';

test('the FAQ section becomes accordions, and the Markdown stays plain', () => {
  const html = renderMarkdown(faqMd);
  assert.match(html, /<h2 id="faq">FAQ<\/h2><div class="docs-faq">/);
  assert.equal((html.match(/<details class="docs-faq-item">/g) || []).length, 2);
  assert.match(html, /<summary>Is it free\?<\/summary><div class="docs-faq-answer"><p>Yes\. It is\.<\/p><\/div>/);
  assert.match(html, /<summary>Who sees it\?<\/summary><div class="docs-faq-answer"><p>Only you\.<\/p>\s*<ul>/);
  assert.match(html, /<section class="docs-next-steps"/);
  assert.match(llmsFullTxt({ pages: [page({ body: faqMd })] }), /\*\*Is it free\?\*\* Yes\./);
  assert.equal(faqAccordions('<h2 id="x">Other</h2><p>text</p>'), '<h2 id="x">Other</h2><p>text</p>');
});

test('a malformed FAQ is reported', () => {
  assert.deepEqual(faqProblems(faqMd), []);
  assert.deepEqual(faqProblems('# T\n\nNo FAQ here.'), []);
  assert.ok(faqProblems('## FAQ\n\nJust a paragraph.\n').some(p => p.includes('bold question')));
  assert.ok(faqProblems('## FAQ\n\n**Is it free?**\n\n**Next?** Yes.\n').some(p => p.includes('no answer')));
  assert.ok(faqProblems('## FAQ\n\n**Is it free?**\n').some(p => p.includes('no answer')));
  assert.ok(faqProblems('## FAQ\n\n**Is it free** Yes.\n').some(p => p.includes('question mark')));
  assert.ok(pageProblems(page({ body: '# A\n\n## FAQ\n\nOops.\n\n## Next steps\n- [x](/docs/a/b)\n' })).some(p => p.includes('FAQ')));
});

test('an article shows its description, a contents list and the FAQ accordions', () => {
  const docs = home();
  const p = { ...docs.pages[0], body: '# T\n\nIntro.\n\n## One\n\n### Sub\n\n## FAQ\n\n**Q?** A.\n\n## Next steps\n- [x](/docs/a/b)\n' };
  const html = docPage({ page: p, sections: docs.sections, pages: [p] });
  assert.match(html, /<h1 id="t">T<\/h1>\s*<p class="docs-lede">Pick a play\.<\/p>/);
  assert.match(html, /<aside class="docs-toc"><nav aria-labelledby="docs-toc-title">/);
  assert.match(html, /<li><a href="#one">One<\/a><\/li><li class="docs-toc-sub"><a href="#sub">Sub<\/a><\/li><li><a href="#faq">FAQ<\/a><\/li>/);
  assert.equal((html.match(/href="#faq"/g) || []).length, 1);
  assert.match(html, /class="docs-page has-toc"/);
});

test('contents lists need two headings and the active one follows the scroll', () => {
  assert.equal(tocHtml([]), '');
  assert.equal(tocHtml([{ level: 2, id: 'a', text: 'A' }]), '');
  assert.match(tocHtml([{ level: 2, id: 'a', text: 'A & B' }, { level: 3, id: 'b', text: 'B' }]), /A &amp; B/);
  assert.equal(activeIndex([300, 900, 1500]), -1);
  assert.equal(activeIndex([-400, 100, 900]), 1);
  assert.equal(activeIndex([-900, -400, -50]), 2);
  const docs = home();
  const html = docPage({ page: { ...docs.pages[0], body: '# T\n\n## Only one\n\n## Next steps\n- [x](/docs/a/b)\n' }, sections: docs.sections, pages: [docs.pages[0]] });
  assert.match(html, /<aside class="docs-toc">/);
  const single = docPage({ page: { ...docs.pages[0], body: '# T\n\nText only.\n' }, sections: docs.sections, pages: [docs.pages[0]] });
  assert.doesNotMatch(single, /docs-toc|has-toc/);
  assert.equal(pageHeadings('<h2 id="a">A</h2><h3 id="b">B <code>x</code></h3>').length, 2);
});

test('topic cards are whole-card links with no page lists', () => {
  const index = docsIndex(home());
  const card = /<li><a class="docs-card docs-topic" href="\/docs\/start-here\/quickstart\/" id="topic-start-here">[\s\S]*?<\/a><\/li>/.exec(index)?.[0];
  assert.ok(card, 'one card, linking to the first page');
  assert.match(card, /<h3>Start here<\/h3>/);
  assert.match(card, /4 pages/);
  assert.doesNotMatch(card, /<ul|<details|See all/);
  const one = home();
  one.sections[0].pages.splice(1);
  assert.match(docsIndex(one), /1 page</);
});

test('the Welcome page has no "Where to find it" line, task pages keep theirs', async () => {
  const { readFile } = await import('node:fs/promises');
  const welcome = await readFile(new URL('../docs/start-here/welcome.md', import.meta.url), 'utf8');
  const chats = await readFile(new URL('../docs/chat/chats.md', import.meta.url), 'utf8');
  assert.doesNotMatch(welcome, /Where to find it/);
  assert.match(chats, /Where to find it/);
});

test('questions on consecutive lines are split, and a question may hold code or italics', () => {
  const md = '# T\n\n## FAQ\n\n**Is it free?** Yes.\n**Is `x` *set*?** No.\n\n## Next steps\n- [x](/docs/a/b)\n';
  assert.deepEqual(faqProblems(md), []);
  const html = renderMarkdown(md);
  assert.equal((html.match(/<details class="docs-faq-item">/g) || []).length, 2);
  assert.match(html, /<summary>Is it free\?<\/summary><div class="docs-faq-answer"><p>Yes\.<\/p><\/div>/);
  assert.match(html, /<summary>Is <code>x<\/code> <em>set<\/em>\?<\/summary>/);
  // A bold-leading answer paragraph counts as a new question, so check flags it.
  assert.ok(faqProblems('## FAQ\n\n**Is it free?** Yes.\n\n**Note:** Only today.\n').some(p => p.includes('question mark')));
});

test('the contents highlight follows the same offset as a clicked heading, and the last entry at the bottom', () => {
  assert.equal(activeIndex([100, 600, 1200]), 0);
  assert.equal(activeIndex([-50, 100.5, 700]), 1);
  assert.equal(activeIndex([-900, 300, 900], 104, true), 2);
  assert.equal(activeIndex([], 104, true), -1);
});
