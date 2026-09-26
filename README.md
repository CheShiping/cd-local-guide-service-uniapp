# 成都地陪

成都景点地陪预约小程序（uni-app + Vue 3）。游客**先选景点 → 再挑能带这个景点的本地地陪 → 选半天或全天 → 提交预约**，地陪接单，平台人工确认档期。

> 本项目由「陪玩小程序」重构而来，原有资产台账与保真门禁见 `docs/legacy-assets.md`。

## MVP 范围：只做 3 件事

| # | 角色 | 能做的事 |
|---|---|---|
| 1 | 游客 | 下单：选景点 → 选地陪 → 选套餐与日期 → 提交预约 |
| 2 | 地陪 | 接单：查看待接单 → 接单 / 拒单 → 完成后标记完成服务 |
| 3 | 平台（管理员） | 确认订单：人工确认档期 → 标记完成 / 处理取消；地陪审核（通过 / 拒绝） |

**明确不做**：IM、实时定位、分销、团购、广场发单、等级体系、自动结算、多城市、优惠券、动态定价、行程日志、轨迹回放、门店排班、**评价**（展示与提交都不做）、地陪申请开通流程（后续升级）。

完整口径见 `docs/MVP 范围：只做 3 件事.md`（人读）与 `docs/mvp-scope.json`（机读，含 8 条经确认的修订）。

## 页面与角色

| 页面 | 路径 | 角色 |
|---|---|---|
| 景点列表（首页） | `pages/index/index` | 游客 |
| 地陪列表 | `pages/guide/list?attractionId=` | 游客 |
| 地陪详情 | `pages/clerk/detail?id=&attractionId=` | 游客 |
| 下单 | `pages/order/create?guideId=&packageSkuId=&attractionId=&appointDate=` | 游客 |
| 我的订单 | `pages/appointment/my` | 游客 |
| 接单 | `pages/guide/orders` | 地陪 |
| 订单管理 / 地陪审核 | `pages/admin/appointment`、`pages/admin/clerk` | 管理员 |
| 登录 / 协议 | `pages/login/login`、`pages/webview/agreement` | 公共 |

「我的」页按角色显示入口。mock 阶段该页底部有**演示身份切换**（游客 / 地陪 / 管理员），切完即可走通三端闭环；接后端后删除该区块。

## 项目结构

```
peiwan-lite/
├── api/                    # 数据层（页面只允许 import api/index.js）
│   ├── index.js            # 出口 + USE_MOCK 开关 + 过渡适配层
│   ├── constants.js        # 领域常量唯一来源（订单四态 / 预约类型 / 订单号规则）
│   ├── errors.js           # 统一错误契约（与 HTTP 错误体一致）
│   ├── http.js             # HTTP 适配层骨架 + 路由表（对接后端时补实现）
│   └── mock/               # 确定性 mock 数据与接口实现
├── pages/                  # 页面（见上表）
├── static/tabbar/          # tabBar 图标（4 个 png；页面内图片一律用后端 URL）
├── design/html/            # 7 屏 HTML 原型（视觉基准）
├── docx/                   # 设计实现文档 / Bug 修复文档 / 数据库设计
├── docs/                   # MVP 范围、原有资产台账与保真数据
├── scripts/                # 4 个零依赖校验脚本
├── App.vue main.js pages.json manifest.json uni.scss
└── AGENTS.md feature_list.json progress.md session-handoff.md
```

## 开发说明

### 环境要求

- HBuilderX 3.0+ 或 uni-app CLI
- Node.js 16+
- 微信开发者工具（小程序调试）

### 运行

```bash
npm install
npm run dev:h5           # 浏览器调试（登录走本地模拟 code）
npm run dev:mp-weixin    # 小程序，产物用微信开发者工具打开
npm run build:mp-weixin  # 生产构建
```

### 验证（零依赖，不需要先 install）

```bash
./init.ps1      # Windows PowerShell；共 8 步
bash init.sh    # Git Bash / macOS / Linux
```

8 步 = 环境检查 → 资产保真 → 设计令牌 → 动效 → 数据库表结构 → mock 数据层 → 端到端闭环 → 构建（`-Full` 时才装依赖并真实构建）。

前三项与动效、表结构、mock 都是**静态**校验；`scripts/smoke-flow.mjs` 是唯一的**动态**校验（真实跑一遍三端闭环）。
新增或修改数据层逻辑后，除了静态门禁，必须跑它。

### 数据源

MVP 全部走 mock：`api/index.js` 的 `USE_MOCK = true`。
对接真实后端时只改这一处，并按 `api/http.js` 的路由表逐个补实现，**页面代码不用动**。

mock 规模：52 用户 / 50 地陪 / 20 景点 / 7 类区域 / 3 个套餐 SKU / 16 笔订单（四态齐全）。

## 设计系统

- 规范：`DESIGN.md`（定稿主题 **宣纸 · 疏**）
- 令牌：`uni.scss` 的 `$ds-*`（会被自动注入所有页面的 SCSS）
- 原型：`design/html/prototype.html`（7 屏可交互）

三条硬规则：竹青绿 `#2f6b5e` 只用于可点/选中；朱砂 `#b4462f` 只给价格；页面底是宣纸 `#f7f4ed` 而不是纯白。图片一律用后端返回的 `coverUrl` / `avatarUrl`，失败时露容器底色，不内置插画。

## 技术栈

- uni-app（Vue 3）— 跨平台框架
- 原生 `uni.request` 封装 — 数据层（未引入 Pinia，状态由页面与 storage 管理）

## License

MIT
