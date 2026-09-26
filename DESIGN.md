# DESIGN.md - 陪玩小程序设计规范

基于 Linear 风格的专业移动端设计系统

---

## 1. Visual Theme & Atmosphere

**设计理念：** 简洁、现代、专业、克制

- 整体风格偏向 iOS Native + Linear 的混合体
- 强调内容本身，减少装饰
- 适合年轻用户群体（游戏陪玩场景）
- 配色活泼但不杂乱

---

## 2. Color Palette & Roles

### 主色调
| 颜色 | Hex | 用途 |
|------|-----|------|
| 主色 | `#FF4D6A` | 按钮高亮、选中状态、重要图标 |
| 主色浅 | `#FFF0F3` | 标签背景、强调区域 |

### 中性色
| 颜色 | Hex | 用途 |
|------|-----|------|
| 纯黑 | `#000000` | 主要文字 |
| 深灰 | `#1A1A1A` | 次要文字 |
| 中灰 | `#666666` | 辅助文字 |
| 浅灰 | `#999999` | 占位符、禁用态 |
| 边框灰 | `#E5E5E5` | 分割线、边框 |
| 背景灰 | `#F5F5F5` | 页面背景 |
| 纯白 | `#FFFFFF` | 卡片、弹窗背景 |

### 功能色
| 颜色 | Hex | 用途 |
|------|-----|------|
| 成功 | `#34C759` | 在线状态、完成 |
| 警告 | `#FF9500` | 待处理 |
| 错误 | `#FF3B30` | 错误提示 |

### 性别色
| 颜色 | Hex | 用途 |
|------|-----|------|
| 女 | `#FF4D6A` | 女性标签 |
| 男 | `#007AFF` | 男性标签 |

---

## 3. Typography Rules

### 字体
- 主字体：`-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif`
- 数字字体：系统默认

### 字号层级
| 级别 | 字号 | 字重 | 用途 |
|------|------|------|------|
| H1 | 24px | 700 | 页面标题 |
| H2 | 20px | 600 | 区块标题 |
| H3 | 17px | 600 | 卡片标题 |
| Body | 15px | 400 | 正文 |
| Body2 | 14px | 400 | 次要正文 |
| Caption | 13px | 400 | 辅助说明 |
| Tag | 12px | 500 | 标签文字 |

### 行高
- 标题行高：1.2
- 正文字行高：1.5

---

## 4. Component Stylings

### 按钮
```scss
// 主按钮
.btn-primary {
  background: #FF4D6A;
  color: #FFFFFF;
  border-radius: 10px;
  padding: 12px 20px;
  font-size: 15px;
  font-weight: 600;
  
  &:active {
    opacity: 0.8;
  }
  
  &:disabled {
    background: #E5E5E5;
    color: #999999;
  }
}

// 次按钮
.btn-secondary {
  background: #F5F5F5;
  color: #1A1A1A;
  border-radius: 10px;
}
```

### 卡片
```scss
.card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  border: 1px solid #F0F0F0;
}
```

### 输入框
```scss
.input {
  background: #F5F5F5;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 15px;
  border: 1px solid transparent;
  
  &:focus {
    background: #FFFFFF;
    border-color: #FF4D6A;
  }
  
  &::placeholder {
    color: #999999;
  }
}
```

### 标签/徽章
```scss
.tag {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  
  &.tag-primary {
    background: #FFF0F3;
    color: #FF4D6A;
  }
}
```

### 头像
```scss
.avatar {
  border-radius: 12px; // 方圆角
  border: 1px solid #F0F0F0;
}
```

---

## 5. Layout Principles

### 间距系统（8px 基数）
| 名称 | 值 | 用途 |
|------|-----|------|
| xs | 4px | 紧凑元素间距 |
| sm | 8px | 标签内边距 |
| md | 12px | 卡片内边距 |
| lg | 16px | 区块间距 |
| xl | 20px | 页面边距 |
| xxl | 24px | 大区块间距 |

### 页面结构
- 安全边距：16px
- 卡片圆角：12px
- 元素间距：12px
- 列表项高度：最小 44px（触摸友好）

### 移动端特殊
- 顶部安全区：动态获取 statusBarHeight
- 底部安全区：适配 home indicator
- 触摸目标：最小 44x44px

---

## 6. Depth & Elevation

### 阴影系统
```scss
// 卡片
shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04);

// 弹窗
shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);

// 浮层
shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
```

### 层级
| 元素 | z-index |
|------|---------|
| 页面 | 1 |
| 卡片 | 10 |
| 抽屉 | 100 |
| 弹窗 | 1000 |
| toast | 2000 |

---

## 7. Do's and Don'ts

### Do
- ✅ 保持元素间距一致
- ✅ 使用系统字体
- ✅ 重要操作使用主色
- ✅ 状态变化有反馈
- ✅ 触摸区域不小于 44px

### Don't
- ❌ 避免纯黑色背景（伤眼）
- ❌ 不要用太多颜色（不超过 3 种）
- ❌ 避免连续大字号
- ❌ 不要用粗边框装饰

---

## 8. Responsive Behavior

### 微信小程序适配
- 宽度：100% / 固定 750rpx
- 高度：自适应
- 安全区：使用 env(safe-area-inset-*)
- 刘海屏：动态获取 statusBarHeight

---

## 9. 快速参考

### 颜色变量
```scss
$primary: #FF4D6A;
$primary-light: #FFF0F3;
$text-primary: #000000;
$text-secondary: #1A1A1A;
$text-tertiary: #666666;
$text-placeholder: #999999;
$border: #E5E5E5;
$bg-page: #F5F5F5;
$bg-card: #FFFFFF;
$success: #34C759;
$warning: #FF9500;
$error: #FF3B30;
$male: #007AFF;
$female: #FF4D6A;
```

### 常用样式类
```scss
.px-16 { padding-left: 16px; padding-right: 16px; }
.py-12 { padding-top: 12px; padding-bottom: 12px; }
.rounded-12 { border-radius: 12px; }
.shadow-sm { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04); }
```

---

*本规范适用于陪玩小程序所有页面*
