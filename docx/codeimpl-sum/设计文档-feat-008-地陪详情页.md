# 设计文档：feat-008 游客端-地陪详情页

- 功能：feat-008
- 日期：2026-09-26
- 状态：**已完成**
- 原型：`design/html/prototype.html` 第 03 屏
- 相关：`docs/mvp-scope.json` 的 `deviations.dev-002`（评价不做）

---

## 1. 目标与范围

### 目标

改造 `pages/clerk/detail.vue`：把「达人详情 + 预约表单」拆成「详情页 + 下单页」两步，本页只负责让游客**想清楚选谁、选哪个套餐、哪天去**。

1. 身份块：头像 / 昵称 / 区域标签（首个为实底）/ 简介
2. 三项指标：接单数 / 本周可约天数 / 服务套餐数
3. 擅长景点：chip 列表（名称来自接口）
4. 服务套餐：单选（3 个 SKU），选中项决定下游控件与金额
5. 可约日期：横向日期横条，选中态为竹青实底
6. 底部固定操作栏：`合计 · 套餐名` + 金额（朱砂）+「立即预约」

### 范围之外

| 不做 | 原因 |
|---|---|
| 评价区块（评分 / 评价列表） | `dev-002`：评价展示与提交都不做 |
| 预约表单（日期 / 时段 / 备注 / 提交） | 整体剥离到 `feat-009` 的下单页；本页只带参数跳转 |
| 地陪照片墙 / 行程介绍 | 需要素材与内容运营，MVP 不做 |

---

## 2. 涉及的接口（对照 `docx/接口文档.md` 第 4 节）

| 方法 | 入参 | 用途 |
|---|---|---|
| `GuideApi.getGuideDetail(guideId)` | `guideId` | 身份块 / 擅长景点 / 套餐 / 指标 |
| `GuideApi.getGuideAvailableDates(guideId, { days: 14 })` | `days` | 可约日期横条 |

**本 feat 给接口补了一个字段**：`Guide.attractions = [{ id, code, name }]`。
原先只有 `attractionIds`，详情页要显示「擅长景点」的名字就得再发一次景点列表请求逐个查（N+1）。改为接口层一次补齐，HTTP 版由后端 JOIN 即可。已同步 `docx/接口文档.md`。

---

## 3. 文件结构与关键实现

```
navbar
panel(身份块)     identity：avatar 60×60 + 昵称 + 区域标签；introduce；metrics 三格
panel(擅长景点)   tag--quiet chips
panel(服务套餐)   option 单选行：radio + 名称/时长 + 朱砂价「¥300 / 半日」
panel(可约日期)   date 横条 56×56：dow（今天/周一…）+ MM-DD
bottom-bar        price-block（合计 · 套餐名 + 金额）+ Filled「立即预约」
```

三个关键实现：

### 3.1 日期可用性由「套餐类型」过滤

`getGuideAvailableDates` 返回 `AvailableDate = { appointDate, bookingTypes[], isAvailable }`。只要一次请求（不传 `bookingType`），页面按当前选中套餐的类型过滤：

```js
availableDates() {
  const bookingType = this.selectedPackage.bookingType;
  return this.availableDateRows.filter(
    (row) => row.isAvailable === 1 && (row.bookingTypes || []).indexOf(bookingType) >= 0
  );
}
```

好处：切换套餐时不需要重新请求；代价是单次返回 14 天的数据（体量可控）。

**切换套餐后的日期校正**：若当前选中日期不支持新类型，自动回落到第一个可约日期（`syncDateSelection()`），避免出现「日期不支持该套餐」的非法提交。

### 3.2 「本周可约」的口径

指标取「未来 7 天（含今天）内 `isAvailable === 1` 的日期数」：

```js
const limit = this.formatDate(new Date(Date.now() + 6 * 24 * 3600 * 1000));
```

与「套餐类型」无关，因此显示的是地陪整体档期的宽裕程度。

### 3.3 日期解析不用 `new Date('YYYY-MM-DD')`

`'2026-09-27'` 会被 JS 当 UTC 解析，东八区下会差一天。统一用 `parseDate()` 手动拆分：

```js
const [year, month, day] = String(appointDate).split('-').map(Number);
return new Date(year, (month || 1) - 1, day || 1);
```

---

## 4. 状态与数据流

```
onLoad(id, attractionId?)
 ├─ loadDetail()          → guide（套餐默认选第 0 个）
 └─ loadAvailableDates()  → availableDateRows（14 天）
        ↓ syncDateSelection()：当前日期不支持所选套餐类型时，回落到第一个可约日期

点套餐 → packageIndex 变化 → syncDateSelection()
点日期 → selectedDate 变化
点「立即预约」→ 校验套餐与日期 → 
   /pages/order/create?guideId=&packageSkuId=&attractionId=&appointDate=
```

景点取值优先级：上游带过来的 `attractionId` → 否则取地陪擅长景点的第一个。

---

## 5. 验证证据

| 验证项 | 命令 | 结果 |
|---|---|---|
| mock 数据层 | `node scripts/check-mock.mjs` | 通过：44/44 已通过地陪可被下单（详情页展示的数据与可下单集合一致） |
| 资产保真 | `node scripts/verify-assets.mjs` | 通过（`pages/clerk/detail.vue` 已登记原因并刷新哈希；告警 0 条） |
| 令牌校验 | `node scripts/check-tokens.mjs` | 通过（页面无硬编码旧色值） |
| 评价字段 | `node scripts/check-mock.mjs` | 通过：mock 与接口中均无评价字段（`dev-002` 由脚本看住） |
| 编辑器诊断 | — | 0 error 0 warning |

---

## 6. 遗留问题

1. **未做真机人工走查**：日期横条滚动、套餐切换时的日期回落需要人工确认体感。
2. **一次性取 14 天档期**：若后端档期数据量大，建议按 `bookingType` 分次请求，或让后端返回「按类型分组的可用日期」。
3. **没有「已满」的可视化**：不可约日期直接不显示；如产品希望显示「已约满」，需要在 date 横条里渲染禁用态。
4. **简介长度未截断**：地陪介绍字数多时会把身份块撑高，建议后续加「展开/收起」。
