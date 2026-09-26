# 会话进度日志

## 当前状态

**最后更新：** 2026-09-26
**当前功能：** 无进行中（feat-001 / feat-002 已完成，feat-003 待开始）
**当前阶段：** 阶段 0「保留原有资产」= 完成；阶段 1「成都景点地陪小程序」= MVP 范围已锁定并修订

## 阶段 1 范围（已锁定，含 4 处修订）

来源：`MVP 范围：只做 3 件事.md` → 机读固化：`docs/mvp-scope.json`（`deviations` 记录全部修订）

- **只做 3 件事**：游客能下单 / 地陪能接单 / 平台能确认订单
- **闭环**：游客选景点 → 选能带该景点的地陪 → 选半天/全天 → 提交预约 → 地陪接单 → 平台确认 → 完成
- **7 个页面**：景点列表（首页）、地陪列表、地陪详情、下单、订单（游客端）+ 接单（地陪端）+ 后台订单管理（管理端）
- **10 景点 / 3 类区域 / 3 个套餐 SKU / 3 种预约类型 / 4 态订单 / 3 种角色**
- **数据策略**：MVP 全部 mock（`useMock = true`），后续切真实后端 HTTP，页面代码不动
- 不做：IM、定位、分销、团购、广场、等级、自动结算、多城市、优惠券、动态定价、行程日志、轨迹、门店、复杂排班、加价规则、**评价**、**地陪申请开通流程**

## 状态概览

### 已完成

- [x] 原有资产盘点与冻结：`git tag legacy-peiwan-baseline-v1` @ `ceca05a`
- [x] 资产清单：`docs/legacy-assets.md`（人读）+ `docs/legacy-assets.json`（23 条含 sha256 + 5 条已知缺口）
- [x] 保真门禁：`scripts/verify-assets.mjs`，接入 `init.ps1` / `init.sh`
- [x] harness 骨架：`AGENTS.md`、`feature_list.json`、`progress.md`、`session-handoff.md`
- [x] 登录页 H5 兼容修复（`pages/login/login.vue`，未提交）
- [x] MVP 范围固化 + 按用户三条决策修订：`docs/mvp-scope.json`（含 `deviations`）、`feature_list.json` 重写为 13 个功能（2 完成 / 11 待办）

### 进行中

- [ ] 无。等待开始 feat-003

### 下一步

1. **feat-003 修复悬空资产引用**（无依赖，建议先做）
   - 补 `/static/images/default-avatar.png`（6 处引用）
   - 新建协议页并注册到 `pages.json`（消掉 gap-002 的告警）
   - 本功能修改 `pages.json`（adapt 档）→ 必须先在 `docs/legacy-assets.json` 写明原因，再 `--update`
   - 完成后告警应由 3 条降为 1 条（仅剩 gap-003，留给 feat-012 移除入口）
2. **feat-004 MVP 数据层**：10 景点 / 3 区域 / 3 套餐 / 3 预约类型 / 4 态订单 / 3 角色，全部 mock，签名对齐未来的 HTTP
3. 依次推进：`feat-005`（4 态）→ `feat-006`（景点列表）→ `feat-007`（地陪列表）→ `feat-008`（详情）→ `feat-009`（下单）→ `feat-010`（订单）→ `feat-011`（接单）→ `feat-012`（后台）→ `feat-013`（换肤与文档）

## 阻塞 / 风险

- [ ] 缺依赖：无 `node_modules`，`npm run build:mp-weixin` 无法执行；`./init.ps1 -Full` 会自动安装（需联网）
- [ ] 无测试框架：验证只能靠 `verify-assets.mjs`（结构级）+ 构建通过 + 人工在 H5/开发者工具跑主流程
- [ ] 订单 3 态 → 4 态是破坏性升级：`api/index.js`、`my.vue`、`admin/appointment.vue` 必须同时改；`statusLabels` / `timeSlots` 映射表现在分散在两个页面，`feat-005` 需收口
- [ ] 页面从 6 增至 7（`dev-001`）：景点优先流程需要景点列表页，与原始 MVP 文档「不做景点列表」冲突，已按用户拍板修订并记录在 `deviations`
- [ ] 静态素材缺口：10 个景点封面、地陪头像均无素材。当前计划统一用占位图，等用户提供素材再替换（见 `openQuestions`）
- [ ] 云开发仍是占位：`App.vue` 的 `peiwan-lite-xxx`、`manifest.json` 的 mp-weixin `appid` 为空；MVP 走 mock，因此暂不影响开发

## 已做出的决策

- **用户 2026-09-26 的三条拍板**（全部写入 `docs/mvp-scope.json` 的 `deviations`）
  - **评价整体不做**（dev-002）：不展示评分/评价数、不提交评价；地陪卡片与详情页去掉相关区块，闭环去掉评价环节
  - **地陪身份走申请开通，但 MVP 不实现**（dev-003）：申请流程移入 `futureUpgrades`；MVP 地陪数据由 mock 预置，角色字段保留 `tourist/guide/admin`
  - **先选景点再选地陪**（dev-001）：首页改造为景点列表页，地陪列表降为第二级（`pages/guide/list?attractionId=xxx`），代价是页面数 6 → 7
  - **数据策略**（dev-004）：MVP 全部 mock，后续对接真实后端 HTTP；Api 方法签名两种实现保持一致，页面不改
- **gap-003 用"移除入口"而不是"新建编辑页"**：MVP 的地陪审核只需通过/拒绝
- **价格用整数「元」，不改造 `utils/index.js` 的 `formatPrice`**（它把入参当分，且当前无任何页面调用；本文件保持 `keep` 档）
- **保留资产的三层方案**：git 标签 + 机读清单 + 保真门禁（不复制 `legacy/` 目录）
- **保真门禁的失败判定范围**：只把「资产缺失/被改」「pages.json 注册页面缺失」判为失败；重构前就存在的缺口作为告警，保证基线可绿

## 未来候选（MVP 之后再说，现在不许实现）

地陪自助申请开通 + 平台审核、评价与评分体系、真实后端 HTTP 对接、IM 聊天、多城市、动态定价、自动结算、团购/分销、广场发单、达人等级、复杂排班、行程日志与轨迹回放、门店管理、景点池扩展（龙泉驿、黄龙溪、青城山、西岭雪山、街子古镇）

## 本次会话修改的文件

- `docs/mvp-scope.json` - 新建并两轮修订：MVP 范围机读固化 + `deviations`（4 处）+ `dataStrategy` + `roles` + `futureUpgrades`
- `feature_list.json` - 重写为 13 个 MVP 功能（feat-001/002 完成，feat-003~013 待办）
- `AGENTS.md` - 目标形态改为 MVP 硬边界（7 页面、景点优先、去评价、mock 优先）；启动工作流加读 MVP 文档；越界处理写入范围边界
- `docs/legacy-assets.md` - 新增「MVP 落地映射」；改造清单加归属功能列；状态机章节改为 3 态→4 态
- `docs/legacy-assets.json` - 6 条资产 note 按 MVP 更新；`my.vue`/`admin/appointment.vue` 由 keep 改 adapt；knownGaps 计划功能改指 feat-003/012/013
- `progress.md` - 本文件
- `session-handoff.md` - 按最新范围重写交接内容

## 完成证据

- [x] 资产保真校验通过：`node scripts/verify-assets.mjs` → `资产保真校验通过。`
- [x] 标准入口通过：`./init.ps1` → 1/3 环境 + 2/3 保真校验通过（3/3 因缺 node_modules 按设计跳过）
- [x] 反向测试：篡改副本资产哈希 → 输出「资产被修改」且退出码 1
- [x] harness 审计：`validate-harness.mjs` 100/100
- [x] JSON 语法校验：`feature_list.json`（13 features）/ `docs/legacy-assets.json`（23 assets）/ `docs/mvp-scope.json`（10 景点、3 套餐、7 页面）均可解析
- [ ] 小程序构建：未执行（缺依赖）

## 给下一会话的备注

- 先跑 `./init.ps1`，绿了再动代码。
- 动手前必读 `docs/mvp-scope.json`；**以它为准，原始 MVP 文档的 4 处内容已被修订**，别再照原文档砍掉景点列表页或加回评价。
- 当前 3 条告警就是 feat-003（default-avatar、webview/agreement）与 feat-012（admin/clerk/edit 移除入口）的范围。
- `pages.json` 将被改 3 次（协议页、地陪列表页、下单页、接单页）：每次改完登记 + `--update`。
- `init.ps1` 必须保持 UTF-8 BOM 编码。
- `pages/login/login.vue` 当前哈希包含未提交的 H5 修复；`git checkout .` 会让校验失败。
- 全程走 mock，不要引入后端依赖或网络请求封装以外的复杂度。
