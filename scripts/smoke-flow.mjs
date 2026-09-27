#!/usr/bin/env node
/**
 * 端到端闭环校验（运行 mock 数据层，零依赖）
 *
 * 为什么需要它：另外 6 个门禁都是静态的（读文件、比对哈希、正则解析），
 * 它们能证明「结构对」，但证明不了「跑得通」。2026-09-26 本轮就靠这个脚本
 * 抓到两个阻断 MVP 闭环的运行时 bug（仓库缺字典表、档期生成恒空），
 * 而两个 bug 都通过了全部静态门禁。
 *
 * 做什么：把 api/ 复制到临时目录（该目录声明 type: module，让 node 能直接
 * import 项目里的 ESM 源码），然后真实跑一遍：
 *   游客选景点 → 选地陪 → 下单 → 地陪接单 → 平台确认 → 地陪完成服务 → 游客回看
 * 并验证越权流转与非法参数会被拒。
 *
 * 用法：
 *   node scripts/smoke-flow.mjs              # 正常校验
 *   node scripts/smoke-flow.mjs --self-test  # 自检：故意破坏数据层，必须失败
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SELF_TEST = process.argv.indexOf('--self-test') >= 0;

const results = [];
let failures = 0;

function check(name, cond, detail = '') {
  const ok = !!cond;
  if (!ok) failures += 1;
  results.push(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '  —— ' + detail : ''}`);
  return ok;
}

/** 准备临时可执行副本（node 需要 .js 走 ESM + seed.json 带断言） */
function prepare() {
  const dir = mkdtempSync(join(tmpdir(), 'peiwan-smoke-'));
  cpSync(join(ROOT, 'api'), join(dir, 'api'), { recursive: true });
  /* 页面用的横向页签工具是纯函数，也复制进来断言（它不依赖 uni，可在 node 里直接跑） */
  cpSync(join(ROOT, 'utils', 'hscroll.js'), join(dir, 'hscroll.js'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }, null, 2));

  const mockFile = join(dir, 'api', 'mock', 'index.js');
  writeFileSync(
    mockFile,
    readFileSync(mockFile, 'utf8').replace("from './seed.json'", "from './seed.json' with { type: 'json' }")
  );

  if (SELF_TEST) {
    // 自检：抽掉字典表，闭环必须跑不起来（证明门禁不是空壳）
    const genFile = join(dir, 'api', 'mock', 'generate.js');
    writeFileSync(genFile, readFileSync(genFile, 'utf8').replace('    regionTypes,\n', ''));
  }
  return dir;
}

const dir = prepare();

try {
  const api = await import(pathToFileURL(join(dir, 'api', 'index.js')).href);
  const { centerScrollLeft, swipeStep } = await import(pathToFileURL(join(dir, 'hscroll.js')).href);
  const {
    USE_MOCK,
    ROLES,
    ORDER_STATUS,
    BOOKING_TYPES,
    switchMockRole,
    RegionApi,
    AttractionApi,
    PackageApi,
    GuideApi,
    OrderApi,
    UserApi
  } = api;

  /* ---------- 0. 前置：数据层导出面必须完整（缺模块时页面看到的是一句 cryptic 的 undefined 报错） ---------- */
  const moduleNames = ['RegionApi', 'AttractionApi', 'PackageApi', 'GuideApi', 'OrderApi', 'UserApi'];
  check(
    '数据层导出 6 个业务模块',
    moduleNames.every((name) => !!api[name] && typeof api[name] === 'object'),
    moduleNames.filter((name) => !api[name]).join(', ') || '全部存在'
  );
  check('数据层版本戳存在', typeof api.DATA_LAYER_VERSION === 'string' && !!api.DATA_LAYER_VERSION, api.DATA_LAYER_VERSION);
  check('USE_MOCK 为 true（MVP 走 mock）', USE_MOCK === true);

  /* ---------- 0b. 横向页签行（utils/hscroll.js）的纯计算：激活项居中 + 横滑方向 ---------- */
  const box = { containerWidth: 375, contentWidth: 900 }; /* 可滚距离 = 900 - 375 = 525 */
  const centerFirst = centerScrollLeft({ ...box, scrollLeft: 0, itemLeft: 16, itemWidth: 60 });
  const centerMiddle = centerScrollLeft({ ...box, scrollLeft: 0, itemLeft: 400, itemWidth: 60 });
  const centerLast = centerScrollLeft({ ...box, scrollLeft: 0, itemLeft: 800, itemWidth: 60 });
  const centerKeep = centerScrollLeft({ ...box, scrollLeft: 243, itemLeft: 157, itemWidth: 60 });
  const centerNarrow = centerScrollLeft({ containerWidth: 375, contentWidth: 300, itemLeft: 10, itemWidth: 60 });

  check('居中：首项夹紧到 0（不出现负滚动）', centerFirst === 0, String(centerFirst));
  check('居中：中间项落在可视区中心', centerMiddle === 243, String(centerMiddle));
  check('居中：末项夹紧到最大可滚距离', centerLast === 525, String(centerLast));
  check('居中：已在中间时不再滚动', centerKeep === 243, String(centerKeep));
  check('居中：内容比容器窄时归 0', centerNarrow === 0, String(centerNarrow));

  check('横滑：左滑 → 下一项', swipeStep({ dx: -80, dy: 10 }) === 1);
  check('横滑：右滑 → 上一项', swipeStep({ dx: 80, dy: -10 }) === -1);
  check('横滑：位移太小不切换', swipeStep({ dx: -30, dy: 0 }) === 0);
  check('横滑：纵向为主时不切换（不抢列表滚动）', swipeStep({ dx: -70, dy: 80 }) === 0);
  check('横滑：斜滑但横向明显 → 切换', swipeStep({ dx: -120, dy: 40 }) === 1);

  /* ---------- 1. 前置：确定「地陪视角」是哪一位（mock 按已通过的第一位地陪切换） ---------- */
  const guideUser = await switchMockRole(ROLES.GUIDE);
  const allGuides = await GuideApi.getGuideList({ pageNo: 1, pageSize: 50 });
  const myGuide = allGuides.list.find((item) => item.userId === guideUser.id);
  check('mock 能切到地陪身份并找到对应地陪档案', !!myGuide, myGuide ? `${myGuide.nickname}（id=${myGuide.id}）` : '未找到');

  /* ---------- 1. 游客端：选景点 → 选地陪 → 选日期 → 下单 ---------- */
  switchMockRole(ROLES.TOURIST);

  const regions = await RegionApi.getRegionList();
  check('区域字典返回启用且有景点的区域', regions.length > 0, `${regions.length} 类`);

  const page1 = await AttractionApi.getAttractionList({ pageNo: 1, pageSize: 10 });
  const page2 = await AttractionApi.getAttractionList({ pageNo: 2, pageSize: 10 });
  check('景点分页（20 条 → 2 页）', page1.list.length === 10 && page2.list.length === 10, `total=${page1.total}`);
  check('景点卡带封面与可约地陪数', !!page1.list[0].coverUrl && typeof page1.list[0].guideCount === 'number');

  const attraction = page1.list[0];
  const guides = await GuideApi.getGuideList({ pageNo: 1, pageSize: 10, attractionId: attraction.id });
  check('地陪列表按景点过滤', guides.list.length > 0, `${attraction.name} → ${guides.total} 位`);
  check(
    '地陪头像取自本地素材（/static/guide/）',
    guides.list.every((item) => String(item.avatarUrl).indexOf('/static/guide/') === 0),
    guides.list[0].avatarUrl
  );

  const detail = await GuideApi.getGuideDetail(myGuide.id);
  check('详情返回擅长景点名称', (detail.attractions || []).length > 0, (detail.attractions || []).map((a) => a.name).join(' / '));
  check('详情返回套餐与起价', (detail.packages || []).length > 0 && detail.priceFrom > 0, `起价 ¥${detail.priceFrom}`);

  const pkg = detail.packages[0];
  const dates = await GuideApi.getGuideAvailableDates(myGuide.id, { days: 14 });
  check('可约日期不为空（否则游客无法下单）', dates.length > 0, `${dates.length} 天可约`);
  const date = dates.find((item) => (item.bookingTypes || []).indexOf(pkg.bookingType) >= 0);
  check('可约日期含所选套餐类型', !!date, `bookingType=${pkg.bookingType}`);

  // 订单必须落在「地陪擅长」的景点上，否则会被接口校验拦下
  const orderAttractionId = (detail.attractionIds || [])[0] || attraction.id;
  const payload = {
    guideId: myGuide.id,
    attractionId: orderAttractionId,
    packageSkuId: pkg.packageSkuId,
    appointDate: date ? date.appointDate : '2099-01-01',
    peopleCount: 2,
    remark: '闭环冒烟测试'
  };
  if (pkg.bookingType === BOOKING_TYPES.HALF_DAY) payload.timeSlot = 'morning';
  if (pkg.bookingType === BOOKING_TYPES.HOURLY) payload.hours = 3;

  const order = await OrderApi.createOrder(payload);
  check('下单成功且状态为待确认', order.status === ORDER_STATUS.PENDING_CONFIRM, `${order.orderNo} / ¥${order.amount}`);
  check('订单写入景点·套餐·地陪快照', !!order.attractionName && !!order.packageName && !!order.guideNickname);
  check('订单号 13 位且符合规则', order.orderNo.length === 13 && /^CD\d{6}[ABC]\d{4}$/.test(order.orderNo), order.orderNo);
  check('游客端「待确认」页签能看到这单', (await OrderApi.getMyOrders({ pageNo: 1, pageSize: 50, status: ORDER_STATUS.PENDING_CONFIRM })).list.some((o) => o.id === order.id));

  /* ---------- 2. 地陪端：待接单 → 接单 → 进行中 ---------- */
  switchMockRole(ROLES.GUIDE);

  const waiting = await OrderApi.getGuideOrders({ scope: 'waiting', pageNo: 1, pageSize: 50 });
  const inWaiting = waiting.list.find((o) => o.id === order.id);
  check('地陪待接单里能看到新单', !!inWaiting, `待接单 ${waiting.counts.waiting} 单`);
  check('地陪端能看到下单游客', !!(inWaiting && inWaiting.touristNickname), inWaiting ? inWaiting.touristNickname : '');
  check(
    'counts 不再随 scope 归零',
    typeof waiting.counts.inProgress === 'number' && typeof waiting.counts.todayFinished === 'number',
    JSON.stringify(waiting.counts)
  );

  const accepted = await OrderApi.acceptOrder(order.id);
  check('接单只写接单时间、状态不变', accepted.status === ORDER_STATUS.PENDING_CONFIRM && !!accepted.guideAcceptedAt);

  const inProgress = await OrderApi.getGuideOrders({ scope: 'inProgress', pageNo: 1, pageSize: 50 });
  check('接单后进入「进行中」而不是消失', inProgress.list.some((o) => o.id === order.id), `进行中 ${inProgress.counts.inProgress} 单`);

  /* ---------- 3. 平台端：确认档期 ---------- */
  switchMockRole(ROLES.ADMIN);

  const beforeCounts = (await OrderApi.getAllOrders({ pageNo: 1, pageSize: 1 })).counts;
  const confirmed = await OrderApi.confirmOrder(order.id);
  check('平台确认档期后状态为已确认', confirmed.status === ORDER_STATUS.CONFIRMED);
  const afterCounts = (await OrderApi.getAllOrders({ pageNo: 1, pageSize: 1 })).counts;
  check(
    '后台统计随之变化（待确认 -1 / 已确认 +1）',
    afterCounts.pendingConfirm === beforeCounts.pendingConfirm - 1 && afterCounts.confirmed === beforeCounts.confirmed + 1,
    `${beforeCounts.pendingConfirm}→${afterCounts.pendingConfirm} / ${beforeCounts.confirmed}→${afterCounts.confirmed}`
  );

  const filtered = await OrderApi.getAllOrders({ pageNo: 1, pageSize: 50, status: ORDER_STATUS.CONFIRMED });
  check('后台按状态筛选命中该单', filtered.list.some((o) => o.id === order.id));
  check('后台「今日订单」统计不为恒 0（生成器里有约在今天单）', afterCounts.todayAppoint > 0, `今日订单 ${afterCounts.todayAppoint}`);
  const byDate = await OrderApi.getAllOrders({ pageNo: 1, pageSize: 50, appointDate: order.appointDate });
  check('后台按日期筛选命中该单', byDate.list.some((o) => o.id === order.id));

  /* ---------- 4. 地陪端：完成服务 ---------- */
  switchMockRole(ROLES.GUIDE);
  const finished = await OrderApi.completeOrder(order.id);
  check('完成服务后状态为已完成', finished.status === ORDER_STATUS.COMPLETED);

  /* ---------- 5. 游客端回看 ---------- */
  switchMockRole(ROLES.TOURIST);
  const mine = await OrderApi.getMyOrders({ pageNo: 1, pageSize: 50, status: ORDER_STATUS.COMPLETED });
  check('游客端「已完成」页签能看到', mine.list.some((o) => o.id === order.id));

  /* ---------- 6. 负向：越权与非法参数必须被拒 ---------- */
  let stateInvalid = false;
  try {
    await OrderApi.cancelOrder(order.id, { reason: '越权测试' });
  } catch (e) {
    stateInvalid = e.code === 'STATE_INVALID';
  }
  check('终态订单再取消 → STATE_INVALID', stateInvalid);

  let badDate = false;
  try {
    await OrderApi.createOrder({ ...payload, appointDate: '2000-01-01' });
  } catch (e) {
    badDate = true;
  }
  check('不可约日期下单被拒', badDate);

  let badGuide = false;
  try {
    await OrderApi.createOrder({ ...payload, guideId: 999999 });
  } catch (e) {
    badGuide = true;
  }
  check('不存在的地陪下单被拒', badGuide);

  let badAttraction = false;
  try {
    await OrderApi.createOrder({ ...payload, attractionId: 999999 });
  } catch (e) {
    badAttraction = true;
  }
  check('地陪不擅长的景点下单被拒', badAttraction);

  /* ---------- 7. 管理端：套餐字典 / 身份 / 地陪审核（用户报错就出在这条链路上） ---------- */
  const packages = await PackageApi.getPackageList();
  check('套餐字典返回 3 个 SKU', packages.length === 3, packages.map((p) => p.name).join(' / '));

  switchMockRole(ROLES.ADMIN);
  const me = await UserApi.getCurrentUser();
  check('当前身份可读（我的页依赖）', !!me && !!me.roleLabel, `${me.nickname} / ${me.roleLabel}`);

  const pending = await GuideApi.getPendingGuides({ pageNo: 1, pageSize: 10 });
  check('后台待审列表可用', pending.list.length > 0, `${pending.total} 位待审`);
  check(
    '待审地陪带区域与擅长景点（曾在此崩溃）',
    pending.list.every((g) => Array.isArray(g.regionTypes) && g.regionTypes.length > 0 && Array.isArray(g.attractions))
  );

  const target = pending.list[0];
  const audited = await GuideApi.auditGuide(target.id, { status: 1 });
  check('审核通过后状态为已通过', audited.status === 1, `${target.nickname} → ${audited.statusLabel}`);
  const pendingAfter = await GuideApi.getPendingGuides({ pageNo: 1, pageSize: 1 });
  check('待审数量随之 -1', pendingAfter.total === pending.total - 1, `${pending.total} → ${pendingAfter.total}`);
  const approvedList = await GuideApi.getGuideList({ pageNo: 1, pageSize: 50 });
  check('已通过列表包含刚通过的地陪', approvedList.list.some((g) => g.id === target.id));

  results.push(`\nUSE_MOCK=${USE_MOCK}｜角色=${[ROLES.TOURIST, ROLES.GUIDE, ROLES.ADMIN].join(' / ')}｜闭环订单=${order.orderNo}`);
} catch (e) {
  failures += 1;
  results.push(`\n[执行异常] ${e && e.message}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log('=== 端到端闭环校验（mock 数据层）===');
console.log(results.join('\n'));

if (SELF_TEST) {
  // 自检语义反过来：故意破坏后必须失败，才算门禁有效
  if (failures > 0) {
    console.log('\n自检通过：破坏数据层后闭环校验如期失败（说明门禁不是空壳）。');
    process.exit(0);
  }
  console.log('\n自检失败：破坏数据层后校验仍然全绿，门禁不可信。');
  process.exit(1);
}

const total = results.filter((line) => line.indexOf('  ok  ') === 0 || line.indexOf(' FAIL ') === 0).length;
console.log(`\n结果：${Math.max(total - failures, 0)}/${total} 项通过${failures ? '，有失败项' : ''}`);
process.exit(failures ? 1 : 0);
