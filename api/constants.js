/**
 * 领域常量（单一来源）
 *
 * 这里是订单状态、预约类型、时段、角色、订单号规则的唯一定义处：
 *   - 页面只允许引用这里的常量，不要在各页面各写一套映射表（feat-005 会做收口）
 *   - 本文件不 import 任何东西，便于脚本静态校验（scripts/check-mock.mjs）
 *
 * 对齐：docx/database/schema.sql 的 ENUM 与注释、docs/mvp-scope.json 的 orderStatusMVP
 */

/* ---------- 角色 ---------- */
export const ROLES = {
  TOURIST: 'tourist',
  GUIDE: 'guide',
  ADMIN: 'admin'
};

export const ROLE_LABELS = {
  [ROLES.TOURIST]: '游客',
  [ROLES.GUIDE]: '地陪',
  [ROLES.ADMIN]: '管理员'
};

/* ---------- 订单状态（四态） ---------- */
export const ORDER_STATUS = {
  PENDING_CONFIRM: 0,
  CONFIRMED: 1,
  COMPLETED: 2,
  CANCELLED: 3
};

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING_CONFIRM]: '待确认',
  [ORDER_STATUS.CONFIRMED]: '已确认',
  [ORDER_STATUS.COMPLETED]: '已完成',
  [ORDER_STATUS.CANCELLED]: '已取消'
};

export const ORDER_STATUS_KEYS = {
  [ORDER_STATUS.PENDING_CONFIRM]: 'pending-confirm',
  [ORDER_STATUS.CONFIRMED]: 'confirmed',
  [ORDER_STATUS.COMPLETED]: 'completed',
  [ORDER_STATUS.CANCELLED]: 'cancelled'
};

/**
 * 状态流转白名单（无外键 → 完整性靠应用层，这里是唯一裁判）
 *   0 待确认 --平台确认--> 1 已确认 --完成--> 2 已完成
 *   0 / 1  --取消 或 地陪拒单--> 3 已取消
 *   2 / 3 为终态
 */
export const ORDER_STATUS_TRANSITIONS = {
  [ORDER_STATUS.PENDING_CONFIRM]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.CANCELLED]: []
};

/* ---------- 预约类型（由套餐决定，见 docs/mvp-scope.json 的 bookingTypeUi） ---------- */
export const BOOKING_TYPES = {
  HALF_DAY: 'half-day',
  FULL_DAY: 'full-day',
  HOURLY: 'hourly'
};

export const BOOKING_TYPE_LABELS = {
  [BOOKING_TYPES.HALF_DAY]: '半天',
  [BOOKING_TYPES.FULL_DAY]: '全天',
  [BOOKING_TYPES.HOURLY]: '小时加购'
};

/** 价格的单位文案（列表页「¥300 起 / 半日」用），同样是唯一来源 */
export const BOOKING_TYPE_UNITS = {
  [BOOKING_TYPES.HALF_DAY]: '半日',
  [BOOKING_TYPES.FULL_DAY]: '全天',
  [BOOKING_TYPES.HOURLY]: '小时'
};

/** 下单页控件规则：类型跟随套餐，不单独放类型选择器 */
export const BOOKING_TYPE_UI = {
  [BOOKING_TYPES.HALF_DAY]: { showTimeSlot: true, showHours: false, slotOptions: ['morning', 'afternoon'] },
  [BOOKING_TYPES.FULL_DAY]: { showTimeSlot: false, showHours: false, slotOptions: [] },
  [BOOKING_TYPES.HOURLY]: { showTimeSlot: false, showHours: true, slotOptions: [] }
};

/* ---------- 时段 ---------- */
export const TIME_SLOTS = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  NONE: 'none'
};

export const TIME_SLOT_LABELS = {
  [TIME_SLOTS.MORNING]: '上午',
  [TIME_SLOTS.AFTERNOON]: '下午',
  [TIME_SLOTS.NONE]: '全天'
};

/* ---------- 地陪审核状态 ---------- */
export const GUIDE_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2
};

export const GUIDE_STATUS_LABELS = {
  [GUIDE_STATUS.PENDING]: '待审核',
  [GUIDE_STATUS.APPROVED]: '已通过',
  [GUIDE_STATUS.REJECTED]: '已拒绝'
};

/* ---------- 通用状态位 ---------- */
export const COMMON_STATUS = { ENABLED: 1, DISABLED: 0 };

/* ---------- 分页默认值（与现有页面约定一致：pageNo 从 1 开始） ---------- */
export const DEFAULT_PAGE = { pageNo: 1, pageSize: 10 };

/* ---------- 订单号规则 ----------
 * CD + YYMMDD + 业务类型(A 半天 / B 全天 / C 专项·小时) + 4 位当日序号 = 13 位
 * 见 docx/database/数据库设计.md「订单号规则」
 */
export const ORDER_NO = {
  prefix: 'CD',
  length: 13,
  seqLength: 4,
  typeLetters: {
    [BOOKING_TYPES.HALF_DAY]: 'A',
    [BOOKING_TYPES.FULL_DAY]: 'B',
    [BOOKING_TYPES.HOURLY]: 'C'
  }
};

/** 把时间格式化成 YYMMDD（订单号用） */
export function formatYYMMDD(value) {
  const date = value instanceof Date ? value : new Date(value);
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/** 把时间格式化成 YYYY-MM-DD（数据字段用，避免时区偏移） */
export function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** 订单号前缀：CD + YYMMDD + 类型字母（共 9 位），用于取当日同类型最大序号 */
export function orderNoPrefix(bookingType, value) {
  const letter = ORDER_NO.typeLetters[bookingType];
  if (!letter) {
    throw new Error(`未知的预约类型：${bookingType}`);
  }
  return `${ORDER_NO.prefix}${formatYYMMDD(value)}${letter}`;
}

/** 组装订单号：seq 从 1 开始，左补零到 4 位 */
export function buildOrderNo(bookingType, value, seq) {
  return `${orderNoPrefix(bookingType, value)}${String(seq).padStart(ORDER_NO.seqLength, '0')}`;
}

/** 从订单号里取序号（不是该格式返回 0） */
export function parseOrderNoSeq(orderNo) {
  if (typeof orderNo !== 'string' || orderNo.length !== ORDER_NO.length) {
    return 0;
  }
  const seq = Number(orderNo.slice(ORDER_NO.prefix.length + 6 + 1));
  return Number.isFinite(seq) ? seq : 0;
}

/** 在一批订单号里取「当日同类型」的下一个序号并生成订单号（撞号由唯一索引兜底） */
export function nextOrderNo(existingOrderNos, bookingType, value) {
  const prefix = orderNoPrefix(bookingType, value);
  const max = existingOrderNos
    .filter((no) => typeof no === 'string' && no.startsWith(prefix))
    .reduce((acc, no) => Math.max(acc, parseOrderNoSeq(no)), 0);
  return buildOrderNo(bookingType, value, max + 1);
}

/* ---------- 小工具 ---------- */
export function orderStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] || '';
}

export function bookingTypeLabel(bookingType) {
  return BOOKING_TYPE_LABELS[bookingType] || '';
}

export function bookingTypeUnit(bookingType) {
  return BOOKING_TYPE_UNITS[bookingType] || '';
}

export function timeSlotLabel(timeSlot) {
  return TIME_SLOT_LABELS[timeSlot] || '';
}

/** 状态流转是否合法 */
export function canTransit(from, to) {
  const allowed = ORDER_STATUS_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.indexOf(to) >= 0;
}

/** 订单在业务上是否属于「待地陪接单」（状态 0 且地陪还没接） */
export function isWaitingGuideAccept(order) {
  return !!order && order.status === ORDER_STATUS.PENDING_CONFIRM && !order.guideAcceptedAt;
}

/** 订单在业务上是否属于「进行中」（平台已确认且未完成）—— 后台口径 */
export function isInProgress(order) {
  return !!order && order.status === ORDER_STATUS.CONFIRMED;
}

/**
 * 地陪是否已「接下」这一单 —— 地陪端口径，与后台口径不同
 *
 * 接单只写 guideAcceptedAt，状态仍是 0 待确认（等平台人工确认档期）。
 * 若地陪端「进行中」只按 status === 1 统计，地陪接完单后订单会同时从
 * 「待接单」与「进行中」两个列表里消失。因此地陪端的「进行中」=
 * 我已接下的单：待平台确认 + 平台已确认。
 */
export function isGuideCommitted(order) {
  if (!order) return false;
  if (order.status === ORDER_STATUS.CONFIRMED) return true;
  return order.status === ORDER_STATUS.PENDING_CONFIRM && !!order.guideAcceptedAt;
}
