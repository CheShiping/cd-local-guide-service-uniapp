<script>
/**
 * 应用入口
 *
 * 数据源在 api/index.js 的 USE_MOCK 切换（MVP 全走 mock，见 docs/mvp-scope.json 的 dev-004）。
 * 原「微信云开发」初始化已移除：重构后不再使用云开发，对接后端走 api/http.js 的 HTTP 路由表，
 * 保留 wx.cloud.init 会带着占位环境 ID 在真机上报错。
 */
export default {
  onLaunch() {
    console.log('App Launch - 成都地陪');

    // 未登录则回登录页（登录页是 pages.json 的第一页，这里只兜住从其它入口进入的情况）
    this.checkLogin();
  },

  methods: {
    checkLogin() {
      const token = uni.getStorageSync('token');
      if (!token) {
        uni.redirectTo({ url: '/pages/login/login' });
      }
    }
  }
};
</script>

<style lang="scss">
/* 全局样式：令牌见 uni.scss 的 $ds-*（与 DESIGN.md 同步，主题：气泡漫游） */
page {
  background-color: $ds-surface;
  font-size: $ds-fs-body;
  color: $ds-ink;
  font-family: $ds-font-body;
  -webkit-font-smoothing: antialiased;
}

/* 清除按钮默认样式 */
button {
  margin: 0;
  padding: 0;
  background: none;
  border: none;
  color: inherit;
  line-height: inherit;

  &::after {
    border: none;
  }
}

/* 隐藏滚动条（全部端、全部容器，防止内容高度变化时闪出滚动条） */
::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

* {
  scrollbar-width: none;          /* Firefox */
  -ms-overflow-style: none;       /* 旧 Edge */
}

/* 页面内容一律不允许横向溢出（横向滚动只属于 scroll-view 内部） */
html,
body,
.uni-page-body {
  overflow-x: hidden;
}

/* 安全区域适配 */
.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

/* ==========================================================================
   动效（全局）
   keyframes 必须放在这里：页面样式是 scoped 的，各自声明会被编译成不同的名字，
   七屏共用不了。规范见 DESIGN.md §13，令牌见 uni.scss §1.8。
   只动 transform 与 opacity —— 它们跳过 layout 与 paint，且跑在主线程之外。
   ========================================================================== */

/* ---------- 关键帧 ---------- */
/* 动效只服务状态变化（shadcn 对齐）：淡入、0.96 缩放入场、常量运动。
   页面切换一律瞬时（小程序是原生转场；H5 不再做手写转场 —— 淡入淡出会透出下层页面）。 */
@keyframes ds-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes ds-pop-in {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}

/* 常量运动用 linear：进度不该有缓动 */
@keyframes ds-spin {
  to { transform: rotate(360deg); }
}

/* ---------- 状态淡入 / 缩放 ---------- */
.ds-fade-in {
  animation: ds-fade-in $ds-dur-fast $ds-ease-out backwards;
}

.ds-pop-in {
  animation: ds-pop-in $ds-dur-press $ds-ease-out backwards;
}

/* ---------- 加载指示器 ---------- */
.ds-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid $ds-outline;
  border-top-color: $ds-primary;
  border-radius: $ds-shape-full;
  animation: ds-spin $ds-dur-spin linear infinite;
}

/* 放在主色实心按钮上时换成白圈 */
.ds-spinner--on-primary {
  border-color: rgba(255, 255, 255, 0.45);
  border-top-color: $ds-on-primary;
}

/* 全屏遮罩里的加载指示器要看得见 */
.ds-spinner--lg {
  width: 28px;
  height: 28px;
  border-width: 3px;
}

/* ---------- 按压反馈 ---------- */
/* 小程序里 :active 不可靠，统一用 view 的 hover-class="is-pressed" */
.ds-pressable {
  position: relative;
  transition: transform $ds-dur-press $ds-ease-out;
}

.is-pressed {
  transform: scale(0.96);
}

/* 导航栏的返回/开关按钮是 44×44 的透明热区：给个圆角，
   否则按压叠层会是一个方块，和全站的圆角语言不一致 */
.icon-btn,
.nav-back {
  border-radius: $ds-shape-sm;
}

/* 按压叠层：DESIGN.md §8 要求「用 8% 主色叠层，不用 opacity 变暗」——
   这里叠的是元素自己的文字色（currentColor），深底按钮上就是一层浅色高光 */
.ds-pressable.is-pressed::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: inherit;
  background: currentColor;
  opacity: 0.08;
  pointer-events: none;
}

/* ---------- 降低动效 ---------- */
/* 不是「全部关掉」：淡入帮助理解状态变化，要留；位移与按压回弹去掉。
   WXSS 支持 @media 时小程序同样生效，不支持则被忽略（H5 一定生效）。 */
@media (prefers-reduced-motion: reduce) {
  .ds-pressable {
    transition: none;
  }

  .is-pressed {
    transform: none;
  }

  .is-pressed::after {
    opacity: 0;
  }

  .ds-spinner {
    animation-duration: 1600ms;
  }
}
</style>
