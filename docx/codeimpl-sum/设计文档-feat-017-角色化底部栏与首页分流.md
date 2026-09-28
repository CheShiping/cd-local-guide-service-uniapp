# 设计文档 · feat-017 角色化底部栏与首页分流

> 需求原话：「游客的时候不变，变的是切换到地陪的时候，原来的首页变成地陪的接单页，在我的页面中新增『成为地陪』一行（后续扩展准备）；管理员的时候原本首页变成订单管理，再新增一个底部栏为地陪审核。」

## 一、目标与范围

### 1.1 目标

底部栏（tabBar）**按角色变化**，让三种身份一进来就落在自己该干活的那一屏：

| 角色 | 底部栏 | 「原来的首页」位置 |
|---|---|---|
| 游客 | 首页 · 我的 | 景点列表（**不变**） |
| 地陪 | 接单 · 我的 | `pages/guide/orders`（接单页） |
| 管理员 | 订单管理 · **地陪审核** · 我的 | `pages/admin/appointment`（订单管理） |

另外「我的」页新增一行「**成为地陪**」，作为地陪自助申请开通（`docs/mvp-scope.json` 的 dev-003）的入口占位。

### 1.2 范围内

- 底部栏项数与文案按角色变化（游客/地陪 2 项、管理员 3 项，其中「地陪审核」是新增的底部栏项）
- 角色兜底：当前页不属于当前角色时自动回该角色第一屏（登录后落首页、切换身份后都靠它收敛）
- 三个工作台页（接单 / 订单管理 / 地陪审核）成为底部栏页后的适配：去返回键、跳转改 `switchTab`
- tabBar 图标集由 2 个形状扩为 4 个形状（新增 `orders` / `clerk`），共 8 张，仍由脚本生成

### 1.3 范围外（明确不做）

- **不改首页内容**：`pages/index/index.vue` 仍是游客的景点列表，地陪/管理员不会停在这一页（由角色兜底跳走），而不是把三种首页塞进同一页
- **不做地陪申请开通流程**（dev-003，后续升级）：「成为地陪」只是入口占位，点击提示「正在建设中」
- 不改数据层、不改任何业务接口、不动订单状态机

### 1.4 为什么不用原生 tabBar

`pages.json` 的 `tabBar.list` 是**编译期静态**的：项数、文案、图标都写死，无法按角色增删（`uni.setTabBarItem` 只能改文案与图标，改不了项数与目标页；也没有删除项的 API）。因此：

- `pages.json` 仍把 **5 个页面都登记为 tabBar 页**（只有 tabBar 页能用 `switchTab`，这是保留原生页面栈与切换手感的关键）
- 运行时用 `uni.hideTabBar()` 隐藏原生栏，再由 `components/ds-tabbar` **自绘**真实可见的那一条
- 自绘栏点击 → `uni.switchTab`（失败兜底 `reLaunch`）

> 备选方案「微信小程序原生 custom-tab-bar」被否：H5 端不支持（而本项目要求 H5 保持可调试），且要写 wxml/wxss 原生组件、用不了 `$ds-*` 令牌。

## 二、涉及的接口

**本 feat 不新增、不修改任何 Api 方法**，`docx/接口文档.md` 无需同步。只用到既有接口：

| 用途 | 接口 | 说明 |
|---|---|---|
| 读当前角色（底部栏换项 / 角色兜底的唯一依据） | `UserApi.getCurrentUser()` | 返回 `{ id, nickname, avatarUrl, phone, role, roleLabel, isAdmin }` |
| 切换演示身份（mock 专用） | `switchMockRole(role)`（`api/index.js` 导出） | 切完广播 `uni.$emit('role:change')` |
| 「我的」页角标 | `OrderApi.getMyOrders` / `OrderApi.getGuideOrders` / `OrderApi.getAllOrders` / `GuideApi.getPendingGuides` | 沿用 feat-011 / feat-012，未改 |

## 三、文件结构与关键实现

### 3.1 新增：`utils/tabbar.js`（配置唯一来源）

```js
const TABS = {
  [ROLES.TOURIST]: [{ icon: 'home',   text: '首页',     path: '/pages/index/index' },
                    { icon: 'mine',   text: '我的',     path: '/pages/tabbar/mine' }],
  [ROLES.GUIDE]:   [{ icon: 'orders', text: '接单',     path: '/pages/guide/orders' },
                    { icon: 'mine',   text: '我的',     path: '/pages/tabbar/mine' }],
  [ROLES.ADMIN]:   [{ icon: 'orders', text: '订单管理', path: '/pages/admin/appointment' },
                    { icon: 'clerk',  text: '地陪审核', path: '/pages/admin/clerk' },
                    { icon: 'mine',   text: '我的',     path: '/pages/tabbar/mine' }]
};
```

导出 `tabItemsByRole(role)` / `homePathByRole(role)` / `isTabPath(role, path)` / `tabIconPath(icon, active)`。角色常量取自 `api/constants.js` 的 `ROLES`（不另写字面量）。

### 3.2 新增：`components/ds-tabbar/ds-tabbar.vue`（easycom 自动注册）

| 能力 | 实现 |
|---|---|
| 换项 | `UserApi.getCurrentUser()` → `tabItemsByRole(role)`；并监听 `uni.$on('role:change')`，在「我的」页切身份后立即换项 |
| 高亮 | `getCurrentPages()` 取当前页 route，与项的 `path` 比对，决定 `<image>` 用普通图还是 `-active` 图 |
| 跳转 | `uni.switchTab`，失败回退 `uni.reLaunch` |
| 隐藏原生栏 | `mounted` 里 `uni.hideTabBar({ animation: false })`（`App.vue` 的 `onLaunch` 再兜一次） |
| 角色兜底 | `isTabPath(role, current)` 为假 → `switchTab(homePathByRole(role))`，`_guarded` 保证只跳一次 |
| 高度占位 | 组件根节点自身 `height: $ds-h-tabbar`（78px，含安全区），视觉栏是 `position: fixed` |

**页面接入方式（关键约定）**：把 `<ds-tabbar />` 放在页面根节点**内容之后**即可 —— 占位由组件自带，页面不必写 `padding-bottom`；`height: 100vh` 的 flex 列布局页面（首页 / 接单 / 后台两页）会自动把内容区让出 78px。

### 3.3 改动的文件

| 文件 | 改动 |
|---|---|
| `pages.json` | `tabBar.list` 由 2 项扩为 5 项：`index` / `guide/orders` / `admin/appointment` / `admin/clerk` / `tabbar/mine`（后三页据此成为 tabBar 页，图标复用新形状） |
| `App.vue` | `onLaunch` 补 `hideNativeTabBar()`（`setTimeout` + `fail` 静默，页面里再兜一次） |
| `pages/index/index.vue` | 模板末尾接 `<ds-tabbar />` |
| `pages/tabbar/mine.vue` | 模板末尾接 `<ds-tabbar />`；新增「成为地陪」行（游客可见）；接单 / 订单管理 / 地陪审核三处 `navigateTo` → `switchTab`；`switchRole` 成功后 `uni.$emit('role:change')` |
| `pages/guide/orders.vue` | 接 `<ds-tabbar />`；导航栏去掉返回键（改空占位），删 `goBack()` |
| `pages/admin/appointment.vue` | 同上 |
| `pages/admin/clerk.vue` | 同上 |
| `scripts/gen-tabbar-icons.mjs` | `ICONS` 增加 `orders`（单据 + 三行内容）与 `clerk`（盾牌 + 对勾）；`COLORS` 收敛为 `NORMAL_COLOR` / `ACTIVE_COLOR`；`targets` 2 → 4 个形状（8 张图） |
| `scripts/check-motion.mjs` | 扫描范围由 `pages/` 扩为 `pages/` + `components/`（组件与页面同一套动效预算，不能因为「不是页面」漏检） |
| `DESIGN.md` | §8 组件清单的 tabBar 行重写为角色化口径；§12 第 5 条同步；§14 变更记录加一行 |
| `README.md` | 补「底部栏随角色变化」一节；`components/` 目录；图标 4 → 8 个；视觉基准更正为 `design/redesign/` |
| `docs/legacy-assets.json` | 16 条资产补登记原因（feat-016 遗留 + 本次 feat-017）后 `--update` 刷新哈希 |

## 四、状态与数据流

```
启动 / 进入 tab 页
   │
   ├─ App.vue onLaunch ──► hideNativeTabBar()（隐藏原生栏，失败静默）
   │
   └─ ds-tabbar mounted
         ├─ current = 当前页 route
         ├─ hideNative()
         ├─ refresh(): UserApi.getCurrentUser()
         │     ├─ items = tabItemsByRole(role)      → 渲染 2~3 项
         │     └─ guard(): isTabPath(role, current)?
         │           ├─ 是 → 停留（高亮当前项）
         │           └─ 否 → switchTab(homePathByRole(role))   ← 角色兜底
         └─ uni.$on('role:change', refresh)

「我的」页切换演示身份
   └─ switchMockRole(role) → loadUser() → uni.$emit('role:change')
         └─ 已挂载的 ds-tabbar 重新换项（当前页是「我的」，三种角色都有，故不跳转）
```

**角色 → 落地页的收敛点只有一处**（`ds-tabbar` 的 `guard()`），因此：

- mock 默认身份是**管理员** → 登录后落首页会被立刻收敛到「订单管理」
- 从别处进入 `pages/index/index` 的地陪/管理员 → 收敛到「接单」/「订单管理」
- 管理员切回游客后停在管理员页 → 收敛到景点列表

## 五、验证证据

**2026-09-28 实测：**

- `./init.ps1` → **第 1-7 步全绿**（第 8 步构建按已知原因跳过：CLI 期望 `src/` 布局，本仓库是 HBuilderX 根目录布局）：
  - 2/8 资产保真 → **通过**（22 条资产，16 条补登记原因后刷新哈希；此前唯一的红项已收尾）
  - 3/8 设计令牌 → 通过（120 变量 / 15 处引用 / DESIGN.md 13 色值全对齐）
  - 4/8 动效 → 通过（9 时长令牌 + `MOTION` 5 项一致 + 3 keyframes；**页面与公共组件 12 个文件**引用 0 个动画名）+ `--self-test` 12 类全检出
  - 5/8 表结构 → 通过（10 表 / 109 字段 / 无外键）
  - 6/8 mock → 通过（52 用户 / 50 地陪 / 20 景点 / 16 订单；11 个页面均未直连 `api/mock/`）
  - 7/8 端到端闭环 → **50/50**
- `node scripts/verify-assets.mjs` → 通过，**路由校验新增的 3 个 tabBar 页与 4 个图标形状全部存在**
- `node scripts/gen-tabbar-icons.mjs --check` → 8 张图标与 `uni.scss` 令牌（`#9a95ae` / `#6f61bd`）逐张一致
- 编辑器诊断：全部改动文件 **0 error 0 warning**

## 六、遗留问题

1. **未做真机/H5 人工走查**（本 feat 的主要观感风险）：
   - 原生栏与自绘栏的**切换瞬间**是否闪一下（`hideTabBar` 在页面 `mounted` 才调用）
   - H5 端 `uni.hideTabBar` 的实际表现（本项目 H5 只作调试，微信为主要目标）
   - 自绘栏在 iPhone 安全区下的高度（占位用 `$ds-h-tabbar` = 78px，栏本体 64px + `env(safe-area-inset-bottom)`）
2. **`orders` 图标被两个语义共用**（地陪「接单」与管理员「订单管理」）：形状是「单据 + 内容线」，可接受；将来若要区分再加一个形状即可（改 `ICONS` + `targets`）。
3. **「成为地陪」只对游客显示**：需求原话是「在地陪的我的页面中新增成为地陪的一行」，按业务语义（申请成为地陪的人是游客）实现为游客可见、地陪与管理员隐藏；若产品意图是「所有角色都看到」，把 `v-if` 去掉即可。
4. **`pages.json` 的 tabBar 从 2 项变 5 项**：如果将来接入微信小程序「自定义 tabBar」或改用官方的 `custom: true`，需要回头重估本方案（当前实现刻意避开了它，见 §1.4）。
5. 三个工作台页原有 `.icon-btn__text` / `.back` 样式已无使用者，本次未清理（不影响渲染，留着可复用）。
