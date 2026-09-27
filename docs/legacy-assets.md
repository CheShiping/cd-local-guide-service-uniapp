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
| `App.vue` | 入口 | 启动、全局样式、未登录重定向 | adapt |
| `main.js` | 入口 | `createSSRApp` 应用工厂 | keep |
| `manifest.json` | 配置 | 应用信息、mp-weixin / h5 平台配置 | adapt |
| `pages.json` | 配置 | 页面注册（现 11 个）、tabBar、全局自定义导航 | adapt |
| `package.json` | 配置 | 依赖与 4 个构建脚本 | keep |
| `vite.config.js` | 配置 | `@` → 项目根目录别名 | keep |
| `index.html` | 配置 | H5 入口模板 | keep |
| `uni.scss` | 样式 | uni-app 内置 SCSS 变量 + 项目令牌 `$ds-*`（2026-09-26 已按定稿重写） | adapt |
| `DESIGN.md` | 设计 | 原 Linear 风格规范，**2026-09-26 已删除并重写**为「宣纸 · 疏」规范（记入 `removedAssets`） | removed |
| `README.md` | 文档 | 结构、模块、运行方式（2026-09-26 已改写为 MVP 口径） | adapt |
| `api/index.js` | 数据层 | 数据层出口（`USE_MOCK` + 6 个业务模块 + 常量 + 错误契约） | adapt |
| `utils/index.js` | 数据层 | `formatDate` / `formatPrice` / `debounce` / `throttle` | keep |
| `pages/login/login.vue` | 页面 | 登录页（含 H5/小程序双通道）；2026-09-26 由 `keep` 改为 `adapt` 并重写样式与文案 | adapt |
| `pages/index/index.vue` | 页面 | 原列表页骨架：搜索 + 分类 + 分页 + 空状态 + 筛选抽屉 | adapt |
| `pages/clerk/detail.vue` | 页面 | 原详情 + 下单表单 + 底部合计栏 | adapt |
| `pages/appointment/my.vue` | 页面 | 预约列表 + 状态 Tab + 取消 + 下拉刷新 | adapt |
| `pages/tabbar/mine.vue` | 页面 | 个人中心：用户卡 + 菜单组 + 管理员分区 | adapt |
| `pages/admin/clerk.vue` | 页面 | 审核流：待审/已通过 Tab + 通过/拒绝 | adapt |
| `pages/admin/appointment.vue` | 页面 | 预约管理：日期+状态筛选 + 标记完成 | adapt |
| `static/tabbar/*.png` | 静态资源 | 首页/我的 tabBar 图标（4 个）——**2026-09-26 已由脚本重新生成**（线性规范 + 竹青/灰） | replace |

> 复用档位说明：`keep` 档在重构期间**哈希不变**（见第六节）。`pages/login/login.vue`、`pages/appointment/my.vue`、`pages/admin/appointment.vue` 原为 `keep`，因业务语义整体替换（登录页换品牌与配色、两个订单页换四态语义与视觉）先后改为 `adapt`，改动原因均登记在 `docs/legacy-assets.json` 的 `note` 里。

> **feat-015（2026-09-26 动效）改了 11 条在册资产**：`App.vue`（全局 keyframes、页面转场类、按压叠层）、`uni.scss`（§1.8 动效令牌）、`pages.json`（`globalStyle.app-plus` 页面转场配置）、`README.md`（验证 8 步），以及 7 个页面（`login` / `index` / `clerk/detail` / `appointment/my` / `tabbar/mine` / `admin/clerk` / `admin/appointment`）。**档位未变**（仍是 `adapt`），只是内容更新；每条 note 均已补动效说明再刷新哈希。

## 二、MVP 落地映射（按 `docs/mvp-scope.json` 的 7 个页面）

游客流程：**先选景点 → 再选能带该景点的地陪 → 详情 → 下单**（见 `dev-001`，与原始文档不同）

| MVP 页面 | 落地承载 | 处理方式 | 状态 |
|---|---|---|---|
| 景点列表页（首页） | `pages/index/index.vue` | 改造：卡片换成景点（封面/名称/区域·场景/「N 位地陪可约」），标签换成区域文字页签 | ✅ feat-006 |
| 地陪列表页 | 新增 `/pages/guide/list?attractionId=xxx` | 新增：只列能带该景点的地陪（头像/昵称/接单数/区域标签/服务类型/朱砂起价），复用分页三态与空状态，筛选改用 chip | ✅ feat-007 |
| 地陪详情页 | `pages/clerk/detail.vue` | 改造：保留介绍/擅长景点/套餐/可约日期；**移除评价区块**（`dev-002`）；**剥离预约表单** | ✅ feat-008 |
| 下单页 | 新增 `/pages/order/create` | 新增：景点/地陪/套餐只读回显（景点可换）+ 日期 + 时段/小时数 + 人数 + 备注 | ✅ feat-009 |
| 订单页 | `pages/appointment/my.vue` | 改造：状态 Tab 由 3 态对齐为 4 态 + 订单卡补全订单号/金额/人数 | ✅ feat-010 |
| 接单页（地陪端） | 新增 `/pages/guide/orders` | 新增：无原有页面可复用，套用列表范式 + 统计条 + 状态标签 | ✅ feat-011 |
| 后台订单管理（管理端） | `pages/admin/appointment.vue` + `pages/admin/clerk.vue` | 改造：订单人工确认 + 地陪审核；砍掉「添加/编辑达人」入口（不新建 `/pages/admin/clerk/edit`） | ✅ feat-012 |

不在 MVP 7 页内但需要适配：`pages/tabbar/mine.vue`（按角色分流游客/地陪/管理员入口，✅ feat-011）、`pages/login/login.vue`（登录后落首页，✅ feat-013 换新配色）、`pages/webview/agreement.vue`（新增协议页，✅ feat-003）。

## 三、直接可复用的骨架（重构时优先看这些）

这些是"业务无关"的实现，改文案/改字段就能变成地陪业务：

1. **列表页范式**（原 `pages/index/index.vue`）
   顶部搜索框 → 横向分类标签（`scroll-view scroll-x`）→ 卡片列表（`scroll-view scroll-y` + `@scrolltolower` 分页）→ `loading / hasMore / 空状态` 三态 → 右滑筛选抽屉（`drawer-mask + drawer`）。
   **实际改造（feat-006/007）**：这个范式被复用到**两级页面**——首页景区列表（区域文字页签 + 景点卡）与 `/pages/guide/list`（chip 筛选 + 地陪卡）。两级都**弃用了筛选抽屉**，改为「一级文字页签 + 二级 chip」（DESIGN.md 要求不要两排都是胶囊）；分页三态与空状态原样沿用。

2. **详情 + 下单范式**（原 `pages/clerk/detail.vue`）
   信息卡（头像/名称/性别标签/城市/单量/标签/简介）→ 服务单选（`selectGoods` + `check-circle`）→ `picker mode="date"` 日期 → 时段三选一 → 备注 `textarea` → 底部固定合计栏（`totalPrice` computed）。
   **实际改造（feat-008/009）**：这个范式被**拆成两个页面**复用——详情页只留「展示 + 套餐单选 + 可约日期 + 底部操作栏（立即预约）」，表单（日期/时段/人数/备注）与合计栏移到新增的 `/pages/order/create`。`check-circle` 单选交互、`picker mode="date"`、底部固定合计栏三处实现范式都沿用了下来。

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

   > **已完成（feat-005，2026-09-26）**：两个页面的 `statusLabels` / `timeSlots` 已删除，语义唯一来源是 `api/constants.js`（`ORDER_STATUS` / `ORDER_STATUS_LABELS` / `canTransit` / `timeSlotLabel`）；两页数据源由 `AppointmentApi` 改为 `OrderApi`；后台三个操作（确认档期 / 标记完成 / 处理取消）由状态白名单推导。
   >
   > **feat-013 收尾**：`ClerkApi` / `CategoryApi` / `AppointmentApi` 过渡适配层**已整体删除**（页面对它们已无引用），「4 态压缩成 3 态」的映射从仓库里消失；地陪端另立口径 `isGuideCommitted()`（已接下的单 = 待确认已接 或 已确认），避免地陪接完单后订单从列表消失。

4. **分页约定**：`pageNo / pageSize / total / hasMore`，`refresh` 时重置 `pageNo=1` 并清空列表，`hasMore = list.length < total`。

5. **数据层双通道范式**（`api/index.js`）
   页面只调 `XxxApi.method()`；`useMock === true` 时返回本地 mock；真机走 `// #ifdef MP-WEIXIN` 条件编译分支调 `wx.cloud`。**页面里不要直连数据库。**

6. **自定义导航范式**（所有页面统一）
   `status-bar` 占位（`uni.getSystemInfoSync().statusBarHeight`）+ 44px `navbar`（`nav-back` / `nav-title` / `nav-right`），配合 `pages.json` 的 `navigationStyle: custom`。

7. **设计规范**（`DESIGN.md`，2026-09-26 已定稿重写）
   仍然沿用的结构约定：8px 间距基数、卡片 12px 圆角、触摸目标 ≥ 44px、列表行 ≥ 56px、自定义导航栏（status-bar + 52px navbar）。
   已替换的部分：主色由 `#FF4D6A` 改为竹青绿 `#2f6b5e`，页面底由纯白改为宣纸 `#F7F4ED`，状态色不再用系统绿橙红。令牌口径见 `DESIGN.md`，落地变量见 `uni.scss` 的 `$ds-*`。
   **feat-015 补上动效**：`DESIGN.md` §13 定规范、`uni.scss` §1.8 定令牌、`utils/motion.js` 是列表入场的唯一入口、keyframes 集中在 `App.vue` 全局样式，`scripts/check-motion.mjs` 把关。

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
| `pages/appointment/my.vue` | 订单页对齐 4 态（见上文第 3 点）：**语义与数据源已在 feat-005 完成**，剩余视觉重做与订单卡字段补全 | feat-010 |
| `pages/tabbar/mine.vue` | 菜单与角色分流入口 | feat-011 |
| `pages/admin/clerk.vue` | 改为地陪审核；**移除**指向未创建的 `/pages/admin/clerk/edit` 的入口（gap-003） | feat-012 |
| `pages/admin/appointment.vue` | 后台订单管理：人工确认档期、处理取消 | feat-012 |
| `static/tabbar/*.png` | **已由 `scripts/gen-tabbar-icons.mjs` 重新生成**（线性 24 网格、未选中竹灰、选中竹青）；景点封面与地陪头像走后端 URL，不补本地占位图 | feat-013 |

## 五、已知缺口（重构前就存在，已登记为 feature）

| ID | 问题 | 影响 | 计划功能 |
|---|---|---|---|
| gap-001 | `/static/images/default-avatar.png` 被 6 处引用，但 `static/images/` 目录不存在 | 头像全部裂图 | ✅ **已解决（feat-003，2026-09-26）**：6 处引用全部改为接口字段（`guideAvatarUrl` / `touristAvatarUrl` / `avatar` / `avatarUrl`）+ 容器 `$ds-primary-container` 底色兜底；按 dev-006 不新增本地占位图 |
| gap-002 | 登录页跳转 `/pages/webview/agreement`，该页面未注册 | 点协议链接报错 | ✅ **已解决（feat-003，2026-09-26）**：`pages/webview/agreement.vue` 已注册，支持 `type=user\|privacy` |
| gap-003 | 管理端跳转 `/pages/admin/clerk/edit`，该页面不存在 | 添加/编辑达人不可用 | ✅ **已解决（feat-012，2026-09-26）**：按 MVP 砍范围——移除入口，不新建页面（审核只需通过/拒绝） |
| gap-004 | 三处主色原不一致：`uni.scss` / tabBar 用 `#ff6b81`，页面与旧 `DESIGN.md` 用 `#FF4D6A` | 主色不统一 | ✅ **已解决（feat-013，2026-09-26）**：tabBar 改 `#2f6b5e` / `#6b6862`，8 个页面全部改用 `$ds-*`，代码与配置中旧色值 0 命中 |
| gap-005 | README 声称使用 Pinia，实际未安装未使用 | 文档与实际不符 | ✅ **已解决（feat-013，2026-09-26）**：README 重写，技术栈改为「原生 uni.request 封装」 |

`scripts/verify-assets.mjs` 会把未注册页面引用作为告警输出（不判失败）。**2026-09-26 起告警为 0 条**：gap-001 / 002 由 feat-003 关闭，gap-003 由 feat-012 关闭，gap-004 / 005 由 feat-013 关闭。

## 六、改动纪律

1. 要改 `docs/legacy-assets.json` 里登记的资产，先在该条目的 `note` 里写清原因与档位，再运行 `node scripts/verify-assets.mjs --update`。
2. 校验失败时不要绕过，先判断是「误改」还是「有意重构」。
3. `keep` 档资产在重构期间应保持哈希不变：`main.js`、`package.json`、`vite.config.js`、`index.html`、`utils/index.js`。
   （`pages/login/login.vue` 原在 `keep` 档，feat-013 因首屏品牌与配色必须整体替换而改为 `adapt`；4 个 tabBar 图标原在 `keep` 档，2026-09-26 因「灰+粉」与新主色冲突、由 `scripts/gen-tabbar-icons.mjs` 重新生成而改为 `replace`。变更原因均已登记。）
4. `adapt` 档改动必须与 `feature_list.json` 里对应的功能对齐，不许顺手改（MVP 只做 3 件事）。
5. 新增页面（`guide/list`、`order/create`、`guide/orders`、`webview/agreement`）与新增脚本 / 文档属**新产物**，不进本台账；台账只记录「重构前就存在的资产」。
