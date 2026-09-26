<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="header-section">
      <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="header-content">
        <text class="header-title">我的</text>
      </view>
    </view>
    
    <!-- 用户卡片 -->
    <view class="user-card">
      <view class="user-main" @click="goProfile">
        <view class="avatar-wrap">
          <image 
            :src="userInfo.avatar || '/static/images/default-avatar.png'" 
            class="avatar"
            mode="aspectFill"
          />
          <view v-if="isAdmin" class="admin-tag">
            <text>管理</text>
          </view>
        </view>
        <view class="user-content">
          <text class="user-name">{{ userInfo.nickname || '点击登录' }}</text>
          <text class="user-id" v-if="userInfo._id">ID: {{ userInfo._id.slice(-6) }}</text>
          <text class="user-tip" v-else>登录后享受更多服务</text>
        </view>
        <text class="arrow-icon">›</text>
      </view>
      
      <!-- 统计 -->
      <view class="stats-row" v-if="userInfo._id">
        <view class="stat-item" @click="goMyAppointment">
          <text class="stat-value">{{ appointmentCount }}</text>
          <text class="stat-label">预约</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-value">{{ favoriteCount }}</text>
          <text class="stat-label">收藏</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item" @click="goWallet">
          <text class="stat-value">{{ userInfo.balance || '0' }}</text>
          <text class="stat-label">余额</text>
        </view>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-section">
      <view class="menu-group">
        <view class="menu-item" @click="goMyAppointment">
          <view class="menu-icon blue">
            <text>📅</text>
          </view>
          <text class="menu-text">我的预约</text>
          <view class="menu-right">
            <view class="menu-badge" v-if="appointmentCount">
              <text>{{ appointmentCount }}</text>
            </view>
            <text class="arrow-icon">›</text>
          </view>
        </view>
        
        <view class="menu-item" @click="goFavorite">
          <view class="menu-icon pink">
            <text>♡</text>
          </view>
          <text class="menu-text">我的收藏</text>
          <text class="arrow-icon">›</text>
        </view>
        
        <view class="menu-item" @click="goWallet">
          <view class="menu-icon orange">
            <text>💳</text>
          </view>
          <text class="menu-text">钱包充值</text>
          <text class="arrow-icon">›</text>
        </view>
      </view>
    </view>

    <!-- 管理员菜单 -->
    <view class="menu-section" v-if="isAdmin">
      <view class="menu-group-title">
        <text>管理功能</text>
      </view>
      <view class="menu-group">
        <view class="menu-item" @click="goAdminClerk">
          <view class="menu-icon purple">
            <text>👥</text>
          </view>
          <text class="menu-text">达人管理</text>
          <view class="menu-right">
            <view class="menu-badge warn" v-if="pendingClerkCount">
              <text>{{ pendingClerkCount }} 待审</text>
            </view>
            <text class="arrow-icon">›</text>
          </view>
        </view>
        
        <view class="menu-item" @click="goAdminAppointment">
          <view class="menu-icon green">
            <text>📋</text>
          </view>
          <text class="menu-text">预约管理</text>
          <view class="menu-right">
            <view class="menu-badge" v-if="todayAppointmentCount">
              <text>{{ todayAppointmentCount }} 今日</text>
            </view>
            <text class="arrow-icon">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 其他菜单 -->
    <view class="menu-section">
      <view class="menu-group">
        <view class="menu-item" @click="goSettings">
          <view class="menu-icon gray">
            <text>⚙</text>
          </view>
          <text class="menu-text">设置</text>
          <text class="arrow-icon">›</text>
        </view>
        
        <view class="menu-item" @click="goAbout">
          <view class="menu-icon gray">
            <text>ℹ</text>
          </view>
          <text class="menu-text">关于我们</text>
          <text class="arrow-icon">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { UserApi, AppointmentApi, ClerkApi } from '@/api/index.js';

export default {
  data() {
    return {
      userInfo: {},
      isAdmin: false,
      appointmentCount: 0,
      favoriteCount: 0,
      pendingClerkCount: 0,
      todayAppointmentCount: 0,
      statusBarHeight: 20
    };
  },
  
  onLoad() {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
  },
  
  onShow() {
    this.loadUserInfo();
  },
  
  methods: {
    async loadUserInfo() {
      try {
        const user = await UserApi.getCurrentUser();
        this.userInfo = user || {};
        this.isAdmin = user?.isAdmin === true;
        
        if (this.isAdmin) {
          this.loadAdminStats();
        } else if (user?._id) {
          this.loadUserStats();
        }
      } catch (e) {
        console.error('加载用户信息失败', e);
      }
    },

    async loadUserStats() {
      try {
        const { total } = await AppointmentApi.getMyAppointments({ 
          status: 'pending',
          pageSize: 1 
        });
        this.appointmentCount = total || 0;
      } catch (e) {
        console.error('加载统计失败', e);
      }
    },

    async loadAdminStats() {
      try {
        const [pendingRes, todayRes] = await Promise.all([
          ClerkApi.getPendingClerks(1, 1),
          AppointmentApi.getAllAppointments({ pageSize: 1 })
        ]);
        
        this.pendingClerkCount = pendingRes.total || 0;
        this.todayAppointmentCount = todayRes.total || 0;
      } catch (e) {
        console.error('加载管理统计失败', e);
      }
    },

    goProfile() {
      if (!this.userInfo._id) {
        uni.showToast({ title: '请先登录', icon: 'none' });
      }
    },

    goMyAppointment() {
      uni.navigateTo({ url: '/pages/appointment/my' });
    },

    goFavorite() {
      uni.showToast({ title: '开发中', icon: 'none' });
    },

    goWallet() {
      uni.showToast({ title: '开发中', icon: 'none' });
    },

    goAdminClerk() {
      uni.navigateTo({ url: '/pages/admin/clerk' });
    },

    goAdminAppointment() {
      uni.navigateTo({ url: '/pages/admin/appointment' });
    },

    goSettings() {
      uni.showToast({ title: '开发中', icon: 'none' });
    },

    goAbout() {
      uni.showToast({ title: '开发中', icon: 'none' });
    }
  }
};
</script>

<style lang="scss" scoped>
/* 页面 */
.page {
  background: #F5F5F5;
  min-height: 100vh;
}

/* 顶部 */
.header-section {
  background: #FFFFFF;
}

.status-bar {
  background: #FFFFFF;
}

.header-content {
  padding: 12px 16px 16px;
}

.header-title {
  font-size: 24px;
  font-weight: 700;
  color: #000000;
}

/* 用户卡片 */
.user-card {
  margin: -8px 16px 16px;
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  border: 1px solid #F0F0F0;
}

.user-main {
  display: flex;
  align-items: center;
}

.avatar-wrap {
  position: relative;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: #F5F5F5;
}

.admin-tag {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  background: #FF4D6A;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
  
  text {
    font-size: 10px;
    color: #FFFFFF;
    font-weight: 500;
  }
}

.user-content {
  flex: 1;
  margin-left: 12px;
}

.user-name {
  font-size: 17px;
  font-weight: 600;
  color: #000000;
  display: block;
}

.user-id, .user-tip {
  font-size: 12px;
  color: #999999;
  margin-top: 4px;
  display: block;
}

.arrow-icon {
  font-size: 18px;
  color: #CCCCCC;
}

/* 统计 */
.stats-row {
  display: flex;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #F0F0F0;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #000000;
  display: block;
}

.stat-label {
  font-size: 12px;
  color: #999999;
  margin-top: 4px;
  display: block;
}

.stat-divider {
  width: 1px;
  background: #F0F0F0;
}

/* 菜单区域 */
.menu-section {
  padding: 0 16px;
  margin-bottom: 12px;
}

.menu-group-title {
  font-size: 13px;
  font-weight: 500;
  color: #999999;
  padding: 12px 0 8px;
}

.menu-group {
  background: #FFFFFF;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  border: 1px solid #F0F0F0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #F8F8F8;
  
  &:last-child {
    border-bottom: none;
  }
}

.menu-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  
  text {
    font-size: 16px;
  }
  
  &.blue { background: #E6F2FF; }
  &.pink { background: #FFF0F3; }
  &.orange { background: #FFF4E5; }
  &.purple { background: #F3E8FF; }
  &.green { background: #E6FFF2; }
  &.gray { background: #F5F5F5; }
}

.menu-text {
  flex: 1;
  font-size: 15px;
  color: #1A1A1A;
}

.menu-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-badge {
  background: #FF4D6A;
  padding: 4px 8px;
  border-radius: 4px;
  
  text {
    font-size: 11px;
    color: #FFFFFF;
    font-weight: 500;
  }
  
  &.warn {
    background: #FF9500;
  }
}
</style>
