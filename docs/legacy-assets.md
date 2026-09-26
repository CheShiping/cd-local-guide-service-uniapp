# 原有资产清单（陪玩小程序 → 成都景点地陪小程序）

这份文档是**重构前必须遵守的资产台账**。目的只有一个：把原有「陪玩小程序」里能用的东西全部留住，避免重构时把已经跑通的页面骨架、数据封装、设计规范丢掉重写。

- 机读版本（保真门禁的事实来源，含 sha256）：`docs/legacy-assets.json`
- 代码快照：`git tag legacy-peiwan-baseline-v1`（提交 `ceca05a`）
- 校验命令：`node scripts/verify-assets.mjs`（改过资产后先登记原因，再 `--update` 刷新哈希）
- 有意删除的资产记录在 `docs/legacy-assets.json` 的 `removedAssets`（当前 1 条：`DESIGN.md`）

复用档位只有三档：`keep`（原样保留）/ `adapt`（保留结构，替换业务语义）/ `replace`（整体替换）。
有意删除的资产不进 `assets`，只进 `removedAssets`，并写明原因与批准人。

## 一、资产总览

| 资产 | 类别 | 作用 | 复用 |
|---|---|---|---|
| `App.vue` | 入口 | 启动、全局样式、未登录重定向、云开发初始化 | adapt |
| `main.js` | 入口 | `createSSRApp` 应用工厂 | keep |
| `manifest.json` | 配置 | 应用信息、mp-weixin / h5 平台配置 | adapt |
| `pages.json` | 配置 | 页面注册、tabBar、全局自定义导航 | adapt |
| `package.json` | 配置 | 依赖与 4 个构建脚本 | keep |
| `vite.config.js` | 配置 | `@` → 项目根目录别名 | keep |
| `index.html` | 配置 | H5 入口模板 | keep |
| `uni.scss` | 样式 | uni-app 内置 SCSS 变量 + 项目令牌 `$ds-*`（2026-09-26 已按定稿重写） | adapt |
| `DESIGN.md` | 设计 | 原 Linear 风格规范，**2026-09-26 已删除并重写**为「宣纸 · 疏」规范（记入 `removedAssets`） | removed |
| `README.md` | 文档 | 结构、模块、运行方式、云开发配置 | adapt |
| `api/index.js` | 数据层 | 云数据库封装 + `useMock` 模拟数据；User/Clerk/Category/Appointment 四模块 | adapt |
| `utils/index.js` | 数据层 | `formatDate` / `formatPrice` / `debounce` / `throttle` | keep |
| `pages/login/login.vue` | 页面 | 登录页（含 H5/小程序双通道） | keep |
| `pages/index/index.vue` | 页面 | 列表页骨架：搜索 + 分类 + 分页 + 空状态 + 筛选抽屉 | adapt |
| `pages/clerk/detail.vue` | 页面 | 详情 + 下单表单 + 底部合计栏 | adapt |
| `pages/appointment/my.vue` | 页面 | 预约列表 + 状态 Tab + 取消 + 下拉刷新 | keep |
| `pages/tabbar/mine.vue` | 页面 | 个人中心：用户卡 + 菜单组 + 管理员分区 | adapt |
| `pages/admin/clerk.vue` | 页面 | 审核流：待审/已通过 Tab + 通过/拒绝 | adapt |
| `pages/admin/appointment.vue` | 页面 | 预约管理：日期+状态筛选 + 标记完成 | keep |
| `static/tabbar/*.png` | 静态资源 | 首页/我的 tabBar 图标（4 个） | keep |

## 二、MVP 落地映射（按 `docs/mvp-scope.json` 的 7 个页面）

游客流程：**先选景点 → 再选能带该景点的地陪 → 详情 → 下单**（见 `dev-001`，与原始文档不同）

| MVP 页面 | 落地承载 | 处理方式 |
|---|---|---|
| 景点列表页（首页） | `pages/index/index.vue` | 改造：卡片换成景点（封面/名称/所属区域/区域类型标签/场景短描述），标签换成 3 类区域 |
| 地陪列表页 | 新增 `/pages/guide/list?attractionId=xxx` | 新增：只列出能带该景点的地陪（头像/昵称/擅长区域/服务类型/价格），复用现有列表页的分页三态、空状态与筛选抽屉范式 |
| 地陪详情页 | `pages/clerk/detail.vue` | 改造：保留个人介绍、擅长景点、服务套餐、可约日期；**移除评价区块**（`dev-002`）；**剥离预约表单** |
| 下单页 | 新增 `/pages/order/create` | 新增：景点预填（可在地陪擅长景点内更换）/ 日期 / 半天·全天·小时 / 人数 / 备注；复用详情页表单骨架 |
| 订单页 | `pages/appointment/my.vue` | 改造：状态 Tab 由 3 态对齐为 4 态（待确认/已确认/已完成/已取消） |
| 接单页（地陪端） | 新增 `/pages/guide/orders` | 新增：无原有页面可复用，但可套用列表页 + 状态标签范式 |
| 后台订单管理（管理端） | `pages/admin/appointment.vue` + `pages/admin/clerk.vue` | 改造：订单人工确认 + 地陪审核；按 MVP 砍掉「添加/编辑达人」入口（不新建 `/pages/admin/clerk/edit`） |

不在 MVP 7 页内但需要被动适配：`pages/tabbar/mine.vue`（按角色分流游客/地陪/管理员入口）、`pages/login/login.vue`（登录后按角色落点）。

## 三、直接可复用的骨架（重构时优先看这些）

这些是"业务无关"的实现，改文案/改字段就能变成地陪业务：

1. **列表页范式**（`pages/index/index.vue`）
   顶部搜索框 → 横向分类标签（`scroll-view scroll-x`）→ 卡片列表（`scroll-view scroll-y` + `@scrolltolower` 分页）→ `loading / hasMore / 空状态` 三态 → 右滑筛选抽屉（`drawer-mask + drawer`，含重置/确定）。
   改造点（MVP）：**本页升级为景点列表页（首页）**——卡片字段换成景点（封面/名称/所属区域/区域类型标签/场景短描述），顶部标签沿用分类标签做成 3 类区域。

   同一个范式在下一级再次复用：地陪列表页（`/pages/guide/list`）用它渲染地陪卡片（头像/昵称/擅长区域/服务类型/价格），筛选抽屉改为区域类型 + 服务类型 + 价格区间（**不含性别筛选，也不含评分/评价**，见 `dev-002`）。

2. **详情 + 下单范式**（`pages/clerk/detail.vue`）
   信息卡（头像/名称/性别标签/城市/单量/标签/简介）→ 服务单选（`selectGoods` + `check-circle`）→ `picker mode="date"` 日期 → 时段三选一 → 备注 `textarea` → 底部固定合计栏（`totalPrice` computed）。
   改造点（MVP）：达人换成地陪，服务项换成 3 个套餐 SKU；**表单与底部合计栏整体剥离**到新增的 `/pages/order/create` 下单页，本页只留展示（介绍/擅长景点/套餐/可约日期/评价）。

3. **订单状态机**（现有 3 态 → MVP 需升级为 4 态，见 feat-005）

   现状（重构前，仓库里的实现）：

   | status | 含义 | 出现位置 |
   |---|---|---|
   | `0` | 待服务 | `my.vue` 可取消、`admin/appointment.vue` 可标记完成 |
   | `1` | 已完成 | `admin/appointment.vue` |
   | `2` | 已取消 | `my.vue` |

   MVP 目标 4 态：待确认 / 已确认 / 已完成 / 已取消。注意两个坑：

   - 语义不再兼容，必须一次性改完 `api/index.js` 与所有订单页，不能各页各写一套
   - label 映射表目前分散在 `my.vue` 与 `admin/appointment.vue`（各自维护 `statusLabels`），升级时应集中到一处

   时段枚举同理：`morning / afternoon / evening` 现在也是两个页面各写一份；MVP 还要新增 `full-day` 与 `hourly`。

4. **分页约定**：`pageNo / pageSize / total / hasMore`，`refresh` 时重置 `pageNo=1` 并清空列表，`hasMore = list.length < total`。

5. **数据层双通道范式**（`api/index.js`）
   页面只调 `XxxApi.method()`；`useMock === true` 时返回本地 mock；真机走 `// #ifdef MP-WEIXIN` 条件编译分支调 `wx.cloud`。**页面里不要直连数据库。**

6. **自定义导航范式**（所有页面统一）
   `status-bar` 占位（`uni.getSystemInfoSync().statusBarHeight`）+ 44px `navbar`（`nav-back` / `nav-title` / `nav-right`），配合 `pages.json` 的 `navigationStyle: custom`。

7. **设计规范**（`DESIGN.md`，2026-09-26 已定稿重写）
   仍然沿用的结构约定：8px 间距基数、卡片 12px 圆角、触摸目标 ≥ 44px、列表行 ≥ 56px、自定义导航栏（status-bar + 52px navbar）。
   已替换的部分：主色由 `#FF4D6A` 改为竹青绿 `#2f6b5e`，页面底由纯白改为宣纸 `#F7F4ED`，状态色不再用系统绿橙红。令牌口径见 `DESIGN.md`，落地变量见 `uni.scss` 的 `$ds-*`。

## 四、需要改造的部分

| 资产 | 改造方向 | 归属功能 |
|---|---|---|
| `pages.json` | 新增 3 个页面注册（`pages/guide/list`、`pages/order/create`、`pages/guide/orders`）+ 协议页；tabBar 文案调整 | feat-003 / feat-007 / feat-009 / feat-011 |
| `manifest.json` | `name` / `description` / `appid` 换成地陪小程序信息 | feat-013 |
| `App.vue` | 云环境 ID 占位符 `peiwan-lite-xxx` 换成真实环境；全局色彩随新规范 | feat-013 |
| `uni.scss` | 已按定稿重写：竹青绿主色 + `$ds-*` 令牌；剩余偏差是页面内硬编码色值与 `pages.json` tabBar 配色（gap-004） | feat-013 |
| `DESIGN.md` | 已删除并重写为「宣纸 · 疏」规范（原 Linear 内容不保留） | feat-013 |
| `README.md` | 功能模块描述替换为 MVP 范围；技术栈去掉未实际使用的 Pinia（gap-005） | feat-013 |
| `api/index.js` | `clerks → guides`、`categories → attractions/regionTypes`，mock 换为 10 景点 + 3 套餐 + 4 态订单 + 3 角色；**全部走 mock，签名对齐未来 HTTP** | feat-004 / feat-005 |
| `pages/index/index.vue` | 见上文第 1 点（升级为景点列表页） | feat-006 |
| `pages/clerk/detail.vue` | 见上文第 2 点（详情留展示、去评价、表单剥离） | feat-008 |
| `pages/appointment/my.vue` | 订单页对齐 4 态（见上文第 3 点） | feat-010 |
| `pages/tabbar/mine.vue` | 菜单与角色分流入口 | feat-011 |
| `pages/admin/clerk.vue` | 改为地陪审核；**移除**指向未创建的 `/pages/admin/clerk/edit` 的入口（gap-003） | feat-012 |
| `pages/admin/appointment.vue` | 后台订单管理：人工确认档期、处理取消 | feat-012 |
| `static/tabbar/*.png` | 可选：换成成都主题图标；另需补景点封面与地陪头像占位图 | feat-013 |

## 四、已知缺口（重构前就存在，已登记为 feature）

| ID | 问题 | 影响 | 计划功能 |
|---|---|---|---|
| gap-001 | `/static/images/default-avatar.png` 被 6 处引用，但 `static/images/` 目录不存在 | 头像全部裂图 | feat-003（**不新增本地占位图**：改为图片字段 + `primary-container` 底色兜底，见 dev-006） |
| gap-002 | 登录页跳转 `/pages/webview/agreement`，该页面未注册 | 点协议链接报错 | feat-003（新建协议页并在 `pages.json` 注册；改 `pages.json` 需先登记再 `--update`） |
| gap-003 | 管理端跳转 `/pages/admin/clerk/edit`，该页面不存在 | 添加/编辑达人不可用 | feat-012（**按 MVP 砍范围：移除入口，不新建页面**） |
| gap-004 | 三处主色原不一致：`uni.scss` / tabBar 用 `#ff6b81`，页面与旧 `DESIGN.md` 用 `#FF4D6A` | 已部分收敛：`uni.scss` 与 `DESIGN.md` 统一为 `#2f6b5e`；页面硬编码色值与 tabBar 配色待改 | feat-013 |
| gap-005 | README 声称使用 Pinia，实际未安装未使用 | 文档与实际不符 | feat-013 |

`scripts/verify-assets.mjs` 会把 gap-001 / gap-002 / gap-003 作为告警输出（不判失败，因为它们不是这次重构引入的），修掉后告警自然消失。

## 六、改动纪律

1. 要改 `docs/legacy-assets.json` 里登记的资产，先在该条目的 `note` 里写清原因与档位，再运行 `node scripts/verify-assets.mjs --update`。
2. 校验失败时不要绕过，先判断是「误改」还是「有意重构」。
3. `keep` 档资产在重构期间应保持哈希不变：`main.js`、`vite.config.js`、`index.html`、`utils/index.js`、`pages/login/login.vue`、4 个 tabBar 图标。
4. `adapt` 档改动必须与 `feature_list.json` 里对应的功能对齐，不许顺手改（MVP 只做 3 件事）。
