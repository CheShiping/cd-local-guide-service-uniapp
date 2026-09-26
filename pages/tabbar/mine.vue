<template>
  <view :class="['page', pageMotion]">
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <view class="header-content">
      <text class="header-title">我的</text>
    </view>

    <!-- 用户卡片 -->
    <view class="user-card">
      <view class="user-main">
        <view class="avatar-wrap">
          <image :src="userInfo.avatarUrl || userInfo.avatar" class="avatar" mode="aspectFill" />
        </view>
        <view class="user-content">
          <view class="user-name-row">
            <text class="user-name">{{ userInfo.nickname || '未登录' }}</text>
            <text class="role-tag" v-if="userInfo.roleLabel">{{ userInfo.roleLabel }}</text>
          </view>
          <text class="user-tip">{{ userTip }}</text>
        </view>
      </view>
    </view>

    <!-- 按角色分流的入口：游客看订单，地陪看接单，管理员看后台 -->
    <view class="menu-section">
      <view class="menu-group">
        <view
          class="menu-item ds-pressable"
          v-if="isGuide"
          hover-class="is-pressed"
          hover-stay-time="70"
          @click="goGuideOrders"
        >
          <text class="menu-text">接单</text>
          <view class="menu-right">
            <text class="menu-badge" v-if="waitingCount">{{ waitingCount }}</text>
            <text class="arrow">›</text>
          </view>
        </view>

        <view
          class="menu-item ds-pressable"
          v-if="!isGuide"
          hover-class="is-pressed"
          hover-stay-time="70"
          @click="goMyOrders"
        >
          <text class="menu-text">我的订单</text>
          <view class="menu-right">
            <text class="menu-badge" v-if="pendingCount">{{ pendingCount }}</text>
            <text class="arrow">›</text>
          </view>
        </view>

        <view
          class="menu-item ds-pressable"
          v-if="isAdmin"
          hover-class="is-pressed"
          hover-stay-time="70"
          @click="goAdminOrders"
        >
          <text class="menu-text">订单管理</text>
          <view class="menu-right">
            <text class="menu-badge" v-if="adminPendingCount">{{ adminPendingCount }}</text>
            <text class="arrow">›</text>
          </view>
        </view>

        <view
          class="menu-item ds-pressable"
          v-if="isAdmin"
          hover-class="is-pressed"
          hover-stay-time="70"
          @click="goAdminGuides"
        >
          <text class="menu-text">地陪审核</text>
          <view class="menu-right">
            <text class="menu-badge warn" v-if="pendingGuideCount">{{ pendingGuideCount }} 待审</text>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 协议入口：登录页引用的两个协议文档 -->
    <view class="menu-section">
      <view class="menu-group">
        <view
          class="menu-item ds-pressable"
          hover-class="is-pressed"
          hover-stay-time="70"
          @click="goAgreement('user')"
        >
          <text class="menu-text">用户协议</text>
          <text class="arrow">›</text>
        </view>
        <view
          class="menu-item ds-pressable"
          hover-class="is-pressed"
          hover-stay-time="70"
          @click="goAgreement('privacy')"
        >
          <text class="menu-text">隐私政策</text>
          <text class="arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 仅 mock 阶段：一键切换身份，方便走通游客 / 地陪 / 管理员三端闭环 -->
    <view class="menu-section" v-if="useMock">
      <view class="menu-group">
        <view class="menu-group-head">
          <text class="menu-group-title">演示身份切换</text>
          <text class="menu-group-note">仅 mock 生效，接后端后移除</text>
        </view>
        <view class="role-row">
          <view
            v-for="role in roleOptions"
            :key="role.value"
            :class="['role-chip', 'ds-pressable', currentRole === role.value ? 'is-on' : '']"
            hover-class="is-pressed"
            hover-stay-time="70"
            @click="switchRole(role.value)"
          >
            <text class="role-chip__text">{{ role.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <text class="footnote">成都景点地陪 · MVP</text>
  </view>
</template>

<script>
/**
 * 我的（账户与角色分流）
 *
 * MVP 的角色分流：游客 → 我的订单；地陪 → 接单；管理员 → 订单管理 + 地陪审核。
 * 登录后仍统一落首页（pages/login/login.vue 属 keep 档，不改），本页负责按角色给入口。
 *
 * 「演示身份切换」只在 USE_MOCK 为真时出现：mock 默认身份是管理员（便于演示后台），
 * 没有后端切换接口，接真实后端后删除该区块。
 */
import {
  USE_MOCK,
  UserApi,
  OrderApi,
  GuideApi,
  ROLES,
  ROLE_LABELS,
  ORDER_STATUS,
  switchMockRole
} from '@/api/index.js';
import { createPageMotion } from '@/utils/motion.js';

const roleOptions = [
  { label: ROLE_LABELS[ROLES.TOURIST], value: ROLES.TOURIST },
  { label: ROLE_LABELS[ROLES.GUIDE], value: ROLES.GUIDE },
  { label: ROLE_LABELS[ROLES.ADMIN], value: ROLES.ADMIN }
];

/* 页面转场：本页是 tabBar 页，只用到进入（H5；小程序是原生转场） */
const pageMotion = createPageMotion();

export default {
  data() {
    return {
      ...pageMotion.data(),
      userInfo: {},
      roleOptions,
      useMock: USE_MOCK,
      pendingCount: 0,
      waitingCount: 0,
      adminPendingCount: 0,
      pendingGuideCount: 0,
      statusBarHeight: 20
    };
  },

  computed: {
    currentRole() {
      return this.userInfo.role || '';
    },
    isAdmin() {
      return this.userInfo.role === ROLES.ADMIN || this.userInfo.isAdmin === true;
    },
    isGuide() {
      return this.userInfo.role === ROLES.GUIDE;
    },
    userTip() {
      if (!this.userInfo.id) return '登录后享受更多服务';
      return this.isAdmin ? '管理订单与地陪审核' : this.isGuide ? '查看待接订单' : '查看我的预约进度';
    }
  },

  onLoad() {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
  },

  onShow() {
    this.loadUser();
  },

  methods: {
    ...pageMotion.methods,

    async loadUser() {
      try {
        const user = await UserApi.getCurrentUser();
        this.userInfo = user || {};
        this.loadStats();
      } catch (e) {
        console.error('加载用户信息失败', e);
      }
    },

    /** 只取一次数据：游客 / 地陪 / 管理员的角标都从各自接口的 total 或 counts 来 */
    async loadStats() {
      const tasks = [];

      if (this.isAdmin) {
        tasks.push(
          OrderApi.getAllOrders({ pageNo: 1, pageSize: 1 }).then((res) => {
            this.adminPendingCount = (res.counts && res.counts.pendingConfirm) || 0;
          }),
          GuideApi.getPendingGuides({ pageNo: 1, pageSize: 1 }).then((res) => {
            this.pendingGuideCount = res.total || 0;
          })
        );
      }

      if (this.isGuide) {
        tasks.push(
          OrderApi.getGuideOrders({ scope: 'waiting', pageNo: 1, pageSize: 1 }).then((res) => {
            this.waitingCount = (res.counts && res.counts.waiting) || 0;
          })
        );
      }

      if (!this.isGuide) {
        tasks.push(
          OrderApi.getMyOrders({ status: ORDER_STATUS.PENDING_CONFIRM, pageNo: 1, pageSize: 1 }).then((res) => {
            this.pendingCount = res.total || 0;
          })
        );
      }

      // 角标是锦上添花：任一失败都不该影响页面可用（不用 allSettled，兼容低版本基础库）
      await Promise.all(tasks.map((task) => task.catch((e) => console.error('加载角标失败', e))));
    },

    async switchRole(role) {
      if (this.currentRole === role) return;
      try {
        await switchMockRole(role);
        await this.loadUser();
        uni.showToast({ title: `已切换为${ROLE_LABELS[role]}`, icon: 'none' });
      } catch (e) {
        uni.showToast({ title: (e && e.message) || '切换失败', icon: 'none' });
      }
    },

    goMyOrders() {
      uni.navigateTo({ url: '/pages/appointment/my' });
    },

    goGuideOrders() {
      uni.navigateTo({ url: '/pages/guide/orders' });
    },

    goAdminOrders() {
      uni.navigateTo({ url: '/pages/admin/appointment' });
    },

    goAdminGuides() {
      uni.navigateTo({ url: '/pages/admin/clerk' });
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
}

.status-bar {
  background: $ds-surface;
}

.header-content {
  padding: $ds-space-3 $ds-pad-screen 0;
}

.header-title {
  font-family: $ds-font-title;
  font-size: $ds-fs-display;
  font-weight: 700;
  letter-spacing: $ds-ls-title;
  color: $ds-ink;
}

/* ---------- 用户卡片 ---------- */
.user-card {
  margin: $ds-space-4 $ds-pad-screen;
  padding: $ds-space-4;
  background: $ds-surface-container;
  border: $ds-card-border;
  border-radius: $ds-shape-md;
}

.user-main {
  display: flex;
  align-items: center;
}

.avatar-wrap {
  flex-shrink: 0;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: $ds-shape-sm;
  /* 头像来自接口字段；为空或加载失败时露底色兜底 */
  background: $ds-primary-container;
}

.user-content {
  flex: 1;
  min-width: 0;
  margin-left: $ds-space-3;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: $ds-space-2;
}

.user-name {
  font-size: $ds-fs-title;
  font-weight: 600;
  color: $ds-ink;
}

.role-tag {
  padding: 1px $ds-space-2;
  background: $ds-primary-container;
  border-radius: $ds-shape-xs;
  font-size: $ds-fs-caption;
  color: $ds-on-primary-container;
}

.user-tip {
  display: block;
  margin-top: $ds-space-1;
  font-size: $ds-fs-label-sm;
  color: $ds-ink-2;
}

/* ---------- 菜单 ---------- */
.menu-section {
  padding: 0 $ds-pad-screen;
  margin-bottom: $ds-space-3;
}

.menu-group {
  background: $ds-surface-container;
  border: $ds-card-border;
  border-radius: $ds-shape-md;
  overflow: hidden;
}

.menu-group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: $ds-space-3 $ds-space-4 0;
}

.menu-group-title {
  font-size: $ds-fs-label;
  font-weight: 600;
  color: $ds-ink;
}

.menu-group-note {
  font-size: $ds-fs-caption;
  color: $ds-ink-2;
}

.menu-item {
  display: flex;
  align-items: center;
  min-height: $ds-h-row;
  padding: 0 $ds-space-4;
  border-bottom: 1px solid $ds-outline-variant;

  &:last-child {
    border-bottom: none;
  }
}

.menu-text {
  flex: 1;
  font-size: $ds-fs-body-sm;
  color: $ds-ink;
}

.menu-right {
  display: flex;
  align-items: center;
  gap: $ds-space-2;
}

.menu-badge {
  min-width: 20px;
  padding: 1px $ds-space-2;
  border-radius: $ds-shape-full;
  background: $ds-tertiary;
  text-align: center;
  font-size: $ds-fs-caption;
  color: $ds-on-primary;

  &.warn {
    background: $ds-warning;
  }
}

.arrow {
  font-size: 18px;
  color: $ds-outline;
}

/* ---------- 演示身份切换 ---------- */
.role-row {
  display: flex;
  gap: $ds-space-2;
  padding: $ds-space-3 $ds-space-4 $ds-space-4;
}

.role-chip {
  flex: 1;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid $ds-outline;
  border-radius: $ds-shape-full;
  /* 实底选中态：底色与边框一起过渡，切换身份才不是硬跳 */
  transition: background-color $ds-dur-fast $ds-ease-out, border-color $ds-dur-fast $ds-ease-out;

  &.is-on {
    background: $ds-secondary-container;
    border-color: $ds-secondary-container;

    .role-chip__text {
      color: $ds-on-secondary-container;
      font-weight: 600;
    }
  }
}

.role-chip__text {
  font-size: $ds-fs-label;
  color: $ds-ink-2;
  transition: color $ds-dur-fast $ds-ease-out;
}

.footnote {
  display: block;
  padding: $ds-space-5 0 $ds-space-7;
  text-align: center;
  font-size: $ds-fs-caption;
  color: $ds-ink-2;
}
</style>
