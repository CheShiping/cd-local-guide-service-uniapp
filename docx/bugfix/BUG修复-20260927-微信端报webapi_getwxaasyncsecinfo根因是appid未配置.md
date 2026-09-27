# BUG 修复：微信开发者工具报 `SystemError (appServiceSDKScriptError) webapi_getwxaasyncsecinfo:fail`

- 日期：2026-09-27
- 发现方式：用户在微信开发者工具里运行小程序时控制台报错
- 严重级别：**误报（非项目代码问题）**，不影响业务闭环；但暴露了「`mp-weixin.appid` 未配置」这个真实待办
- 结论：**不改代码**，属于微信基础库 + 空 appid 的工具链噪音

## 一、现象

微信开发者工具（`env: Windows, mp, 2.01.2510260; lib: 3.16.3`）控制台重复输出：

```
Error: SystemError (appServiceSDKScriptError)
{"errMsg":"webapi_getwxaasyncsecinfo:fail "}>
Error: SystemError (appServiceSDKScriptError)
{"errMsg":"webapi_getwxaasyncsecinfo:fail "}
    at Function.errorReport (http://127.0.0.1:61226/appservice/__dev__/WAServiceMainContext.js?t=wechat&v=3.16.3:1:207233)
    at Object.<anonymous> (... WAServiceMainContext.js ...)
    ...
    at ue (... WAServiceMainContext.js ...)(env: Windows,mp,2.01.2510260; lib: 3.16.3)
```

报错栈**全部在 `WAServiceMainContext.js`**（微信基础库自己的代码），没有任何一帧指向本仓库的源码或 `api/`。

## 二、复现步骤

1. HBuilderX 运行到微信小程序 / 直接用微信开发者工具打开 `unpackage/dist/dev/mp-weixin`；
2. 查看控制台 —— 冷启动阶段即出现，与点哪个页面无关；
3. `manifest.json` 的 `mp-weixin.appid` 为空（`"appid": ""`），开发者工具未登录或使用"测试号"时必现。

## 三、根因

`webapi_getwxaasyncsecinfo` 是**微信基础库内部**向微信服务器拉取「小程序异步安全信息」的接口（内容安全 / 隐私相关能力的前置）。当小程序**没有有效的 appid**（空值，或开发者工具处于未登录 / 测试号状态）时，这个接口必然 fail，基础库只能把异常抛到控制台。

两条证据：

1. **代码侧零命中**：全仓库搜 `secinfo` / `webapi_` / `SystemError` → **0 命中**（`search_content` 全仓库搜索）。`App.vue` 的 `onLaunch` 只打了 `console.log` 并调 `checkLogin()`，没有调用任何安全 / 隐私接口（原微信云开发初始化在 feat-013 已移除，见 `manifest.json` 在册资产 note）。
2. **配置侧命中**：`manifest.json` 的 `mp-weixin.appid` 是空字符串；`progress.md` 的「阻塞 / 风险」早就记着「`mp-weixin` 的 `appid` 为空、发布前需填真实 appid」，本次是这条待办在运行时的第一次实际外显。

### 连带影响（同样是 appid 为空导致的，需要一起知道）

- 微信端**登录走不通**：`pages/login/login.vue` 的 `getLoginCode()` 在 `MP-WEIXIN` 分支调 `uni.login()`，空 appid 下拿不到 `code`，会抛「获取登录 code 失败」。因此微信端只能用登录页的「免登录进入」通道往下走（mock 数据层不依赖真实登录）。
- 但**不影响**三端闭环与 mock：数据全在内存里（`USE_MOCK = true`），与 appid、网络、微信服务器都无关。`scripts/smoke-flow.mjs` 的 50/50 就是纯本地跑的。

## 四、修复方案

**不改代码**（没有 bug 可改），按需要选择：

| 方案 | 做法 | 适用 |
|---|---|---|
| A. 配测试号 appid（推荐） | 微信公众平台 → 申请小程序测试号 → 把 appid 填进 `manifest.json` 的 `mp-weixin.appid` → HBuilderX 重新运行 | 想在微信端真正登录 / 调真机能力 |
| B. 忽略这条噪音 | 不改配置，只把控制台过滤掉 `webapi_getwxaasyncsecinfo` | 只想在微信端看样式、编译产物、原生转场 |
| C. 换基础库 / 清缓存 | 开发者工具「详情 → 本地设置」把调试基础库从 3.16.3 切到较稳定的版本；或「工具 → 清除缓存 → 全部清除」后重编译 | 版本兼容性抖动导致时 |
| D. 换平台验收 | 在 H5（`npm run dev:h5`）走业务闭环 —— 界面与交互全部可用 | 验业务闭环 / 自定义动效（H5 才有 `is-page-*` 转场） |

> 若选 A：改 `manifest.json` 属于改动在册资产 —— 按 `AGENTS.md` 的规矩，**先**在 `docs/legacy-assets.json` 的 note 里登记原因，**再** `node scripts/verify-assets.mjs --update` 刷新哈希。本次未改，因为手上没有可用 appid（不许编造）。

另外要澄清一个常见误解：开发者工具的「不校验合法域名」开关与本错**无关** —— 那条只管 `wx.request` 的域名白名单，而我们是纯 mock，不发任何请求。

## 五、改动文件

| 文件 | 改动 |
|---|---|
| `docx/bugfix/BUG修复-20260927-微信端报webapi_getwxaasyncsecinfo根因是appid未配置.md` | 新建：本文件（误报归档 + 排查结论） |
| `progress.md` | 「阻塞 / 风险」的 appid 条目补本次运行时外显与连带影响；「本次会话修改的文件」登记本节 |
| `session-handoff.md` | 「下一会话从这里开始」补「微信端跑之前先处理 appid」 |

**未改动**：`manifest.json`（不擅自填 appid）、`App.vue` / `pages/login/login.vue`（无 bug 可修）。

## 六、回归验证结果

- 全仓库搜索 `getwxaasyncsecinfo` / `secinfo` / `webapi_` / `SystemError` → **0 命中**，证明报错源不在本仓库代码；
- `node scripts/verify-assets.mjs` → 通过（22 条在册资产无改动，保真告警 0 条）；
- `node scripts/check-tokens.mjs` / `node scripts/check-motion.mjs` / `node scripts/check-schema.mjs` / `node scripts/check-mock.mjs` → 通过；`node scripts/smoke-flow.mjs` → **50/50**；
- 结论：该报错**不阻断**任何已完成的功能与门禁；它是「appid 未配置」这一配置待办的外显，按上面的方案 A/B 处置即可。
