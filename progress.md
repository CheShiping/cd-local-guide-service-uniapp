# 会话进度日志

## 当前状态

**最后更新：** 2026-09-26
**当前功能：** 无进行中 —— **MVP 全部功能已完成**（feat-001 ~ feat-014 中 14 个全部 `done`）
**验证入口：** `./init.ps1` / `bash init.sh` 共 **7 步**（本轮新增第 6 步「端到端闭环校验」，见下方 bug 记录）
**当前阶段：** 阶段 0「保留原有资产」= 完成；阶段 1「成都景点地陪小程序」= **7 个页面全部落地、三端闭环打通**，剩余工作只剩真机人工走查与后端对接

## 阶段 1 范围（已锁定）

来源：`docs/MVP 范围：只做 3 件事.md` → 范围唯一事实来源：`docs/mvp-scope.json`（`deviations` 8 条）

- **只做 3 件事**：游客能下单 / 地陪能接单 / 平台能确认订单
- **闭环**：游客选景点 → 选能带该景点的地陪 → 选套餐与日期 → 提交预约 → 地陪接单 → 平台确认档期 → 地陪完成服务
- **7 个页面**：景点列表（首页）、地陪列表、地陪详情、下单、订单（游客端）+ 接单（地陪端）+ 后台订单管理（管理端）；另有登录页与协议页（公共）
- **20 景点 / 7 类区域（字典表）/ 3 个套餐 SKU / 3 种预约类型 / 4 态订单 / 3 种角色**
- **数据策略**：MVP 全部 mock（`USE_MOCK = true`），后续切真实后端 HTTP，页面代码不动
- **图片策略**：景点 `coverUrl`、地陪 `avatarUrl` 由后端返回；原型阶段先用网络占位图；禁止自绘插画冒充照片
- 不做：IM、定位、分销、团购、广场、等级、自动结算、多城市、优惠券、动态定价、行程日志、轨迹、门店、复杂排班、加价规则、评价、地陪申请流程、投诉

## 视觉（已定稿）

- **主题：宣纸 · 疏**（唯一有效主题；历史备选「竹影 · 纹」「青瓷 · 紧」按定稿移除）
- 骨架：Material Design 3 令牌（色彩角色 / Type Scale / Shape / Elevation / State Layer / Motion）
- 主色竹青绿 `#2f6b5e` 只用于可点与选中；朱砂 `#b4462f`（M3 tertiary）只给价格与关键数字；页面底为宣纸 `#f7f4ed`
- 标题走系统宋体栈 + `letter-spacing: .04em`，**不加载任何字体文件**；纹理用 CSS 径向点阵生成
- 三个同步源：`DESIGN.md`（文字口径）+ `uni.scss`（`$ds-*` 落地令牌）+ `design/html/prototype.html`（7 屏视觉基准）

## 数据库（已定稿）

- 建表语句：`docx/database/schema.sql`（**10 张表**：区域字典已按决策加回）
- 初始化数据：`docx/database/seed.sql`（区域 7 条 / 套餐 3 条 / 景点 20 条，`ON DUPLICATE KEY UPDATE` 可重复执行）
- **区域是后台可维护的字典数据**：`region_types` 表存名称/覆盖范围/排序/上下架；MVP 初始 7 类；前台只展示「启用且下有在售景点」的区域
- 设计说明：`docx/database/数据库设计.md`（表清单与精简代价、订单号规则、字段三方映射、索引理由、mock 落地约定）
- 表范围：users / region_types / attractions / guides / guide_region_types / guide_attractions / package_skus / guide_packages / guide_available_dates / orders
- **mock 规模**：7 区域 / 20 景点 / 3 套餐 / 50 地陪 / 52 用户 / 16 订单；确定性生成（固定 seed）保证可复现
- **不使用外键**：表间只用 id 关联 + 索引，完整性由应用层保证；校验脚本拦截 `FOREIGN KEY`
- **订单号规则**：`CD + YYMMDD + 业务类型(A 半天/B 全天/C 专项·小时) + 4 位当日序号` = **13 位**，如 `CD260926A0001`

## 一致性审计（2026-09-26）

对 `feature_list.json` × 定稿原型 7 屏 × MVP 要求 × 现有代码 做交叉审计，发现并修正 12 处不一致（摘要）：

| # | 问题 | 修正 |
|---|---|---|
| 1 | feat-006 写「筛选抽屉改为区域+价格」，与原型 01 屏不符 | 改为「移除搜索框与性别/价格筛选抽屉」 |
| 2 | feat-007 写「复用筛选抽屉范式」，与原型 02 屏 chip 不符 | 改为「chip 筛选（半日/全天/专项/价格）」 |
| 3 | feat-008 未提三项指标与底部固定操作栏 | 补上 |
| 4 | feat-009 未说明「半天/全天/小时」如何选择 | 新增 `BOOKING_TYPE_UI` 规则（类型跟随套餐） |
| 5-6 | feat-011 / feat-012 未提统计条与筛选 | 补上 |
| 7 | 原型没有「地陪审核」屏 | 审核复用 `pages/admin/clerk.vue`，套用 07 屏列表样式 |
| 8 | 「投诉」没有任何页面承载 | 列入不做清单 |
| 9 | `pageMappingNote` 自相矛盾 | 改为「4 个改造 + 3 个新增」 |
| 10 | feat-013 只依赖 feat-006 | 依赖改为 `feat-010` + `feat-012` |
| 11 | feat-003 原计划补本地占位图，与图片策略冲突 | 改为「图片字段 + 底色兜底」 |
| 12 | feat-001/002 文案仍写「23 条资产」 | 更新为「22 条在册 + 1 条 removedAssets」 |

## 状态概览

### 已完成（MVP 全量）

- [x] 原有资产盘点与冻结：`git tag legacy-peiwan-baseline-v1` @ `ceca05a`
- [x] 资产台账与保真门禁：`docs/legacy-assets.md` / `.json`（22 条在册 + 1 条 `removedAssets`）+ `scripts/verify-assets.mjs`
- [x] harness 骨架：`AGENTS.md`、`feature_list.json`、`progress.md`、`session-handoff.md`
- [x] MVP 范围固化 + 8 处修订：`docs/mvp-scope.json`
- [x] HTML 原型 7 屏 + 视觉定稿落地：`design/html/prototype.html`、`DESIGN.md`、`uni.scss`
- [x] **feat-014 数据库表结构定稿**：10 张表 / 109 字段 + `seed.sql` + `scripts/check-schema.mjs`
- [x] **feat-004 MVP 数据层**：`api/` 分层（constants / errors / mock / http）+ `scripts/check-mock.mjs`
- [x] **feat-003 协议页与图片兜底**：`pages/webview/agreement.vue` + 6 处图片引用改字段 + 底色兜底
- [x] **feat-005 订单四态状态机**：四态语义收口到 `api/constants.js`，两个订单页改走 `OrderApi`
- [x] **feat-006 景点列表页（首页）**：区域文字页签 + 景点卡 + 20 条分页
- [x] **feat-007 地陪列表页**：`pages/guide/list`，按景点反查 + chip 筛选 + 朱砂价格
- [x] **feat-008 地陪详情页**：身份块 + 三项指标 + 擅长景点 + 套餐单选 + 可约日期；去评价、剥离表单
- [x] **feat-009 下单页**：`pages/order/create`，控件随套餐类型变化，提交走 `createOrder`
- [x] **feat-010 订单页**：四态页签 + 订单卡全字段 + 下拉刷新
- [x] **feat-011 接单页**：`pages/guide/orders` + `mine.vue` 角色分流 + 演示身份切换
- [x] **feat-012 后台**：订单管理视觉重做 + 地陪审核页重写，`gap-003` 关闭
- [x] **feat-013 令牌收口与文档同步**：8 页面令牌化 + tabBar/manifest/README/App.vue + 删除过渡适配层

### 进行中

- [ ] 无

### 下一步

1. **人工走查（首要，也是唯一没做过的验证维度）**：在 H5（`npm run dev:h5`）或微信开发者工具里跑一遍三端闭环 —— 游客下单 → 地陪接单 → 平台确认 → 地陪完成；重点看页签切换、下拉刷新、图片兜底、弹窗确认的观感。
   > 数据层闭环已由 `scripts/smoke-flow.mjs` 证明跑得通（28/28），但它证明不了渲染与交互。
2. **跑一次真实构建**：`./init.ps1 -Full`（会安装依赖 + `npm run build:mp-weixin`），确认 `api/mock/seed.json` 的 JSON import、`uni.scss` 令牌、`env(safe-area-inset-bottom)` 与 `max(#{$ds-space-3}, ...)` 写法在编译期都没问题。
3. 若走查发现问题 → 按规则产出 `docx/bugfix/BUG修复-YYYYMMDD-简述.md` 并登记到本文件。
4. 后续升级路线见「未来候选」。

## 阻塞 / 风险

- [ ] 缺依赖：无 `node_modules`，`npm run build:mp-weixin` 无法执行；`./init.ps1 -Full` 会自动安装（需联网）。**真实构建一次都没跑过**
- [ ] **本轮 8 个功能全部未做真机人工走查**：静态门禁只能证明结构与数据自洽，证明不了交互与观感
- [x] ~~无测试框架~~ **部分解决**：新增 `scripts/smoke-flow.mjs`（第 7 项门禁，动态运行 mock 数据层跑三端闭环 + 负向用例 + 自检）。剩余缺口是「页面层」没有自动化：模板渲染、交互与样式仍只能靠人工走查
- [x] ~~静态门禁看不见运行时问题~~ **已验证**：本轮两个阻断级 bug（mock 仓库缺字典表、档期生成恒空）都通过了全部静态门禁，只有动态门禁抓到 —— 已归档为两份 bugfix 文档
- [ ] 景点封面与游客/管理员头像仍依赖网络占位图：`picsum.photos` / `i.pravatar.cc` 离线时看到的是容器底色（这是设计好的兜底行为）
- [ ] **包体风险（待用户决定）**：`static/guide/` 39 张素材合计 **12.56MB**（平均 330KB、最大 1.33MB），微信小程序主包上限 **2MB**，超出 6.3 倍 → 上小程序前需要压缩（长边 240px 约 0.5MB）或改走后端/CDN URL；H5 演示不受影响
- [ ] `manifest.json` 的 mp-weixin `appid` 为空、`App.vue` 已不再用云开发：发布前需填真实 appid
- [ ] 未在真实 MySQL 上执行过 `schema.sql`：首次接库时需实跑并确认 `ENUM` / `CHAR(13)` 行为
- [ ] `seed.sql` 没有地陪与订单的初始化脚本（只在 mock 里生成）：需要库内联调环境时另补 `seed-guides.sql`
- [ ] 在线开关不落库：后端无 `guides.online` 字段，MVP 只前端记忆且不拦截接单
- [ ] `priceFromUnit` 由前端推导（取最便宜套餐的类型）：建议 HTTP 版后端直接返回起价单位
- [ ] 6 个头像容器尺寸仍不统一（40/44/52/56/60）：`DESIGN.md` 定义了 44/60 两档，本轮按「游客端 60、地陪端 40、订单卡 44」的语义需要保留差异，未强推统一
- [ ] `px` 未换算 `rpx`：`$ds-*` 令牌以 px 定义，小屏一致但大屏不缩放
- [x] ~~tabBar 图标仍是原陪玩时期的 png~~ **已修复**：4 张图标改由 `scripts/gen-tabbar-icons.mjs` 按 DESIGN.md §9 线性规范代码生成（未选中 `$ds-ink-2`、选中 `$ds-primary`），tabBar 底色由纯白改 `#fbfaf5`（对齐原型的「宣纸+8%白」）

## 已做出的决策

- **用户拍板的 8 条范围修订**（全部写入 `docs/mvp-scope.json` 的 `deviations`）
  - dev-001 先选景点再选地陪 → 首页改为景点列表页
  - dev-002 评价不做 → 卡片与详情页去掉评分/评价，`check-mock.mjs` 看住
  - dev-003 地陪申请开通先不做 → 进 `futureUpgrades`，MVP 由 mock 预置
  - dev-004 先 mock 后接真实后端 → `USE_MOCK = true`，签名对齐 HTTP
  - dev-005 定稿「宣纸 · 疏」并删除原 `DESIGN.md`
  - dev-006 图片用后端 URL、先用网络占位图、不要假 SVG
  - dev-007 区域做成后台可维护的字典表（7 类），管理界面不纳入实现计划
  - dev-008 景点池扩到 20 个，激活全部 7 类区域
- **3 态 → 4 态一次性改完**（feat-005）：常量当唯一来源，页面只消费 `statusLabel` 与 `canTransit`，不留两套语义
- **过渡适配层按「是否被页面引用」决定去留**：feat-005 时因 `mine.vue` 仍在用而不删；feat-013 页面全部迁移后立即删除（`ClerkApi` / `CategoryApi` / `AppointmentApi`），不让「4 态压缩成 3 态」的映射长期留在代码里
- **地陪端「进行中」与后台「已确认」是两个口径**（feat-011）：接单只写 `guideAcceptedAt` 不改状态，若地陪端只认状态 1，接完单的订单会从两个列表同时消失 → 新增 `isGuideCommitted()`（已接下的单 = 待确认+已接 或 已确认）
- **后台操作按钮由状态白名单推导**：`canTransit(status, X)` 而非 `status === 0`
- **登录页档位由 `keep` 改为 `adapt`**（feat-013）：首屏若继续保留陪玩粉与旧文案会与全站矛盾；登录的平台双通道逻辑原样保留，档位变更原因已登记台账
- **移除 `App.vue` 的云开发初始化**（feat-013）：占位环境 ID 会在真机报错，重构后走 HTTP
- **图片兜底用容器底色，不加 `@error` 回调**：小程序 `<image>` 加载失败不撑开内容，容器底色即兜底
- **前端不自建映射表**：状态、时段、预约类型、价格单位（`BOOKING_TYPE_UNITS`，feat-007 新增）全部在 `api/constants.js`
- **`mine.vue` 的角色入口 + mock 演示身份切换**：MVP 地陪身份靠 mock 预置，需要一个能一键切三端的入口才能演示闭环；接后端后删除该区块
- **tabBar 图标用代码生成，不做手工图片维护**：小程序 tabBar 只吃本地图片且颜色写死在文件里，手工替换必然与设计系统脱钩（这次就是这么漂的）→ 图标由 `scripts/gen-tabbar-icons.mjs` 生成，颜色从 `uni.scss` 令牌读取，改令牌重跑脚本即可
- **tabBar 底色用 `$ds-surface-container` 而不是纯白**：原型的 tabBar 是「宣纸 + 8% 白」，纯白会在宣纸底上显出一条白条；DESIGN.md 第 12 节随之修正（原写法与第 1 节「宣纸底替代纯白」自相矛盾）
- **「不新建 `/pages/admin/clerk/edit`」**：审核只需通过/拒绝（gap-003）
- **价格用整数「元」**，不改造 `utils/index.js` 的 `formatPrice`（它把入参当分且无人调用，保持 `keep` 档）
- **产出文档纳入完成定义**：feat 标 `done` 前必须有设计文档；改 bug 必须有 bugfix 文档

## 未来候选（MVP 之后再说，现在不许实现）

地陪自助申请开通 + 平台审核、后台区域管理界面（表结构已就绪，只差页面）、景点池继续扩展、评价与评分体系、真实后端 HTTP 对接、在线开关落库、支付与自动结算、IM 聊天、多城市、动态定价、团购/分销、广场发单、达人等级、复杂排班、行程日志与轨迹回放、门店管理、把 tabBar 图标形状换成成都主题图形（生成器已就绪，改 `SHAPES` 即可）

## 本次会话修改的文件

### 本轮（feat-006 ~ feat-013）

- `pages/index/index.vue` - feat-006 重写：景点列表页（区域文字页签 + 景点卡 + 分页）
- `pages/guide/list.vue` - 新建（feat-007）：地陪列表页，chip 筛选 + 朱砂起价
- `pages/clerk/detail.vue` - feat-008 重写：详情页（去评价、剥离表单、套餐单选 + 可约日期）
- `pages/order/create.vue` - 新建（feat-009）：下单页，控件随套餐类型变化
- `pages/appointment/my.vue` - feat-010 重写：四态页签 + 订单卡全字段
- `pages/guide/orders.vue` - 新建（feat-011）：地陪端接单页
- `pages/tabbar/mine.vue` - feat-011 重写：角色分流入口 + 协议入口 + mock 演示身份切换
- `pages/admin/appointment.vue` - feat-012 重写：统计条 + 筛选 + 一单一个主操作
- `pages/admin/clerk.vue` - feat-012 重写：地陪审核，移除悬空入口（gap-003 关闭）
- `pages/login/login.vue` - feat-013 重写样式与文案（档位 keep→adapt）；修 `checkLogin` 判断旧字段 `_id`
- `pages.json` - 注册 4 个新页面（共 11 个）+ tabBar 配色 + globalStyle + 页面标题
- `manifest.json` - 名称/描述改为成都地陪
- `README.md` - feat-013 重写：MVP 口径 + 页面角色表 + 6 步验证 + 去掉 Pinia
- `App.vue` - feat-013：全局样式改令牌 + 移除云开发初始化
- `api/constants.js` - feat-007/011：新增 `BOOKING_TYPE_UNITS`、`bookingTypeUnit()`、`isGuideCommitted()`
- `api/mock/index.js` - `toGuide` 补 `attractions[]`；`getGuideOrders` 修 counts 归零 bug、新增 `todayFinished`、`inProgress` 改用地陪口径；**删除过渡适配层**
- `api/index.js` - feat-013：删除过渡适配层导出与 `legacyUnavailable`
- `docx/接口文档.md` - 同步 `Guide.attractions`、地陪 counts 与 scope 语义、第 8 节「适配层已删除」
- `docx/codeimpl-sum/设计文档-feat-006~013-*.md` - 新建 8 份设计文档（六章节齐全）
- `scripts/smoke-flow.mjs` - **新建：第 7 项门禁，端到端闭环校验（真实运行 mock 跑三端闭环 + 4 个负向用例 + `--self-test`）**
- `api/mock/generate.js` - 修两个阻断级 bug：仓库返回值补字典表（`regionTypes`/`packageSkus`/`attractions`）；档期生成去掉对 seed SKU 的 `enabled` 误筛
- `init.ps1` / `init.sh` - 验证入口由 6 步扩为 **7 步**，插入「端到端闭环校验」
- `AGENTS.md` - 验证命令与完成定义加入 `smoke-flow.mjs`，并说明「静态门禁看不见运行时问题」
- `docx/bugfix/BUG修复-20260926-mock仓库缺字典表导致运行时崩溃.md`、`BUG修复-20260926-可约档期生成恒空导致无法下单.md` - 新建：两个运行时 bug 的归档
- `scripts/gen-tabbar-icons.mjs` - **新建：tabBar 图标生成器**（按 DESIGN.md §9 线性规范代码画 png，颜色读 `uni.scss` 令牌，4×4 超采样，PNG 由 zlib 手写，带 `--check` 自检）
- `static/tabbar/{home,home-active,mine,mine-active}.png` - 重新生成：81×81 线性图标，未选中 `$ds-ink-2` 灰 / 选中 `$ds-primary` 竹青（原为陪玩时期的灰+粉填充图）
- `pages.json` - tabBar 底色 `#ffffff` → `#fbfaf5`（`$ds-surface-container`，对齐原型的「宣纸 + 8% 白」）
- `DESIGN.md` - 第 8 / 9 / 12 节补 tabBar 与图标说明（图标代码生成、底色取令牌）+ 变更记录
- `docx/bugfix/BUG修复-20260926-tabBar未与设计系统对齐.md` - 新建：本次修复归档
- `pages/admin/appointment.vue`、`pages/guide/list.vue`、`pages/index/index.vue` - 修复：筛选 chip / 区域页签在横向滚动容器里被 flex 压缩导致文字竖排（补 `flex: none` + `white-space: nowrap`；日期 `<picker>` 包一层同样处理）
- `api/mock/index.js` - `byId` 增加缺表判断：字典表缺失时报「哪张表缺了」而不是 `Cannot read properties of undefined`
- `api/mock/generate.js` - 每 5 单 1 单约在「今天」：修掉「今日订单」「今日完成」两个统计结构性恒为 0（实测今日订单 4）
- `scripts/smoke-flow.mjs` - 补覆盖管理端审核链路（套餐字典 / 当前身份 / 待审列表 / 审核通过 / 待审数量变化）与「今日订单不为恒 0」，断言 28 → 36
- `docx/bugfix/BUG修复-20260926-筛选chip被压缩换行与统计恒为0.md`、`BUG修复-20260926-后台审核报错排查与门禁补覆盖.md` - 新建：本次两个问题的归档
- `api/index.js` - 加固：`pickModule()` 缺模块抛可操作错误、`DATA_LAYER_VERSION` 版本戳 + 启动日志（识别旧模块缓存）；资产已登记原因并刷新哈希
- `scripts/smoke-flow.mjs` - 新增第 0 组「数据层导出面」断言（6 个模块 + 版本戳 + USE_MOCK），断言 37 → 40；修正「一项都没跑」时的计数显示
- `AGENTS.md` - 新增「改了代码但页面没生效？（旧构建 / 旧模块缓存）」排查章节（三步法 + 看版本戳）
- `docx/bugfix/BUG修复-20260926-数据层缺模块报错不可读.md` - 新建：本次排查结论与加固归档
- `utils/hscroll.js` - 新建：横向页签行行为包（`centerScrollLeft` / `swipeStep` / `centerItemScrollLeft` / `createTabRow`），四个页面共用
- `pages/index/index.vue`、`pages/admin/appointment.vue`、`pages/appointment/my.vue`、`pages/guide/list.vue` - 分类行接入：激活项自动滚到可视区中间 + 内容左右滑动切换
- `docx/codeimpl-sum/设计文档-分类页签居中与横滑切换.md` - 新建：本次交互增强归档
- `api/mock/seed.json` - 登记地陪头像素材池（`guideAvatarDir` / `guideAvatarFiles` 39 条）与姓名拼音表（`surnamesPinyin` / `givenNamesPinyin`）
- `api/mock/generate.js` - 地陪头像改用本地素材 `static/guide/`：有素材的地陪直接取「文件名反查出的姓名」保证头像与姓名一致，其余随机取名并循环取图；素材池为空时退回网络占位图；stats 新增 `guideAvatarPool/Named/Matched`
- `static/guide/` - 用户提供的 39 张地陪头像素材（新增，不在原有资产台账内）
- `scripts/check-mock.mjs` - 新增第 6 组校验：素材池 ↔ 目录双向一致、地陪头像必须是本地路径、拼音表必须覆盖全部姓与名、姓名对齐必须生效
- `scripts/smoke-flow.mjs` - 新增断言「地陪头像取自本地素材」，断言 36 → 37
- `docs/mvp-scope.json` - 新增 dev-009（地陪头像用本地素材）与 `imageStrategy.mockGuideAvatar`，并记录包体风险
- `DESIGN.md` / `docx/接口文档.md` - 同步地陪头像的本地素材约定与包体提醒
- `docx/codeimpl-sum/设计文档-feat-004-补充-地陪本地头像素材池.md` - 新建：本次改动的设计文档
- `docs/legacy-assets.json` - 12 条资产 note 更新 + 登录页档位变更 + 5 条 gap 全部标记已解决 + 刷新哈希
- `docs/legacy-assets.md` - keep 档清单与 gap 表同步
- `feature_list.json` - feat-006 ~ feat-013 全部标记 `done` 并写入证据
- `progress.md` / `session-handoff.md` - 本文件与交接文件

### 前序会话（feat-001 ~ feat-005、feat-014 与 harness 建设）

- `DESIGN.md` - 重写（原陪玩 Linear 规范删除，记入 `removedAssets`）
- `uni.scss` - 重写：`$uni-*` 重新赋值 + `$ds-*` 项目令牌
- `design/html/prototype.html` / `prototype.css` / `prototype.js` - 新建：7 屏 HTML 原型（宣纸 · 疏）
- `docx/database/schema.sql` / `seed.sql` / `数据库设计.md` - 新建并定稿（10 张表 / 109 字段 / 无外键）
- `scripts/check-schema.mjs` / `check-tokens.mjs` / `check-mock.mjs` / `verify-assets.mjs` - 4 个零依赖门禁（均带 `--self-test`）
- `init.ps1` / `init.sh` - 验证入口逐步扩为 6 步
- `AGENTS.md` - 工作规则、项目内技能、docx 归档规则、完成定义
- `api/constants.js` / `errors.js` / `http.js` / `index.js` / `mock/seed.json` / `mock/generate.js` / `mock/index.js` - 数据层分层
- `pages/webview/agreement.vue` - 新建：协议页（gap-002）
- `docx/codeimpl-sum/设计文档-feat-003-协议页与图片兜底.md`、`设计文档-feat-004-MVP数据层.md`、`设计文档-feat-005-订单四态状态机.md` - 新建
- `docx/bugfix/BUG修复-20260926-*.md` - 3 份：SCSS 变量顺序、H5 登录 uni.login 不支持、订单生成取值崩溃
- `docs/mvp-scope.json` - 范围唯一事实来源（8 条 deviations + mockScale + imageStrategy + bookingTypeUi）

## 完成证据

- [x] 4 个门禁全绿：`verify-assets`（22 条资产哈希一致 + 11 个页面路由一致 + **告警 0 条**）、`check-tokens`（95 变量 / 15 引用 / 20 色值对齐）、`check-schema`（10 表 / 109 字段）、`check-mock`（一致性 / 确定性 / 规模 / 可下单 44/44 / 无评价字段 / 11 页面未直连 mock）
- [x] 5 条 gap 全部关闭：gap-001 / 002（feat-003）、gap-003（feat-012）、gap-004 / 005（feat-013）
- [x] 反向测试（资产）：篡改副本资产哈希 → 输出「资产被修改」且退出码 1
- [x] 反向测试（JSON 损坏）：畸形台账 → 输出「不是合法 JSON + 常见原因」且退出码 1（本轮真实触发过一次：补 `resolution` 时多写括号被门禁当场拦住）
- [x] 旧色值清零：代码与配置中对 `#FF4D6A` / `#ff6b81` 的实际引用 0 命中
- [x] 状态映射表收口：`statusLabels` / `timeSlots` 在页面中已无定义
- [x] 悬空引用清零：`/pages/admin/clerk/edit` 与 `/static/images/default-avatar.png` 均无引用
- [x] 数据链路自洽：页面 → 新模块（6 个 Api）→ mock；过渡适配层已删除且无残留引用
- [x] 编辑器诊断：全部改动文件 0 error 0 warning
- [x] 数据层导出面：`node scripts/smoke-flow.mjs` → **40/40**，含「数据层导出 6 个业务模块」「版本戳存在 2026-09-26.2」；启动日志输出 `[api] 数据层 2026-09-26.2｜数据源 mock｜模块 RegionApi / … / UserApi`
- [x] 反向测试（缺模块报错可读）：临时把 `pickModule('OrderApi')` 改成不存在的名字 → 如期抛出「数据层缺少模块 OrderApiX（…）若刚改过 api/ 目录：停掉 dev server → 删除 node_modules/.vite 与 dist → 重启，并硬刷新浏览器」；已还原
- [x] 分类页签居中 + 横滑切换：`utils/hscroll.js` 落地，首页区域页签 / 后台状态 chip / 我的订单四态 / 地陪列表预约类型四处接入；smoke 新增第 0b 组（居中 5 例 + 横滑 5 例）→ **50/50 通过**；三个被改页面已登记原因并刷新哈希
- [x] **端到端闭环校验：`node scripts/smoke-flow.mjs` → 36/36 通过**（区域 7 类 / 景点 20 条 2 页 / 地陪按景点过滤 5 位 / 详情含擅长景点与套餐 / 可约日期 3 天 / 下单 `CD260926C0001` / 地陪接单后进「进行中」/ 平台确认后 counts 7→6、4→5（今日订单 4）/ 完成服务 / 游客回看已完成 / 4 个负向用例全部被拒 / **管理端审核链路：套餐 3 SKU、当前身份、待审 4 → 3、待审地陪带区域与擅长景点、审核通过生效**）
- [x] 闭环门禁自检：`node scripts/smoke-flow.mjs --self-test` → 通过（抽掉字典表后校验如期失败，证明门禁非空壳）
- [x] 本轮修掉 **2 个阻断级运行时 bug**（全部静态门禁都漏过，只有新增的动态门禁抓到）：
  - `api/mock/generate.js` 返回的仓库缺 `regionTypes` / `packageSkus` / `attractions` → 首页与详情页运行时崩溃（`docx/bugfix/BUG修复-20260926-mock仓库缺字典表导致运行时崩溃.md`）
  - 档期生成误用 seed SKU 筛 `enabled` → 50 个地陪可约日期恒空、游客永远下不了单（`docx/bugfix/BUG修复-20260926-可约档期生成恒空导致无法下单.md`）
- [x] 归档：10 份设计文档（feat-003 ~ feat-013）+ 5 份 bugfix 文档
- [x] tabBar 一致性：`node scripts/gen-tabbar-icons.mjs` → 4 张图标 81×81、主色分别 rgb(107,104,98)/rgb(47,107,94)，与 `$ds-ink-2` / `$ds-primary` 逐项一致；`--check` 复检通过；4 条图标资产已登记 `keep → replace` 并刷新哈希
- [x] 地陪头像素材：`node scripts/check-mock.mjs` → **39 张本地素材（可解析姓名 38 个），姓名对齐命中 39/50 个地陪 → /static/guide/**；`node scripts/smoke-flow.mjs` → **37/37**（含「地陪头像取自本地素材」）
- [x] harness 审计：`validate-harness.mjs` 100/100
- [x] 标准入口：`./init.ps1` → **7 步全绿**
- [ ] 小程序真实构建：未执行（缺依赖，需 `./init.ps1 -Full`）
- [ ] 页面层人工走查：未执行（数据层已由动态门禁覆盖，但渲染与交互没有自动化）
- [x] **旧构建缓存是排查陷阱（已记录）**：用户报的「地陪审核 byId undefined」经核对是修复前的构建产物（报错栈与当前源码行号对得上、但源码里字典表已在）。处置：先重启 dev server / 重新构建再判断；同时已把 `byId` 的报错改成可读信息、并把审核链路纳入闭环门禁

## 给下一会话的备注

- 先跑 `./init.ps1`，绿了再动代码；需要真实构建就跑 `./init.ps1 -Full`。
- **范围看 `docs/mvp-scope.json`，视觉看 `DESIGN.md`，接口看 `docx/接口文档.md`** —— 这三个是唯一事实来源。
- 改颜色/字号必须同时改 `DESIGN.md` + `uni.scss`；页面里一律用 `$ds-*`，不要再写死色值。
- 图片一律走后端 URL 字段（`coverUrl` / `avatarUrl`），失败靠容器底色兜底，不要自绘插画。
- **状态、时段、预约类型、价格单位都只准从 `api/constants.js` 取**，页面不许自建映射表。
- 页面只允许 `import { ... } from '@/api/index.js'`，禁止直连 `api/mock/`（`check-mock.mjs` 会把关）。
- **动数据层或状态流转后，必须跑 `node scripts/smoke-flow.mjs`**：静态门禁证明不了「跑得通」，本轮两个阻断级 bug 就是它抓到的。改校验脚本本身则跑一次 `--self-test`。
- **标 `done` 前必须有 `docx/codeimpl-sum/` 设计文档**；改 bug 必须有 `docx/bugfix/` 文档；两者都要登记到本文件的「本次会话修改的文件」。
- 改 `pages.json` 或任何在册资产后：先登记 `docs/legacy-assets.json` 的原因 → `node scripts/verify-assets.mjs --update` → 重跑 `./init.ps1`。
- `init.ps1` 必须保持 UTF-8 BOM 编码。
- 本轮 6 个新页面/改造页面**都没有做真机走查**，任何交互问题都优先怀疑这一点。
- **报错栈与源码对不上时，先怀疑构建/模块缓存**：本轮有**三次**「报的错在源码里不存在」（`store.regionTypes` undefined、`byId` undefined、`OrderApi` undefined），都是 dev server 或小程序产物还在用旧模块。动过 `api/mock/*` 后尤其要重启，因为 mock 的仓库是模块级缓存（`getDb()` 只算一次）。
  **三步法**（已写进 `AGENTS.md`）：① 停 dev server → ② `Remove-Item -Recurse -Force node_modules\.vite, dist` → ③ 重启 + 浏览器硬刷新；然后看控制台有没有 `[api] 数据层 <版本>｜…` 这一行。
  数据层现在会**自证**：`api/index.js` 的 `DATA_LAYER_VERSION` 打在启动日志里，缺模块时 `pickModule()` 直接抛出可操作错误。
- **行级交互收口成行为包，页面只声明「选择器 + 激活下标 + 切哪个方法」**：分类页签的「激活项居中」（尤其夹紧到 `[0, 内容宽−容器宽]`）与「横滑切换」（尤其不抢列表纵向滚动）都是容易各写各的细节，`utils/hscroll.js` 的 `createTabRow()` 让首页 / 后台 / 我的订单 / 地陪列表四处行为一致
- **横滑不用 `swiper`**：`swiper` 要为每个分类维护独立列表状态（分页 / `hasMore` / 刷新 / 空态 × N），与「切分类 = 重拉第一页」的现有数据流是两套语义；手势方案保持一份列表状态，分页与下拉刷新全部复用
- **横向滚动容器里的 chip / 页签必须写 `flex: none` + `white-space: nowrap`**：否则 flex 子项会被压窄、文字竖排换行（`scroll-view` 的 `white-space: nowrap` 管不了 flex 收缩）。
- 统计类字段要检查「数据里是否真的存在这种记录」：mock 里所有订单都排在明天之后时，「今日订单」必然恒为 0。
