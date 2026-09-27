# 设计文档：feat-011 地陪端-接单页

- 功能：feat-011
- 日期：2026-09-26
- 状态：**已完成**
- 原型：`design/html/prototype.html` 第 06 屏
- 前置：`feat-005`（四态状态机与数据源收口，已完成）

---

## 1. 目标与范围

### 目标

新增 `/pages/guide/orders`：地陪端的唯一工作台 —— 「有多少要处理」一眼可见，「一单一个决策」。

1. 统计条：待接单 / 进行中 / 今日完成
2. 在线开关（导航栏右侧）
3. 分段：待接单 / 进行中（`scope` 由接口过滤）
4. 待接单卡：拒单（描边）+ 接单（实心）
5. 已接单未确认：如实提示「已接单，等平台确认档期」
6. 已确认卡：完成服务（Tonal）
7. `mine.vue` 按角色分流入口 + mock 演示身份切换

### 范围之外

| 不做 | 原因 |
|---|---|
| 地陪申请开通流程 | `dev-003`：后续升级项；MVP 地陪由 mock 预置 50 个 |
| 排班 / 档期自主维护 | MVP 复杂排班不做；档期由种子数据预置 |
| 结算 / 收入统计 | 自动结算不在 MVP 范围 |
| 与游客的 IM | MVP 不做 IM；集合信息靠备注与线下沟通 |

---

## 2. 涉及的接口（对照 `docx/接口文档.md` 第 5 节）

| 方法 | 入参 | 用途 |
|---|---|---|
| `OrderApi.getGuideOrders({ scope, pageNo, pageSize })` | `scope: 'waiting' \| 'inProgress' \| 'all'` | 列表 + 分页 + `counts` |
| `OrderApi.acceptOrder(id)` | — | 接单：写 `guideAcceptedAt`，**状态不变**（仍 0 待确认） |
| `OrderApi.rejectOrder(id, { reason })` | `reason = '地陪拒单'` | 拒单：0 → 3 已取消 |
| `OrderApi.completeOrder(id)` | — | 完成服务：1 → 2 已完成 |

**本 feat 修正/补充了接口语义**（已同步 `docx/接口文档.md`）：

1. `counts` 改为基于「该地陪的全部订单」统计。原实现把三个计数写在**筛选后的列表**上，导致带 `scope` 调用时 `counts.inProgress` 恒为 0（真 bug，见第 5 节）。
2. 新增 `counts.todayFinished`（今日完成）。
3. `scope='inProgress'` 的口径改为 **`isGuideCommitted`**：状态 1（已确认）**或** 状态 0 且已写 `guideAcceptedAt`。
   原因：接单不改变状态，若「进行中」只看状态 1，地陪接完单后订单会同时从「待接单」和「进行中」两个列表里消失 —— 地陪会以为单子丢了。

---

## 3. 文件结构与关键实现

```
navbar          返回 + 「接单」+ 在线开关（switch）
stat-strip      三格：待接单（朱砂） / 进行中 / 今日完成
segmented       待接单 / 进行中（切 scope）
list-scroll     卡片列表 + 分页 + 下拉刷新
card.order      top：游客头像 40 +「景点 · 套餐」+「#订单号 · 游客 昵称」+ 状态标签
                body：时间 / 集合（待与游客确认）/ 备注
                foot：朱砂金额 + 操作（拒单描边 + 接单实心 / 「等平台确认」提示 / 完成服务 Tonal）
```

### 3.1 地陪视角的状态文案与配色

```js
stateText(item) {
  if (item.waitingGuideAccept) return '待接单';
  if (item.status === ORDER_STATUS.PENDING_CONFIRM) return '待平台确认';
  return item.statusLabel;   // 已确认
}
stateKey(item) {              // 只分「待办 / 已定」两类配色
  return item.waitingGuideAccept || item.status === ORDER_STATUS.PENDING_CONFIRM ? 0 : 1;
}
```

地陪端与游客端/后台的**看问题的角度不同**：游客端有四种状态，地陪端只需要知道「要不要我动手」。因此这里只保留姜黄（待办）与竹青（已定）两色，避免四色混杂。

### 3.2 在线开关的诚实处理

后端订单表没有「接单开关」字段，MVP 只在前端记忆（`uni.setStorageSync('guide_online')`），且**不拦截接单**。代码与文档都写明这一点，不做假功能。

### 3.3 `mine.vue` 的角色分流

| 角色 | 看到 | 角标来源 |
|---|---|---|
| 游客 | 我的订单 | `getMyOrders({ status: 0 })` 的 `total` |
| 地陪 | 接单 | `getGuideOrders({ scope: 'waiting' })` 的 `counts.waiting` |
| 管理员 | 订单管理 + 地陪审核 | `getAllOrders` 的 `counts.pendingConfirm` + `getPendingGuides` 的 `total` |

角标请求用 `Promise.all(tasks.map(t => t.catch(...)))`，不用 `Promise.allSettled`（低版本基础库兼容性）；任一失败不影响页面。

另外新增「演示身份切换」（`USE_MOCK` 为真时显示）：一键切游客 / 地陪 / 管理员，切完 `loadUser()` 重新分流。没有后端切换接口，接后端后整块删除。

---

## 4. 状态与数据流

```
onLoad → loadOrders(true)，scope 默认 'waiting'
点分段            → scope 变化 → loadOrders(true)
触底 / 下拉刷新    → loadOrders()
点「接单」→ 确认弹窗 → acceptOrder → toast「已接单，等平台确认」→ 重新加载
点「拒单」→ 确认弹窗 → rejectOrder → 订单从待接单移出（进已取消）
点「完成服务」→ 确认弹窗 → completeOrder → 订单进已完成终态

订单在三端的可见性：
  0 待确认（未接单）  → 地陪「待接单」
  0 待确认（已接单）  → 地陪「进行中」（等平台确认）｜后台「待确认」
  1 已确认            → 地陪「进行中」（可完成服务）｜游客「已确认」｜后台「已确认」→ 标记完成
  2 已完成 / 3 已取消  → 终态
```

---

## 5. 验证证据

| 验证项 | 命令 | 结果 |
|---|---|---|
| mock 数据层 | `node scripts/check-mock.mjs` | 通过：待接单 3 单、订单号 16 个唯一、四态齐全 |
| 路由注册 | `node scripts/verify-assets.mjs` | 通过：`pages/guide/orders` 已注册（共 11 个页面） |
| 资产保真 | 同上 | 通过（`mine.vue`、`pages.json`、`api/mock/index.js` 等已登记并刷新；告警 0 条） |
| 计数修复验证 | 人工比对 | 带 `scope=waiting` 调用时 `counts.inProgress` 不再归零（修前恒为 0） |
| 令牌校验 | `node scripts/check-tokens.mjs` | 通过 |
| 编辑器诊断 | — | 0 error 0 warning |

### 5.1 本轮修掉的一个真问题

`getGuideOrders` 原先这样写：

```js
let list = store.orders.filter(...);        // 我的订单
if (scope === 'waiting') list = list.filter(...);   // 先筛选
const counts = { waiting: list.filter(...), inProgress: list.filter(...) };  // 再在筛选结果上算计数
```

→ 带 `scope` 调用时，`counts` 只反映筛选后的子集（实测 `inProgress` 恒为 0，统计条永远显示 0）。
修法：把 `counts` 移到**筛选之前**、在「我的全部订单」上计算。这是本 feat 顺手修掉的功能缺陷，未单独开 bugfix 文档（改动与 feat-011 同批，回归验证见上表）。

---

## 6. 遗留问题

1. **在线开关不落库**：后端无对应字段，MVP 只前端记忆且不拦截接单。要么后续加 `guides.online`，要么删掉开关。
2. **未做真机人工走查**：分段切换、统计条刷新节奏、接单后卡片「跳组」的体感需确认。
3. **「今日完成」依赖服务器当天日期**：`todayFinished` 用 `formatDate(new Date())` 计算，跨时区部署时需统一时区口径。
4. **地陪身份只能靠 mock 切换**：真机上没有「我是地陪」的入口（`dev-003` 申请开通流程未做）；演示时需在「我的」页切身份。
5. **集合地点是占位文案**（「待与游客确认」）：MVP 没有集合点字段。
