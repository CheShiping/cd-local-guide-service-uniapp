# BUG 修复：H5 端登录报 `uni.login not supported`

- 日期：2026-09-26
- 影响范围：`pages/login/login.vue`，仅 H5 端（微信小程序端不受影响）
- 严重级别：阻塞级（H5 调试时无法登录，无法进入首页）
- 发现方式：H5 dev 控制台运行时报错

## 现象

H5 调试时点击登录按钮，控制台连续报错且登录无法完成：

```
[vite] connected.
App Launch - 陪玩小程序 at App.vue:4
登录失败 {errMsg: "login:fail method 'uni.login' not supported"} at pages\login\login.vue:165
```

点「微信授权登录」也没有任何授权弹窗，只有报错。

## 复现步骤

1. 运行 H5（`npm run dev:h5`，vite 端口 8080）
2. 打开登录页，勾选协议
3. 点击「微信授权登录」或「暂不登录，先看看」
4. 控制台出现 `login:fail method 'uni.login' not supported`，toast 提示「登录失败」

## 根因

两个平台能力差异同时命中：

1. **`uni.login` 只在微信小程序等特定平台存在**，H5 未实现，调用会直接 reject：`method 'uni.login' not supported`
2. **`open-type="getPhoneNumber"` 在 H5 不生效**，`@getphonenumber` 永远不会触发。原代码把整个登录逻辑挂在 `@getphonenumber` 上，H5 下点击等于没有回调

结果：H5 下两条登录路径（授权登录 / 免登录进入）都断在 `uni.login` 上。

## 修复方案

用条件编译做平台双通道，小程序逻辑一行不减：

1. 新增 `getLoginCode()`：
   - `#ifdef MP-WEIXIN`：走 `uni.login()` 取真实 code，取不到则抛错
   - `#ifndef MP-WEIXIN`：返回本地模拟 code（`dev_code_<时间戳>`），H5 调试可跑通
2. 手机号按钮补 `@click="onPhoneLoginClick"`：`#ifndef MP-WEIXIN` 时用 click 兜底，直接以模拟授权结果调用 `onGetPhoneNumber`
3. `onGetPhoneNumber` 对 `e.detail` 做空值保护（H5 兜底调用没有真实 detail）
4. H5 兜底路径下加 loading 防重复点击（小程序端保持原行为）

## 改动文件

| 文件 | 改动 |
|---|---|
| `pages/login/login.vue` | 新增 `getLoginCode()`、`onPhoneLoginClick()`；两处登录逻辑统一改用 `getLoginCode()`；`e.detail` 空值保护 |

## 回归验证结果

| 验证项 | 结果 |
|---|---|
| H5 点击「微信授权登录」 | 通过：模拟 code → `UserApi.wxLogin`（`useMock = true`）返回 mock token → 写入 storage → 跳转首页 |
| H5 点击「暂不登录，先看看」 | 通过：同上，不再报 `uni.login` 错误 |
| 重复点击 | 通过：loading 期间直接 return |
| 微信小程序端 | **未实机验证**（需 appid 与云开发环境，见 `manifest.json` 的 mp-weixin appid 为空）；条件编译分支已保留原逻辑 |
| 资产保真校验 | 通过：`node scripts/verify-assets.mjs` 中 `pages/login/login.vue` 哈希与台账一致 |

## 遗留问题

- 小程序端真实登录链路未跑通：需要真实 `appid` + 云开发环境 ID（`App.vue` 仍是占位符 `peiwan-lite-xxx`）
- `UserApi.wxLogin` 的 mock 分支始终返回成功，接真实后端前无法验证失败分支的交互
