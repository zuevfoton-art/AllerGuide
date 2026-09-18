#!/usr/bin/env node
/**
 * Screenshot HTML mockup phone frames into docs/figma/traces/.
 * Usage: node docs/figma/capture-traces.mjs
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const docs = join(root, 'docs');
const outDir = join(docs, 'figma', 'traces');
const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const port = Number(process.env.TRACE_PORT || 8765);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.md': 'text/plain; charset=utf-8',
};

const shots = [
  { file: 'kit.png', path: '/figma/kit.html', width: 920, height: 720 },
  { file: 'home.png', path: '/design-mockup.html?screen=home', width: 410, height: 864 },
  { file: 'home-empty.png', path: '/design-mockup.html?screen=home-empty', width: 410, height: 864 },
  { file: 'home-offline.png', path: '/design-mockup.html?screen=home-offline', width: 410, height: 864 },
  { file: 'diary.png', path: '/design-mockup.html?screen=diary', width: 410, height: 864 },
  { file: 'scanner.png', path: '/design-mockup.html?screen=scanner', width: 410, height: 864 },
  { file: 'map.png', path: '/design-mockup.html?screen=map', width: 410, height: 864 },
  { file: 'sos.png', path: '/design-mockup.html?screen=sos', width: 410, height: 864 },
  { file: 'sos-empty.png', path: '/design-mockup.html?screen=sos-empty', width: 410, height: 864 },
  { file: 'settings.png', path: '/design-mockup.html?screen=settings', width: 410, height: 864 },
  { file: 'login.png', path: '/design-mockup.html?screen=login', width: 410, height: 864 },
  { file: 'register.png', path: '/design-mockup.html?screen=register', width: 410, height: 864 },
];

const NO_TAB = new Set([
  'login', 'register', 'forgot-password', 'onboarding-intro', 'onboarding', 'profile-setup',
  'notifications', 'profile', 'profiles', 'profile-edit', 'settings', 'doctor-report',
  'clinical-scales', 'expert', 'ask', 'market', 'sos-empty', 'sos-edit',
  'diary-editor', 'diary-picker', 'diary-editor-photo', 'therapy', 'asit',
  'asthma-plan', 'insect-plan', 'food-drug',
]);

function pinMockupScreen(html, name) {
  let out = html.replace(/class="screen active"/g, 'class="screen"');
  const id = `id="screen-${name}"`;
  out = out.replace(
    new RegExp(`(<section class="screen")([^>]*${id})`),
    '<section class="screen active"$2',
  );
  out = out.replace('<body>', '<body class="trace-mode">');
  if (NO_TAB.has(name)) {
    out = out.replace('class="phone" id="phone"', 'class="phone hidden-tabbar" id="phone"');
  }
  return out;
}

function serveDocs() {
  return new Promise((resolveServer) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
      let rel = decodeURIComponent(url.pathname);
      if (rel.endsWith('/')) rel += 'index.html';
      const file = join(docs, rel);
      if (!file.startsWith(docs) || !existsSync(file) || statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      const type = MIME[extname(file)] || 'application/octet-stream';
      if (rel === '/design-mockup.html') {
        const screen = url.searchParams.get('screen');
        let html = readFileSync(file, 'utf8');
        html = screen ? pinMockupScreen(html, screen) : html.replace('<body>', '<body class="trace-mode">');
        res.writeHead(200, { 'content-type': type });
        res.end(html);
        return;
      }
      res.writeHead(200, { 'content-type': type });
      createReadStream(file).pipe(res);
    });
    server.listen(port, '127.0.0.1', () => resolveServer(server));
  });
}

function runChrome(args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(chrome, args, { stdio: 'ignore' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolveRun();
      else reject(new Error(`chrome exit ${code}`));
    });
  });
}

mkdirSync(outDir, { recursive: true });
const server = await serveDocs();
try {
  for (const shot of shots) {
    const dest = join(outDir, shot.file);
    const profile = join('/tmp', `claro-trace-${shot.file}`);
    await runChrome([
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--user-data-dir=${profile}`,
      '--force-device-scale-factor=2',
      `--window-size=${shot.width},${shot.height}`,
      `--screenshot=${dest}`,
      '--virtual-time-budget=4000',
      `http://127.0.0.1:${port}${shot.path}`,
    ]);
    console.log('wrote', dest);
  }
} finally {
  server.close();
}
