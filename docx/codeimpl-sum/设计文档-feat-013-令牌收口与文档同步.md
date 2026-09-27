# 设计文档：feat-013 令牌收口与文档同步

- 功能：feat-013
- 日期：2026-09-26
- 状态：**已完成**
- 前置：`feat-010`、`feat-012`

---

## 1. 目标与范围

### 目标

把「页面各自写死颜色」的历史遗留一次性收口，让 `DESIGN.md` + `uni.scss` 真正成为唯一来源，并同步项目说明与配置。

1. 页面里的旧色值（`#FF4D6A` / `#E5E5E5` / `#FFF0F3` 等）全部换成 `$ds-*` 令牌
2. `pages.json`：tabBar `selectedColor` / `color` 与 `globalStyle` 跟随新配色（`gap-004`）
3. `manifest.json`：名称与描述改为地陪小程序
4. `README.md`：改为 MVP 口径，去掉未实际使用的 Pinia 与云开发（`gap-005`）
5. `App.vue`：全局样式改令牌，移除已废弃的云开发初始化
6. 删除过渡适配层 `ClerkApi` / `CategoryApi` / `AppointmentApi`

### 范围之外

| 不做 | 原因 |
|---|---|
| 改 `DESIGN.md` / `uni.scss` 的规范口径 | 两者已于 2026-09-26 定稿（宣纸 · 疏），本轮只做「页面与配置向规范对齐」 |
| 换 tabBar 图标 | 现有 4 个 png 是 `keep` 档资产；换图标需要新素材，属后续升级 |
| px → rpx 全量换算 | 令牌体系是 px，全量换算需要另建一套 rpx 令牌（见遗留问题） |

---

## 2. 涉及的接口

**无接口变更**。本轮是配置、样式与文档收口。

唯一与数据层相关的动作是**删除过渡适配层**：
`ClerkApi` / `CategoryApi` / `AppointmentApi` 是把新模型映射回陪玩时期形状的临时入口（其中订单状态做了 4 态 → 3 态压缩）。`feat-006 ~ feat-012` 把 7 个页面全部迁到 `RegionApi` / `AttractionApi` / `PackageApi` / `GuideApi` / `OrderApi` / `UserApi` 后，页面对它们已无引用，删除条件达成。历史映射关系保留在 `docx/接口文档.md` 第 8 节。

---

## 3. 文件结构与关键实现

### 3.1 `pages.json`

| 项 | 改动前 | 改动后 |
|---|---|---|
| tabBar `selectedColor` | `#ff6b81` | `#2f6b5e`（竹青） |
| tabBar `color` | `#999999` | `#6b6862`（`$ds-ink-2`） |
| globalStyle `navigationBarTitleText` | 陪玩小程序 | 成都地陪 |
| globalStyle 背景 | `#f5f5f5` | `#f7f4ed`（宣纸） |
| `navigationBarTextStyle` | `white` | `black`（浅色导航栏用深字） |
| 首页标题 | 发现达人 | 今天去哪儿 |
| 页面总数 | 7 | **11**（新增 agreement / guide/list / order/create / guide/orders） |

### 3.2 页面令牌化

8 个页面（含登录页）的样式全部改用 `$ds-*`：

| 旧值（陪玩时期） | 新令牌 |
|---|---|
| `#FF4D6A`（主色） | `$ds-primary` / `$ds-tertiary`（价格） |
| `#F5F5F5`（页面底） | `$ds-surface` |
| `#FFFFFF`（卡片底） | `$ds-surface-container` |
| `#E5E5E5`（分割线） | `$ds-outline-variant` |
| `#FFF0F3` / `#E6FFF2` / `#FFF4E5`（状态底） | `$ds-error-container` / `$ds-success-container` / `$ds-warning-container` |
| 字号 12/13/14/… | `$ds-fs-caption` / `$ds-fs-label` / `$ds-fs-body-sm` … |
| 圆角 6/10/12/20/999 | `$ds-shape-xs` / `sm` / `md` / `lg` / `full` |

**登录页的档位变更（重要）**：`pages/login/login.vue` 原为 `keep` 档（保护平台双通道登录逻辑）。本轮把它改为 `adapt` 并重写样式与文案 —— 理由是登录页是**首屏**，若继续保留陪玩粉与「陪玩达人」文案，会与全站竹青绿直接矛盾。登录逻辑（MP-WEIXIN 走 `uni.login`、H5 走 `dev_code`、开放能力按钮 click 兜底）**原样保留**，档位变更原因已登记到 `docs/legacy-assets.json`。

顺带修掉一个真问题：`checkLogin()` 判断的是旧字段 `user?._id`，而新数据层返回 `id`，导致「已登录直接进首页」的判断永远不成立。

### 3.3 `App.vue`

- 全局样式改令牌（`$ds-surface` / `$ds-ink` / `$ds-font-body` / `$ds-fs-body`）
- **移除微信云开发初始化**：`wx.cloud.init({ env: 'peiwan-lite-xxx' })` 是占位环境 ID，重构后已不走云开发（改走 `api/http.js` 的 HTTP 路由表），保留它会在真机上报错
- 保留「未登录重定向登录页」的兜底

---

## 4. 状态与数据流

本轮不改变任何业务数据流，只改「外观与配置」的来源：

```
改色值 → 改 DESIGN.md（规范）→ 改 uni.scss（$ds-*）
                                    ↓ 自动注入
                         所有页面的 <style lang="scss">
                                    ↓ scripts/check-tokens.mjs 校验
                     「页面只用已定义的 $ds-*，且 DESIGN.md 色值都落到 uni.scss」
```

`pages.json` 的 tabBar 颜色是**原生组件**，无法读 SCSS 变量，因此这里写的是与 `$ds-primary` / `$ds-ink-2` 相同的字面量；`scripts/check-tokens.mjs` 的「DESIGN.md 色值 → uni.scss」校验覆盖了这层一致性。

---

## 5. 验证证据

| 验证项 | 命令 | 结果 |
|---|---|---|
| 旧色值残留 | `Select-String '#FF4D6A\|#ff6b81'`（限代码与配置） | 代码与配置中 **0 命中**（仅文档里的历史说明保留） |
| 设计令牌 | `node scripts/check-tokens.mjs` | 通过：`uni.scss` 定义 95 个变量、15 处引用无未定义；`DESIGN.md` 20 个色值全部落到 `uni.scss` |
| 资产保真 | `node scripts/verify-assets.mjs` | 通过：12 条资产已登记原因并刷新哈希；**告警 0 条**（原 3 条全部关闭） |
| mock 边界 | `node scripts/check-mock.mjs` | 通过：11 个页面均未直连 `api/mock/`；过渡适配层删除后仍全绿 |
| 表结构 | `node scripts/check-schema.mjs` | 通过（10 张表 / 109 字段） |
| 编辑器诊断 | — | 0 error 0 warning |

**gap 关闭情况**：`gap-001` / `gap-002`（feat-003）、`gap-003`（feat-012）、`gap-004` / `gap-005`（本 feat）——**5 条全部关闭**。

---

## 6. 遗留问题

1. **未做真机人工走查**：登录页改版后的首屏观感、tabBar 颜色在微信里的实际渲染需确认。
2. **px 未换算成 rpx**：`DESIGN.md` 第 12 节建议「1px ≈ 2rpx」，但 `$ds-*` 令牌是 px；全量换算需要同时维护两套令牌或改用 `uni.scss` 里的变量换算函数。当前统一用 px，小程序下按设备像素直接渲染（不做缩放），在 375 宽机型上与设计稿一致，但大屏机型不会等比放大。
3. **tabBar 图标仍是原陪玩时期的 png**：4 个图标属 `keep` 档资产，未替换为成都主题图标（需要新素材）。
4. **`manifest.json` 的 mp-weixin `appid` 仍为空**：发布前需填真实小程序 appid。
5. **`utils/index.js` 的 `formatPrice` 仍按「分」处理**：MVP 价格是整数元且无人调用该函数，因此未改（`keep` 档资产）。若将来启用，需先统一单位口径。
