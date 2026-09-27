# 会话交接

## 交接时间

2026-09-27（**MVP 全量 + 视觉改版「气泡漫游」全部落地；当前处于阶段 3「联调与验收」，只剩收尾与人工走查**）

## 项目一句话

**耍搭（成都地陪）** —— uni-app + Vue3 的成都景点地陪预约小程序，由原有「陪玩小程序」在本仓库内原地重构而来。MVP 的 3 件事：游客下单 / 地陪接单 / 平台确认订单。

## 这次会话做了什么

1. **恢复被历史提交删掉的开发文档**：从 `1eb122e`（chore: 精简为可运行项目）的父提交 `2928dd4` 恢复了 `AGENTS.md`、`init.sh` / `init.ps1`、`docs/`（3 份）、`docx/`（31 份）、`scripts/`（6 份门禁）、`feature_list.json`、`progress.md`、`session-handoff.md`。刻意保留为新版、未被旧版覆盖的 3 个文件：`scripts/gen-tabbar-icons.mjs`（`bb3d0ab` 重写版）、`docs/legacy-assets.json`（磁盘版 2 处 `sha256` 与旧版不同且与当前代码一致）、`docx/bugfix/BUG修复-20260927-微信端报…appid未配置.md`（该提交之后新增）。
2. **按真实项目与所处阶段同步 harness**：
   - `AGENTS.md` 阶段表改「阶段 0 资产冻结 → 阶段 1 地陪 MVP → 阶段 2 视觉改版『气泡漫游』→ **阶段 3 联调与验收（进行中）**」，新增「门禁现状（实测）」表，并明确「阶段 3 没有待开发功能」。
   - 视觉口径整段重写为「气泡漫游」；动效口径重写为「只服务状态变化」（150 / 200ms）+ 属性白名单含 `box-shadow` + 页面切换瞬时。
   - `feature_list.json` 新增 **feat-016**（视觉改版全端落地，`done` + 证据），feat-015 标 `supersededBy: feat-016`；`prototypeSource` 改 `design/redesign/index.html`；修订条数由 6 改为 **9**。
   - `scripts/check-motion.mjs`：`TRANSITION_PROPS` 补 `box-shadow`（对齐 `DESIGN.md` §13.2），头部注释口径同步（§1.8 → §1.10、≤300ms → ≤400ms 等）→ **动效门禁由红转绿**。
3. **未做**（等用户确认）：`docs/legacy-assets.json` 的 16 条登记与 `--update` 刷新 —— 这是当前唯一让 `./init.ps1` 变红的原因。

## 门禁现状（2026-09-27 实测）

| 门禁 | 状态 |
|---|---|
| `check-tokens` | ✅ 120 变量 / 15 引用 / DESIGN.md 13 色值全对齐 |
| `check-motion` | ✅ 9 个时长令牌 + `MOTION` 5 项一致 + 3 个 keyframes；`--self-test` 12 类全检出 |
| `check-schema` | ✅ 10 表 / 109 字段 / 无外键 |
| `check-mock` | ✅ 52 用户 / 50 地陪 / 20 景点 / 7 区域 / 3 套餐 / 16 订单 |
| `smoke-flow` | ✅ **50/50** |
| **`verify-assets`** | ❌ **16 条资产被改但未登记原因、未刷新哈希** |

## 下一会话从这里开始

**第一件事（唯一阻塞项）：收尾资产保真门禁**

1. 打开 `docs/legacy-assets.json`，给这 16 条资产的 `note` 补登记原因（模板：`2026-09-27 feat-016 视觉改版「气泡漫游」：<该文件改了什么>`）：
   `App.vue`、`manifest.json`、`pages.json`、`uni.scss`、`README.md`、`pages/login/login.vue`、`pages/index/index.vue`、`pages/clerk/detail.vue`、`pages/appointment/my.vue`、`pages/tabbar/mine.vue`、`pages/admin/clerk.vue`、`pages/admin/appointment.vue`、`static/tabbar/{home,home-active,mine,mine-active}.png`
2. `node scripts/verify-assets.mjs --update` → `./init.ps1` 复跑，确认 **8 步全绿**。
3. 顺序不能反：**先登记原因再 `--update`**（`--update` 只刷哈希，不解释理由；直接跑就等于掩盖改动）。

**第二件事：读三份事实来源**

- 范围：`docs/mvp-scope.json`（9 条 `deviations`）
- 视觉：`DESIGN.md`（主题「气泡漫游」，§13 是动效，§12 是小程序落地注意）+ `uni.scss` 的 `$ds-*`
- 接口：`docx/接口文档.md`

**第三件事：人工走查（唯一没做过的验证维度）**

0. 先开 HBuilderX 跑起来（`npm run build:mp-weixin` 在本仓库跑不通，CLI 期望 `src/` 布局）；跑之前删 `unpackage\dist\cache` 与 `unpackage\dist\dev`（`uni.scss` 注入内容会被缓存，不清会报假的 `Undefined variable $ds-*`）。
1. 走一遍三端闭环：游客下单 → 地陪接单 → 平台确认 → 地陪完成（「我的」页底部有**演示身份切换**）。
2. 重点看「气泡漫游」的观感：
   - **玻璃卡片在两端的分层**：H5 有 `backdrop-filter`，小程序只有半透明白底 + 阴影 + 白内环 —— 是否仍然「立」得起来（`DESIGN.md` §12 认可这个降级）
   - **七档背景光斑**是否过浓 / 与内容打架（雾紫透明度 ≤ 0.44）
   - **黑胶囊选中态**：页签 / chip / 日期 / 单选是否一眼看得出选中（不再有下划线指示器）
   - **按压反馈**：随手点各处是否有反馈且松手立即回弹（`hover-stay-time="70"`）
   - **分段控件白色滑块**（接单 / 下单）是否滑过去
   - 图片兜底（断网时露容器底色）、下拉刷新、弹窗确认、底部操作栏是否贴底
3. **确认页面切换是瞬时的**：小程序端应为原生滑动且**没有双重动画**；H5 端不该再有淡入淡出（feat-016 已删除手写转场）。
4. 微信端：`manifest.json` 的 `mp-weixin.appid` 已填 `wx297713513aa45aca`（**工作区未提交**），确认 `uni.login()` 能拿到 code。
5. 发现问题 → 按规则产出 `docx/bugfix/BUG修复-YYYYMMDD-简述.md`，并登记到 `progress.md` 的「本次会话修改的文件」。

**第四件事：真实构建** → 走 HBuilderX（`./init.ps1 -Full` 的第 8 步在本仓库长期跳过）。

## 用户已拍板的决策（冲突时以此为准）

| 编号 | 决策 | 落点 |
|---|---|---|
| dev-001 | 先选景点，再选地陪 | 首页 = 景点列表页 |
| dev-002 | 评价不要了 | 卡片与详情页无评分/评价，`check-mock.mjs` 拦截评价字段 |
| dev-003 | 地陪申请开通，先不做 | 进 `futureUpgrades`，MVP 地陪由 mock 预置 50 个 |
| dev-004 | 先 mock，后续对接真实后端 HTTP | `USE_MOCK = true`，路由表见 `api/http.js` |
| dev-005 | 定稿主题并重写 `DESIGN.md` | **现主题为「气泡漫游」**（feat-016 第二次重写，`DESIGN.md` + `uni.scss`） |
| dev-006 | 图片用后端返回 URL，不要自绘 SVG | 图片一律走 `coverUrl` / `avatarUrl` + 容器底色兜底 |
| dev-007 | 区域做成后台可维护的字典表 | `region_types`（7 类）；管理界面不纳入实现计划 |
| dev-008 | 景点池扩到 20 个 | `seed.sql` 20 条，7 类区域均有景点 |
| dev-009 | 地陪头像用本地素材 | `static/guide/` 39 张，`seed.json` 的 `guideAvatarFiles` 必须同步登记 |

## 硬边界速查

- 3 件事：游客下单 / 地陪接单 / 平台确认；**11 个注册页面**（7 个 MVP 页面 + 登录 + 协议 + 我的 + 地陪审核）
- 流程：**景点 → 地陪 → 详情（选套餐 + 日期）→ 下单页 → 我的订单**
- 20 景点 / 7 类区域 / 3 个套餐 SKU / 3 种预约类型 / 4 态订单 / 3 种角色
- 数据：全部 mock（`api/index.js` 的 `USE_MOCK = true`），页面**禁止**直连 `api/mock/`
- 视觉：雾紫 `#8f7fe0` 只做可点/选中，深紫 `#7b6bd0`（`$ds-tertiary`）只给价格，页底奶油白 `#fdfcfa`；按钮与选中态一律**纯黑胶囊**；卡片是**玻璃片不描边**；页面一律用 `$ds-*`
- 动效：只服务状态变化 —— 按压/颜色 150ms、指示器/较大表面 200ms、加载 900ms；白名单 `transform` / `opacity` / 颜色类 / `box-shadow`；**不做入场编排、不做页面转场**
- 语义唯一来源：`api/constants.js`（四态 / 流转白名单 / 预约类型 / 时段 / 价格单位）
- **静态门禁证明「结构对」，`smoke-flow.mjs` 证明「跑得通」** —— 动数据层必须跑后者
- 不做：IM、定位、分销、团购、广场、等级、自动结算、多城市、优惠券、动态定价、行程日志、轨迹、门店、复杂排班、加价规则、评价、地陪申请流程、投诉

## 关键文件索引

| 文件 | 作用 |
|---|---|
| `docs/mvp-scope.json` | **范围唯一事实来源**（9 条 deviations + mockScale + imageStrategy） |
| `DESIGN.md` / `uni.scss` | **视觉唯一事实来源**（气泡漫游 + `$ds-*` 令牌，必须同步改；动效规范 DESIGN.md §13 / 令牌 uni.scss §1.10） |
| `design/redesign/` | 七屏原型与 `tokens.css`（**视觉基准**；`design/html/`、`design/prototypes/` 仅历史存档） |
| `docx/接口文档.md` | **接口对照基准**（模块 × 方法 × 路由 × 错误约定） |
| `api/constants.js` | 领域常量唯一来源（四态、流转白名单、预约类型、订单号规则） |
| `api/index.js` | 数据层出口（`USE_MOCK`），页面只允许 import 它 |
| `api/mock/seed.json` | mock 素材池与规模（姓名池 / 拼音表 / 地陪头像素材池 `guideAvatarFiles` 39 条） |
| `static/guide/` | 地陪头像素材（39 张；**合计 12.56MB，超小程序主包 2MB 上限，上小程序前需压缩**） |
| `docx/database/schema.sql` + `seed.sql` | 表结构 + 初始化数据（7 区域 / 3 套餐 / 20 景点） |
| `scripts/*.mjs` | **6 项零依赖门禁**：资产保真 / 设计令牌 / 动效 / 表结构 / mock 静态 / 端到端闭环（都带 `--self-test`） |
| `scripts/gen-tabbar-icons.mjs` | tabBar 图标生成器（颜色读 `uni.scss` 令牌；`--check` 校验） |
| `utils/motion.js` | 动效时长的 JS 镜像（**页面已不引用**，只供门禁比对） |
| `utils/hscroll.js` | 分类行行为包（激活项居中 + 横滑切换），页面不要各写一套 |
| `AGENTS.md` | 工作规则、硬边界、docx 归档规则、验证命令、完成定义 |
| `feature_list.json` | 功能状态与证据（`feat-001` ~ `feat-016` 全部 done） |
| `init.ps1` / `init.sh` | 标准验证入口（8 步） |

## 不要做的事

- 不要删改台账里的 22 个资产；确需删除必须登记到 `removedAssets` 并写原因
- 不要无脑 `--update`（先登记 `note` 再刷新，否则等于掩盖改动）
- 不要用自绘 SVG/插画替代真实图片；图片一律走后端 URL 字段 + 容器底色兜底
- **不要手工替换 `static/tabbar/*.png`**：由 `scripts/gen-tabbar-icons.mjs` 生成、颜色取自令牌；改了 `uni.scss` 就重跑
- 不要在页面里再写一份状态 / 时段 / 价格单位映射表（唯一来源是 `api/constants.js`）
- **不要拿 URL 参数直接与接口 id 做 `===`**：`onLoad(options)` 取到的永远是字符串，接口返回的是数字；先归一化（参考 `pages/order/create.vue` 的 `toId()`）
- 不要在页面里直连 `api/mock/`（`check-mock.mjs` 会把关）
- 不要绕过 `smoke-flow.mjs`：它抓到的 bug 都通过了其它所有门禁
- **不要给页面加转场动画、不要写列表入场/ stagger**：feat-016 已明确删除；`utils/motion.js` 只是时长镜像，不要拿它做编排
- 不要给玻璃卡片补 `backdrop-filter` 的条件编译：小程序端退化是认可的行为（`DESIGN.md` §12）
- 不要给正在读的数字加动效（金额 / 统计 / 步进器）
- **报错栈与源码对不上时，先清缓存重启**（已出现过多次，含 `[sass] Undefined variable $ds-*`）：① 停运行 → ② 删 `unpackage\dist\cache` 与 `unpackage\dist\dev` → ③ 重启 + 浏览器硬刷新 → ④ 看控制台有没有 `[api] 数据层 <版本>｜…` 这一行
- 横向滚动容器里的 chip / 页签必须写 `flex: none` + `white-space: nowrap`，否则会被压窄成竖排文字
- 新增地陪头像素材时必须同时登记进 `api/mock/seed.json` 的 `generators.guideAvatarFiles`（mock 跑在客户端扫不了目录；`check-mock.mjs` 会拦）
- 不要顺手实现 MVP 之外的功能（写进 `progress.md` 的「未来候选」）
- 不要忘记 docx 归档，否则功能不算 `done`
- 不要自行 commit / tag / push
