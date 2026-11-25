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

// Early-access and contact forms. Each posts JSON to the Worker in worker/,
// which checks a Cloudflare Turnstile token. Turnstile's script loads only when
// someone starts filling in a form, so pages that aren't used don't fetch it.
// Public site key (not a secret). Local runs use Cloudflare's always-pass test key.
const TURNSTILE_SITEKEY = '0x4AAAAAAGSdgDL7TiPzf8Dm';
const TURNSTILE_TEST_SITEKEY = '1x00000000000000000000AA';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const localHost = ['localhost', '127.0.0.1'].includes(location.hostname);
const sitekey = localHost ? TURNSTILE_TEST_SITEKEY : TURNSTILE_SITEKEY;
let turnstileReady;

function loadTurnstile() {
  turnstileReady ??= new Promise((resolve, reject) => {
    if (!sitekey) { reject(new Error('Turnstile site key missing')); return; }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => reject(new Error('Turnstile failed to load'));
    document.head.append(script);
  });
  turnstileReady.catch(() => { turnstileReady = undefined; });
  return turnstileReady;
}

for (const form of document.querySelectorAll('form[data-form]')) {
  const slot = form.querySelector('[data-turnstile]');
  const status = form.querySelector('[data-form-status]');
  const button = form.querySelector('button[type="submit"]');
  const success = form.nextElementSibling?.matches('[data-form-success]') ? form.nextElementSibling : null;
  let widget = null;
  let preparing;
  let token = '';
  let failed = false;
  let waiting = [];

  const settle = value => { token = value; for (const resolve of waiting) resolve(value); waiting = []; };
  const showStatus = text => { status.textContent = text; status.hidden = !text; };

  // Renders this form's Turnstile widget once; a failed load can be retried.
  function prepare() {
    preparing ??= loadTurnstile().then(turnstile => {
      widget = turnstile.render(slot, {
        sitekey,
        action: form.dataset.turnstileAction,
        appearance: 'interaction-only',
        callback: value => { failed = false; settle(value); },
        'expired-callback': () => { token = ''; },
        'error-callback': () => { failed = true; settle(''); return true; },
      });
    }).catch(() => { preparing = undefined; });
    return preparing;
  }
  form.addEventListener('focusin', prepare, { once: true });

  // Waits for Turnstile to finish its check; most visitors never see it.
  function getToken() {
    if (token) return Promise.resolve(token);
    if (failed) { failed = false; window.turnstile.reset(widget); }
    return new Promise(resolve => {
      waiting.push(resolve);
      setTimeout(() => resolve(''), 30000);
    });
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    for (const field of form.querySelectorAll('input[required], textarea[required]')) {
      field.setCustomValidity(field.value.trim() ? '' : 'Please fill out this field.');
    }
    if (!form.reportValidity()) return;

    showStatus('');
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    try {
      await prepare();
      if (widget === null) throw new Error('This form isn’t available right now. Please try again later, or email info@absmach.eu.');
      const turnstileToken = await getToken();
      if (!turnstileToken) throw new Error('We couldn’t confirm you’re not a bot. Please try again.');

      const data = Object.fromEntries(new FormData(form));
      delete data['cf-turnstile-response'];
      const params = new URLSearchParams(location.search);
      for (const key of UTM_KEYS) if (params.get(key)) data[key] = params.get(key);
      const response = await fetch(form.dataset.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, noticeVersion: form.dataset.noticeVersion, turnstileToken }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');

      form.hidden = true;
      if (success) { success.hidden = false; success.focus(); }
    } catch (error) {
      showStatus(error.message);
      // Tokens are single-use, so every attempt gets a fresh one.
      token = '';
      if (widget !== null) window.turnstile.reset(widget);
    } finally {
      button.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
  form.addEventListener('input', event => event.target.setCustomValidity?.(''));
}

// Example agent week: switch Autopilot on or off.
for (const board of document.querySelectorAll('[data-autonomy-demo]')) {
  const toggle = board.querySelector('[data-autopilot-toggle]');
  toggle?.addEventListener('click', () => {
    const on = toggle.getAttribute('aria-checked') !== 'true';
    toggle.setAttribute('aria-checked', String(on));
    board.dataset.mode = on ? 'autopilot' : 'approve';
  });
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
