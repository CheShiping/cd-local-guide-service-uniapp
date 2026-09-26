# 会话交接

## 交接时间

2026-09-26（**MVP 全部功能已完成**：7 个页面 + 三端闭环 + 7 项验证门禁）

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

**第一件事：** `./init.ps1`，确认 **7 步全绿**（环境 / 资产保真 / 设计令牌 / 表结构 / mock 静态 / 端到端闭环 / 构建或跳过）。
预期：保真告警 **0 条**；闭环校验 **36/36**。

**第二件事：** 读 `docs/mvp-scope.json`（范围）+ `DESIGN.md`（视觉）+ `docx/接口文档.md`（接口基准）。

**第三件事：** 只剩下**页面层人工走查**与**真实构建**，没有待开发功能：

1. `npm run dev:h5` 或微信开发者工具，按「游客下单 → 地陪接单 → 平台确认 → 地陪完成」走一遍
   - 「我的」页底部有**演示身份切换**，切游客 / 地陪 / 管理员即可走通三端
2. 重点看：页签切换、下拉刷新（订单页 / 接单页）、图片兜底（断网时露竹青底色）、弹窗确认、底部操作栏是否贴底
3. 发现问题 → 按规则产出 `docx/bugfix/BUG修复-YYYYMMDD-简述.md`，登记到 `progress.md` 的「本次会话修改的文件」
4. 想确认编译期无问题 → `./init.ps1 -Full`（安装依赖 + `npm run build:mp-weixin`）

## 硬边界速查

- 3 件事：游客下单 / 地陪接单 / 平台确认；**11 个注册页面**（7 个 MVP 页面 + 登录 + 协议 + 我的 + 后台审核）
- 流程：**景点 → 地陪 → 详情（选套餐+日期）→ 下单页 → 我的订单**
- 20 景点 / 7 类区域 / 3 个套餐 SKU / 3 种预约类型 / 4 态订单 / 3 种角色
- 数据：全部 mock（`api/index.js` 的 `USE_MOCK = true`），页面**禁止**直连 `api/mock/`
- 视觉：竹青绿 `#2f6b5e` 只做可点与选中，朱砂 `#b4462f` 只给价格，宣纸底 `#f7f4ed`；页面一律用 `$ds-*`
- 语义唯一来源：`api/constants.js`（四态 / 流转白名单 / 预约类型 / 时段 / 价格单位）
- **静态门禁证明「结构对」，`smoke-flow.mjs` 证明「跑得通」** —— 动数据层必须跑后者
- 不做：IM、定位、分销、团购、广场、等级、自动结算、多城市、优惠券、动态定价、行程日志、轨迹、门店、复杂排班、加价规则、评价、地陪申请流程、投诉

## 关键文件索引

| 文件 | 作用 |
|---|---|
| `docs/mvp-scope.json` | **范围唯一事实来源**（8 条 deviations + mockScale + imageStrategy） |
| `DESIGN.md` / `uni.scss` | **视觉唯一事实来源**（宣纸 · 疏 + `$ds-*` 令牌，必须同步改） |
| `design/html/prototype.html` | 7 屏可交互原型（**视觉基准**，界面细节以对应屏为准） |
| `docx/接口文档.md` | **接口对照基准**（6 模块 × 25 方法 × 路由 × 错误约定） |
| `api/constants.js` | 领域常量唯一来源（四态、流转白名单、预约类型、订单号规则） |
| `api/mock/seed.json` | mock 素材池与规模：姓名池 / 拼音表 / **地陪头像素材池 `guideAvatarFiles`（39 条，与 `static/guide/` 一一对应）** |
| `static/guide/` | 地陪头像素材（39 张，文件名 = 姓名拼音；**合计 12.56MB，超小程序主包 2MB 上限，上小程序前需压缩**） |
| `api/index.js` | 数据层出口（`USE_MOCK`），页面只允许 import 它 |
| `api/http.js` | HTTP 路由表（对接后端时的对照清单） |
| `docx/database/schema.sql` + `seed.sql` | 表结构 + 初始化数据（7 区域 / 3 套餐 / 20 景点） |
| `scripts/*.mjs` | **7 项零依赖门禁**：资产保真 / 设计令牌 / 表结构 / mock 静态 / 端到端闭环（都带 `--self-test`） |
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
- **报错栈与源码对不上时，先清缓存重启**（已出现过三次"报的错在源码里不存在"）：① 停 dev server → ② `Remove-Item -Recurse -Force node_modules\.vite, dist` → ③ 重启 + 浏览器硬刷新 → ④ 看控制台有没有 `[api] 数据层 <版本>｜数据源 mock｜模块 …` 这一行（`api/index.js` 的 `DATA_LAYER_VERSION` 是版本戳）
- 数据层缺模块时会由 `pickModule()` 直接抛出可操作错误，**不再是** `Cannot read properties of undefined (reading 'xxx')`；看到旧式报错就先按上面的流程排除旧模块
- 分类行的「激活项居中 + 内容横滑切换」统一走 `utils/hscroll.js` 的 `createTabRow()`（`pages/index/index.vue`、`pages/admin/appointment.vue`、`pages/appointment/my.vue`、`pages/guide/list.vue` 已接入）。新页面要接入只需 5 行，**不要**再各写一套居中/手势逻辑；等宽不溢出的页签只传 `index` / `onStep`
- `pages/guide/orders.vue`（三段接单页签）与 `pages/admin/clerk.vue`（审核两页签）尚未接入横滑，属于同类行，按需补
- 横向滚动容器里的 chip / 页签必须写 `flex: none` + `white-space: nowrap`，否则会被压窄成竖排文字
- **新增地陪头像素材时，必须同时登记进 `api/mock/seed.json` 的 `generators.guideAvatarFiles`**（mock 跑在客户端，无法扫描目录；`check-mock.mjs` 会拦住漏登记与改名）
- 改 `static/guide/` 里的图片前先确认包体：小程序主包只有 2MB，当前这 39 张已占 12.56MB
- 不要顺手实现 MVP 之外的功能（写进 `progress.md` 的「未来候选」）
- 不要忘记 docx 归档，否则功能不算 `done`
- 不要自行 commit / tag / push
