#!/usr/bin/env node
/**
 * tabBar 图标生成器（零依赖，用代码画 png）
 *
 * 为什么需要它：
 *   重构前遗留的 4 张图标是陪玩时期的「灰 + 粉红」，而 DESIGN.md 定稿后 tabBar 的
 *   selectedColor 是竹青绿 → 选中态会出现「粉色图标 + 绿色文字」。
 *   小程序 tabBar 只吃本地图片（不支持 svg / 字体图标），所以图标颜色必须落在文件里。
 *
 * 做法：按 DESIGN.md §9 的规范（24×24 网格、线性描边、stroke-width 1.6）用代码栅格化，
 *   颜色**直接从 uni.scss 的令牌读取**（未选中 $ds-ink-2、选中 $ds-primary），
 *   令牌一改重新跑本脚本即可，图标不会再和设计系统漂移。
 *   4×4 超采样做抗锯齿，PNG 由 node 内置 zlib 手写（无第三方依赖）。
 *
 * 用法：
 *   node scripts/gen-tabbar-icons.mjs            # 重新生成 4 张图标并自检
 *   node scripts/gen-tabbar-icons.mjs --check    # 只校验现有图标是否符合令牌（不写文件）
 */
import { deflateSync, inflateSync } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'static', 'tabbar');
const CHECK_ONLY = process.argv.indexOf('--check') >= 0;

/* tabBar 图标推荐 81×81；超采样 4× 做抗锯齿 */
const SIZE = 81;
const SS = 4;
const W = SIZE * SS;
/** DESIGN.md §9：24 网格里的 1.6 描边 */
const STROKE = 1.6;
const HALF = (STROKE / 24) * W / 2;

/* ---------- 颜色：从 uni.scss 令牌读，避免和设计系统脱钩 ---------- */
function tokenColor(name) {
  const scss = readFileSync(join(ROOT, 'uni.scss'), 'utf8');
  const matched = scss.match(new RegExp(`\\${name}\\s*:\\s*(#[0-9a-fA-F]{6})`));
  if (!matched) throw new Error(`uni.scss 里找不到令牌 ${name}`);
  const hex = matched[1];
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/* ---------- 栅格化：把 24 网格上的线段/圆弧画进覆盖率画布 ---------- */
function createCanvas() {
  return new Float32Array(W * W);
}

function plot(canvas, x, y, coverage) {
  if (x < 0 || y < 0 || x >= W || y >= W) return;
  const index = y * W + x;
  if (coverage > canvas[index]) canvas[index] = coverage;
}

function drawSegment(canvas, x1, y1, x2, y2) {
  const sx = (x1 / 24) * W;
  const sy = (y1 / 24) * W;
  const ex = (x2 / 24) * W;
  const ey = (y2 / 24) * W;
  const dx = ex - sx;
  const dy = ey - sy;
  const lengthSq = dx * dx + dy * dy;

  const minX = Math.max(0, Math.floor(Math.min(sx, ex) - HALF - 1));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(sx, ex) + HALF + 1));
  const minY = Math.max(0, Math.floor(Math.min(sy, ey) - HALF - 1));
  const maxY = Math.min(W - 1, Math.ceil(Math.max(sy, ey) + HALF + 1));

  for (let py = minY; py <= maxY; py += 1) {
    for (let px = minX; px <= maxX; px += 1) {
      const cxp = px + 0.5;
      const cyp = py + 0.5;
      const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((cxp - sx) * dx + (cyp - sy) * dy) / lengthSq));
      const nx = sx + t * dx;
      const ny = sy + t * dy;
      const dist = Math.hypot(cxp - nx, cyp - ny);
      const coverage = Math.max(0, Math.min(1, HALF + 0.5 - dist));
      if (coverage > 0) plot(canvas, px, py, coverage);
    }
  }
}

function drawPath(canvas, points, close) {
  for (let i = 0; i < points.length - 1; i += 1) {
    drawSegment(canvas, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
  }
  if (close && points.length > 2) {
    const last = points[points.length - 1];
    drawSegment(canvas, last[0], last[1], points[0][0], points[0][1]);
  }
}

function drawArc(canvas, cx, cy, r, fromDeg, toDeg, steps = 64) {
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const angle = ((fromDeg + ((toDeg - fromDeg) * i) / steps) * Math.PI) / 180;
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  drawPath(canvas, points, false);
}

function drawCircle(canvas, cx, cy, r) {
  drawArc(canvas, cx, cy, r, 0, 360, 96);
}

/* ---------- 两个图标（24×24 网格，线性描边，对应 DESIGN.md §9） ---------- */
const SHAPES = {
  /** 首页：屋顶 + 两侧墙 + 门（线性，无填充） */
  home(canvas) {
    drawPath(canvas, [[3.6, 10.8], [12, 4.2], [20.4, 10.8]], false);
    drawPath(canvas, [[5.7, 9.9], [5.7, 20.2], [18.3, 20.2], [18.3, 9.9]], false);
    drawPath(canvas, [[9.7, 20.2], [9.7, 14.6], [14.3, 14.6], [14.3, 20.2]], false);
  },
  /** 我的：头（圆）+ 肩（上弧） */
  mine(canvas) {
    drawCircle(canvas, 12, 8.1, 3.5);
    drawArc(canvas, 12, 21.4, 7.5, 198, 342, 64);
  }
};

/* ---------- 下采样（超采样 → 抗锯齿） + 合成 RGBA ---------- */
function render(shape, color) {
  const canvas = createCanvas();
  SHAPES[shape](canvas);

  const rgba = Buffer.alloc(SIZE * SIZE * 4);
  const scale = SS * SS;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let sum = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          sum += canvas[(y * SS + sy) * W + (x * SS + sx)];
        }
      }
      const alpha = Math.max(0, Math.min(1, sum / scale));
      const offset = (y * SIZE + x) * 4;
      rgba[offset] = color[0];
      rgba[offset + 1] = color[1];
      rgba[offset + 2] = color[2];
      rgba[offset + 3] = Math.round(alpha * 255);
    }
  }
  return rgba;
}

/* ---------- 极简 PNG 编码（8bit RGBA，filter 0） ---------- */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(rgba, width, height) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0; // filter: none
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---------- 主流程 ---------- */
const inactive = tokenColor('$ds-ink-2');
const active = tokenColor('$ds-primary');

const TARGETS = [
  { file: 'home.png', shape: 'home', color: inactive, label: '首页（未选中）' },
  { file: 'home-active.png', shape: 'home', color: active, label: '首页（选中）' },
  { file: 'mine.png', shape: 'mine', color: inactive, label: '我的（未选中）' },
  { file: 'mine-active.png', shape: 'mine', color: active, label: '我的（选中）' }
];

const hex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/** 读回 png 的像素，统计非透明像素的颜色（用于自检） */
function inspect(file) {
  const buffer = readFileSync(file);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const idatParts = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') idatParts.push(buffer.slice(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idatParts));
  let opaque = 0;
  const colors = new Map();
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1) + 1;
    for (let x = 0; x < width; x += 1) {
      const index = rowStart + x * 4;
      const alpha = raw[index + 3];
      if (alpha < 200) continue;
      opaque += 1;
      const key = `${raw[index]},${raw[index + 1]},${raw[index + 2]}`;
      colors.set(key, (colors.get(key) || 0) + 1);
    }
  }
  const dominant = [...colors.entries()].sort((a, b) => b[1] - a[1])[0];
  return { width, height, opaque, dominant: dominant ? dominant[0] : '' };
}

if (!CHECK_ONLY && !existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

console.log('=== tabBar 图标生成（线性 24 网格 / stroke 1.6 / 颜色取自 uni.scss 令牌）===');
console.log(`未选中 = $ds-ink-2 ${hex(inactive)}｜选中 = $ds-primary ${hex(active)}｜尺寸 ${SIZE}×${SIZE}`);
console.log('');

let failures = 0;
TARGETS.forEach((target) => {
  const file = join(OUT_DIR, target.file);
  const rgba = render(target.shape, target.color);
  const png = encodePng(rgba, SIZE, SIZE);
  if (!CHECK_ONLY) writeFileSync(file, png);

  const info = inspect(file);
  const expected = `${target.color[0]},${target.color[1]},${target.color[2]}`;
  const ok = info.width === SIZE && info.height === SIZE && info.opaque > 0 && info.dominant === expected;
  if (!ok) failures += 1;
  console.log(
    `${ok ? '  ok  ' : ' FAIL '} ${target.label.padEnd(14, ' ')} ${target.file.padEnd(16, ' ')} ` +
      `${info.width}×${info.height}｜描边像素 ${info.opaque}｜主色 rgb(${info.dominant})｜期望 rgb(${expected})`
  );
});

console.log('');
if (failures) {
  console.log(`图标校验未通过（${failures} 项）。`);
  process.exit(1);
}
console.log(CHECK_ONLY ? '图标校验通过：4 张图标的尺寸与颜色都与 uni.scss 令牌一致。' : '已生成 4 张图标，并校验尺寸与颜色通过。');
