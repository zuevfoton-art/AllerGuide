/**
 * Generates Expo app icon assets for AllerGuide.
 * Run: node scripts/generate-assets.mjs
 */
import { Buffer } from 'node:buffer';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '..', 'assets');
const BRAND = '#1F7A5A';
const BRAND_DARK = '#145C44';
const BG = '#F4FAF7';

async function drawIcon(size) {
  const center = size / 2;
  const leafSvg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${BRAND}" />
          <stop offset="100%" stop-color="${BRAND_DARK}" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)" />
      <path
        d="M ${center} ${size * 0.18}
           C ${size * 0.72} ${size * 0.22}, ${size * 0.82} ${size * 0.52}, ${center} ${size * 0.82}
           C ${size * 0.18} ${size * 0.52}, ${size * 0.28} ${size * 0.22}, ${center} ${size * 0.18} Z"
        fill="#FFFFFF"
        opacity="0.95"
      />
      <path
        d="M ${center} ${size * 0.24} L ${center} ${size * 0.76}"
        stroke="${BRAND_DARK}"
        stroke-width="${Math.max(2, size * 0.02)}"
        stroke-linecap="round"
      />
    </svg>`;

  return sharp(Buffer.from(leafSvg)).png().toBuffer();
}

async function drawSplash(size) {
  const iconSize = Math.round(size * 0.28);
  const icon = await drawIcon(iconSize);
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toBuffer();
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

console.log('Generated assets in apps/mobile/assets/');
