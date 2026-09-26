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
import { notImplemented } from './errors.js';

/** MVP 阶段：数据源 = mock。对接真实后端时改为 false 并按 api/http.js 的说明补实现 */
export const USE_MOCK = true;

const adapter = USE_MOCK ? mockAdapter : createHttpAdapter();

/* ---------- 业务模块（新页面用这些） ---------- */
export const RegionApi = adapter.RegionApi;
export const AttractionApi = adapter.AttractionApi;
export const PackageApi = adapter.PackageApi;
export const GuideApi = adapter.GuideApi;
export const OrderApi = adapter.OrderApi;
export const UserApi = adapter.UserApi;

/* ---------- 过渡适配层（陪玩时期的模块名，feat-006 ~ feat-012 迁移完成后删除） ---------- */
const LEGACY_METHODS = [
  'getCategoryList', 'createCategory',
  'getClerkList', 'getClerkDetail', 'createClerk', 'updateClerk', 'getPendingClerks', 'auditClerk',
  'createAppointment', 'getMyAppointments', 'getAllAppointments', 'cancelAppointment', 'completeAppointment'
];

function legacyUnavailable(moduleName) {
  const module = {};
  const fail = async () => {
    throw notImplemented(`${moduleName} 是 mock 阶段的过渡适配层，接入 HTTP 后请改用新模块（RegionApi / AttractionApi / GuideApi / PackageApi / OrderApi）`);
  };
  LEGACY_METHODS.forEach((method) => {
    module[method] = fail;
  });
  return module;
}

export const CategoryApi = adapter.CategoryApi || legacyUnavailable('CategoryApi');
export const ClerkApi = adapter.ClerkApi || legacyUnavailable('ClerkApi');
export const AppointmentApi = adapter.AppointmentApi || legacyUnavailable('AppointmentApi');

/* ---------- 常量与错误（页面从这里取，避免到处复制映射表） ---------- */
export * from './constants.js';
export { ApiError, ERROR_CODES } from './errors.js';

/* ---------- mock 专用工具（调试用；HTTP 数据源下不可用） ---------- */
export const resetMockDb = mockAdapter.resetMockDb;
export const getMockStats = mockAdapter.getMockStats;
export const switchMockRole = mockAdapter.switchMockRole;

/* ---------- 路由表（对接后端时的对照清单） ---------- */
export { ROUTES, createRequester };
