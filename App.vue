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
/* 全局样式：令牌见 uni.scss 的 $ds-*（与 DESIGN.md 同步） */
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

/* 隐藏滚动条 */
::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
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
/* 入场一律从「差一点」开始（位移 8-32px），不从 scale(0) 从无到有 */
@keyframes ds-card-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 横向切换：从行进方向的那一侧进来，说明「内容是从这边换过来的」 */
@keyframes ds-card-in-next {
  from { opacity: 0; transform: translateX(24px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes ds-card-in-prev {
  from { opacity: 0; transform: translateX(-24px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes ds-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes ds-pop-in {
  from { opacity: 0; transform: scale(0.6); }
  to   { opacity: 1; transform: scale(1); }
}

/* 常量运动用 linear：进度不该有缓动 */
@keyframes ds-spin {
  to { transform: rotate(360deg); }
}

/* ---------- 页面转场（仅 H5 需要手写） ---------- */
/* 小程序（含微信）的 navigateTo / navigateBack 是原生转场，自己再动一层会变成双重动画；
   所以这两个动画与 .is-page-* 只在 H5 生效（见下面的条件编译）。 */
@keyframes ds-page-in {
  from { opacity: 0; transform: translateX(32px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* 返回：当前页右移并淡下去。刻意不淡到 0 —— 全站页面底色都是同一张宣纸，
   露出来的那一块和上一页的底色一致，所以换页那一下几乎看不出来 */
@keyframes ds-page-out {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0.15; transform: translateX(40%); }
}

/* ---------- 列表入场 ---------- */
/* fill-mode 用 backwards 而不是 both：延迟期间先按 from 藏住，
   播完就交还给普通样式，否则残留的 transform 会盖掉按压反馈的 scale。 */
.ds-enter-up,
.ds-enter-next,
.ds-enter-prev {
  animation-duration: $ds-dur-base;
  animation-timing-function: $ds-ease-out;
  animation-fill-mode: backwards;
}

.ds-enter-up { animation-name: ds-card-in-up; }
.ds-enter-next { animation-name: ds-card-in-next; }
.ds-enter-prev { animation-name: ds-card-in-prev; }

.ds-fade-in {
  animation: ds-fade-in $ds-dur-base $ds-ease-out backwards;
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

/* ---------- 页面转场类（仅 H5） ---------- */
/* 进入：各页根节点上就带着 is-page-in，页面被创建时动画自然播一次 */
/* 退出：页面在返回前把类换成 is-page-out，播完再真正 navigateBack（见 utils/motion.js） */
/* #ifdef H5 */
.is-page-in {
  animation: ds-page-in $ds-dur-page $ds-ease-out backwards;
}

.is-page-out {
  animation: ds-page-out $ds-dur-page-leave $ds-ease-in-out both;
}
/* #endif */

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
  .ds-enter-up,
  .ds-enter-next,
  .ds-enter-prev {
    animation-name: ds-fade-in;
  }

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

  /* 页面转场只留淡入淡出，去掉位移 */
  .is-page-in {
    animation-name: ds-fade-in;
  }

  .is-page-out {
    animation-name: ds-page-fade-out;
  }
}

@keyframes ds-page-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}
</style>
