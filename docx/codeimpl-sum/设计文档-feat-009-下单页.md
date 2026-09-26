# 设计文档：feat-009 游客端-下单页

- 功能：feat-009
- 日期：2026-09-26
- 状态：**已完成**
- 原型：`design/html/prototype.html` 第 04 屏
- 相关：`api/constants.js` 的 `BOOKING_TYPE_UI`（控件规则的唯一来源）

---

## 1. 目标与范围

### 目标

新增 `/pages/order/create`：把详情页的「选套餐 + 选日期」结果接过来，让游客只补**最少必要信息**后提交。

1. 只读回显三行：景点（可更换）/ 地陪 / 套餐
2. 预约日期：日期 picker，限「今天 ~ +14 天」
3. 时段：半日套餐显示上午/下午分段控件
4. 人数：步进器（1-9）
5. 小时数：小时加购套餐显示（1-8）
6. 备注：textarea（100 字）
7. 费用说明 + 底部固定操作栏（合计 + 提交预约）

### 范围之外

| 不做 | 原因 |
|---|---|
| 切换地陪 / 切换套餐 | 回到上一页改；下单页只做「补信息」 |
| 优惠券 / 加价规则 / 多人计价 | MVP 不做优惠券与动态定价 |
| 支付 | MVP 无支付环节，提交即生成「待确认」订单 |

---

## 2. 涉及的接口（对照 `docx/接口文档.md` 第 4、5 节）

| 方法 | 入参 | 用途 |
|---|---|---|
| `GuideApi.getGuideDetail(guideId)` | `guideId` | 回显地陪信息、套餐信息、可更换的景点清单 |
| `OrderApi.createOrder(payload)` | `{ guideId, attractionId, packageSkuId, appointDate, timeSlot?, hours?, peopleCount?, remark? }` | 创建订单，返回 `Order`（状态 0 待确认） |

`payload` 的**条件字段**由套餐类型决定：`timeSlot` 仅 `half-day` 需要，`hours` 仅 `hourly` 需要。
`OrderApi.createOrder` 会校验主体有效性（景点上架 / 地陪已通过 / 套餐可售 / 地陪擅长该景点 / 档期可约 / 人数 1-9 / 时段与小时数匹配类型），校验失败抛 `ApiError`。

---

## 3. 文件结构与关键实现

```
navbar
panel(只读回显)  景点（点击可在擅长景点内更换）/ 地陪 / 套餐
panel(需要填的)  日期 picker | 时段 segmented | 小时数 stepper | 人数 stepper | 备注 textarea
hint             「门票、餐饮、交通不含；超时按 1 小时加购，线下协商或由平台备注」
bottom-bar       合计（朱砂）+ Filled「提交预约」（提交中禁用）
```

### 3.1 控件完全由 `BOOKING_TYPE_UI` 驱动

```js
ui() {
  return BOOKING_TYPE_UI[this.selectedPackage.bookingType]
      || { showTimeSlot: false, showHours: false, slotOptions: [] };
}
```

| 套餐类型 | 时段 | 小时数 | 金额算法 |
|---|---|---|---|
| `half-day` | 显示上午/下午 | 隐藏 | 套餐价 |
| `full-day` | 隐藏 | 隐藏 | 套餐价 |
| `hourly` | 隐藏 | 显示 1-8 | **单价 × 小时数** |

金额算法写在 `amount` computed 里，并**只对 hourly 乘小时数**：

```js
amount() {
  const price = this.selectedPackage.price || 0;
  return this.ui.showHours ? price * this.hours : price;
}
```

> 这条规则来自 `docs/mvp-scope.json`：小时加购的 SKU 是「150-300 元/小时」，因此单价乘小时数；「超时不自动计费」由线下协商或平台备注处理，页面不做超时加价。

### 3.2 切换套餐时清掉无意义的字段

```js
watch: {
  'ui.showTimeSlot'(show) {
    this.timeSlot = show ? (this.ui.slotOptions[0] || '') : '';
  }
}
```

避免把「全天套餐 + 上午时段」这种矛盾组合提交给接口。

### 3.3 提交前后

- 未登录（无 `token`）→ 提示后 `redirectTo` 登录页
- 成功后用 **`redirectTo`** 而不是 `navigateBack`：提交已完成，回到表单页没有意义
- 提交中按钮禁用（`submitting`），避免重复下单

---

## 4. 状态与数据流

```
onLoad(guideId, packageSkuId, attractionId, appointDate)   ← 由详情页带入
   ↓ loadGuide()：拿地陪与套餐信息；attractionId/packageSkuId 缺失时兜底取第一个
   ↓ minDate = 今天，maxDate = 今天 + 14 天
用户操作：换景点（ActionSheet）/ 改日期 / 选时段 / 增减小时 / 增减人数 / 写备注
   ↓ 点提交
校验（token → 景点 → 日期 → 时段）→ OrderApi.createOrder → 成功 toast → redirectTo /pages/appointment/my
```

---

## 5. 验证证据

| 验证项 | 命令 | 结果 |
|---|---|---|
| 路由注册 | `node scripts/verify-assets.mjs` | 通过：`pages/order/create` 已注册（共 11 个页面） |
| mock 边界 | `node scripts/check-mock.mjs` | 通过：`createOrder` 的主体校验在 mock 层齐全，且页面未直连 `api/mock/` |
| 令牌校验 | `node scripts/check-tokens.mjs` | 通过 |
| 编辑器诊断 | — | 0 error 0 warning |

---

## 6. 遗留问题

1. **未做真机人工走查**：picker / stepper / textarea 在真机上的键盘遮挡与回弹需要确认。
2. **最多 14 天可约**：与详情页的档期窗口一致，硬编码在页面（`+14 天`）；建议后续由接口返回可约窗口。
3. **人数上限 9 与小时上限 8 是页面常量**：接口层的校验上限也是 9（人数），两处需要保持一致，未来应改为从常量导出。
4. **没有「确认弹窗」**：点提交直接下单（成功后引导到订单页）。若产品希望二次确认，可补 `showModal`。
5. **不能改套餐**：套餐在本页只读；换套餐要回详情页（这是有意的，避免下单一页多改）。
