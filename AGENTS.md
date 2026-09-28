# AGENTS.md

帮助编码 agent 在这个仓库里可靠工作的最小 harness。项目是 **耍搭（成都地陪）** —— uni-app + Vue3 的成都景点地陪预约小程序，由原有「陪玩小程序」在本仓库内原地重构而来。

## 当前阶段（先读这一段）

| 阶段 | 内容 | 状态 |
|---|---|---|
| 阶段 0 | 保留原有「陪玩小程序」全部资产 | 完成（资产台账 + git 快照 + 保真门禁） |
| 阶段 1 | 重构为成都景点地陪小程序（MVP 七页 + 三端闭环 + mock 数据层 + 数据库定稿） | 完成（feat-001 ~ feat-015） |
| 阶段 2 | 视觉改版定稿 **「气泡漫游」** 全端落地 | 完成（feat-016，提交 `bb3d0ab`） |
| 阶段 3 | 联调与验收（真机走查 / 微信端 / 真实构建 / 后端对接） | **进行中 —— 现在在这里** |

阶段 3 **没有待开发功能**：不要再新增页面或功能，先做验收与门禁收尾（见 `progress.md` 的「下一步」）。要加 MVP 之外的东西，写进 `progress.md` 的「未来候选」。

### 门禁现状（2026-09-28 实测，不要凭印象）

| 门禁 | 状态 |
|---|---|
| `verify-assets` | 通过（22 条资产哈希一致；`pages.json` 11 个页面 + 5 个 tabBar 页与 8 张图标齐全） |
| `check-tokens` | 通过（`uni.scss` 120 变量 / 15 处引用 / `DESIGN.md` 13 色值全对齐） |
| `check-motion` | 通过（9 时长令牌 + `MOTION` 5 项一致 + 3 keyframes；**页面与公共组件** 12 个文件 0 违规） |
| `check-schema` / `check-mock` | 通过（10 表 109 字段 / 52 用户 50 地陪 20 景点 16 订单） |
| `smoke-flow` | 通过 **50/50** |

feat-016 遗留的「16 条被改资产未登记」已于 2026-09-28 收尾（补 `note` 原因 → `node scripts/verify-assets.mjs --update` → 复跑）。**新增改动仍按铁律先登记原因再刷新哈希**；`--update` 只刷哈希、不解释理由，直接跑等于掩盖误改。

## 启动工作流

写代码前按顺序做：

1. 确认工作目录为仓库根目录
2. 阅读本文件
3. 阅读业务范围：`docs/MVP 范围：只做 3 件事.md`（人读）+ `docs/mvp-scope.json`（机读：20 景点 / 7 类区域 / 3 套餐 / 4 态订单 / 7 页面 / 9 处修订见 `deviations`）
4. 阅读视觉规范：`DESIGN.md`（定稿主题「气泡漫游」）+ `uni.scss`（`$ds-*` 令牌）
5. 运行 `./init.ps1`（Windows PowerShell）或 `bash init.sh`，确认基线为绿（第 1-7 步；第 8 步构建在本仓库按已知原因跳过）
6. 阅读 `feature_list.json`，只看当前一个功能
7. 涉及改动范围与复用策略时，查 `docs/legacy-assets.md`
8. `git log --oneline -5` 了解最近改动

基线校验不通过时，先修复，再谈新功能。

## 铁律（不变量）

- **不许丢原有资产**：`docs/legacy-assets.json` 中登记的 22 个文件是重构基础。删除或移动会让 `node scripts/verify-assets.mjs` 失败。
- **要改就必须登记**：确需改动某资产时，先改 `docs/legacy-assets.json` 的 `reuse` / `note` 说明理由，确认后再运行 `node scripts/verify-assets.mjs --update` 刷新哈希。禁止用 `--update` 掩盖无意的误改。
- **视觉只有两个来源，必须同步改**：`DESIGN.md`（文字口径）+ `uni.scss`（`$ds-*` 落地令牌）；原型侧对照 `design/redesign/`（`tokens.css` / `style.css` / `index.html` 七屏）。改颜色、字号、圆角、时长必须两处一起改，由 `check-tokens.mjs` / `check-motion.mjs` 把关。
- **动效只服务状态变化**：规格在 `DESIGN.md` §13。时长只有 150ms（按压 / 颜色）与 200ms（指示器 / 较大表面）+ 900ms 加载指示器；**不做入场编排、不做列表逐项 stagger、不做页面转场**（见下）。
- **一次只做一个功能**：从 `feature_list.json` 精确挑一个，其余不动，不做顺手的额外重构。
- **没有验证证据不算完成**：必须运行验证命令并把输出写进 `feature_list.json` 的 `evidence`。
- **不加依赖、不加构建链**，除非该功能明确要求（当前项目只有 vite + uni 插件 + sass）。
- **不要自行 git commit / tag / push**，除非用户明确要求。
- **`init.ps1` 保持 UTF-8 BOM 编码**（Windows PowerShell 5.1 需要 BOM 才能解析中文；无 BOM 会导致脚本语法错误）。若在 Git Bash / macOS / Linux 上工作，用 `bash init.sh`。
- 保持仓库随时可跑 `./init.ps1`。

## 目标形态（阶段 1 已完成，按 MVP 严格收口）

**只做 3 件事**：游客能下单 / 地陪能接单 / 平台能确认订单。

闭环：`游客选景点 → 选能带该景点的地陪 → 选套餐与日期 → 提交预约 → 地陪接单 → 平台确认 → 地陪完成服务`

MVP 规模上限（超出即越界）：

- 景点 20 个（见 `docs/mvp-scope.json` 与 `docx/database/seed.sql`）；**首页是景点列表页**
- 区域标签 **7 类**（后台可维护的字典表 `region_types`）：市区经典线 / 熊猫·文创线 / 周边一日游 / 川西古镇线 / 山野度假线 / 都市夜游线 / 亲子研学线
- 定价 3 个 SKU：市区半日陪游 200-400 元、市区全天陪游 500-800 元、熊猫基地/都江堰专项陪游 150-300 元/小时；门票餐饮交通不含
- 预约类型 3 种：半天（上午/下午）、全天（1 天）、小时加购（1 小时）——超时不自动计费
- 订单 4 态：待确认 / 已确认 / 已完成 / 已取消
- 页面 7 个（`pages.json` 共注册 **11** 个：7 个 MVP 页 + 登录 + 协议 + 我的 + 地陪审核；其中 **5 个登记为 tabBar 页** —— 首页 / 接单 / 订单管理 / 地陪审核 / 我的，底部栏按角色显示 2-3 项）
- 角色 3 种：游客 / 地陪 / 管理员（地陪身份 MVP 由 mock 预置）

MVP 明确不做：IM、实时定位、分销代理、团购、广场发单、等级体系、自动结算、多城市、优惠券、动态定价、行程日志、轨迹回放、门店管理、复杂排班、加价规则、**评价（展示与提交都不做）**、地陪申请开通流程（后续升级）、投诉。

`docs/mvp-scope.json` 的 `deviations` 记录 9 处经用户拍板的修订，以该文件为准。

平台与数据层四个不变式：

- 微信小程序为主，H5 保持可调试；`manifest.json` 的 `mp-weixin.appid` 已填 `wx297713513aa45aca`（工作区未提交），小程序名称「耍搭」
- **MVP 全部走 mock**（`api/index.js` 的 `USE_MOCK = true`）；后续对接真实后端 HTTP 时，只切换数据层实现，页面代码不动
- 因此每个 Api 方法签名必须与未来的 HTTP 实现一一对应；页面里不要直连数据库、不要写死 mock 数据
- **数据库不使用外键约束**：表间只用 id 关联 + 索引，完整性由应用层保证；`scripts/check-schema.mjs` 会拦截任何 `FOREIGN KEY`
- **mock 规模**（见 `docs/mvp-scope.json` 的 `mockScale`）：7 区域 / **20 景点** / 3 套餐 / **50 地陪** / 52 用户 / 16 订单；字典与基础数据以 `docx/database/seed.sql` 为准，mock 不得自造不一致的区域或景点

## 视觉与动效口径（阶段 2 定稿，别再走回头路）

**主题「气泡漫游」**（`DESIGN.md`）：

- 三色：雾紫 `#8f7fe0`（`$ds-primary`，只做可点/选中）、藕粉 `#e58fa6`（待确认、警示数）、薄荷 `#7fc4ae`（已确认 / 完成）；深紫 `#7b6bd0`（`$ds-tertiary`）**只给价格与关键数字**
- 按钮与选中态**一律纯色胶囊**：主按钮纯黑 `#17141f`；页签 / chip / 日期 / 单选选中态也是纯黑胶囊（**不再用下划线指示器**）
- 卡片靠玻璃拟态（半透明白 + 阴影 + 1px 白内环）分层，**不描边**；页底是奶油白 `#fdfcfa`；每屏一组背景光斑（七档，`$ds-bg-*`）
- 禁用：渐变按钮、紫蓝 AI 渐变、弹性超调动效、网络字体、自绘插画、给卡片描边

**动效**（`DESIGN.md` §13 ↔ `uni.scss` §1.10 ↔ `utils/motion.js` 的 `MOTION` 三者同步）：

| 场景 | 时长 | 备注 |
|---|---|---|
| 按压反馈 | 150ms | `hover-class="is-pressed"` + `hover-stay-time="70"`；只 `scale`，不用 opacity 变暗 |
| 颜色 / 背景 / 边框状态切换 | 150ms | chip、单选、日期、开关、搜索条 |
| 指示器 / 分段滑块 | 200ms | 只动 `transform`（`translateX` 百分比） |
| 较大表面（卡片 / 面板） | 200ms | |
| 加载指示器 | 900ms | `linear`，唯一的例外 |

- **属性白名单**：`transform` / `opacity` / `color` / `background-color` / `border-color` / `box-shadow`。不动 layout（`width` / `left` / `top` …），不写 `transition: all`。
- **页面切换瞬时**：小程序（含微信）本来就是原生转场，**什么都不要加**；H5 手写淡入淡出会透出下层页面，已于阶段 2 **删除**（`utils/motion.js` 里不再有页面转场函数，页面也不再引用它）。
- **列表内容替换不做入场动画**：方向性位移在整页滚动容器里会横向溢出触发滚动条；切分类时改为滚动复位到顶部。
- 数字不动画（金额 / 统计 / 步进器）；滚动不加动效；Toast / Modal / picker / 下拉刷新用平台自带。
- `prefers-reduced-motion: reduce` 时去掉位移与回弹、保留淡入（规则在 `App.vue` 全局样式末尾）。

## 导航与角色（feat-017 定稿）

- **底部栏按角色变化**：游客「首页 · 我的」/ 地陪「接单 · 我的」/ 管理员「订单管理 · 地陪审核 · 我的」；唯一来源 `utils/tabbar.js`
- **原生 tabBar 编译期静态、无法按角色增删**（`setTabBarItem` 只能改文案与图标）：`pages.json` 把 5 个页面都登记为 tabBar 页（`switchTab` 才可用），运行时用 `uni.hideTabBar` 隐藏原生栏，显示层由 `components/ds-tabbar` 自绘
- **tab 页之间一律 `switchTab`**（成为 tabBar 页后 `navigateTo` 会失败）；三个工作台页（接单 / 订单管理 / 地陪审核）是 tab 页，**不放返回键**
- 页面接入方式：根节点内容末尾放 `<ds-tabbar />`，高度占位（`$ds-h-tabbar` = 78px）由组件自带，**不要**各页写 `padding-bottom`
- **角色兜底只有一处**（`ds-tabbar` 的 `guard()`）：当前页不属于当前角色时收敛到该角色第一屏 —— 登录后落首页、切换身份后都靠它，不要各页再写一套
- 改了底部栏配色令牌要重跑 `node scripts/gen-tabbar-icons.mjs`（4 个形状 `home` / `orders` / `clerk` / `mine` 共 8 张）

## 必需产物

- `feature_list.json` — 功能状态唯一事实来源
- `progress.md` — 会话连续性日志
- `docs/legacy-assets.md` / `docs/legacy-assets.json` — 原有资产清单与保真门禁数据
- `DESIGN.md` + `uni.scss` — 视觉规范与落地令牌（定稿主题「气泡漫游」，两者必须同步改；`design/redesign/` 是原型侧对照）
- `utils/motion.js` — 动效时长的 JS 镜像（供 `check-motion.mjs` 与 SCSS 令牌逐项比对；**当前无页面引用**，不要拿它做页面编排）
- `utils/hscroll.js` — 分类行行为包（激活项居中 + 横滑切换），页面不要各写一套
- `utils/tabbar.js` — 角色化底部栏配置（角色 → 底部栏项 / 首页路径 / 图标地址的唯一来源）
- `components/ds-tabbar/ds-tabbar.vue` — 自绘底部栏（按角色换项 + 角色兜底）；页面在根节点**内容末尾**放一个 `<ds-tabbar />` 即可，高度占位由组件自带
- `docx/database/schema.sql` + `docx/database/数据库设计.md` — 数据库表结构唯一事实来源
- `docx/` — 设计实现文档与 Bug 修复文档归档（见下节）
- `session-handoff.md` — 跨会话交接
- `init.ps1` / `init.sh` — 标准启动与验证入口

## 文档归档（docx/）

**代码设计实现文档**——每个功能标记 `done` 前必须产出：

- 路径：`docx/codeimpl-sum/设计文档-feat-XXX-功能名.md`（`docx/` 下已有 `codeimpl-sum/`、`bugfix/`、`database/` 三个归档目录，按类别放入，不要平铺到 `docx/` 根）
- 必备章节：目标与范围、涉及的接口（对照 `docx/接口文档.md`）、文件结构与关键实现、状态与数据流、验证证据、遗留问题

**Bug 修复文档**——每修一个 bug 必须产出：

- 路径：`docx/bugfix/BUG修复-YYYYMMDD-简述.md`
- 必备章节：现象、复现步骤、根因、修复方案、改动文件、回归验证结果

归档文档写入后需在 `progress.md` 的"本次会话修改的文件"中列出。

## 项目内技能（动手前先读）

仓库内 `.codebuddy/skills/` 提供项目约定，做对应工作前**必须先读**：

| 技能 | 路径 | 用于 |
|---|---|---|
| `api-design` | `.codebuddy/skills/api-design/SKILL.md` | RESTful 约定：资源名词、`/api/v1`、camelCase 字段、统一错误体、分页 |
| `database-design` | `.codebuddy/skills/database-design/SKILL.md` | 表名复数小写下划线、`pk_/uk_/idx_/fk_` 索引命名、金额 `DECIMAL`、标准字段 |
| `uniapp` | `.codebuddy/skills/uniapp/` | uni-app 页面与组件写法 |

## 验证命令

```powershell
# 完整验证（推荐，Windows，共 8 步）
./init.ps1

# 单项校验（都零依赖、秒级）
node scripts/verify-assets.mjs   # 资产保真 + 路由一致性
node scripts/check-tokens.mjs    # 设计令牌（SCSS 顺序 / CSS 变量 / 色值对齐）
node scripts/check-motion.mjs    # 动效（属性白名单 / 时长预算 / keyframes / 降级 / MOTION↔令牌）
node scripts/check-schema.mjs    # 数据库表结构（命名 / 必备列 / 金额类型 / MVP 边界）
node scripts/check-mock.mjs      # mock 数据层（规模 / 确定性 / 自洽 / MVP 边界 / 头像素材）
node scripts/smoke-flow.mjs      # 端到端闭环（真实运行 mock：下单→接单→确认→完成 + 负向用例）

# 自检（证明门禁非空，改动校验脚本后跑一次）
node scripts/check-tokens.mjs --self-test
node scripts/check-motion.mjs --self-test
node scripts/check-schema.mjs --self-test
node scripts/smoke-flow.mjs --self-test

# tabBar 图标（改了 uni.scss 令牌后重跑生成；平时用 --check 校验）
node scripts/gen-tabbar-icons.mjs
node scripts/gen-tabbar-icons.mjs --check

# 小程序产物构建（本仓库跑不通，见下）
npm run build:mp-weixin
```

> 除 `smoke-flow.mjs` 外都是**静态**校验（读文件 / 比对哈希 / 正则解析）。`scripts/smoke-flow.mjs` 是唯一的**动态**校验：
> 它把 `api/` 复制到临时目录（临时目录声明 `type: module`，node 才能直接 import 项目里的 ESM 源码），
> 然后真实跑一遍三端闭环。**新增或修改数据层逻辑后，除了静态门禁，必须跑它。**

> **真实构建走 HBuilderX**：`npm run build:mp-weixin` 在本仓库跑不通（`@dcloudio/uni-cli` 期望源码在 `src/`，本仓库是 HBuilderX 根目录布局），`./init.ps1` 第 8 步因此长期只能跳过。

### 改了代码但页面没生效？（旧构建 / 旧模块缓存）

本项目已**四次**出现「报错栈与源码对不上」，全都是运行在旧模块 / 旧缓存的产物上。看到下面两类现象时**先按这套流程排除**，再判断是不是真 bug：

| 现象 | 真凶 |
|---|---|
| 页面报 `Cannot read properties of undefined` / 报错行号在源码里对不上 | `api/mock/index.js` 的仓库是**模块级缓存**（`getDb()` 只算一次）或旧的 Vite 模块图 |
| **`[sass] Undefined variable $ds-xxx`，而这个变量明明在 `uni.scss` 里有** | `uni.scss` 是通过 Vite 的 `additionalData` 注入的，注入内容被缓存了：`App.vue` 变了会重新编译，但注入的 `uni.scss` 还是服务启动时那一份 |

排除步骤：

1. 停掉 dev server（Ctrl+C / HBuilderX 点「停止运行」）—— 不停进程换不干净
2. 删缓存与产物（按你用的工具选一行）：
   ```powershell
   # HBuilderX（本项目常用）
   Remove-Item -Recurse -Force unpackage\dist\cache, unpackage\dist\dev -ErrorAction SilentlyContinue
   # CLI
   Remove-Item -Recurse -Force node_modules\.vite, dist -ErrorAction SilentlyContinue
   ```
3. 重启（HBuilderX 重新运行 / `npm run dev:h5`），浏览器**硬刷新**（Ctrl+Shift+R）
4. 看控制台：出现 `[api] 数据层 <版本>｜数据源 mock｜模块 RegionApi / … / UserApi` 才算加载到新代码

**想快速证明 SCSS 本身没问题**（而不是猜）：用 HBuilderX 自带的 dart-sass 直接把「`uni.scss` + 某个文件的样式」拼起来编译一次，能过就说明是缓存问题。

数据层的版本戳在 `api/index.js` 的 `DATA_LAYER_VERSION`；缺模块时 `pickModule()` 会直接抛可操作的错误，不再是一句 `Cannot read properties of undefined`。

## 完成定义

一个功能只有在全部满足时才算完成：

- [ ] 目标行为已实现
- [ ] `node scripts/verify-assets.mjs` 通过（改动在册资产时：先登记 note → `--update` → 复跑）
- [ ] 涉及样式改动时 `node scripts/check-tokens.mjs` 通过；涉及数据模型时 `node scripts/check-schema.mjs` 通过
- [ ] 涉及动效改动时 `node scripts/check-motion.mjs` 通过（属性白名单 / 时长预算 / keyframes / 降低动效 / `MOTION` ↔ 令牌）
- [ ] 视觉改动同时落了 `DESIGN.md` 与 `uni.scss`（两者不一致时另跑 `node scripts/gen-tabbar-icons.mjs --check`）
- [ ] 涉及数据层 / 状态流转时 `node scripts/smoke-flow.mjs` 通过（端到端闭环 + 负向用例）
- [ ] 设计实现文档已归档到 `docx/codeimpl-sum/设计文档-feat-XXX-功能名.md`（六章节齐全）
- [ ] 涉及的 Bug 已归档到 `docx/bugfix/BUG修复-YYYYMMDD-简述.md`
- [ ] 证据已写入 `feature_list.json` / `progress.md`，且新归档文档已列入 `progress.md` 的「本次会话修改的文件」
- [ ] 下一会话能直接跑起 `./init.ps1`

## 范围边界

- **超出 MVP 的想法**：不实现，写进 `progress.md` 的「未来候选」
- **业务事实**（景点名单、定价、区域划分、地陪来源）：以 `docs/mvp-scope.json` 为准；文档里没有的必须问用户，不要编造
- **架构决策**：优先查本文件与 `docs/legacy-assets.md`；仍不清则问用户
- **`docs/mvp-scope.json` 的 `openQuestions`**：涉及这些点的功能必须先确认再动手
- **测试反复失败**：写进 `progress.md` 的阻塞项，停止改动
- **范围模糊**：回到 `feature_list.json` 里该功能的依赖与完成标准

## 结束会话

1. 更新 `progress.md`（当前状态 / 阻塞 / 下一步）
2. 更新 `feature_list.json` 状态与证据
3. 在 `session-handoff.md` 留下下一会话的起点
4. 报告用户：改了什么、验证结果、还剩什么
