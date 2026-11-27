// Docs clip player: a control bar under each clip. The functions at the top are plain logic
// (the tests import them); mountPlayer() at the bottom builds the DOM.
export const STEP = 5;

export function formatTime(seconds) {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export const clamp = (time, duration) => Math.min(Math.max(Number.isFinite(time) ? time : 0, 0), Number.isFinite(duration) && duration > 0 ? duration : 0);

// The new position after jumping by `delta` seconds.
export const jump = (current, delta, duration) => clamp(current + delta, duration);

// Where a press at `x` on a track that starts at `left` and is `width` wide lands.
export const positionToTime = (x, left, width, duration) => (width > 0 ? clamp(((x - left) / width) * duration, duration) : 0);

// What the screen reader says for the scrubber, for example "0:12 of 0:45".
export const valueText = (current, duration) => `${formatTime(current)} of ${formatTime(duration)}`;

// A key on the player (or on the scrubber) turned into an action, or null when it isn't ours.
// Space also plays and pauses from the scrubber, so it never scrolls the page.
export function keyAction(key, { slider = false } = {}) {
  if (key === ' ' || key === 'k' || key === 'K') return { type: 'toggle' };
  if (key === 'f' || key === 'F') return { type: 'fullscreen' };
  if (key === 'ArrowLeft' || (slider && key === 'ArrowDown')) return { type: 'seek', delta: -STEP };
  if (key === 'ArrowRight' || (slider && key === 'ArrowUp')) return { type: 'seek', delta: STEP };
  if (slider && key === 'Home') return { type: 'to', start: true };
  if (slider && key === 'End') return { type: 'to', start: false };
  return null;
}

const ICONS = {
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  compress: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  play: '<path d="M7 4.5v15l12-7.5-12-7.5Z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7 5v14M17 5v14"/>',
  back: '<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4.5h4.5"/><text x="12" y="15.4" font-size="8.5" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none">5</text>',
  forward: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/><text x="12" y="15.4" font-size="8.5" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none">5</text>',
};
const icon = name => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

const btn = (name, label) => `<button type="button" class="docs-player-btn" aria-label="${label}" disabled>${icon(name)}</button>`;

// The player's markup, written into the page at build time so it takes up its space from the first paint
// and nothing moves when the script starts. The buttons stay disabled until mountPlayer() wires them up.
// Without JavaScript the bar is hidden (see the <noscript> style) and the native controls stay.
// `label` is the text of the clip's aria-label attribute, as written in the page.
export function playerHtml(videoTag, label) {
  return `<div class="docs-player" role="group" aria-label="Video player: ${label || 'clip'}">${videoTag}<div class="docs-player-bar">${btn('play', 'Play')}${btn('back', `Back ${STEP} seconds`)}${btn('forward', `Forward ${STEP} seconds`)}<div class="docs-player-track" role="slider" aria-label="Seek" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" aria-valuetext="0:00 of 0:00"><div class="docs-player-rail"><div class="docs-player-fill"></div></div></div><span class="docs-player-time">0:00 / 0:00</span>${btn('expand', 'Full screen')}</div></div>`;
}

// Wires up one player written by playerHtml(). `video` is the <video> inside it.
// The native controls are removed only here, so a clip that never gets here keeps them.
export function mountPlayer(video) {
  const wrap = video.closest('.docs-player');
  if (!wrap || wrap.dataset.ready) return wrap;
  wrap.dataset.ready = '1';
  const w = Number(video.getAttribute('width'));
  const h = Number(video.getAttribute('height'));
  if (w > 0 && h > 0) wrap.style.setProperty('--ratio', `${w} / ${h}`);
  video.controls = false;
  wrap.tabIndex = 0;
  const [play, back, forward, full] = wrap.querySelectorAll('.docs-player-btn');
  for (const b of [play, back, forward, full]) b.disabled = false;
  full.setAttribute('aria-pressed', 'false');
  // Full screen is for the whole player, so the custom controls come along. iOS Safari can only do the bare
  // video (its native player). With neither, the button is hidden.
  const enter = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
  if (!enter && !video.webkitEnterFullscreen) full.hidden = true;
  const isFull = () => (document.fullscreenElement || document.webkitFullscreenElement) === wrap || !!video.webkitDisplayingFullscreen;
  const toggleFull = () => {
    if (isFull()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) Promise.resolve(exit.call(document)).catch(() => {});
      else video.webkitExitFullscreen?.();
    } else if (enter) Promise.resolve(enter.call(wrap)).catch(() => {});
    else video.webkitEnterFullscreen?.();
  };
  const fullState = () => {
    const on = isFull();
    wrap.dataset.fullscreen = on ? '1' : '';
    full.setAttribute('aria-pressed', String(on));
    full.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
    full.innerHTML = icon(on ? 'compress' : 'expand');
  };
  const track = wrap.querySelector('.docs-player-track');
  track.tabIndex = 0;
  const fill = wrap.querySelector('.docs-player-fill');
  const time = wrap.querySelector('.docs-player-time');

  const duration = () => (Number.isFinite(video.duration) ? video.duration : 0);
  // A clip the reader paused stays paused when it scrolls back into view (see docs.js).
  const toggle = () => {
    if (video.paused) { delete video.dataset.userPaused; video.play().catch(() => {}); }
    else { video.dataset.userPaused = '1'; video.pause(); }
  };
  const seekTo = t => { video.currentTime = clamp(t, duration()); sync(); };
  const sync = () => {
    const d = duration();
    const c = clamp(video.currentTime, d);
    track.setAttribute('aria-valuemax', String(Math.floor(d)));
    track.setAttribute('aria-valuenow', String(Math.floor(c)));
    track.setAttribute('aria-valuetext', valueText(c, d));
    fill.style.width = d ? `${(c / d) * 100}%` : '0%';
    time.textContent = `${formatTime(c)} / ${formatTime(d)}`;
  };
  const state = () => {
    const playing = !video.paused;
    wrap.dataset.state = playing ? 'playing' : 'paused';
    play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    play.innerHTML = icon(playing ? 'pause' : 'play');
  };
  const act = action => {
    if (!action) return false;
    if (action.type === 'toggle') toggle();
    else if (action.type === 'fullscreen') toggleFull();
    else if (action.type === 'seek') seekTo(jump(video.currentTime, action.delta, duration()));
    else seekTo(action.start ? 0 : duration());
    return true;
  };

  play.addEventListener('click', toggle);
  back.addEventListener('click', () => act({ type: 'seek', delta: -STEP }));
  forward.addEventListener('click', () => act({ type: 'seek', delta: STEP }));
  full.addEventListener('click', toggleFull);
  for (const type of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(type, fullState);
  for (const type of ['webkitbeginfullscreen', 'webkitendfullscreen']) video.addEventListener(type, fullState);
  // Pausing or playing from inside full screen (including iOS's native controls) is the reader's choice,
  // so leaving full screen never restarts a clip they paused.
  video.addEventListener('pause', () => { if (isFull()) video.dataset.userPaused = '1'; });
  video.addEventListener('play', () => { if (isFull()) delete video.dataset.userPaused; });
  video.addEventListener('click', toggle);
  for (const type of ['play', 'pause', 'ended']) video.addEventListener(type, state);
  for (const type of ['timeupdate', 'loadedmetadata', 'durationchange', 'seeked']) video.addEventListener(type, sync);
  wrap.addEventListener('keydown', e => {
    // Buttons and the scrubber handle their own keys.
    if (e.target !== wrap || e.ctrlKey || e.metaKey || e.altKey) return;
    if (act(keyAction(e.key))) e.preventDefault();
  });
  track.addEventListener('keydown', e => { if (act(keyAction(e.key, { slider: true }))) e.preventDefault(); });
  const scrub = e => { const r = track.getBoundingClientRect(); seekTo(positionToTime(e.clientX, r.left, r.width, duration())); };
  track.addEventListener('pointerdown', e => { track.setPointerCapture(e.pointerId); scrub(e); });
  track.addEventListener('pointermove', e => { if (track.hasPointerCapture(e.pointerId)) scrub(e); });
  sync();
  state();
  return wrap;
}
