# 会话交接

## 交接时间

2026-09-26（阶段 0 已完成，MVP 范围已锁定并按用户决策修订，阶段 1 尚未开始写代码）

## 这次会话做了什么

1. 全量盘点原有「陪玩小程序」资产，产出 `docs/legacy-assets.md` + `docs/legacy-assets.json`（23 条，逐项 `keep / adapt / replace`）。
2. 打基线标签 `legacy-peiwan-baseline-v1`（提交 `ceca05a`）。
3. 落地零依赖保真门禁 `scripts/verify-assets.mjs`，接入 `init.ps1` / `init.sh`。
4. 建立 harness：`AGENTS.md`、`feature_list.json`、`progress.md`、`session-handoff.md`。
5. 把 MVP 范围固化为 `docs/mvp-scope.json`，并按用户三条拍板修订范围（记入 `deviations`），据此重写 `feature_list.json`（13 个功能）与 `AGENTS.md` 的目标形态。

## 用户已拍板的范围修订（以 `docs/mvp-scope.json` 为准）

| 编号 | 修订 | 影响 |
|---|---|---|
| dev-001 | **先选景点再选地陪** | 首页改为景点列表页，地陪列表降为第二级；页面 6 → 7 |
| dev-002 | **评价不要了** | 地陪卡片与详情页去掉评分/评价；闭环去掉评价环节 |
| dev-003 | **地陪申请开通，但先不做** | 申请流程移入 `futureUpgrades`；MVP 地陪数据由 mock 预置 |
| dev-004 | **先做 mock，后续对接真实后端** | MVP 全部 mock；Api 签名对齐未来 HTTP，切换时页面不改 |

注意：原始 `MVP 范围：只做 3 件事.md` 已与上述 4 点不一致，**冲突时以 `docs/mvp-scope.json` 为准**。

## 下一会话从这里开始

**第一件事：** `./init.ps1`，确认「资产保真校验通过」。

**第二件事：** 读 `docs/mvp-scope.json`（重点看 `deviations` 与 `dataStrategy`），别照原始文档砍景点列表页或加回评价。

**第三件事：** 开始 `feat-003`（无依赖、风险最低）：

1. 补 `/static/images/default-avatar.png`（6 处页面引用；后续景点封面/地陪头像也统一放这里做占位）
2. 新建协议页（`pages/webview/agreement.vue`）并在 `pages.json` 注册
3. 改完 `pages.json` 后：在 `docs/legacy-assets.json` 对应条目写清原因 → `node scripts/verify-assets.mjs --update` → 重跑 `./init.ps1`，确认告警由 3 条降为 1 条（仅剩 gap-003，留给 feat-012 移除入口）

随后按依赖链推进：`feat-004 数据层（mock）→ feat-005 四态 → feat-006 景点列表 → feat-007 地陪列表 → feat-008 详情 → feat-009 下单 → feat-010 订单 → feat-011 接单 → feat-012 后台 → feat-013 换肤与文档`

## MVP 硬边界（越界即错）

- 3 件事：游客下单 / 地陪接单 / 平台确认
- 7 个页面：景点列表（首页）、地陪列表、地陪详情、下单、订单、接单、后台订单管理
- 流程：**景点 → 地陪 → 详情 → 下单**（不是先选地陪）
- 10 景点 / 3 类区域 / 3 个套餐 SKU / 3 种预约类型 / 4 态订单 / 3 种角色
- 数据：MVP 全部 mock（`useMock = true`），页面禁止直连数据源或写死 mock
- 不做 IM、定位、分销、团购、广场、等级、自动结算、多城市、优惠券、动态定价、行程日志、轨迹、门店、复杂排班、加价规则、**评价**、**地陪申请流程**

## 关键文件索引

| 文件 | 作用 |
|---|---|
| `MVP 范围：只做 3 件事.md` | 用户提供的业务范围原始文档（已被 4 处修订） |
| `docs/mvp-scope.json` | **范围内的唯一事实来源**（10 景点、3 套餐、7 页面、4 态、deviations、dataStrategy） |
| `AGENTS.md` | 工作规则、MVP 硬边界、验证命令、完成定义 |
| `docs/legacy-assets.md` | 原有资产清单 + MVP 落地映射（7 页面 → 承载文件）+ 已知缺口 |
| `docs/legacy-assets.json` | 机读清单（保真门禁事实来源，含 sha256） |
| `scripts/verify-assets.mjs` | 保真校验（`--update` 刷新哈希） |
| `feature_list.json` | 功能状态与依赖（feat-001~013） |
| `init.ps1` / `init.sh` | 标准验证入口 |
| `progress.md` | 决策记录与「未来候选」（越界想法的去处） |

## 不要做的事

- 不要删改 `docs/legacy-assets.json` 中登记的 23 个资产而不登记原因
- 不要为了"让校验通过"而无脑 `--update`
- 不要顺手实现 MVP 之外的功能（想做的记到 `progress.md` 的「未来候选」）
- 不要引入真实后端请求、数据库或新依赖（MVP 阶段只有 mock）
- 不要编造业务事实；范围文档里没有的必须问用户
- 不要自行 commit / tag / push
