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
3. 运行 `./init.ps1`（Windows PowerShell）或 `bash init.sh`（Git Bash），确认基线为绿
4. 阅读 `feature_list.json`，只看当前一个功能
5. 涉及改动范围与复用策略时，查 `docs/legacy-assets.md`
6. `git log --oneline -5` 了解最近改动

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

## 目标形态（阶段 1 的方向）

- 业务对象：成都地区景点（宽窄巷子、武侯祠、杜甫草堂、熊猫基地、都江堰等）+ 本地地陪/向导
- 复用映射：`clerks -> guides（地陪向导）`、`categories -> attractions（景点）`、`appointment` 状态机 0/1/2 不变
- 平台：微信小程序为主，H5 保持可调试（登录页已做平台双通道）
- 数据层：继续使用 `api/index.js` 的 `useMock` 开关 + 条件编译双通道，不要在页面里直连数据库

## 必需产物

- `feature_list.json` — 功能状态唯一事实来源
- `progress.md` — 会话连续性日志
- `docs/legacy-assets.md` / `docs/legacy-assets.json` — 原有资产清单与保真门禁数据
- `session-handoff.md` — 跨会话交接
- `init.ps1` / `init.sh` — 标准启动与验证入口

## 验证命令

```powershell
# 完整验证（推荐，Windows）
./init.ps1

# 仅资产保真 + 路由一致性（零依赖，秒级）
node scripts/verify-assets.mjs

# 小程序产物构建
npm run build:mp-weixin
```

## 完成定义

一个功能只有在全部满足时才算完成：

- [ ] 目标行为已实现
- [ ] `node scripts/verify-assets.mjs` 通过
- [ ] `npm run build:mp-weixin` 通过（或说明为何本次不适用）
- [ ] 证据已写入 `feature_list.json` / `progress.md`
- [ ] 下一会话能直接跑起 `./init.ps1`

## 范围边界

- **架构决策**：优先查本文件与 `docs/legacy-assets.md`；仍不清则问用户
- **业务事实**（景点名单、定价、地区划分）：必须问用户，不要编造景点数据
- **测试反复失败**：写进 `progress.md` 的阻塞项，停止改动
- **范围模糊**：回到 `feature_list.json` 里该功能的依赖与完成标准

## 结束会话

1. 更新 `progress.md`（当前状态 / 阻塞 / 下一步）
2. 更新 `feature_list.json` 状态与证据
3. 在 `session-handoff.md` 留下下一会话的起点
4. 报告用户：改了什么、验证结果、还剩什么
