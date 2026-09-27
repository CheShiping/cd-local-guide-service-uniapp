# 设计文档：feat-006 游客端-景点列表页（首页）

- 功能：feat-006
- 日期：2026-09-26
- 状态：**已完成**
- 原型：`design/html/prototype.html` 第 01 屏
- 相关：`docs/mvp-scope.json` 的 `deviations.dev-001`（先选景点再选地陪）

---

## 1. 目标与范围

### 目标

把首页从「达人列表」改造为「景点列表」，成为 MVP 闭环的入口：**先选景点 → 再选能带这个景点的地陪**。

1. 顶部宋体大标题 + 一句把下一步说清楚的副标题
2. 区域文字页签（一级筛选）：数据来自区域字典表，前台只展示「启用且下有在售景点」的区域
3. 景点卡：`coverUrl` 封面 76×76 / 名称 / 所属区域 · 场景 / 「N 位地陪可约」
4. 20 条数据分页（`pageSize = 10` → 2 页），触底加载
5. 点卡片进入 `/pages/guide/list?attractionId=&name=`

### 范围之外（刻意不做）

| 不做 | 原因 |
|---|---|
| 搜索框 | 定稿原型已移除；MVP 不做景点搜索（`docs/mvp-scope.json` 的不做清单） |
| 性别 / 价格筛选抽屉 | 原陪玩时期的筛选维度，对「选景点」无意义；价格与类型筛选下沉到地陪列表页 |
| 景点详情页 | MVP 7 个页面里没有它；景点信息在卡片与地陪列表里已够用 |

---

## 2. 涉及的接口（对照 `docx/接口文档.md` 第 1、2 节）

| 方法 | 入参 | 用途 |
|---|---|---|
| `RegionApi.getRegionList()` | 默认 `onlyWithAttractions = true` | 页签数据；后端换成 `GET /regions` |
| `AttractionApi.getAttractionList({ pageNo, pageSize, regionTypeId })` | 区域切换时带 `regionTypeId` | 列表 + 分页 |

用到的字段：`Attraction = { id, name, district, scene, coverUrl, guideCount }`。
`guideCount` 是「已通过地陪 × 擅长该景点」的实时计数（后端对应 `attractions.guide_count` 冗余字段）。

---

## 3. 文件结构与关键实现

`pages/index/index.vue`（整体重写）：

```
status-bar            —— 自绘状态栏（navigationStyle: custom）
screen-head           —— kicker / 宋体大标题「今天去哪儿」/ 副标题「N 个景点 · 本地地陪带路，先选地方再挑人」
tabline               —— 横向滚动文字页签：全部 + 区域；选中态 = 竹青字 + 22×2px 下划线（不是胶囊）
list-scroll           —— flex:1 + @scrolltolower 分页
card.attract          —— 左封面 76×76（$ds-primary-container 兜底）+ 右名称/区域·场景/「N 位地陪可约」+ 圆形箭头
load-status / empty-box —— 加载中 / 没有更多 / 空状态（换区域）
```

三个实现要点：

1. **筛选只有一个层级**：一级用文字页签（本页），二级用 chip（地陪列表页）。DESIGN.md 明确要求「不要把筛选做成两排都是胶囊」。
2. **封面兜底靠容器底色**：`.thumb` 固定 76×76、`overflow: hidden`、背景 `$ds-primary-container`，`<image mode="aspectFill">` 填满。字段为空或加载失败时露出竹青浅底，不裂图、不拉伸（gap-001 的处理方式）。
3. **不用手动算高度**：页面 `display: flex; flex-direction: column; height: 100vh`，`.list-scroll { flex: 1; height: 0 }`。原实现用 `sys.windowHeight - 110` 硬算，改版后无需再算。

---

## 4. 状态与数据流

```
onLoad
 ├─ loadRegions()      → RegionApi.getRegionList()            → tabline
 └─ loadAttractions(true) → AttractionApi.getAttractionList(pageNo=1, pageSize=10, regionTypeId?)

点页签 → regionTypeId 变化 → loadAttractions(true)（重置 pageNo / 列表 / hasMore，total 同步刷新）
触底   → loadAttractions()（追加；hasMore 由接口返回，不再用 list.length < total 推算）

点卡片 → uni.navigateTo(`/pages/guide/list?attractionId=${id}&name=${encodeURIComponent(name)}`)
```

分页三态：`loading` 显示「加载中…」；`!hasMore && list.length` 显示「没有更多了」；`!loading && !list.length` 显示空状态。

---

## 5. 验证证据

| 验证项 | 命令 | 结果 |
|---|---|---|
| 资产保真 | `node scripts/verify-assets.mjs` | 通过（`pages/index/index.vue` 已登记原因并刷新哈希） |
| 路由一致性 | 同上 | 通过，`pages.json` 共注册 11 个页面，无悬空引用 |
| mock 边界 | `node scripts/check-mock.mjs` | 通过（11 个页面均未直连 `api/mock/`） |
| 设计令牌 | `node scripts/check-tokens.mjs` | 通过（页面只用 `$ds-*`，无未定义变量） |
| 数据规模 | 同上 | 20 个景点、`pageSize=10` → 实测 2 页；`guideCount` 由 mock 实时计算 |
| 编辑器诊断 | — | 0 error 0 warning |

---

## 6. 遗留问题

1. **未做真机 / H5 人工走查**：页签切换、触底分页、封面加载失败的观感需人工确认。
2. **没有下拉刷新**：本页未开 `enablePullDownRefresh`（20 条数据的列表意义不大）；若后续景点池扩大，建议补上。
3. **景点封面依赖网络占位图**：mock 里 `coverUrl` 是 `picsum.photos` 链接，接后端后换 URL 即可，样式与尺寸不变。
4. **区域页签的「全部」是前端拼的**：接口只返回区域列表，`全部` 由页面以空 `regionTypeId` 表示；若后端将来要求「全部」也作为一个区域返回，需要调整。
