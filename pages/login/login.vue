<template>
  <view class="page">
    <view class="content">
      <!-- Logo 区域 -->
      <view class="logo-section">
        <view class="logo-wrap">
          <text class="logo-icon">🎮</text>
        </view>
        <text class="app-name">陪玩达人</text>
        <text class="app-slogan">找到你的专属陪玩伙伴</text>
      </view>

      <!-- 特性介绍 -->
      <view class="features">
        <view class="feature-item">
          <text class="feature-icon">⚡</text>
          <text class="feature-text">快速匹配</text>
        </view>
        <view class="feature-item">
          <text class="feature-icon">💎</text>
          <text class="feature-text">优质达人</text>
        </view>
        <view class="feature-item">
          <text class="feature-icon">🛡</text>
          <text class="feature-text">安全保障</text>
        </view>
      </view>

      <!-- 登录按钮 -->
      <view class="login-section">
        <button 
          class="login-btn" 
          open-type="getPhoneNumber"
          @getphonenumber="onGetPhoneNumber"
          @click="onPhoneLoginClick"
        >
          <text class="btn-icon">📱</text>
          <text class="btn-text">微信授权登录</text>
        </button>
        
        <button class="login-btn outline" @click="loginWithUserInfo">
          <text class="btn-icon">👤</text>
          <text class="btn-text">暂不登录，先看看</text>
        </button>
      </view>

      <!-- 协议 -->
      <view class="agreement">
        <view class="checkbox-wrap" @click="agreed = !agreed">
          <view :class="['checkbox', agreed ? 'checked' : '']">
            <text v-if="agreed">✓</text>
          </view>
        </view>
        <text class="agreement-text">登录即代表同意</text>
        <text class="agreement-link" @click="goAgreement('user')">《用户协议》</text>
        <text class="agreement-text">和</text>
        <text class="agreement-link" @click="goAgreement('privacy')">《隐私政策》</text>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="loading-mask">
      <view class="loading-box">
        <view class="loading-spinner"></view>
        <text class="loading-text">登录中...</text>
      </view>
    </view>
  </view>
</template>

<script>
import { UserApi } from '@/api/index.js';

export default {
  data() {
    return {
      agreed: false,
      loading: false
    };
  },
  
  onLoad() {
    // 检查是否已登录
    this.checkLogin();
  },
  
  methods: {
    async checkLogin() {
      try {
        const user = await UserApi.getCurrentUser();
        if (user?._id) {
          this.goHome();
        }
      } catch (e) {
        console.log('未登录');
      }
    },

    /**
     * 获取登录 code
     * 微信小程序使用 uni.login；H5 等不支持的平台返回本地模拟 code，方便调试
     */
    async getLoginCode() {
      // #ifdef MP-WEIXIN
      const loginRes = await uni.login();
      if (!loginRes || !loginRes.code) {
        throw new Error('获取登录 code 失败');
      }
      return loginRes.code;
      // #endif

      // #ifndef MP-WEIXIN
      return 'dev_code_' + Date.now();
      // #endif
    },

    /**
     * H5 不支持 open-type="getPhoneNumber"，@getphonenumber 不会触发，
     * 这里用 click 兜底，走模拟授权流程
     */
    onPhoneLoginClick() {
      // #ifndef MP-WEIXIN
      this.onGetPhoneNumber({ detail: { errMsg: 'getPhoneNumber:ok' } });
      // #endif
    },

    async onGetPhoneNumber(e) {
      // #ifndef MP-WEIXIN
      if (this.loading) return;
      // #endif

      if (!this.agreed) {
        uni.showToast({ title: '请先同意用户协议', icon: 'none' });
        return;
      }

      const detail = (e && e.detail) || {};
      if (detail.errMsg && detail.errMsg !== 'getPhoneNumber:ok') {
        uni.showToast({ title: '授权失败', icon: 'none' });
        return;
      }

      this.loading = true;
      
      try {
        // 先获取登录 code
        const code = await this.getLoginCode();
        
        // 调用后端接口换取 openid 和 session_key
        const result = await UserApi.wxLogin({
          code,
          encryptedData: detail.encryptedData,
          iv: detail.iv
        });

        if (result.token) {
          uni.setStorageSync('token', result.token);
        }

        uni.showToast({ title: '登录成功', icon: 'success' });
        
        setTimeout(() => {
          this.goHome();
        }, 1000);
      } catch (e) {
        console.error('登录失败', e);
        uni.showToast({ title: '登录失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },

    async loginWithUserInfo() {
      if (!this.agreed) {
        uni.showToast({ title: '请先同意用户协议', icon: 'none' });
        return;
      }

      this.loading = true;

      try {
        // 获取登录 code
        const code = await this.getLoginCode();
        
        const result = await UserApi.wxLogin({
          code
        });

        if (result.token) {
          uni.setStorageSync('token', result.token);
        }

        uni.showToast({ title: '登录成功', icon: 'success' });
        
        setTimeout(() => {
          this.goHome();
        }, 1000);
      } catch (e) {
        console.error('登录失败', e);
        uni.showToast({ title: '登录失败，请重试', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },

    goHome() {
      uni.switchTab({ url: '/pages/index/index' });
    },

    goAgreement(type) {
      uni.navigateTo({
        url: `/pages/webview/agreement?type=${type}`
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.page {
  background: #FFFFFF;
  min-height: 100vh;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 32px;
  padding-top: 80px;
}

/* Logo 区域 */
.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 48px;
}

.logo-wrap {
  width: 88px;
  height: 88px;
  background: linear-gradient(135deg, #FF4D6A 0%, #FF8A9B 100%);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(255, 77, 106, 0.3);
}

.logo-icon {
  font-size: 44px;
}

.app-name {
  font-size: 26px;
  font-weight: 700;
  color: #000000;
  margin-top: 20px;
}

.app-slogan {
  font-size: 14px;
  color: #999999;
  margin-top: 8px;
}

/* 特性介绍 */
.features {
  display: flex;
  gap: 32px;
  margin-bottom: 60px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.feature-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.feature-text {
  font-size: 13px;
  color: #666666;
}

/* 登录按钮 */
.login-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 50px;
  background: #FF4D6A;
  border-radius: 10px;
  border: none;
  
  &.outline {
    background: #FFFFFF;
    border: 1px solid #E5E5E5;
    
    .btn-text {
      color: #666666;
    }
  }
}

.btn-icon {
  font-size: 18px;
  margin-right: 8px;
}

.btn-text {
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
}

/* 协议 */
.agreement {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  margin-top: 32px;
}

.checkbox-wrap {
  margin-right: 6px;
}

.checkbox {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid #CCCCCC;
  display: flex;
  align-items: center;
  justify-content: center;
  
  text {
    font-size: 12px;
    color: #FFFFFF;
  }
  
  &.checked {
    background: #FF4D6A;
    border-color: #FF4D6A;
  }
}

.agreement-text {
  font-size: 12px;
  color: #999999;
}

.agreement-link {
  font-size: 12px;
  color: #FF4D6A;
}

/* Loading */
.loading-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-box {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 24px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #F0F0F0;
  border-top-color: #FF4D6A;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: #666666;
  margin-top: 12px;
}
</style>
