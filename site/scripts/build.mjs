import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { resourcePages } from './resource-pages.mjs';
import { CONTACT_TOPICS, NOTICE_VERSION } from '../../worker/forms.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const src = path.join(root, 'src');
const out = path.join(root, 'dist');
await mkdir(out, { recursive: true });
await cp(path.join(src, 'assets'), path.join(out, 'assets'), { recursive: true });
for (const file of ['styles.css', 'site.js', 'logo-directions.css', 'logo-directions.js', 'bloom-directions.css', 'bloom-directions.js', 'automation-redirect.js']) await cp(path.join(src, file), path.join(out, file));
const siteUrl = 'https://claragtm.com';
const shareImage = `${siteUrl}/assets/og-image.png`;
const shareImageAlt = 'Clara: You make great things. Let’s tell the world.';
const brand = '<img src="/assets/clara-bloom.svg" width="36" height="36" alt=""/><span>Clara</span>';
const arrow = '<span aria-hidden="true">↗</span>';
// The Worker rejects submissions from pages built with another notice version.
const noticeVersion = NOTICE_VERSION;
const formTail = (submitLabel, note) => `<div class="form-honeypot" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off" /></label></div>
  <div class="turnstile-slot" data-turnstile></div>
  <button class="button" type="submit">${submitLabel} ${arrow}</button>
  <p class="form-status" role="alert" data-form-status hidden></p>
  <p class="form-note">${note} See <a href="/privacy/">website privacy</a>.</p>
  <noscript><p class="form-note form-noscript">This form needs JavaScript. You can also write to the team at info@absmach.eu.</p></noscript>`;
const formSuccess = (heading, text) => `<div class="form-success" data-form-success tabindex="-1" hidden><h3>${heading}</h3><p>${text}</p></div>`;
const accessForm = (prefix) => `<form class="access-form" data-form="early-access" data-endpoint="/api/early-access" data-turnstile-action="early_access" data-notice-version="${noticeVersion}" novalidate>
  <label for="${prefix}-name">Your name<input id="${prefix}-name" name="name" autocomplete="name" required maxlength="100" placeholder="Alex Morgan" /></label>
  <label for="${prefix}-email">Work email<input id="${prefix}-email" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="alex@company.com" /></label>
  <label for="${prefix}-product">Your product or company<input id="${prefix}-product" name="product" autocomplete="organization" required maxlength="180" placeholder="A name or website is perfect" /></label>
  <label for="${prefix}-goal">What would you like Clara to help with? <span class="optional">Optional</span><textarea id="${prefix}-goal" name="goal" rows="3" maxlength="1800" placeholder="A launch, keeping up with LinkedIn, release notes…"></textarea></label>
  ${formTail('Request early access', 'We keep your answers to reply about early access and send related emails. You can unsubscribe at any time.')}
</form>
${formSuccess('You’re on the list.', 'Thanks for telling us about your product. We’ll be in touch by email about early access and next steps.')}`;
const contactTopics = Object.entries(CONTACT_TOPICS);
const contactForm = `<form class="access-form" data-form="contact" data-endpoint="/api/contact" data-turnstile-action="contact" data-notice-version="${noticeVersion}" novalidate>
  <label for="contact-name">Your name<input id="contact-name" name="name" autocomplete="name" required maxlength="100" placeholder="Alex Morgan" /></label>
  <label for="contact-email">Email<input id="contact-email" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="alex@company.com" /></label>
  <label for="contact-company">Company <span class="optional">Optional</span><input id="contact-company" name="company" autocomplete="organization" maxlength="180" placeholder="Where you work" /></label>
  <label for="contact-topic">Topic<select id="contact-topic" name="topic" required>${contactTopics.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></label>
  <label for="contact-message">Message<textarea id="contact-message" name="message" rows="6" required maxlength="5000" placeholder="How can we help?"></textarea></label>
  ${formTail('Send message', 'Your message goes to the Abstract Machines team inbox. We use it only to reply to you.')}
</form>
${formSuccess('Message sent.', 'Thanks for getting in touch. We’ve emailed you a confirmation, and we’ll reply to the address you gave us.')}`;
const navigation = [['Meet Clara', '/'], ['How it works', '/how-it-works/'], ['Docs', '/docs/'], ['Blog', '/blog/'], ['About', '/about/']];
const navLinks = (route) => navigation.map(([label, href]) => `<a href="${href}"${href === `/${route}${route ? '/' : ''}` ? ' aria-current="page"' : route.startsWith(href.slice(1)) && href !== '/' ? ' aria-current="true"' : ''}>${label}</a>`).join('');
const header = (route) => `<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="container header-inner"><a href="/" class="brand" aria-label="Clara home">${brand}</a><nav class="desktop-nav" aria-label="Main navigation">${navLinks(route)}</nav><div class="header-actions"><a class="button button-small" href="/early-access/" data-access>Get early access ${arrow}</a><button class="menu-toggle" aria-expanded="false" aria-controls="mobile-nav" aria-label="Open navigation"><span></span><span></span></button></div></div><nav id="mobile-nav" class="mobile-nav" aria-label="Mobile navigation" hidden>${navLinks(route)}<a href="/early-access/" data-access>Get early access ↗</a></nav></header>`;
const footerColumn = (title, links) => `<nav aria-label="Footer ${title.toLowerCase()} links"><h2>${title}</h2>${links.map(([label, url]) => `<a href="${url}">${label}</a>`).join('')}</nav>`;
const footer = `<footer class="site-footer"><div class="container"><div class="footer-top"><div class="footer-brand"><a href="/" class="brand" aria-label="Clara home">${brand}</a><p>Your product has a story. Let’s get it out into the world.</p><a class="footer-contact" href="/contact/">Say hello →</a></div>${footerColumn('Product', [['How it works', '/how-it-works/'], ['Agents', '/how-it-works/#agents'], ['Planner', '/how-it-works/#planning'], ['Autonomy', '/how-it-works/#autonomy'], ['Get early access', '/early-access/']])}${footerColumn('Resources', [['Documentation', '/docs/'], ['Getting started', '/docs/getting-started/'], ['Brand voice', '/docs/brand-and-knowledge/'], ['Blog', '/blog/']])}${footerColumn('Company', [['About Clara', '/about/'], ['Abstract Machines ↗', 'https://absmach.eu'], ['Explore Atomic ↗', 'https://atomicapp.dev'], ['Contact', '/contact/']])}</div><div class="footer-bottom"><span>© 2026 Abstract Machines</span><a href="/privacy/">Website privacy</a></div></div></footer>`;
const closing = `<section class="closing"><div class="container closing-inner"><h2>You build the product. <em>Clara helps tell its story.</em></h2><a class="button button-light" href="/early-access/" data-access>Get early access ${arrow}</a></div></section>`;
const pages = [
  ...resourcePages,
  { route: '', file: 'home.html', title: 'Clara — Your product. Out in the world.', description: 'Create on-brand content and campaigns with Clara’s chat and Plays. Scale your marketing with visual workflows, agents, and the autonomy you choose.' },
  { route: 'how-it-works', file: 'how-it-works.html', title: 'How Clara works — From product knowledge to published story', description: 'Explore content creation, workflows, agents, and Clara’s marketing planner. Choose how independently Clara works, from Assistant to Autopilot.' },
  { route: 'about', file: 'about.html', title: 'About Clara — Good products deserve to be understood', description: 'Meet Clara, the AI marketing team from Abstract Machines, the team behind Atomic.' },
  { route: 'early-access', file: 'early-access.html', title: 'Get early access to Clara', description: 'Tell the Clara team about your product and the content you want to create, and request early access to Clara.' },
  { route: 'contact', file: 'contact.html', title: 'Contact the Clara team', description: 'Questions, partnerships, press, or privacy requests: send the team behind Clara a message.' },
  { route: 'privacy', file: 'privacy.html', title: 'Website privacy — Clara', description: 'How this Clara website handles interactive examples, early-access requests, and contact messages.' },
  { route: '404', file: '404.html', title: 'Page not found — Clara', description: 'Find your way back to Clara.' },
];
for (const page of pages) {
  const body = (page.body ?? await readFile(path.join(src, page.file), 'utf8')).replace('{{ACCESS_FORM}}', accessForm('page')).replace('{{CONTACT_FORM}}', contactForm);
  let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="theme-color" content="#fffcf7"/><title>${page.title}</title><meta name="description" content="${page.description}"/><meta property="og:title" content="${page.title}"/><meta property="og:description" content="${page.description}"/><meta property="og:type" content="website"/>${page.route === '404' ? '' : `<link rel="canonical" href="${siteUrl}/${page.route ? page.route + '/' : ''}"/><meta property="og:url" content="${siteUrl}/${page.route ? page.route + '/' : ''}"/>`}<meta property="og:site_name" content="Clara"/><meta property="og:image" content="${shareImage}"/><meta property="og:image:type" content="image/png"/><meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/><meta property="og:image:alt" content="${shareImageAlt}"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:image" content="${shareImage}"/><meta name="twitter:image:alt" content="${shareImageAlt}"/><link rel="icon" type="image/svg+xml" href="/assets/clara-favicon-bloom.svg"/><link rel="preload" href="/assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin/><link rel="stylesheet" href="/styles.css"/><script src="/site.js" defer></script></head><body>${header(page.route)}<main id="main">${body}</main>${!['early-access','contact','privacy','404'].includes(page.route) && !page.route.startsWith('docs') && !page.route.startsWith('blog/') ? closing : ''}${footer}<dialog id="access-dialog" aria-labelledby="access-title"><button class="dialog-close" type="button" aria-label="Close early access form">×</button><div class="dialog-body"><h2 id="access-title">A little clarity for your next chapter.</h2><p class="dialog-intro">Tell us about your product. We’ll talk about early access and how Clara could fit your team.</p>${accessForm('dialog')}</div></dialog></body></html>`;
  // Keep trailing arrows on the same line as the word before them.
  html = html.replace(/(\w) ([↗→←↓])/g, '$1&nbsp;$2');
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
