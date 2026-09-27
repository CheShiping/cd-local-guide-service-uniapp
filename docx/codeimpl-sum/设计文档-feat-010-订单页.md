# 设计文档：feat-010 游客端-订单页

- 功能：feat-010
- 日期：2026-09-26
- 状态：**已完成**
- 原型：`design/html/prototype.html` 第 05 屏
- 前置：`feat-005`（四态状态机与数据源收口，已完成）

---

## 1. 目标与范围

### 目标

改造 `pages/appointment/my.vue`：从「3 态 + 陪玩时期文案」升级为**四态订单页**，并把订单卡补全到能让游客判断「这单现在什么状态、要不要取消」。

1. 四态文字页签：待确认 / 已确认 / 已完成 / 已取消（默认待确认）
2. 订单卡：地陪头像 / 景点·套餐 / 订单号 / 状态标签 / 时间·人数·地陪·备注 / 金额 / 取消预约
3. 状态标签四态固定配色：姜黄 / 竹青 / 灰 / 朱砂
4. 保留分页与下拉刷新

### 范围之外

| 不做 | 原因 |
|---|---|
| 订单详情页 | MVP 7 个页面里没有它；卡片已承载全部关键信息 |
| 再次预约 / 联系地陪 | MVP 不做 IM；联系方式不在 MVP 范围 |
| 评价入口 | `dev-002`：评价不做 |

---

## 2. 涉及的接口（对照 `docx/接口文档.md` 第 5 节）

| 方法 | 入参 | 用途 |
|---|---|---|
| `OrderApi.getMyOrders({ pageNo, pageSize, status })` | `status` 由页签给出 | 列表 + 分页 |
| `OrderApi.cancelOrder(id, { reason })` | `reason = '游客取消'` | 取消（0/1 → 3） |

用到的字段：`orderNo`、`attractionName`、`packageName`、`guideNickname`、`guideAvatarUrl`、`appointDate`、`timeSlotLabel`、`hours`、`peopleCount`、`remark`、`amount`、`status`、`statusLabel`、`bookingType`。

---

## 3. 文件结构与关键实现

```
navbar
tabline        四态页签（flex:1 均分 + 竹青下划线）
list-scroll    分页 + 下拉刷新
card.order     top：地陪头像 44 + 标题「景点 · 套餐」+「#订单号」+ 状态标签
               body：时间 / 地陪 / 备注（kv 行）
               foot：朱砂金额 + 取消预约（待确认=danger 描边，已确认=中性描边）
load-status / empty-box
```

三处实现要点：

### 3.1 页签与文案全部来自常量

```js
const statusTabs = [
  { label: ORDER_STATUS_LABELS[ORDER_STATUS.PENDING_CONFIRM], value: ORDER_STATUS.PENDING_CONFIRM },
  ...
];
```

页面里**没有任何** `statusLabels` / `timeSlots` 本地映射（这是 feat-005 定下的纪律，本页延续）。

### 3.2 时间行的三个分支

| 情况 | 显示 |
|---|---|
| 半天 / 全天 | `09-27 上午 · 2 人` |
| 小时加购 | `09-27 · 小时加购 3 小时 · 2 人` |

小时加购没有「上午/下午」的概念（`timeSlot = 'none'`），因此走单独分支，用 `BOOKING_TYPES.HOURLY` 判断（不写裸字符串）。

### 3.3 取消按钮的显示条件与样式

```js
canCancel(status) { return canTransit(status, ORDER_STATUS.CANCELLED); }
```

- 显示条件：状态白名单（0 / 1 可取消，2 / 3 终态）
- 样式：待确认用朱砂描边（`btn--danger`），已确认用中性描边（`btn--outlined`）—— 同一操作在不同紧迫度下用不同视觉权重
- 二次确认：`uni.showModal`，取消成功后才重新拉列表

---

## 4. 状态与数据流

```
onLoad → loadList(true)，currentStatus 默认 0（待确认）
点页签 → currentStatus 变化 → loadList(true)
触底   → loadList()（追加；hasMore 由接口返回）
下拉   → onPullDownRefresh → loadList(true) → uni.stopPullDownRefresh()
点取消 → showModal 确认 → OrderApi.cancelOrder → toast → loadList(true)
```

页签切换会重置 `pageNo / 列表 / hasMore`；`total` 同步刷新（本轮不再用于分页判断，仅保留给可能的计数展示）。

---

## 5. 验证证据

| 验证项 | 命令 | 结果 |
|---|---|---|
| mock 数据层 | `node scripts/check-mock.mjs` | 通过：16 笔订单四态齐全、订单号 16 个唯一 |
| 资产保真 | `node scripts/verify-assets.mjs` | 通过（`my.vue` 与 `pages.json` 已登记原因并刷新哈希；告警 0 条） |
| 页签语义一致性 | 人工 + grep | `statusLabels` / `timeSlots` 在页面中已无定义（唯一命中是注释） |
| 令牌校验 | `node scripts/check-tokens.mjs` | 通过（页面已无 #FF4D6A 等旧色值） |
| 编辑器诊断 | — | 0 error 0 warning |

---

## 6. 遗留问题

1. **未做真机人工走查**：下拉刷新与弹窗在真机上的表现待确认。
2. **默认页签是「待确认」**（与原型一致，而非「全部」）：好处是首屏即「要处理的单」，代价是游客想回顾历史订单要多点一次。若产品更看重「一进来就看见全部」，改 `currentStatus` 初始值为 `''` 即可（接口支持不带 `status`）。
3. **订单号展示为完整 13 位**：原型图里是 8 位短号（旧格式），实际按 `CD+YYMMDD+A/B/C+4 位序号` 显示，长一些但可核对。
4. **没有「联系地陪 / 再次预约」入口**：属 MVP 之外。
5. **金额只显示总额**：未显示「单价 × 小时数」的明细；小时加购单建议后续在卡片里加一行明细。
