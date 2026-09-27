# 设计文档（补充）：feat-004 地陪本地头像素材池

- 归属功能：feat-004（MVP 数据层，已完成）的补充改动
- 日期：2026-09-26
- 状态：**已完成**
- 触发：用户提供 `static/guide/`（39 张人像）并要求「地陪的 mock 图片从这个位置来」
- 相关：`docs/mvp-scope.json` 的 `deviations.dev-009` 与 `imageStrategy.mockGuideAvatar`、`DESIGN.md` 第 7 节

---

## 1. 目标与范围

### 目标

把 mock 的**地陪头像**从网络占位图（`i.pravatar.cc`）换成仓库内本地素材 `static/guide/`，并做到：

1. 头像与**姓名一致**（素材文件名就是姓名拼音）
2. 50 个地陪**全部**用本地素材（不出现「一半本地一半网络」）
3. 同一份 seed 生成结果**依旧确定性**
4. mock 的字段契约不变（`avatarUrl` 仍是字符串，HTTP 版由后端返回完整 URL 即可，页面代码不动）

### 范围之外（刻意不做）

| 不做 | 原因 |
|---|---|
| 景点封面换本地图 | 用户只指定了地陪头像；景点封面仍走网络占位图（`picsum.photos`），由后端接入时替换 |
| 游客 / 管理员头像换本地图 | 同上，只有一张，网络占位图足够 |
| 压缩或改尺寸 | 会改动用户提供的原图；**包体风险已记录**（见第 6 节），等用户决定 |

---

## 2. 涉及的接口

**接口签名与返回类型都没有变化**，只是 mock 里 `avatarUrl` 的取值变了：

| 字段 | mock 值 | HTTP 版 |
|---|---|---|
| `Guide.avatarUrl` | `/static/guide/caoyiming.jpg`（本地静态路径） | 后端返回完整 URL（`https://...`） |
| `Order.guideAvatarUrl` | 下单时快照复制上面的值 | 同左 |

页面侧无改动：`<image :src="item.avatarUrl" mode="aspectFill">` 对本地路径与 http URL 一视同仁；订单快照逻辑也照旧（快照的是字符串）。

---

## 3. 文件结构与关键实现

### 3.1 素材与命名约定

`static/guide/` 下 39 个文件（19 个 .jpg + 20 个 .png），文件名 = **姓氏拼音 + 名字拼音**：

```
caoyiming.jpg  → 曹一鸣      yuanxiaolin.png → 袁小林
hetingyu.jpg   → 何庭玉      zhounanshan.jpg → 周南山
…
```

其中 `xiongyutonge.png` 的拼音多一个后缀字母、解析不出姓名，作为**循环兜底素材**参与分配但不参与「姓名对齐」。

### 3.2 素材池登记（`api/mock/seed.json` → `generators`）

```json
"guideAvatarDir": "/static/guide/",
"guideAvatarFiles": ["baiahe.jpg", "…", "zhoutingyu.jpg"],
"surnamesPinyin":  { "林": "lin", "苏": "su", "…": "…" },
"givenNamesPinyin": { "小林": "xiaolin", "阿杰": "ajie", "…": "…" }
```

为什么要把这 39 个文件名**写死在 seed.json** 而不是扫描目录：mock 跑在**客户端**（H5 / 小程序运行时），没有 `fs`，无法列目录；因此池必须是静态清单。代价是新增文件要同步登记 —— 这由下面的门禁兜住。

### 3.3 分配策略（`api/mock/generate.js`）

有两件事必须一起解决：**谁用哪张图**、**谁叫什么名**。

- **姓名反查**：`surnamesPinyin` × `givenNamesPinyin` 组合出 `slug → 姓名` 映射（400 条，一次性建表），把素材文件名还原成中文姓名，得到 38 个「有素材的姓名」（`xiongyutonge` 解析失败）。
- **有素材的地陪直接用素材里的姓名**：第 i 个地陪（i < 38）取名 `区域 · 素材姓名`，头像取对应的那张素材 → 头像与姓名天然一致。
  *（不这样做的话：50 个地陪的名字是随机组合，实测只有 4/50 恰好命中素材姓名，其余头像与姓名无关）*
- **其余地陪**（第 38~49 个）随机取名，照片从素材池**按下标循环取**；若随机姓名恰好在素材里则优先用同名素材。
- **兜底**：素材池为空时退回 `https://i.pravatar.cc/160?img=N`，避免出现空头像。

输出保证：
- 每个地陪的 `avatarUrl` 都以 `/static/guide/` 开头
- 39 张素材**全部被用到**
- 结果与 seed 绑定，两次生成完全一致

### 3.4 自检字段（`stats`）

| 字段 | 含义 | 当前值 |
|---|---|---|
| `guideAvatarPool` | 素材池数量 | 39 |
| `guideAvatarNamed` | 素材里能解析出姓名的数量 | 38 |
| `guideAvatarMatched` | 头像与姓名对上的地陪数 | **39/50** |

---

## 4. 状态与数据流

```
static/guide/*.jpg|png
      ↓ 登记
seed.json generators.guideAvatarFiles（39 条）+ 拼音表
      ↓ generateMockData()
guides[i].avatarUrl = /static/guide/<素材>
      ↓ 接口层
GuideApi.getGuideList / getGuideDetail → Guide.avatarUrl
      ↓ 下单快照
OrderApi.createOrder → orders.guideAvatarUrl（抄一份）
      ↓ 页面
<image :src="...">（列表 60px / 详情 60px / 订单卡 44px / 接单页 40px）
```

---

## 5. 验证证据

| 验证项 | 命令 | 结果 |
|---|---|---|
| 素材池 ↔ 目录一致 | `node scripts/check-mock.mjs` | 通过：**39 张本地素材（可解析姓名 38 个），姓名对齐命中 39/50 个地陪 → /static/guide/**；并断言「池里每个文件都在目录里」「目录里每个文件都登记进池」「每个地陪头像都是本地路径」「拼音表覆盖所有姓与名」 |
| 端到端闭环 | `node scripts/smoke-flow.mjs` | **37/37 通过**，新增断言「地陪头像取自本地素材（/static/guide/）」 |
| 门禁自检 | `node scripts/smoke-flow.mjs --self-test` | 通过 |
| 确定性 | `check-mock.mjs` | 通过（同 seed 两次生成结果完全一致，头像分配也是确定的） |
| 资产保真 | `node scripts/verify-assets.mjs` | 通过（`static/guide/` 是新增素材，不在原有资产台账内） |
| 标准入口 | `./init.ps1` | 7 步全绿 |

**新增的门禁能力**（这是本次最重要的收获）：`check-mock.mjs` 现在会拦住四类问题 ——
素材池里的文件在磁盘上不存在（改名/删图）、目录里有文件没登记（新增图忘了写进池）、
地陪头像不是本地路径（漏改某条分支）、姓名拼音表没覆盖某个姓或名（静默失效）。
第 4 条尤其重要：拼音表漏项不会报错，只会让「头像与姓名对齐」悄悄退化成随机。

---

## 6. 遗留问题

1. **包体超限（重要）**：39 张素材合计 **12.56MB**（平均 330KB，最大 1.33MB），而微信小程序**主包上限 2MB** —— 超出 6.3 倍。H5 演示不受影响，但 `build:mp-weixin` 出来上传会被拦。
   可选处置：
   - **压缩**：长边降到 240px、JPEG q80，预计合计 ~0.5MB（头像最大只显示 60px，240px 足够 4 倍图）
   - **改走后端/CDN**：最符合原设计（`dev-006` 就是「图片来自后端」），包体零负担
   - 保持现状：仅 H5 演示
2. **扩素材要改两处**：新增图片必须同时写进 `seed.json` 的 `guideAvatarFiles`（由门禁兜住，不会静默漏）。
3. **同名素材会被去重**：若两张素材对应同一个姓名，只有第一张参与「姓名对齐」，第二张仅作循环兜底（当前数据里没有这种冲突）。
4. **11 个地陪头像是重复的**（39 张素材 < 50 个地陪，按设计循环复用）；若要人人不同，需要补素材。
5. **未做真机走查**：本地图片在小程序里的加载与 `aspectFill` 裁切效果需人工确认（尤其 .png 大图在低端机上的首屏渲染）。
