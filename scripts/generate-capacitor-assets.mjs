// Build source icon files for @capacitor/assets to consume.
// Produces:
//   assets/icon.png            — full square branded icon (iOS + Android legacy)
//   assets/icon-foreground.png — spy only on transparent bg (Android adaptive)
//   assets/icon-background.png — branded gradient only (Android adaptive)
//   assets/splash.png          — 2732x2732 splash (iOS + Android)
//   assets/splash-dark.png     — dark variant
//
// Run: node scripts/generate-capacitor-assets.mjs
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url)) + '/..';
const outDir = join(root, 'assets');
mkdirSync(outDir, { recursive: true });

const srcSpy = join(root, 'public', 'source', 'spy.png');

// Strip the baked-in white background from the spy artwork.
async function makeSpyTransparent() {
  const { data, info } = await sharp(srcSpy)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const threshold = 240;
  for (let i = 0; i < out.length; i += info.channels) {
    if (out[i] >= threshold && out[i + 1] >= threshold && out[i + 2] >= threshold) {
      out[i + 3] = 0;
    }
  }
  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png()
    .toBuffer();
}

function bgSvg(size, cornerRadiusRatio = 0) {
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

async function renderBackground(size, cornerRadiusRatio = 0) {
  return sharp(Buffer.from(bgSvg(size, cornerRadiusRatio))).png().toBuffer();
}

readFileSync(srcSpy); // verify source exists
const spyBase = await makeSpyTransparent();

// 1. Main icon — full-bleed square with spy at ~82%. iOS applies a rounded
//    mask that crops ~9% off each side, so 82% leaves just enough margin
//    while keeping the spy prominent on the launcher.
const iconSize = 1024;
const spyInIcon = Math.round(iconSize * 0.82);
const iconBg = await renderBackground(iconSize, 0);
const spyForIcon = await sharp(spyBase)
  .resize(spyInIcon, spyInIcon, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .toBuffer();
const iconOffset = Math.round((iconSize - spyInIcon) / 2);
const icon = await sharp(iconBg)
  .composite([{ input: spyForIcon, top: iconOffset, left: iconOffset }])
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync(join(outDir, 'icon.png'), icon);
console.log('wrote assets/icon.png (1024x1024)');

// 2. Android adaptive foreground — spy only, centered in 1024x1024. The
//    adaptive-icon safe zone is the central 66% circle, but the spy artwork
//    is narrower than tall thanks to its shoulders, so 72% of the canvas
//    still keeps the face well inside the safe circle while filling the tile.
const fgSize = 1024;
const spyInFg = Math.round(fgSize * 0.72);
const fgOffset = Math.round((fgSize - spyInFg) / 2);
const spyForFg = await sharp(spyBase)
  .resize(spyInFg, spyInFg, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .toBuffer();
const foreground = await sharp({
  create: {
    width: fgSize,
    height: fgSize,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([{ input: spyForFg, top: fgOffset, left: fgOffset }])
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync(join(outDir, 'icon-foreground.png'), foreground);
console.log('wrote assets/icon-foreground.png (1024x1024)');

// 3. Android adaptive background — full-bleed branded gradient, no spy.
const background = await renderBackground(1024, 0);
writeFileSync(join(outDir, 'icon-background.png'), background);
console.log('wrote assets/icon-background.png (1024x1024)');

// 4. Splash — 2732x2732 (iPad Pro is the largest; everything scales down).
//    Branded background with spy centered at ~28% for a clean launch feel.
const splashSize = 2732;
const spyInSplash = Math.round(splashSize * 0.28);
const splashBg = await renderBackground(splashSize, 0);
const spyForSplash = await sharp(spyBase)
  .resize(spyInSplash, spyInSplash, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .toBuffer();
const splashOffset = Math.round((splashSize - spyInSplash) / 2);
const splash = await sharp(splashBg)
  .composite([{ input: spyForSplash, top: splashOffset, left: splashOffset }])
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync(join(outDir, 'splash.png'), splash);
writeFileSync(join(outDir, 'splash-dark.png'), splash);
console.log('wrote assets/splash.png (2732x2732)');
console.log('wrote assets/splash-dark.png (2732x2732)');

console.log('\ndone — now run: npx capacitor-assets generate');
