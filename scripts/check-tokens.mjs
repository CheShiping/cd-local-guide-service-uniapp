#!/usr/bin/env node
/**
 * 设计令牌静态校验（零依赖）
 *
 * 校验三件事：
 *   1. uni.scss 的 SCSS 变量必须"先定义后使用"（SCSS 顺序解析，引用未定义变量会直接编译失败）
 *      —— 定义行右侧的引用同样要检查，这是最容易踩的坑
 *   2. design/html/prototype.css 里 var(--x) 用到的自定义属性必须有定义
 *   3. DESIGN.md 中出现的十六进制色值必须在 uni.scss 里有对应令牌（防止规范与落地令牌脱钩）
 *
 * 用法：
 *   node scripts/check-tokens.mjs              # 校验真实文件
 *   node scripts/check-tokens.mjs --self-test  # 自检：用故意写坏的文件验证校验器真的会报错
 *
 * 退出码：0 = 通过；1 = 存在未定义引用、规范/令牌脱钩，或自检未通过
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const SCSS_VAR = /\$[A-Za-z][\w-]*[A-Za-z0-9]/g;

async function analyze(root) {
  const failures = [];
  const notes = [];
  const read = (relative) => readFile(path.join(root, relative), 'utf8');

  /* ---------- 1. uni.scss：变量定义顺序 ---------- */
  const scss = await read('uni.scss');
  const defined = new Set();
  let scssUses = 0;

  scss
    .replace(/\/\*[\s\S]*?\*\//g, '')     // 去掉块注释，避免把注释里的 $ds-* 当变量
    .split(/\r?\n/)
    .forEach((rawLine, index) => {
      const line = rawLine.replace(/\/\/.*$/, '');
      let rest = line;
      const definition = line.match(/^\s*(\$[A-Za-z][\w-]*[A-Za-z0-9])\s*:/);
      if (definition) {
        defined.add(definition[1]);
        rest = line.slice(definition[0].length);   // 定义行右侧也要查
      }
      for (const used of rest.match(SCSS_VAR) || []) {
        scssUses += 1;
        if (!defined.has(used)) {
          failures.push(`uni.scss 第 ${index + 1} 行引用了尚未定义的变量 ${used}`);
        }
      }
    });

  notes.push(`uni.scss：定义 ${defined.size} 个变量，检查 ${scssUses} 处引用`);

  /* ---------- 2. prototype.css：自定义属性 ---------- */
  const css = (await read('design/html/prototype.css')).replace(/\/\*[\s\S]*?\*\//g, '');
  const cssDefined = new Set();
  const cssUsed = new Set();

  for (const line of css.split(/\r?\n/)) {
    const withoutUsage = line.replace(/var\([^)]*\)/g, '');   // 先摘掉用法，兼容一行写多个定义
    for (const definition of withoutUsage.match(/(--[\w-]+)\s*:/g) || []) {
      cssDefined.add(definition.replace(/\s*:$/, ''));
    }
    for (const match of line.match(/var\(\s*(--[\w-]+)/g) || []) {
      cssUsed.add(match.replace(/var\(\s*/, ''));
    }
  }

  for (const name of [...cssUsed].filter((item) => !cssDefined.has(item))) {
    failures.push(`prototype.css 使用了未定义的 CSS 变量 ${name}`);
  }

  notes.push(`prototype.css：定义 ${cssDefined.size} 个自定义属性，使用 ${cssUsed.size} 个`);

  /* ---------- 3. DESIGN.md 色值与 uni.scss 令牌对齐 ---------- */
  const design = await read('DESIGN.md');
  const collect = (text) => new Set((text.match(/#[0-9A-Fa-f]{6}/g) || []).map((c) => c.toLowerCase()));
  const designColors = collect(design);
  const tokenColors = collect(scss);

  const unmapped = [...designColors].filter((color) => !tokenColors.has(color));
  for (const color of unmapped) {
    failures.push(`DESIGN.md 中的色值 ${color} 在 uni.scss 中没有对应令牌`);
  }

  notes.push(`DESIGN.md：${designColors.size} 个色值，其中 ${unmapped.length} 个未落到 uni.scss`);

  return { failures, notes };
}

/* ---------- 自检：证明校验器不是空门禁 ---------- */
async function selfTest() {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'token-selftest-'));
  const problems = [];

  try {
    await mkdir(path.join(temporaryRoot, 'design', 'html'), { recursive: true });

    // 故意写坏：
    //  - uni.scss：先使用后定义
    //  - prototype.css：用了未定义的 --missing
    //  - DESIGN.md：出现 uni.scss 里没有的色值
    await writeFile(
      path.join(temporaryRoot, 'uni.scss'),
      "$uni-color-primary: $ds-primary;\n$ds-primary: #2f6b5e;\n",
      'utf8'
    );
    await writeFile(
      path.join(temporaryRoot, 'design', 'html', 'prototype.css'),
      '.a { width: var(--missing); }\n',
      'utf8'
    );
    await writeFile(path.join(temporaryRoot, 'DESIGN.md'), '主色 #123456\n', 'utf8');

    const { failures } = await analyze(temporaryRoot);

    if (failures.length !== 3) {
      problems.push(`预期检出 3 个问题，实际 ${failures.length} 个：${failures.join(' | ')}`);
    }
    if (!failures.some((item) => item.includes('尚未定义的变量 $ds-primary'))) {
      problems.push('未检出「先使用后定义」的 SCSS 变量');
    }
    if (!failures.some((item) => item.includes('--missing'))) {
      problems.push('未检出未定义的 CSS 自定义属性');
    }
    if (!failures.some((item) => item.includes('#123456'))) {
      problems.push('未检出 DESIGN.md 与 uni.scss 的色值脱钩');
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }

  console.log('=== 令牌校验自检 ===');
  if (problems.length) {
    for (const problem of problems) console.log(`  x ${problem}`);
    console.log('\n自检未通过：校验器可能形同虚设。');
    return 1;
  }

  console.log('  通过：三类问题都能被检出（SCSS 顺序 / CSS 属性 / 色值脱钩）');
  return 0;
}

if (process.argv.includes('--self-test')) {
  process.exit(await selfTest());
}

const root = path.resolve(process.env.HARNESS_ROOT || process.cwd());
const { failures, notes } = await analyze(root);

console.log('=== 设计令牌校验 ===');
for (const note of notes) console.log(`  ${note}`);

if (failures.length) {
  console.log(`\n失败（${failures.length}）：`);
  for (const failure of failures) console.log(`  x ${failure}`);
  console.log('\n令牌校验未通过。SCSS 顺序错误会直接导致构建失败，必须先修复。');
  process.exit(1);
}

console.log('\n设计令牌校验通过。');
