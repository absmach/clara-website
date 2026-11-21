const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
  mobileNav.hidden = true;
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  mobileNav.hidden = !open;
});
mobileNav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuButton.focus(); }
});
matchMedia('(min-width: 1151px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

const accessDialog = document.querySelector('#access-dialog');
document.addEventListener('click', event => {
  const link = event.target.closest('a[data-access]');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !accessDialog.showModal) return;
  if (location.pathname.replace(/\/$/, '') === '/early-access') return;
  event.preventDefault();
  accessDialog.showModal();
});
accessDialog.querySelector('.dialog-close').addEventListener('click', () => accessDialog.close());
accessDialog.addEventListener('click', event => {
  if (event.target !== accessDialog) return;
  const bounds = accessDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) accessDialog.close();
});

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* Try the selection fallback. */ }
  }
  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('aria-label', 'Text to copy');
  input.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0';
  (document.querySelector('dialog[open]') || document.body).append(input);
  input.select();
  let success = false;
  try { success = document.execCommand('copy'); } finally { input.remove(); }
  if (!success) throw new Error('Clipboard unavailable');
}

document.querySelectorAll('[data-access-form]').forEach(form => {
  const prepareButton = form.querySelector('[data-prepare-email]');
  prepareButton.type = 'submit';
  prepareButton.hidden = false;
  let emailDraft = '';
  const fallback = form.querySelector('.email-fallback');
  const copyButton = form.querySelector('[data-copy-email]');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const product = String(data.get('product') || '').trim();
    const goal = String(data.get('goal') || '').trim();
    for (const field of ['name', 'product']) {
      const input = form.elements.namedItem(field);
      input.setCustomValidity(input.value.trim() ? '' : 'Please fill out this field.');
    }
    if (!form.reportValidity()) return;
    const subject = `Clara early access — ${product}`;
    const body = `Hello Clara team,\n\nI’d like to discuss early access to Clara.\n\nName: ${name}\nProduct / company: ${product}\n\nWhat I’d like help with:\n${goal || 'I’d like to explore how Clara could help our team.'}\n\nThanks,\n${name}`;
    emailDraft = `To: info@absmach.eu\nSubject: ${subject}\n\n${body}`;
    fallback.hidden = false;
    fallback.querySelector('[role="status"]').textContent = 'Your email draft is ready. If your email app didn’t open, copy the draft and send it to info@absmach.eu.';
    fallback.querySelector('.draft-text').value = emailDraft;
    copyButton.textContent = 'Copy email draft ↗';
    window.location.href = `mailto:info@absmach.eu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
  form.addEventListener('input', event => event.target.setCustomValidity?.(''));
  copyButton.addEventListener('click', async () => {
    try {
      await copyText(emailDraft);
      copyButton.textContent = 'Copied ✓';
      fallback.querySelector('[role="status"]').textContent = 'Copied. Paste the draft into your email app and send it to info@absmach.eu.';
    } catch {
      const draft = fallback.querySelector('.draft-text');
      draft.hidden = false;
      draft.focus();
      draft.select();
      fallback.querySelector('[role="status"]').textContent = 'Select and copy the draft below, then send it to info@absmach.eu.';
    }
  });
});

// Example agent week: switch between approval-first and Autopilot outcomes.
for (const board of document.querySelectorAll('[data-autonomy-demo]')) {
  const buttons = [...board.querySelectorAll('button[data-mode]')];
  buttons.forEach(button => button.addEventListener('click', () => {
    board.dataset.mode = button.dataset.mode;
    for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
  }));
}

const screenDetails = {
  workflows: {
    caption: 'Connect research, creation, and review on the workflow canvas. Demo draft · Never run.',
    alt: 'Actual Clara Workflows canvas with a draft release campaign: research branches into article and social content, each passes through review, and the branches join at a team notification.'
  },
  agents: {
    caption: 'Choose a marketing role in the Agent library, then make its jobs your own.',
    alt: 'Actual Clara Agent library showing Content Writer, Social Manager, Competitor Analyst, and other marketing roles with their workflow jobs.'
  },
  chat: {
    caption: 'Start a conversation with your idea, your brief, and your product context.',
    alt: 'Actual Clara chat composer with an illustrative Fieldnotes launch brief ready to send. No message has been submitted.'
  },
  plays: {
    caption: 'Choose a content Play for the format and channel you have in mind.',
    alt: 'Actual Clara content Plays catalog with starting points for articles, LinkedIn posts, X threads, release notes, and carousels.'
  },
  linkedin: {
    caption: 'Give your Play a brief and bring in your brand voice before creating a draft.',
    alt: 'Actual Clara LinkedIn Play dialog containing a fictional Fieldnotes launch brief. The Play has not been submitted.'
  },
  brand: {
    caption: 'Set the voice, audience, and writing guidelines behind the work.',
    alt: 'Actual Clara Brand and knowledge screen with saved example brand voice, audience, and writing guidelines for the fictional Fieldnotes workspace.'
  }
};
// Each tour owns its playback, focus, image loading, and visible slide.
for (const gallery of document.querySelectorAll('[data-screenshot-gallery]')) {
  const screenTabs = [...gallery.querySelectorAll('[data-screen]')];
  if (!screenTabs.length) continue;
  const image = gallery.querySelector('[data-gallery-image]');
  const screenPanel = gallery.querySelector('[data-gallery-panel]');
  const toggle = gallery.querySelector('[data-gallery-playback]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 3000;
  const keys = screenTabs.map(tab => tab.dataset.screen);
  let activeKey = keys[0];
  let userPaused = motion.matches;
  let inView = false;
  let focusPaused = false;
  let loading = false;
  let timer;
  let progress;
  let fade;
  let request = 0;

  const previous = image.cloneNode();
  previous.removeAttribute('id');
  previous.removeAttribute('loading');
  previous.removeAttribute('data-gallery-image');
  previous.className = 'screenshot-outgoing';
  previous.alt = '';
  previous.setAttribute('aria-hidden', 'true');
  previous.hidden = true;
  image.parentElement.append(previous);
  const cachedImages = new Map(keys.map(key => {
    const cached = new Image();
    cached.src = `/assets/screenshots/${key}.png`;
    return [key, cached];
  }));
  for (const tab of screenTabs) {
    const bar = document.createElement('span');
    bar.className = 'screen-tab-progress';
    bar.setAttribute('aria-hidden', 'true');
    tab.append(bar);
  }

  function syncPlayback() {
    clearTimeout(timer);
    progress?.cancel();
    const playing = !userPaused && inView && !document.hidden && !focusPaused && !loading;
    gallery.dataset.playing = String(playing);
    toggle.setAttribute('aria-label', userPaused ? 'Play screenshot animation' : 'Pause screenshot animation');
    toggle.querySelector('[data-playback-label]').textContent = userPaused ? 'Play' : 'Pause';
    toggle.querySelector('[data-playback-icon]').textContent = userPaused ? '▷' : 'Ⅱ';
    if (!playing) return;
    if (!motion.matches) {
      progress = screenTabs.find(tab => tab.dataset.screen === activeKey).querySelector('.screen-tab-progress').animate(
        [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration, easing: 'linear', fill: 'forwards' }
      );
    }
    timer = setTimeout(() => {
      const next = keys[(keys.indexOf(activeKey) + 1) % keys.length];
      selectScreen(next, { automatic: true });
    }, duration);
  }

  async function selectScreen(key, { automatic = false, focus = false } = {}) {
    if (!keys.includes(key) || !screenDetails[key]) return;
    if (!automatic) userPaused = true;
    const currentRequest = ++request;
    loading = true;
    syncPlayback();
    try {
      await cachedImages.get(key).decode();
    } catch {
      if (currentRequest === request) {
        userPaused = true;
        loading = false;
        syncPlayback();
      }
      return;
    }
    if (currentRequest !== request) return;
    const changed = key !== activeKey;
    fade?.cancel();
    previous.hidden = true;
    if (changed && !motion.matches) {
      previous.src = image.src;
      previous.hidden = false;
    }
    image.src = cachedImages.get(key).src;
    image.alt = screenDetails[key].alt;
    image.width = cachedImages.get(key).naturalWidth;
    image.height = cachedImages.get(key).naturalHeight;
    activeKey = key;
    for (const tab of screenTabs) {
      const active = tab.dataset.screen === key;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    }
    gallery.querySelector('[data-gallery-full]').href = image.src;
    gallery.querySelector('[data-gallery-caption]').textContent = screenDetails[key].caption;
    screenPanel.setAttribute('aria-labelledby', screenTabs.find(tab => tab.dataset.screen === key).id);
    if (!previous.hidden) {
      fade = previous.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: 'ease-in-out', fill: 'forwards' });
      fade.onfinish = () => { previous.hidden = true; };
    }
    loading = false;
    syncPlayback();
  }

  screenTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectScreen(tab.dataset.screen));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % screenTabs.length;
      if (event.key === 'ArrowLeft') next = (index + screenTabs.length - 1) % screenTabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = screenTabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectScreen(screenTabs[next].dataset.screen, { focus: true });
    });
  });
  function selectLinkedScreen() {
    const tab = screenTabs.find(tab => tab.dataset.galleryAnchor === location.hash.slice(1));
    if (tab) selectScreen(tab.dataset.screen);
  }
  window.addEventListener('hashchange', selectLinkedScreen);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin || destination.pathname !== location.pathname) return;
    const tab = screenTabs.find(tab => tab.dataset.galleryAnchor === destination.hash.slice(1));
    if (tab) selectScreen(tab.dataset.screen);
  });
  selectLinkedScreen();
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    userPaused = !userPaused;
    syncPlayback();
  });
  gallery.addEventListener('focusin', event => {
    focusPaused = event.target !== toggle;
    syncPlayback();
  });
  gallery.addEventListener('focusout', () => queueMicrotask(() => {
    focusPaused = gallery.contains(document.activeElement) && document.activeElement !== toggle;
    syncPlayback();
  }));
  document.addEventListener('visibilitychange', syncPlayback);
  motion.addEventListener('change', () => {
    if (motion.matches) {
      userPaused = true;
      fade?.cancel();
      previous.hidden = true;
    }
    syncPlayback();
  });
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.35;
    syncPlayback();
  }, { threshold: [0, 0.35] }).observe(gallery);
  syncPlayback();
}
