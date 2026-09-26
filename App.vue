<script>
export default {
  onLaunch() {
    console.log('App Launch - 陪玩小程序');
    
    // 初始化云开发
    // #ifdef MP-WEIXIN
    if (wx.cloud) {
      wx.cloud.init({
        env: 'peiwan-lite-xxx', // 替换为你的云开发环境ID
        traceUser: true
      });
      console.log('云开发初始化成功');
    }
    // #endif
    
    // 检查登录状态
    this.checkLogin();
  },
  
  methods: {
    checkLogin() {
      const token = uni.getStorageSync('token');
      if (!token) {
        // 未登录，跳转到登录页
        uni.redirectTo({ url: '/pages/login/login' });
      }
    }
  }
};
</script>

<style lang="scss">
/* 全局样式 - Linear 风格 */
page {
  background-color: #F5F5F5;
  font-size: 15px;
  color: #1A1A1A;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
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
