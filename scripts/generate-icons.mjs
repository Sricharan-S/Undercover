// Generate PWA icons (PNGs) by compositing the spy artwork onto a branded
// rounded-square background. Run via `node scripts/generate-icons.mjs`.
import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url)) + '/..';
const outDir = join(root, 'public', 'icons');
const srcSpy = join(root, 'public', 'source', 'spy.png');
mkdirSync(outDir, { recursive: true });

// Branded background: deep indigo with a warm accent glow in the top-left.
// `cornerRadiusRatio` of 0 produces a full square (required for maskable icons,
// since the OS applies its own mask).
function bgSvg({ size, cornerRadiusRatio = 0.22 }) {
  const r = size * cornerRadiusRatio;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#1e293b"/>
      <stop offset="60%"  stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.28" cy="0.22" r="0.65">
      <stop offset="0%"   stop-color="#f59e0b" stop-opacity="0.45"/>
      <stop offset="60%"  stop-color="#f59e0b" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.85" cy="0.9" r="0.55">
      <stop offset="0%"   stop-color="#14b8a6" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#14b8a6" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#glow)"/>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#glow2)"/>
</svg>`;
}

async function renderBackground(size, cornerRadiusRatio) {
  const svg = bgSvg({ size, cornerRadiusRatio });
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// The source spy PNG has a solid white background. Replace every near-white
// pixel with full transparency so the artwork sits cleanly on any background.
async function makeSpyTransparent() {
  const img = sharp(srcSpy).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data); // copy so we can mutate
  const threshold = 240; // >=240 on every RGB channel => treat as background
  for (let i = 0; i < out.length; i += channels) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    if (r >= threshold && g >= threshold && b >= threshold) {
      out[i + 3] = 0;
    }
  }
  return sharp(out, { raw: { width, height, channels } }).png().toBuffer();
}

// Resize the spy artwork so it fills `innerSize` pixels and centers it.
async function writeIcon(name, spyBase, { size, innerRatio = 0.74, cornerRadiusRatio = 0.22 }) {
  const innerSize = Math.round(size * innerRatio);
  const bg = await renderBackground(size, cornerRadiusRatio);
  const spy = await sharp(spyBase)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const top = Math.round((size - innerSize) / 2);
  const left = top;

  const png = await sharp(bg)
    .composite([{ input: spy, top, left }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  const fs = await import('node:fs');
  fs.writeFileSync(join(outDir, name), png);
  console.log('wrote', name, `(${size}x${size})`);
}

// Verify source exists
readFileSync(srcSpy);

const spyBase = await makeSpyTransparent();

// Standard icons: normal rounded square, spy takes ~88% of the tile for a
// bolder, more prominent look on home screens and install prompts.
await writeIcon('icon-192.png', spyBase, { size: 192, innerRatio: 0.88, cornerRadiusRatio: 0.22 });
await writeIcon('icon-512.png', spyBase, { size: 512, innerRatio: 0.88, cornerRadiusRatio: 0.22 });

// Apple touch icon: iOS applies its own rounded mask, so render a full square
// background (no corner radius) with the spy slightly pulled in so it isn't
// clipped by iOS's squircle.
await writeIcon('apple-touch-icon-180.png', spyBase, {
  size: 180,
  innerRatio: 0.84,
  cornerRadiusRatio: 0,
});

// Maskable icon: must be full-bleed with a ~20% safe area (spy fits inside ~72%
// of the canvas so OS masks never crop it but it still looks bold).
await writeIcon('icon-maskable-512.png', spyBase, {
  size: 512,
  innerRatio: 0.72,
  cornerRadiusRatio: 0,
});

console.log('done');
