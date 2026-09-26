# 设计文档：feat-012 管理端-后台订单管理与地陪审核

- 功能：feat-012
- 日期：2026-09-26
- 状态：**已完成**
- 原型：`design/html/prototype.html` 第 07 屏
- 前置：`feat-005`（四态与操作白名单）、`feat-011`

---

## 1. 目标与范围

### 目标

把后台两个页面改造为**管理员真正用得动**的工作台。管理员在这条链路上只做两件事：给订单**人工确认档期**、对地陪**通过 / 拒绝**。

1. `pages/admin/appointment.vue`：统计条（待确认 / 已确认 / 今日订单）+ 日期与状态筛选 + 订单卡（游客信息）+ 一单一个主操作
2. `pages/admin/clerk.vue`：改为「地陪审核」——统计条 + 待审核/已通过页签 + 通过 / 拒绝
3. **移除**指向未创建页面的「添加 / 编辑达人」入口（`gap-003`）
4. 后台信息密度比游客端高一档（缩小字号与内边距）

### 范围之外

| 不做 | 原因 |
|---|---|
| 新增 / 编辑地陪页面 | `gap-003` 的 resolution：审核只需通过/拒绝，不新建页面 |
| 投诉处理 | MVP 不做投诉 |
| 财务 / 结算面板 | 自动结算不在 MVP 范围 |
| 批量操作 | 后订单量小，单笔操作更安全 |

---

## 2. 涉及的接口（对照 `docx/接口文档.md` 第 4、5 节）

### 订单管理

| 方法 | 入参 | 用途 |
|---|---|---|
| `OrderApi.getAllOrders({ pageNo, pageSize, status, appointDate })` | 状态与日期来自筛选行 | 列表 + 分页 + `counts` |
| `OrderApi.confirmOrder(id)` | — | 确认档期：0 → 1（**MVP 闭环的关键一步**） |
| `OrderApi.completeOrder(id)` | — | 标记完成：1 → 2 |
| `OrderApi.cancelOrder(id, { reason })` | `reason = '平台处理取消'` | 处理取消：0 / 1 → 3 |

`counts = { pendingConfirm, confirmed, todayAppoint, total }`，由接口一次返回，前端不重复统计（避免与筛选结果耦合）。

### 地陪审核

| 方法 | 入参 | 用途 |
|---|---|---|
| `GuideApi.getPendingGuides({ pageNo, pageSize })` | — | 待审核列表 + `total` |
| `GuideApi.getGuideList({ pageNo, pageSize })` | — | 已通过列表 + `total` |
| `GuideApi.auditGuide(id, { status })` | `status = 1 通过 / 2 拒绝` | 审核 |

---

## 3. 文件结构与关键实现

### 3.1 `pages/admin/appointment.vue`

```
navbar        返回 + 订单管理
stat-strip    待确认（朱砂） / 已确认 / 今日订单
chip-row      日期 picker chip（虚线边框，显示「MM-DD 周X」）+ 状态 chip（全部状态 + 四态）
list-scroll   订单卡：游客头像 40 / 「景点 · 套餐」/「#订单号 · 游客 昵称」/ 状态标签
              body：地陪 / 时间 / 备注
              foot：金额 + 操作
```

**操作按钮的显示与排布**：

| 当前状态 | 按钮（右到左） |
|---|---|
| 0 待确认 | `确认档期`（Filled 竹青）+ `处理取消`（Danger 描边） |
| 1 已确认 | `标记完成`（Tonal）+ `处理取消`（Danger 描边） |
| 2 / 3 | 无（终态） |

判定全部走 `canTransit(status, X)`（`api/constants.js`），页面不写 `status === 0`。
主操作用 Filled、次操作用描边/浅底，避免两个同等重的按钮（DESIGN.md 的按钮变体规范）。

**日期筛选的交互**：`<picker mode="date">` 包住 chip，选择后 chip 高亮并显示 `09-27 周日`；再次打开可改，清除筛选靠重新选「今天以外的空值」——**当前没有一键清除**（见遗留问题）。

**弹窗 Promise 化**：`confirmModal(title, content)` 把 `uni.showModal` 包成 Promise，三个操作共用，减少嵌套回调。

### 3.2 `pages/admin/clerk.vue`

```
navbar        返回 + 地陪审核
stat-strip    待审核（朱砂） / 已通过 / 合计
tabline       待审核（带待审数量徽标） / 已通过
list-scroll   地陪卡：头像 52 / 昵称 + 状态标签 / 区域标签 / 简介 / 「擅长 N 个景点 · 起价 ¥X · 接单 N 单」
              待审核才显示操作：拒绝（Danger 描边）+ 通过（Filled）
```

- 状态标签用 `GUIDE_STATUS`：`0 待审核`（姜黄）/ `1 已通过`（竹青）/ `2 已拒绝`（朱砂）
- 空状态写明「地陪申请开通流程为后续升级，MVP 由种子数据预置」，避免被当成 bug
- **移除了**「添加达人」悬浮按钮与「编辑」按钮（原 `addClerk()` / `editClerk()` 跳 `/pages/admin/clerk/edit`）

---

## 4. 状态与数据流

```
订单：筛选（状态 chip / 日期 picker）→ loadList(true) → getAllOrders
      counts 每次刷新同步（不受筛选影响，是全局口径）
      确认档期 → confirmOrder → 0→1 → 重新加载（该单从「待确认」统计里减少）
      处理取消 → cancelOrder → 0/1→3
      标记完成 → completeOrder → 1→2

审核：页签切换 → getPendingGuides / getGuideList
      通过 → auditGuide(status=1) → 该地陪从待审核移入已通过，统计条与 badge 同步刷新
      拒绝 → auditGuide(status=2) → 从待审核列表移出（MVP 不展示「已拒绝」页签）
```

管理端视角的四态与游客端一致（`0 待确认 / 1 已确认 / 2 已完成 / 3 已取消`），但**操作权限不同**：引导「确认档期」这一步只有平台能做 —— 这正是 MVP 三件事里的第三件。

---

## 5. 验证证据

| 验证项 | 命令 | 结果 |
|---|---|---|
| 悬空引用 | `node scripts/verify-assets.mjs` | **告警由 3 条降为 0 条**：`/pages/admin/clerk/edit` 已无引用（`gap-003` 关闭） |
| 路由一致性 | 同上 | 通过：11 个页面全部注册，无未注册引用 |
| mock 数据层 | `node scripts/check-mock.mjs` | 通过：44 已通过 / 4 待审 / 2 拒绝；16 笔订单四态齐全 |
| 资产保真 | 同上 | 通过（两个 admin 页面已登记原因并刷新哈希） |
| 令牌校验 | `node scripts/check-tokens.mjs` | 通过 |
| 编辑器诊断 | — | 0 error 0 warning |

---

## 6. 遗留问题

1. **未做真机人工走查**：筛选 chip 横向滚动、picker 与 chip 的组合交互需要人工确认。
2. **日期筛选不能一键清除**：只能重选日期或退出页面；建议在 chip 右侧加一个小「×」。
3. **「已拒绝」地陪不可见**：MVP 只有待审核 / 已通过两个页签，被拒的地陪只能通过 `GUIDE_STATUS` 再次筛选（后端有数据，前端没入口）。
4. **处理取消没有填写原因**：统一写死 `reason = '平台处理取消'`；建议后续弹输入框。
5. **统计条依赖接口 counts**：若后端不给 counts，需要前端按状态分别请求；当前 mock/HTTP 契约都要求后端返回。
6. **管理端入口在「我的」页**：管理员身份由 mock 预置（默认身份即管理员），真机的管理员授权流程不在 MVP 范围。
