/**
 * Generates Expo app icon assets for AllerGuide (Clinical Calm brandbook).
 * Run: node scripts/generate-assets.mjs
 */
import { Buffer } from 'node:buffer';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '..', 'assets');
const ACCENT = '#2563EB';
const BG = '#F4F6F9';

function brandIconSvg(size) {
  const rx = Math.round(size * 0.22);
  const shieldStroke = size < 48 ? 0 : 2.5;
  const crossStroke = size < 48 ? Math.max(4, size * 0.12) : 3;
  const showShield = size >= 24;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${rx}" fill="${ACCENT}" />
      ${
        showShield
          ? `<path d="M${size * 0.5} ${size * 0.23} L${size * 0.73} ${size * 0.36} V${size * 0.64} L${size * 0.5} ${size * 0.77} L${size * 0.27} ${size * 0.64} V${size * 0.36} Z"
        fill="none" stroke="white" stroke-width="${shieldStroke}" stroke-linejoin="round"/>
      <path d="M${size * 0.39} ${size * 0.5} h${size * 0.22} M${size * 0.5} ${size * 0.39} v${size * 0.22}"
        stroke="white" stroke-width="${crossStroke}" stroke-linecap="round"/>`
          : `<path d="M${size * 0.39} ${size * 0.5} h${size * 0.22} M${size * 0.5} ${size * 0.39} v${size * 0.22}"
        stroke="white" stroke-width="${crossStroke}" stroke-linecap="round"/>`
      }
    </svg>`;
}

async function drawIcon(size) {
  return sharp(Buffer.from(brandIconSvg(size))).png().toBuffer();
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
