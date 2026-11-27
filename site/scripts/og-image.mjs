// Renders the social share card (src/assets/og-image.png, 1200x630) with headless Chrome.
// Run `pnpm run build` first; then `pnpm run og-image` and rebuild to copy it into dist/.
// Set CHROME to a Chrome/Chromium binary if `google-chrome` is not on PATH.
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const output = fileURLToPath(new URL('../src/assets/og-image.png', import.meta.url));
const home = await readFile(path.join(dist, 'index.html'), 'utf8');
const start = home.indexOf('<div class="hero-art"');
const end = home.indexOf('<p class="art-caption"', start);
if (start < 0 || end < 0) throw new Error('Hero illustration not found in dist/index.html. Run the build first.');
const card = (await readFile(new URL('./og-card.html', import.meta.url), 'utf8')).replace('{{HERO_ART}}', home.slice(start, end) + '</div>');

const types = { '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname === '/') return res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(card);
  const target = path.resolve(dist, '.' + pathname);
  if (!target.startsWith(dist)) return res.writeHead(403).end();
  let body;
  try { body = await readFile(target); } catch { return res.writeHead(404).end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' }).end(body);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
try {
  // Async so this process's server can answer Chrome's requests while it renders.
  await promisify(execFile)(process.env.CHROME || 'google-chrome', [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--window-size=1200,630', '--virtual-time-budget=3000', `--screenshot=${output}`,
    `http://127.0.0.1:${server.address().port}/`,
  ], { timeout: 60_000 });
} finally { server.close(); }
console.log(`Wrote ${path.relative(process.cwd(), output)}`);
