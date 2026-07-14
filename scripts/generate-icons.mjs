/**
 * Dependency-free icon generator: draws a magnifying glass on the brand-accent background
 * and writes PNGs to src/public/icon/{size}.png (WXT auto-adds them to the manifest).
 * Uses only Node built-ins (zlib for PNG IDAT). 4x supersampling for smooth edges.
 *
 * Run: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../src/public/icon');
const SIZES = [16, 32, 48, 96, 128];
const ACCENT = [37, 99, 235]; // --lq-accent (light)
const WHITE = [255, 255, 255];

// --- minimal PNG encoder (8-bit RGBA) ---
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// --- geometry ---
function insideRoundedRect(px, py, W, H, r) {
  const dx = Math.max(r - px, 0, px - (W - r));
  const dy = Math.max(r - py, 0, py - (H - r));
  return Math.hypot(dx, dy) <= r;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let tt = ((px - ax) * dx + (py - ay) * dy) / len2;
  tt = Math.max(0, Math.min(1, tt));
  return Math.hypot(px - (ax + tt * dx), py - (ay + tt * dy));
}

function renderIcon(size) {
  const s = 4;
  const N = size * s;
  const hi = Buffer.alloc(N * N * 4);

  const radius = N * 0.2;
  const cx = N * 0.42;
  const cy = N * 0.42;
  const lensR = N * 0.23;
  const ring = N * 0.08;
  const ang = Math.PI * 0.25;
  const hx0 = cx + Math.cos(ang) * lensR;
  const hy0 = cy + Math.sin(ang) * lensR;
  const hx1 = cx + Math.cos(ang) * (lensR + N * 0.27);
  const hy1 = cy + Math.sin(ang) * (lensR + N * 0.27);
  const handleW = N * 0.085;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      const fx = x + 0.5;
      const fy = y + 0.5;
      const inRect = insideRoundedRect(fx, fy, N, N, radius);
      let col = null;
      if (inRect) {
        const d = Math.hypot(fx - cx, fy - cy);
        const inRing = Math.abs(d - lensR) <= ring / 2;
        const inHandle = distToSegment(fx, fy, hx0, hy0, hx1, hy1) <= handleW / 2;
        col = inRing || inHandle ? WHITE : ACCENT;
      }
      if (col) {
        hi[i] = col[0];
        hi[i + 1] = col[1];
        hi[i + 2] = col[2];
        hi[i + 3] = 255;
      }
    }
  }

  // downsample (box filter) with alpha-weighted color
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let R = 0;
      let G = 0;
      let B = 0;
      let A = 0;
      for (let dy = 0; dy < s; dy++) {
        for (let dx = 0; dx < s; dx++) {
          const j = ((y * s + dy) * N + (x * s + dx)) * 4;
          const a = hi[j + 3];
          R += hi[j] * a;
          G += hi[j + 1] * a;
          B += hi[j + 2] * a;
          A += a;
        }
      }
      const i = (y * size + x) * 4;
      out[i + 3] = Math.round(A / (s * s));
      if (A > 0) {
        out[i] = Math.round(R / A);
        out[i + 1] = Math.round(G / A);
        out[i + 2] = Math.round(B / A);
      }
    }
  }
  return out;
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const png = encodePng(size, size, renderIcon(size));
  writeFileSync(resolve(OUT_DIR, `${size}.png`), png);
  console.log(`icon/${size}.png  (${png.length} bytes)`);
}
console.log('Done.');
