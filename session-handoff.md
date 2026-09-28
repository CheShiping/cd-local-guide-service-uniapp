# 会话交接

## 交接时间

2026-09-28（**feat-017 角色化底部栏与首页分流已落地；feat-016 遗留的资产保真红项已收尾 —— `./init.ps1` 第 1-7 步全绿**）

## 项目一句话

**耍搭（成都地陪）** —— uni-app + Vue3 的成都景点地陪预约小程序，由原有「陪玩小程序」在本仓库内原地重构而来。MVP 的 3 件事：游客下单 / 地陪接单 / 平台确认订单。

## 这次会话做了什么

1. **feat-017 角色化底部栏与首页分流**（用户需求：游客不变；切到地陪时「首页」变成接单页、我的页新增「成为地陪」一行；管理员时「首页」变成订单管理、底部栏再新增「地陪审核」）：
   - 新增 `utils/tabbar.js`（角色 → 底部栏项 / 首页路径 / 图标地址的**唯一来源**）与 `components/ds-tabbar/ds-tabbar.vue`（**自绘**底部栏：按角色换项、当前项高亮、`switchTab` 跳转、`uni.hideTabBar` 隐藏原生栏、自带 78px 占位、`guard()` 角色兜底）
   - `pages.json` 的 `tabBar.list` 由 2 项扩为 **5 项**（`pages/index/index`、`pages/guide/orders`、`pages/admin/appointment`、`pages/admin/clerk`、`pages/tabbar/mine`）—— 后三页据此成为 tabBar 页（**只能用 `switchTab` 打开**）
   - 5 个页面根节点内容末尾接入 `<ds-tabbar />`；三个工作台页去掉返回键（改 44px 空占位）；`mine.vue` 三处 `navigateTo` → `switchTab`、新增「成为地陪」占位入口（游客可见）、切换演示身份后 `uni.$emit('role:change')`
   - 图标由 2 个形状扩为 **4 个形状 8 张**（新增 `orders` / `clerk`）；`check-motion.mjs` 扫描范围加入 `components/`
2. **收尾 feat-016 遗留的资产保真红项**：16 条被改资产的 `note` 补登记原因（本次改动的再加一段 feat-017 原因）→ `node scripts/verify-assets.mjs --update` → `./init.ps1` 第 2 步**由红转绿**。
3. **同步文档**：`DESIGN.md`（§8 / §12 / §14）、`README.md`、`AGENTS.md`（新增「导航与角色（feat-017 定稿）」）、`feature_list.json`（新增 feat-017）、`progress.md`、设计文档 `docx/codeimpl-sum/设计文档-feat-017-角色化底部栏与首页分流.md`。

## 门禁现状（2026-09-28 实测）

| 门禁 | 状态 |
|---|---|
| `verify-assets` | ✅ 22 条资产哈希一致（feat-016 的 16 条已登记原因并刷新） |
| `check-tokens` | ✅ 120 变量 / 15 引用 / `DESIGN.md` 13 色值全对齐 |
| `check-motion` | ✅ 9 时长令牌 + `MOTION` 5 项一致 + 3 keyframes；**页面与公共组件 12 个文件** 0 违规 |
| `check-schema` | ✅ 10 表 / 109 字段 / 无外键 |
| `check-mock` | ✅ 52 用户 / 50 地陪 / 20 景点 / 16 订单 |
| `smoke-flow` | ✅ **50/50** |
| `./init.ps1` | ✅ **1-7 步全绿**（第 8 步构建按已知原因跳过） |
| `gen-tabbar-icons --check` | ✅ 8 张图标与令牌一致 |

## 下一会话从这里开始

**第一件事：人工走查角色化底部栏（本轮唯一没做的验证维度）**

先删缓存再跑（`unpackage\dist\cache` 与 `unpackage\dist\dev`；`uni.scss` 注入内容会被缓存，不清会报假的 `Undefined variable $ds-*`），然后：

1. **底部栏本身**：原生栏是否被隐藏干净（不该出现「两条底部栏」，切换瞬间也不该闪一下）；三种身份的项数/文案与当前项高亮；管理员第三项「地陪审核」能点且高亮正确；iPhone 安全区下是否压住内容或留白过多。
2. **角色分流**：mock 默认身份是**管理员** → 登录后应直接落「订单管理」；在「我的」页切换身份后底部栏应立即换项；管理员 / 地陪若停在首页应被收敛到各自第一屏。
3. **三端闭环**：游客下单 → 地陪接单 → 平台确认 → 地陪完成（切换身份后「接单」「订单管理」就是底部栏第一项）。
4. 顺手确认三个工作台页没有返回键后，能靠底部栏回到「我的」。

**第二件事：继续走查「气泡漫游」观感**（feat-016 遗留）

玻璃卡片两端的分层差异（小程序无 `backdrop-filter`）、七档光斑浓度、黑胶囊选中态、按压反馈、分段控件白色滑块、图片兜底、下拉刷新、弹窗、底部操作栏是否贴底。

**第三件事：读三份事实来源**

- 范围：`docs/mvp-scope.json`（9 条 `deviations`）
- 视觉：`DESIGN.md`（§8 含角色化 tabBar，§13 动效）+ `uni.scss` 的 `$ds-*`
- 接口：`docx/接口文档.md`

**第四件事：真实构建** → 走 HBuilderX（`npm run build:mp-weixin` 在本仓库跑不通，CLI 期望 `src/` 布局）。

## 用户已拍板的决策（冲突时以此为准）

| 编号 | 决策 | 落点 |
|---|---|---|
| dev-001 | 先选景点，再选地陪 | 首页 = 景点列表页（游客身份） |
| dev-002 | 评价不要了 | 卡片与详情页无评分/评价，`check-mock.mjs` 拦截评价字段 |
| dev-003 | 地陪申请开通，先不做 | 进 `futureUpgrades`；MVP 地陪由 mock 预置 50 个，「我的」页只留「成为地陪」占位入口（feat-017） |
| dev-004 | 先 mock，后续对接真实后端 HTTP | `USE_MOCK = true`，路由表见 `api/http.js` |
| dev-005 | 定稿主题并重写 `DESIGN.md` | **现主题为「气泡漫游」**（feat-016 第二次重写） |
| dev-006 | 图片用后端返回 URL，不要自绘 SVG | 图片一律走 `coverUrl` / `avatarUrl` + 容器底色兜底 |
| dev-007 | 区域做成后台可维护的字典表 | `region_types`（7 类） |
| dev-008 | 景点池扩到 20 个 | `seed.sql` 20 条，7 类区域均有景点 |
| dev-009 | 地陪头像用本地素材 | `static/guide/` 39 张，`seed.json` 的 `guideAvatarFiles` 必须同步登记 |
| feat-017 | 底部栏按角色变化（游客不变 / 地陪接单 / 管理员订单管理 + 地陪审核） | `utils/tabbar.js` + `components/ds-tabbar`；原生 tabBar 隐藏 |

## 硬边界速查

- 3 件事：游客下单 / 地陪接单 / 平台确认；**11 个注册页面**（7 个 MVP 页面 + 登录 + 协议 + 我的 + 地陪审核），其中 **5 个是 tabBar 页**
- 底部栏：游客「首页 · 我的」/ 地陪「接单 · 我的」/ 管理员「订单管理 · 地陪审核 · 我的」；**tab 页之间一律 `switchTab`**；tab 页不放返回键
- 流程：**景点 → 地陪 → 详情（选套餐 + 日期）→ 下单页 → 我的订单**
- 20 景点 / 7 类区域 / 3 个套餐 SKU / 3 种预约类型 / 4 态订单 / 3 种角色
- 数据：全部 mock（`api/index.js` 的 `USE_MOCK = true`），页面**禁止**直连 `api/mock/`
- 视觉：雾紫 `#8f7fe0` 只做可点/选中，深紫 `#7b6bd0`（`$ds-tertiary`）只给价格，页底奶油白 `#fdfcfa`；按钮与选中态一律**纯黑胶囊**；卡片是**玻璃片不描边**；页面一律用 `$ds-*`
- 动效：只服务状态变化 —— 按压/颜色 150ms、指示器/较大表面 200ms、加载 900ms；白名单 `transform` / `opacity` / 颜色类 / `box-shadow`；**不做入场编排、不做页面转场**
- 语义唯一来源：`api/constants.js`（四态 / 流转白名单 / 预约类型 / 时段 / 价格单位 / 角色）
- **静态门禁证明「结构对」，`smoke-flow.mjs` 证明「跑得通」** —— 动数据层必须跑后者
- 不做：IM、定位、分销、团购、广场、等级、自动结算、多城市、优惠券、动态定价、行程日志、轨迹、门店、复杂排班、加价规则、评价、地陪申请流程、投诉

## 关键文件索引

| 文件 | 作用 |
|---|---|
| `docs/mvp-scope.json` | **范围唯一事实来源**（9 条 deviations + mockScale + imageStrategy） |
| `DESIGN.md` / `uni.scss` | **视觉唯一事实来源**（气泡漫游 + `$ds-*` 令牌；§8 含角色化 tabBar，动效 §13 ↔ uni.scss §1.10） |
| `utils/tabbar.js` | **底部栏配置唯一来源**（角色 → 项 / 首页路径 / 图标地址） |
| `components/ds-tabbar/ds-tabbar.vue` | 自绘底部栏（按角色换项 + 角色兜底；页面末尾放 `<ds-tabbar />` 即可） |
| `design/redesign/` | 七屏原型与 `tokens.css`（**视觉基准**；`design/html/`、`design/prototypes/` 仅历史存档） |
| `docx/接口文档.md` | **接口对照基准**（模块 × 方法 × 路由 × 错误约定） |
| `api/constants.js` | 领域常量唯一来源（四态、流转白名单、预约类型、角色、订单号规则） |
| `api/index.js` | 数据层出口（`USE_MOCK`），页面只允许 import 它 |
| `api/mock/seed.json` | mock 素材池与规模（头像素材池 `guideAvatarFiles` 39 条） |
| `static/guide/` | 地陪头像素材（39 张；**合计 12.56MB，超小程序主包 2MB 上限，上小程序前需压缩**） |
| `scripts/*.mjs` | **6 项零依赖门禁**（除 `gen-tabbar-icons.mjs`）：资产保真 / 令牌 / 动效 / 表结构 / mock 静态 / 端到端闭环，都带 `--self-test` |
| `scripts/gen-tabbar-icons.mjs` | tabBar 图标生成器（4 形状 8 张，颜色读 `uni.scss`；`--check` 校验） |
| `utils/motion.js` | 动效时长的 JS 镜像（**页面已不引用**，只供门禁比对） |
| `utils/hscroll.js` | 分类行行为包（激活项居中 + 横滑切换） |
| `AGENTS.md` | 工作规则、硬边界、验证命令、完成定义（含「导航与角色（feat-017 定稿）」） |
| `feature_list.json` | 功能状态与证据（`feat-001` ~ `feat-017` 全部 done） |
| `init.ps1` / `init.sh` | 标准验证入口（8 步） |

## 不要做的事

- 不要删改台账里的 22 个资产；确需删除必须登记到 `removedAssets` 并写原因
- 不要无脑 `--update`（先登记 `note` 再刷新，否则等于掩盖改动）
- **不要用 `navigateTo` 打开 tabBar 页**（接单 / 订单管理 / 地陪审核 / 首页 / 我的）—— 会失败，一律 `switchTab`
- **不要给 tab 页加返回键**：它们是底部栏页，靠底部栏回退
- **不要在页面里重写底部栏或角色兜底逻辑**：配置在 `utils/tabbar.js`、兜底在 `ds-tabbar` 的 `guard()`，各页只放一个 `<ds-tabbar />`
- **不要手工替换 `static/tabbar/*.png`**（8 张）：由 `scripts/gen-tabbar-icons.mjs` 生成、颜色取自令牌；改了 `uni.scss` 就重跑
- 不要用自绘 SVG/插画替代真实图片；图片一律走后端 URL 字段 + 容器底色兜底
- 不要在页面里再写一份状态 / 时段 / 价格单位映射表（唯一来源是 `api/constants.js`）
- **不要拿 URL 参数直接与接口 id 做 `===`**：`onLoad(options)` 取到的永远是字符串；先归一化（参考 `pages/order/create.vue` 的 `toId()`）
- 不要在页面里直连 `api/mock/`（`check-mock.mjs` 会把关）
- 不要绕过 `smoke-flow.mjs`：它抓到的 bug 都通过了其它所有门禁
- **不要给页面加转场动画、不要写列表入场 / stagger**；也不要拿 `utils/motion.js` 做页面编排
- 不要给玻璃卡片补 `backdrop-filter` 的条件编译（小程序端退化是 `DESIGN.md` §12 认可的行为）
- 不要给正在读的数字加动效（金额 / 统计 / 步进器）
- **报错栈与源码对不上时，先清缓存重启**（已出现多次，含 `[sass] Undefined variable $ds-*`）：① 停运行 → ② 删 `unpackage\dist\cache` 与 `unpackage\dist\dev` → ③ 重启 + 浏览器硬刷新 → ④ 看控制台有没有 `[api] 数据层 <版本>｜…` 这一行
- 横向滚动容器里的 chip / 页签必须写 `flex: none` + `white-space: nowrap`
- 新增地陪头像素材时必须同时登记进 `api/mock/seed.json` 的 `generators.guideAvatarFiles`
- 不要顺手实现 MVP 之外的功能（写进 `progress.md` 的「未来候选」）
- 不要忘记 docx 归档，否则功能不算 `done`
- 不要自行 commit / tag / push
