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
- **例外：地陪头像**用仓库内本地素材 `static/guide/`（39 张，文件名 = 姓名拼音，如 `caoyiming.jpg` = 曹一鸣）。素材池在 `api/mock/seed.json` 的 `generators.guideAvatarFiles`，由 `scripts/check-mock.mjs` 校验与目录一致，池空时自动退回网络占位图。**注意包体**：这 39 张合计 12.56MB，超出小程序主包 2MB 上限，上小程序前需压缩或改走后端 URL
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
- **tabBar**：当前 2 项（首页 / 我的）。M3 建议 3-5 项，等"订单"独立成 tab 后再补第三项。背景 `$ds-surface-container`、上发丝线（见第 12 节第 5 条），图标为代码生成的线性图标（见第 9 节）。二级页面（地陪列表 / 详情 / 下单 / 订单 / 接单 / 后台）不显示 tabBar，改为「返回 + 底部操作栏」，底部操作栏的底色与 tabBar 一致，视觉上仍是一条连续的下沿。
- **统计条**：3 格均分，中间为关键数（朱砂），用于地陪端与后台。
- **开关**：竹青实底 + 白色圆点，关闭态为灰底。

---

## 9. 图标

- 自绘线性图标，24×24 网格，`stroke-width: 1.6`，圆头圆角，填充透明
- 线性描边与竹青气质一致，避免圆润填充型图标带来的"消费类 App"感
- 图标不作为图片资源引入：优先图标字体或本地 `.svg`；原型中的内联 `<use>` 仅为演示
- 颜色只用 `currentColor`，随文字色变化，不单独给图标上色

**tabBar 图标是唯一例外**：小程序 tabBar 只接受本地图片（不支持 svg 与字体图标），颜色必须落在文件里。因此 `static/tabbar/{home,mine}{,-active}.png` 由 `scripts/gen-tabbar-icons.mjs` **代码生成**：按本节规范（24 网格 / stroke 1.6）栅格化、4×4 超采样抗锯齿、PNG 由 node 内置 zlib 手写，颜色**直接从 `uni.scss` 读取**（未选中 `$ds-ink-2`、选中 `$ds-primary`）。

- 改令牌后重跑：`node scripts/gen-tabbar-icons.mjs`
- 校验现有图标与令牌是否一致：`node scripts/gen-tabbar-icons.mjs --check`
- **不要手工替换这 4 张图**（重构前遗留的灰+粉图标就是这样与设计系统脱钩的）

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
5. tabBar：`selectedColor` 用 `#2F6B5E`，未选中配色 `#6B6862`，**背景用 `#FBFAF5`（`$ds-surface-container`）而不是纯白** —— 原型里是「宣纸 + 8% 白」的 `color-mix`，小程序配置不支持 `color-mix`，取最接近的令牌；`borderStyle: white`（平台只支持 black/white，发丝线用白更接近 `outline-variant` 的观感）。图标由 `scripts/gen-tabbar-icons.mjs` 生成，见第 9 节

---

## 13. 动效（Motion）

动效只解决三件事：**内容被整批替换时不要瞬移**、**页面被整批替换时不要瞬移**、**状态切换要看得见**。除此之外一律不加动效。

### 13.1 时长与曲线（落地为 `uni.scss` §1.8 的 `$ds-dur-*` / `$ds-ease-*`）

| 场景 | 时长 | 曲线 | SCSS |
|---|---|---|---|
| 按压反馈 | 140ms | `--ease-out` | `$ds-dur-press` |
| 颜色 / 背景 / 边框等状态切换（chip、页签文字、单选、开关底） | 160ms | `--ease-out` | `$ds-dur-fast` |
| 页签指示器滑动、分段滑块 | 280ms | `--ease-in-out` | `$ds-dur-slide` |
| **内容切换**（分类切换、加载更多的新项） | **360ms** | `--ease-out` | `$ds-dur-base` |
| 页面进入 | 320ms | `--ease-out` | `$ds-dur-page` |
| 页面退出（返回） | 260ms | `--ease-in-out` | `$ds-dur-page-leave` |
| 加载指示器转一圈 | 900ms | `linear` + `infinite` | `$ds-dur-spin` |

曲线取强缓动，不用 CSS 内置关键字：

```scss
$ds-ease-out: cubic-bezier(0.23, 1, 0.32, 1);      /* 入场 / 出场 */
$ds-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* 屏上移动 */
```

**内容切换刻意用满预算（360ms）。** 这一类动效一次替换整屏内容、且不常发生，慢一点才能看清「新内容是从哪边换过来的」；按压反馈反过来必须跟手（140ms）。**UI 动效一律 ≤ 400ms。** 唯一超预算的是加载指示器：它是常量运动（进度），本就该用 `linear` 且可以慢。

`uni.scss` 的这批时长与 `utils/motion.js` 的 `MOTION` 常量**必须成对修改**（JS 里的 `setTimeout` 要用同一份时长），`scripts/check-motion.mjs` 会逐项比对，不一致直接失败。

### 13.2 只动 transform 与 opacity

`width / height / margin / padding / top / left` 会触发 layout + paint + composite，一律禁止。允许动画的属性白名单：

`transform`、`opacity`、`color`、`background-color`、`border-color`

页签指示器与分段滑块**只改 `transform`**：等宽页签用 `translateX(100% × 下标)`（百分比按自身宽度算，天然等于一个页签宽），不碰 `width`。

### 13.3 五组动效与它们的用途

| 动效 | 位置 | 用途 | 落法 |
|---|---|---|---|
| 内容切换（方向性入场） | 景点列表 / 地陪列表 / 订单 / 接单 / 后台 | 防止瞬移 + 空间一致性：从行进方向那一侧进来 | 卡片 `ds-enter-next` / `ds-enter-prev`，逐项延迟 +60ms 封顶 300ms |
| 加载更多（上浮入场） | 同上五个列表 | 防止瞬移：只有新追加的那几项入场 | 卡片 `ds-enter-up`，延迟基准 = 追加前的列表长度 |
| 页面转场（进入 / 返回） | 全部 11 个页面 | 防止瞬移：换页时不要硬切 | 根节点 `is-page-in` / `is-page-out`，见 §13.4 |
| 指示器移动 | 四态页签、地陪审核页签、两段分段控件 | 状态指示：说明当前在哪一项 | 页签下划线 / 分段滑块 `translateX`，280ms `--ease-in-out` |
| 状态过渡 | chip 选中、套餐单选、可约日期、在线开关、角色切换 | 状态指示：让变化被看见 | 颜色类属性 160ms `--ease-out`；开关滑块改 `transform` |

### 13.4 页面转场（多端差异必须清楚）

三个平台的页面切换走的是三套不同机制，**不能一套代码硬套**：

| 平台 | 机制 | 我们的做法 |
|---|---|---|
| 小程序（含微信） | `navigateTo` / `navigateBack` **本身就是原生转场动画** | 什么都不加。自己再动一层会变成双重动画 |
| H5 | 官方配置 `animationType` **不生效**，要自己用 CSS 模拟 | 进入：根节点常带 `is-page-in`，页面被创建时播一次；返回：`is-page-out` 播完再真正 `navigateBack()` |
| App | 官方配置生效 | `pages.json` 的 `globalStyle.app-plus` 配 `slide-in-right` / 320ms |

H5 这套实现放在 `utils/motion.js` 的 `createPageMotion()`（`pageMotion` + `goBackWithMotion()`），各页 `goBack()` 只调 `goBackWithMotion()`。**进/出动画与两个 class 都用条件编译只对 H5 生效**，所以小程序端行为与没加过完全一致。

返回的离场动画刻意**不淡到 0**（`opacity → 0.15` + 右移 40%）：全站页面底色都是同一张宣纸，露出来的那一块与上一页的底色一致，换页那一下几乎看不出来；淡到 0 反而会先闪一下空底再切。

### 13.5 按压反馈

统一用 uni-app 的 `hover-class="is-pressed"`（小程序里 `:active` 不可靠），并配 `hover-stay-time="70"`（默认 400ms 会让按下后迟迟不回弹）。一个按压状态由两层组成：

1. `transform: scale(0.96)` + 140ms `--ease-out` —— 物理回弹感
2. `::after` 叠一层 `currentColor` 8% —— 照 §8 按钮规范「用 8% 主色叠层，不用 opacity 变暗」；叠的是元素自己的文字色，深底按钮上就是一层浅色高光

**凡是可点的东西都要有**：卡片、按钮、页签、chip、分段项、菜单行、返回图标、步进器、勾选框、协议链接。

### 13.6 明确不做动效的地方

- **数字**：金额、统计条、步进器的人数 / 小时数 —— 用户正在读或正在操作的数字不要为了好看而动
- **Toast、Modal、picker、下拉刷新**：平台自带，不加自定义动效
- **长期高频的操作**：列表滚动 —— 天天几十上百次的东西，越安静越好

### 13.7 降低动效

`prefers-reduced-motion: reduce` 时**不是关掉全部**，而是去掉位移与回弹、保留淡入（淡入帮助理解状态变化）。规则写在 `App.vue` 的全局样式末尾：列表入场与页面进入统一换成 `ds-fade-in`，页面退出换成 `ds-page-fade-out` —— 这也是入场动画名必须写在 class 里、而不是内联 `animation-name` 的原因（内联样式覆盖不掉）。

### 13.8 工程约定

- keyframes 全部放在 `App.vue` 的**全局**样式里：页面样式是 `scoped` 的，各自声明会被编译成不同名字，七屏共用不了
- 入场动画的 `animation-fill-mode` 用 **`backwards`** 而不是 `both`：延迟期间先按首帧藏住，播完交还普通样式；用 `both` 会残留一个 `transform: translateX(0)`，把按压反馈的 `scale` 盖掉
- 页面侧的通用计算在 `utils/motion.js`（`createListEnter()` / `createPageMotion()` / `staggerDelay()` / `stepDirection()`），不要各页自己算延迟、也不要各页自己写返回动画
- 动效约束由 `scripts/check-motion.mjs` 把关（禁 `transition: all`、禁 `ease-in`、禁超 400ms、禁 `scale(0)`、禁动画 layout 属性、禁页面内 `@keyframes`、禁内联 `animationName`、禁 `:hover`、禁 `utils/motion.js` 与 `uni.scss` 的时长不一致）

---

## 14. 变更记录

| 日期 | 变更 |
|---|---|
| 2026-09-26 | 定稿「宣纸 · 疏」。替换原陪玩小程序 Linear 风格规范（原文件已删除）；确立竹青绿主调、M3 令牌骨架、图片来自后端 URL 的策略。原型：`design/html/prototype.html` |
| 2026-09-26 | tabBar 图标改为**代码生成**（线性 24 网格 / stroke 1.6；未选中 `$ds-ink-2`、选中 `$ds-primary`），修掉「粉色图标 + 竹青文字」的不一致。生成器：`scripts/gen-tabbar-icons.mjs` |
| 2026-09-26 | 新增 §13 动效：时长/曲线令牌（`uni.scss` §1.8）、属性白名单（只动 transform / opacity + 颜色）、四组动效（内容切换 / 加载更多 / 指示器移动 / 状态过渡）、按压反馈用 `hover-class`、`prefers-reduced-motion` 降级、明确不做的地方。门禁：`scripts/check-motion.mjs` |
| 2026-09-26 | §13 修订：① 内容切换放慢到 **360ms**（逐项 +60ms 封顶 300ms），预算由 300ms 放宽到 400ms；新增 `$ds-dur-slide`（指示器 280ms）；② 新增 §13.4 **页面转场**（小程序原生 / H5 用 CSS 模拟进入与返回 / App 用 `pages.json` 的 `app-plus`）；③ §13.5 按压反馈补 `::after` 8% 叠层，并把按压覆盖到全部可点元素；④ 门禁加「`utils/motion.js` ↔ `uni.scss` 时长一致性」 |
