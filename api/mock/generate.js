/**
 * mock 数据生成器（确定性）
 *
 * 设计要点：
 *   1. 确定性：同一个 seed + 同一个"当天"必然生成同一批数据 → 截图、回归、排查都不会飘
 *   2. 无副作用、无依赖：本文件不 import 任何模块，领域常量通过 domain 参数注入
 *      （这样脚本可以脱离构建链直接校验它，见 scripts/check-mock.mjs）
 *   3. 数据自洽：地陪的擅长景点必须落在自己的区域标签内；订单的地陪必须擅长该景点
 *   4. 不含任何评价字段（评分 / 评论），见 docs/mvp-scope.json 的 dev-002
 *
 * 数据规模来自 api/mock/seed.json 的 generators，与 docs/mvp-scope.json 的 mockScale 一致：
 *   52 用户（1 游客 + 1 管理员 + 50 地陪）/ 50 地陪 / 20 景点 / 7 区域 / 3 套餐
 */

/* ---------- 确定性伪随机 ---------- */

/** mulberry32：小巧的确定性随机数发生器，返回 [0,1) */
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 把字符串 seed 折叠成 32 位整数 */
export function hashSeed(text) {
  let hash = 2166136261;
  const source = String(text);
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 组装一组便捷随机方法 */
export function createRandom(seedText) {
  const random = mulberry32(hashSeed(seedText));
  return {
    float: () => random(),
    /** [min, max] 闭区间整数 */
    int(min, max) {
      if (max <= min) return min;
      return min + Math.floor(random() * (max - min + 1));
    },
    pick(list) {
      return list[Math.floor(random() * list.length)];
    },
    /** 从 list 里取 count 个不重复元素 */
    pickMany(list, count) {
      const pool = list.slice();
      const picked = [];
      const size = Math.min(count, pool.length);
      for (let i = 0; i < size; i += 1) {
        picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
      }
      return picked;
    },
    /** 取值落在 [range[0], range[1]] 的个数 */
    countIn(range) {
      return this.int(range[0], range[1]);
    }
  };
}

/* ---------- 小工具 ---------- */

function roundTo10(value) {
  return Math.round(value / 10) * 10;
}

function addDays(base, days) {
  const date = new Date(base.getTime());
  date.setDate(date.getDate() + days);
  return date;
}

/* ---------- 主生成函数 ---------- */

/**
 * @param {object} options
 * @param {object} options.seedData api/mock/seed.json 的内容
 * @param {Date}   options.now      生成基准时间（决定可约日期与订单时间；建议传入固定值以便复核）
 * @param {object} options.domain   领域常量（api/constants.js），注入以保持单一来源
 * @param {string} [options.seed]   随机种子
 */
export function generateMockData({ seedData, now, domain, seed = 'peiwan-chengdu-mvp' }) {
  const rnd = createRandom(seed);
  const config = seedData.generators;
  const { ROLES, GUIDE_STATUS, ORDER_STATUS, BOOKING_TYPES, TIME_SLOTS, BOOKING_TYPE_UI } = domain;
  const { formatDate, nextOrderNo } = domain;

  /* ---------- 地陪头像（mock 阶段用本地素材 /static/guide） ----------
     素材文件按「姓氏拼音 + 名字拼音」命名（caoyiming.jpg = 曹一鸣）。
     为了避免「头像与姓名无关」，有素材的地陪**直接采用文件名反查出来的姓名**，
     其余地陪再随机取名（照片从素材池按下标循环取）—— 同一份 seed 结果始终一致。
     接真实后端后 avatarUrl 由后端返回完整 URL，页面代码不用动。 */
  const avatarDir = config.guideAvatarDir || '';
  const avatarFiles = Array.isArray(config.guideAvatarFiles) ? config.guideAvatarFiles : [];
  const surnamePinyin = config.surnamesPinyin || {};
  const givenPinyin = config.givenNamesPinyin || {};

  /** slug → 姓名（caoyiming → 曹一鸣），用于反查素材文件名 */
  const nameBySlug = {};
  Object.keys(surnamePinyin).forEach((surname) => {
    Object.keys(givenPinyin).forEach((given) => {
      nameBySlug[surnamePinyin[surname] + givenPinyin[given]] = surname + given;
    });
  });

  /** 素材里名字能解析出来的那些（保持文件顺序，姓名去重），index → 素材 */
  const avatarBySlug = {};
  const avatarNamedItems = [];
  const usedAvatarNames = {};
  avatarFiles.forEach((file) => {
    const slug = String(file).replace(/\.[a-z0-9]+$/i, '');
    avatarBySlug[slug] = file;
    const name = nameBySlug[slug];
    if (name && !usedAvatarNames[name]) {
      usedAvatarNames[name] = true;
      avatarNamedItems.push({ file, name });
    }
  });

  /** 昵称形如「青羊 · 曹一鸣」：取「·」后的姓名，首字为姓、其余为名，再转拼音 */
  function avatarSlugOf(nickname) {
    const parts = String(nickname).split('·');
    const name = (parts.length > 1 ? parts[1] : parts[0]).trim();
    const surname = surnamePinyin[name.charAt(0)];
    const given = givenPinyin[name.slice(1)];
    return surname && given ? surname + given : '';
  }

  function avatarMatchOf(nickname) {
    return avatarBySlug[avatarSlugOf(nickname)] || '';
  }

  function guideAvatarUrl(nickname, index) {
    if (!avatarFiles.length) {
      // 素材池为空时退回网络占位图，避免出现空头像
      return `https://i.pravatar.cc/160?img=${(index % config.avatarPoolSize) + 1}`;
    }
    return `${avatarDir}${avatarMatchOf(nickname) || avatarFiles[index % avatarFiles.length]}`;
  }

  const regionTypes = seedData.regionTypes;
  const packageSkus = seedData.packageSkus;
  const attractions = seedData.attractions;

  const baseTime = now instanceof Date ? now : new Date(now);

  /* ---------- 1. 用户：1 游客 + 1 管理员 + 50 地陪 ---------- */
  const guideCount = config.guideCount;
  const users = [
    {
      id: 1,
      openid: 'mock_openid_tourist',
      nickname: config.touristNickname,
      avatarUrl: `https://i.pravatar.cc/160?img=5`,
      phone: '13800000001',
      role: ROLES.TOURIST,
      status: 1,
      createdAt: formatDate(addDays(baseTime, -30))
    },
    {
      id: 2,
      openid: 'mock_openid_admin',
      nickname: config.adminNickname,
      avatarUrl: `https://i.pravatar.cc/160?img=68`,
      phone: '13800000002',
      role: ROLES.ADMIN,
      status: 1,
      createdAt: formatDate(addDays(baseTime, -30))
    }
  ];

  /* ---------- 2. 地陪（50 人） ---------- */
  const guides = [];
  const guideRegionTypes = [];
  const guideAttractions = [];
  const guidePackages = [];
  const guideAvailableDates = [];

  const usedNicknames = new Set();
  let relationId = 0;
  /** 命中「姓名 = 文件名拼音」的地陪数，用于自检（见 stats.guideAvatarMatched） */
  let avatarMatchedCount = 0;

  for (let index = 0; index < guideCount; index += 1) {
    const guideId = index + 1;
    const userId = 2 + guideId;

    // 昵称：区域前缀 + 姓氏 + 名字，去重避免重名。
    // 有头像素材的地陪直接用素材里的姓名，让「头像文件名」与「姓名」一致
    const namedAvatar = avatarNamedItems[index];
    const pickRandomNickname = () =>
      `${rnd.pick(config.areaPrefixes)} · ${rnd.pick(config.surnames)}${rnd.pick(config.givenNames)}`;
    let nickname = namedAvatar
      ? `${rnd.pick(config.areaPrefixes)} · ${namedAvatar.name}`
      : pickRandomNickname();
    while (usedNicknames.has(nickname)) {
      nickname = pickRandomNickname();
    }
    usedNicknames.add(nickname);

    if (avatarMatchOf(nickname)) avatarMatchedCount += 1;

    // 审核状态：以已通过为主，保留少量待审 / 拒绝给后台审核演示
    let status = GUIDE_STATUS.APPROVED;
    if (index >= guideCount - 6 && index < guideCount - 2) status = GUIDE_STATUS.PENDING;
    else if (index >= guideCount - 2) status = GUIDE_STATUS.REJECTED;

    // 区域标签 1-3 个
    const regions = rnd.pickMany(regionTypes, rnd.countIn(config.guideRegionCount));
    const regionIds = regions.map((item) => item.id);
    regions.forEach((region) => {
      relationId += 1;
      guideRegionTypes.push({ id: relationId, guideId, regionTypeId: region.id });
    });

    // 擅长景点 1-4 个：必须落在自己的区域标签内（保证数据自洽）
    const candidateAttractions = attractions.filter((item) => regionIds.indexOf(item.regionTypeId) >= 0);
    const pickedAttractions = rnd.pickMany(candidateAttractions, rnd.countIn(config.guideAttractionCount));
    pickedAttractions.forEach((attraction) => {
      relationId += 1;
      guideAttractions.push({ id: relationId, guideId, attractionId: attraction.id });
    });

    // 套餐报价 1-3 个，价格落在建议价区间内（hourly 为每小时单价）
    const pickedPackages = rnd.pickMany(packageSkus, rnd.countIn(config.guidePackageCount));
    pickedPackages.forEach((pkg) => {
      relationId += 1;
      guidePackages.push({
        id: relationId,
        guideId,
        packageSkuId: pkg.id,
        price: roundTo10(rnd.int(pkg.priceMin, pkg.priceMax)),
        enabled: 1
      });
    });

    // 可约档期：未来 1-14 天内 3-5 天，按该地陪可售套餐的预约类型铺开
    // 注意：pickedPackages 是 seed 里的套餐 SKU（没有 enabled 字段），
    // 这里不能再按 enabled 过滤，否则档期永远生成不出来（详情页可约日期为空 → 游客下不了单）
    const availableDays = rnd.int(3, 5);
    const bookingTypes = pickedPackages.map((pkg) => pkg.bookingType);
    const uniqueBookingTypes = bookingTypes.filter((item, i) => bookingTypes.indexOf(item) === i);

    for (let day = 0; day < availableDays; day += 1) {
      const date = formatDate(addDays(baseTime, rnd.int(1, 14)));
      uniqueBookingTypes.forEach((bookingType) => {
        relationId += 1;
        guideAvailableDates.push({
          id: relationId,
          guideId,
          appointDate: date,
          bookingType,
          isAvailable: 1
        });
      });
    }

    const introduceTemplate = config.introduceTemplates[index % config.introduceTemplates.length];
    const mainRegion = regions[0];

    guides.push({
      id: guideId,
      userId,
      nickname,
      avatarUrl: guideAvatarUrl(nickname, index),
      introduce: introduceTemplate
        .replace('{area}', mainRegion.name)
        .replace('{scene}', mainRegion.scene)
        .replace('{years}', String(rnd.int(1, 8))),
      orderCount: rnd.int(0, 260),
      status,
      auditedBy: status === GUIDE_STATUS.PENDING ? null : 2,
      auditedAt: status === GUIDE_STATUS.PENDING ? null : formatDate(addDays(baseTime, -rnd.int(1, 20))),
      createdAt: formatDate(addDays(baseTime, -rnd.int(10, 120)))
    });

    users.push({
      id: userId,
      openid: `mock_openid_guide_${guideId}`,
      nickname,
      avatarUrl: guides[guides.length - 1].avatarUrl,
      phone: `1380000${String(1000 + guideId).slice(-4)}`,
      role: ROLES.GUIDE,
      status: status === GUIDE_STATUS.REJECTED ? 0 : 1,
      createdAt: formatDate(addDays(baseTime, -rnd.int(10, 120)))
    });
  }

  /* ---------- 3. 订单（四态全覆盖） ---------- */
  const approvedGuides = guides.filter((guide) => guide.status === GUIDE_STATUS.APPROVED);

  // 可被下单的地陪：已通过 + 有擅长景点 + 有套餐（游客是先选景点再选地陪）
  const orderableGuides = approvedGuides.filter(
    (guide) =>
      guideAttractions.some((row) => row.guideId === guide.id) &&
      guidePackages.some((row) => row.guideId === guide.id)
  );

  // 已通过却不可下单的地陪：正常情况下必须为空，否则说明生成逻辑有 bug
  const notOrderableGuideIds = approvedGuides
    .filter((guide) => orderableGuides.indexOf(guide) < 0)
    .map((guide) => guide.id);
  const statusPlan = Object.keys(config.orderStatusPlan)
    .map((status) => ({ status: Number(status), count: config.orderStatusPlan[status] }));
  const plan = [];
  statusPlan.forEach((item) => {
    for (let i = 0; i < item.count; i += 1) plan.push(item.status);
  });

  const orders = [];
  const orderNos = [];
  const packageById = (id) => packageSkus.find((pkg) => pkg.id === id);

  plan.forEach((status, index) => {
    const guide = orderableGuides[index % orderableGuides.length];
    const attractionIdsOfGuide = guideAttractions
      .filter((item) => item.guideId === guide.id)
      .map((item) => item.attractionId);
    const attractionId = rnd.pick(attractionIdsOfGuide) || attractionIdsOfGuide[0] || attractions[0].id;
    const attraction = attractions.find((item) => item.id === attractionId) || attractions[0];

    const guidePackageRows = guidePackages.filter((item) => item.guideId === guide.id);
    const guidePackage = guidePackageRows[index % guidePackageRows.length] || guidePackages[0];
    const pkg = packageById(guidePackage.packageSkuId);

    const bookingType = pkg.bookingType;
    const ui = BOOKING_TYPE_UI[bookingType];
    const hours = bookingType === BOOKING_TYPES.HOURLY ? rnd.int(2, 6) : 0;
    const timeSlot = ui.showTimeSlot
      ? (rnd.int(0, 1) === 0 ? TIME_SLOTS.MORNING : TIME_SLOTS.AFTERNOON)
      : TIME_SLOTS.NONE;

    const createdAt = addDays(baseTime, -rnd.int(0, 10));
    const orderNo = nextOrderNo(orderNos, bookingType, createdAt);
    orderNos.push(orderNo);

    // 待确认里保留一部分「地陪还没接单」，让地陪端接单页有数据
    const accepted = status === ORDER_STATUS.PENDING_CONFIRM ? index >= 3 : true;
    // 每 5 单里有 1 单约在「今天」：否则「今日订单」（后台）与「今日完成」（地陪端）
    // 两个统计会结构性恒为 0，演示时看起来像坏了
    const appointDate = index % 5 === 0
      ? formatDate(baseTime)
      : formatDate(addDays(baseTime, rnd.int(1, 14)));
    const amount = bookingType === BOOKING_TYPES.HOURLY
      ? guidePackage.price * hours
      : guidePackage.price;

    orders.push({
      id: index + 1,
      orderNo,
      touristUserId: 1,
      guideId: guide.id,
      attractionId: attraction.id,
      packageSkuId: pkg.id,
      bookingType,
      appointDate,
      timeSlot,
      hours,
      peopleCount: rnd.int(1, 6),
      remark: rnd.pick(['想拍些照片，避开人流', '带小孩，节奏慢一点', '需要地铁站集合', '主要想喝茶逛巷子', '']),
      amount,
      status,
      // 冗余快照（下单时写入，主体后续改名也不回改历史订单）
      attractionName: attraction.name,
      packageName: pkg.name,
      guideNickname: guide.nickname,
      guideAvatarUrl: guide.avatarUrl,
      guideAcceptedAt: accepted ? formatDate(addDays(createdAt, 0)) : null,
      confirmedBy: status === ORDER_STATUS.PENDING_CONFIRM ? null : 2,
      confirmedAt: status === ORDER_STATUS.PENDING_CONFIRM ? null : formatDate(addDays(createdAt, 1)),
      finishedAt: status === ORDER_STATUS.COMPLETED ? formatDate(addDays(createdAt, 3)) : null,
      cancelledAt: status === ORDER_STATUS.CANCELLED ? formatDate(addDays(createdAt, 2)) : null,
      cancelReason: status === ORDER_STATUS.CANCELLED ? rnd.pick(['行程有变', '地陪拒单', '时间冲突']) : '',
      createdAt: formatDate(createdAt),
      updatedAt: formatDate(createdAt)
    });
  });

  return {
    seed,
    generatedAt: baseTime.toISOString(),
    /* 字典表原样带出：接口层（区域列表 / 景点列表 / 套餐）要按 id 查它们，
       缺了这三张表，所有涉及区域与景点的接口都会在运行时抛 undefined */
    regionTypes,
    packageSkus,
    attractions,
    users,
    guides,
    guideRegionTypes,
    guideAttractions,
    guidePackages,
    guideAvailableDates,
    orders,
    stats: {
      users: users.length,
      guides: guides.length,
      approvedGuides: approvedGuides.length,
      orderableGuides: orderableGuides.length,
      // 诊断：已通过却不可下单的地陪（缺擅长景点 / 缺套餐），正常情况下必须为空
      notOrderableGuides: notOrderableGuideIds,
      guidesWithoutAttractions: guides
        .filter((guide) => !guideAttractions.some((row) => row.guideId === guide.id))
        .map((guide) => guide.id),
      guidesWithoutRegions: guides
        .filter((guide) => !guideRegionTypes.some((row) => row.guideId === guide.id))
        .map((guide) => guide.id),
      attractions: attractions.length,
      regionTypes: regionTypes.length,
      packageSkus: packageSkus.length,
      /* 地陪头像素材池 / 素材里可解析出的姓名数 / 姓名命中数：素材缺文件或改名时靠这里暴露 */
      guideAvatarPool: avatarFiles.length,
      guideAvatarNamed: avatarNamedItems.length,
      guideAvatarMatched: avatarMatchedCount,
      orders: orders.length,
      ordersByStatus: orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {})
    }
  };
}
