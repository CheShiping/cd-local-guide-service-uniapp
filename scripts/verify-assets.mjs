#!/usr/bin/env node
/**
 * 资产保真校验（harness 验证门禁，仅依赖 Node 内置模块，无需 npm install）
 *
 * 用法：
 *   node scripts/verify-assets.mjs            # 校验原有资产是否仍在、是否被改动，并检查路由引用一致性
 *   node scripts/verify-assets.mjs --update   # 刷新 docs/legacy-assets.json 中的 sha256（确认为有意改动后再执行）
 *
 * 失败（退出码 1）：
 *   - docs/legacy-assets.json 中登记的资产缺失
 *   - 已登记 sha256 的资产内容被修改
 *   - pages.json 注册的页面文件不存在，或 tabBar 图标缺失
 *
 * 仅告警（退出码不受影响，记录在 docs/legacy-assets.md「已知缺口」）：
 *   - /static 下被引用但缺失的图片
 *   - 引用了未在 pages.json 注册的页面
 */

import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.env.HARNESS_ROOT || process.cwd());
const manifestPath = path.join(root, 'docs', 'legacy-assets.json');
const update = process.argv.includes('--update');

const toRel = (target) => path.relative(root, target).split(path.sep).join('/');
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const exists = async (target) => {
  try {
    await readFile(target);
    return true;
  } catch {
    return false;
  }
};

const failures = [];
const warnings = [];

/** 读取 JSON，格式损坏时给出可操作的提示而不是抛栈 */
async function readJson(file, label) {
  const raw = await readFile(file, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.log(`\n失败（1）：${label} 不是合法 JSON：${error.message}`);
    console.log(`  文件：${toRel(file)}`);
    console.log('\n资产保真校验未通过。请先修复 JSON 语法（常见原因：多写了闭合括号、漏了逗号），再重新运行。');
    process.exit(1);
  }
}

async function collectSourceFiles(dir) {
  const files = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(full)));
    } else if (/\.(vue|js)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

async function verifyLegacyAssets() {
  const manifest = await readJson(manifestPath, 'docs/legacy-assets.json（资产台账）');
  let refreshed = 0;

  for (const asset of manifest.assets) {
    const full = path.join(root, asset.path);
    if (!(await exists(full))) {
      if (!update) {
        failures.push(`资产缺失：${asset.path}（${asset.purpose}）`);
      }
      continue;
    }

    const hash = sha256(await readFile(full));

    if (update) {
      if (asset.sha256 !== hash) {
        asset.sha256 = hash;
        refreshed += 1;
      }
      continue;
    }

    if (!asset.sha256) {
      warnings.push(`未登记哈希：${asset.path}`);
    } else if (asset.sha256 !== hash) {
      failures.push(
        `资产被修改：${asset.path}（若为有意重构，请先更新 docs/legacy-assets.json，或在清单中标记 superseded 后再执行 --update）`
      );
    }
  }

  if (update) {
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(`已刷新 ${refreshed} 条资产哈希 -> docs/legacy-assets.json`);
    return;
  }

  console.log(`[保真校验] 登记资产 ${manifest.assets.length} 条`);
}

async function verifyRoutes() {
  const pagesJson = await readJson(path.join(root, 'pages.json'), 'pages.json（页面注册）');
  const registered = new Set();

  for (const page of pagesJson.pages || []) {
    registered.add(`/${page.path}`);
    if (!(await exists(path.join(root, `${page.path}.vue`)))) {
      failures.push(`pages.json 注册了不存在的页面：${page.path}`);
    }
  }

  for (const item of pagesJson.tabBar?.list || []) {
    for (const key of ['iconPath', 'selectedIconPath']) {
      const icon = item[key];
      if (icon && !(await exists(path.join(root, icon)))) {
        failures.push(`tabBar 图标缺失：${icon}`);
      }
    }
  }

  console.log(`[路由校验] pages.json 注册页面 ${registered.size} 个`);

  const routePattern = /url:\s*[`'"]([^`'"]+)[`'"]/g;
  const staticPattern = /['"`](\/static\/[^'"`]+)['"`]/g;
  const sources = [...(await collectSourceFiles(path.join(root, 'pages'))), path.join(root, 'App.vue')];
  const reported = new Set();

  const report = (key, message, level = 'fail') => {
    if (reported.has(key) || level === 'ok') return;
    reported.add(key);
    (level === 'fail' ? failures : warnings).push(message);
  };

  for (const file of sources) {
    const code = await readFile(file, 'utf8');

    for (const match of code.matchAll(routePattern)) {
      const raw = match[1];
      if (!raw.startsWith('/pages')) continue;
      const target = raw.split('?')[0].split('${')[0];
      if (raw.includes('${')) {
        report(
          `route:${target}`,
          `动态路由需人工确认：${toRel(file)} -> ${raw}`,
          registered.has(target) ? 'ok' : 'warn'
        );
        continue;
      }
      if (!registered.has(target)) {
        report(`route:${target}`, `引用了未注册页面：${target}（来源 ${toRel(file)}）`, 'warn');
      }
    }

    for (const match of code.matchAll(staticPattern)) {
      const asset = match[1];
      if (await exists(path.join(root, asset))) continue;
      report(`static:${asset}`, `引用了缺失的静态资源：${asset}（来源 ${toRel(file)}）`, 'warn');
    }
  }
}

console.log('=== 资产保真校验 ===');
console.log(`根目录：${root}`);

await verifyLegacyAssets();

if (!update) {
  await verifyRoutes();
}

if (warnings.length) {
  console.log(`\n告警（${warnings.length}）：`);
  for (const warning of warnings) console.log(`  ! ${warning}`);
}

if (failures.length) {
  console.log(`\n失败（${failures.length}）：`);
  for (const failure of failures) console.log(`  x ${failure}`);
  console.log('\n资产保真校验未通过。禁止继续新增功能，先修复上述问题。');
  process.exit(1);
}

if (!update) {
  console.log('\n资产保真校验通过。');
  console.log('提示：原有代码快照见 git tag legacy-peiwan-baseline-v1；资产用途与复用策略见 docs/legacy-assets.md。');
}
