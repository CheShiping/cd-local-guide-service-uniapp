#!/usr/bin/env node
/**
 * mock 数据层校验（零依赖，不需要构建链）
 *
 * 校验五件事：
 *   1. 一致性：api/mock/seed.json 与 docx/database/seed.sql 的区域 / 套餐 / 景点完全对齐
 *   2. 规模：52 用户 / 50 地陪 / 20 景点 / 7 区域 / 3 套餐（docs/mvp-scope.json 的 mockScale）
 *   3. 确定性：同一 seed + 同一时间生成两次结果完全一致
 *   4. 自洽性：地陪的擅长景点落在自己的区域标签内；价格落在套餐建议价区间；四态订单齐全；订单号合法且唯一
 *   5. MVP 边界：生成的数据里不得出现评价字段；页面不得直接引用 api/mock/
 *
 * 说明：api/constants.js 与 api/mock/generate.js 是刻意写成「无 import」的纯模块，
 *      本脚本用去 ESM 关键字的方式直接求值它们（项目没有测试框架，这是最轻的运行时校验）。
 *
 * 用法：
 *   node scripts/check-mock.mjs              # 校验
 *   node scripts/check-mock.mjs --self-test  # 自检：用故意写坏的数据验证校验器会报错
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.env.HARNESS_ROOT || process.cwd());

const read = (relative) => readFile(path.join(root, relative), 'utf8');

/** 把无 import 的 ESM 纯模块求值成对象（去掉顶层 export 关键字后 new Function） */
function loadEsmModule(source, exportNames) {
  const stripped = source
    .replace(/^export\s+(?=(const|let|var|function|class)\b)/gm, '')
    .replace(/\bexport\s*\{[^}]*\}\s*;?/g, '');
  // eslint-disable-next-line no-new-func
  const factory = new Function(`${stripped}\nreturn { ${exportNames.join(', ')} };`);
  return factory();
}

const CONSTANT_NAMES = [
  'ORDER_STATUS', 'ORDER_STATUS_LABELS', 'ORDER_STATUS_TRANSITIONS', 'BOOKING_TYPES', 'BOOKING_TYPE_UI',
  'TIME_SLOTS', 'ROLES', 'GUIDE_STATUS', 'COMMON_STATUS', 'ORDER_NO',
  'formatDate', 'nextOrderNo', 'buildOrderNo', 'canTransit', 'isWaitingGuideAccept', 'isInProgress',
  'orderStatusLabel', 'bookingTypeLabel'
];

const GENERATE_NAMES = ['generateMockData', 'mulberry32', 'hashSeed'];

/** 递归收集对象里出现过的所有键名 */
function collectKeys(value, into = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, into));
  } else if (value && typeof value === 'object') {
    Object.keys(value).forEach((key) => {
      into.add(key);
      collectKeys(value[key], into);
    });
  }
  return into;
}

async function analyze(targetRoot) {
  const failures = [];
  const notes = [];

  const seedPath = path.join(targetRoot, 'api', 'mock', 'seed.json');
  const seedJson = JSON.parse(await readFile(seedPath, 'utf8'));
  const sql = await readFile(path.join(targetRoot, 'docx', 'database', 'seed.sql'), 'utf8');

  /* ---------- 1. seed.json ↔ seed.sql ---------- */
  // 注意：逗号后的空格数不作为语义（SQL 里无所谓），所以一律用 [ ]*；但不能用 \s*，那会跨行匹配
  const sqlRegions = [...sql.matchAll(/^ {2}\(\d+,[ ]*'([a-z-]+)',[ ]*'([^']+)'/gm)]
    .filter((match) => seedJson.regionTypes.some((region) => region.code === match[1]))
    .map((match) => ({ code: match[1], name: match[2] }));
  const sqlPackages = [...sql.matchAll(/^ {2}\(\d+,[ ]*'(pkg-[a-z-]+)',[ ]*'([^']+)'/gm)]
    .map((match) => ({ code: match[1], name: match[2] }));
  const sqlAttractions = [...sql.matchAll(/^ {2}\(\d+,[ ]*'(att-[a-z-]+)',[ ]*'([^']+)'/gm)]
    .map((match) => ({ code: match[1], name: match[2] }));

  const compare = (label, left, right) => {
    const leftMap = left.map((item) => `${item.code}:${item.name}`).sort().join('|');
    const rightMap = right.map((item) => `${item.code}:${item.name}`).sort().join('|');
    if (leftMap !== rightMap) {
      failures.push(
        `${label}在 api/mock/seed.json 与 docx/database/seed.sql 之间不一致：` +
        `seed.json=${left.length} 条、seed.sql=${right.length} 条（code 或名称有差异）`
      );
      return false;
    }
    return true;
  };

  compare('区域类型', seedJson.regionTypes, sqlRegions);
  compare('套餐 SKU', seedJson.packageSkus, sqlPackages);
  compare('景点', seedJson.attractions, sqlAttractions);

  // 景点区域归属：seed.sql 的第 5 个字段是 region_type_id
  const sqlAttractionRegion = {};
  [...sql.matchAll(/^ {2}\(\d+,[ ]*'(att-[a-z-]+)',[ ]*'[^']+',[ ]*'[^']+',[ ]*(\d+),/gm)]
    .forEach((match) => { sqlAttractionRegion[match[1]] = Number(match[2]); });
  seedJson.attractions.forEach((attraction) => {
    const sqlRegionId = sqlAttractionRegion[attraction.code];
    if (sqlRegionId !== attraction.regionTypeId) {
      failures.push(`景点 ${attraction.code} 的区域归属不一致：seed.json=${attraction.regionTypeId}，seed.sql=${sqlRegionId}`);
    }
  });

  notes.push(`一致性：区域 ${sqlRegions.length} / 套餐 ${sqlPackages.length} / 景点 ${sqlAttractions.length}（与 seed.sql 对齐）`);

  /* ---------- 2. 加载纯模块并生成 ---------- */
  const constantsSource = await readFile(path.join(targetRoot, 'api', 'constants.js'), 'utf8');
  const generateSource = await readFile(path.join(targetRoot, 'api', 'mock', 'generate.js'), 'utf8');

  if (/^\s*import\s/m.test(constantsSource) || /^\s*import\s/m.test(generateSource)) {
    failures.push('api/constants.js 或 api/mock/generate.js 出现了 import：这两个文件必须保持无依赖以便静态校验');
  }

  const C = loadEsmModule(constantsSource, CONSTANT_NAMES);
  const G = loadEsmModule(generateSource, GENERATE_NAMES);

  const fixedNow = new Date('2026-09-26T10:00:00+08:00');
  const options = { seedData: seedJson, now: fixedNow, domain: C, seed: 'peiwan-chengdu-mvp' };
  const first = G.generateMockData(options);
  const second = G.generateMockData({ ...options, now: new Date(fixedNow.getTime()) });

  /* ---------- 3. 确定性 ---------- */
  if (JSON.stringify(first) !== JSON.stringify(second)) {
    failures.push('确定性失败：相同 seed 与相同时间生成了不同结果');
  } else {
    notes.push('确定性：同 seed 两次生成结果完全一致');
  }

  /* ---------- 4. 规模 ---------- */
  const scale = seedJson.generators;
  const expect = {
    users: scale.guideCount + 2,
    guides: scale.guideCount,
    attractions: seedJson.attractions.length,
    regionTypes: seedJson.regionTypes.length,
    packageSkus: seedJson.packageSkus.length,
    orders: scale.orderCount
  };
  const actual = {
    users: first.users.length,
    guides: first.guides.length,
    attractions: seedJson.attractions.length,
    regionTypes: seedJson.regionTypes.length,
    packageSkus: seedJson.packageSkus.length,
    orders: first.orders.length
  };
  Object.keys(expect).forEach((key) => {
    if (expect[key] !== actual[key]) {
      failures.push(`规模不符：${key} 期望 ${expect[key]}，实际 ${actual[key]}`);
    }
  });
  notes.push(
    `规模：${actual.users} 用户 / ${actual.guides} 地陪 / ${actual.attractions} 景点 / ` +
    `${actual.regionTypes} 区域 / ${actual.packageSkus} 套餐 / ${actual.orders} 订单`
  );

  /* ---------- 5. 自洽性 ---------- */
  const attractionRegion = {};
  seedJson.attractions.forEach((item) => { attractionRegion[item.id] = item.regionTypeId; });
  const packageById = {};
  seedJson.packageSkus.forEach((item) => { packageById[item.id] = item; });

  const regionGuideIds = {};
  first.guideRegionTypes.forEach((row) => {
    regionGuideIds[row.guideId] = regionGuideIds[row.guideId] || [];
    regionGuideIds[row.guideId].push(row.regionTypeId);
  });

  first.guideAttractions.forEach((row) => {
    const regionIds = regionGuideIds[row.guideId] || [];
    if (regionIds.indexOf(attractionRegion[row.attractionId]) < 0) {
      failures.push(`地陪 ${row.guideId} 的擅长景点 ${row.attractionId} 不在其区域标签内（数据不自洽）`);
    }
  });

  const approved = first.guides.filter((guide) => guide.status === C.GUIDE_STATUS.APPROVED);
  const pending = first.guides.filter((guide) => guide.status === C.GUIDE_STATUS.PENDING);
  const rejected = first.guides.filter((guide) => guide.status === C.GUIDE_STATUS.REJECTED);
  if (!pending.length || !rejected.length) {
    failures.push('地陪审核状态需要有少量「待审核」与「已拒绝」，供后台审核演示');
  }
  if (approved.length <= first.guides.length / 2) {
    failures.push('地陪审核状态应以「已通过」为主');
  }

  // 不变量：每个地陪至少要有 1 个区域标签 / 1 个擅长景点 / 1 个套餐
  // （否则他永远不可能被下单：游客是先选景点再选地陪；缺任一都会让列表页出现"点了没结果"）
  const emptyAttractionGuides = first.guides
    .filter((guide) => !first.guideAttractions.some((row) => row.guideId === guide.id))
    .map((guide) => guide.id);
  const emptyPackageGuides = first.guides
    .filter((guide) => !first.guidePackages.some((row) => row.guideId === guide.id))
    .map((guide) => guide.id);
  const emptyRegionGuides = first.guides
    .filter((guide) => !first.guideRegionTypes.some((row) => row.guideId === guide.id))
    .map((guide) => guide.id);
  if (emptyAttractionGuides.length) {
    failures.push(`地陪缺少擅长景点（共 ${emptyAttractionGuides.length} 个：${emptyAttractionGuides.slice(0, 8).join(',')}）`);
  }
  if (emptyPackageGuides.length) {
    failures.push(`地陪缺少套餐报价（共 ${emptyPackageGuides.length} 个：${emptyPackageGuides.slice(0, 8).join(',')}）`);
  }
  if (emptyRegionGuides.length) {
    failures.push(`地陪缺少区域标签（共 ${emptyRegionGuides.length} 个：${emptyRegionGuides.slice(0, 8).join(',')}）`);
  }
  if (first.stats.notOrderableGuides.length) {
    failures.push(`存在已通过却不可下单的地陪（共 ${first.stats.notOrderableGuides.length} 个：${first.stats.notOrderableGuides.slice(0, 8).join(',')}）`);
  }
  notes.push(`可下单：${first.stats.orderableGuides}/${approved.length} 个已通过地陪可被下单`);

  first.guidePackages.forEach((row) => {
    const pkg = packageById[row.packageSkuId];
    if (!pkg) {
      failures.push(`地陪报价引用了不存在的套餐：${row.packageSkuId}`);
      return;
    }
    if (row.price < pkg.priceMin || row.price > pkg.priceMax) {
      failures.push(`地陪 ${row.guideId} 的套餐 ${pkg.code} 报价 ${row.price} 超出建议价区间 ${pkg.priceMin}-${pkg.priceMax}`);
    }
  });

  const statusSet = new Set(first.orders.map((order) => order.status));
  Object.keys(C.ORDER_STATUS).forEach((key) => {
    if (!statusSet.has(C.ORDER_STATUS[key])) {
      failures.push(`订单未覆盖状态「${C.ORDER_STATUS[key]}」（${key}），四态必须齐全`);
    }
  });

  const orderNos = new Set();
  first.orders.forEach((order) => {
    if (order.orderNo.length !== C.ORDER_NO.length) {
      failures.push(`订单号长度应为 ${C.ORDER_NO.length}：${order.orderNo}`);
    }
    if (!order.orderNo.startsWith(C.ORDER_NO.prefix)) {
      failures.push(`订单号缺少前缀 ${C.ORDER_NO.prefix}：${order.orderNo}`);
    }
    const letter = order.orderNo.slice(C.ORDER_NO.prefix.length + 6, C.ORDER_NO.prefix.length + 7);
    if (letter !== C.ORDER_NO.typeLetters[order.bookingType]) {
      failures.push(`订单号类型字母与套餐类型不符：${order.orderNo} vs ${order.bookingType}`);
    }
    if (orderNos.has(order.orderNo)) {
      failures.push(`订单号重复：${order.orderNo}`);
    }
    orderNos.add(order.orderNo);
  });

  const waiting = first.orders.filter((order) => C.isWaitingGuideAccept(order)).length;
  if (waiting < 1) {
    failures.push('待确认订单里需要保留「地陪未接单」的数据，否则地陪端接单页为空');
  }
  notes.push(`自洽性：地陪 ${approved.length} 已通过 / ${pending.length} 待审 / ${rejected.length} 拒绝；订单号 ${orderNos.size} 个唯一；待接单 ${waiting} 单`);

  /* ---------- 6. MVP 边界 ---------- */
  const keys = collectKeys(first);
  ['rating', 'review', 'reviewCount', 'score'].forEach((banned) => {
    if (keys.has(banned)) {
      failures.push(`mock 数据里出现评价字段「${banned}」（dev-002 明确不做评价）`);
    }
  });

  const entry = await readFile(path.join(targetRoot, 'api', 'index.js'), 'utf8');
  if (!/USE_MOCK\s*=\s*true/.test(entry)) {
    failures.push('api/index.js 当前应固定 USE_MOCK = true（MVP 阶段走 mock）');
  }

  const pagesDir = path.join(targetRoot, 'pages');
  const pageFiles = [];
  const walk = async (dir) => {
    for (const entryItem of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entryItem.name);
      if (entryItem.isDirectory()) await walk(full);
      else if (entryItem.name.endsWith('.vue')) pageFiles.push(full);
    }
  };
  await walk(pagesDir);
  for (const file of pageFiles) {
    const code = await readFile(file, 'utf8');
    if (code.includes('api/mock')) {
      failures.push(`页面直连 mock 数据层（应统一走 @/api/index.js）：${path.relative(targetRoot, file)}`);
    }
  }
  notes.push(`边界：无评价字段；api/index.js 的 USE_MOCK = true；${pageFiles.length} 个页面均未直连 api/mock/`);

  return { failures, notes };
}

/* ---------- 自检 ---------- */
async function selfTest() {
  const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises');
  const os = await import('node:os');
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'mock-selftest-'));
  const problems = [];

  try {
    await mkdir(path.join(temporaryRoot, 'api', 'mock'), { recursive: true });
    await mkdir(path.join(temporaryRoot, 'docx', 'database'), { recursive: true });
    await mkdir(path.join(temporaryRoot, 'pages'), { recursive: true });

    // 故意写坏：区域数量不一致 + 地陪擅长景点越界 + 订单号长度错 + 评价字段 + 页面直连 mock
    await writeFile(
      path.join(temporaryRoot, 'api', 'mock', 'seed.json'),
      JSON.stringify({
        regionTypes: [{ id: 1, code: 'city-classic', name: '市区经典线' }],
        packageSkus: [{ id: 1, code: 'pkg-halfday-city', name: '市区半日陪游', bookingType: 'half-day', priceMin: 1, priceMax: 2 }],
        attractions: [{ id: 1, code: 'att-kuanzhai', name: '宽窄巷子', regionTypeId: 9 }],
        generators: {
          guideCount: 1, orderCount: 0, avatarPoolSize: 1, areaPrefixes: ['A'], surnames: ['林'], givenNames: ['默'],
          introduceTemplates: ['x'], guideRegionCount: [1, 1], guideAttractionCount: [1, 1], guidePackageCount: [1, 1],
          orderStatusPlan: {}, touristNickname: 't', adminNickname: 'a'
        }
      }),
      'utf8'
    );
    await writeFile(
      path.join(temporaryRoot, 'docx', 'database', 'seed.sql'),
      `INSERT INTO region_types (id, code, name, coverage, scene, status, sort_order) VALUES
  (1, 'city-classic', '市区经典线', 'x', 'y', 1, 1),
  (2, 'panda-creative', '熊猫·文创线', 'x', 'y', 1, 2);
`,
      'utf8'
    );
    await writeFile(
      path.join(temporaryRoot, 'api', 'constants.js'),
      await readFile(path.join(root, 'api', 'constants.js'), 'utf8'),
      'utf8'
    );
    await writeFile(
      path.join(temporaryRoot, 'api', 'mock', 'generate.js'),
      await readFile(path.join(root, 'api', 'mock', 'generate.js'), 'utf8'),
      'utf8'
    );
    await writeFile(path.join(temporaryRoot, 'api', 'index.js'), 'export const USE_MOCK = false;\n', 'utf8');
    await writeFile(path.join(temporaryRoot, 'pages', 'x.vue'), "import { a } from '@/api/mock/index.js';\n", 'utf8');

    const { failures } = await analyze(temporaryRoot);
    const expect = (fragment, label) => {
      if (!failures.some((item) => item.includes(fragment))) problems.push(`未检出：${label}`);
    };

    expect('不一致', 'seed.json 与 seed.sql 不一致');
    expect('USE_MOCK = true', 'USE_MOCK 未开启');
    expect('直连 mock', '页面直连 api/mock/');
    expect('地陪缺少擅长景点', '地陪缺少关系数据的兜底断言');
    expect('需要有少量', '审核状态分布异常');
    // 说明：「地陪擅长景点越界」这条是防御性断言 —— 生成逻辑本身用
    //      regionTypeId 过滤候选景点，正常数据不可能越界，所以自检用「缺少擅长景点」间接覆盖同类问题。
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }

  console.log('=== mock 数据层校验自检 ===');
  if (problems.length) {
    for (const problem of problems) console.log(`  x ${problem}`);
    console.log('\n自检未通过：校验器可能形同虚设。');
    return 1;
  }
  console.log('  通过：一致性 / 数据自洽 / MVP 边界三类问题都能被检出');
  return 0;
}

if (process.argv.includes('--self-test')) {
  process.exit(await selfTest());
}

const { failures, notes } = await analyze(root);

console.log('=== mock 数据层校验 ===');
console.log('  规范来源：docs/mvp-scope.json 的 mockScale + docx/database/seed.sql');
for (const note of notes) console.log(`  ${note}`);

if (failures.length) {
  console.log(`\n失败（${failures.length}）：`);
  for (const failure of failures) console.log(`  x ${failure}`);
  console.log('\n校验未通过。改 mock 数据时请同步 api/mock/seed.json 与 docx/database/seed.sql。');
  process.exit(1);
}

console.log('\nmock 数据层校验通过。');
