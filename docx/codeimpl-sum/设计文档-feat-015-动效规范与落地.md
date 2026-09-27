# 设计文档 · feat-015 动效规范与落地

> 日期：2026-09-26
> 依赖：feat-006 ~ feat-013（七个页面与令牌收口已完成）、`utils/hscroll.js`（页签居中与横滑）
> 规范来源：`DESIGN.md` §13（新增）· 令牌：`uni.scss` §1.8（新增）· 门禁：`scripts/check-motion.mjs`（新增）

---

## 1. 目标与范围

### 1.1 要解决的问题

七个页面里所有「状态切换」都是硬跳：

| 现象 | 位置 |
|---|---|
| 切区域/状态/chip 后列表**整块瞬移**，看不出内容是从哪边换过来的 | 景点列表、地陪列表、我的订单、接单、后台订单、地陪审核 |
| 「加载更多」追加的新卡片凭空出现，和已有内容无差别 | 同上六个列表 |
| 页签下划线是**每个页签各自**画的（`.is-on::after`），切换时旧的消失新的出现 | 我的订单、地陪审核 |
| 分段控件靠换底色表示选中，切换时原地闪一下 | 接单页、下单页 |
| 在线开关用 `justify-content` 换边，圆点是硬跳 | 接单页 |
| 套餐单选、可约日期只有最终态，选择过程看不见 | 地陪详情 |
| 「加载中…」只有一行文字，没有持续运动的进度指示 | 全部列表 |
| 按钮/卡片按下没有任何反馈 | 全部页面 |
| **进二级页与返回时页面直接硬切**（H5；小程序有原生转场） | 全部 11 个页面 |

### 1.2 范围（只做这些）

1. **内容横向切换**：切分类时列表卡片按行进方向入场（从右/从左各 24px，**360ms**，逐项 +60ms，封顶 300ms）
2. **页面切换（进入 / 返回）**：小程序用原生转场；H5 用 CSS 模拟——进入淡入右移，返回先播离场动画再 `navigateBack()`；App 用 `pages.json` 的 `globalStyle.app-plus`
3. **导航栏切换**：等宽页签改**单根滑动下划线**（280ms）；分段控件改**滑动滑块**；横向滚动的页签行下划线用 `scaleX` 收放
4. **加载更多**：加载态换成常量运动的转圈指示器；新追加的卡片上浮入场（延迟基准 = 追加前的列表长度）
5. **状态过渡**：chip 选中底、套餐单选、可约日期、在线开关、角色切换 → 颜色/位移过渡
6. **按压反馈**：**全部可点元素**（卡片、按钮、页签、chip、分段项、菜单行、返回图标、步进器、勾选框、协议链接）统一走 `hover-class="is-pressed"`，由 `scale(0.96)` + `::after` 的 8% 当前色叠层两层组成
7. **降低动效**：`prefers-reduced-motion: reduce` 时去掉位移与回弹，保留淡入

### 1.3 明确不做

- 金额、统计条、步进器人数/小时数等**用户正在读的数字**：不动，避免读数时被干扰
- Toast、Modal、picker、下拉刷新：平台自带，不叠加自定义动效
- 列表滚动等**长期高频操作**：越安静越好
- 排序切换的重排动画（需要 FLIP，属 layout 动画，本轮不做，见 §6）
- **不自己给小程序加页面转场**：微信的 `navigateTo` / `navigateBack` 本身就是原生转场，再加一层就是双重动画（见 §3.5）

---

## 2. 涉及的接口

**本次不涉及接口改动**：`api/index.js`（6 模块 25 方法）、`api/http.js` 路由表、`api/constants.js` 领域常量全部未动，页面里的数据获取路径与字段完全不变。

对照 `docx/接口文档.md`：无新增/修改/删除的方法与字段，无需同步该文档。

动效只消费页面已有的 `loading` / `hasMore` / 列表数组三个状态，不新增数据依赖。

---

## 3. 文件结构与关键实现

### 3.1 新增文件

| 文件 | 作用 |
|---|---|
| `utils/motion.js` | 动效通用行为：常量、纯函数、`createListEnter()` 工厂（与 `utils/hscroll.js` 同构） |
| `scripts/check-motion.mjs` | 动效静态门禁（11 类违规 + `--self-test`） |

`utils/motion.js` 的导出面：

```js
export const MOTION = { press:140, fast:160, base:220, spin:900, staggerStep:40, staggerMax:200, easeOut:'…', easeInOut:'…' };
export const ENTER_UP = 0; export const ENTER_NEXT = 1; export const ENTER_PREV = -1;
export function enterAnimClass(dir)                 // dir → 'ds-enter-next' / 'ds-enter-prev' / 'ds-enter-up'
export function staggerDelay(index, {step, max})     // 逐项 +40ms，封顶 200ms（纯函数）
export function stepDirection(fromIndex, toIndex)    // 下标差 → 1 / -1 / 0（纯函数）
export function createListEnter()                    // data + methods，页面 spread 接入
```

`createListEnter()` 给页面注入三个 data 与三个 methods：

| 名称 | 作用 |
|---|---|
| `enterAnim` | 当前入场动画 class（`ds-enter-*`） |
| `enterBase` | 延迟基准下标（刷新 0，追加 = 追加前长度） |
| `enterSeq` | 批次号，进 `:key`；切分类时整批换新节点，动画才会重播 |
| `beginEnter(dir, base)` | 切换分类 / 加载更多时调用 |
| `renewEnter()` | 无方向的整批刷新（改排序、改日期筛选）也换批次 |
| `enterStyle(index)` | 绑给列表项，只返回 `animation-delay` |

### 3.2 关键实现：为什么是「CSS 动画 + class + 批次 key」

考虑过三种做法，最后选第三种：

| 做法 | 否决原因 |
|---|---|
| JS 逐帧驱动 | 列表数据在加载时容易掉帧；小程序端更没有性价比 |
| `transition` + 数据标志位 + `nextTick` 切换 | 需要「先渲染隐藏态 → 再下一帧移除」的时序小技巧；mock 返回过快时隐藏态可能根本没渲染，动画不播 |
| **CSS 动画 + 节点重建** | 新节点创建时动画必定从首帧播放，不需要任何时序 hack；纯 CSS，跑在主线程之外 |

落到代码上就是一条 `:key` + 一个 class：

```html
<view
  v-for="(item, index) in list"
  :key="enterSeq + '-' + item.id"
  :class="['card', 'ds-pressable', enterAnim]"
  :style="enterStyle(index)"
  hover-class="is-pressed"
  hover-stay-time="70"
>
```

- `enterSeq` 进 key：切分类时整批节点重建 → 全部重播入场
- 加载更多时 `enterSeq` 不变 → 只有新追加的节点是新的，旧卡片不会重播
- `animation-fill-mode: backwards`（**不是 `both`**）：延迟期间按首帧藏住，播完即交还普通样式。若用 `both`，会残留一个 `transform: translateX(0)` 盖掉按压反馈的 `scale`

### 3.3 keyframes 必须放全局

页面样式都是 `scoped` 的：同一个 `@keyframes` 在七个页面里各写一遍会被编译成七个不同的名字，且无法共用。因此 9 个 keyframes 与通用类统一放在 `App.vue` 的非 scoped 样式里（编译进 `app.wxss`）：

| keyframes | 用途 |
|---|---|
| `ds-card-in-up` | 上浮入场（默认 / 加载更多） |
| `ds-card-in-next` / `ds-card-in-prev` | 横向入场（切到下一项 / 上一项） |
| `ds-fade-in` | 淡入（空状态、加载完毕提示、登录遮罩） |
| `ds-pop-in` | 弹入（勾选符号） |
| `ds-spin` | 转一圈（加载指示器，`linear` + `infinite`） |
| `ds-page-in` | 页面进入（H5） |
| `ds-page-out` | 页面退出（H5，返回前先播） |
| `ds-page-fade-out` | 上面两个在 `prefers-reduced-motion` 下的降级 |

### 3.4 导航栏切换：只动 transform

| 位置 | 做法 |
|---|---|
| 我的订单（4 等宽页签）、地陪审核（2 等宽页签） | 单根绝对定位下划线：外层宽度 `100% / n`，位移 `translateX(下标 × 100%)`（百分比按自身宽度算，天然等于一格宽），`280ms --ease-in-out` |
| 接单页、下单页（分段控件） | 绝对定位滑块 `calc((100% - 6px) / n)` + `translateX(下标 × 100%)`，`280ms --ease-in-out` |
| 景点列表（横向滚动、宽度不一） | 每个页签一个真实的下划线元素，未选中 `scaleX(0)`、选中 `scaleX(1)`：切换时旧线收回、新线展开 |

**全程没有动过 `width` / `left`**：宽度只在 `translateX` 的百分比里体现。

### 3.5 页面转场（三端三套机制）

官方文档里那句「配置 `animationType` 就有转场动画」只对 App 端成立，所以这里必须分平台处理：

| 平台 | 机制 | 我们的做法 | 代码位置 |
|---|---|---|---|
| 小程序（含微信） | `navigateTo` / `navigateBack` **本身就是原生转场** | **什么都不加** | — |
| H5 | 官方配置不生效，要自己用 CSS 模拟 | 进入：根节点常带 `is-page-in`；返回：换 `is-page-out`，播完再 `navigateBack()` | `App.vue` 的 `/* #ifdef H5 */` 段 + `utils/motion.js` 的 `createPageMotion()` |
| App | 官方配置生效 | `pages.json` 的 `globalStyle.app-plus`：`slide-in-right` / `320ms` | `pages.json` |

模板与脚本各只加一行：

```html
<view :class="['page', pageMotion]">   <!-- pageMotion 初值 'is-page-in' -->
```
```js
const pageMotion = createPageMotion();      // data / methods 各 spread 一次
methods: { ...pageMotion.methods, goBack() { this.goBackWithMotion(); } }
```

`goBackWithMotion()` 的实现（关键在条件编译 —— 小程序端会被剥成一句 `uni.navigateBack()`，行为与改动前完全一致）：

```js
goBackWithMotion() {
  // #ifdef H5
  if (this.pageMotion !== 'is-page-out') {       // 防连点导致返回两次
    this.pageMotion = 'is-page-out';
    setTimeout(() => uni.navigateBack(), MOTION.pageLeave);  // 等动画播完
    return;
  }
  // #endif
  uni.navigateBack();
}
```

两个刻意的选择：

- **离场不淡到 0**，而是 `opacity: 0.15` + 右移 40%：全站页面底色都是同一张宣纸，露出来的那一块与上一页的底色一致，换页那一下几乎看不出来；淡到 0 反而会先闪一块空底再切
- **`setTimeout` 的时长取 `MOTION.pageLeave`，而动画时长取 `$ds-dur-page-leave`**：两份时长必须相等，否则要么提前切页（动画被截断）要么白等。所以门禁里加了「`utils/motion.js` ↔ `uni.scss` 逐项比对」这条

### 3.6 加载更多

```html
<view class="load-status">
  <view v-if="loading" class="load-row">
    <view class="ds-spinner"></view>
    <text class="load-text">加载中…</text>
  </view>
  <text v-else-if="!hasMore && list.length > 0" class="load-text ds-fade-in">没有更多了</text>
</view>
```

转圈用 `linear` 是刻意的：它是进度（常量运动），不该有缓动。

### 3.7 按压反馈（两层）

```scss
.ds-pressable { position: relative; transition: transform 140ms var(--ease-out); }
.is-pressed { transform: scale(0.96); }

/* 第二层：8% 当前色叠层 —— 照 DESIGN.md §8「用 8% 主色叠层，不用 opacity 变暗」 */
.ds-pressable.is-pressed::after {
  content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  border-radius: inherit; background: currentColor; opacity: 0.08; pointer-events: none;
}
```

两个细节：

- 叠的是 `currentColor`（元素自己的文字色），所以浅底按钮上是加深、深底按钮上是提亮，一套类通吃
- 覆到**全部可点元素**：卡片、按钮、页签、chip、分段项、菜单行、返回图标、步进器、勾选框、协议链接。`icon-btn` / `nav-back` 这类透明热区额外补了 `border-radius`，否则叠层会是一个方块

### 3.8 降低动效

```scss
@media (prefers-reduced-motion: reduce) {
  .ds-enter-up, .ds-enter-next, .ds-enter-prev { animation-name: ds-fade-in; }
  .ds-pressable { transition: none; }
  .is-pressed { transform: none; }
  .is-pressed::after { opacity: 0; }
  .ds-spinner { animation-duration: 1600ms; }
  .is-page-in { animation-name: ds-fade-in; }
  .is-page-out { animation-name: ds-page-fade-out; }
}
```

不是全部关掉：**淡入帮助理解状态变化，要留**；去掉的是位移与按压回弹。

这也是「入场动画名必须写在 class 里，不能内联 `animation-name`」的原因 —— 内联样式优先级高于样式表，降级覆盖不掉。`check-motion.mjs` 会拦截模板里的 `animationName`。

### 3.9 门禁 `scripts/check-motion.mjs`

12 类可机检的违规：

1. `transition: all`（含省略属性名的 `transition: 200ms ease`）
2. `transition` 动了 `transform / opacity / color / background-color / border-color` 之外的东西
3. `ease-in`
4. `transition` 上用 `linear`
5. `animation` 上用 `linear` 但不是加载指示器
6. `scale(0)`
7. `:hover`
8. 页面里自带 `@keyframes`
9. 引用了不存在的动画名（写错的动画名会静默失效，最难发现）
10. 内联 `animationName`
11. `App.vue` 缺 `prefers-reduced-motion`；以及 `uni.scss` 的 `$ds-dur-*` / `$ds-stagger-*` 超过 400ms 预算（`$ds-dur-spin` 例外）
12. **`uni.scss` 的时长令牌与 `utils/motion.js` 的 `MOTION` 不一致**（kebab-case ↔ camelCase 逐项比对）：这两份时长分别服务于 CSS 动画和 JS 的 `setTimeout`，最容易「改了一边忘了另一边」，页面转场的等待时间就会和动画时长错位

实现要点：不按行切分样式，而是用一个最小的花括号状态机解析「选择器 + 声明」，这样一行写完的 `.a { transition: all 200ms; }` 也不会漏（按行切会漏，自检就是照这个写的）。

---

## 4. 状态与数据流

### 4.1 切分类（以首页区域页签为例）

```
点击区域 / 右滑手势
  → changeRegion(id, dir)
      dir = 手势方向 || stepDirection(旧下标, 新下标)
  → loadAttractions(true, dir)
      beginEnter(dir, 0)          // enterAnim 换方向 + enterSeq++
      AttractionApi.getAttractionList()
      list 赋值
  → key 全变 → 全部卡片重建 → 播 ds-card-in-next/prev（延迟 0,60,…,300ms）
```

### 4.2 加载更多

```
scrolltolower → loadMore() → loadAttractions()
  → beginEnter(ENTER_UP, 旧长度)   // enterSeq 不变
  → list = [...旧, ...新]
  → 只有新节点是新创建的 → 播 ds-card-in-up，延迟从 0 开始
  → 旧卡片节点的 animation-delay 变化不影响已结束的动画，不会重播
```

### 4.3 无方向的整批刷新

改排序（地陪列表）、改日期筛选（后台订单）会整批换内容但没有方向，走 `renewEnter()`：只换批次 + 上浮，不假装有左右方向。

### 4.4 进入 / 返回一个页面

```
进入（navigateTo）
  → 新页面被创建，根节点自带 is-page-in
  → H5：播 ds-page-in（320ms）                        ← 小程序端这个类没有样式，走原生转场
返回（点导航栏返回图标）
  → goBack() → goBackWithMotion()
      H5：pageMotion = 'is-page-out' → 播 ds-page-out（260ms）
          → setTimeout(260) → uni.navigateBack()
      小程序：直接 uni.navigateBack()（原生转场，不多等 260ms）
```

### 4.5 数据层

动效不读写任何数据，也不改变 `loading` / `hasMore` / `total` 的语义与顺序：`beginEnter()` 只在请求成功返回、赋值列表**之前**调用，失败路径行为与改动前完全一致；`goBackWithMotion()` 也只在 H5 分支里插了一段 `setTimeout`，不改任何数据。

---

## 5. 验证证据

| 验证项 | 命令 | 结果 |
|---|---|---|
| 资产保真 | `node scripts/verify-assets.mjs` | 通过。本次有意改动 **11 条**已登记资产（App.vue / uni.scss / **pages.json** / README.md / 登录页 / 首页 / 详情页 / 我的订单 / 我的 / 地陪审核 / 后台订单），每条 note 先补动效说明再 `--update` 刷新哈希；保真告警 **0** 条 |
| 设计令牌 | `node scripts/check-tokens.mjs` | 通过。定义 **106** 个变量（含新增 9 个动效时长令牌），15 处引用无未定义；DESIGN.md 20 个色值全部落到 uni.scss（§13 未引入新色值） |
| **动效（新增）** | `node scripts/check-motion.mjs` | 通过。**9 个 `@keyframes`** / 9 个动画名全部存在；**9 个时长令牌与 `utils/motion.js` 的 `MOTION` 逐项一致**；`--self-test` 通过（12 类违规都能检出） |
| **SCSS 实际编译** | 用 HBuilderX 自带的 dart-sass 把「`uni.scss` + 各文件样式块」拼起来 `renderSync` | **12/12 通过**（App.vue + 11 个页面）。这条是排查「`Undefined variable $ds-dur-page`」时加的临时验证，结论见 `docx/bugfix/BUG修复-20260926-SCSS变量未定义实为注入缓存陈旧.md` |
| 表结构 | `node scripts/check-schema.mjs` | 通过（未涉及） |
| mock 数据层 | `node scripts/check-mock.mjs` | 通过（未涉及）：11 个页面均未直连 `api/mock/` |
| 端到端闭环 | `node scripts/smoke-flow.mjs` | 通过 **50/50**（未涉及数据层，全量复跑） |
| 标准入口 | `./init.ps1` | **8 步全绿**；`init.ps1` 的 UTF-8 BOM 已校验仍在（`ef bb bf`） |
| 小程序构建 | `npm run build:mp-weixin` | **跑不通，但与本轮改动无关**：项目根目录是 HBuilderX「普通项目」布局（源码在根），而 npm 安装的 `@dcloudio/uni-cli` 期望源码在 `src/`，报 `ENOENT: src/manifest.json`。这是先于本轮就存在的既有限制，实际编译走 HBuilderX。 |

反向验证（门禁不是空壳）：

- 修完登录页之前，`check-motion.mjs` 报出 4 条真实问题：登录页自带 `@keyframes spin`、动画名 `spin` 在 App.vue 不存在、`0.8s` 裸时长、`linear` 未标注 —— 这正是本轮顺带统一掉的一处历史遗留。
- `--self-test` 用故意写坏的几份文件（超长时长、`transition: all`、动 layout 属性、`ease-in`、`transition` 用 `linear`、`animation` 用 `linear`、`scale(0)`、`:hover`、页面内 `@keyframes`、动画名不存在、缺降级、`MOTION` 与令牌不一致）验证 12 类违规都能检出。
- 自检本身也修过一次：最初的 `walkDeclarations` 按行切样式，漏掉了 `transition: all` 这类「一行写完」的声明；改成花括号状态机后才全绿 —— 门禁的 `--self-test` 就是这么逼出来的。

---

## 6. 遗留问题

1. **排序切换的重排没有动画**：地陪列表的「价格从低到高」是整批换批次 + 上浮入场，不是真正的列表重排动画（那需要 FLIP，属 layout 动画，与「只动 transform / opacity」的预算冲突，MVP 不做）。
2. **`prefers-reduced-motion` 在小程序端的支持不保证**：WXSS 支持 `@media` 时会生效，不支持则整段被忽略（H5 一定生效）。降级逻辑本身是纯 CSS，无法在小程序端用 `uni.getSystemInfoSync()` 探测，暂保持现状。
3. **接单页与地陪审核页仍未接横滑切换**：`utils/hscroll.js` 的 `createTabRow()` 已接入首页、地陪列表、我的订单、后台订单四页；接单页（两段分段）与地陪审核页（两页签）只有点击切换，点击时的方向入场已生效。属既有缺口，与本轮动效不冲突（见 `session-handoff.md`）。
4. **H5 返回转场的「换页那一下」只能靠眼睛验收**：离场动画播完后 `uni.navigateBack()` 会切到上一页，而上一页是被缓存复用的（不会再播进入动画）。我们已经用「不淡到 0 + 同色宣纸底」把跳变压到最小，但它到底顺不顺，必须人工看；小程序端不受影响（原生转场）。**这条是本轮最需要真机/浏览器确认的一点。**
5. **`npm run build:mp-weixin` 在本仓库跑不通（既有限制）**：根目录是 HBuilderX「普通项目」布局（源码在根），而 `@dcloudio/uni-cli` 期望 `src/manifest.json`。所以 `./init.ps1` 第 8 步一直只能跳过；真实编译走 HBuilderX。本轮新增的 WXSS（条件编译段、`::after` 叠层、`animation-fill-mode: backwards`）因此是在 HBuilderX 里首次编译，**需要在 HBuilderX 里确认一次小程序端表现**。
6. **`docs/legacy-assets.md`（人读版）只补了摘要**：第一节补了「feat-015 改了 11 条在册资产」的说明、第三节第 7 点补了动效来源；未逐条重写 7 个页面在该文档里的「作用」描述（机读台账 `docs/legacy-assets.json` 的 note 才是逐条的完整记录）。
