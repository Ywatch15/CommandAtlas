/* eslint-disable no-console */
/**
 * Generate PWA Icons for CommandAtlas
 *
 * Generates:
 * - apps/web/public/favicon.svg
 * - apps/web/public/favicon.ico
 * - apps/web/public/icons/icon.svg
 * - apps/web/public/icons/icon-192.png
 * - apps/web/public/icons/icon-192-maskable.png
 * - apps/web/public/icons/icon-512.png
 * - apps/web/public/icons/icon-512-maskable.png
 * - apps/web/public/icons/apple-touch-icon.png (180x180)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── CRC32 & PNG ENCODER ─────────────────────────────────────────────────────

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const crc = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crc.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgbaBuffer) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const scanlineLen = width * 4 + 1;
  const rawData = Buffer.alloc(height * scanlineLen);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLen;
    rawData[rowOffset] = 0; // Filter None
    rgbaBuffer.copy(rawData, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const idatData = zlib.deflateSync(rawData, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function encodeICO(pngBuffer, width, height) {
  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // image type 1 = icon
  header.writeUInt16LE(1, 4); // number of images = 1

  // Directory entry: 16 bytes
  const dir = Buffer.alloc(16);
  dir[0] = width >= 256 ? 0 : width;
  dir[1] = height >= 256 ? 0 : height;
  dir[2] = 0; // color palette
  dir[3] = 0; // reserved
  dir.writeUInt16LE(1, 4); // color planes
  dir.writeUInt16LE(32, 6); // bits per pixel
  dir.writeUInt32LE(pngBuffer.length, 8); // image size
  dir.writeUInt32LE(22, 12); // image offset (6 + 16 = 22)

  return Buffer.concat([header, dir, pngBuffer]);
}

// ─── 2D SDF PRIMITIVES ────────────────────────────────────────────────────────

function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax,
    pay = py - ay;
  const bax = bx - ax,
    bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  const dx = pax - bax * h,
    dy = pay - bay * h;
  return Math.sqrt(dx * dx + dy * dy);
}

function sdRoundedRect(px, py, x, y, w, h, r) {
  const cx = x + w / 2,
    cy = y + h / 2;
  const qx = Math.abs(px - cx) - (w / 2 - r);
  const qy = Math.abs(py - cy) - (h / 2 - r);
  const ox = Math.max(qx, 0),
    oy = Math.max(qy, 0);
  const outDist = Math.sqrt(ox * ox + oy * oy);
  const inDist = Math.min(Math.max(qx, qy), 0);
  return outDist + inDist - r;
}

// ─── SAMPLE SCENE AT A POINT (0..512 space) ───────────────────────────────────

function samplePoint(px, py, isMaskable) {
  // Base background: #0B0D10 (RGBA: 11, 13, 16)
  let r = 11,
    g = 13,
    b = 16;
  const a = 255;

  const cardMargin = isMaskable ? 48 : 24;
  const cardW = 512 - cardMargin * 2;
  const cardH = 512 - cardMargin * 2;
  const cardRadius = isMaskable ? 44 : 80;

  const dCard = sdRoundedRect(px, py, cardMargin, cardMargin, cardW, cardH, cardRadius);
  const dBorder = Math.abs(dCard + 4) - 4;

  if (dCard <= 0) {
    // Card background: #14171B
    r = 20;
    g = 23;
    b = 27;
  }
  if (dBorder <= 0) {
    // Card border: #2A2F36
    r = 42;
    g = 47;
    b = 54;
  }

  // Dots
  const dotY = isMaskable ? 116 : 92;
  const dotX1 = isMaskable ? 116 : 88;
  const dotX2 = isMaskable ? 152 : 124;
  const dotX3 = isMaskable ? 188 : 160;

  const dDot1 = Math.sqrt((px - dotX1) ** 2 + (py - dotY) ** 2) - 12;
  const dDot2 = Math.sqrt((px - dotX2) ** 2 + (py - dotY) ** 2) - 12;
  const dDot3 = Math.sqrt((px - dotX3) ** 2 + (py - dotY) ** 2) - 12;

  if (dDot1 <= 0) {
    r = 248;
    g = 81;
    b = 73;
  } // #F85149
  else if (dDot2 <= 0) {
    r = 210;
    g = 153;
    b = 34;
  } // #D29922
  else if (dDot3 <= 0) {
    r = 63;
    g = 185;
    b = 80;
  } // #3FB950

  // Chevron ">": (110, 210) -> (220, 280) -> (110, 350)
  const dSeg1 = sdSegment(px, py, 110, 210, 220, 280) - 18;
  const dSeg2 = sdSegment(px, py, 220, 280, 110, 350) - 18;
  const dChevron = Math.min(dSeg1, dSeg2);

  if (dChevron <= 0) {
    // #4F8CFF (Accent Blue)
    r = 79;
    g = 140;
    b = 255;
  }

  // Cursor "_": (260, 350) -> (380, 350)
  const dCursor = sdSegment(px, py, 260, 350, 380, 350) - 18;
  if (dCursor <= 0) {
    // #E6E8EB (Text Primary)
    r = 230;
    g = 232;
    b = 235;
  }

  return [r, g, b, a];
}

// ─── RASTERIZE WITH 2x2 SUPERSAMPLING ─────────────────────────────────────────

function rasterizeIcon(targetSize, isMaskable) {
  const buf = Buffer.alloc(targetSize * targetSize * 4);
  const scale = targetSize / 512;
  const subOffsets = [0.25, 0.75];

  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      let rSum = 0,
        gSum = 0,
        bSum = 0,
        aSum = 0;

      for (const oy of subOffsets) {
        for (const ox of subOffsets) {
          const px = (x + ox) / scale;
          const py = (y + oy) / scale;
          const [r, g, b, a] = samplePoint(px, py, isMaskable);
          rSum += r;
          gSum += g;
          bSum += b;
          aSum += a;
        }
      }

      const idx = (y * targetSize + x) * 4;
      buf[idx] = Math.round(rSum / 4);
      buf[idx + 1] = Math.round(gSum / 4);
      buf[idx + 2] = Math.round(bSum / 4);
      buf[idx + 3] = Math.round(aSum / 4);
    }
  }

  return buf;
}

// ─── SVG DEFINITIONS ──────────────────────────────────────────────────────────

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="108" fill="#0B0D10" />
  <rect x="24" y="24" width="464" height="464" rx="80" fill="#14171B" stroke="#2A2F36" stroke-width="8" />
  <circle cx="88" cy="92" r="12" fill="#F85149" />
  <circle cx="124" cy="92" r="12" fill="#D29922" />
  <circle cx="160" cy="92" r="12" fill="#3FB950" />
  <path d="M 110 210 L 220 280 L 110 350" fill="none" stroke="#4F8CFF" stroke-width="36" stroke-linecap="round" stroke-linejoin="round" />
  <line x1="260" y1="350" x2="380" y2="350" stroke="#E6E8EB" stroke-width="36" stroke-linecap="round" />
  <path d="M 320 180 A 90 90 0 0 1 400 260" fill="none" stroke="#4F8CFF" stroke-width="8" stroke-linecap="round" opacity="0.4" />
</svg>`;

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="6" fill="#0B0D10" />
  <rect x="2" y="2" width="28" height="28" rx="5" fill="#14171B" stroke="#2A2F36" stroke-width="1" />
  <path d="M 7 13 L 13 17 L 7 21" fill="none" stroke="#4F8CFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
  <line x1="16" y1="21" x2="23" y2="21" stroke="#E6E8EB" stroke-width="2.5" stroke-linecap="round" />
</svg>`;

// ─── MAIN GENERATOR ───────────────────────────────────────────────────────────

function main() {
  const publicDir = path.resolve(__dirname, '../apps/web/public');
  const iconsDir = path.join(publicDir, 'icons');

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // 1. Write SVGs
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), FAVICON_SVG);
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), ICON_SVG);
  console.log('✓ Wrote favicon.svg and icons/icon.svg');

  // 2. Render and write PNGs
  const targets = [
    { size: 512, maskable: false, name: 'icon-512.png' },
    { size: 512, maskable: true, name: 'icon-512-maskable.png' },
    { size: 192, maskable: false, name: 'icon-192.png' },
    { size: 192, maskable: true, name: 'icon-192-maskable.png' },
    { size: 180, maskable: false, name: 'apple-touch-icon.png' },
    { size: 48, maskable: false, name: 'favicon-48.png' },
  ];

  let png48Buffer = null;

  for (const t of targets) {
    console.log(`Rendering ${t.name} (${t.size}x${t.size})...`);
    const rgba = rasterizeIcon(t.size, t.maskable);
    const png = encodePNG(t.size, t.size, rgba);

    const outPath =
      t.name === 'apple-touch-icon.png'
        ? path.join(iconsDir, t.name)
        : t.name === 'favicon-48.png'
          ? path.join(publicDir, t.name)
          : path.join(iconsDir, t.name);

    fs.writeFileSync(outPath, png);

    // Also copy apple-touch-icon.png to public root for maximum iOS compatibility
    if (t.name === 'apple-touch-icon.png') {
      fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png);
    }
    if (t.name === 'favicon-48.png') {
      png48Buffer = png;
    }
  }

  // 3. Write favicon.ico
  if (png48Buffer) {
    const ico = encodeICO(png48Buffer, 48, 48);
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);
    fs.unlinkSync(path.join(publicDir, 'favicon-48.png'));
    console.log('✓ Wrote favicon.ico');
  }

  console.log('All PWA icons successfully generated!');
}

main();
