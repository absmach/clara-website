import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { resourcePages } from './resource-pages.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const src = path.join(root, 'src');
const out = path.join(root, 'dist');
await mkdir(out, { recursive: true });
await cp(path.join(src, 'assets'), path.join(out, 'assets'), { recursive: true });
for (const file of ['styles.css', 'site.js', 'logo-directions.css', 'logo-directions.js', 'bloom-directions.css', 'bloom-directions.js', 'automation-redirect.js']) await cp(path.join(src, file), path.join(out, file));
const brand = '<img src="/assets/clara-bloom.svg" width="36" height="36" alt=""/><span>Clara</span>';
const arrow = '<span aria-hidden="true">↗</span>';
const accessForm = (prefix) => `<form class="access-form" data-access-form>
  <label for="${prefix}-name">Your name<input id="${prefix}-name" name="name" autocomplete="name" required maxlength="100" placeholder="Alex Morgan" /></label>
  <label for="${prefix}-product">Your product or company<input id="${prefix}-product" name="product" autocomplete="organization" required maxlength="180" placeholder="A name or website is perfect" /></label>
  <label for="${prefix}-goal">What would you like Clara to help with?<textarea id="${prefix}-goal" name="goal" rows="3" maxlength="1800" placeholder="Launching our product, keeping up with LinkedIn, turning release notes into content…"></textarea></label>
  <button class="button" type="button" data-prepare-email hidden>Prepare my email ${arrow}</button>
  <noscript><style>.access-form label{display:none}</style><p class="form-note">To request early access, email the team directly using the address below.</p></noscript>
  <p class="form-note">This opens a draft in your email app. Review it and send it to <a href="mailto:info@absmach.eu">info@absmach.eu</a>. Nothing is submitted by this website.</p>
  <div class="email-fallback" hidden><p role="status">Your email draft is ready. If your email app didn’t open, copy the draft and send it to info@absmach.eu.</p><button class="text-button" type="button" data-copy-email>Copy email draft <span aria-hidden="true">↗</span></button><textarea class="draft-text" readonly aria-label="Your email draft" hidden></textarea></div>
</form>`;
const navigation = [['Meet Clara', '/'], ['How it works', '/how-it-works/'], ['Docs', '/docs/'], ['Blog', '/blog/'], ['About', '/about/']];
const navLinks = (route) => navigation.map(([label, href]) => `<a href="${href}"${href === `/${route}${route ? '/' : ''}` ? ' aria-current="page"' : route.startsWith(href.slice(1)) && href !== '/' ? ' aria-current="true"' : ''}>${label}</a>`).join('');
const header = (route) => `<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="container header-inner"><a href="/" class="brand" aria-label="Clara home">${brand}</a><nav class="desktop-nav" aria-label="Main navigation">${navLinks(route)}</nav><div class="header-actions"><a class="button button-small" href="/early-access/" data-access>Get early access ${arrow}</a><button class="menu-toggle" aria-expanded="false" aria-controls="mobile-nav" aria-label="Open navigation"><span></span><span></span></button></div></div><nav id="mobile-nav" class="mobile-nav" aria-label="Mobile navigation" hidden>${navLinks(route)}<a href="/early-access/" data-access>Get early access ↗</a></nav></header>`;
const footerColumn = (title, links) => `<nav aria-label="Footer ${title.toLowerCase()} links"><h2>${title}</h2>${links.map(([label, url]) => `<a href="${url}">${label}</a>`).join('')}</nav>`;
const footer = `<footer class="site-footer"><div class="container"><div class="footer-top"><div class="footer-brand"><a href="/" class="brand" aria-label="Clara home">${brand}</a><p>Your product has a story.<br/>Let’s get it out into the world.</p><a class="footer-contact" href="mailto:info@absmach.eu">Say hello ↗</a></div>${footerColumn('Product', [['Meet Clara', '/'], ['Workflows & agents', '/how-it-works/#workflows'], ['Planner', '/how-it-works/#planning'], ['Autonomy', '/how-it-works/#autonomy'], ['What you can make', '/#create'], ['How it works', '/how-it-works/'], ['Get early access', '/early-access/']])}${footerColumn('Create', [['Social posts', '/#social'], ['Articles & tutorials', '/#articles'], ['Launch campaigns', '/#campaigns'], ['Carousels & video', '/#visuals']])}${footerColumn('Resources', [['Documentation', '/docs/'], ['Getting started', '/docs/getting-started/'], ['Brand & knowledge', '/docs/brand-and-knowledge/'], ['Blog', '/blog/']])}${footerColumn('Company', [['About Clara', '/about/'], ['Abstract Machines ↗', 'https://absmach.eu'], ['Explore Atomic ↗', 'https://atomicapp.dev'], ['Contact the team', 'mailto:info@absmach.eu']])}</div><div class="footer-bottom"><span>© 2026 Abstract Machines</span><span>A little more clarity. A lot more possibility.</span><a href="/privacy/">Website privacy</a></div></div></footer>`;
const closing = `<section class="closing"><div class="container closing-inner"><div><p class="eyebrow">LESS BLANK PAGE. MORE MOMENTUM.</p><h2>You build the product.<br/><em>Clara helps tell its story.</em></h2></div><div><a class="button button-light" href="/early-access/" data-access>Get early access ${arrow}</a><p>Tell us what you’re working on.</p></div></div></section>`;
const pages = [
  ...resourcePages,
  { route: '', file: 'home.html', title: 'Clara — Your product. Out in the world.', description: 'Create on-brand content and campaigns with Clara’s chat and Plays. Scale your marketing with visual workflows, agents, and the autonomy you choose.' },
  { route: 'how-it-works', file: 'how-it-works.html', title: 'How Clara works — From product knowledge to published story', description: 'Explore content creation, workflows, agents, and Clara’s marketing planner. Choose how independently Clara works, from Assistant to Autopilot.' },
  { route: 'about', file: 'about.html', title: 'About Clara — Good products deserve to be understood', description: 'Meet Clara, the AI marketing team from Abstract Machines, the team behind Atomic.' },
  { route: 'early-access', file: 'early-access.html', title: 'Get early access to Clara', description: 'Tell the Clara team about your product and the content you want to create. Request early access by email.' },
  { route: 'privacy', file: 'privacy.html', title: 'Website privacy — Clara', description: 'How this Clara website handles interactive examples and early-access email drafts.' },
  { route: '404', file: '404.html', title: 'Page not found — Clara', description: 'Find your way back to Clara.' },
];
for (const page of pages) {
  const body = (page.body ?? await readFile(path.join(src, page.file), 'utf8')).replace('{{ACCESS_FORM}}', accessForm('page'));
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="theme-color" content="#fffcf7"/><title>${page.title}</title><meta name="description" content="${page.description}"/><meta property="og:title" content="${page.title}"/><meta property="og:description" content="${page.description}"/><meta property="og:type" content="website"/><meta property="og:site_name" content="Clara"/><meta name="twitter:card" content="summary"/><link rel="icon" type="image/svg+xml" href="/assets/clara-favicon-bloom.svg"/><link rel="preload" href="/assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin/><link rel="stylesheet" href="/styles.css"/><script src="/site.js" defer></script></head><body>${header(page.route)}<main id="main">${body}</main>${!['early-access','privacy','404'].includes(page.route) && !page.route.startsWith('docs') && !page.route.startsWith('blog/') ? closing : ''}${footer}<dialog id="access-dialog" aria-labelledby="access-title"><button class="dialog-close" type="button" aria-label="Close early access form">×</button><p class="eyebrow">LET’S MEET</p><h2 id="access-title">A little clarity<br/>for your next chapter.</h2><p class="dialog-intro">Tell us about your product. We’ll discuss early access and how Clara could fit your team.</p>${accessForm('dialog')}</dialog></body></html>`;
  const dir = page.route && page.route !== '404' ? path.join(out, page.route) : out;
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, page.route === '404' ? '404.html' : 'index.html'), html);
}
console.log(`Built ${pages.length} pages in dist/.`);

// Retain old bookmarks without a second copy of the content.
const formerFormats = path.join(out, 'what-you-can-make');
await mkdir(formerFormats, { recursive: true });
await writeFile(path.join(formerFormats, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>What you can make — Clara</title><meta name="description" content="Explore what Clara can make on the homepage."/><meta http-equiv="refresh" content="0;url=/#create"/><link rel="stylesheet" href="/styles.css"/></head><body><main class="container section"><h1>What you can make</h1><p><a href="/#create">Continue to the Clara homepage →</a></p></main></body></html>`);

// Preserve old Automation bookmarks while consolidating the explanation.
const formerAutomation = path.join(out, 'automation');
await mkdir(formerAutomation, { recursive: true });
await writeFile(path.join(formerAutomation, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Automation — How Clara works</title><meta name="description" content="Workflows, agents, planning, and autonomy are now together in How Clara works."/><link rel="stylesheet" href="/styles.css"/><script src="/automation-redirect.js" defer></script><noscript><meta http-equiv="refresh" content="0;url=/how-it-works/#workflows"/></noscript></head><body><main class="container section"><h1>Automation is part of How it works.</h1><p><a href="/how-it-works/#workflows">Explore workflows and agents →</a></p></main></body></html>`);

// Private local design comparison; not linked from the marketing navigation.
await mkdir(path.join(out, 'logo-directions'), { recursive: true });
await cp(path.join(src, 'logo-directions.html'), path.join(out, 'logo-directions/index.html'));

await mkdir(path.join(out, 'logo-directions/bloom'), { recursive: true });
await cp(path.join(src, 'bloom-directions.html'), path.join(out, 'logo-directions/bloom/index.html'));
