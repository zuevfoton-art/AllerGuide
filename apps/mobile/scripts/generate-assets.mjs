/**
 * Generates Expo app icon assets for A-Claro / Aclearo (Claro Teal brandbook).
 * Run: pnpm --filter mobile generate-assets
 */
import { Buffer } from 'node:buffer';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '..', 'assets');
const ACCENT = '#2A9D8F';
const BG = '#F4F6F9';
const INK = '#1E3A5F';
const MUTED = '#5E6B7C';

function monogramSvg(size) {
  const rx = Math.round(size * 0.22);
  const aPath = `M${size * 0.5} ${size * 0.23} L${size * 0.76} ${size * 0.77} H${size * 0.66} L${size * 0.61} ${size * 0.65} H${size * 0.39} L${size * 0.34} ${size * 0.77} H${size * 0.24} L${size * 0.5} ${size * 0.23} Z M${size * 0.42} ${size * 0.57} H${size * 0.58} L${size * 0.5} ${size * 0.37} Z`;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${rx}" fill="${ACCENT}" />
      <path d="${aPath}" fill="white" fill-rule="evenodd" />
    </svg>`;
}

function splashLockupSvg(size) {
  const icon = 360;
  const iconX = (size - icon) / 2;
  const iconY = size * 0.34;
  const aPath = `M${icon * 0.5} ${icon * 0.23} L${icon * 0.76} ${icon * 0.77} H${icon * 0.66} L${icon * 0.61} ${icon * 0.65} H${icon * 0.39} L${icon * 0.34} ${icon * 0.77} H${icon * 0.24} L${icon * 0.5} ${icon * 0.23} Z M${icon * 0.42} ${icon * 0.57} H${icon * 0.58} L${icon * 0.5} ${icon * 0.37} Z`;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${BG}" />
      <g transform="translate(${iconX}, ${iconY})">
        <rect width="${icon}" height="${icon}" rx="78" fill="${ACCENT}" />
        <path d="${aPath}" fill="white" fill-rule="evenodd" />
      </g>
      <text x="50%" y="${iconY + icon + 120}" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="112" font-weight="700" fill="${ACCENT}">A</text>
      <text x="50%" y="${iconY + icon + 120}" dx="42" text-anchor="start" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="112" font-weight="600" fill="${INK}">‑Claro</text>
      <text x="50%" y="${iconY + icon + 200}" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="56" font-weight="400" fill="${MUTED}">an Aclearo app</text>
    </svg>`;
}

async function drawIcon(size) {
  return sharp(Buffer.from(monogramSvg(size))).png().toBuffer();
}

async function drawSplash(size) {
  return sharp(Buffer.from(splashLockupSvg(size))).png().toBuffer();
}

await mkdir(assetsDir, { recursive: true });

const icon = await drawIcon(1024);
const splash = await drawSplash(2048);
const favicon = await drawIcon(48);
const notification = await drawIcon(96);

await writeFile(join(assetsDir, 'icon.png'), icon);
await writeFile(join(assetsDir, 'adaptive-icon.png'), icon);
await writeFile(join(assetsDir, 'splash-icon.png'), splash);
await writeFile(join(assetsDir, 'favicon.png'), favicon);
await writeFile(join(assetsDir, 'notification-icon.png'), notification);

console.log('Generated A-Claro assets in apps/mobile/assets/');
