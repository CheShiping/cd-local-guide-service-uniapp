# 会话进度日志

## 当前状态

**最后更新：** 2026-09-26
**当前功能：** 无进行中（feat-001 / feat-002 / feat-014 / **feat-004** 已完成；下一步 feat-003 或 feat-005）
**当前阶段：** 阶段 0「保留原有资产」= 完成；阶段 1「成都景点地陪小程序」= 范围已锁定、视觉已定稿，尚未写业务代码

## 阶段 1 范围（已锁定）

来源：`docs/MVP 范围：只做 3 件事.md` → 范围唯一事实来源：`docs/mvp-scope.json`（`deviations` 6 条）

- **只做 3 件事**：游客能下单 / 地陪能接单 / 平台能确认订单
- **闭环**：游客选景点 → 选能带该景点的地陪 → 选半天/全天 → 提交预约 → 地陪接单 → 平台确认 → 完成
- **7 个页面**：景点列表（首页）、地陪列表、地陪详情、下单、订单（游客端）+ 接单（地陪端）+ 后台订单管理（管理端）
- **10 景点 / 3 类区域 / 3 个套餐 SKU / 3 种预约类型 / 4 态订单 / 3 种角色**
- **数据策略**：MVP 全部 mock（`useMock = true`），后续切真实后端 HTTP，页面代码不动
- **图片策略**：景点 `coverUrl`、地陪 `avatarUrl` 由后端返回；原型阶段先用网络占位图；禁止自绘插画冒充照片
- 不做：IM、定位、分销、团购、广场、等级、自动结算、多城市、优惠券、动态定价、行程日志、轨迹、门店、复杂排班、加价规则、评价、地陪申请流程

## 视觉（已定稿）

- **主题：宣纸 · 疏**（唯一有效主题；历史备选「竹影 · 纹」「青瓷 · 紧」按定稿移除）
- 骨架：Material Design 3 令牌（色彩角色 / Type Scale / Shape / Elevation / State Layer / Motion）
- 主色竹青绿 `#2f6b5e` 只用于可点与选中；朱砂 `#b4462f`（M3 tertiary）只给价格与关键数字；页面底为宣纸 `#f7f4ed`
- 标题走系统宋体栈 + `letter-spacing: .04em`，**不加载任何字体文件**；纹理用 CSS 径向点阵生成
- 三个同步源：`DESIGN.md`（文字口径）+ `uni.scss`（`$ds-*` 落地令牌）+ `design/html/prototype.html`（7 屏视觉基准）

## 数据库（已定稿）

- 建表语句：`docx/database/schema.sql`（**10 张表**：区域字典已按决策加回）
- 初始化数据：`docx/database/seed.sql`（区域 7 条 / 套餐 3 条 / 景点 10 条，`ON DUPLICATE KEY UPDATE` 可重复执行）
- **区域是后台可维护的字典数据**：`region_types` 表存名称/覆盖范围/排序/上下架；MVP 初始 7 类（原 3 类 + 川西古镇线 / 山野度假线 / 都市夜游线 / 亲子研学线）；前台只展示「启用且下有在售景点」的区域
- 设计说明：`docx/database/数据库设计.md`（表清单与精简代价、订单号规则、关键决策、字段 DB↔接口↔旧字段映射、索引理由、mock 落地约定、待确认项）
- 规范来源：`.codebuddy/skills/database-design/SKILL.md`；校验：`node scripts/check-schema.mjs`（带 `--self-test`）
- 表范围：users / region_types / attractions / guides / guide_region_types / guide_attractions / package_skus / guide_packages / guide_available_dates / orders
- **mock 规模**：7 区域 / **20 景点** / 3 套餐 / **50 地陪** / 52 用户；地陪 50（5 页）与景点 20（2 页）分别验证分页、筛选与「加载更多」，采用确定性生成（固定 seed）保证数据可复现
- **不使用外键**：表间只用 id 关联 + 索引，完整性由应用层保证；校验脚本会拦截 `FOREIGN KEY`
- **订单号规则**：`CD + YYMMDD + 业务类型(A 半天/B 全天/C 专项·小时) + 4 位当日序号` = **13 位**，`CHAR(13)`，如 `CD260926A0001`；同类型取 MAX(序号)+1，唯一索引兜底重试
- **不建的表**：业务上禁止的（评价、收藏、钱包、优惠券、IM、地陪申请、分销）与本轮精简掉的（`order_status_logs`，用订单状态字段表达）都写在 `schema.sql` 末尾防误补

## 一致性审计（2026-09-26）

对 `feature_list.json` × 定稿原型 7 屏 × MVP 要求 × 现有代码 做了一次交叉审计，发现并修正 12 处不一致：

| # | 问题 | 修正 |
|---|---|---|
| 1 | feat-006 写「筛选抽屉改为区域+价格」，但原型 01 屏没有筛选抽屉、也没有搜索框 | 改为「移除原搜索框与性别/价格筛选抽屉，MVP 不做景点搜索与筛选」 |
| 2 | feat-007 写「复用筛选抽屉范式」，与原型 02 屏的 chip 筛选行不符 | 改为「chip 筛选（半日/全天/专项/价格）」 |
| 3 | feat-008 未提原型 03 屏的三项指标与底部固定操作栏 | 补上（接单·本周可约·套餐数 + 合计/立即预约） |
| 4 | feat-009 未说明「半天/全天/小时」如何选择 | 新增 `bookingTypeUi` 规则：类型跟随套餐，半日显示上午/下午、全天隐藏时段、小时加购显示小时数 |
| 5 | feat-011 未提原型 06 屏的统计条与在线开关 | 补上 |
| 6 | feat-012 未提原型 07 屏的统计条与日期/状态筛选 | 补上 |
| 7 | 原型没有「地陪审核」屏，而 feat-012 与 MVP 都要求审核地陪 | 明确：审核复用现有 `pages/admin/clerk.vue`，套用 07 屏列表样式；原型 07 只作订单管理的视觉基准 |
| 8 | MVP 原文的「处理取消/投诉」里的投诉没有任何页面承载 | 列入 `outOfScope` 与 `futureUpgrades`（MVP 只做到处理取消） |
| 9 | `docs/mvp-scope.json` 的 `pageMappingNote` 自相矛盾（写「2 个为新增」却列了 3 个） | 改为「4 个改造 + 3 个新增」，并写明后台合并了两个现有页面 |
| 10 | feat-013 只依赖 feat-006，但换肤要统一 6 个页面的硬编码色值 + tabBar + manifest | 依赖改为 `feat-010` + `feat-012` |
| 11 | feat-003 原计划「补 /static/images/default-avatar.png」，与 dev-006 的图片策略冲突且会掩盖空字段问题 | 改为「图片字段 + 底色兜底」，不新增本地图片文件 |
| 12 | feat-001/002 的文案仍写「23 个文件 / 23 条资产」 | 更新为「22 条在册 + 1 条 removedAssets」 |

审计同时确认符合的部分：7 屏 ↔ 7 页面一一对应；3 个新增路由（`pages/guide/list`、`pages/order/create`、`pages/guide/orders`）与原型屏一致；订单 4 态在 `feature_list` / `mvp-scope` / 原型 05 屏三处一致；评价已从卡片、详情页、闭环三处彻底移除。

**审计时的误判（已更正）**：曾判断「没有 api-design 技能」，实际是查错了目录 —— 技能在**项目内** `.codebuddy/skills/`（`api-design` / `database-design` / `uniapp` 三个），我查的是用户级 `C:\Users\Shiping\.codebuddy\skills\`。feat-004 按 `.codebuddy/skills/api-design/SKILL.md`（RESTful + `/api/v1` + camelCase + 统一错误体）执行，**无阻塞**。

## 状态概览

### 已完成

- [x] 原有资产盘点与冻结：`git tag legacy-peiwan-baseline-v1` @ `ceca05a`
- [x] 资产台账：`docs/legacy-assets.md` + `docs/legacy-assets.json`（22 条在册 + 1 条 `removedAssets` + 5 条已知缺口）
- [x] 保真门禁：`scripts/verify-assets.mjs`（含有意删除登记），接入 `init.ps1` / `init.sh`
- [x] harness 骨架：`AGENTS.md`、`feature_list.json`、`progress.md`、`session-handoff.md`
- [x] 登录页 H5 兼容修复（`pages/login/login.vue`）
- [x] MVP 范围固化 + 6 处修订：`docs/mvp-scope.json`、`feature_list.json`（13 个功能，2 完成）
- [x] HTML 原型 7 屏：`design/html/prototype.html` + `prototype.css` + `prototype.js`
- [x] 视觉定稿落地：`DESIGN.md` 重写（原 Linear 版删除）、`uni.scss` 重写为 `$ds-*` 令牌
- [x] 归档结构：`docx/codeimpl-sum/`、`docx/bugfix/`、`docx/接口文档.md`（骨架）
- [x] 数据库表结构定稿：`docx/database/schema.sql` + `docx/database/数据库设计.md`（feat-014），并新增 `scripts/check-schema.mjs` 门禁
- [x] **feat-004 MVP 数据层**：`api/` 分层落地（constants / errors / mock / http），mock 实测 52 用户 / 50 地陪 / 20 景点 / 7 区域 / 3 套餐 / 16 订单（四态齐全），订单号 16 个唯一；`docx/接口文档.md` 整体重写；新增 `scripts/check-mock.mjs` 门禁；产出设计文档与 bugfix 文档各一份
- [x] `AGENTS.md` 增补「文档归档（docx/）」规则，并写入完成定义

### 进行中

- [ ] 无。等待开始 feat-003

### 下一步

1. **feat-003 修复悬空资产引用**（无依赖，建议先做）
   - 补 `/static/images/default-avatar.png` 兜底图
   - 新建协议页并注册到 `pages.json`（消掉 gap-002 告警）
   - 会改 `pages.json`（adapt 档）→ 先登记原因再 `--update`；完成后告警应由 3 条降为 1 条
   - 产出 `docx/codeimpl-sum/设计文档-feat-003-修复悬空资产引用.md`
2. **feat-004 MVP 数据层**（前置 feat-014 表结构已完成）：按 `.codebuddy/skills/api-design/SKILL.md` 设计接口，按 `docx/database/schema.sql` 落地 mock 字段；10 景点 / 3 区域 / 3 套餐 / 3 预约类型 / 4 态订单 / 3 角色；同步重写 `docx/接口文档.md`
3. 依次推进：`feat-005` → `feat-006` → `feat-007` → `feat-008` → `feat-009` → `feat-010` → `feat-011` → `feat-012` → `feat-013`

## 阻塞 / 风险

- [ ] 缺依赖：无 `node_modules`，`npm run build:mp-weixin` 无法执行；`./init.ps1 -Full` 会自动安装（需联网）。**真实构建一次都没跑过**，`uni.scss` 令牌在编译期是否有其它问题待确认
- [ ] 无测试框架：验证只能靠 `verify-assets.mjs`（结构级）+ 构建通过 + 人工在 H5/开发者工具跑主流程
- [ ] 订单 3 态 → 4 态是破坏性升级：`api/index.js`、`my.vue`、`admin/appointment.vue` 必须同时改；`statusLabels` / `timeSlots` 映射表现分散在两个页面，`feat-005` 需收口
- [ ] 页面从 6 增至 7（dev-001）：与原始 MVP 文档「不做景点列表」冲突，已按用户拍板修订
- [ ] gap-004 只部分收敛：`uni.scss` 与 `DESIGN.md` 已统一为 `#2f6b5e`，但页面内硬编码的 `#FF4D6A` 与 `pages.json` tabBar 的 `#ff6b81` 仍在，留给 `feat-013`
- [ ] 图片依赖网络占位图：`picsum.photos` / `i.pravatar.cc` 在离线环境不可用，届时看到的是容器底色（这是设计好的兜底行为）
- [ ] 云开发仍是占位：`App.vue` 的 `peiwan-lite-xxx`、`manifest.json` 的 mp-weixin `appid` 为空；MVP 走 mock，暂不影响开发
- [ ] `docx/接口文档.md` 目前只是记录现状的骨架，`feat-004` 必须整体重写，否则后续设计文档没有对照基准
- [ ] 表结构只通过静态校验，**没有在真实 MySQL 上执行过建表**（本地无实例）：首次接入数据库时需实际跑一遍 `schema.sql`，并确认 `ENUM` / `CHAR(13)` / `CONSTRAINT pk_` 命名在该版本 MySQL 上的行为
- [ ] 无外键意味着完整性全靠应用层：`feat-004` 的接口约定里必须写清"下单前校验主体有效 + 状态流转白名单 + 订单号撞号重试"三项职责，否则容易出现脏数据
- [ ] 区域"后台可维护"目前只是数据结构层面：MVP 没有区域管理页面（7 个页面清单里没有，用户已确认不纳入实现计划），改数据走 `seed.sql` / 运维 SQL；页面化列入「未来候选」
- [ ] 景点 20 条使 `pages/index/index.vue` 必须做分页（原 10 条一屏能放完，改造时容易漏）→ `feat-006` 描述里已写明 2 页分页要求
- [ ] `seed.sql` 只初始化区域 / 套餐 / 景点；50 个地陪与订单位于 mock 生成逻辑，数据库里没有对应初始化脚本。若需要"库里也有 50 个地陪"的联调环境，需另补 `seed-guides.sql`（本次未做）
- [ ] 表结构若变更，必须同步 `docx/database/数据库设计.md` 与 `feature_list.json`，并重跑 `check-schema.mjs`

## 已做出的决策

- **用户 2026-09-26 的六条拍板**（全部写入 `docs/mvp-scope.json` 的 `deviations`）
  - dev-001 先选景点再选地陪 → 首页改为景点列表页，页面 6 → 7
  - dev-002 评价不要了 → 卡片与详情页去掉评分/评价
  - dev-003 地陪申请开通先不做 → 进 `futureUpgrades`，MVP 由 mock 预置
  - dev-004 先 mock 后接真实后端 → `useMock = true`，签名对齐 HTTP
  - dev-005 定稿「宣纸 · 疏」并删除原 `DESIGN.md` → 重写规范 + `uni.scss` 令牌落地
  - dev-006 图片用后端 URL、先用网络占位图、不要假 SVG → 原型移除自绘景点纹样，改真实网络图
- **现阶段不使用外键约束**（用户 2026-09-26 拍板）：表间只用 id 关联 + 索引，避免分库分表/高并发受限与本地线上约束不一致；完整性改由应用层保证（写入前校验、订单快照冗余、关系表唯一索引、状态流转白名单），`check-schema.mjs` 拦截任何 `FOREIGN KEY`
- **区域做成后台可维护的字典表（用户 2026-09-26 决策）**：`region_types` 加回，区域从 3 类扩到 **7 类**（新增川西古镇线 / 山野度假线 / 都市夜游线 / 亲子研学线），`attractions` 与 `guide_region_types` 改用 `region_type_id`。含义是：改区域名称、覆盖范围、排序、上下架都是改数据，不动代码
  - **配套的取舍**：MVP 的 7 个页面里没有"区域管理"页 → 先把数据结构做足，区域数据由 `seed.sql` 初始化、后续改动走运维 SQL；页面化管理列入 `futureUpgrades`（这与"MVP 只做 3 件事 / 7 个页面"的边界一致）
  - **前台过滤规则**：只展示「`status = 1` 且下有在售景点」的区域，避免出现点了是空列表的标签
  - **界面延后（用户已确认）**：区域管理界面**不纳入实现计划**，MVP 只把数据结构做足（表 + seed + 过滤规则），改数据走 seed / 运维 SQL；页面化列入「未来候选」
- **景点池 10 → 20（用户 2026-09-26 决策，dev-008）**：新增青城山、西岭雪山、龙泉山城市森林公园、黄龙溪古镇、街子古镇、洛带古镇、成都博物馆、金沙遗址博物馆、四川科技馆、夜游锦江（东门码头）。选点目的是**补齐原先生效不了的区域**：`山野度假线` 此前没有景点，现在由前 3 个激活，7 类区域全部有景点
  - 连带影响：景点列表页需要分页（20 条 → 2 页）；地陪擅长景点范围扩大；seed 与 mock 同步为 20 条
- **表结构精简为 10 张**：只精简掉 `order_status_logs`（MVP 只写不读 → 用 `orders.status` + `confirmed_at`/`finished_at`/`cancelled_at`/`cancel_reason` 表达），并写明加回条件；`guides`/`package_skus`/`guide_region_types` 三处经评估**保留不合并**，理由记在设计文档
- **mock 规模定为 50 个地陪**：确定性生成（固定 seed 伪随机），覆盖 7 类区域、每人 1-3 个区域标签、1-4 个擅长景点、1-3 个套餐报价、审核状态以已通过为主并保留少量待审/拒绝供后台演示；50 条正好验证 `pageSize=10` 的 5 页分页与「加载更多」
- **订单号规则定稿**：`CD + YYMMDD + 业务类型(A/B/C) + 4 位当日序号`。按字段长度相加是 **13 位**（需求里写的 14 位是笔误，已按 13 位定义为 `CHAR(13)`）；序号取当日同类型 `MAX + 1`，前缀 `LIKE 'CD260926A%'` 可走唯一索引，并发撞号由唯一索引兜底重试；单独建序列表留到出现持续并发冲突时再说
- **数据库必备列按「表语义」分类，不一刀切**：业务表（users/attractions/guides/package_skus/orders）带 `is_deleted` 软删除；从属配置表用 `enabled`/`is_available` 表达失效；关系表只有 `id + created_at`（只增只删、永不更新）。规则写进 `check-schema.mjs` 白名单，归错类别直接报失败
- **预约类型由套餐决定**：`package_skus.booking_type` 三选一，订单落库时复制该值；与定稿原型下单页结构一致（不再单独放「半天/全天/小时」选择器）
- **保留 `appointDate` / `timeSlot` 命名**：DB 与接口沿用 `appointment/my.vue`、`admin/appointment.vue` 已在用的字段名，降低重构成本；只清掉云开发遗留命名（`_id` → `id`、`createTime` → `createdAt`、`clerkName` → `guideNickname`）
- **视觉走 M3 骨架 + 文化表达**：用 M3 的色彩角色/字阶/形状/层级保证系统性，用竹青绿+宣纸底+系统宋体+字距保证文化感，同时不引入字体文件（体积为零成本项）
- **新增令牌校验门禁**：`uni.scss` 的 SCSS 顺序错误会直接导致全站构建失败，且出错点在「定义行右侧」，人眼很难发现 → 加静态校验 + 自检，纳入 `init.ps1` / `init.sh` 第 3 步
- **有意删除必须留痕**：`DESIGN.md` 删除记录进 `docs/legacy-assets.json` 的 `removedAssets`（原因 + 批准人），避免"资产静默消失"
- **产出文档纳入完成定义**：任何 feat 标 `done` 前必须产出 `docx/codeimpl-sum/` 设计文档；任何 bug 修复必须产出 `docx/bugfix/` 文档，并登记到本文件的「本次会话修改的文件」
- **gap-003 用"移除入口"而不是"新建编辑页"**：MVP 的地陪审核只需通过/拒绝
- **价格用整数「元」，不改造 `utils/index.js` 的 `formatPrice`**（它把入参当分，且当前无页面调用；该文件保持 `keep` 档）

## 未来候选（MVP 之后再说，现在不许实现）

地陪自助申请开通 + 平台审核、**后台区域管理界面**（表结构已就绪，只差页面）、**景点池继续扩展**（成都自然博物馆、天府艺术公园、彭州白鹿镇等）、评价与评分体系、真实后端 HTTP 对接、IM 聊天、多城市、动态定价、自动结算、团购/分销、广场发单、达人等级、复杂排班、行程日志与轨迹回放、门店管理

## 本次会话修改的文件

- `DESIGN.md` - **重写（原陪玩 Linear 规范删除）**：定稿「宣纸 · 疏」，含 M3 色彩角色、字阶、形状、层级、纹理、图片策略、组件规范、7 屏结构、uni-app 落地注意
- `uni.scss` - **重写**：`$uni-*` 重新赋值（主色改竹青绿）+ 新增 `$ds-*` 项目令牌（与 DESIGN.md 一一对应）
- `design/html/prototype.html` / `prototype.css` / `prototype.js` - 新建：7 屏 HTML 原型，定稿主题宣纸 · 疏，封面与头像改为网络图片 URL，移除自绘景点 SVG
- `docx/接口文档.md` - 新建：接口对照基准骨架（现状 Api 签名 + MVP 待补清单），并指向数据库设计与 api-design 规范
- `docx/database/schema.sql` - 新建并定稿：10 张表，全程无外键，订单号 `CHAR(13)`，末尾列出禁止与精简掉的表
- `docx/database/seed.sql` - 新建并扩充：初始化数据（区域 7 / 套餐 3 / 景点 20），可重复执行，封面用网络占位图
- `docx/database/数据库设计.md` - 新建并定稿：表清单与精简代价、订单号规则（含映射与序号生成）、关键决策（预约类型由套餐决定 / 冗余字段 / 无外键+应用层保证 / 软删除分类）、字段三方映射、索引理由、mock 落地约定
- `scripts/check-schema.mjs` - 新建：表结构校验（表名规范 / 必备列分类 / 金额 DECIMAL / 索引命名 / COMMENT / MVP 边界）+ `--self-test` 自检
- `AGENTS.md` - 新增「项目内技能」章节（`.codebuddy/skills/` 下的 api-design / database-design / uniapp）；必需产物加入 schema；完成定义加入令牌与表结构校验；验证命令扩为 5 步
- `docx/codeimpl-sum/.gitkeep` / `docx/bugfix/.gitkeep` - 新建：归档目录占位与命名说明
- `docx/bugfix/BUG修复-20260926-uni-scss变量顺序导致构建失败.md` - 新建：本次修复的 SCSS 顺序 bug 归档（现象/复现/根因/修复/改动/回归）
- `docx/bugfix/BUG修复-20260926-H5登录uni-login不支持.md` - 补档：会话前段 H5 登录修复的归档
- `docx/bugfix/BUG修复-20260926-资产台账JSON被改坏.md` - 新建：台账 JSON 损坏 + 校验脚本报错不友好的修复归档
- `scripts/check-tokens.mjs` - 新建：设计令牌校验（SCSS 先定义后使用 / CSS 自定义属性 / DESIGN.md 与 uni.scss 色值对齐）+ `--self-test` 自检
- `scripts/verify-assets.mjs` - 加固：新增 `readJson()`，JSON 损坏时输出「哪个文件 + 修复建议」并退出码 1，不再抛 Node 堆栈
- `init.ps1` / `init.sh` - 验证入口由 3 步扩为 4 步，插入「设计令牌校验」
- `AGENTS.md` - 增补「文档归档（docx/）」章节；完成定义加入设计文档与 Bug 文档要求；业务范围路径改为 `docs/`
- `docs/mvp-scope.json` - 新增 `dev-005`（视觉定稿）、`dev-006`（图片策略）、`designSystem`、`imageStrategy`；`source` 路径修正为 `docs/`
- `docs/legacy-assets.json` - 移除 `DESIGN.md` 资产条目并记入 `removedAssets`；更新 `uni.scss` 条目与 gap-004 描述
- `docs/legacy-assets.md` - 同步移除记录、资产总览、可复用骨架的设计规范段、改造清单与缺口表
- `feature_list.json` - 按一致性审计结论重写：修正 12 处与原型/MVP/现有代码的不一致，新增 `prototypeSource` / `designSource` / `docPolicy`
- `docs/mvp-scope.json` - 审计同步：新增 `bookingTypeUi`，修正 `pageMappingNote` 计数矛盾，`outOfScope` 增补投诉与景点搜索筛选
- `api/constants.js` - 新建：领域常量单一来源（订单四态、流转白名单、预约类型、时段、角色、审核状态、订单号规则与生成函数）
- `api/errors.js` - 新建：统一错误契约（`ApiError` + 错误码 + HTTP 状态映射），与 api-design 的错误体一致
- `api/mock/seed.json` - 新建：7 区域 / 3 套餐 / 20 景点（与 `docx/database/seed.sql` 对齐）+ 生成素材池
- `api/mock/generate.js` - 新建：确定性生成器（52 用户 / 50 地陪 / 关系 / 16 订单），无 import 以便静态校验
- `api/mock/index.js` - 新建：内存仓库 + 业务规则（查询、分页、下单校验、状态流转、订单号）+ 旧模块过渡适配层
- `api/http.js` - 新建：HTTP 适配层骨架（完整 `ROUTES` 路由表 + request 封装，方法抛 NOT_IMPLEMENTED）
- `api/index.js` - **重写（已登记 + 刷新哈希）**：数据层出口，`USE_MOCK` 开关 + 新模块导出 + 旧模块兼容
- `scripts/check-mock.mjs` - 新建：mock 数据层校验（与 seed.sql 一致 / 规模 / 确定性 / 自洽性 / MVP 边界）+ `--self-test`
- `docx/接口文档.md` - **重写**：6 个模块 × 25 个方法 × HTTP 路由 × 错误约定 × 应用层完整性职责 × 过渡适配层说明
- `docx/codeimpl-sum/设计文档-feat-004-MVP数据层.md` - 新建：六章节齐全（目标范围 / 接口 / 文件结构与实现 / 状态与数据流 / 验证证据 / 遗留问题）
- `docx/bugfix/BUG修复-20260926-订单生成取值崩溃.md` - 新建：崩溃 + 校验器脆弱性的修复归档
- `docx/database/schema.sql` - 补 `orders.guide_accepted_at`（四态不足以表达「待地陪接单 / 待平台确认」）
- `docx/database/数据库设计.md` - 补 3.5 节说明该字段与调用语义；章节编号顺延；变更记录追加
- `init.ps1` / `init.sh` - 验证入口由 5 步扩为 6 步，插入「mock 数据层校验」
- `docs/legacy-assets.json` / `docs/legacy-assets.md` - 审计同步：gap-001 补「不新增本地占位图」的 resolution，gap-002 补协议页注册说明
- `progress.md` - 本文件
- `session-handoff.md` - 按定稿与归档规则重写交接内容

## 完成证据

- [x] 资产保真校验：`node scripts/verify-assets.mjs` → 通过（22 条在册资产哈希一致 + 1 条 removedAssets 记录）
- [x] 标准入口：`./init.ps1` → 1/3 环境 + 2/3 保真校验通过（3/3 因缺 node_modules 按设计跳过）
- [x] 反向测试（资产）：篡改副本资产哈希 → 输出「资产被修改」且退出码 1
- [x] 反向测试（JSON 损坏）：临时目录写入畸形台账 → 输出「不是合法 JSON + 常见原因」且退出码 1（本轮真实触发过一次：补 `resolution` 时多写 `}` 被门禁当场拦住，已归档为 bugfix）
- [x] 原型自检：HTML 标签栈 0 未闭合 / 0 不匹配；位图引用来自网络 URL（`<img>` 14 处），无自绘景点 SVG
- [x] 设计令牌校验：`node scripts/check-tokens.mjs` → 通过（uni.scss 95 个变量 / 15 处引用无未定义；prototype.css 48 个自定义属性均有定义；DESIGN.md 20 个色值全部落到 uni.scss）
- [x] 令牌校验自检：`node scripts/check-tokens.mjs --self-test` → 通过（SCSS 顺序 / CSS 属性 / 色值脱钩三类问题均能检出，证明门禁非空）
- [x] 令牌同步：`DESIGN.md` 与 `uni.scss` 的色值与字号逐项对齐（M3 角色 ↔ `$ds-*`）
- [x] 一致性审计：`feature_list.json` × 定稿原型 7 屏 × MVP 要求 × 现有代码 交叉核对，发现 12 处不一致并全部修正（见上方审计表）
- [x] 表结构校验：`node scripts/check-schema.mjs` → 通过（10 张表 / 108 字段 / 33 条索引与约束；外键约束：未使用）
- [x] 表结构校验自检：`node scripts/check-schema.mjs --self-test` → 通过（21 类违规均能检出，含拦截 `FOREIGN KEY`）
- [x] 规格自检：`regionTypes=7`、`mockScale.guides=50`、`mockScale.attractions=20`、`deviations=8`；`schema.sql` 注释外 `FOREIGN KEY` 出现 0 次；`seed.sql` 含区域 7 条 + 套餐 3 条 + 景点 20 条；7 类区域均有景点
- [x] 技能自带脚本交叉确认：`bash .codebuddy/skills/database-design/check-db.sh` 能识别 SQL 文件与建表语句；它报「未发现索引定义」是误报（只匹配 `CREATE INDEX`），原因记在 `数据库设计.md`
- [x] mock 数据层校验：`node scripts/check-mock.mjs` → 通过（一致性 7/3/20、确定性一致、规模 52/50/20/7/3/16、可下单 44/44、订单号 16 唯一、待接单 3、无评价字段、页面未直连 mock）
- [x] mock 校验自检：`node scripts/check-mock.mjs --self-test` → 通过（一致性 / 数据自洽 / MVP 边界三类问题均能检出）
- [x] harness 审计：`validate-harness.mjs` 100/100
- [ ] 小程序构建：未执行（缺依赖）

## 给下一会话的备注

- 先跑 `./init.ps1`，绿了再动代码。
- **范围看 `docs/mvp-scope.json`，视觉看 `DESIGN.md`**，这两个是唯一事实来源；原始 MVP 文档的 6 处内容已被用户拍板修订。
- 改颜色/字号时必须同时改 `DESIGN.md` + `uni.scss`（+ 需要时 `prototype.css`），三处不一致视为未完成。
- 图片一律走后端 URL 字段（`coverUrl` / `avatarUrl`），不要再用自绘 SVG 或几何插画代替。
- **标 `done` 前必须有 `docx/codeimpl-sum/` 设计文档**；改 bug 必须有 `docx/bugfix/` 文档；两者都要登记到本文件的「本次会话修改的文件」。
- `pages.json` 后续会被改 4 次（协议页、地陪列表页、下单页、接单页）：每次改完登记 + `--update`。
- `init.ps1` 必须保持 UTF-8 BOM 编码。
