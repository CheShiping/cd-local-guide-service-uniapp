# BUG 修复：底部导航栏（tabBar）未与设计系统对齐

- 日期：2026-09-26
- 严重级别：**中**（功能不受影响，但每个页面第一眼就能看到：底部出现「粉色图标 + 竹青文字」）
- 发现方式：用户反馈「底部导航栏怎么没统一起来」
- 相关：`DESIGN.md` 第 9 / 12 节、`pages.json` 的 `tabBar`、`docs/legacy-assets.json` 的 4 个图标条目

## 1. 现象

首页与「我的」页的底部导航栏，选中项是**粉色图标 + 竹青绿文字**，与全站的宣纸/竹青体系割裂；同时 tabBar 底色是**纯白**，在宣纸底（`#F7F4ED`）上像一条贴上去的白条。

## 2. 复现步骤

1. `npm run dev:h5` 或微信开发者工具打开首页
2. 观察底部导航：未选中项是深灰填充图标，选中项是**粉红填充图标**，文字却是竹青绿
3. 观察 tabBar 底色：纯白，与页面宣纸底有明显色差

## 3. 根因

两个原因，都是「配置/资产跟着改了，但没跟着设计系统走」：

1. **图标是陪玩时期遗留的位图**：`static/tabbar/*.png` 是原来的「灰 + 粉红（#FF4D6A 系）」**填充式**图标，属 `keep` 档资产，重构期间一直没动。而 `selectedColor` 已经在 feat-013 改成竹青绿 → 图标与文字不同源。
   小程序 tabBar 只接受本地图片（不支持 svg / 字体图标），所以颜色没法靠 CSS 变量控制，必须落在文件里 —— 这正是它容易被漏掉的原因。
2. **tabBar 底色写成了纯白**：`pages.json` 的 `backgroundColor: #ffffff`。但定稿原型里 tabBar 是 `color-mix(in srgb, var(--md-surface) 92%, #ffffff)`（≈ `#F8F5EF`，即「宣纸 + 8% 白」）+ 上发丝线。`DESIGN.md` 第 12 节原文也照抄了 `#FFFFFF`，与第 1 节「宣纸底替代纯白」的原则自相矛盾 —— 规范内部先不一致，实现自然跟着错。
   小程序配置不支持 `color-mix`，需要取最接近的令牌。

## 4. 修复方案

1. **新增 `scripts/gen-tabbar-icons.mjs`**：按 `DESIGN.md` 第 9 节的线性规范（24×24 网格、`stroke-width: 1.6`）用代码栅格化 4 张图标（首页/我的 × 未选中/选中）：
   - 颜色**直接从 `uni.scss` 读取令牌**（未选中 `$ds-ink-2`、选中 `$ds-primary`），令牌一改重跑脚本即可，不会再与设计系统脱钩
   - 4×4 超采样抗锯齿；PNG 由 node 内置 `zlib` 手写（零第三方依赖）
   - 内置自检：读回 png 校验尺寸与主色是否等于令牌色（`--check` 可单独校验）
2. **`pages.json`**：`backgroundColor` 由 `#ffffff` 改为 `#fbfaf5`（`$ds-surface-container`，最接近原型的 mix 结果）
3. **`DESIGN.md`**：第 9 节补「tabBar 图标是唯一例外 + 不要手工替换」；第 12 节第 5 条把 tabBar 背景由 `#FFFFFF` 改为 `#FBFAF5` 并写明理由；第 8 节补二级页面的底部形态说明；变更记录加一行
4. **台账**：4 个图标的 `reuse` 由 `keep` 改为 `replace` 并写明原因（`docs/legacy-assets.json` / `.md`）

## 5. 改动文件

- `scripts/gen-tabbar-icons.mjs` — 新增：图标生成器（含 `--check` 自检）
- `static/tabbar/home.png` / `home-active.png` / `mine.png` / `mine-active.png` — 重新生成（81×81，线性，灰/竹青）
- `pages.json` — tabBar 底色 `#ffffff` → `#fbfaf5`
- `DESIGN.md` — 第 8 / 9 / 12 节 + 变更记录
- `docs/legacy-assets.json` / `docs/legacy-assets.md` — 4 条图标条目：`keep` → `replace`，并登记原因

## 6. 回归验证结果

| 验证 | 命令 | 结果 |
|---|---|---|
| 图标自检 | `node scripts/gen-tabbar-icons.mjs` | 4 张全部 `ok`：81×81，主色分别 rgb(107,104,98) 与 rgb(47,107,94)，与 `$ds-ink-2` / `$ds-primary` 一致 |
| 图标校验 | `node scripts/gen-tabbar-icons.mjs --check` | 通过（尺寸与颜色都与令牌一致） |
| 人工目检 | 直接查看 4 个 png | 线性房子（屋顶+墙+门）与线性人形（头+肩弧），描边均匀、无锯齿 |
| 资产保真 | `node scripts/verify-assets.mjs` | 通过（4 条图标哈希已刷新，告警 0 条） |
| 令牌校验 | `node scripts/check-tokens.mjs` | 通过（`#FBFAF5` 落在 `$ds-surface-container` 上） |
| 标准入口 | `./init.ps1` | 7 步全绿 |
