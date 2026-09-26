# 设计文档：feat-007 游客端-地陪列表页（按景点筛选）

- 功能：feat-007
- 日期：2026-09-26
- 状态：**已完成**
- 原型：`design/html/prototype.html` 第 02 屏
- 相关：`docs/mvp-scope.json` 的 `deviations.dev-001`（景点 → 地陪的下钻关系）

---

## 1. 目标与范围

### 目标

新增 `/pages/guide/list`，只列**能带指定景点且已通过审核**的地陪，让游客在「选完地方」后立刻看到「谁能带」。

1. 导航栏：返回 + 「XX的地陪」标题
2. 摘要行：`共 N 位可约 · 半天约 4-5 小时，全天 8-10 小时`
3. 二级 chip 筛选：半日 / 全天 / 专项 + 价格排序
4. 地陪卡：头像 / 昵称 / 接单数 / 区域标签 / 服务类型 / 朱砂起价 + 「看详情」
5. 分页三态与空状态

### 范围之外

| 不做 | 原因 |
|---|---|
| 性别筛选、评分筛选 | 按 `dev-002` 全站不做评价；性别不是选地陪的决策维度 |
| 价格区间滑块 | MVP 只有 3 个套餐 SKU，力度不够；先给「价格从低到高」排序 |
| 地图 / 距离排序 | MVP 不做实时定位 |

---

## 2. 涉及的接口（对照 `docx/接口文档.md` 第 4 节）

| 方法 | 入参 | 用途 |
|---|---|---|
| `GuideApi.getGuideList(params)` | `{ pageNo, pageSize, attractionId, bookingType, sort }` | 列表 + 分页；`sort='priceAsc'` 按起价升序，缺省按接单数降序 |

用到的字段：`Guide = { id, nickname, avatarUrl, orderCount, regionTypes[], bookingTypes[], priceFrom, packages[] }`。

**本 feat 新增常量**：`api/constants.js` 增加 `BOOKING_TYPE_UNITS = { 'half-day': '半日', 'full-day': '全天', 'hourly': '小时' }` 与 `bookingTypeUnit()`。
原因：卡片要显示「¥300 起 **/ 半日**」，这个单位以前没有唯一来源，不能在页面里再写一份映射（`feat-005` 刚把同类问题收口过）。

---

## 3. 文件结构与关键实现

新增 `pages/guide/list.vue`，并注册到 `pages.json`（`navigationStyle: custom`）。

### 3.1 起价单位取「最便宜的那个套餐」

```js
priceUnit(item) {
  const packages = item.packages || [];
  if (!packages.length) return '次';
  const cheapest = packages.reduce((min, pkg) => (pkg.price < min.price ? pkg : min), packages[0]);
  return bookingTypeUnit(cheapest.bookingType) || '次';
}
```

`priceFrom` 是地陪的最低报价，但「最低价对应哪种套餐」接口没有直接给，因此在前端按 `price` 取最小值推导单位。**HTTP 版建议后端直接返回 `priceFromUnit`**，省掉这段推导（已记入遗留问题）。

### 3.2 一级/二级筛选分层

- 一级（区域）：在首页，文字页签
- 二级（预约类型 + 排序）：本页 chip

排序 chip 与筛选项**不同类**，因此用「虚线边框 + 竹青文字」区分，而不是再加一种底色（`chip--lead`）。

### 3.3 卡片与按钮

- 头像 60×60 方形圆角（不是圆形），容器底色 `$ds-primary-container` 兜底
- 价格用朱砂 `$ds-tertiary` + `$ds-fs-title-lg`，是卡片里最大的数字
- 「看详情」用 **Tonal** 按钮（`primary-container` 底 + 深竹字），整张卡也可点，两者都进详情页

---

## 4. 状态与数据流

```
onLoad(options) 读取 attractionId 与 name（decodeURIComponent）
      ↓
loadGuides(true) → GuideApi.getGuideList({ attractionId, bookingType?, sort?, pageNo, pageSize })
      ↓
chip「半日/全天/专项」→ bookingType 变化 → 重新加载（重置分页）
chip「价格从低到高/接单从多到少」→ sort 在 '' 与 'priceAsc' 间切换 → 重新加载
触底 → 追加下一页（hasMore 由接口返回）
点卡片/看详情 → /pages/clerk/detail?id=guideId&attractionId=xxx（把景点带下去，供下单页预填）
```

---

## 5. 验证证据

| 验证项 | 命令 | 结果 |
|---|---|---|
| 路由注册 | `node scripts/verify-assets.mjs` | 通过：`pages/guide/list` 已注册，`pages.json` 共 11 个页面 |
| 资产保真 | 同上 | 通过（`api/constants.js` 与 `pages.json` 均非在册资产 / 已刷新） |
| mock 边界 | `node scripts/check-mock.mjs` | 通过：`attractionId` 过滤下 44/44 已通过地陪可被下单，页面未直连数据源 |
| 令牌校验 | `node scripts/check-tokens.mjs` | 通过 |
| 编辑器诊断 | — | 0 error 0 warning |

---

## 6. 遗留问题

1. **未做真机人工走查**：chip 横向滚动、分页加载观感待确认。
2. **`priceFromUnit` 靠前端推导**：建议 HTTP 版在 `Guide` 里直接返回起价对应的单位，去掉页面里的 `reduce`。
3. **摘要行的时长是写死的文案**（「半天约 4-5 小时，全天 8-10 小时」）：档期时长实际由套餐 `durationDesc` 决定，多语言或多套餐变体时应改为动态拼接。
4. **区域标签最多显示 2 个**：地陪可带多个区域时只展示前 2 个，剩余信息在详情页。
