# 设计文档：feat-003 协议页与图片兜底（gap-001 / gap-002）

- 功能：feat-003
- 日期：2026-09-26
- 状态：**已完成**（`feature_list.json` 中标记 done）
- 相关：`docs/mvp-scope.json`（`imageStrategy` / `dev-006`）、`DESIGN.md`（组件与图片策略）、`docs/legacy-assets.json`（gap-001 / gap-002）

---

## 1. 目标与范围

### 目标

1. 补上登录页引用却从未注册的**协议页**，消除 `gap-002`（点《用户协议》/《隐私政策》报错）
2. 把 6 处**悬空图片引用** `/static/images/default-avatar.png` 改为读取接口字段，并用容器底色兜底，消除 `gap-001`
3. 让 `verify-assets` 的告警条数从 3 条降到 1 条（仅剩 `gap-003`，归 `feat-012`）

### 范围之外（刻意不做）

| 不做 | 原因 |
|---|---|
| 新增本地占位图文件 | `gap-001` 的 resolution 已写明：按 `dev-006`「不新增本地图片」。本地占位图会掩盖"字段为空"这一真实问题，也与「图片来自后端 URL」的策略重复 |
| 正式法律文本 | 协议页只做**入口与跳转**；条款为占位内容，正式文本需法务确认 |
| 页面视觉重构 | 6 个页面本轮只改图片字段与容器底色，配色统一留给 `feat-013` |

---

## 2. 涉及的接口

本轮**没有新增接口**，只是让页面换用已有字段（接口基准见 `docx/接口文档.md`）。

| 页面 | 字段来源 | 说明 |
|---|---|---|
| `pages/tabbar/mine.vue` | `UserApi.getCurrentUser()` → `avatarUrl` | 兼容旧 storage 里的 `avatar` 字段 |
| `pages/index/index.vue` | `ClerkApi.getClerkList()` → `avatar`（映射自 `guides.avatarUrl`） | `feat-006` 会切成 `AttractionApi` |
| `pages/clerk/detail.vue` | `ClerkApi.getClerkDetail()` → `avatar` | `feat-008` 重写 |
| `pages/appointment/my.vue` | `OrderApi.getMyOrders()` → `guideAvatarUrl` | 本轮同步切到 `OrderApi`（见 feat-005） |
| `pages/admin/appointment.vue` | `OrderApi.getAllOrders()` → `touristAvatarUrl` | 同上 |
| `pages/admin/clerk.vue` | `ClerkApi.getPenddingClerks()` → `avatar` | `feat-012` 重写 |

协议页入参：`/pages/webview/agreement?type=user|privacy`（缺省或非法值按 `user` 处理）。

---

## 3. 文件结构与关键实现

### 3.1 协议页 `pages/webview/agreement.vue`（新增）

- 结构与现有页面同构：`.status-bar` + `.navbar`（自定义导航，与 `pages.json` 的 `navigationStyle: custom` 一致）
- 文案集中在脚本里的 `DOCS` 常量，两个文档各 5 节；`type` 参数决定渲染哪一份
- 颜色全部用定稿令牌（`$ds-surface` / `$ds-ink` / `$ds-primary-container` / `$ds-outline-variant` 等），标题走 `$ds-font-title`（系统宋体栈，不加载字体文件）
- 页面末尾有一段**显式声明**：本页为占位条款，上线前替换为法务确认文本（避免被误当成正式协议）

### 3.2 `pages.json` 注册

```json
{ "path": "pages/webview/agreement", "style": { "navigationStyle": "custom", "navigationBarTitleText": "协议" } }
```

注册在登录页之后、首页之前。`pages.json` 属 `adapt` 档资产，已按纪律先在 `docs/legacy-assets.json` 写清原因，再 `--update` 刷新哈希。

### 3.3 图片兜底（6 处）

| 页面 | 改动前 | 改动后 |
|---|---|---|
| `mine.vue` | `userInfo.avatar \|\| '/static/images/default-avatar.png'` | `userInfo.avatarUrl \|\| userInfo.avatar` |
| `index.vue` | `clerk.avatar \|\| '/static/...'` | `clerk.avatar` |
| `clerk/detail.vue` | `clerkInfo.avatar \|\| '/static/...'` | `clerkInfo.avatar` |
| `appointment/my.vue` | `item.clerkAvatar \|\| '/static/...'` | `item.guideAvatarUrl` |
| `admin/appointment.vue` | `item.userAvatar \|\| '/static/...'` | `item.touristAvatarUrl` |
| `admin/clerk.vue` | `clerk.avatar \|\| '/static/...'` | `clerk.avatar` |

兜底方式：6 个头像容器的 `background` 由 `#F5F5F5` 改为 `$ds-primary-container`（竹青浅底）。

**为什么不用 `@error` 回调清空 src**：小程序端 `<image>` 加载失败时不会撑开内容，容器的底色会直接露出来，视觉上就是一格竹青色 —— 这正是 `DESIGN.md` 定义的兜底表现。加 `@error` 反而要在 6 个页面各写一份回调，收益为零。

---

## 4. 状态与数据流

```
登录页「《用户协议》」→ /pages/webview/agreement?type=user
登录页「《隐私政策》」→ /pages/webview/agreement?type=privacy
                     ↓
              agreement.vue onLoad 读取 type → 渲染对应 DOCS
                     ↓
                 点击返回 → uni.navigateBack()

图片：接口返回 coverUrl / avatarUrl
   ├─ 有值 → <image mode="aspectFill"> 正常渲染
   └─ 空值或加载失败 → 容器露出 $ds-primary-container 底色（不裂图、不拉伸）
```

---

## 5. 验证证据

| 验证项 | 命令 | 结果 |
|---|---|---|
| 悬空引用告警 | `node scripts/verify-assets.mjs` | **告警由 3 条降为 1 条**：只剩 `gap-003`（`/pages/admin/clerk/edit`，归 feat-012） |
| 资产保真 | 同上 | 通过（22 条在册；本轮 7 条改动已登记原因并 `--update`） |
| mock 边界 | `node scripts/check-mock.mjs` | 通过，且页面扫描数由 7 → **8**（新增的协议页未直连 `api/mock/`） |
| 编辑器诊断 | — | 4 个改动文件 0 error 0 warning |
| 标准入口 | `./init.ps1` | 6 步全绿 |

> `gap-001` 与 `gap-002` 的 `resolution` 字段已在 `docs/legacy-assets.json` 标记为「2026-09-26 feat-003 已完成」。

---

## 6. 遗留问题

1. **协议文本是占位内容**：需法务/产品确认后替换；页面内已显式声明
2. **协议页配色新、其他页配色旧**：协议页用了 `$ds-*` 令牌，`login.vue`、订单页等仍是陪玩时期的 `#FF4D6A` 体系；视觉统一归 `feat-013`
3. **`round-to-square` 之外的头像尺寸不统一**：6 个页面的头像容器尺寸各异（44/52/56/64/68），`DESIGN.md` 只定义了 44/60 两档；`feat-010`/`feat-012` 重写时应统一
4. **`/static/images/` 目录仍不存在**：本轮改为「不依赖本地图片」，目录本身不需要创建；若后续要放 tabBar 之外的本地图，再按需建目录并登记台账
