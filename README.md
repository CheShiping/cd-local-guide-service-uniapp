# 陪玩小程序

基于 uni-app + Vue3 开发的陪玩达人预约小程序。

## 项目结构

```
peiwan-lite/
├── api/                  # API 接口
│   └── index.js          # 云开发 API 封装
├── components/           # 公共组件
├── pages/                # 页面
│   ├── index/            # 首页
│   ├── tabbar/           # TabBar 页面
│   ├── clerk/            # 达人相关
│   ├── appointment/      # 预约相关
│   └── admin/            # 管理后台
├── static/               # 静态资源
│   ├── tabbar/           # TabBar 图标
│   └── images/           # 图片资源
├── utils/                # 工具函数
│   └── index.js
├── App.vue               # 应用入口
├── main.js               # 主入口
├── pages.json            # 页面配置
├── manifest.json         # 应用配置
├── uni.scss              # 全局样式变量
└── package.json          # 依赖配置
```

## 功能模块

### 用户端
- 首页：达人列表、分类筛选、搜索
- 达人详情：个人信息、服务项目、预约
- 我的预约：预约列表、取消预约
- 个人中心：用户信息、管理入口

### 管理端
- 达人管理：审核达人、编辑达人
- 预约管理：查看预约、完成预约

## 开发说明

### 环境要求
- HBuilderX 3.0+
- Node.js 16+
- 微信开发者工具（小程序开发）

### 运行项目

1. 用 HBuilderX 打开项目
2. 运行 -> 运行到小程序模拟器 -> 微信开发者工具
3. 在微信开发者工具中预览

### 云开发配置

1. 开通微信云开发
2. 修改 `manifest.json` 中的 appid
3. 修改 `App.vue` 中的云环境 ID
4. 创建数据库集合：user, clerk, category, appointment

## 技术栈

- uni-app - 跨平台框架
- Vue 3 - 前端框架
- Pinia - 状态管理
- 微信云开发 - 后端服务

## License

MIT
