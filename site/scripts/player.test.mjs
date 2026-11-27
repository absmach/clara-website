import test from 'node:test';
import assert from 'node:assert/strict';
import { playerHtml, STEP, clamp, formatTime, jump, keyAction, positionToTime, valueText } from '../src/docs-player.js';

test('times read as m:ss and never go negative or past the end', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(5.9), '0:05');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(NaN), '0:00');
  assert.equal(formatTime(Infinity), '0:00');
  assert.equal(clamp(-3, 10), 0);
  assert.equal(clamp(12, 10), 10);
  assert.equal(clamp(4, NaN), 0);
});

test('jumping and scrubbing stay inside the clip', () => {
  assert.equal(STEP, 5);
  assert.equal(jump(3, -5, 20), 0);
  assert.equal(jump(18, 5, 20), 20);
  assert.equal(jump(8, 5, 20), 13);
  assert.equal(positionToTime(150, 100, 200, 40), 10);
  assert.equal(positionToTime(50, 100, 200, 40), 0);
  assert.equal(positionToTime(999, 100, 200, 40), 40);
  assert.equal(positionToTime(150, 100, 0, 40), 0);
});

test('the scrubber announces where it is', () => assert.equal(valueText(12.4, 45), '0:12 of 0:45'));

test('keys on the player and on the scrubber', () => {
  assert.deepEqual(keyAction(' '), { type: 'toggle' });
  assert.deepEqual(keyAction('k'), { type: 'toggle' });
  assert.deepEqual(keyAction('K'), { type: 'toggle' });
  assert.deepEqual(keyAction('ArrowLeft'), { type: 'seek', delta: -5 });
  assert.deepEqual(keyAction('ArrowRight'), { type: 'seek', delta: 5 });
  assert.equal(keyAction('ArrowUp'), null);
  assert.deepEqual(keyAction('f'), { type: 'fullscreen' });
  assert.deepEqual(keyAction('F'), { type: 'fullscreen' });
  assert.equal(keyAction('a'), null);
  // The scrubber plays and pauses with Space too, and adds up, down, Home and End.
  assert.deepEqual(keyAction(' ', { slider: true }), { type: 'toggle' });
  assert.deepEqual(keyAction('ArrowUp', { slider: true }), { type: 'seek', delta: 5 });
  assert.deepEqual(keyAction('ArrowDown', { slider: true }), { type: 'seek', delta: -5 });
  assert.deepEqual(keyAction('Home', { slider: true }), { type: 'to', start: true });
  assert.deepEqual(keyAction('End', { slider: true }), { type: 'to', start: false });
});

test('a failed player import hides the built-in bar and keeps native controls', async () => {
  const { readFile } = await import('node:fs/promises');
  const script = await readFile(new URL('../src/docs.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(script, /catch \{[^}]*classList\.add\('no-player'\)/);
  assert.match(css, /\.no-player \.docs-player-bar\{display:none\}/);
});

test('the player markup ends with a full-screen button that starts disabled', () => {
  const html = playerHtml('<video src="/a.mp4"></video>', 'A clip');
  assert.match(html, /<span class="docs-player-time">0:00 \/ 0:00<\/span><button type="button" class="docs-player-btn" aria-label="Full screen" disabled>/);
  assert.equal((html.match(/class="docs-player-btn"/g) || []).length, 4);
});

test('the script switches the label, keeps pauses in full screen as user pauses and hides the button without support', async () => {
  const { readFile } = await import('node:fs/promises');
  const script = await readFile(new URL('../src/docs-player.js', import.meta.url), 'utf8');
  assert.match(script, /'Exit full screen' : 'Full screen'/);
  assert.match(script, /webkitEnterFullscreen/);
  assert.match(script, /full\.hidden = true/);
  assert.match(script, /if \(isFull\(\)\) video\.dataset\.userPaused = '1'/);
});
