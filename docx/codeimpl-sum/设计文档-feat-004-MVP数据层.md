# 设计文档：feat-004 MVP 数据层（mock 优先）

- 功能：feat-004
- 日期：2026-09-26
- 状态：**已完成**（`feature_list.json` 中标记 done）
- 规范来源：`.codebuddy/skills/api-design/SKILL.md`、`.codebuddy/skills/database-design/SKILL.md`
- 相关：`docs/mvp-scope.json`（scope / deviations / mockScale）、`docx/database/schema.sql` + `seed.sql`、`docx/接口文档.md`

---

## 1. 目标与范围

### 目标

1. 落地 MVP 领域模型：7 区域（字典）/ 20 景点 / 3 套餐 SKU / 3 种预约类型 / 50 地陪 / 四态订单 / 3 种角色
2. 全部走 mock（`USE_MOCK = true`），且**每个方法签名与未来的 HTTP 实现一一对应**（dev-004）
3. 把「数据库无外键 → 应用层保证完整性」的四项职责落成代码（dev-005）
4. 订单四态与订单号规则成为全站唯一来源，供 feat-005 之后页面直接引用
5. 整体重写 `docx/接口文档.md`（设计文档的接口对照基准）

### 范围之外（刻意不做）

| 不做 | 原因 |
|---|---|
| 真实 HTTP 请求 | dev-004：MVP 先 mock；`api/http.js` 只固定路由表与请求封装，方法抛 `NOT_IMPLEMENTED` |
| 页面改造 | 属 feat-006 ~ feat-012；本次只提供数据层，并保留旧模块名让旧页面继续可跑 |
| 评价 / 评分字段 | dev-002 明确不做；`check-mock.mjs` 会拦截 `rating` / `review` / `score` |
| 区域管理界面 | 用户确认「数据结构做足、界面延后」，不进实现计划 |
| 钱包 / 优惠券 / IM / 分销 | `outOfScope` |

---

## 2. 涉及的接口（对照 `docx/接口文档.md`）

| 模块 | 方法数 | 说明 |
|---|---|---|
| `RegionApi` | 1 | 区域字典，默认只返回「启用且下有在售景点」的区域 |
| `AttractionApi` | 2 | 景点列表（按区域 + 分页）/ 详情 |
| `PackageApi` | 1 | 3 个套餐 SKU；`bookingType` 决定下单页控件 |
| `GuideApi` | 5 | 地陪列表（核心：按景点筛）/ 详情 / 可约日期 / 待审列表 / 审核 |
| `OrderApi` | 10 | 下单 + 三类列表 + 详情 + 接单 / 拒单 / 确认 / 完成 / 取消 |
| `UserApi` | 6 | 当前用户 / 登录 / 保存资料 / isAdmin / 登出 / mock 切角色 |
| 过渡适配层 | 3 模块 | `CategoryApi` / `ClerkApi` / `AppointmentApi`，仅为旧页面不白屏，迁移完成后删除 |

HTTP 路由已在 `api/http.js` 的 `ROUTES` 中逐条固定（方法 + 路径 + 入参位置），与 `docx/接口文档.md` 第 1-6 节一一对应。

---

## 3. 文件结构与关键实现

```
api/
├── index.js          数据层出口：USE_MOCK 开关 + 模块导出 + 过渡适配层选择
├── constants.js      领域常量（无 import）：订单四态、流转白名单、预约类型、订单号规则
├── errors.js         统一错误契约（无 import）：ApiError + ERROR_CODES + HTTP 状态映射
├── http.js           HTTP 适配层骨架：ROUTES 路由表 + createRequester + createHttpAdapter
└── mock/
    ├── seed.json     静态字典：7 区域 / 3 套餐 / 20 景点（与 seed.sql 对齐）+ 生成素材池
    ├── generate.js   确定性生成器（无 import）：52 用户 / 50 地陪 / 关系 / 16 订单
    └── index.js      内存仓库 + 业务规则（查询、分页、校验、状态流转、订单号）+ 旧模块适配
```

### 3.1 为什么 constants.js / generate.js 必须「无 import」

项目没有测试框架，`scripts/check-mock.mjs` 用「去掉顶层 `export` 关键字后 `new Function` 求值」的方式直接跑这两个文件，从而在不引入构建链的前提下校验生成逻辑（规模、确定性、自洽性、订单号格式）。一旦它们引用了其它模块，这个校验就失效，所以文件头都写明了这条约束，校验脚本也会检查是否出现 `import`。

### 3.2 确定性生成

- `mulberry32(seed)` + `hashSeed('peiwan-chengdu-mvp')`：同 seed + 同一「当天」→ 完全一致的数据（校验脚本实测两次生成 `JSON.stringify` 相等）
- 日期类字段基于运行当天计算（可约档期必须落在未来），其余字段完全确定
- 50 个地陪昵称 = `区域前缀 · 姓氏+名字`，并做重名去重
- 审核状态分布：44 已通过 / 4 待审核 / 2 已拒绝（保留少量待审供后台演示；`feat-012` 的审核页需要真实数据）

### 3.3 数据自洽（本次重点）

| 不变量 | 实现 | 校验 |
|---|---|---|
| 地陪的擅长景点必须落在其区域标签内 | 生成时以 `regionTypeId ∈ 该地陪区域` 过滤候选景点 | `check-mock.mjs` 逐行核对 |
| 地陪报价必须落在套餐建议价区间 | `roundTo10(int(priceMin, priceMax))`（区间端点都是 10 的倍数，不会越界） | 逐行核对 |
| 已通过的地陪必须有区域标签 / 擅长景点 / 套餐 | 生成保证 + 不变量断言 | 三个方向各查一次 |
| 订单只能给「可下单」的地陪（已通过 + 有关系） | `orderableGuides` 过滤 | `stats.notOrderableGuides` 必须为空 |
| 订单的四态齐全、订单号唯一且类型字母与套餐一致 | 状态计划表 + `nextOrderNo` | 逐条核对 |

### 3.4 订单号（唯一实现来源）

`api/constants.js` 提供 `orderNoPrefix` / `buildOrderNo` / `nextOrderNo` / `parseOrderNoSeq`，mock 与校验脚本共用：
`CD + YYMMDD + 类型字母(A/B/C) + 4 位序号` = 13 位；序号取「当日同类型 `MAX + 1`」，前缀匹配可用 `uk_orders_order_no` 索引。

### 3.5 状态机与「待接单」的表达

四态不足以表达「地陪已接单但平台还没确认」，因此：

- `status = 0 待确认` 覆盖「待地陪接单」与「待平台确认」两个子阶段
- `guideAcceptedAt` 区分二者：为空 = 待接单（地陪端接单页的数据来源），有值 = 待平台确认
- `acceptOrder` **不改变 status**，只写 `guideAcceptedAt`（原型 06 屏的「接单 / 拒单」即此语义）

> 这处建模补充已同步回 `docx/database/schema.sql`（`orders.guide_accepted_at`）与数据库设计文档。

### 3.6 过渡适配层（迁移期不白屏）

旧页面（`index` / `clerk/detail` / `appointment/my` / `admin/*`）仍在用 `ClerkApi` / `CategoryApi` / `AppointmentApi`，本次保留同名模块并映射到新模型：

- `skills` ← 擅长景点名、`city` ← 区域名、`goodsList` ← 套餐，旧页面显示正常且数据真实（50 地陪）
- **状态做了压缩映射**：新 `0 待确认` / `1 已确认` → 旧 `0 待服务`，新 `2 已完成` → 旧 `1`，新 `3 已取消` → 旧 `2`。旧订单页因此无法区分「待确认 / 已确认」，`feat-010` 迁移后消失
- 删除条件：`feat-006 ~ feat-012` 完成

---

## 4. 状态与数据流

### 4.1 游客下单（`createOrder`）

```
页面(下单页) → OrderApi.createOrder(payload)
  ├─ 必填校验：guideId / attractionId / packageSkuId / appointDate
  ├─ 主体校验：景点上架？地陪已通过？套餐可售？
  ├─ 关系校验：地陪擅长该景点？地陪开通该套餐？
  ├─ 类型校验：半天必须带上午/下午；小时加购 must 1-12 小时；人数 1-9
  ├─ 档期校验：guideAvailableDates 有该 (guideId, date, bookingType) 且 isAvailable=1
  ├─ 生成订单号：nextOrderNo(当日同类型 MAX + 1)
  ├─ 写快照冗余：attractionName / packageName / guideNickname / guideAvatarUrl
  └─ 落库 status=0 待确认，guideAcceptedAt=null；占用该档期(isAvailable=0)
```

### 4.2 订单状态流转

```
0 待确认 ──地陪接单(只写 guideAcceptedAt，状态不变)──▶ 0 待确认
0 待确认 ──平台人工确认档期──▶ 1 已确认 ──地陪完成服务──▶ 2 已完成
0/1 ──游客取消 / 地陪拒单 / 平台处理取消──▶ 3 已取消
```

所有流转都过 `canTransit()`；越权直接抛 `STATE_INVALID`。

### 4.3 页面取数路径（feat-006 之后）

```
首页(景点列表)  → RegionApi.getRegionList + AttractionApi.getAttractionList
地陪列表       → GuideApi.getGuideList({ attractionId })
地陪详情       → GuideApi.getGuideDetail + getGuideAvailableDates + PackageApi.getPackageList
下单页         → OrderApi.createOrder
我的订单       → OrderApi.getMyOrders
接单页         → OrderApi.getGuideOrders({ scope })
后台           → OrderApi.getAllOrders + GuideApi.getPendingGuides / auditGuide
```

---

## 5. 验证证据

| 验证项 | 命令 | 结果 |
|---|---|---|
| mock 数据层校验 | `node scripts/check-mock.mjs` | 通过 |
| mock 校验自检 | `node scripts/check-mock.mjs --self-test` | 通过（一致性 / 数据自洽 / MVP 边界三类问题均能检出） |
| 表结构校验 | `node scripts/check-schema.mjs` | 通过（10 张表 / 108 字段） |
| 资产保真 | `node scripts/verify-assets.mjs` | 通过（22 条在册；`api/index.js` 重写已登记原因并刷新哈希） |
| 设计令牌 | `node scripts/check-tokens.mjs` | 通过 |
| 标准入口 | `./init.ps1` | 6 步全绿（构建按设计跳过，缺 `node_modules`） |
| harness 审计 | `validate-harness.mjs` | 100/100 |

`check-mock.mjs` 的关键输出：

```
一致性：区域 7 / 套餐 3 / 景点 20（与 seed.sql 对齐）
确定性：同 seed 两次生成结果完全一致
规模：52 用户 / 50 地陪 / 20 景点 / 7 区域 / 3 套餐 / 16 订单
可下单：44/44 个已通过地陪可被下单
自洽性：地陪 44 已通过 / 4 待审 / 2 拒绝；订单号 16 个唯一；待接单 3 单
边界：无评价字段；api/index.js 的 USE_MOCK = true；7 个页面均未直连 api/mock/
```

---

## 6. 遗留问题

1. **真实构建未跑过**：仓库无 `node_modules`，`npm run build:mp-weixin` 未执行；`api/mock/seed.json` 的 JSON import 在 uni-app（Vite）下应可用，但需实际构建确认（建议跑 `./init.ps1 -Full`）
2. **HTTP 适配层未实现**：`api/http.js` 只固定路由与请求封装；`USE_MOCK = false` 时全部方法抛 `NOT_IMPLEMENTED`，这是刻意设计（避免"看起来能用其实没实现"）
3. **时间字段是日期字符串**：mock 里 `guideAcceptedAt` / `confirmedAt` / `finishedAt` / `cancelledAt` / `createdAt` 用 `YYYY-MM-DD`；schema 为 `DATETIME`，HTTP 版本应返回 ISO 8601。页面目前只做展示，不做时间运算
4. **`App.vue` 仍初始化微信云开发**：数据层已不再用 `wx.cloud`（改走 HTTP 路线），`App.vue` 里的 `wx.cloud.init` 属遗留，建议在 `feat-013` 一并清理
5. **订单生成取值曾崩溃**：已修，见 `docx/bugfix/BUG修复-20260926-订单生成取值崩溃.md`；触发它的具体数据组合未复现，现以不变量断言兜底
6. **`seed.sql` 不含 50 个地陪**：地陪与订单只在 mock 生成；若需要"库里也有 50 个地陪"的联调环境，需另补 `seed-guides.sql`
7. **`attractions.guide_count` 冗余字段未维护**：mock 实时计算，后端需要在地陪审核通过 / 解绑景点时更新
