/**
 * mock 数据层（内存仓库 + 接口实现）
 *
 * 职责划分：
 *   seed.json   静态字典（7 区域 / 3 套餐 / 20 景点）+ 生成素材池
 *   generate.js 确定性生成（52 用户 / 50 地陪 / 订单）—— 不含业务规则
 *   index.js    业务规则与接口实现（本文件）：查询、分页、校验、状态流转、订单号
 *
 * 三条「无外键 → 应用层保证完整性」的职责都在这里落地：
 *   1. createOrder 写入前校验主体存在且有效（景点上架 / 地陪已通过 / 套餐可售 / 地陪擅长该景点 / 档期可约）
 *   2. 状态流转一律走 ORDER_STATUS_TRANSITIONS 白名单
 *   3. 订单号按「当日同类型最大序号 + 1」生成（HTTP 版本需补唯一键撞号重试）
 *
 * 页面只允许通过 @/api/index.js 访问，不要直接 import 本文件。
 */

import { invalidRequest, notFound, stateInvalid } from '../errors.js';
import * as C from '../constants.js';
import seedData from './seed.json';
import { generateMockData } from './generate.js';

const MOCK_SEED = 'peiwan-chengdu-mvp';

/* =============================================================================
   一、内存仓库
   ============================================================================= */

let db = null;
let currentUserId = 2; // 默认以管理员身份进入，便于演示后台；可用 switchMockRole 切换

function getDb() {
  if (!db) {
    db = generateMockData({ seedData, now: new Date(), domain: C, seed: MOCK_SEED });
  }
  return db;
}

/** 重置 mock 数据（调试用：改完数据回到初始状态） */
export function resetMockDb() {
  db = null;
}

/** mock 数据规模，用于自检与页面调试 */
export function getMockStats() {
  const store = getDb();
  return { seed: store.seed, generatedAt: store.generatedAt, ...store.stats };
}

/** 切换当前登录身份（mock 专用，方便一次跑通游客 / 地陪 / 管理员三种视角） */
export function switchMockRole(role) {
  const store = getDb();
  if (role === C.ROLES.TOURIST) {
    currentUserId = 1;
  } else if (role === C.ROLES.ADMIN) {
    currentUserId = 2;
  } else if (role === C.ROLES.GUIDE) {
    const approved = store.guides.find((guide) => guide.status === C.GUIDE_STATUS.APPROVED);
    currentUserId = approved ? approved.userId : 2;
  } else {
    throw invalidRequest(`未知角色：${role}`);
  }
  return getCurrentUserRecord();
}

function getCurrentUserRecord() {
  const store = getDb();
  return store.users.find((user) => user.id === currentUserId) || store.users[1];
}

/* =============================================================================
   二、通用工具
   ============================================================================= */

function paginate(list, { pageNo, pageSize } = {}) {
  const page = Number(pageNo) > 0 ? Number(pageNo) : C.DEFAULT_PAGE.pageNo;
  const size = Number(pageSize) > 0 ? Number(pageSize) : C.DEFAULT_PAGE.pageSize;
  const start = (page - 1) * size;
  const slice = list.slice(start, start + size);
  return {
    list: slice,
    total: list.length,
    pageNo: page,
    pageSize: size,
    hasMore: start + slice.length < list.length
  };
}

function byId(list, id) {
  return list.find((item) => item.id === Number(id));
}

function approvedGuides(store) {
  return store.guides.filter((guide) => guide.status === C.GUIDE_STATUS.APPROVED);
}

function guideRegionIds(store, guideId) {
  return store.guideRegionTypes.filter((row) => row.guideId === guideId).map((row) => row.regionTypeId);
}

function guideAttractionIds(store, guideId) {
  return store.guideAttractions.filter((row) => row.guideId === guideId).map((row) => row.attractionId);
}

function guidePackageRows(store, guideId) {
  return store.guidePackages.filter((row) => row.guideId === guideId && row.enabled === 1);
}

function guidePriceFrom(store, guideId) {
  const rows = guidePackageRows(store, guideId);
  return rows.length ? Math.min.apply(null, rows.map((row) => row.price)) : 0;
}

function guideBookingTypes(store, guideId) {
  const types = guidePackageRows(store, guideId).map((row) => byId(store.packageSkus, row.packageSkuId).bookingType);
  return types.filter((item, index) => types.indexOf(item) === index);
}

function attractionGuideCount(store, attractionId) {
  const guideIds = store.guideAttractions
    .filter((row) => row.attractionId === attractionId)
    .map((row) => row.guideId);
  return approvedGuides(store).filter((guide) => guideIds.indexOf(guide.id) >= 0).length;
}

/* ---------- 视图对象：把内部存储映射成接口返回结构 ---------- */

function toRegionType(region) {
  return {
    id: region.id,
    code: region.code,
    name: region.name,
    coverage: region.coverage,
    scene: region.scene,
    sortOrder: region.sortOrder
  };
}

function toAttraction(store, attraction) {
  const region = byId(store.regionTypes, attraction.regionTypeId);
  return {
    id: attraction.id,
    code: attraction.code,
    name: attraction.name,
    district: attraction.district,
    regionTypeId: attraction.regionTypeId,
    regionTypeCode: region ? region.code : '',
    regionTypeName: region ? region.name : '',
    scene: attraction.scene,
    coverUrl: attraction.coverUrl,
    summary: attraction.summary,
    guideCount: attractionGuideCount(store, attraction.id),
    sortOrder: attraction.sortOrder
  };
}

function toPackage(store, pkg, price) {
  return {
    packageSkuId: pkg.id,
    code: pkg.code,
    name: pkg.name,
    bookingType: pkg.bookingType,
    bookingTypeLabel: C.bookingTypeLabel(pkg.bookingType),
    durationDesc: pkg.durationDesc,
    price: typeof price === 'number' ? price : pkg.priceMin,
    priceMin: pkg.priceMin,
    priceMax: pkg.priceMax,
    includesNote: pkg.includesNote,
    description: pkg.description
  };
}

function toGuide(store, guide) {
  const regionIds = guideRegionIds(store, guide.id);
  const attractionIds = guideAttractionIds(store, guide.id);
  return {
    id: guide.id,
    userId: guide.userId,
    nickname: guide.nickname,
    avatarUrl: guide.avatarUrl,
    introduce: guide.introduce,
    orderCount: guide.orderCount,
    status: guide.status,
    statusLabel: C.GUIDE_STATUS_LABELS[guide.status],
    regionTypeIds: regionIds,
    regionTypes: regionIds
      .map((id) => byId(store.regionTypes, id))
      .filter(Boolean)
      .map((region) => ({ id: region.id, code: region.code, name: region.name })),
    attractionIds,
    bookingTypes: guideBookingTypes(store, guide.id),
    priceFrom: guidePriceFrom(store, guide.id),
    packages: guidePackageRows(store, guide.id).map((row) => toPackage(store, byId(store.packageSkus, row.packageSkuId), row.price))
  };
}

function toOrder(order) {
  return {
    id: order.id,
    orderNo: order.orderNo,
    touristUserId: order.touristUserId,
    guideId: order.guideId,
    attractionId: order.attractionId,
    packageSkuId: order.packageSkuId,
    bookingType: order.bookingType,
    bookingTypeLabel: C.bookingTypeLabel(order.bookingType),
    appointDate: order.appointDate,
    timeSlot: order.timeSlot,
    timeSlotLabel: C.timeSlotLabel(order.timeSlot),
    hours: order.hours,
    peopleCount: order.peopleCount,
    remark: order.remark,
    amount: order.amount,
    status: order.status,
    statusLabel: C.orderStatusLabel(order.status),
    statusKey: C.ORDER_STATUS_KEYS[order.status],
    attractionName: order.attractionName,
    packageName: order.packageName,
    guideNickname: order.guideNickname,
    guideAvatarUrl: order.guideAvatarUrl,
    waitingGuideAccept: C.isWaitingGuideAccept(order),
    inProgress: C.isInProgress(order),
    guideAcceptedAt: order.guideAcceptedAt,
    confirmedAt: order.confirmedAt,
    finishedAt: order.finishedAt,
    cancelledAt: order.cancelledAt,
    cancelReason: order.cancelReason,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

/* =============================================================================
   三、接口实现（mock adapter）
   ============================================================================= */

export const RegionApi = {
  /** GET /api/v1/regions —— 首页顶部标签；只返回启用区域，可选「只看有在售景点的」 */
  async getRegionList(params = {}) {
    const store = getDb();
    const { onlyWithAttractions = true } = params;
    let list = store.regionTypes.filter((region) => region.status === C.COMMON_STATUS.ENABLED);
    if (onlyWithAttractions) {
      list = list.filter((region) =>
        store.attractions.some((item) => item.regionTypeId === region.id && item.status === C.COMMON_STATUS.ENABLED)
      );
    }
    return list.sort((a, b) => a.sortOrder - b.sortOrder).map(toRegionType);
  }
};

export const AttractionApi = {
  /** GET /api/v1/attractions —— 首页景点列表（按区域筛选 + 分页） */
  async getAttractionList(params = {}) {
    const store = getDb();
    const { pageNo, pageSize, regionTypeId, regionTypeCode, keyword } = params;
    let list = store.attractions.filter((item) => item.status === C.COMMON_STATUS.ENABLED);

    if (regionTypeId) {
      list = list.filter((item) => item.regionTypeId === Number(regionTypeId));
    } else if (regionTypeCode) {
      const region = store.regionTypes.find((item) => item.code === regionTypeCode);
      list = list.filter((item) => (region ? item.regionTypeId === region.id : false));
    }
    if (keyword) {
      list = list.filter((item) => item.name.indexOf(keyword) >= 0);
    }

    list = list.sort((a, b) => a.sortOrder - b.sortOrder);
    const page = paginate(list, { pageNo, pageSize });
    return { ...page, list: page.list.map((item) => toAttraction(store, item)) };
  },

  /** GET /api/v1/attractions/{id} */
  async getAttractionDetail(attractionId) {
    const store = getDb();
    const attraction = byId(store.attractions, attractionId);
    if (!attraction || attraction.status !== C.COMMON_STATUS.ENABLED) {
      throw notFound('景点不存在或已下架', [`attractionId=${attractionId}`]);
    }
    return toAttraction(store, attraction);
  }
};

export const PackageApi = {
  /** GET /api/v1/packages —— 3 个套餐 SKU；bookingType 决定下单页控件 */
  async getPackageList() {
    const store = getDb();
    return store.packageSkus
      .filter((pkg) => pkg.status === C.COMMON_STATUS.ENABLED)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((pkg) => toPackage(store, pkg));
  }
};

export const GuideApi = {
  /** GET /api/v1/guides —— 地陪列表（核心入口：先选景点，再选能带这个景点的地陪） */
  async getGuideList(params = {}) {
    const store = getDb();
    const { pageNo, pageSize, attractionId, regionTypeId, regionTypeCode, bookingType, priceMin, priceMax, sort } = params;
    let list = approvedGuides(store);

    if (attractionId) {
      const guideIds = store.guideAttractions
        .filter((row) => row.attractionId === Number(attractionId))
        .map((row) => row.guideId);
      list = list.filter((guide) => guideIds.indexOf(guide.id) >= 0);
    }
    if (regionTypeId || regionTypeCode) {
      const targetId = Number(regionTypeId) || (store.regionTypes.find((item) => item.code === regionTypeCode) || {}).id;
      list = list.filter((guide) => guideRegionIds(store, guide.id).indexOf(targetId) >= 0);
    }
    if (bookingType) {
      list = list.filter((guide) => guideBookingTypes(store, guide.id).indexOf(bookingType) >= 0);
    }
    if (priceMin !== undefined && priceMin !== '') {
      list = list.filter((guide) => guidePriceFrom(store, guide.id) >= Number(priceMin));
    }
    if (priceMax !== undefined && priceMax !== '') {
      list = list.filter((guide) => guidePriceFrom(store, guide.id) <= Number(priceMax));
    }

    if (sort === 'priceAsc') {
      list = list.slice().sort((a, b) => guidePriceFrom(store, a.id) - guidePriceFrom(store, b.id));
    } else {
      list = list.slice().sort((a, b) => b.orderCount - a.orderCount);
    }

    const page = paginate(list, { pageNo, pageSize });
    return { ...page, list: page.list.map((guide) => toGuide(store, guide)) };
  },

  /** GET /api/v1/guides/{id} —— 详情页（未通过审核的地陪对外不可见） */
  async getGuideDetail(guideId) {
    const store = getDb();
    const guide = byId(store.guides, guideId);
    if (!guide || guide.status !== C.GUIDE_STATUS.APPROVED) {
      throw notFound('地陪不存在或未通过审核', [`guideId=${guideId}`]);
    }
    return toGuide(store, guide);
  },

  /** GET /api/v1/guides/{id}/available-dates —— 详情页「可约日期」横条 */
  async getGuideAvailableDates(guideId, params = {}) {
    const store = getDb();
    const { days = 14, bookingType } = params;
    const guide = byId(store.guides, guideId);
    if (!guide) {
      throw notFound('地陪不存在', [`guideId=${guideId}`]);
    }
    const limit = C.formatDate(new Date(Date.now() + Number(days) * 24 * 3600 * 1000));
    const rows = store.guideAvailableDates
      .filter((row) => row.guideId === guide.id && row.isAvailable === 1)
      .filter((row) => row.appointDate <= limit)
      .filter((row) => (bookingType ? row.bookingType === bookingType : true));

    const byDate = {};
    rows.forEach((row) => {
      if (!byDate[row.appointDate]) {
        byDate[row.appointDate] = { appointDate: row.appointDate, bookingTypes: [], isAvailable: 1 };
      }
      if (byDate[row.appointDate].bookingTypes.indexOf(row.bookingType) < 0) {
        byDate[row.appointDate].bookingTypes.push(row.bookingType);
      }
    });
    return Object.keys(byDate).sort().map((date) => byDate[date]);
  },

  /** GET /api/v1/admin/guides?status=0 —— 后台地陪审核列表 */
  async getPendingGuides(params = {}) {
    const store = getDb();
    const list = store.guides.filter((guide) => guide.status === C.GUIDE_STATUS.PENDING);
    const page = paginate(list, params);
    return { ...page, list: page.list.map((guide) => toGuide(store, guide)) };
  },

  /** PATCH /api/v1/admin/guides/{id} —— 后台审核（通过 / 拒绝） */
  async auditGuide(guideId, payload = {}) {
    const store = getDb();
    const guide = byId(store.guides, guideId);
    if (!guide) {
      throw notFound('地陪不存在', [`guideId=${guideId}`]);
    }
    const { status, auditedBy = currentUserId } = payload;
    if ([C.GUIDE_STATUS.APPROVED, C.GUIDE_STATUS.REJECTED].indexOf(status) < 0) {
      throw invalidRequest('审核结果只能是「已通过(1)」或「已拒绝(2)」', [`status=${status}`]);
    }
    guide.status = status;
    guide.auditedBy = auditedBy;
    guide.auditedAt = C.formatDate(new Date());
    return toGuide(store, guide);
  }
};

export const OrderApi = {
  /** POST /api/v1/orders —— 下单（应用层完整性校验都在这） */
  async createOrder(payload = {}) {
    const store = getDb();
    const {
      touristUserId = currentUserId,
      guideId,
      attractionId,
      packageSkuId,
      appointDate,
      timeSlot = C.TIME_SLOTS.NONE,
      hours = 0,
      peopleCount = 1,
      remark = ''
    } = payload;

    if (!guideId || !attractionId || !packageSkuId || !appointDate) {
      throw invalidRequest('缺少必填参数（guideId / attractionId / packageSkuId / appointDate）');
    }

    const guide = byId(store.guides, guideId);
    if (!guide || guide.status !== C.GUIDE_STATUS.APPROVED) {
      throw invalidRequest('地陪不存在或未通过审核', [`guideId=${guideId}`]);
    }
    const attraction = byId(store.attractions, attractionId);
    if (!attraction || attraction.status !== C.COMMON_STATUS.ENABLED) {
      throw invalidRequest('景点不存在或已下架', [`attractionId=${attractionId}`]);
    }
    if (guideAttractionIds(store, guide.id).indexOf(attraction.id) < 0) {
      throw invalidRequest('该地陪不擅长这个景点，请重新选择', [`guideId=${guideId}`, `attractionId=${attractionId}`]);
    }
    const pkg = byId(store.packageSkus, packageSkuId);
    if (!pkg || pkg.status !== C.COMMON_STATUS.ENABLED) {
      throw invalidRequest('套餐不存在或已停用', [`packageSkuId=${packageSkuId}`]);
    }
    const quote = guidePackageRows(store, guide.id).find((row) => row.packageSkuId === pkg.id);
    if (!quote) {
      throw invalidRequest('该地陪未开通此套餐', [`guideId=${guideId}`, `packageSkuId=${packageSkuId}`]);
    }

    const bookingType = pkg.bookingType;
    const ui = C.BOOKING_TYPE_UI[bookingType];
    if (ui.showTimeSlot && [C.TIME_SLOTS.MORNING, C.TIME_SLOTS.AFTERNOON].indexOf(timeSlot) < 0) {
      throw invalidRequest('半天陪游必须选择上午或下午', [`timeSlot=${timeSlot}`]);
    }
    const finalTimeSlot = ui.showTimeSlot ? timeSlot : C.TIME_SLOTS.NONE;
    const finalHours = ui.showHours ? Number(hours) : 0;
    if (ui.showHours && (!(finalHours >= 1) || finalHours > 12)) {
      throw invalidRequest('小时加购的小时数需在 1-12 之间', [`hours=${hours}`]);
    }
    const finalPeople = Number(peopleCount);
    if (!(finalPeople >= 1) || finalPeople > 9) {
      throw invalidRequest('人数需在 1-9 之间', [`peopleCount=${peopleCount}`]);
    }

    const available = store.guideAvailableDates.find(
      (row) => row.guideId === guide.id && row.appointDate === appointDate && row.bookingType === bookingType && row.isAvailable === 1
    );
    if (!available) {
      throw invalidRequest('该地陪在所选日期不可约，请换一天', [`appointDate=${appointDate}`, `bookingType=${bookingType}`]);
    }

    // 订单号：当日同类型最大序号 + 1（HTTP 版本需补唯一键撞号重试）
    const now = new Date();
    const orderNo = C.nextOrderNo(store.orders.map((order) => order.orderNo), bookingType, now);
    const amount = bookingType === C.BOOKING_TYPES.HOURLY ? quote.price * finalHours : quote.price;

    const order = {
      id: store.orders.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      orderNo,
      touristUserId: Number(touristUserId),
      guideId: guide.id,
      attractionId: attraction.id,
      packageSkuId: pkg.id,
      bookingType,
      appointDate,
      timeSlot: finalTimeSlot,
      hours: finalHours,
      peopleCount: finalPeople,
      remark,
      amount,
      status: C.ORDER_STATUS.PENDING_CONFIRM,
      attractionName: attraction.name,
      packageName: pkg.name,
      guideNickname: guide.nickname,
      guideAvatarUrl: guide.avatarUrl,
      guideAcceptedAt: null,
      confirmedBy: null,
      confirmedAt: null,
      finishedAt: null,
      cancelledAt: null,
      cancelReason: '',
      createdAt: C.formatDate(now),
      updatedAt: C.formatDate(now)
    };

    store.orders.unshift(order);
    // 下单占用档期
    available.isAvailable = 0;
    return toOrder(order);
  },

  /** GET /api/v1/orders —— 我的订单（按状态分页） */
  async getMyOrders(params = {}) {
    const store = getDb();
    const { status, pageNo, pageSize } = params;
    const current = getCurrentUserRecord();
    const touristUserId = current.role === C.ROLES.TOURIST ? current.id : 1;

    let list = store.orders.filter((order) => order.touristUserId === touristUserId);
    if (status !== undefined && status !== '' && status !== null) {
      list = list.filter((order) => order.status === Number(status));
    }
    list = list.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.id - a.id));
    const page = paginate(list, { pageNo, pageSize });
    return { ...page, list: page.list.map(toOrder) };
  },

  /**
   * GET /api/v1/guides/me/orders —— 地陪端接单页
   * scope: waiting（待接单：状态 0 且未接单）| inProgress（进行中：状态 1）| all（默认）
   */
  async getGuideOrders(params = {}) {
    const store = getDb();
    const { guideId, scope = 'all', status, pageNo, pageSize } = params;
    const current = getCurrentUserRecord();
    const targetGuideId = Number(guideId) || (store.guides.find((guide) => guide.userId === current.id) || {}).id;
    if (!targetGuideId) {
      throw invalidRequest('未指定地陪，且当前身份不是地陪', [`guideId=${guideId}`]);
    }

    let list = store.orders.filter((order) => order.guideId === targetGuideId);
    if (scope === 'waiting') {
      list = list.filter((order) => C.isWaitingGuideAccept(order));
    } else if (scope === 'inProgress') {
      list = list.filter((order) => C.isInProgress(order));
    }
    if (status !== undefined && status !== '' && status !== null) {
      list = list.filter((order) => order.status === Number(status));
    }
    list = list.slice().sort((a, b) => (a.appointDate < b.appointDate ? -1 : a.appointDate > b.appointDate ? 1 : b.id - a.id));

    const page = paginate(list, { pageNo, pageSize });
    const counts = {
      waiting: list.filter((order) => C.isWaitingGuideAccept(order)).length,
      inProgress: list.filter((order) => C.isInProgress(order)).length
    };
    return { ...page, counts, list: page.list.map(toOrder) };
  },

  /** GET /api/v1/admin/orders —— 后台订单管理（状态 + 日期筛选） */
  async getAllOrders(params = {}) {
    const store = getDb();
    const { status, appointDate, pageNo, pageSize } = params;
    let list = store.orders.slice();
    if (status !== undefined && status !== '' && status !== null) {
      list = list.filter((order) => order.status === Number(status));
    }
    if (appointDate) {
      list = list.filter((order) => order.appointDate === appointDate);
    }
    list = list.sort((a, b) => (a.appointDate < b.appointDate ? -1 : a.appointDate > b.appointDate ? 1 : b.id - a.id));

    const page = paginate(list, { pageNo, pageSize });
    const counts = {
      pendingConfirm: store.orders.filter((order) => order.status === C.ORDER_STATUS.PENDING_CONFIRM).length,
      confirmed: store.orders.filter((order) => order.status === C.ORDER_STATUS.CONFIRMED).length,
      todayAppoint: store.orders.filter((order) => order.appointDate === C.formatDate(new Date())).length,
      total: store.orders.length
    };
    return { ...page, counts, list: page.list.map(toOrder) };
  },

  /** GET /api/v1/orders/{id} */
  async getOrderDetail(orderId) {
    const store = getDb();
    const order = byId(store.orders, orderId);
    if (!order) {
      throw notFound('订单不存在', [`orderId=${orderId}`]);
    }
    return toOrder(order);
  },

  /** PATCH /api/v1/orders/{id}/accept —— 地陪接单（不改状态，平台还要确认档期） */
  async acceptOrder(orderId) {
    const store = getDb();
    const order = byId(store.orders, orderId);
    if (!order) {
      throw notFound('订单不存在', [`orderId=${orderId}`]);
    }
    if (order.status !== C.ORDER_STATUS.PENDING_CONFIRM) {
      throw stateInvalid('只有待确认的订单可以接单', [`status=${order.status}`]);
    }
    if (order.guideAcceptedAt) {
      throw stateInvalid('该订单已接单，等待平台确认档期');
    }
    order.guideAcceptedAt = C.formatDate(new Date());
    order.updatedAt = order.guideAcceptedAt;
    return toOrder(order);
  },

  /** PATCH /api/v1/orders/{id}/reject —— 地陪拒单（0 → 3） */
  async rejectOrder(orderId, payload = {}) {
    const store = getDb();
    const order = byId(store.orders, orderId);
    if (!order) {
      throw notFound('订单不存在', [`orderId=${orderId}`]);
    }
    return toOrder(transit(store, order, C.ORDER_STATUS.CANCELLED, payload.reason || '地陪拒单'));
  },

  /** PATCH /api/v1/orders/{id}/confirm —— 平台人工确认档期（0 → 1） */
  async confirmOrder(orderId, payload = {}) {
    const store = getDb();
    const order = byId(store.orders, orderId);
    if (!order) {
      throw notFound('订单不存在', [`orderId=${orderId}`]);
    }
    const next = transit(store, order, C.ORDER_STATUS.CONFIRMED, payload.remark || '');
    order.confirmedBy = payload.adminUserId || currentUserId;
    order.confirmedAt = C.formatDate(new Date());
    return toOrder(next);
  },

  /** PATCH /api/v1/orders/{id}/complete —— 地陪完成服务（1 → 2） */
  async completeOrder(orderId, payload = {}) {
    const store = getDb();
    const order = byId(store.orders, orderId);
    if (!order) {
      throw notFound('订单不存在', [`orderId=${orderId}`]);
    }
    const next = transit(store, order, C.ORDER_STATUS.COMPLETED, payload.remark || '');
    order.finishedAt = C.formatDate(new Date());
    return toOrder(next);
  },

  /** PATCH /api/v1/orders/{id}/cancel —— 取消（0/1 → 3），游客 / 平台都可调用 */
  async cancelOrder(orderId, payload = {}) {
    const store = getDb();
    const order = byId(store.orders, orderId);
    if (!order) {
      throw notFound('订单不存在', [`orderId=${orderId}`]);
    }
    const next = transit(store, order, C.ORDER_STATUS.CANCELLED, payload.reason || '行程有变');
    order.cancelledAt = C.formatDate(new Date());
    return toOrder(next);
  }
};

/** 统一的状态流转入口：白名单校验 + 写状态 */
function transit(store, order, nextStatus, remark) {
  if (!C.canTransit(order.status, nextStatus)) {
    throw stateInvalid(
      `不允许的状态流转：${C.orderStatusLabel(order.status)} → ${C.orderStatusLabel(nextStatus)}`,
      [`orderId=${order.id}`, `from=${order.status}`, `to=${nextStatus}`]
    );
  }
  order.status = nextStatus;
  order.updatedAt = C.formatDate(new Date());
  if (remark) {
    order.cancelReason = nextStatus === C.ORDER_STATUS.CANCELLED ? remark : order.cancelReason;
  }
  return order;
}

export const UserApi = {
  /** GET /api/v1/users/me */
  async getCurrentUser() {
    const user = getCurrentUserRecord();
    return {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      role: user.role,
      roleLabel: C.ROLE_LABELS[user.role],
      isAdmin: user.role === C.ROLES.ADMIN // 兼容旧页面字段
    };
  },

  /** POST /api/v1/auth/login —— mock 直接发 token */
  async wxLogin(params = {}) {
    const user = getCurrentUserRecord();
    const token = `mock_token_${user.role}_${Date.now()}`;
    if (params.code) {
      // 保留入参形状，方便将来切真实后端：POST /api/v1/auth/login { code, encryptedData, iv }
    }
    return { token, openid: user.openid, userInfo: await this.getCurrentUser() };
  },

  /** PATCH /api/v1/users/me */
  async saveUserInfo(userInfo = {}) {
    const user = getCurrentUserRecord();
    Object.assign(user, userInfo);
    return user.id;
  },

  async isAdmin() {
    const user = getCurrentUserRecord();
    return user.role === C.ROLES.ADMIN;
  },

  async logout() {
    return true;
  },

  /** mock 专用：切换游客 / 地陪 / 管理员视角 */
  async switchRole(role) {
    return switchMockRole(role);
  }
};

/* =============================================================================
   四、过渡适配层（旧页面仍可用，feat-006 ~ feat-012 迁移完成后删除）
   -----------------------------------------------------------------------------
   旧页面（index / clerk detail / appointment / admin）用的是陪玩时期的数据形状，
   这里把新模型映射成旧形状，保证重构过程中 H5 随时可跑。
   注意：状态语义在新旧之间做了「压缩」映射（新 0/1 → 旧 0 待服务），
       因此旧订单页无法区分「待确认 / 已确认」，迁移到 feat-010 后即消失。
   ============================================================================= */

const LEGACY_STATUS = {
  [C.ORDER_STATUS.PENDING_CONFIRM]: 0,
  [C.ORDER_STATUS.CONFIRMED]: 0,
  [C.ORDER_STATUS.COMPLETED]: 1,
  [C.ORDER_STATUS.CANCELLED]: 2
};

function toLegacyClerk(store, guide) {
  return {
    _id: String(guide.id),
    nickname: guide.nickname,
    avatar: guide.avatarUrl,
    sex: guide.id % 2 === 0 ? 2 : 1,
    city: (guideRegionIds(store, guide.id).map((id) => (byId(store.regionTypes, id) || {}).name) || []).join(' / '),
    price: guidePriceFrom(store, guide.id),
    orderCount: guide.orderCount,
    onlineStatus: guide.status === C.GUIDE_STATUS.APPROVED ? 1 : 0,
    skills: guideAttractionIds(store, guide.id)
      .map((id) => (byId(store.attractions, id) || {}).name)
      .filter(Boolean)
      .slice(0, 3),
    introduce: guide.introduce
  };
}

function toLegacyOrder(order) {
  return {
    _id: String(order.id),
    clerkId: String(order.guideId),
    clerkName: order.guideNickname,
    clerkAvatar: order.guideAvatarUrl,
    goodsName: order.packageName,
    appointDate: order.appointDate,
    timeSlot: order.timeSlot === C.TIME_SLOTS.NONE ? C.TIME_SLOTS.MORNING : order.timeSlot,
    price: order.amount,
    remark: order.remark,
    status: LEGACY_STATUS[order.status],
    createTime: order.createdAt
  };
}

export const CategoryApi = {
  /** 旧首页的分类标签 → 区域类型 */
  async getCategoryList() {
    const list = await RegionApi.getRegionList({ onlyWithAttractions: true });
    return list.map((region) => ({ _id: region.code, name: region.name, icon: '' }));
  },
  async createCategory() {
    throw invalidRequest('分类由区域字典维护，MVP 不支持新建');
  }
};

export const ClerkApi = {
  async getClerkList(params = {}) {
    const store = getDb();
    const page = await GuideApi.getGuideList({
      pageNo: params.pageNo,
      pageSize: params.pageSize,
      regionTypeCode: params.categoryId,
      priceMin: params.minPrice,
      priceMax: params.maxPrice,
      sort: params.sort
    });
    let list = page.list.map((guide) => toLegacyClerk(store, byId(store.guides, guide.id)));
    if (params.keyword) {
      list = list.filter((clerk) => clerk.nickname.indexOf(params.keyword) >= 0);
    }
    if (params.sex !== undefined && params.sex !== '') {
      list = list.filter((clerk) => clerk.sex === Number(params.sex));
    }
    return { list, total: page.total };
  },

  async getClerkDetail(clerkId) {
    const store = getDb();
    const guide = await GuideApi.getGuideDetail(clerkId);
    const detail = toLegacyClerk(store, byId(store.guides, guide.id));
    detail.goodsList = guide.packages.map((pkg) => ({
      _id: String(pkg.packageSkuId),
      name: pkg.name,
      description: pkg.durationDesc,
      price: pkg.price
    }));
    return detail;
  },

  async createClerk() {
    throw invalidRequest('地陪由后台创建，MVP 不支持前端新建');
  },

  async updateClerk() {
    throw invalidRequest('MVP 暂不支持编辑地陪');
  },

  async getPendingClerks(pageNo, pageSize) {
    const store = getDb();
    const page = await GuideApi.getPendingGuides({ pageNo, pageSize });
    return { list: page.list.map((guide) => toLegacyClerk(store, byId(store.guides, guide.id))), total: page.total };
  },

  async auditClerk(clerkId, status) {
    await GuideApi.auditGuide(clerkId, {
      status: Number(status) === 1 ? C.GUIDE_STATUS.APPROVED : C.GUIDE_STATUS.REJECTED
    });
  }
};

export const AppointmentApi = {
  async createAppointment(appointInfo = {}) {
    const store = getDb();
    const guideId = Number(appointInfo.clerkId);
    const attractionId = guideAttractionIds(store, guideId)[0];
    const rows = guidePackageRows(store, guideId);
    const packageSkuId = appointInfo.goodsId ? Number(appointInfo.goodsId) : (rows[0] || {}).packageSkuId;
    const order = await OrderApi.createOrder({
      guideId,
      attractionId,
      packageSkuId,
      appointDate: appointInfo.appointDate || appointInfo.date,
      timeSlot: appointInfo.timeSlot,
      peopleCount: appointInfo.peopleCount || 1,
      remark: appointInfo.remark
    });
    return order.id;
  },

  async getMyAppointments(params = {}) {
    const page = await OrderApi.getMyOrders({ ...params, status: '' });
    let list = page.list.map(toLegacyOrder);
    if (params.status !== undefined && params.status !== '' && params.status !== null) {
      list = list.filter((order) => order.status === Number(params.status));
    }
    return { list, total: list.length };
  },

  async getAllAppointments(params = {}) {
    const page = await OrderApi.getAllOrders({ pageNo: params.pageNo, pageSize: params.pageSize, appointDate: params.appointDate });
    let list = page.list.map(toLegacyOrder);
    if (params.status !== undefined && params.status !== '' && params.status !== null) {
      list = list.filter((order) => order.status === Number(params.status));
    }
    return { list, total: list.length };
  },

  async cancelAppointment(appointId) {
    await OrderApi.cancelOrder(appointId, { reason: '游客取消' });
  },

  async completeAppointment(appointId) {
    await OrderApi.completeOrder(appointId);
  }
};

export { seedData as mockSeedData };
