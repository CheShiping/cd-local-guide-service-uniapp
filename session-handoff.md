# 会话交接

## 交接时间

2026-09-26（范围锁定 + 视觉定稿完成，阶段 1 尚未开始写业务代码）

## 这次会话做了什么

1. 全量盘点原有「陪玩小程序」资产，产出 `docs/legacy-assets.md` + `docs/legacy-assets.json`，打基线标签 `legacy-peiwan-baseline-v1`。
2. 落地零依赖保真门禁 `scripts/verify-assets.mjs`（含 `removedAssets` 记录有意删除的资产），接入 `init.ps1` / `init.sh`。
3. 建立 harness：`AGENTS.md`、`feature_list.json`、`progress.md`、`session-handoff.md`。
4. 固化 MVP 范围：`docs/mvp-scope.json`（`deviations` 现 6 条，含用户 4 次拍板）。
5. 三版位图原型 → 改为 HTML 原型 `design/html/prototype.html`（7 屏），**定稿主题「宣纸 · 疏」**。
6. 视觉定稿落地：重写 `DESIGN.md`（原 Linear 版本删除）+ 重写 `uni.scss`（`$ds-*` 令牌，主色竹青绿 `#2f6b5e`）。
7. 建立 `docx/` 归档结构（`codeimpl-sum/`、`bugfix/`）与 `docx/接口文档.md` 骨架。

## 用户已拍板的全部决策（冲突时以此为准）

| 编号 | 决策 | 落点 |
|---|---|---|
| dev-001 | 先选景点，再选地陪 | 首页 = 景点列表页，页面 6 → 7 |
| dev-002 | 评价不要了 | 卡片与详情页无评分/评价 |
| dev-003 | 地陪申请开通，先不做 | 申请流程进 `futureUpgrades`，MVP 地陪由 mock 预置 |
| dev-004 | 先 mock，后续对接真实后端 HTTP | `useMock = true`，签名对齐 HTTP |
| dev-005 | 定稿「宣纸 · 疏」，删掉原 DESIGN.md | `DESIGN.md` 重写 + `uni.scss` 落地令牌 |
| dev-006 | 图片用后端返回的 URL，先用网络占位图，不要假 SVG | `imageStrategy`，原型已换真实网络图 |

## 下一会话从这里开始

**第一件事：** `./init.ps1`，确认 4 步全绿（环境 / 资产保真 22 条 / 设计令牌 / 构建或跳过）。资产台账现在是 **22 条在册 + 1 条 `removedAssets`**。

**第二件事：** 读 `docs/mvp-scope.json`（范围唯一事实来源）+ `DESIGN.md`（视觉唯一事实来源）。

**第三件事：** 开始 `feat-003`（无依赖、风险最低）：

1. 补 `/static/images/default-avatar.png` 兜底图；景点封面与地陪头像一律走后端 URL，不要自绘插画
2. 新建协议页（`pages/webview/agreement.vue`）并在 `pages.json` 注册
3. 改完 `pages.json` 后：在 `docs/legacy-assets.json` 对应条目写清原因 → `node scripts/verify-assets.mjs --update` → 重跑 `./init.ps1`，确认告警由 3 条降为 1 条（仅剩 gap-003，留给 feat-012）
4. 产出 `docx/codeimpl-sum/设计文档-feat-003-修复悬空资产引用.md`（六章节齐全），并登记到 `progress.md` 的「本次会话修改的文件」

随后按依赖链推进：`feat-004 数据层（mock）→ feat-005 四态 → feat-006 景点列表 → feat-007 地陪列表 → feat-008 详情 → feat-009 下单 → feat-010 订单 → feat-011 接单 → feat-012 后台 → feat-013 换肤与文档`

## 硬边界速查

- 3 件事：游客下单 / 地陪接单 / 平台确认；7 个页面；流程 **景点 → 地陪 → 详情 → 下单**
- 10 景点 / 3 类区域 / 3 个套餐 SKU / 3 种预约类型 / 4 态订单 / 3 种角色
- 数据：全部 mock（`api/index.js` 的 `useMock = true`），页面禁止直连数据源
- 视觉：竹青绿 `#2f6b5e` 只做可点与选中，朱砂 `#b4462f` 只给价格，宣纸底 `#f7f4ed`
- **每个 feat 标 `done` 前必须产出 `docx/codeimpl-sum/` 设计文档；每个 bug 必须产出 `docx/bugfix/` 修复文档**
- 不做：IM、定位、分销、团购、广场、等级、自动结算、多城市、优惠券、动态定价、行程日志、轨迹、门店、复杂排班、加价规则、评价、地陪申请流程

## 关键文件索引

| 文件 | 作用 |
|---|---|
| `docs/mvp-scope.json` | **范围唯一事实来源**（含 6 条 deviations、designSystem、imageStrategy） |
| `DESIGN.md` | **视觉唯一事实来源**（宣纸 · 疏 令牌、组件规范、图片策略） |
| `uni.scss` | 令牌落地（`$ds-*`），与 DESIGN.md 必须同步改 |
| `design/html/prototype.html` | 7 屏可交互原型（视觉基准） |
| `AGENTS.md` | 工作规则、硬边界、docx 归档规则、验证命令、完成定义 |
| `docs/legacy-assets.md` / `.json` | 原有资产台账 + `removedAssets` + 保真门禁数据 |
| `scripts/verify-assets.mjs` | 保真校验（`--update` 刷新哈希） |
| `feature_list.json` | 功能状态与依赖（feat-001~013） |
| `docx/接口文档.md` | 设计文档的接口对照基准（骨架，待 feat-004 重写） |
| `init.ps1` / `init.sh` | 标准验证入口 |
| `progress.md` | 决策记录与「未来候选」 |

## 不要做的事

- 不要删改台账里的 22 个资产；确需删除必须登记到 `removedAssets` 并写原因
- 不要为了"让校验通过"而无脑 `--update`
- 不要只用自绘 SVG/插画替代真实图片
- 不要顺手实现 MVP 之外的功能（写进 `progress.md` 的「未来候选」）
- 不要忘记 docx 归档，否则功能不算 `done`
- 不要自行 commit / tag / push
