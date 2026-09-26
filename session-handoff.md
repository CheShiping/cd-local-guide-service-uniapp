# 会话交接

## 交接时间

2026-09-26（**MVP 全部功能已完成**：7 个页面 + 三端闭环 + 动效规范落地 + **8 项**验证门禁）

## 这次会话做了什么

1. 全量盘点原有「陪玩小程序」资产，产出 `docs/legacy-assets.md` + `docs/legacy-assets.json`，打基线标签 `legacy-peiwan-baseline-v1`。
2. 落地零依赖保真门禁 `scripts/verify-assets.mjs`（含 `removedAssets` 记录有意删除的资产），接入 `init.ps1` / `init.sh`。
3. 建立 harness：`AGENTS.md`、`feature_list.json`、`progress.md`、`session-handoff.md`。
4. 固化 MVP 范围：`docs/mvp-scope.json`（`deviations` 8 条）+ 7 屏 HTML 原型（定稿主题「宣纸 · 疏」）。
5. 视觉定稿落地：重写 `DESIGN.md`（原 Linear 版本删除）+ `uni.scss`（`$ds-*` 令牌，主色竹青绿 `#2f6b5e`）。
6. 建立 `docx/` 归档结构（`codeimpl-sum/` / `bugfix/` / `database/`）与 `docx/接口文档.md`。
7. **feat-014 数据库定稿**：10 张表 / 109 字段（无外键）+ `seed.sql` + `check-schema.mjs`。
8. **feat-004 数据层**：`api/` 分层（constants / errors / mock / http），52 用户 / 50 地陪 / 20 景点 / 16 订单。
9. **feat-003 协议页与图片兜底**：协议页注册 + 6 处悬空图片引用清零。
10. **feat-005 订单四态状态机**：四态语义收口到 `api/constants.js`。
11. **feat-006 ~ feat-012 七个页面**：景点列表 → 地陪列表 → 详情 → 下单 → 订单 → 接单 → 后台（管理端两页），三端闭环打通。
12. **feat-013 令牌收口与文档同步**：8 个页面令牌化、tabBar/manifest/README/App.vue 对齐、**删除过渡适配层**。
13. **新增第 7 项门禁 `scripts/smoke-flow.mjs`**（端到端闭环，动态运行 mock），并靠它抓到 2 个阻断级运行时 bug 修掉。
14. **修掉 tabBar 未与设计系统对齐**：4 张图标改由 `scripts/gen-tabbar-icons.mjs` 代码生成（线性规范 + 竹青/灰），tabBar 底色由纯白改 `#fbfaf5`。
15. **修掉 3 个体验/数据问题**：筛选 chip 被 flex 压缩导致文字竖排（3 个页面补 `flex: none` + `nowrap`）；「今日订单 / 今日完成」恒为 0（生成器补约在今天的单）；`byId` 缺表报错不可读（改成可操作信息，并把管理端审核链路纳入闭环门禁，断言 28 → 36）。
16. **地陪头像改用本地素材**（dev-009）：`static/guide/` 39 张（文件名 = 姓名拼音）成为 mock 头像来源，有素材的地陪直接取「文件名反查出的姓名」以保证头像与姓名一致（命中 39/50，39 张全部用上）；新增门禁校验素材池 ↔ 目录一致。
17. **feat-015 动效规范与落地**：DESIGN.md §13 + uni.scss §1.8 定令牌；`utils/motion.js` 抽出通用行为（`createListEnter()` 列表入场方向 + 错峰延迟 + 批次 key、`createPageMotion()` 页面转场）；七屏全部补上「切分类方向入场 / **页面进入与返回转场** / 加载更多上浮 + 转圈 / 页签与分段滑动指示器 / 状态过渡 / **全部可点元素的按压反馈** / 降低动效」；内容切换放慢到 360ms（逐项 60ms 封顶 300ms），UI 动效预算 300→400ms；顺带把登录页自带的 `@keyframes spin` 统一到全局；新增第 4 项门禁 `scripts/check-motion.mjs`（**12 类**违规 + `--self-test`，含 `MOTION` ↔ `uni.scss` 时长一致性），`./init.ps1` 扩为 **8 步**。
18. **排查一次「SCSS 变量未定义」误报**：`[sass] Undefined variable $ds-dur-page` 的根因是 Vite 的 `additionalData` 注入内容被缓存（新 `App.vue` × 旧 `uni.scss`），源码用 HBuilderX 自带的 dart-sass 编译 12 个样式块全部通过；清理命令已写进 `AGENTS.md`，归档 `docx/bugfix/BUG修复-20260926-SCSS变量未定义实为注入缓存陈旧.md`。同一轮还确认：`npm run build:mp-weixin` 在本仓库跑不通（CLI 期望 `src/` 布局），真实编译走 HBuilderX。

## 用户已拍板的全部决策（冲突时以此为准）

| 编号 | 决策 | 落点 |
|---|---|---|
| dev-001 | 先选景点，再选地陪 | 首页 = 景点列表页 |
| dev-002 | 评价不要了 | 卡片与详情页无评分/评价，`check-mock.mjs` 拦截评价字段 |
| dev-003 | 地陪申请开通，先不做 | 进 `futureUpgrades`，MVP 地陪由 mock 预置 50 个 |
| dev-004 | 先 mock，后续对接真实后端 HTTP | `USE_MOCK = true`，路由表见 `api/http.js` |
| dev-005 | 定稿「宣纸 · 疏」，删掉原 DESIGN.md | `DESIGN.md` 重写 + `uni.scss` 落地 `$ds-*` |
| dev-006 | 图片用后端返回 URL，不要自绘 SVG | 6 处图片引用已改字段 + 容器底色兜底 |
| dev-007 | 区域做成后台可维护的字典表 | `region_types`（7 类）；**管理界面不纳入实现计划** |
| dev-008 | 景点池扩到 20 个 | `seed.sql` 20 条，7 类区域均有景点 |

## 下一会话从这里开始

**第一件事：** `./init.ps1`，确认 **8 步全绿**（环境 / 资产保真 / 设计令牌 / 动效 / 表结构 / mock 静态 / 端到端闭环 / 构建或跳过）。
预期：保真告警 **0 条**；动效校验 **9 个 keyframes / 9 个动画名 + 9 个时长令牌与 `MOTION` 逐项一致**；闭环校验 **50/50**。

**第二件事：** 读 `docs/mvp-scope.json`（范围）+ `DESIGN.md`（视觉，**§13 是动效，含三端页面转场差异**）+ `docx/接口文档.md`（接口基准）。

**第三件事：** 只剩下**页面层人工走查**与**在 HBuilderX 里真编译一次**，没有待开发功能：

0. **先开 HBuilderX 跑起来**（`npm run build:mp-weixin` 在本仓库跑不通：CLI 期望 `src/` 布局，本仓库是根目录布局）
   - 跑之前：删掉 `unpackage\dist\cache` 与 `unpackage\dist\dev`（`uni.scss` 的注入内容会被缓存，不清会报假的 `Undefined variable $ds-*`）
1. `npm run dev:h5` 或微信开发者工具，按「游客下单 → 地陪接单 → 平台确认 → 地陪完成」走一遍
   - 「我的」页底部有**演示身份切换**，切游客 / 地陪 / 管理员即可走通三端
2. 重点看：页签切换、下拉刷新（订单页 / 接单页）、图片兜底（断网时露竹青底色）、弹窗确认、底部操作栏是否贴底
3. **动效专项走查**（feat-015，只能人工确认）：
   - **页面转场（H5）**：点景区卡进地陪列表、点「立即预约」进下单页是否有淡入；点返回图标是否有**离场动画**再切页。**「换页那一下」是本轮最需要确认的一点**（上一页被缓存复用，不会再播进入动画），小程序端则应该是原生滑动、且不该出现双重动画
   - 首页切区域 / 地陪列表切预约类型 / 订单页切四态 / 接单页切分段 / 后台切状态：卡片是否**从行进方向**滑入（360ms + 逐项 60ms，应该慢到看得清）、加载更多是否只有新卡片上浮
   - 等宽页签下划线是否**滑过去**（我的订单 / 地陪审核）、分段控件选中块是否滑过去（接单 / 下单）
   - 按压反馈：卡片、按钮、页签、chip、分段项、菜单行、**返回图标**、步进器、勾选框、协议链接按下是否都有反馈（`scale(0.96)` + 一层很淡的叠层），且**松手后立即回弹**（`hover-stay-time="70"`，默认 400ms 会显得发黏）
   - 接单页的**在线开关圆点**是否滑过去（原来是硬跳）
   - `prefers-reduced-motion` 在小程序端是否生效（H5 一定生效；若小程序不支持，`@media` 段会被忽略，属已知遗留）
   - 要单看「慢/快」是否合适：改 `uni.scss` §1.8 的 `$ds-dur-base` 与 `$ds-stagger-*`，**同时**改 `utils/motion.js` 的 `MOTION`（门禁会校验两边一致）
4. 发现问题 → 按规则产出 `docx/bugfix/BUG修复-YYYYMMDD-简述.md`，登记到 `progress.md` 的「本次会话修改的文件」
5. 本轮新增的 WXSS 还没在真编译里跑过：`/* #ifdef H5 */` 条件编译段、`.is-pressed::after` 叠层、`animation-fill-mode: backwards`、`@media (prefers-reduced-motion)` —— 已在 HBuilderX 里确认这四样的小程序端表现
   （源码本身已用 HBuilderX 自带 dart-sass 验证过 12 个样式块全部能编译）

## 硬边界速查

- 3 件事：游客下单 / 地陪接单 / 平台确认；**11 个注册页面**（7 个 MVP 页面 + 登录 + 协议 + 我的 + 后台审核）
- 流程：**景点 → 地陪 → 详情（选套餐+日期）→ 下单页 → 我的订单**
- 20 景点 / 7 类区域 / 3 个套餐 SKU / 3 种预约类型 / 4 态订单 / 3 种角色
- 数据：全部 mock（`api/index.js` 的 `USE_MOCK = true`），页面**禁止**直连 `api/mock/`
- 视觉：竹青绿 `#2f6b5e` 只做可点与选中，朱砂 `#b4462f` 只给价格，宣纸底 `#f7f4ed`；页面一律用 `$ds-*`
- 动效：只动 `transform` / `opacity`（+ 颜色类）；入场 `$ds-ease-out`、内容切换 360ms、按压 140ms；滑动指示器只改 `transform`；统一入口是 `utils/motion.js`（`createListEnter()` / `createPageMotion()`），规范在 `DESIGN.md` §13
- 页面转场：小程序原生（**别加料**）/ H5 用 `is-page-in` `is-page-out` / App 用 `pages.json` 的 `globalStyle.app-plus`
- 语义唯一来源：`api/constants.js`（四态 / 流转白名单 / 预约类型 / 时段 / 价格单位）
- **静态门禁证明「结构对」，`smoke-flow.mjs` 证明「跑得通」** —— 动数据层必须跑后者
- 不做：IM、定位、分销、团购、广场、等级、自动结算、多城市、优惠券、动态定价、行程日志、轨迹、门店、复杂排班、加价规则、评价、地陪申请流程、投诉

## 关键文件索引

| 文件 | 作用 |
|---|---|
| `docs/mvp-scope.json` | **范围唯一事实来源**（8 条 deviations + mockScale + imageStrategy） |
| `DESIGN.md` / `uni.scss` | **视觉唯一事实来源**（宣纸 · 疏 + `$ds-*` 令牌，必须同步改；动效规范在 DESIGN.md §13 / 令牌在 uni.scss §1.8） |
| `utils/motion.js` | 动效通用行为（`createListEnter()` 列表入场方向与错峰延迟），页面不要各写一套 |
| `design/html/prototype.html` | 7 屏可交互原型（**视觉基准**，界面细节以对应屏为准） |
| `docx/接口文档.md` | **接口对照基准**（6 模块 × 25 方法 × 路由 × 错误约定） |
| `api/constants.js` | 领域常量唯一来源（四态、流转白名单、预约类型、订单号规则） |
| `api/mock/seed.json` | mock 素材池与规模：姓名池 / 拼音表 / **地陪头像素材池 `guideAvatarFiles`（39 条，与 `static/guide/` 一一对应）** |
| `static/guide/` | 地陪头像素材（39 张，文件名 = 姓名拼音；**合计 12.56MB，超小程序主包 2MB 上限，上小程序前需压缩**） |
| `api/index.js` | 数据层出口（`USE_MOCK`），页面只允许 import 它 |
| `api/http.js` | HTTP 路由表（对接后端时的对照清单） |
| `docx/database/schema.sql` + `seed.sql` | 表结构 + 初始化数据（7 区域 / 3 套餐 / 20 景点） |
| `scripts/*.mjs` | **8 项零依赖门禁**：资产保真 / 设计令牌 / **动效** / 表结构 / mock 静态 / 端到端闭环（都带 `--self-test`） |
| `scripts/gen-tabbar-icons.mjs` | tabBar 图标生成器（颜色读 `uni.scss` 令牌；`--check` 校验现有图标） |
| `AGENTS.md` | 工作规则、硬边界、docx 归档规则、验证命令、完成定义 |
| `docs/legacy-assets.md` / `.json` | 原有资产台账 + `removedAssets` + 保真门禁数据 |
| `feature_list.json` | 功能状态与证据（`feat-001` ~ `feat-014` 全部 done） |
| `init.ps1` / `init.sh` | 标准验证入口（7 步） |
| `progress.md` | 决策记录、风险与「未来候选」 |

## 不要做的事

- 不要删改台账里的 22 个资产；确需删除必须登记到 `removedAssets` 并写原因
- 不要为了"让校验通过"而无脑 `--update`
- 不要用自绘 SVG/插画替代真实图片；图片一律走后端 URL 字段 + 容器底色兜底
- **不要手工替换 `static/tabbar/*.png`**：这 4 张图标由 `scripts/gen-tabbar-icons.mjs` 代码生成、颜色取自令牌；改了 `uni.scss` 就重跑脚本（`--check` 可校验）
- 不要在页面里再写一份状态 / 时段 / 价格单位映射表（唯一来源是 `api/constants.js`）
- 不要在页面里直连 `api/mock/`（`check-mock.mjs` 会把关）
- 不要绕过 `smoke-flow.mjs`：它抓到的 bug 都通过了其它所有门禁
- **报错栈与源码对不上时，先清缓存重启**（已出现过**四次**"报的错在源码里不存在"，第四次是 `[sass] Undefined variable $ds-dur-page`）：① 停运行 → ② 删缓存（HBuilderX：`Remove-Item -Recurse -Force unpackage\dist\cache, unpackage\dist\dev`；CLI：`node_modules\.vite, dist`）→ ③ 重启 + 浏览器硬刷新 → ④ 看控制台有没有 `[api] 数据层 <版本>｜数据源 mock｜模块 …` 这一行（`api/index.js` 的 `DATA_LAYER_VERSION` 是版本戳）。想自证源码没问题：用 HBuilderX 自带的 dart-sass 把 `uni.scss` 与样式块拼起来 `renderSync` 一次
- 数据层缺模块时会由 `pickModule()` 直接抛出可操作错误，**不再是** `Cannot read properties of undefined (reading 'xxx')`；看到旧式报错就先按上面的流程排除旧模块
- 分类行的「激活项居中 + 内容横滑切换」统一走 `utils/hscroll.js` 的 `createTabRow()`（`pages/index/index.vue`、`pages/admin/appointment.vue`、`pages/appointment/my.vue`、`pages/guide/list.vue` 已接入）。新页面要接入只需 5 行，**不要**再各写一套居中/手势逻辑；等宽不溢出的页签只传 `index` / `onStep`
- `pages/guide/orders.vue`（两段接单页签）与 `pages/admin/clerk.vue`（审核两页签）尚未接入横滑，属于同类行，按需补（动效已在 feat-015 补齐，缺的只是手势）
- 横向滚动容器里的 chip / 页签必须写 `flex: none` + `white-space: nowrap`，否则会被压窄成竖排文字
- **动效只走三条路**：`ds-enter-*` 类 + `enterStyle(index)` 给延迟的 CSS 动画、`translateX(下标 × 100%)` 的滑动指示器、颜色类 `transition`。不要 JS 逐帧、不要 `transition: all`、不要动 `width` / `left`
- 列表入场统一用 `utils/motion.js` 的 `createListEnter()`（data / methods 各 spread 一次）；`enterSeq` **必须进 `:key`**，否则切分类时同一批 key 不会重播入场
- 入场 `animation-fill-mode` 保持 **`backwards`**：改成 `both` 会残留 `transform`，把按压反馈的 `scale` 盖掉
- keyframes 只放 `App.vue` 全局样式：页面样式是 scoped 的，同名 keyframes 会被编译成七个不同名字（登录页历史上就是这样漏了一份）
- 页面转场统一用 `utils/motion.js` 的 `createPageMotion()`（根节点绑 `pageMotion`、`goBack()` 调 `goBackWithMotion()`）；**不要给小程序自己加页面转场**（原生已经有了，再加就是双重动画）
- **改了 `uni.scss` 时长令牌必须同步 `utils/motion.js` 的 `MOTION`**，否则返回时的等待时间会与动画错位；`check-motion.mjs` 会直接报错
- 改样式后跑 `node scripts/check-motion.mjs`；**不要给正在读的数字加动效**（金额 / 统计 / 步进器）
- **按压反馈用 `hover-class="is-pressed"` + `hover-stay-time="70"`**，不要用 `:active`（小程序不可靠），也不要漏掉 `hover-stay-time`（默认 400ms 会发黏）；透明热区（`icon-btn` / `nav-back`）要带圆角，否则 8% 叠层是个方块
- **看到 `[sass] Undefined variable $ds-xxx` 先别改代码**：那是 `uni.scss` 的注入缓存陈旧（Vite `additionalData`），停运行 → 删 `unpackage\dist\cache` 与 `unpackage\dist\dev` → 重跑即可（详见 `AGENTS.md` 与对应 bugfix 文档）
- **新增地陪头像素材时，必须同时登记进 `api/mock/seed.json` 的 `generators.guideAvatarFiles`**（mock 跑在客户端，无法扫描目录；`check-mock.mjs` 会拦住漏登记与改名）
- 改 `static/guide/` 里的图片前先确认包体：小程序主包只有 2MB，当前这 39 张已占 12.56MB
- 不要顺手实现 MVP 之外的功能（写进 `progress.md` 的「未来候选」）
- 不要忘记 docx 归档，否则功能不算 `done`
- 不要自行 commit / tag / push
