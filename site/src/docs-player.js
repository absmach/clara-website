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
export function keyAction(key, { slider = false } = {}) {
  if (!slider && (key === ' ' || key === 'k' || key === 'K')) return { type: 'toggle' };
  if (key === 'ArrowLeft' || (slider && key === 'ArrowDown')) return { type: 'seek', delta: -STEP };
  if (key === 'ArrowRight' || (slider && key === 'ArrowUp')) return { type: 'seek', delta: STEP };
  if (slider && key === 'Home') return { type: 'to', start: true };
  if (slider && key === 'End') return { type: 'to', start: false };
  return null;
}

const ICONS = {
  play: '<path d="M7 4.5v15l12-7.5-12-7.5Z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7 5v14M17 5v14"/>',
  back: '<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4.5h4.5"/><text x="12" y="15.4" font-size="8.5" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none">5</text>',
  forward: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/><text x="12" y="15.4" font-size="8.5" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none">5</text>',
};
const icon = name => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

function button(name, label) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'docs-player-btn';
  b.setAttribute('aria-label', label);
  b.innerHTML = icon(name);
  return b;
}

// Wraps one <video> in the player. Returns the wrapper. The native controls are removed
// only here, so a clip that never reaches this function keeps them.
export function mountPlayer(video) {
  if (video.closest('.docs-player')) return video.closest('.docs-player');
  const label = video.getAttribute('aria-label') || 'clip';
  const wrap = document.createElement('div');
  wrap.className = 'docs-player';
  wrap.tabIndex = 0;
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', `Video player: ${label}`);
  const w = Number(video.getAttribute('width'));
  const h = Number(video.getAttribute('height'));
  if (w > 0 && h > 0) wrap.style.setProperty('--ratio', `${w} / ${h}`);
  video.before(wrap);
  video.controls = false;
  wrap.append(video);

  const bar = document.createElement('div');
  bar.className = 'docs-player-bar';
  const play = button('play', 'Play');
  const back = button('back', `Back ${STEP} seconds`);
  const forward = button('forward', `Forward ${STEP} seconds`);
  const track = document.createElement('div');
  track.className = 'docs-player-track';
  track.tabIndex = 0;
  track.setAttribute('role', 'slider');
  track.setAttribute('aria-label', 'Seek');
  track.setAttribute('aria-valuemin', '0');
  const rail = document.createElement('div');
  rail.className = 'docs-player-rail';
  const fill = document.createElement('div');
  fill.className = 'docs-player-fill';
  rail.append(fill);
  track.append(rail);
  const time = document.createElement('span');
  time.className = 'docs-player-time';
  bar.append(play, back, forward, track, time);
  wrap.append(bar);

  const duration = () => (Number.isFinite(video.duration) ? video.duration : 0);
  const toggle = () => { if (video.paused) video.play().catch(() => {}); else video.pause(); };
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
  const act = (action) => {
    if (!action) return false;
    if (action.type === 'toggle') toggle();
    else if (action.type === 'seek') seekTo(jump(video.currentTime, action.delta, duration()));
    else seekTo(action.start ? 0 : duration());
    return true;
  };

  play.addEventListener('click', toggle);
  back.addEventListener('click', () => act({ type: 'seek', delta: -STEP }));
  forward.addEventListener('click', () => act({ type: 'seek', delta: STEP }));
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
