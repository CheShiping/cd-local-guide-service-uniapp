# 会话进度日志

## 当前状态

**最后更新：** 2026-09-26
**当前功能：** feat-002（资产保真验证门禁）已完成，阶段 0 收尾；下一个应开始 feat-008 或 feat-003
**当前阶段：** 阶段 0「保留原有资产」= 完成；阶段 1「重构为成都景点地陪小程序」= 未开始

## 状态概览

### 已完成

- [x] 盘点原有项目全部资产（7 个业务页面 + App.vue、api/utils 数据层、6 个配置文件、4 个静态图标、DESIGN.md/README.md）
- [x] 记录资产用途与重构复用策略（keep / adapt / replace），见 `docs/legacy-assets.md`
- [x] git 快照：轻量标签 `legacy-peiwan-baseline-v1`（提交 `ceca05a`）
- [x] 机读资产清单 `docs/legacy-assets.json`（23 条资产 + 5 条已知缺口）
- [x] 零依赖保真校验脚本 `scripts/verify-assets.mjs`，接入 `init.ps1` / `init.sh`
- [x] 修复登录页 H5 报错（`uni.login` 在 H5 不支持、`open-type="getPhoneNumber"` 在 H5 不触发）

### 进行中

- [ ] 无（阶段 0 已收尾，等待用户确认后进入阶段 1）

### 下一步

1. 与用户确认成都景点地陪的业务口径：景点名单与区域划分、地陪定价方式、预约颗粒度（按场次/按小时/按天）
2. 从 `feature_list.json` 挑一个：建议先 `feat-008`（补齐 default-avatar 与协议页，纯增量、风险最低）或 `feat-003`（数据层改造，是后续所有页面改造的前置）
3. 在 `docs/legacy-assets.md` 中勾掉对应资产的复用状态

## 阻塞 / 风险

- [ ] 缺依赖：仓库根目录无 `node_modules`，`npm run build:mp-weixin` 暂时无法执行；`./init.ps1 -Full` 会自动安装
- [ ] 无测试框架：验证只能依赖 `verify-assets.mjs`（结构级）+ 构建通过 + 人工在微信开发者工具/H5 里跑通主流程
- [ ] 业务数据未知：成都景点名单、票价、地陪档期规则均未提供，属于需要用户输入的事实，禁止编造
- [ ] 云开发环境 ID 仍是占位符 `peiwan-lite-xxx`（App.vue）+ `manifest.json` 的 mp-weixin appid 为空，真实小程序登录链路未验证

## 已做出的决策

- **用「git 标签 + 机读清单 + 校验脚本」而不是复制一份 legacy 目录来保留资产**
  - 背景：原有代码在 git 里已可完整恢复，物理复制会带来双份代码同步负担
  - 考虑过的替代方案：整仓复制到 `legacy/` 子目录（否决，冗余且易腐化）
- **保真校验只把「资产缺失/被改」「pages.json 注册页面缺失」判为失败**
  - 背景：`/static/images/default-avatar.png`、`/pages/webview/agreement` 等是重构前就存在的缺口，若判失败则基线永远是红的，门禁会失去意义
  - 结果：这些缺口作为告警输出并登记为 `gap-00x` + 对应 feature
- **`reuse` 取值限定为 keep / adapt / replace 三档**，避免出现"看情况"的模糊登记

## 本次会话修改的文件

- `AGENTS.md` - 新建，agent 工作规则与阶段划分
- `feature_list.json` - 新建，9 个功能（2 完成 / 7 待办）
- `progress.md` - 新建，本文件
- `session-handoff.md` - 新建，跨会话交接
- `init.ps1` / `init.sh` - 新建，标准验证入口
- `docs/legacy-assets.md` - 新建，资产清单与复用映射（人读）
- `docs/legacy-assets.json` - 新建，资产清单（机读，含 sha256）
- `scripts/verify-assets.mjs` - 新建，保真校验门禁
- `pages/login/login.vue` - H5 登录兼容修复（会话前段完成，尚未 commit）

## 完成证据

- [x] 资产保真校验通过：`node scripts/verify-assets.mjs` → `资产保真校验通过。`
- [x] 完整入口通过：`./init.ps1` → 1/3 环境检查 + 2/3 保真校验通过（3/3 因缺 node_modules 按设计跳过）
- [x] 反向测试（证明门禁有效）：篡改临时副本中的 App.vue 哈希 → 输出「资产被修改」且退出码 1
- [x] harness 审计：`validate-harness.mjs` 总分 100/100（指令/状态/验证/范围/生命周期 5 个子系统全满）
- [ ] 小程序构建：未执行（缺依赖）

当前告警（3 条，对应下列 gap，不判失败）：缺失 `/static/images/default-avatar.png`、未注册页面 `/pages/admin/clerk/edit`、未注册页面 `/pages/webview/agreement`

## 给下一会话的备注

- 先跑 `./init.ps1`，它是绿的才算基线正常。
- 重构不是重写：`pages/appointment/my.vue`、`pages/admin/appointment.vue`、`utils/index.js`、`pages/login/login.vue` 属于 keep 档，可以直接沿用。
- 改动任何资产后，必须同步更新 `docs/legacy-assets.json`（登记原因）再 `--update` 刷新哈希，否则门禁会报"资产被修改"。
- `pages/login/login.vue` 当前哈希包含未提交的 H5 修复；`git checkout .` 会让校验失败。
- `init.ps1` 必须是 **UTF-8 BOM** 编码（Windows PowerShell 5.1 无 BOM 时按本地代码页解析，中文会乱码并导致脚本语法错误）。用编辑器另存时注意保留 BOM；若换环境，可用 `bash init.sh` 替代。
