# AGENTS.md

帮助编码 agent 在这个仓库里可靠工作的最小 harness。当前项目是 uni-app + Vue3 的「陪玩小程序」，**即将在本仓库内原地重构为成都景点地陪小程序**。

## 当前阶段（先读这一段）

| 阶段 | 内容 | 状态 |
|---|---|---|
| 阶段 0 | 保留原有「陪玩小程序」全部资产 | 已完成（资产清单 + git 快照 + 保真校验门禁） |
| 阶段 1 | 重构为「成都地区景点地陪小程序」 | 未开始，见 `feature_list.json` |

**阶段 0 的产物就是不可破坏的前提**：原有页面、数据封装、设计规范都能直接变成地陪业务的骨架，不要推倒重写。

## 启动工作流

写代码前按顺序做：

1. 确认工作目录为仓库根目录
2. 阅读本文件
3. 阅读业务范围：`docs/MVP 范围：只做 3 件事.md`（人读）+ `docs/mvp-scope.json`（机读：10 景点 / 3 区域 / 3 套餐 / 4 态订单 / 7 页面 / 4 处修订见 `deviations`）
4. 运行 `./init.ps1`（Windows PowerShell）或 `bash init.sh`（Git Bash），确认基线为绿
5. 阅读 `feature_list.json`，只看当前一个功能
6. 涉及改动范围与复用策略时，查 `docs/legacy-assets.md`
7. `git log --oneline -5` 了解最近改动

基线校验不通过时，先修复，再谈新功能。

## 铁律（不变量）

- **不许丢原有资产**：`docs/legacy-assets.json` 中登记的 23 个文件是重构基础。删除或移动会让 `node scripts/verify-assets.mjs` 失败。
- **要改就必须登记**：确需改动某资产时，先改 `docs/legacy-assets.json` 的 `reuse` / `note` 说明理由，确认后再运行 `node scripts/verify-assets.mjs --update` 刷新哈希。禁止用 `--update` 掩盖无意的误改。
- **一次只做一个功能**：从 `feature_list.json` 精确挑一个，其余不动，不做顺手的额外重构。
- **没有验证证据不算完成**：必须运行验证命令并把输出写进 `feature_list.json` 的 `evidence`。
- **不加依赖、不加构建链**，除非该功能明确要求（当前项目只有 vite + uni 插件 + sass）。
- **不要自行 git commit / tag / push**，除非用户明确要求。
- **`init.ps1` 保持 UTF-8 BOM 编码**（Windows PowerShell 5.1 需要 BOM 才能解析中文；无 BOM 会导致脚本语法错误）。若在 Git Bash / macOS / Linux 上工作，用 `bash init.sh`。
- 保持仓库随时可跑 `./init.ps1`。

## 目标形态（阶段 1：严格按 MVP）

**只做 3 件事**：游客能下单 / 地陪能接单 / 平台能确认订单。

闭环：`游客选景点 → 选能带该景点的地陪 → 选半天或全天 → 提交预约 → 地陪接单 → 平台确认 → 完成`

MVP 规模上限（超出即越界）：

- 景点 20 个（见 `docs/mvp-scope.json` 与 `docx/database/seed.sql`）；**首页是景点列表页**，游客先选景点，再选该景点下的地陪
- 区域标签 **7 类**（后台可维护的字典表 `region_types`，初始数据见 `docx/database/seed.sql`）：市区经典线 / 熊猫·文创线 / 周边一日游 / 川西古镇线 / 山野度假线 / 都市夜游线 / 亲子研学线。它同时是景点列表的顶部筛选，前台只展示「启用且下有在售景点」的区域
- 定价 3 个 SKU：市区半日陪游 200-400 元、市区全天陪游 500-800 元、熊猫基地/都江堰专项陪游 150-300 元/小时；门票餐饮交通不含
- 预约类型 3 种：半天（上午/下午）、全天（1 天）、小时加购（1 小时）——超时不自动计费，线下协商或后台备注
- 订单 4 态：待确认 / 已确认 / 已完成 / 已取消
- 页面 7 个：景点列表（首页）、地陪列表、地陪详情、下单、订单（游客端）+ 接单（地陪端）+ 后台订单管理（管理端）
- 角色 3 种：游客 / 地陪 / 管理员（地陪身份 MVP 由 mock 预置）

MVP 明确不做：IM、实时定位、分销代理、团购、广场发单、等级体系、自动结算、多城市、优惠券、动态定价、行程日志、轨迹回放、门店管理、复杂排班、加价规则、**评价（展示与提交都不做）**、地陪申请开通流程（后续升级）。

`docs/mvp-scope.json` 的 `deviations` 记录了相对原始 MVP 文档的 4 处修订（景点优先、去评价、地陪申请延后、mock 优先），以该文件为准。

平台与数据层四个不变式：

- 微信小程序为主，H5 保持可调试（登录页已做平台双通道）
- **MVP 全部走 mock**（`api/index.js` 的 `useMock = true`）；后续对接真实后端 HTTP 请求时，只切换数据层实现，页面代码不动
- 因此每个 Api 方法签名必须与未来的 HTTP 实现一一对应；页面里不要直连数据库、不要写死 mock 数据
- **数据库不使用外键约束**：表间只用 id 关联 + 索引，完整性由应用层保证（写入前校验、订单快照冗余、关系表唯一索引、状态流转白名单）；`scripts/check-schema.mjs` 会拦截任何 `FOREIGN KEY`
- **mock 规模**（见 `docs/mvp-scope.json` 的 `mockScale`）：7 区域 / **20 景点** / 3 套餐 / **50 地陪** / 52 用户；字典与基础数据以 `docx/database/seed.sql` 为准，mock 不得自造不一致的区域或景点；地陪 50（5 页）与景点 20（2 页）用于验证分页、筛选与「加载更多」

## 必需产物

- `feature_list.json` — 功能状态唯一事实来源
- `progress.md` — 会话连续性日志
- `docs/legacy-assets.md` / `docs/legacy-assets.json` — 原有资产清单与保真门禁数据
- `DESIGN.md` + `uni.scss` — 视觉规范与落地令牌（定稿主题：宣纸 · 疏，两者必须同步改）
- `docx/database/schema.sql` + `docx/database/数据库设计.md` — 数据库表结构唯一事实来源（改表必须同步文档并跑校验）
- `docx/` — 设计实现文档与 Bug 修复文档归档（见下节）
- `session-handoff.md` — 跨会话交接
- `init.ps1` / `init.sh` — 标准启动与验证入口

## 文档归档（docx/）

**代码设计实现文档**——每个功能标记 `done` 前必须产出：

- 路径：`docx/codeimpl-sum/设计文档-feat-XXX-功能名.md`（`docx/` 下已有 `codeimpl-sum/` 与 `bugfix/` 两个归档目录，按类别放入，不要平铺到 `docx/` 根）
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
# 完整验证（推荐，Windows，共 5 步）
./init.ps1

# 单项校验（都零依赖、秒级）
node scripts/verify-assets.mjs   # 资产保真 + 路由一致性
node scripts/check-tokens.mjs    # 设计令牌（SCSS 顺序 / CSS 变量 / 色值对齐）
node scripts/check-schema.mjs    # 数据库表结构（命名 / 必备列 / 金额类型 / MVP 边界）

# 自检（证明门禁非空，改动校验脚本后跑一次）
node scripts/check-tokens.mjs --self-test
node scripts/check-schema.mjs --self-test

# 小程序产物构建
npm run build:mp-weixin
```

## 完成定义

一个功能只有在全部满足时才算完成：

- [ ] 目标行为已实现
- [ ] `node scripts/verify-assets.mjs` 通过
- [ ] 涉及样式改动时 `node scripts/check-tokens.mjs` 通过；涉及数据模型时 `node scripts/check-schema.mjs` 通过
- [ ] `npm run build:mp-weixin` 通过（或说明为何本次不适用）
- [ ] 设计实现文档已归档到 `docx/codeimpl-sum/设计文档-feat-XXX-功能名.md`（六章节齐全）
- [ ] 涉及的 Bug 已归档到 `docx/bugfix/BUG修复-YYYYMMDD-简述.md`
- [ ] 证据已写入 `feature_list.json` / `progress.md`，且新归档文档已列入 `progress.md` 的「本次会话修改的文件」
- [ ] 下一会话能直接跑起 `./init.ps1`

## 范围边界

- **超出 MVP 的想法**：不实现，写进 `progress.md` 的「未来候选」一节，等 MVP 闭环跑通后再议
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
