# 原有资产清单（陪玩小程序 → 成都景点地陪小程序）

这份文档是**重构前必须遵守的资产台账**。目的只有一个：把原有「陪玩小程序」里能用的东西全部留住，避免重构时把已经跑通的页面骨架、数据封装、设计规范丢掉重写。

- 机读版本（保真门禁的事实来源，含 sha256）：`docs/legacy-assets.json`
- 代码快照：`git tag legacy-peiwan-baseline-v1`（提交 `ceca05a`）
- 校验命令：`node scripts/verify-assets.mjs`（改过资产后先登记原因，再 `--update` 刷新哈希）

复用档位只有三档：`keep`（原样保留）/ `adapt`（保留结构，替换业务语义）/ `replace`（整体替换）。

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
| `uni.scss` | 样式 | uni-app 内置 SCSS 变量 | adapt |
| `DESIGN.md` | 设计 | Linear 风格设计规范（色板/字号/组件/间距） | adapt |
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

## 二、直接可复用的骨架（重构时优先看这些）

这些是"业务无关"的实现，改文案/改字段就能变成地陪业务：

1. **列表页范式**（`pages/index/index.vue`）
   顶部搜索框 → 横向分类标签（`scroll-view scroll-x`）→ 卡片列表（`scroll-view scroll-y` + `@scrolltolower` 分页）→ `loading / hasMore / 空状态` 三态 → 右滑筛选抽屉（`drawer-mask + drawer`，含重置/确定）。
   改造点：分类换成景点区域或主题，卡片字段换成景点封面/名称/票价/热度，筛选换成区域 + 主题 + 讲解时长。

2. **详情 + 下单范式**（`pages/clerk/detail.vue`）
   信息卡（头像/名称/性别标签/城市/单量/标签/简介）→ 服务单选（`selectGoods` + `check-circle`）→ `picker mode="date"` 日期 → 时段三选一 → 备注 `textarea` → 底部固定合计栏（`totalPrice` computed）。
   改造点：达人换成景点 + 地陪向导，服务项换成讲解场次/套餐。

3. **预约状态机**（全仓库统一约定，不要改）

   | status | 含义 | 出现位置 |
   |---|---|---|
   | `0` | 待服务 | `my.vue` 可取消、`admin/appointment.vue` 可标记完成 |
   | `1` | 已完成 | `admin/appointment.vue` |
   | `2` | 已取消 | `my.vue` |

   时段枚举：`morning / afternoon / evening`（`my.vue`、`admin/appointment.vue` 各自维护了 label 映射表）。

4. **分页约定**：`pageNo / pageSize / total / hasMore`，`refresh` 时重置 `pageNo=1` 并清空列表，`hasMore = list.length < total`。

5. **数据层双通道范式**（`api/index.js`）
   页面只调 `XxxApi.method()`；`useMock === true` 时返回本地 mock；真机走 `// #ifdef MP-WEIXIN` 条件编译分支调 `wx.cloud`。**页面里不要直连数据库。**

6. **自定义导航范式**（所有页面统一）
   `status-bar` 占位（`uni.getSystemInfoSync().statusBarHeight`）+ 44px `navbar`（`nav-back` / `nav-title` / `nav-right`），配合 `pages.json` 的 `navigationStyle: custom`。

7. **设计规范**（`DESIGN.md`）
   8px 间距系统、卡片 `border-radius: 12px` + `0 1px 3px rgba(0,0,0,0.04)` 阴影、触摸目标 ≥ 44px、字号层级 24/20/17/15/14/13/12、性别色（女 `#FF4D6A` / 男 `#007AFF`）、状态色（成功 `#34C759` / 警告 `#FF9500` / 错误 `#FF3B30`）。这些与业务无关，直接沿用。

## 三、需要改造的部分

| 资产 | 改造方向 |
|---|---|
| `pages.json` | 页面路径与 tabBar 文案；新增的管理页需在此注册 |
| `manifest.json` | `name` / `description` / `appid` 换成地陪小程序信息 |
| `App.vue` | 云环境 ID 占位符 `peiwan-lite-xxx` 换成真实环境；全局色彩随新规范 |
| `uni.scss` | 主色与页面实现不一致（见 gap-004），重构时统一 |
| `DESIGN.md` | 主色 `#FF4D6A`（陪玩粉）换成成都文旅气质色板；文案基调从"游戏陪玩"改为"城市文化体验" |
| `README.md` | 功能模块描述替换；技术栈描述去掉未实际使用的 Pinia（gap-005） |
| `api/index.js` | `clerks → guides`、`categories → attractions`；mock 数据换成成都景点 |
| `pages/index/index.vue` | 见上文第 1 点 |
| `pages/clerk/detail.vue` | 见上文第 2 点 |
| `pages/tabbar/mine.vue` | 菜单与文案 |
| `pages/admin/clerk.vue` | 改为地陪向导审核，并补齐缺失的 `/pages/admin/clerk/edit` |
| `static/tabbar/*.png` | 可选：换成景点主题图标 |

## 四、已知缺口（重构前就存在，已登记为 feature）

| ID | 问题 | 影响 | 计划功能 |
|---|---|---|---|
| gap-001 | `/static/images/default-avatar.png` 被 6 处引用，但 `static/images/` 目录不存在 | 头像全部裂图 | feat-008 |
| gap-002 | 登录页跳转 `/pages/webview/agreement`，该页面未注册 | 点协议链接报错 | feat-008 |
| gap-003 | 管理端跳转 `/pages/admin/clerk/edit`，该页面不存在 | 添加/编辑达人不可用 | feat-007 |
| gap-004 | `uni.scss` 与 tabBar 用 `#ff6b81`，页面与 `DESIGN.md` 用 `#FF4D6A` | 主色不统一 | feat-009 |
| gap-005 | README 声称使用 Pinia，实际未安装未使用 | 文档与实际不符 | feat-009 |

`scripts/verify-assets.mjs` 会把 gap-001 / gap-002 / gap-003 作为告警输出（不判失败，因为它们不是这次重构引入的），修掉后告警自然消失。

## 五、改动纪律

1. 要改 `docs/legacy-assets.json` 里登记的资产，先在该条目的 `note` 里写清原因与档位，再运行 `node scripts/verify-assets.mjs --update`。
2. 校验失败时不要绕过，先判断是"误改"还是"有意重构"。
3. `keep` 档资产在重构期间应保持哈希不变（`utils/index.js`、`pages/appointment/my.vue`、`pages/admin/appointment.vue`、`pages/login/login.vue`、`main.js`、`vite.config.js`、`index.html`、4 个 tabBar 图标）。
