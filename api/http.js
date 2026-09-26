/**
 * HTTP 适配层（骨架 + 路由表）
 *
 * 现状：MVP 全部走 mock（见 api/mock/index.js）。本文件的作用是**把路由先固定下来**，
 *      让 mock 方法的签名与未来的 HTTP 实现一一对应（docs/mvp-scope.json 的 dev-004）。
 *
 * 对接后端时要做的事：
 *   1. 把 api/index.js 的 USE_MOCK 改成 false
 *   2. 配置 baseUrl（默认 /api/v1，见 .codebuddy/skills/api-design/SKILL.md）
 *   3. 逐个方法删除 notImplemented，换成 request(...) 调用（路由表里已经写好方法、路径、入参位置）
 *
 * 约定（来自 api-design 技能）：
 *   - 资源名词复数、不在 URL 里放动词（动作类用子资源，如 /orders/{id}/accept）
 *   - 字段 camelCase；列表返回 { list, total, pageNo, pageSize, hasMore }
 *   - 错误体 { error: { code, message, details } }，见 api/errors.js
 *   - 分页入参 pageNo（从 1 开始）/ pageSize
 */

import { notImplemented } from './errors.js';

/** 路由表：方法名 → HTTP 方法 + 路径 + 入参位置（path / query / body） */
export const ROUTES = {
  RegionApi: {
    getRegionList: { method: 'GET', path: '/regions', query: ['onlyWithAttractions'] }
  },
  AttractionApi: {
    getAttractionList: { method: 'GET', path: '/attractions', query: ['pageNo', 'pageSize', 'regionTypeId', 'regionTypeCode', 'keyword'] },
    getAttractionDetail: { method: 'GET', path: '/attractions/{id}', pathParams: ['attractionId'] }
  },
  PackageApi: {
    getPackageList: { method: 'GET', path: '/packages' }
  },
  GuideApi: {
    getGuideList: {
      method: 'GET',
      path: '/guides',
      query: ['pageNo', 'pageSize', 'attractionId', 'regionTypeId', 'regionTypeCode', 'bookingType', 'priceMin', 'priceMax', 'sort']
    },
    getGuideDetail: { method: 'GET', path: '/guides/{id}', pathParams: ['guideId'] },
    getGuideAvailableDates: { method: 'GET', path: '/guides/{id}/available-dates', pathParams: ['guideId'], query: ['days', 'bookingType'] },
    getPendingGuides: { method: 'GET', path: '/admin/guides', query: ['pageNo', 'pageSize', 'status=0'] },
    auditGuide: { method: 'PATCH', path: '/admin/guides/{id}', pathParams: ['guideId'], body: ['status', 'auditedBy'] }
  },
  OrderApi: {
    createOrder: { method: 'POST', path: '/orders', body: '*' },
    getMyOrders: { method: 'GET', path: '/orders', query: ['pageNo', 'pageSize', 'status'] },
    getGuideOrders: { method: 'GET', path: '/guides/me/orders', query: ['pageNo', 'pageSize', 'status', 'scope'] },
    getAllOrders: { method: 'GET', path: '/admin/orders', query: ['pageNo', 'pageSize', 'status', 'appointDate'] },
    getOrderDetail: { method: 'GET', path: '/orders/{id}', pathParams: ['orderId'] },
    acceptOrder: { method: 'PATCH', path: '/orders/{id}/accept', pathParams: ['orderId'] },
    rejectOrder: { method: 'PATCH', path: '/orders/{id}/reject', pathParams: ['orderId'], body: ['reason'] },
    confirmOrder: { method: 'PATCH', path: '/orders/{id}/confirm', pathParams: ['orderId'], body: ['remark', 'adminUserId'] },
    completeOrder: { method: 'PATCH', path: '/orders/{id}/complete', pathParams: ['orderId'], body: ['remark'] },
    cancelOrder: { method: 'PATCH', path: '/orders/{id}/cancel', pathParams: ['orderId'], body: ['reason'] }
  },
  UserApi: {
    getCurrentUser: { method: 'GET', path: '/users/me' },
    wxLogin: { method: 'POST', path: '/auth/login', body: ['code', 'encryptedData', 'iv'] },
    saveUserInfo: { method: 'PATCH', path: '/users/me', body: '*' },
    isAdmin: { method: 'GET', path: '/users/me' },
    logout: { method: 'POST', path: '/auth/logout' }
  }
};

/** 统一的请求封装（对接后端时启用） */
export function createRequester({ baseUrl = '/api/v1', getToken } = {}) {
  return function request({ method, path, query, body }) {
    const queryString = query && Object.keys(query).length
      ? `?${Object.keys(query).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`).join('&')}`
      : '';
    const token = typeof getToken === 'function' ? getToken() : '';
    return new Promise((resolve, reject) => {
      uni.request({
        url: `${baseUrl}${path}${queryString}`,
        method,
        data: body,
        header: token ? { Authorization: `Bearer ${token}` } : {},
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            // 后端按 api-design 约定返回 { error: { code, message, details } }
            const error = (res.data && res.data.error) || {};
            reject(Object.assign(new Error(error.message || `请求失败（${res.statusCode}）`), {
              name: 'ApiError',
              code: error.code || 'SERVER_ERROR',
              details: error.details || [],
              status: res.statusCode
            }));
          }
        },
        fail: (err) => {
          reject(Object.assign(new Error(err.errMsg || '网络异常'), { name: 'ApiError', code: 'SERVER_ERROR', details: [] }));
        }
      });
    });
  };
}

/**
 * 按路由表生成 HTTP 适配器：方法与 mock 一致，但当前全部抛 NOT_IMPLEMENTED
 * （避免"看起来能用其实没实现"的假象，错误信息里带路由，便于逐个补实现）
 */
export function createHttpAdapter() {
  const adapter = {};
  Object.keys(ROUTES).forEach((group) => {
    adapter[group] = {};
    Object.keys(ROUTES[group]).forEach((methodName) => {
      const route = ROUTES[group][methodName];
      adapter[group][methodName] = async () => {
        throw notImplemented('HTTP 数据源尚未接入，当前请使用 mock（api/index.js 的 USE_MOCK = true）', [
          `${route.method} ${route.path}`
        ]);
      };
    });
  });
  return adapter;
}
