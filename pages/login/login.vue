<template>
  <view class="page">
    <view class="content">
      <!-- 品牌区：零素材，靠宋体字距与竹青底色撑住气质 -->
      <view class="logo-section">
        <view class="logo-wrap">
          <text class="logo-word">蜀</text>
        </view>
        <text class="app-name">成都地陪</text>
        <text class="app-slogan">本地地陪带路，先选地方再挑人</text>
      </view>

      <!-- 三条价值说明，替代原陪玩时期的功能卖点 -->
      <view class="features">
        <view class="feature-item">
          <text class="feature-text">景点讲解</text>
        </view>
        <view class="feature-item">
          <text class="feature-text">半天 / 全天</text>
        </view>
        <view class="feature-item">
          <text class="feature-text">平台确认档期</text>
        </view>
      </view>

      <!-- 登录按钮 -->
      <view class="login-section">
        <button
          class="login-btn ds-pressable"
          hover-class="is-pressed"
          hover-stay-time="70"
          open-type="getPhoneNumber"
          @getphonenumber="onGetPhoneNumber"
          @click="onPhoneLoginClick"
        >
          <text class="btn-text">微信授权登录</text>
        </button>

        <button
          class="login-btn outline ds-pressable"
          hover-class="is-pressed"
          hover-stay-time="70"
          @click="loginWithUserInfo"
        >
          <text class="btn-text">暂不登录，先看看</text>
        </button>
      </view>

      <!-- 协议 -->
      <view class="agreement">
        <view
          class="checkbox-wrap ds-pressable"
          hover-class="is-pressed"
          hover-stay-time="70"
          @click="agreed = !agreed"
        >
          <view :class="['checkbox', agreed ? 'checked' : '']">
            <text v-if="agreed" class="checkbox__check ds-pop-in">✓</text>
          </view>
        </view>
        <text class="agreement-text">登录即代表同意</text>
        <text
          class="agreement-link ds-pressable"
          hover-class="is-pressed"
          hover-stay-time="70"
          @click="goAgreement('user')"
        >《用户协议》</text>
        <text class="agreement-text">和</text>
        <text
          class="agreement-link ds-pressable"
          hover-class="is-pressed"
          hover-stay-time="70"
          @click="goAgreement('privacy')"
        >《隐私政策》</text>
      </view>
    </view>

    <!-- Loading：遮罩淡入，先让「正在发生什么」被看见，而不是啪一下盖住整屏 -->
    <view v-if="loading" class="loading-mask ds-fade-in">
      <view class="loading-box">
        <view class="ds-spinner ds-spinner--lg"></view>
        <text class="loading-text">登录中…</text>
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
    this.checkLogin();
  },

  methods: {
    async checkLogin() {
      try {
        const user = await UserApi.getCurrentUser();
        // 新数据层返回的是 id（不再是陪玩时期的 _id）
        if (user && user.id) {
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
        const code = await this.getLoginCode();

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
        const code = await this.getLoginCode();

        const result = await UserApi.wxLogin({ code });

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
      uni.navigateTo({ url: `/pages/webview/agreement?type=${type}` });
    }
  }
};
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $ds-surface;
  /* 光斑：与首页同一档，右上 → 左下最欢迎（气泡漫游 · bg-tr 档） */
  background-image: $ds-bg-tr;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 $ds-space-7;
  padding-top: 88px;
}

/* ---------- 品牌区 ---------- */
.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: $ds-space-7;
}

.logo-wrap {
  width: 80px;
  height: 80px;
  border-radius: $ds-shape-md;
  background: $ds-ink-btn;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $ds-btn-shadow;
}

.logo-word {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: 0;
  color: #ffffff;
}

.app-name {
  margin-top: $ds-space-5;
  font-size: $ds-fs-headline;
  font-weight: 800;
  letter-spacing: $ds-ls-title;
  color: $ds-ink;
}

.app-slogan {
  margin-top: $ds-space-2;
  font-size: $ds-fs-label;
  color: $ds-ink-2;
}

/* ---------- 价值说明 ---------- */
.features {
  display: flex;
  gap: $ds-space-6;
  margin-bottom: $ds-space-8;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.feature-text {
  font-size: $ds-fs-label-sm;
  color: $ds-ink-2;
}

/* ---------- 登录按钮 ---------- */
.login-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: $ds-space-3;
}

/* 主按钮：纯黑胶囊（不用渐变），一屏一个主操作 */
.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 46px;
  background: $ds-ink-btn;
  border-radius: $ds-shape-full;
  box-shadow: $ds-btn-shadow;

  &.outline {
    background: rgba(255, 255, 255, 0.68);
    box-shadow: inset 0 0 0 1px $ds-outline;

    .btn-text {
      color: $ds-ink-2;
      font-weight: 650;
    }
  }
}

.btn-text {
  font-size: $ds-fs-body;
  font-weight: 600;
  color: $ds-on-primary;
}

/* ---------- 协议 ---------- */
.agreement {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  margin-top: $ds-space-7;
}

.checkbox-wrap {
  margin-right: $ds-space-2;
}

.checkbox {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1.5px $ds-outline;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  transition: background-color $ds-dur-fast $ds-ease-out, box-shadow $ds-dur-fast $ds-ease-out;

  &.checked {
    background: $ds-ink-btn;
    box-shadow: none;
  }
}

.checkbox__check {
  font-size: 11px;
  line-height: 1;
  color: $ds-on-primary;
}

.agreement-text {
  font-size: $ds-fs-label-sm;
  color: $ds-ink-2;
}

.agreement-link {
  font-size: $ds-fs-label-sm;
  color: $ds-secondary;
}

/* ---------- Loading ---------- */
.loading-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(42, 39, 64, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-box {
  background: rgba(255, 255, 255, 0.86);
  border-radius: $ds-shape-lg;
  padding: $ds-space-6 $ds-space-8;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-text {
  margin-top: $ds-space-3;
  font-size: $ds-fs-body-sm;
  color: $ds-ink-2;
}
</style>
