# 会话进度日志

## 当前状态

**最后更新：** 2026-09-28
**当前功能：** 无进行中 —— **MVP 全量 + 视觉改版 + 角色化底部栏全部完成**（feat-001 ~ feat-017 共 17 个 `done`）
**验证入口：** `./init.ps1` / `bash init.sh` 共 **8 步**
**当前阶段：** 阶段 0「保留原有资产」完成 → 阶段 1「成都景点地陪小程序」完成（7 页 + 三端闭环 + 数据层/数据库定稿）→ 阶段 2「视觉改版定稿『气泡漫游』」完成（feat-016，提交 `bb3d0ab`）→ 阶段 3「联调与验收」进行中（feat-017：角色化底部栏与首页分流）
**门禁现状（2026-09-28 实测，不要凭印象）：** `verify-assets` ✅（22 条资产哈希一致 —— feat-016 遗留的 16 条已补登记原因并刷新哈希，**此前唯一红项收尾**）、`check-tokens` ✅（120 变量 / 15 引用 / 13 色值对齐）、`check-motion` ✅（9 时长令牌 + `MOTION` 5 项一致 + 3 keyframes；扫描范围已含 `components/`，页面与公共组件 12 个文件 0 违规）、`check-schema` ✅（10 表 109 字段）、`check-mock` ✅（52 用户 / 50 地陪 / 20 景点 / 16 订单）、`smoke-flow` ✅ **50/50**; `./init.ps1` **1-7 步全绿**（第 8 步构建按已知原因跳过）

## 阶段 1 范围（已锁定）

来源：`docs/MVP 范围：只做 3 件事.md` → 范围唯一事实来源：`docs/mvp-scope.json`（`deviations` 8 条）

- **只做 3 件事**：游客能下单 / 地陪能接单 / 平台能确认订单
- **闭环**：游客选景点 → 选能带该景点的地陪 → 选套餐与日期 → 提交预约 → 地陪接单 → 平台确认档期 → 地陪完成服务
- **7 个页面**：景点列表（首页）、地陪列表、地陪详情、下单、订单（游客端）+ 接单（地陪端）+ 后台订单管理（管理端）；另有登录页与协议页（公共）
- **20 景点 / 7 类区域（字典表）/ 3 个套餐 SKU / 3 种预约类型 / 4 态订单 / 3 种角色**
- **数据策略**：MVP 全部 mock（`USE_MOCK = true`），后续切真实后端 HTTP，页面代码不动
- **图片策略**：景点 `coverUrl`、地陪 `avatarUrl` 由后端返回；原型阶段先用网络占位图；禁止自绘插画冒充照片
- 不做：IM、定位、分销、团购、广场、等级、自动结算、多城市、优惠券、动态定价、行程日志、轨迹、门店、复杂排班、加价规则、评价、地陪申请流程、投诉

## 视觉（已定稿：气泡漫游）

- **主题：气泡漫游**（2026-09-27 feat-016 起唯一有效主题；历史主题「宣纸 · 疏」及其备选全部作废。来源 `design/redesign/`）
- 视觉语言：低饱和三色（雾紫 `#8f7fe0` / 藕粉 `#e58fa6` / 薄荷 `#7fc4ae`）+ 墨阶 + 玻璃拟态 + 大圆角 + **纯色胶囊按钮**（主按钮纯黑 `#17141f`）
- 深紫 `#7b6bd0`（`$ds-tertiary`）全站**只**给价格与关键数字；页底奶油白 `#fdfcfa`；每屏一组背景光斑（七档 `$ds-bg-*`）
- 页签 / chip / 日期 / 单选选中态一律**黑胶囊**（弃用下划线指示器）；卡片玻璃片不描边；头像一律圆形 + 细双环
- 字体不加载文件：系统黑体栈 + 800 字重替代（品牌字体「造字工房元黑体」仅作设计意图）
- 同步源：`DESIGN.md`（文字口径）+ `uni.scss`（`$ds-*` 落地令牌）+ `design/redesign/`（七屏原型与 `tokens.css`）；`design/html/`、`design/prototypes/` 仅历史存档

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

- [x] **feat-017 角色化底部栏与首页分流**（2026-09-28）：底部栏项数与文案随角色变化（游客「首页·我的」/ 地陪「接单·我的」/ 管理员「订单管理·地陪审核·我的」）；原生 tabBar 隐藏、`components/ds-tabbar` 自绘（配置唯一来源 `utils/tabbar.js`）；`pages.json` 登记 5 个 tab 页；三个工作台页去掉返回键、跳转改 `switchTab`；「我的」页补「成为地陪」占位入口；图标新增 `orders` / `clerk` 两个形状（共 8 张）；顺带收尾 feat-016 遗留的资产保真红项

### 已完成（MVP 全量）

- [x] 原有资产盘点与冻结：`git tag legacy-peiwan-baseline-v1` @ `ceca05a`
- [x] 资产台账与保真门禁：`docs/legacy-assets.md` / `.json`（22 条在册 + 1 条 `removedAssets`）+ `scripts/verify-assets.mjs`
- [x] harness 骨架：`AGENTS.md`、`feature_list.json`、`progress.md`、`session-handoff.md`
- [x] MVP 范围固化 + 8 处修订：`docs/mvp-scope.json`
- [x] HTML 原型 7 屏 + 视觉定稿落地：`design/html/prototype.html`、`DESIGN.md`、`uni.scss`（**已被 feat-016 取代**：视觉基准改 `design/redesign/`）
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
- [x] **feat-015 动效规范与落地**（**已被 feat-016 取代**：列表入场编排、逐项 stagger、H5 手写页面转场全部删除，只留按压 / 颜色 / 指示器三类状态动效）：页签/分段滑动指示器、加载更多（转圈）、状态过渡、按压反馈、降低动效；新增 `utils/motion.js` 与 `scripts/check-motion.mjs`
- [x] **feat-016 视觉改版定稿「气泡漫游」全端落地**（提交 `bb3d0ab`）：`DESIGN.md` 与 `uni.scss` 全量重写（低饱和三色 + 墨阶 + 玻璃拟态 + 大圆角 + 纯黑胶囊按钮 + 七档分屏光斑），11 个页面按新系统改造，`pages.json` tabBar 配色与 4 张图标重新生成，`manifest.json` 与 `README` 同步；动效口径收敛为「只服务状态变化」

### 动效口径（feat-016 定稿：只服务状态变化）

来源三处必须同步：`DESIGN.md` §13 ↔ `uni.scss` §1.10 ↔ `utils/motion.js` 的 `MOTION`。

| 场景 | 做法 | 时长 / 曲线 |
|---|---|---|
| 按压反馈（全部可点元素） | `hover-class="is-pressed"` + `hover-stay-time="70"` + `scale` 缩放（不位移，不用 opacity 变暗） | **150ms** `--ease-out` |
| chip / 套餐单选 / 可约日期 / 开关 / 搜索条 / 角色切换 | 底色 + 边框 + 文字色过渡（`box-shadow` 用于单选环） | **150ms** `--ease-out` |
| 等宽页签（我的订单 4 态 / 地陪审核 2 态） | 选中态改**黑胶囊**（不再用滑动下划线） | **150ms** |
| 分段控件（接单 / 下单） | 白色滑块 `translateX` 移动，只动 `transform` | **200ms** `--ease-out` |
| 较大表面（卡片 / 面板 / 底部操作栏） | 颜色与阴影过渡 | **200ms** `--ease-out` |
| 首页分类 Dock | 滚过阈值后淡入 + 4px 下滑 | **150ms** |
| 加载指示器 | 全局 `.ds-spinner`（含 `--on-primary` / `--lg`），常量运动 | **900ms** `linear` |
| 勾选符号 / 套餐单选圈 | 弹入 `ds-pop-in` | **150ms** |
| 降低动效 | `prefers-reduced-motion` 去掉位移与回弹、保留淡入（规则在 `App.vue` 全局样式末尾） | — |

明确**不做**：列表内容替换的入场编排与逐项 stagger（方向性位移在整页滚动容器里会横向溢出触发滚动条；切分类改为滚动复位到顶部）、**页面转场**（小程序是原生转场；H5 手写淡入淡出会透出下层页面，已删除）、数字动画（金额 / 统计 / 步进器）、滚动动效、平台自带组件（Toast / Modal / picker / 下拉刷新）。

**属性白名单**：`transform` / `opacity` / `color` / `background-color` / `border-color` / `box-shadow`；禁止 `transition: all`、禁止动 layout 属性、禁止 `:hover`（按压统一 `hover-class`）、禁止页面自带 `@keyframes`（由 `scripts/check-motion.mjs` 把关）

### 进行中

- [ ] 无

### 下一步

1. ~~**收尾资产保真门禁**~~ **已完成（2026-09-28）**：16 条被改资产的 `note` 已补登记「2026-09-27 视觉改版『气泡漫游』」与本次 feat-017 的原因 → `node scripts/verify-assets.mjs --update` 刷新哈希 → `./init.ps1` 第 2 步复跑通过（`./init.ps1` 现在 1-7 步全绿，仓库不再处于「禁止新增功能」状态）。
2. **人工走查（唯一没做过的验证维度，当前最优先）**：在 H5（`npm run dev:h5`）或微信开发者工具里跑一遍三端闭环 —— 游客下单 → 地陪接单 → 平台确认 → 地陪完成；重点看**玻璃卡片两端的观感差异**（小程序无 `backdrop-filter`，退化为半透明白底）、黑胶囊选中态、七档光斑是否过浓、页签与下拉刷新、图片兜底、弹窗确认、底部操作栏是否贴底。
   > 数据层闭环已由 `scripts/smoke-flow.mjs` 证明跑得通（50/50），但它证明不了渲染与交互。
   >
   > **feat-017 新增走查项（角色化底部栏，本轮完全没在真机/浏览器里验过）**：① 原生栏是否被隐藏干净（不该出现「两条底部栏」或切换瞬间闪一下）；② 三种身份的项数与文案（游客 2 项 / 地陪 2 项 / 管理员 3 项）与当前项高亮；③ 管理员第三项「地陪审核」可点且高亮正确；④ 切换演示身份后底部栏是否立刻换项、当前页不属于新角色时是否收敛到该角色第一屏；⑤ 三个工作台页去掉返回键后能否靠底部栏回到「我的」；⑥ iPhone 安全区下自绘栏是否压住内容或留白过多。
3. **跑一次真实构建**：走 HBuilderX（`npm run build:mp-weixin` 在本仓库跑不通，CLI 期望 `src/` 布局），确认 `api/mock/seed.json` 的 JSON import、`uni.scss` 令牌、`env(safe-area-inset-bottom)` 等编译期写法。
4. **微信端复核**：`manifest.json` 的 `mp-weixin.appid` 已填 `wx297713513aa45aca`（工作区未提交），确认 `uni.login()` 能拿到 code；同时确认「不再有任何页面转场」在微信端就是原生滑动（不该出现双重动画）。
5. 若走查发现问题 → 按规则产出 `docx/bugfix/BUG修复-YYYYMMDD-简述.md` 并登记到本文件。
6. **待清理的文档/令牌口径**：`README.md` 仍写着「宣纸 · 疏 / 4 个校验脚本 / `design/html/prototype.html` 原型」，与「气泡漫游」不符；`uni.scss` §1.10 残留 `$ds-dur-page` / `$ds-dur-page-leave` / `$ds-stagger-*`（页面已无引用，`$ds-ease-in-out` 仍被两处分段控件用着）。两者都不被任何门禁覆盖。
7. 后续升级路线见「未来候选」。

## 阻塞 / 风险

- [x] ~~**（最优先）资产保真门禁为红**~~ **已收尾（2026-09-28）**：feat-016 的 16 条「资产被修改」（11 个页面 + `App.vue` + `uni.scss` + `pages.json` + `manifest.json` + `README.md` + 4 张 tabBar 图标）已逐条在 `docs/legacy-assets.json` 补登记原因，本次 feat-017 改动的条目再追加一段，然后 `node scripts/verify-assets.mjs --update` 刷新 16 条哈希 → `./init.ps1` 第 2 步复跑**通过**（登记与刷新顺序未反，未用 `--update` 掩盖误改）
- [x] ~~`check-motion` 为红（2 处 `box-shadow` 过渡被拦）~~ **已修**（2026-09-27）：`DESIGN.md` §13.2 的属性白名单本来就允许 `box-shadow`，是校验脚本没跟上 —— 已把 `box-shadow` 加进 `scripts/check-motion.mjs` 的 `TRANSITION_PROPS`，并把脚本头部注释里「§1.8 / ≤300ms / 入场用 ease-out」等过期口径同步为「§1.10 / ≤400ms / 定稿只用到 150-200ms」；`--self-test` 的 12 类夹具仍全部检出
- [x] ~~缺依赖：无 `node_modules`~~ **已安装**（HBuilderX / npm 装的都在）。但 **`npm run build:mp-weixin` 在本仓库跑不通，且与本轮改动无关**：根目录是 HBuilderX「普通项目」布局（源码在根），而 `@dcloudio/uni-cli` 期望源码在 `src/`，报 `ENOENT: src/manifest.json`。要么把源码挪进 `src/`（大改目录结构，需单独评估），要么接受「真实编译走 HBuilderX」。`./init.ps1` 第 8 步因此长期只能跳过
- [ ] **小程序端 WXSS 未在 HBuilderX 里真机确认过**（feat-016）：玻璃卡片的 `backdrop-filter` 在小程序端不生效（按 `DESIGN.md` §12 退化为半透明白底，属预期行为，不要为它写条件编译）、`.is-pressed` 叠层、`@media (prefers-reduced-motion)` 这几样只有真编译才知道小程序端表现如何。已用 HBuilderX 自带的 dart-sass 验证过样式块能编译（见 `docx/bugfix/BUG修复-20260926-SCSS变量未定义实为注入缓存陈旧.md`）
- [x] ~~H5 返回转场的「换页那一下」只能靠眼睛验收~~ **已消解**：feat-016 彻底删除了 H5 手写页面转场（改瞬时切换），不再存在「换页那一下」的问题；页面也全部不再引用 `utils/motion.js`
- [ ] **本轮 8 个功能全部未做真机人工走查**：静态门禁只能证明结构与数据自洽，证明不了交互与观感
- [x] ~~无测试框架~~ **部分解决**：新增 `scripts/smoke-flow.mjs`（第 7 项门禁，动态运行 mock 数据层跑三端闭环 + 负向用例 + 自检）。剩余缺口是「页面层」没有自动化：模板渲染、交互与样式仍只能靠人工走查
- [ ] **「URL 参数未归一化」这类页面层问题全门禁都看不见**（2026-09-26 用户报错暴露）：下单页把字符串参数与数字 id 用 `===` 比较，静默回落成 `packages[0]`，且因为数据层 `byId()` 有 `Number()` 兜底，`smoke-flow.mjs` 一路绿。已修复（`toId()` 入口归一化），但**能拦住它的门禁还没有** —— 候选方案见「未来候选」的「页面层门禁」
- [x] ~~静态门禁看不见运行时问题~~ **已验证**：本轮两个阻断级 bug（mock 仓库缺字典表、档期生成恒空）都通过了全部静态门禁，只有动态门禁抓到 —— 已归档为两份 bugfix 文档
- [ ] 景点封面与游客/管理员头像仍依赖网络占位图：`picsum.photos` / `i.pravatar.cc` 离线时看到的是容器底色（这是设计好的兜底行为）
- [ ] **包体风险（待用户决定）**：`static/guide/` 39 张素材合计 **12.56MB**（平均 330KB、最大 1.33MB），微信小程序主包上限 **2MB**，超出 6.3 倍 → 上小程序前需要压缩（长边 240px 约 0.5MB）或改走后端/CDN URL；H5 演示不受影响
- [x] ~~`mp-weixin.appid` 为空~~ **已配置**（2026-09-27，工作区未提交）：`manifest.json` 的 `mp-weixin.appid` = `wx297713513aa45aca`；同一次改动还把 uni-app `appid` 改为 `__UNI__93760BA`、应用名由「成都地陪」改为 **「耍搭」**（该文件同时被重新格式化为 2 空格缩进）。连带解除：微信端 `uni.login()` 不再报「获取登录 code 失败」。注意 `docx/bugfix/BUG修复-20260927-微信端报webapi_getwxaasyncsecinfo根因是appid未配置.md` 写于改配置**之前**，其中「appid 仍为空 / 未改动 manifest」的结论已过期
- [ ] 未在真实 MySQL 上执行过 `schema.sql`：首次接库时需实跑并确认 `ENUM` / `CHAR(13)` 行为
- [ ] `seed.sql` 没有地陪与订单的初始化脚本（只在 mock 里生成）：需要库内联调环境时另补 `seed-guides.sql`
- [ ] 在线开关不落库：后端无 `guides.online` 字段，MVP 只前端记忆且不拦截接单
- [ ] `priceFromUnit` 由前端推导（取最便宜套餐的类型）：建议 HTTP 版后端直接返回起价单位
- [ ] 6 个头像容器尺寸仍不统一（40/44/52/56/60）：`DESIGN.md` 定义了 44/60 两档，本轮按「游客端 60、地陪端 40、订单卡 44」的语义需要保留差异，未强推统一
- [ ] `px` 未换算 `rpx`：`$ds-*` 令牌以 px 定义，小屏一致但大屏不缩放
- [x] ~~tabBar 图标仍是原陪玩时期的 png~~ **已修复，并随 feat-016 按新配色再生成**：4 张图标由 `scripts/gen-tabbar-icons.mjs` 代码生成（24 网格 / stroke 1.7 / 4× 超采样），颜色直接读 `uni.scss` 令牌；气泡漫游定稿后为未选中 `#9a95ae`（`$ds-ink-3`）、选中 `#6f61bd`（`$ds-secondary`），tabBar 底色 `#fdfcfa`。`node scripts/gen-tabbar-icons.mjs --check` 2026-09-27 复检 4 张全部一致

## 已做出的决策

- **用户拍板的 9 条范围修订**（全部写入 `docs/mvp-scope.json` 的 `deviations`）
  - dev-001 先选景点再选地陪 → 首页改为景点列表页
  - dev-002 评价不做 → 卡片与详情页去掉评分/评价，`check-mock.mjs` 看住
  - dev-003 地陪申请开通先不做 → 进 `futureUpgrades`，MVP 由 mock 预置
  - dev-004 先 mock 后接真实后端 → `USE_MOCK = true`，签名对齐 HTTP
  - dev-005 定稿主题并删除原 `DESIGN.md`（当时定「宣纸 · 疏」；**2026-09-27 feat-016 起该主题被「气泡漫游」取代**，`DESIGN.md` 已第二次重写）
  - dev-006 图片用后端 URL、先用网络占位图、不要假 SVG
  - dev-007 区域做成后台可维护的字典表（7 类），管理界面不纳入实现计划
  - dev-008 景点池扩到 20 个，激活全部 7 类区域
  - dev-009 地陪头像改用本地素材 `static/guide/`（39 张，文件名 = 姓名拼音；mock 有素材的地陪直接取「文件名反查出的姓名」，保证头像与姓名一致）
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
- （下面这一组是 **feat-015 时期的动效决策，已被 feat-016 全部取代**，保留仅作决策留痕 —— 入场编排、stagger、页面转场都已删除）
- **动效只解决三件事**（feat-015）：内容被整批替换时不要瞬移、页面被整批替换时不要瞬移、状态切换要看得见。除此之外不加动效；用户正在读的数字（金额 / 统计 / 步进器）一律不动
- **动效一律只动 `transform` 与 `opacity`**（外加 `color` / `background-color` / `border-color`）：动 `width` / `left` 会触发 layout + paint；滑动指示器一律用 `translateX(下标 × 100%)` 的百分比，天然等于一格宽，不需要测量
- **入场用 CSS 动画 + 节点批次重建，不用 `transition` + 时序标志位**：后者依赖「先渲染隐藏态 → 下一帧移除」，mock 返回过快时可能整段不播；前者靠 `:key="enterSeq + '-' + id"` 让节点重建，动画必定从首帧开始，不需要任何 hack
- **内容切换刻意放慢（360ms，逐项 +60ms 封顶 300ms）**：一类动效一次替换整屏、且不常发生，慢一点才看得清「新内容是从哪边换过来的」；反过来按压反馈必须跟手（140ms）。UI 动效预算因此从 300ms 放宽到 **400ms**
- **页面转场要分平台处理**（feat-015）：小程序（含微信）的 `navigateTo` / `navigateBack` 是**原生转场**，自己再加就是双重动画；H5 的官方 `animationType` 不生效，得用 CSS 模拟（进入 `is-page-in` / 返回先播 `is-page-out` 再 `navigateBack()`）；App 才认 `pages.json` 的 `globalStyle.app-plus`。三端差异写进 `DESIGN.md` §13.4
- **H5 的返回离场刻意不淡到 0**（`opacity → 0.7` + 右移 8px）：全站页面底色都是同一张宣纸，露出来的那块与上一页底色一致，换页那一下几乎看不出来；淡到 0 反而会先闪一块空底
- **页面进出必须完全对称（2026-09-26 用户反馈后改了三版才定稿）**：进入 `32px / 320ms / --ease-out`，返回就用**同一组参数、方向相反**（`translateX(0) → 32px` + `opacity 1 → 0`）。三版教训：`opacity 0.15` + 右移 40%（整页滑走）**太吵**；右移 8px **与进入力度不匹配**；纯淡出不位移 **更不对称（进来 32px、出去 0px）**。**「对称」优先于「单看哪一版更好看」** —— 同族动作一轻一重、一大一小，比动画本身更刺眼。另：`.is-page-out` 必须 `fill-mode: both`（改 `backwards` 会在播完时弹回不透明）
- **keyframes 只放 `App.vue` 全局样式**：页面样式是 `scoped` 的，同名 keyframes 会被编译成七个不同名字；顺带统一掉登录页自带的 `@keyframes spin`
- **入场 `animation-fill-mode` 用 `backwards` 而不是 `both`**：`both` 会残留 `transform: translateX(0)`，把按压反馈的 `scale` 盖掉
- **降低动效不是「全部关掉」**：`prefers-reduced-motion` 下保留淡入（帮助理解状态变化），只去掉位移与回弹；因此入场动画名必须写在 class 里，不能内联 `animation-name`（内联优先级高于样式表的降级规则）
- **动效也进门禁**（feat-015）：新增 `scripts/check-motion.mjs` 拦 **12 类**违规（`transition: all`、动 layout 属性、`ease-in`、`transition` 用 `linear`、`animation` 用 `linear`、`scale(0)`、`:hover`、页面内 `@keyframes`、动画名不存在、内联 `animationName`、超 400ms、**`utils/motion.js` 的 `MOTION` 与 `uni.scss` 时长令牌不一致**），并接入 `init.ps1` 第 4 步
- **按压反馈用 `hover-class="is-pressed"` 而不是 `:active`**：小程序里 `:active` 不可靠；并配 `hover-stay-time="70"`（默认 400ms 会让按下后迟迟不回弹）。按压是两层：`scale(0.96)` 回弹 + `::after` 8% `currentColor` 叠层（照 `DESIGN.md` §8「用 8% 主色叠层，不用 opacity 变暗」）
- **JS 时长必须与 SCSS 令牌对齐**（feat-015）：页面返回要「等动画播完再 `navigateBack()`」，`setTimeout` 用的是 `MOTION.pageLeave`、动画用的是 `$ds-dur-page-leave`，两边不等就会截断动画或白等 —— 所以门禁里加了逐项比对
- **URL 参数一律在 `onLoad` 归一化，页面内部只认数字 id**（2026-09-26 下单页 bug）：路由参数永远是字符串、接口 id 是数字，混用 `===` 会**静默**落空（`find` 返回 `undefined` 后还有 `|| packages[0]` 兜底，于是不报错、只是默默算错）。比起逐个比较点补 `Number()`，入口收敛一份更不容易漏，且提交给接口的 `payload` 与将来 HTTP 的 JSON 约定一致
- **视觉改版整体换掉「宣纸 · 疏」**（feat-016，2026-09-27）：历史主题与备选全部作废，改为「气泡漫游」（低饱和三色 + 墨阶 + 玻璃拟态 + 大圆角 + 纯黑胶囊按钮）。做法是**先重写 `DESIGN.md` 与 `uni.scss`，再逐页落地** —— 11 个页面样式几乎重写，模板骨架与数据流基本不动，所以 `smoke-flow` 仍 50/50
- **动效从「三组 + 入场编排」收敛为「只服务状态变化」**（feat-016）：单次 150ms（按压 / 颜色）、200ms（指示器 / 较大表面），`$ds-stagger-*` 归零；**列表入场与逐项 stagger 全部删除** —— 方向性位移在整页滚动容器里会横向溢出触发滚动条，切分类改为滚动复位到顶部
- **H5 手写页面转场彻底删除**（feat-016）：即使进出对称，仍会「透出下层页面」；小程序本来就是原生转场 —— 结论是**不做转场**，页面切换瞬时完成，页面也不再引用 `utils/motion.js`
- **选中态由「滑动下划线指示器」改「黑胶囊」**（feat-016）：页签 / chip / 日期 / 单选统一；只有分段控件保留白色滑块 `translateX`（200ms）
- **`box-shadow` 进动效白名单**（feat-016 / `DESIGN.md` §13.2）：单选环与卡片层级需要过渡，只给这两类小元素用；校验脚本白名单当时没跟上，2026-09-27 已补齐
- **`utils/motion.js` 降级为「时长镜像」**（feat-016）：页面已无引用（不再有 JS 编排的动效），保留它只为让 `check-motion.mjs` 继续把 JS 时长与 SCSS 令牌逐项比对；**不要**拿它重新做页面编排
- **底部栏自绘，而不是用原生 tabBar**（feat-017）：原生 `tabBar.list` 编译期静态，`setTabBarItem` 只能改文案与图标、**没有删除项的 API**，做不到「管理员比游客多一项地陪审核」；同时否掉微信原生 `custom-tab-bar`（H5 不支持，而本项目要求 H5 可调试；且只能写 wxml/wxss、用不了 `$ds-*`）。落点：`pages.json` 保留 5 个 tab 页（`switchTab` 才可用）+ 运行时 `uni.hideTabBar` + `components/ds-tabbar` 自绘，配置收在 `utils/tabbar.js` 一处
- **不做「一页装三种首页」**（feat-017）：游客首页仍是景点列表，地陪 / 管理员的「首页」是各自的工作台页（接单 / 订单管理）。靠 `ds-tabbar` 的 `guard()` **一处**把「当前页不属于当前角色」收敛到该角色第一屏（登录后落首页、切换身份后都走它），避免把三套首页塞进 `pages/index/index.vue`
- **`<ds-tabbar />` 自带高度占位**（feat-017）：78px 占位由组件根节点提供、视觉栏是 `position: fixed`，所以页面只要把它写在根节点内容末尾 —— 4 个 `height: 100vh` 的 flex 页面不必各改布局，普通滚动页也不会被 fixed 栏压住最后一行

## 未来候选（MVP 之后再说，现在不许实现）

地陪自助申请开通 + 平台审核、后台区域管理界面（表结构已就绪，只差页面）、景点池继续扩展、评价与评分体系、真实后端 HTTP 对接、在线开关落库、支付与自动结算、IM 聊天、多城市、动态定价、团购/分销、广场发单、达人等级、复杂排班、行程日志与轨迹回放、门店管理、把 tabBar 图标形状换成成都主题图形（生成器已就绪，改 `SHAPES` 即可）、排序切换的列表重排动画（需 FLIP，与「只动 transform」的预算冲突，MVP 不做）、接单页与地陪审核页的横滑切换（`createTabRow()` 已就绪，接上只需 5 行）

**页面层门禁（本次 bug 暴露的缺口，值得单独立项）**：`check-tokens` / `check-motion` / `check-schema` / `check-mock` / `smoke-flow` 都看不见「页面把 URL 参数（字符串）与接口 id（数字）用 `===` 比较」。本次下单页就是这么静默回落成 `packages[0]` 的。可行做法：在 `scripts/check-mock.mjs` 已有的页面扫描里加一条规则 —— 与 `xxxId` 做严格比较时必须显式数值化（要求 `Number(a) === Number(b)`，或在 `onLoad` 用 `toId()` 归一化后不再出现裸 `=== this.xxxId`）；需配 `--self-test` 夹具。

## 本次会话修改的文件

### 本次（2026-09-28：feat-017 角色化底部栏与首页分流 + 收尾 feat-016 遗留红项）

**一、角色化底部栏（feat-017）**

- `utils/tabbar.js` - **新建**：角色 → 底部栏项 / 首页路径 / 图标地址的唯一来源（`tabItemsByRole` / `homePathByRole` / `isTabPath` / `tabIconPath`；角色常量取 `api/constants.js` 的 `ROLES`）
- `components/ds-tabbar/ds-tabbar.vue` - **新建**：easycom 自绘底部栏（按角色换项、当前项高亮、`switchTab` 跳转失败回退 `reLaunch`、`mounted` 隐藏原生栏、自带 78px 占位、`guard()` 角色兜底、监听 `uni.$on('role:change')`）
- `pages.json` - `tabBar.list` 由 2 项扩为 **5 项**（新增 `pages/guide/orders`、`pages/admin/appointment`、`pages/admin/clerk`，这三页据此成为 tabBar 页）
- `pages/index/index.vue` - 根节点内容末尾接入 `<ds-tabbar />`
- `pages/tabbar/mine.vue` - 接入 `<ds-tabbar />`；新增「成为地陪」行（游客可见，点击 toast 占位）；接单 / 订单管理 / 地陪审核三处 `navigateTo` → `switchTab`；`switchRole` 成功后 `uni.$emit('role:change')`
- `pages/guide/orders.vue`、`pages/admin/appointment.vue`、`pages/admin/clerk.vue` - 去掉导航栏返回键（改 44px 空占位）、删 `goBack()`、接入 `<ds-tabbar />`、注释说明「本页是某角色的 tab」
- `App.vue` - `onLaunch` 补 `hideNativeTabBar()`（`setTimeout` + `fail` 静默；页面 `mounted` 里再兜一次）
- `scripts/gen-tabbar-icons.mjs` - 新增 `orders`（单据 + 三行内容）与 `clerk`（盾牌 + 对勾）两个形状；`COLORS` 收敛为 `NORMAL_COLOR` / `ACTIVE_COLOR`；`targets` 2 → 4（共 8 张图）
- `static/tabbar/{orders,orders-active,clerk,clerk-active}.png` - **新增 4 张**（脚本生成，`--check` 通过）

**二、同步的口径与门禁**

- `DESIGN.md` - §8 组件清单的 tabBar 行重写为角色化口径（含页面接入方式与 `switchTab` 约定）；§12 第 5 条同步；§14 变更记录加一行
- `README.md` - 补「底部栏随角色变化」一节、`components/` 目录说明、tabBar 图标 4 → 8 个；视觉基准由 `design/html` 更正为 `design/redesign`
- `scripts/check-motion.mjs` - 扫描范围由 `pages/` 扩为 `pages/` + `components/`（组件与页面同一套属性白名单与时长预算，不能因为「不是页面」漏检）
- `AGENTS.md` - 门禁现状表改「2026-09-28 全绿」；启动工作流第 5 步去掉「第 2 步为红」；必需产物加 `utils/tabbar.js` 与 `components/ds-tabbar/`；新增「导航与角色（feat-017 定稿）」一节；页面数那行补「其中 5 个是 tabBar 页」
- `docs/legacy-assets.json` - **16 条**资产先补登记原因（feat-016 遗留）→ 本次改动的条目再追加 feat-017 原因 → `node scripts/verify-assets.mjs --update` 刷新哈希 → 复跑通过（保真门禁由红转绿）

**三、归档与记录**

- `feature_list.json` - 新增 **feat-017**（`done` + 证据）
- `docx/codeimpl-sum/设计文档-feat-017-角色化底部栏与首页分流.md` - **新建**：本轮设计文档（六章节齐全）
- `progress.md` / `session-handoff.md` - 本文件与交接文件

### 本次（2026-09-27：恢复被删文档 + 按真实项目与阶段同步 harness）

**一、恢复被历史提交删除的开发文档**（用户要求，从 `1eb122e` 的父提交 `2928dd4` 恢复）

- 恢复：`AGENTS.md`、`init.sh` / `init.ps1`、`docs/`（3 份）、`docx/`（31 份：`bugfix/` / `codeimpl-sum/` / `database/` / `接口文档.md`）、`scripts/`（除 `gen-tabbar-icons.mjs` 外的 6 份门禁）、`feature_list.json`、`progress.md`、`session-handoff.md`
- **刻意保留为新版、不被旧版覆盖**：`scripts/gen-tabbar-icons.mjs`（`bb3d0ab` 重写版）、`docs/legacy-assets.json`（磁盘版 2 处 `sha256` 与旧版不同，且与当前代码一致）、`docx/bugfix/BUG修复-20260927-微信端报webapi_getwxaasyncsecinfo…md`（该提交之后新增的文档）

**二、按真实项目与所处阶段同步 harness**

- `AGENTS.md` - 阶段表改「阶段 0 资产冻结 / 阶段 1 地陪 MVP / 阶段 2 视觉改版『气泡漫游』/ 阶段 3 联调与验收（进行中）」；新增「门禁现状（实测）」表；视觉口径整段重写为气泡漫游；动效口径重写为「只服务状态变化」+ 白名单含 `box-shadow` + 页面切换瞬时；验证命令与完成定义同步（去掉 `design/html/prototype.html` 与页面转场的旧口径）
- `feature_list.json` - 新增 **feat-016**（视觉改版定稿「气泡漫游」全端落地，`done` + 证据）；feat-015 标 `supersededBy: feat-016`；`prototypeSource` 改 `design/redesign/index.html`；`scopeSource` 由「6 处修订」改为「9 处（dev-001 ~ dev-009）」
- `progress.md` - 本文件：当前状态 / 门禁实测 / 视觉与动效口径 / 下一步 / 阻塞（新增两条门禁红项、appid 已配置）/ 决策（新增 6 条）/ 本节
- `session-handoff.md` - 重写为阶段 3 的起点
- `scripts/check-motion.mjs` - `TRANSITION_PROPS` 补 `box-shadow`（对齐 `DESIGN.md` §13.2）；头部注释口径同步（§1.8 → §1.10、≤300ms → ≤400ms、入场 ease-out → 过渡 ease-out / 进场 ease-enter，新增第 11 条「MOTION ↔ 令牌」）

### 本次（用户反馈：下单页提交被拒 + 返回动画改轻）

**一、修「下单页提交被拒」（阻断闭环的 bug）**

- `pages/order/create.vue` - 修复：URL 参数（字符串）与接口 id（数字）用 `===` 比较导致 `selectedPackage` 静默回落成 `packages[0]`（金额与控件跟着错），提交时 `timeSlot` / `hours` 缺失被接口拒回 → 新增模块级 `toId()`，`onLoad` 统一归一化
- `docx/bugfix/BUG修复-20260926-下单页套餐ID类型不匹配导致控件错位.md` - 新建：本次修复归档（含 33 组用例的「旧逻辑 33/33 选错套餐 / 新逻辑 0 失败」对比）
- `feature_list.json` - feat-009 的 `evidence` 补本次修复说明
- `session-handoff.md` - 交接补「URL 参数必须在入口归一化」一条

**二、返回动画与进入对称（feat-015 的返工，三版后定稿）**

- `App.vue` - `@keyframes ds-page-out` 由「`opacity: 0.15` + `translateX(40%)`」→「`opacity: 0.7` + `translateX(8px)`」→「`opacity: 0.7` 不位移」→ **「`opacity 1 → 0` + `translateX(0 → 32px)`，与 `ds-page-in` 同参数反方向」**；`.is-page-out` 曲线由 `$ds-ease-in-out` 改 `$ds-ease-out`（与进入一致）
- `uni.scss` - `$ds-dur-page-leave` **260 → 200 → 180 → 320ms**（与 `$ds-dur-page` 同值；注释写明「进出对称」）
- `utils/motion.js` - `MOTION.pageLeave` 同步改 **320**（与令牌成对改，门禁逐项比对）
- `DESIGN.md` - §13.1 时长表「页面退出」改 320ms / `--ease-out`；§13.4 改为「与进入完全对称」并补三版试错对照表；§14 变更记录补一行
- `docs/legacy-assets.json` - App.vue / uni.scss 两条 note 登记本次定稿原因后 `--update` 刷新哈希
- `feature_list.json` - feat-015 的 `evidence` 追加本次返工
- `progress.md` - 本文件：动效清单表「页面返回」行、决策、本节
- `session-handoff.md` - 交接的动效走查项改为「返回应与进入同力度，只反方向」

### 本轮（feat-015 动效）

- `DESIGN.md` - 新增 §13 动效规范（时长/曲线、只动 transform 与 opacity、四组动效、明确不做、降低动效、工程约定），原 §13 变更记录顺延为 §14；变更记录补一行
- `uni.scss` - 新增 §1.8 动效令牌：`$ds-dur-press/fast/base/spin`、`$ds-ease-out`、`$ds-ease-in-out`、`$ds-stagger-step`、`$ds-stagger-max`
- `utils/motion.js` - **新建**：动效通用行为（`MOTION` / `enterAnimClass` / `staggerDelay` / `stepDirection` / `createListEnter`），与 `utils/hscroll.js` 同构
- `App.vue` - 全局样式新增动效段：6 个 `@keyframes`、`.ds-enter-*` / `.ds-fade-in` / `.ds-pop-in` / `.ds-spinner`（含 `--on-primary` / `--lg`）/ `.ds-pressable` / `.is-pressed` + `prefers-reduced-motion` 降级
- `pages/index/index.vue` - 切区域卡片方向入场 + 加载更多上浮 + 区域下划线改真实元素（`scaleX` 收放）+ 转圈加载态 + 卡片按压反馈
- `pages/guide/list.vue` - 切预约类型方向入场 + 加载更多上浮 + chip 选中态过渡 + 转圈 + 卡片/「看详情」按压反馈；排序切换走 `renewEnter()`
- `pages/appointment/my.vue` - 四态页签改**单根滑动下划线** + 切状态方向入场 + 加载更多上浮 + 转圈 + 取消按钮按压反馈
- `pages/guide/orders.vue` - 分段控件改**滑动滑块** + 切分段方向入场 + 加载更多上浮 + 转圈 + 在线开关圆点改 `translateX` 滑动 + 三个操作按钮按压反馈
- `pages/admin/appointment.vue` - 切状态方向入场（改日期走 `renewEnter()`）+ 加载更多上浮 + chip 选中态过渡 + 转圈 + 三个操作按钮按压反馈
- `pages/admin/clerk.vue` - 两个页签改**单根滑动下划线** + 切页签方向入场 + 加载更多上浮 + 转圈 + 通过/拒绝按压反馈
- `pages/clerk/detail.vue` - 套餐选中底色/单选圈过渡 + 勾选符号弹入 + 可约日期过渡 + 套餐行/日期块/主按钮按压反馈
- `pages/order/create.vue` - 时段分段改**滑动滑块** + 提交按钮转圈（`ds-spinner--on-primary`）+ 步进器与主按钮按压反馈
- `pages/tabbar/mine.vue` - 菜单行与角色 chip 按压反馈 + chip 选中态过渡
- `pages/login/login.vue` - 删除自带 `@keyframes spin` 与 `.loading-spinner`，改用全局 `ds-spinner--lg` + 遮罩淡入；按钮与协议勾选框按压反馈 + 勾选符号弹入
- `scripts/check-motion.mjs` - **新建：第 4 项门禁，动效校验（11 类违规 + `--self-test` 全检出）**
- `init.ps1` / `init.sh` - 验证入口由 7 步扩为 **8 步**，插入「动效校验」
- `AGENTS.md` - 验证命令、完成定义与「必需产物」加入 `check-motion.mjs` 与 `utils/motion.js`；静态校验说明改为「除 smoke-flow 外」
- `README.md` - 验证一节由 6 步更新为 8 步并补说明
- `docx/codeimpl-sum/设计文档-feat-015-动效规范与落地.md` - 新建：本轮设计文档（六章节齐全，含三端页面转场差异与按压两层实现）
- `docs/legacy-assets.json` - **11 条**被改资产的 note 先补动效说明，再 `--update` 刷新哈希（App.vue / uni.scss / pages.json / README.md / login / index / clerk-detail / my / mine / admin-clerk / admin-appointment）
- `feature_list.json` - 新增 feat-015 并写 `done` 与证据
- `progress.md` / `session-handoff.md` - 本文件与交接文件

**本轮追加（用户反馈：返回也要动画、按钮也要按压、内容切换再慢一点）**

- `uni.scss` - 动效令牌扩为 9 个：新增 `$ds-dur-slide`（280ms 指示器）、`$ds-dur-page`（320ms）、`$ds-dur-page-leave`（260ms）；`$ds-dur-base` 220→**360ms**、`$ds-stagger-step` 40→**60ms**、`$ds-stagger-max` 200→**300ms**；时长预算 300→400ms
- `utils/motion.js` - `MOTION` 同步扩为 9 项；**新增 `createPageMotion()`**（`pageMotion` + `goBackWithMotion()`，H5 先播离场再 `navigateBack`，其余平台直接返回）
- `App.vue` - 新增 `ds-page-in` / `ds-page-out` / `ds-page-fade-out` 三个 keyframes 与 `.is-page-in` / `.is-page-out`（条件编译只对 H5）；按压补 `::after` 的 8% `currentColor` 叠层；`.icon-btn` / `.nav-back` 补圆角（否则叠层是方块）；降级段补页面转场
- `pages.json` - `globalStyle` 补 `app-plus` 页面转场配置（`slide-in-right` / 320ms；App 端跳转默认无动画且只认这份配置）
- 11 个页面 - 根节点加 `:class="['page', pageMotion]"` 并 spread `createPageMotion()`；有返回键的 8 页 `goBack()` 改走 `goBackWithMotion()`；返回图标、页签、chip、分段项、菜单行、步进器、勾选框、协议链接、在线开关全部补按压反馈
- `scripts/check-motion.mjs` - 预算 300→400ms；**新增第 12 类校验：`utils/motion.js` 的 `MOTION` 与 `uni.scss` 时长令牌逐项比对**；自检补 `utils/motion.js` 夹具并修正临时目录创建（原先只建 `pages/x`，加夹具后 `ENOENT`）
- `AGENTS.md` - 「改了代码但页面没生效？」章节重写：现象改表格（新增 `[sass] Undefined variable $ds-xxx` 一类）、清理命令补 HBuilderX 的 `unpackage\dist\cache` / `dev`、补 SCSS 自证方法
- `DESIGN.md` - §13 大幅修订：新增 §13.4 页面转场（三端三套机制对照表 + `goBackWithMotion()` 实现 + 为什么离场不淡到 0）、§13.5 按压反馈两层、时长表补 row 并调为 360/320/280/260ms、预算改 400ms、门禁改 12 类；变更记录补一行
- `docx/bugfix/BUG修复-20260926-SCSS变量未定义实为注入缓存陈旧.md` - 新建：`[sass] Undefined variable $ds-dur-page` 的排查归档（根因是 Vite 的 `additionalData` 注入内容被缓存，源码用同一编译器自证 12/12 通过）

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

**2026-09-28 实测（feat-017 角色化底部栏落地后，以这一组为准）：**

- [x] `./init.ps1` → **第 1-7 步全绿**（第 8 步构建按已知原因跳过：CLI 期望 `src/` 布局，本仓库是 HBuilderX 根目录布局）：
  - 2/8 资产保真 → **通过**（22 条资产哈希一致；16 条先登记原因再 `--update`；**feat-016 遗留的唯一红项收尾**）
  - 3/8 设计令牌 → 通过（`uni.scss` 120 变量 / 15 处引用 / `DESIGN.md` 13 色值全对齐）
  - 4/8 动效 → 通过（9 时长令牌 + `MOTION` 5 项一致 + 3 keyframes；**页面与公共组件 12 个文件** 0 动画名）+ `--self-test` 12 类全检出
  - 5/8 表结构 → 通过（10 表 / 109 字段 / 无外键）
  - 6/8 mock → 通过（52 用户 / 50 地陪 / 20 景点 / 16 订单；11 个页面均未直连 `api/mock/`）
  - 7/8 端到端闭环 → **50/50**（闭环订单 `CD260928A0001`）
- [x] `node scripts/gen-tabbar-icons.mjs --check` → **8 张**图标与 `uni.scss` 令牌（`#9a95ae` / `#6f61bd`）逐张一致
- [x] 路由一致性：`pages.json` 注册 11 个页面 + tabBar **5 项**，3 个新增 tabBar 页与 4 个新图标形状均存在
- [x] 编辑器诊断：全部改动文件 0 error 0 warning
- [ ] **角色化底部栏未做人工走查**：原生栏隐藏是否干净（不该出现两条栏）、切换身份后是否立刻换项、管理员第三项「地陪审核」、安全区高度只能眼睛验收

**2026-09-27 实测（视觉改版 feat-016 落地后）：**

- [x] `node scripts/check-tokens.mjs` → 通过（`uni.scss` 120 个变量 / 15 处引用 / `prototype.css` 65 个自定义属性；`DESIGN.md` 13 个色值全部落到 `uni.scss`）
- [x] `node scripts/check-motion.mjs` → 通过（9 个时长令牌按 400ms 预算检查；`MOTION` 的 5 个时长与令牌逐项一致；`App.vue` 3 个 `@keyframes` 且引用名全部存在；11 个页面引用 **0** 个动画名 —— 页面已无入场编排）+ `--self-test` 12 类夹具全部检出
- [x] `node scripts/check-schema.mjs` → 通过（10 张表 / 109 字段 / 33 条索引与约束 / 无外键）
- [x] `node scripts/check-mock.mjs` → 通过（52 用户 / 50 地陪 / 20 景点 / 7 区域 / 3 套餐 / 16 订单；44/44 已通过地陪可被下单；39 张本地头像素材、姓名对齐命中 39/50；11 个页面均未直连 `api/mock/`）
- [x] `node scripts/smoke-flow.mjs` → **50/50**（三端闭环 + 负向用例，本次闭环订单 `CD260927A0001`）
- [x] `node scripts/gen-tabbar-icons.mjs --check` → 4 张图标与 `uni.scss` 令牌一致
- [x] ~~**`node scripts/verify-assets.mjs` → 未通过**~~ **已收尾（2026-09-28）**：16 条资产（11 个页面 + `App.vue` + `uni.scss` + `pages.json` + `manifest.json` + `README.md` + 4 张 tabBar 图标）补登记原因后 `--update` 刷新哈希，复跑通过
- [ ] 小程序真实构建：只能走 HBuilderX（`npm run build:mp-weixin` 在本仓库跑不通，CLI 期望 `src/` 布局）
- [ ] 页面层人工走查：未执行（数据层已由动态门禁覆盖；玻璃卡片在小程序端的退化表现、按压反馈、光斑浓度只能眼睛验收）

### 历史证据（feat-001 ~ feat-015 阶段，数字以当时为准）

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
- [x] 标准入口：`./init.ps1` → **8 步全绿**（1 环境 / 2 资产保真 / 3 设计令牌 / 4 **动效（feat-015 新增）** / 5 表结构 / 6 mock / 7 端到端闭环 / 8 构建或跳过）
- [x] **动效门禁（feat-015 新增）**：`node scripts/check-motion.mjs` → 通过（**9 个 `@keyframes`** / 9 个动画名全部存在；**9 个时长令牌与 `utils/motion.js` 的 `MOTION` 逐项一致**）；`--self-test` → 通过（**12 类**违规都能检出：超长时长、`transition: all`、动 layout 属性、`ease-in`、`transition` 用 `linear`、`animation` 用 `linear`、`scale(0)`、`:hover`、页面内 `@keyframes`、动画名不存在、缺降级、`MOTION` 与令牌不一致）
- [x] 动效门禁首跑就抓到真实问题：登录页自带 `@keyframes spin`（scoped 会让七个页面各编译一份）+ 动画名 `spin` 在 App.vue 不存在 + `0.8s` 裸时长 + `linear` 未标注 —— 已统一到全局 `.ds-spinner`
- [x] 自检也修过一次：`walkDeclarations` 原按行切样式，漏掉 `transition: all 200ms` 这类「一行写完」的声明；改成花括号状态机后才全绿
- [x] 令牌与规范同步：`check-tokens` → **106** 个变量（含 9 个动效时长令牌）/ 15 处引用无未定义 / DESIGN.md 20 个色值全对齐（§13 未引入新色值）
- [x] **SCSS 实际编译验证**：用 **HBuilderX 自带的 dart-sass** 把「`uni.scss` 全文 + 12 个文件的样式块」逐个 `renderSync` → **12/12 通过**。这条是为排查 `[sass] Undefined variable $ds-dur-page` 加的，结论是注入缓存陈旧而非代码问题（见下方 bugfix 文档）
- [x] 改动资产全部先登记再刷新：**11 条** note 补动效说明 → `verify-assets --update` → 复跑通过，保真告警 **0** 条
- [x] `init.ps1` 的 UTF-8 BOM 仍在校验：首字节 `ef bb bf`
- [ ] 小程序真实构建：**`npm run build:mp-weixin` 跑不通且与本轮无关**（CLI 期望 `src/` 布局，本仓库是 HBuilderX 根目录布局）→ 实际编译走 HBuilderX
- [ ] 页面层人工走查：未执行（数据层已由动态门禁覆盖，但渲染与交互没有自动化；**动效观感、尤其 H5 返回转场只能靠眼睛**）
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
- **URL 参数（`onLoad(options)`）永远是字符串，接口 id 是数字**：混用 `===` 会静默落空，而且往往还有 `|| packages[0]` 之类的兜底，于是「不报错、只是默默算错」。新页面取参后一律先归一化（参考 `pages/order/create.vue` 的 `toId()`）。判断是否有同类隐患：搜页面里的 `=== this.xxxId`。
- **报错栈与源码对不上时，先怀疑构建/模块缓存**：本轮有**三次**「报的错在源码里不存在」（`store.regionTypes` undefined、`byId` undefined、`OrderApi` undefined），都是 dev server 或小程序产物还在用旧模块。动过 `api/mock/*` 后尤其要重启，因为 mock 的仓库是模块级缓存（`getDb()` 只算一次）。
  **三步法**（已写进 `AGENTS.md`）：① 停 dev server → ② `Remove-Item -Recurse -Force node_modules\.vite, dist` → ③ 重启 + 浏览器硬刷新；然后看控制台有没有 `[api] 数据层 <版本>｜…` 这一行。
  数据层现在会**自证**：`api/index.js` 的 `DATA_LAYER_VERSION` 打在启动日志里，缺模块时 `pickModule()` 直接抛出可操作错误。
- **行级交互收口成行为包，页面只声明「选择器 + 激活下标 + 切哪个方法」**：分类页签的「激活项居中」（尤其夹紧到 `[0, 内容宽−容器宽]`）与「横滑切换」（尤其不抢列表纵向滚动）都是容易各写各的细节，`utils/hscroll.js` 的 `createTabRow()` 让首页 / 后台 / 我的订单 / 地陪列表四处行为一致
- **横滑不用 `swiper`**：`swiper` 要为每个分类维护独立列表状态（分页 / `hasMore` / 刷新 / 空态 × N），与「切分类 = 重拉第一页」的现有数据流是两套语义；手势方案保持一份列表状态，分页与下拉刷新全部复用
- **横向滚动容器里的 chip / 页签必须写 `flex: none` + `white-space: nowrap`**：否则 flex 子项会被压窄、文字竖排换行（`scroll-view` 的 `white-space: nowrap` 管不了 flex 收缩）。
- 统计类字段要检查「数据里是否真的存在这种记录」：mock 里所有订单都排在明天之后时，「今日订单」必然恒为 0。
- **阶段 3 没有待开发功能**：只剩「收尾门禁 + 人工走查 + 微信端复核 + 后端对接」。想加 MVP 之外的东西 → 写进「未来候选」，不要顺手实现。
- **动效只有一条路**：状态过渡用 CSS `transition`（150ms 按压 / 颜色，200ms 指示器 / 较大表面），加载用全局 `.ds-spinner`，选中态用黑胶囊。**不要**再引入入场编排、stagger、页面转场、JS 逐帧、`transition: all`、动 layout 属性（`check-motion.mjs` 会拦）。
- **页面切换瞬时，不要加转场**：小程序（含微信）是原生转场，H5 手写转场已删除（会透出下层页面）。`utils/motion.js` 现在只是「时长镜像」，页面不再引用它 —— 不要拿它做页面编排。
- **列表内容替换不做动画**：切分类 / 切状态只重新拉第一页并把滚动复位到顶部；方向性位移在整页滚动容器里会横向溢出触发滚动条。
- **改了 `uni.scss` 的时长令牌，必须同步 `utils/motion.js` 的 `MOTION`**：`check-motion.mjs` 会逐项比对（kebab ↔ camel）。
- **看到 `[sass] Undefined variable $ds-xxx` 先别改代码**：`uni.scss` 是靠 Vite 的 `additionalData` 注入的，注入内容会被缓存 —— 新 `App.vue` × 旧 `uni.scss` 就会报这个。停运行 → 删 `unpackage\dist\cache` 与 `unpackage\dist\dev` → 重跑。想自证源码没问题：用 HBuilderX 自带的 dart-sass 把 `uni.scss` 与样式块拼起来 `renderSync` 一次。
- **动效改动必须跑 `node scripts/check-motion.mjs`**；改设计与令牌时 `DESIGN.md` §13 与 `uni.scss` §1.10 必须同步改（和颜色、字阶同一条规矩）。
- **不要给正在读的数字加动效**：金额、统计条、步进器的人数是「用户正在读或正在操作的数据」，动了只会干扰。
- **玻璃卡片在小程序端会退化**：`backdrop-filter` 不生效，只剩半透明白底 + 阴影 + 白内环。这是 `DESIGN.md` §12 认可的降级，**不要**为它写条件编译补丁。
- **改完 `uni.scss` 的令牌记得重跑 `node scripts/gen-tabbar-icons.mjs`**（tabBar 图标颜色读令牌，手工替换会漂）；`--check` 可校验。
