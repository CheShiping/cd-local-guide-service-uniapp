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
</style>
