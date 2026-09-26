# BUG 修复：uni.scss 变量顺序导致构建失败

- 日期：2026-09-26
- 影响范围：全项目样式（uni.scss 被注入每个页面的 `<style lang="scss">`）
- 严重级别：阻塞级（会导致 H5 与小程序构建直接失败）
- 发现方式：新增的令牌校验脚本 `scripts/check-tokens.mjs`（静态检查），非运行时报错

## 现象

重写 `uni.scss` 后，文件顶部把 uni-app 内置变量映射到项目令牌：

```scss
$uni-color-primary: $ds-primary;   // 第 7 行
...
$ds-primary: #2f6b5e;              // 第 70 行才定义
```

构建（`npm run dev:h5` / `build:mp-weixin`）时会直接报 SCSS 编译错误：`Undefined variable`，且因为是全局样式，**所有页面一起失败**，不是单页问题。

## 复现步骤

1. 打开 `uni.scss`，确认 `$uni-*` 映射段在 `$ds-*` 令牌段之前
2. 运行 `npm run build:h5`（或 HBuilderX 运行到 H5）
3. 观察 SCSS 编译报错 `Undefined variable: "$ds-primary"`

当前仓库状态无法直接复现构建（根目录无 `node_modules`），因此改用静态校验复现：

```bash
node scripts/check-tokens.mjs        # 修复前会报：uni.scss 第 7 行引用了尚未定义的变量 $ds-primary
node scripts/check-tokens.mjs --self-test   # 用故意写坏的文件验证校验器确实会报错
```

## 根因

SCSS 是**顺序解析**的：变量必须在使用之前定义。`uni.scss` 被 uni-app 自动注入到每个组件的样式块顶部，一旦顺序颠倒，等于所有页面都在引用未定义变量。

最初的编写顺序是「先写 uni-app 内置变量映射、再写项目令牌」，看起来层次更清楚，但违反了 SCSS 的求值顺序。更隐蔽的是：如果只检查「非定义行」的引用，这一类错误会被漏掉——**出错的位置恰好就是定义行的右侧**。

## 修复方案

1. `uni.scss` 结构调整为：**第 1 节 `$ds-*` 项目令牌 → 第 2 节 `$uni-*` 内置变量映射**，并在文件头写明「不要调换顺序」
2. 新增 `scripts/check-tokens.mjs` 静态校验，纳入标准验证入口，检查三类问题：
   - `uni.scss` 先使用后定义（含**定义行右侧**的引用）
   - `prototype.css` 使用未定义的 CSS 自定义属性
   - `DESIGN.md` 出现 `uni.scss` 里没有的色值（规范与令牌脱钩）
3. 校验脚本自带 `--self-test`：用故意写坏的临时文件验证校验器真的会报错，避免"门禁形同虚设"

## 改动文件

| 文件 | 改动 |
|---|---|
| `uni.scss` | 重排为「令牌在前、映射在后」，补充顺序说明注释 |
| `scripts/check-tokens.mjs` | 新增：SCSS 顺序 / CSS 自定义属性 / 色值对齐三项校验 + 自检 |
| `init.ps1` / `init.sh` | 验证入口由 3 步扩为 4 步，插入「设计令牌校验」 |
| `docs/legacy-assets.json` | 更新 `uni.scss` 条目说明并刷新 sha256 |

## 回归验证结果

| 验证项 | 命令 | 结果 |
|---|---|---|
| 令牌校验自检 | `node scripts/check-tokens.mjs --self-test` | 通过：三类问题（SCSS 顺序 / CSS 属性 / 色值脱钩）均能被检出 |
| 真实令牌校验 | `node scripts/check-tokens.mjs` | 通过：uni.scss 95 个变量 / 15 处引用无未定义；DESIGN.md 20 个色值全部落到 uni.scss |
| 资产保真校验 | `node scripts/verify-assets.mjs` | 通过：22 条在册资产哈希一致 |
| 标准入口 | `./init.ps1` | 1/4 环境 + 2/4 保真 + 3/4 令牌通过；4/4 构建因缺 `node_modules` 按设计跳过 |
| 实际构建 | `npm run build:h5` | **未执行**（无依赖），需补跑确认 |

## 遗留问题

- 真实构建尚未跑过一次，`uni.scss` 的令牌在编译期是否另有问题（如 `$ds-el-1` 多值阴影写法）需要 `./init.ps1 -Full` 安装依赖后确认
- 各页面内仍硬编码 `#FF4D6A` 等旧色值，与新的 `$ds-*` 并存，属 gap-004，计划在 `feat-013` 统一
