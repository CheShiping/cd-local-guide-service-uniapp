/**
 * 数据层统一出口
 *
 * 页面只允许这样引用：
 *   import { AttractionApi, GuideApi, OrderApi } from '@/api/index.js'
 *
 * 数据源切换：改下面的 USE_MOCK 即可（mock ↔ HTTP），页面代码不动。
 * 当前 MVP 固定走 mock，见 docs/mvp-scope.json 的 dev-004。
 *
 * 分层：
 *   api/constants.js    领域常量（订单四态 / 预约类型 / 订单号规则 / 状态流转白名单）
 *   api/errors.js       统一错误契约（与 HTTP 错误体一致）
 *   api/mock/           确定性 mock 数据 + 接口实现
 *   api/http.js         HTTP 适配层骨架 + 路由表（对接后端时逐个补实现）
 */

import * as mockAdapter from './mock/index.js';
import { createHttpAdapter, ROUTES, createRequester } from './http.js';

/** MVP 阶段：数据源 = mock。对接真实后端时改为 false 并按 api/http.js 的说明补实现 */
export const USE_MOCK = true;

/** 数据层版本戳：排查「旧构建 / 旧模块缓存」时，看控制台那一行就知道跑的是哪一版 */
export const DATA_LAYER_VERSION = '2026-09-26.2';

const MODULE_NAMES = ['RegionApi', 'AttractionApi', 'PackageApi', 'GuideApi', 'OrderApi', 'UserApi'];

const adapter = USE_MOCK ? mockAdapter : createHttpAdapter();

/**
 * 取模块并做存在性检查
 *
 * 少了这个检查，旧模块缓存的表现是页面里一句
 *   Cannot read properties of undefined (reading 'getAllOrders')
 * 看不出「数据层缺模块」还是「页面写错」。改成抛出可操作的错误。
 * 见 docx/bugfix/BUG修复-20260926-数据层缺模块报错不可读.md
 */
function pickModule(name) {
  const module = adapter[name];
  if (!module) {
    throw new Error(
      `数据层缺少模块 ${name}（数据层版本 ${DATA_LAYER_VERSION}，数据源 ${USE_MOCK ? 'mock' : 'http'}）。` +
        '若刚改过 api/ 目录：停掉 dev server → 删除 node_modules/.vite 与 dist → 重启，并硬刷新浏览器。'
    );
  }
  return module;
}

/* ---------- 业务模块（新页面用这些） ---------- */
export const RegionApi = pickModule('RegionApi');
export const AttractionApi = pickModule('AttractionApi');
export const PackageApi = pickModule('PackageApi');
export const GuideApi = pickModule('GuideApi');
export const OrderApi = pickModule('OrderApi');
export const UserApi = pickModule('UserApi');

/* 启动自报家门：控制台看不到这一行（或模块列表里没有 OrderApi），就说明页面加载的是旧模块 */
console.log(
  `[api] 数据层 ${DATA_LAYER_VERSION}｜数据源 ${USE_MOCK ? 'mock' : 'http'}｜模块 ${MODULE_NAMES.join(' / ')}`
);

/* ---------- 过渡适配层已删除 ----------
   ClerkApi / CategoryApi / AppointmentApi 是陪玩时期的入口，曾把新模型映射回旧形状
   （其中订单状态做了「4 态压缩成 3 态」的映射）。feat-006 ~ feat-012 把 7 个页面
   全部迁到新模块后，页面对它们已无引用，故于 feat-013 整体移除。
   历史映射关系见 docx/接口文档.md 第 8 节。 */

/* ---------- 常量与错误（页面从这里取，避免到处复制映射表） ---------- */
export * from './constants.js';
export { ApiError, ERROR_CODES } from './errors.js';

/* ---------- mock 专用工具（调试用；HTTP 数据源下不可用） ---------- */
export const resetMockDb = mockAdapter.resetMockDb;
export const getMockStats = mockAdapter.getMockStats;
export const switchMockRole = mockAdapter.switchMockRole;

/* ---------- 路由表（对接后端时的对照清单） ---------- */
export { ROUTES, createRequester };
