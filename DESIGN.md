# DESIGN.md — 成都景点地陪小程序 · 视觉与交互规范

> 定稿主题：**宣纸 · 疏**
> 结构基线：Material Design 3 令牌（色彩角色 / Type Scale / Shape / Elevation / State Layer / Motion）
> 文化表达：竹青绿主调 + 宣纸底 + 系统宋体标题 + 朱砂点睛
> 可交互原型：`design/html/prototype.html`（7 屏）
> 落地令牌：`uni.scss`（本文件所有色值与字号都有同名 SCSS 变量，二者必须同步修改）

本地文件替换了原有陪玩小程序的 Linear 风格规范（原 `DESIGN.md` 已删除，见 `docs/legacy-assets.json` 的 `removedAssets`）。

---

## 1. 设计原则

1. **竹青绿只做一件事**：所有可点、选中、强调的元素用主色；其余一律用墨色与灰阶。一屏只有一个视觉重点。
2. **朱砂只给钱**：`tertiary` 角色全站只用于价格与关键数字，出现次数越少越有效。
3. **宣纸底替代纯白**：页面背景不是 `#FFFFFF`，是 `#F7F4ED`。这是成本最低、收益最高的"文化感"手段。
4. **文化感零成本**：不加载网络字体、不采购图片，文化感靠字体栈、字距、留白、发丝线与纸感底色实现。
5. **密度分区**：游客端低密度（看得舒服、敢下单），地陪端与后台高密度（看得快、处理得多）。

---

## 2. 色彩（M3 色彩角色）

### 2.1 主色与强调

| 角色 | Hex | SCSS | 用途 |
|---|---|---|---|
| primary | `#2F6B5E` | `$ds-primary` | 主按钮、选中态、可点文字、图标强调 |
| on-primary | `#FFFFFF` | `$ds-on-primary` | 主色上的文字 |
| primary-container | `#DCE8E2` | `$ds-primary-container` | 次级按钮底、头像底、纹样底 |
| on-primary-container | `#12332D` | `$ds-on-primary-container` | 容器上的文字 |
| primary-dim | `#8FB3A6` | `$ds-primary-dim` | 空状态图标、禁用态强调 |
| tertiary（朱砂） | `#B4462F` | `$ds-tertiary` | **仅**价格、关键数字、取消类操作 |
| tertiary-container | `#F6E4DF` | `$ds-tertiary-container` | 朱砂的浅底 |

### 2.2 中性色（宣纸）

| 角色 | Hex | SCSS | 用途 |
|---|---|---|---|
| surface | `#F7F4ED` | `$ds-surface` | 页面背景（宣纸） |
| surface-container | `#FBFAF5` | `$ds-surface-container` | 卡片底（比页面略亮，靠对比而非阴影分层） |
| surface-container-high | `#ECEAE2` | `$ds-surface-high` | 分段控件底、已完成标签底 |
| on-surface | `#1F1D1A` | `$ds-ink` | 标题、正文 |
| on-surface-variant | `#6B6862` | `$ds-ink-2` | 辅助文字、标签、说明 |
| outline | `#D8D2C6` | `$ds-outline` | 描边按钮、chip 边框 |
| outline-variant | `#E7E2D7` | `$ds-outline-variant` | 发丝分割线、卡片边框 |

### 2.3 状态色（不套系统绿橙红，全部落进竹青调性）

| 语义 | Hex | SCSS | 容器底 |
|---|---|---|---|
| 成功 / 已确认 | `#3D7A5F` | `$ds-success` | `#DFECE4` |
| 待处理 / 待确认 | `#9A7124` | `$ds-warning` | `#F4E9D4` |
| 危险 / 已取消 | `#A83A2A` | `$ds-error` | `#F6E2DE` |
| 中性 / 已完成 | `#6B6862` | `$ds-ink-2` | `#ECEAE2` |

### 2.4 用色比例

约 **60% 宣纸/白、30% 墨色文字与灰阶、10% 竹青**，朱砂占比 < 1%。任何一屏竹青面积超过 20% 就要回头检查。

---

## 3. 字体

### 3.1 字体栈（不加载任何字体文件）

```scss
$ds-font-title: "Songti SC", "STSong", "Noto Serif SC", "Source Han Serif SC", "SimSun", serif;
$ds-font-body: system-ui, -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
```

标题用系统宋体（macOS `Songti SC` / Windows `SimSun` 回退），正文用系统黑体。**不引入思源宋体等字体文件**：中文字体包 3-8MB，对小程序首屏是硬伤。

### 3.2 字阶（取 M3 Type Scale 中移动端够用的 9 级）

| 角色 | 字号 / 行高 | 字重 | SCSS | 用途 |
|---|---|---|---|---|
| Display Small | 27 / 1.2 | 700 | `$ds-fs-display` | 页面主标题（宋体） |
| Headline Small | 22 / 1.25 | 700 | `$ds-fs-headline` | 大区块标题 |
| Title Large | 20 / 1.3 | 700 | `$ds-fs-title-lg` | 金额、统计数字 |
| Title Medium | 16 / 1.4 | 700 | `$ds-fs-title` | 卡片标题、导航标题（宋体） |
| Body Large | 15 / 1.55 | 400 | `$ds-fs-body` | 正文 |
| Body Medium | 14 / 1.55 | 400 | `$ds-fs-body-sm` | 次要正文 |
| Label Large | 13 / 1.35 | 500-600 | `$ds-fs-label` | 按钮、标签 |
| Label Medium | 12 / 1.3 | 500 | `$ds-fs-label-sm` | 说明、辅助 |
| Caption | 11 / 1.3 | 500 | `$ds-fs-caption` | 角标、单位 |

### 3.3 中文标题字距

所有宋体标题加 `letter-spacing: 0.04em`（`$ds-ls-title`）。这是"文化感"的第二来源，仅次于宣纸底色。

---

## 4. 形状与层级

### 4.1 圆角（只保留 4 档，禁止"处处大圆角"）

| 档位 | 值 | SCSS | 用途 |
|---|---|---|---|
| xs | 6px | `$ds-shape-xs` | 小标签、日期块 |
| sm | 10px | `$ds-shape-sm` | 按钮、头像、缩略图、输入框 |
| md | 12px | `$ds-shape-md` | 卡片、面板 |
| lg | 20px | `$ds-shape-lg` | 底部弹层、抽屉 |
| full | 999px | `$ds-shape-full` | chip、圆形按钮、开关 |

### 4.2 层级（只保留 3 级）

| 级别 | 表现 | 用途 |
|---|---|---|
| 0 | 发丝线 `1px outline-variant` | 默认卡片（宣纸·疏 的默认状态，靠留白分层） |
| 1 | 柔和阴影 `0 1px 2px rgba(31,29,26,.04), 0 10px 24px -18px rgba(31,29,26,.22)` | 需要浮起的卡片（浮层、选中项） |
| 3 | 上边线 + 向上柔影 | 底部固定操作栏、tabBar |

不使用 M3 全部 6 级：宣纸底上叠太多阴影会显脏。

---

## 5. 间距与触摸

- 基数 8px：`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40`（`$ds-space-1` ~ `$ds-space-8`）
- 页面左右安全边距：**20px**（`$ds-pad-screen`）
- 卡片内边距 16px，卡片之间 12px
- 触摸目标 ≥ 44px，列表行 ≥ 56px，主按钮高 48px
- 导航栏高 52px，tabBar 高 74px（含底部安全区），底部操作栏 14px + 安全区

---

## 6. 纹理（纯 CSS，零图片）

| 纹理 | 实现 | 参数（宣纸 · 疏） |
|---|---|---|
| 宣纸颗粒 | `radial-gradient` 点阵 | 点 0.9px / 间距 4px，透明度 0.07 |
| 竹影竖纹 | 已按"宣纸 · 疏"关闭 | 需要时用 `repeating-linear-gradient(90deg, rgba(47,107,94,.5) 0 1px, transparent 1px 26px)`，透明度 ≤ 0.05 |

颗粒必须极淡。它的作用是"消除纯数字感"，不是制造噪点。

---

## 7. 图片策略（重要）

**图片一律来自后端，页面不内置任何插画。**

- 数据字段：景点 `coverUrl`、地陪 `avatarUrl`，由接口返回完整 URL
- 渲染：`<image :src="item.coverUrl" mode="aspectFill" />`，固定容器尺寸、圆角由容器控制
- 占位与兜底：`mini-program` 加载失败或字段为空时，容器显示 `primary-container` 底色 + 竹青描边（不发散、不拉伸、不显示破图）
- MVP 阶段统一使用**网络占位图**（原型中即为真实网络链接），后端接入后直接替换 URL，样式与尺寸不变
- **禁止**用抽象几何插画或自绘 SVG 冒充景点照片

| 位置 | 尺寸 | 圆角 | 说明 |
|---|---|---|---|
| 景点卡封面 | 76×76（列表）/ 16:9（如需大图） | `$ds-shape-sm` / `$ds-shape-md` | 列表用方形小图，避免抢标题 |
| 地陪头像 | 60×60（列表）/ 44×44（订单卡） | `$ds-shape-sm` / `$ds-shape-xs` | 一律方形圆角，不用圆形 |
| 头像内框 | inset 4px 发丝线 | 5px | 让照片不"飘"在宣纸底上 |

---

## 8. 组件规范

### 按钮（M3 变体，只保留 4 种）

| 变体 | 样式 | 用途 |
|---|---|---|
| Filled | 竹青底 + 白字 | 一屏一个主操作（立即预约、提交预约、接单、确认档期） |
| Tonal | `primary-container` 底 + 深竹字 | 次级正文操作（看详情、完成服务） |
| Outlined | 发丝描边 + 墨字 | 中性操作（取消预约、拒单） |
| Danger | 朱砂描边 + 朱砂字 | 破坏性操作（处理取消） |
| Text | 竹青文字按钮 | 行内轻操作 |

统一：高 48px（小号 40px）、圆角 10px、字重 600、`:active` 用 8% 主色叠层，**不用 opacity 变暗**。

### 其他组件

- **筛选**：一级用文字页签 + 竹青下划线（`.tabline`），二级用 chip（选中态为 `secondary-container` 实底）。不要两处都用胶囊，层级会糊。
- **卡片**：默认只有发丝线，没有阴影；只有一个主操作位。
- **标签**：`tag`（描边）/ `tag--solid`（实底）/ `tag--quiet`（灰）三档；状态标签四态固定配色（待确认=姜黄、已确认=竹青、已完成=灰、已取消=朱砂）。
- **头像**：方形圆角 + 内嵌发丝框（见第 7 节）。
- **表单行**：左标签右值，高 56px，值可带一行小字说明；备注用 textarea。
- **底部操作栏**：左侧金额（`Title Large` + 朱砂）+ 右侧主按钮，sticky 贴底，向上柔影。
- **tabBar**：当前 2 项（首页 / 我的）。M3 建议 3-5 项，等"订单"独立成 tab 后再补第三项。
- **统计条**：3 格均分，中间为关键数（朱砂），用于地陪端与后台。
- **开关**：竹青实底 + 白色圆点，关闭态为灰底。

---

## 9. 图标

- 自绘线性图标，24×24 网格，`stroke-width: 1.6`，圆头圆角，填充透明
- 线性描边与竹青气质一致，避免圆润填充型图标带来的"消费类 App"感
- 图标不作为图片资源引入：优先图标字体或本地 `.svg`；原型中的内联 `<use>` 仅为演示
- 颜色只用 `currentColor`，随文字色变化，不单独给图标上色

---

## 10. 七屏结构（对应 MVP）

| # | 页面 | 结构要点 |
|---|---|---|
| 01 | 景点列表（首页） | 宋体大标题 + 区域文字页签 + 景点卡（封面 76×76 / 名称 / 区域 / 「N 位地陪可约」） |
| 02 | 地陪列表 | 导航栏 + 摘要行 + chip 筛选 + 地陪卡（头像 / 名称 / 接单数 / 区域标签 / 服务类型 / 价格） |
| 03 | 地陪详情 | 身份块（头像 + 标签 + 简介 + 三项指标）→ 擅长景点 → 3 个套餐单选 → 可约日期 → 底部操作栏 |
| 04 | 下单页 | 景点/地陪/套餐只读回显 + 日期 + 时段分段控件 + 人数步进器 + 备注 + 底部操作栏 |
| 05 | 订单页 | 四态文字页签 + 订单卡（头像 / 标题 / 订单号 / 状态标签 / dt-dd 信息 / 金额 / 操作） |
| 06 | 接单页（地陪端） | 统计条 + 在线开关 + 待接单卡（拒单描边 / 接单实底）+ 进行中卡 |
| 07 | 后台订单管理 | 统计条 + 日期与状态筛选 + 订单卡（游客信息）/ 一单一个主操作 |

密度约定：01-05 为低密度（游客端），06-07 提高一档（缩小字号与内边距、加大信息量）。

---

## 11. Do / Don't

### Do

- 每屏只留一个主操作，且用 Filled 竹青按钮
- 价格一律用朱砂 + Title Large 字号，是卡片里最大的数字
- 中文标题加字距、用宋体；正文用系统黑体
- 图片一律 `aspectFill` + 固定容器尺寸
- 状态用标签配色表达，不用图标或颜色铺满整卡

### Don't

- 不要用纯白 `#FFFFFF` 做页面背景（用宣纸 `#F7F4ED`）
- 不要给每个卡片都加阴影（默认只有发丝线）
- 不要引入网络字体、位图纹理、自绘插画冒充照片
- 不要在一屏里放两个同等重要的按钮
- 不要用紫蓝渐变、玻璃拟态、无意义光斑
- 不要把筛选做成两排都是胶囊标签
- 不要在 MVP 阶段做评价、IM、动态定价等非闭环功能

---

## 12. uni-app 落地注意

1. `uni.scss` 会被自动注入所有页面的 `<style lang="scss">`，`$ds-*` 变量可直接使用，无需 `@import`
2. 小程序端需替换的 CSS：`color-mix()` → 直接写色值；`inset: 0` → `top/right/bottom/left: 0`；`backdrop-filter` → 去掉或用不透明底色；`::before/::after` 伪元素在 `view` 上可用但避免复杂组合
3. 原型用 px，落地建议整体换算 `rpx`（1px 视觉 ≈ 2rpx），页面安全边距 20px → 40rpx
4. 保留 `pages.json` 的 `navigationStyle: custom`，自绘 `status-bar`（`uni.getSystemInfoSync().statusBarHeight`）+ 52px 导航栏
5. tabBar 颜色：`selectedColor` 用 `#2F6B5E`，未选中 `#6B6862`，背景 `#FFFFFF`，`borderStyle: white`

---

## 13. 变更记录

| 日期 | 变更 |
|---|---|
| 2026-09-26 | 定稿「宣纸 · 疏」。替换原陪玩小程序 Linear 风格规范（原文件已删除）；确立竹青绿主调、M3 令牌骨架、图片来自后端 URL 的策略。原型：`design/html/prototype.html` |
