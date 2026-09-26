<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- 导航栏 -->
    <view class="navbar">
      <view
        class="nav-back ds-pressable"
        hover-class="is-pressed"
        hover-stay-time="70"
        @click="goBack"
      >
        <text class="back-icon">‹</text>
      </view>
      <text class="nav-title">{{ title }}</text>
      <view class="nav-right"></view>
    </view>

    <scroll-view scroll-y class="body-scroll">
      <view class="doc">
        <text class="doc-updated">更新日期：2026-09-26</text>

        <view v-for="(section, index) in sections" :key="index" class="section">
          <text class="section-title">{{ section.title }}</text>
          <text class="section-text">{{ section.text }}</text>
        </view>

        <view class="notice">
          <text class="notice-text">
            本页为 MVP 阶段的占位条款，用于打通《用户协议》《隐私政策》的入口与跳转。
            正式上线前需替换为法务确认后的正式文本。
          </text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
/**
 * 协议页（用户协议 / 隐私政策）
 *
 * 背景：登录页一直跳 /pages/webview/agreement?type=xxx，但该页面从未注册（见 docs/legacy-assets.json 的 gap-002）。
 * MVP 只做「能点开、能看清、能返回」，条款文本为占位内容，正式文本待法务确认后替换。
 *
 * 入参：type = 'user'（默认，用户协议）| 'privacy'（隐私政策）
 */
const DOCS = {
  user: {
    title: '用户协议',
    sections: [
      {
        title: '一、服务内容',
        text: '本小程序提供成都地区景点地陪（向导）的预约撮合服务：游客选择景点与地陪，提交预约；地陪确认接单；平台人工确认档期后，双方按约定时间见面。'
      },
      {
        title: '二、预约与确认',
        text: '游客提交预约后订单处于「待确认」状态；地陪可接单或拒单；平台人工确认档期后订单变为「已确认」。预约日期与时段以订单记录为准。'
      },
      {
        title: '三、费用与结算',
        text: '费用按所选套餐计价，页面展示金额为地陪服务费；门票、餐饮、交通等费用由游客自理。超时部分不做自动计费，由双方线下协商或由平台在订单备注中记录。'
      },
      {
        title: '四、取消规则',
        text: '订单在「待确认」或「已确认」状态下可取消；地陪拒单、游客取消或平台处理取消后，订单变为「已取消」，取消后不可恢复。'
      },
      {
        title: '五、双方责任',
        text: '地陪应按约定时间提供服务并保证信息真实；游客应提供准确的预约信息并在约定地点准时出现。出现争议时请联系平台协调处理。'
      }
    ]
  },
  privacy: {
    title: '隐私政策',
    sections: [
      {
        title: '一、我们收集的信息',
        text: '为完成登录与预约，我们会收集：微信登录标识（openid）、昵称与头像、手机号（经你授权后获取）、你填写的预约信息（景点、日期、时段、人数、备注）。'
      },
      {
        title: '二、信息的使用',
        text: '上述信息仅用于账号识别、预约撮合、订单确认与售后协调，不会用于与预约服务无关的用途。'
      },
      {
        title: '三、信息的展示',
        text: '订单相关方（游客、承接该订单的地陪、平台管理员）可查看完成服务所必需的信息；其他用户无法查看你的手机号等联系方式。'
      },
      {
        title: '四、信息的存储',
        text: '信息存储于平台服务器，仅保留为提供服务所必需的期限。你可以在「我的」页面更新昵称与头像信息。'
      },
      {
        title: '五、你的权利',
        text: '你可以随时查看与更正个人资料，也可以通过平台客服申请注销账号；注销后我们将停止使用并删除或匿名化你的个人信息。'
      }
    ]
  }
};

export default {
  data() {
    return {
      type: 'user',
      statusBarHeight: 20
    };
  },

  computed: {
    doc() {
      return DOCS[this.type] || DOCS.user;
    },
    title() {
      return this.doc.title;
    },
    sections() {
      return this.doc.sections;
    }
  },

  onLoad(options = {}) {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    this.type = options.type === 'privacy' ? 'privacy' : 'user';
  },

  methods: {
    goBack() {
      uni.navigateBack();
    }
  }
};
</script>

<style lang="scss" scoped>
.page {
  background: $ds-surface;
  background-image: $ds-bg-calm-ink;
  min-height: 100vh;
}

.status-bar {
  background: transparent;
}

.navbar {
  display: flex;
  align-items: center;
  height: $ds-h-navbar;
  padding: 0 8px;
  border-bottom: 1px solid $ds-outline-variant;
}

.nav-back {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 26px;
  color: $ds-ink;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: $ds-fs-title;
  font-weight: 750;
  color: $ds-ink;
}

.nav-right {
  width: 44px;
}

.body-scroll {
  height: calc(100vh - #{$ds-h-navbar});
}

.doc {
  padding: $ds-space-5 $ds-pad-screen $ds-space-8;
}

.doc-updated {
  display: block;
  font-size: $ds-fs-label-sm;
  color: $ds-ink-2;
  margin-bottom: $ds-space-5;
}

.section {
  margin-bottom: $ds-space-6;
}

.section-title {
  display: block;
  font-size: $ds-fs-title;
  font-weight: 750;
  color: $ds-ink;
  margin-bottom: $ds-space-2;
}

.section-text {
  display: block;
  font-size: $ds-fs-body-sm;
  line-height: 1.72;
  color: $ds-ink-2;
}

.notice {
  padding: $ds-space-4;
  background: $ds-primary-container;
  border-radius: $ds-shape-sm;
}

.notice-text {
  display: block;
  font-size: $ds-fs-label;
  line-height: 1.6;
  color: $ds-on-secondary-container;
}
</style>
