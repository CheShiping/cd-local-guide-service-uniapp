# 会话交接

## 交接时间

2026-09-26（阶段 0 结束 → 阶段 1 开始前）

## 这次会话做了什么

1. 全量盘点原有「陪玩小程序」资产，产出人读（`docs/legacy-assets.md`）+ 机读（`docs/legacy-assets.json`）两份清单，逐项标注 `keep / adapt / replace` 复用策略。
2. 在提交 `ceca05a` 上打标签 `legacy-peiwan-baseline-v1`，作为可恢复快照。
3. 落地零依赖保真门禁 `scripts/verify-assets.mjs`，并接入 `init.ps1` / `init.sh`。
4. 建立 harness 状态文件：`AGENTS.md`、`feature_list.json`、`progress.md`。
5. （会话前段）修掉登录页在 H5 下 `uni.login` 不支持的报错。

## 下一会话从这里开始

**第一件事：** 运行 `./init.ps1`，确认输出「资产保真校验通过」。

**第二件事：** 与用户确认业务口径（这是唯一无法自行推断的输入）：

- 成都景点名单与区域划分（宽窄巷子/武侯祠/杜甫草堂/熊猫基地/都江堰…哪些纳入、如何分区）
- 地陪向导的定价与预约颗粒度（按场次、按小时、按天）
- 是否需要真机小程序登录（需用户提供 appid 与云开发环境 ID）

**第三件事：** 按依赖顺序推进 `feature_list.json`：

```
feat-008（补缺口，无依赖，可先做）
feat-003（数据层改造）→ feat-004 / feat-005 / feat-007 → feat-006 → feat-009
```

## 关键文件索引

| 文件 | 作用 |
|---|---|
| `AGENTS.md` | 工作规则、不变量、验证命令、完成定义 |
| `docs/legacy-assets.md` | 原有资产清单 + 复用映射 + 已知缺口 |
| `docs/legacy-assets.json` | 机读清单（保真门禁的事实来源，含 sha256） |
| `scripts/verify-assets.mjs` | 保真校验（`--update` 刷新哈希） |
| `feature_list.json` | 功能状态与依赖 |
| `init.ps1` / `init.sh` | 标准验证入口 |

## 不要做的事

- 不要删除或覆盖 `docs/legacy-assets.json` 中登记的文件（否则门禁失败）
- 不要为了"让校验通过"而无脑 `--update`
- 不要编造成都景点数据，不要加未要求的依赖
- 不要自行 commit / tag / push
