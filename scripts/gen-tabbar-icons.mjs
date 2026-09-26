/**
 * gen-tabbar-icons.mjs —— 代码生成 tabBar 图标（与 DESIGN.md §7 同步）
 *
 * 小程序 tabBar 只接受本地 PNG（不支持 svg / 字体图标），颜色必须落在文件里。
 * 本脚本按设计规范栅格化：24 网格线性图标、圆头圆角、4×4 超采样抗锯齿，
 * PNG 由 node 内置 zlib 手写，无任何依赖。
 *
 * 颜色直接从 uni.scss 读取：未选中 $ds-ink-3、选中 $ds-secondary。
 * 改令牌后重跑：node scripts/gen-tabbar-icons.mjs
 * 校验现有图标与令牌是否一致：node scripts/gen-tabbar-icons.mjs --check
 * 不要手工替换这 4 张图。
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const UNI_SCSS = join(root, 'uni.scss');
const OUT_DIR = join(root, 'static', 'tabbar');
const SIZE = 81;          // tabBar 推荐尺寸
const SS = 4;             // 超采样倍数
const GRID = 24;          // 图标网格
const STROKE = 1.7;       // 网格坐标下的描边宽度（视觉与原型 .ico 1.42-1.7 对齐）

/* ---------- 从 uni.scss 读颜色 ---------- */
function readToken(name) {
  const m = readFileSync(UNI_SCSS, 'utf8').match(new RegExp(`\\$${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  if (!m) throw new Error(`uni.scss 里找不到 $${name}`);
  return m[1];
}

const COLORS = {
  home: { normal: readToken('ds-ink-3'), active: readToken('ds-secondary') },
  mine: { normal: readToken('ds-ink-3'), active: readToken('ds-secondary') }
};

/* ---------- 图标几何（24 网格，线段与二次贝塞尔） ---------- */
/* 全部拆成线段（贝塞尔先展平），距离场渲染天然带圆头圆角 */
const ICONS = {
  home: [
    [[4, 11.4], [12, 4.2], [20, 11.4]],                                  // 屋顶
    [[5.7, 10.2], [5.7, 18.6], [6.9, 19.8], [17.1, 19.8], [18.3, 18.6], [18.3, 10.2]], // 屋身
    [[10, 20.6], [10, 14.2], [14, 14.2], [14, 20.6]]                     // 门
  ],
  mine: [
    circle(12, 8.3, 3.5),
    quad([5.3, 19.9], [5.9, 13.9], [12, 13.9]),                          // 左肩
    quad([12, 13.9], [18.1, 13.9], [18.7, 19.9])                         // 右肩
  ]
};

function circle(cx, cy, r) {
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function quad(p0, p1, p2) {
  const pts = [];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32, u = 1 - t;
    pts.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
  }
  return pts;
}

/* ---------- 距离场渲染 ---------- */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * dx - px, qy = ay + t * dy - py;
  return Math.hypot(qx, qy);
}

function renderIcon(polylines, hex) {
  const scale = SIZE / GRID;
  const strokeDev = STROKE * scale;
  const segments = [];
  for (const poly of polylines) {
    for (let i = 0; i < poly.length - 1; i++) segments.push([...poly[i], ...poly[i + 1]]);
  }

  const rgba = hexToRgba(hex);
  const raw = Buffer.alloc(SIZE * SIZE * 4);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let cov = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = (x + (sx + 0.5) / SS) / scale;
          const py = (y + (sy + 0.5) / SS) / scale;
          let d = Infinity;
          for (const [ax, ay, bx, by] of segments) d = Math.min(d, segDist(px, py, ax, ay, bx, by));
          const dev = d * scale;
          cov += Math.max(0, Math.min(1, strokeDev / 2 + 0.5 - dev));
        }
      }
      const a = Math.round((cov / (SS * SS)) * rgba[3]);
      const o = (y * SIZE + x) * 4;
      raw[o] = rgba[0]; raw[o + 1] = rgba[1]; raw[o + 2] = rgba[2]; raw[o + 3] = a;
    }
  }
  return raw;
}

function hexToRgba(hex) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16), 255];
}

/* ---------- PNG 写出（RGBA8，filter 0，zlib deflate） ---------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function writePng(raw, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const rows = [];
  for (let y = 0; y < size; y++) {
    rows.push(Buffer.from([0]), raw.subarray(y * size * 4, (y + 1) * size * 4));
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---------- 主流程 ---------- */
const check = process.argv.includes('--check');
const targets = [
  ['home', 'home.png', 'home-active.png'],
  ['mine', 'mine.png', 'mine-active.png']
];

let mismatch = false;
for (const [name, normalFile, activeFile] of targets) {
  const polylines = ICONS[name];
  const normal = writePng(renderIcon(polylines, COLORS[name].normal), SIZE);
  const active = writePng(renderIcon(polylines, COLORS[name].active), SIZE);

  for (const [file, buf] of [[normalFile, normal], [activeFile, active]]) {
    const path = join(OUT_DIR, file);
    if (check) {
      if (!existsSync(path) || !buf.equals(readFileSync(path))) {
        console.error(`✗ ${file} 与当前令牌不一致，请重跑生成`);
        mismatch = true;
      } else {
        console.log(`✓ ${file} 与令牌一致`);
      }
    } else {
      writeFileSync(path, buf);
      console.log(`✓ 已生成 ${path}（${COLORS[name][file === activeFile ? 'active' : 'normal']}）`);
    }
  }
}

if (check && mismatch) process.exit(1);
