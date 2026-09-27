# 设计文档：feat-005 订单四态状态机

- 功能：feat-005
- 日期：2026-09-26
- 状态：**已完成**（`feature_list.json` 中标记 done）
- 相关：`api/constants.js`（唯一来源）、`docx/数据库设计.md` 3.5 节、`docx/接口文档.md` 第 5 节、`docs/legacy-assets.md` 的「订单状态机」章节

---

## 1. 目标与范围

### 目标

把订单状态从陪玩时期的 3 态（0 待服务 / 1 已完成 / 2 已取消）升级为 MVP 的 4 态（0 待确认 / 1 已确认 / 2 已完成 / 3 已取消），并解决"映射表分散"这个必踩的坑：

1. **唯一的语义来源**：`api/constants.js`（feat-004 已建立）——页面不再自建 `statusLabels` / `timeSlots`
2. **两个订单页改走新数据层**：`OrderApi.getMyOrders` / `OrderApi.getAllOrders`，脱离状态语义被压缩的过渡适配层
3. **后台补齐闭环所需的操作**：确认档期（0→1）、标记完成（1→2）、处理取消（0/1→3），且按钮**由状态白名单推导**而不是各自写死 `status === 0`
4. **第 4 态有样式**：新增 `.status-3`，保证「已取消」不会没有标签样式

### 范围之外（刻意不做）

| 不做 | 归属 |
|---|---|
| 订单卡展示订单号 / 金额 / 人数 / 套餐 | `feat-010`（游客端订单页改造） |
| 后台统计条、日期+状态筛选行的视觉重做 | `feat-012` |
| 把页面配色换成 `$ds-*` 令牌 | `feat-013` |
| 移除 `AppointmentApi` 过渡适配层 | `feat-011`（`mine.vue` 仍在用它取计数，见第 6 节） |

---

## 2. 涉及的接口（对照 `docx/接口文档.md` 第 5 节）

| 页面 | 调用 | 用途 |
|---|---|---|
| `pages/appointment/my.vue` | `OrderApi.getMyOrders({ pageNo, pageSize, status })` | 四态页签 + 分页 |
| 同上 | `OrderApi.cancelOrder(id, { reason })` | 取消预约（0/1 → 3） |
| `pages/admin/appointment.vue` | `OrderApi.getAllOrders({ pageNo, pageSize, status, appointDate })` | 后台列表 + 日期/状态筛选 |
| 同上 | `OrderApi.confirmOrder(id)` | 平台人工确认档期（0 → 1） |
| 同上 | `OrderApi.completeOrder(id)` | 标记完成（1 → 2） |
| 同上 | `OrderApi.cancelOrder(id, { reason })` | 处理取消（0/1 → 3） |

**新增返回字段**（`getGuideOrders` / `getAllOrders`）：`touristNickname`、`touristAvatarUrl`。
订单表只存 `tourist_user_id`（不使用外键），地陪端/管理端需要知道下单人是谁，因此由接口层做一次 join（mock 内为 `withTourist()`，HTTP 版由后端 JOIN `users`）。已同步 `docx/接口文档.md`。

---

## 3. 文件结构与关键实现

### 3.1 唯一来源：`api/constants.js`（feat-004 建立，本轮首次被页面消费）

| 导出 | 用途 |
|---|---|
| `ORDER_STATUS` | 四态取值 |
| `ORDER_STATUS_LABELS` | 四态文案（页签、状态标签都来自这里） |
| `ORDER_STATUS_TRANSITIONS` / `canTransit(from, to)` | 状态流转白名单，**页面据此决定按钮显示** |
| `orderStatusLabel` / `bookingTypeLabel` / `timeSlotLabel` | 文案函数（订单返回里已带 label 字段，页面优先用返回值） |

### 3.2 `pages/appointment/my.vue`（游客端）

- 删除模块级 `statusLabels`（3 态）与 `timeSlots`（含已废弃的 `evening`）
- 页签由 5 项组成：`全部` + 四态（文案取自 `ORDER_STATUS_LABELS`）
- 数据源由 `AppointmentApi.getMyAppointments` 改为 `OrderApi.getMyOrders`；字段随新模型变化（`clerkName → guideNickname`、`clerkAvatar → guideAvatarUrl`、`createTime → createdAt`、`_id → id`）
- 取消按钮：`v-if="canCancel(item.status)"`（`canTransit(status, CANCELLED)`）而不是 `status === 0`
- 分页改为使用接口返回的 `hasMore`，不再自己用 `list.length < total` 推算
- 页签字号 14 → 13px（5 个页签在 375px 宽下需要更紧凑）
- 空状态文案从「去首页找位达人吧」改为「去首页挑个景点，再选能带这个景点的地陪」（对齐 `dev-001`）

### 3.3 `pages/admin/appointment.vue`（管理端）

- 同样删除本地 `statusLabels` / `timeSlots`，筛选下拉改为四态
- 数据源改为 `OrderApi.getAllOrders`
- 卡片字段：`userName → touristNickname`、`userAvatar → touristAvatarUrl`、`clerkName → guideNickname`；新增一行「服务」= `attractionName · packageName`（平台要确认的是"哪天地陪带谁去哪个景点"，缺这行无法判断）
- 三个操作按钮都按白名单显示：

| 当前状态 | 显示的操作 |
|---|---|
| `0 待确认` | 确认档期（主）、处理取消（次） |
| `1 已确认` | 标记完成（主）、处理取消（次） |
| `2 已完成` / `3 已取消` | 无（终态） |

- 次要操作用 `.footer-action.ghost`（浅底描边），避免两个同等重的按钮
- 错误提示改为透出 `ApiError.message`（错误契约见 `api/errors.js`），而不是统一的一句"操作失败"

### 3.4 状态标签样式

两个页面各新增 `.status-3`（已取消，浅红底 + 朱砂字）。本轮**只保证第 4 态有样式**，配色统一留给 `feat-010` / `feat-012` / `feat-013`。

---

## 4. 状态与数据流

```
游客提交预约 ──▶ 0 待确认 ──地陪接单(只写 guideAcceptedAt，状态不变)──▶ 0 待确认
                   │                                                        │
                   │ 平台人工确认档期                                        │ 地陪拒单
                   ▼                                                        ▼
                1 已确认 ──地陪完成服务──▶ 2 已完成                    3 已取消
                   │
                   └──游客取消 / 平台处理取消──▶ 3 已取消
```

- 所有流转都过 `canTransit()`；越权在 mock 层抛 `STATE_INVALID`（HTTP 版 409）
- 4 态不足以表达「地陪已接单但平台还没确认」→ 用 `orders.guide_accepted_at` 细分（见数据库设计 3.5 节）；地陪端「待接单」= `status = 0 且未接单`
- 游客端「取消预约」与后台「处理取消」走同一个 `cancelOrder`，只是 `reason` 不同

---

## 5. 验证证据

| 验证项 | 命令 | 结果 |
|---|---|---|
| mock 数据层 | `node scripts/check-mock.mjs` | 通过（16 订单四态齐全、订单号唯一、待接单 3 单） |
| 资产保真 | `node scripts/verify-assets.mjs` | 通过（本轮 7 条改动已登记原因并 `--update`） |
| 悬空引用告警 | 同上 | 3 → **1** 条（图片兜底见 feat-003） |
| 令牌校验 | `node scripts/check-tokens.mjs` | 通过 |
| 表结构校验 | `node scripts/check-schema.mjs` | 通过（10 张表 / 109 字段） |
| 编辑器诊断 | — | `my.vue` / `admin/appointment.vue` 0 error 0 warning |
| 标准入口 | `./init.ps1` | 6 步全绿 |

**状态语义一致性核对**（人工 + 脚本）：`api/constants.js` 的 4 态取值 ↔ `docs/mvp-scope.json` 的 `orderStatusMVP` ↔ `schema.sql` 的 `orders.status` 注释 ↔ 页面页签，四处一致；两个页面已无 `statusLabels` / `timeSlots` 定义（可 grep 验证）。

---

## 6. 遗留问题

1. **`AppointmentApi` 没有删除**：`pages/tabbar/mine.vue` 仍在用它取两处计数（只读 `total`，不看状态语义），`clerk/detail.vue` 的旧下单表单也还在用 `createAppointment`。因此过渡适配层里的「4 态 → 3 态压缩映射」仍在代码里，但**已无列表页消费**，不会造成语义误导。删除条件：`feat-008`（详情/下单迁移）+ `feat-011`（`mine.vue` 迁移）完成后
2. **订单卡信息仍不完整**：订单号、金额、人数、套餐未展示（`feat-010`）
3. **后台没有统计条**：`getAllOrders` 已返回 `counts`（待确认/已确认/今日订单），但页面尚未使用（`feat-012`）
4. **视觉仍是陪玩时期配色**：两页的 `#FF4D6A` / 状态色与 `DESIGN.md` 的「宣纸 · 疏」不一致（`feat-013`）
5. **未做真机验证**：本轮只做了静态校验与 mock 逻辑校验，页面交互（下拉刷新、取消弹窗）需在小程序/ H5 里人工走一遍
