<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="nav-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="nav-title">达人管理</text>
      <view class="nav-right"></view>
    </view>

    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view 
        :class="['tab-item', statusFilter === 1 ? 'active' : '']"
        @click="changeStatus(1)"
      >
        <text class="tab-text">已通过</text>
      </view>
      <view 
        :class="['tab-item', statusFilter === 0 ? 'active' : '']"
        @click="changeStatus(0)"
      >
        <text class="tab-text">待审核</text>
        <view v-if="pendingCount > 0" class="tab-badge">
          <text>{{ pendingCount }}</text>
        </view>
      </view>
    </view>

    <!-- 达人列表 -->
    <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
      <view class="clerk-list">
        <view v-for="clerk in clerkList" :key="clerk._id" class="clerk-card">
          <view class="card-main">
            <image 
              :src="clerk.avatar || '/static/images/default-avatar.png'" 
              class="card-avatar" 
              mode="aspectFill" 
            />
            <view class="card-info">
              <view class="info-header">
                <text class="info-name">{{ clerk.nickname }}</text>
                <view :class="['status-tag', clerk.status === 1 ? 'pass' : 'pending']">
                  <text>{{ clerk.status === 1 ? '已通过' : '待审核' }}</text>
                </view>
              </view>
              <view class="info-meta">
                <text class="meta-text">{{ clerk.sex === 2 ? '女' : '男' }}</text>
                <text class="meta-dot">·</text>
                <text class="meta-text">{{ clerk.age || '未知' }}岁</text>
                <text v-if="clerk.city" class="meta-dot">·</text>
                <text v-if="clerk.city" class="meta-text">{{ clerk.city }}</text>
              </view>
              <view class="info-intro" v-if="clerk.introduce">
                <text>{{ clerk.introduce }}</text>
              </view>
            </view>
          </view>
          
          <view class="card-actions">
            <template v-if="clerk.status === 0">
              <view class="action-btn pass" @click="auditClerk(clerk._id, 1)">
                <text>通过</text>
              </view>
              <view class="action-btn reject" @click="auditClerk(clerk._id, 2)">
                <text>拒绝</text>
              </view>
            </template>
            <template v-else>
              <view class="action-btn edit" @click="editClerk(clerk)">
                <text>编辑</text>
              </view>
            </template>
          </view>
        </view>
      </view>

      <view class="load-status">
        <text v-if="loading" class="load-text">加载中...</text>
        <text v-else-if="!hasMore && clerkList.length > 0" class="load-text">没有更多了</text>
      </view>

      <view v-if="!loading && clerkList.length === 0" class="empty-box">
        <text class="empty-icon">👥</text>
        <text class="empty-title">暂无达人</text>
      </view>
    </scroll-view>

    <!-- 添加按钮 -->
    <view class="add-btn" @click="addClerk">
      <text class="add-icon">+</text>
      <text class="add-text">添加达人</text>
    </view>
  </view>
</template>

<script>
import { ClerkApi } from '@/api/index.js';

export default {
  data() {
    return {
      statusFilter: 1,
      clerkList: [],
      pageNo: 1,
      pageSize: 10,
      loading: false,
      hasMore: true,
      pendingCount: 0,
      statusBarHeight: 20
    };
  },
  
  onLoad() {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    this.loadList();
    this.loadPendingCount();
  },
  
  methods: {
    goBack() {
      uni.navigateBack();
    },

    async loadPendingCount() {
      try {
        const result = await ClerkApi.getPendingClerks(1, 1);
        this.pendingCount = result.total || 0;
      } catch (e) {
        console.error('加载待审数量失败', e);
      }
    },

    async loadList(refresh = false) {
      if (this.loading) return;
      if (!refresh && !this.hasMore) return;

      this.loading = true;
      if (refresh) {
        this.pageNo = 1;
        this.clerkList = [];
        this.hasMore = true;
      }

      try {
        let result;
        if (this.statusFilter === 0) {
          result = await ClerkApi.getPendingClerks(this.pageNo, this.pageSize);
        } else {
          result = await ClerkApi.getClerkList({ pageNo: this.pageNo, pageSize: this.pageSize });
        }

        this.clerkList = refresh ? result.list : [...this.clerkList, ...result.list];
        this.hasMore = result.list.length >= this.pageSize;
        this.pageNo++;
      } catch (e) {
        console.error('加载失败', e);
        uni.showToast({ title: '加载失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },

    changeStatus(status) {
      this.statusFilter = status;
      this.loadList(true);
    },

    loadMore() {
      this.loadList();
    },

    async auditClerk(clerkId, status) {
      uni.showLoading({ title: '处理中...' });
      try {
        await ClerkApi.auditClerk(clerkId, status);
        uni.showToast({ title: status === 1 ? '已通过' : '已拒绝' });
        this.loadList(true);
        this.loadPendingCount();
      } catch (e) {
        uni.showToast({ title: '操作失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    },

    addClerk() {
      uni.navigateTo({ url: '/pages/admin/clerk/edit' });
    },

    editClerk(clerk) {
      uni.navigateTo({ url: `/pages/admin/clerk/edit?id=${clerk._id}` });
    }
  }
};
</script>

<style lang="scss" scoped>
.page {
  background: #F5F5F5;
  min-height: 100vh;
}

.status-bar {
  background: #FFFFFF;
}

/* 导航栏 */
.navbar {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 8px;
  background: #FFFFFF;
  border-bottom: 1px solid #E5E5E5;
}

.nav-back {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 24px;
  color: #000000;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  color: #000000;
}

.nav-right {
  width: 36px;
}

/* Tab */
.tab-bar {
  display: flex;
  background: #FFFFFF;
  padding: 0 16px;
  border-bottom: 1px solid #E5E5E5;
}

.tab-item {
  position: relative;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  
  &.active {
    .tab-text {
      color: #FF4D6A;
      font-weight: 600;
    }
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 16px;
      right: 16px;
      height: 2px;
      background: #FF4D6A;
      border-radius: 1px;
    }
  }
}

.tab-text {
  font-size: 15px;
  color: #666666;
}

.tab-badge {
  background: #FF4D6A;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 6px;
  
  text {
    font-size: 11px;
    color: #FFFFFF;
  }
}

/* 列表 */
.list-scroll {
  height: calc(100vh - 130px);
}

.clerk-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.clerk-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  border: 1px solid #F0F0F0;
}

.card-main {
  display: flex;
}

.card-avatar {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: #F5F5F5;
}

.card-info {
  flex: 1;
  margin-left: 12px;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-name {
  font-size: 16px;
  font-weight: 600;
  color: #000000;
}

.status-tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  
  &.pass {
    background: #E6FFF2;
    
    text {
      color: #34C759;
    }
  }
  
  &.pending {
    background: #FFF4E5;
    
    text {
      color: #FF9500;
    }
  }
}

.info-meta {
  display: flex;
  align-items: center;
  margin-top: 6px;
}

.meta-text {
  font-size: 13px;
  color: #666666;
}

.meta-dot {
  font-size: 13px;
  color: #CCCCCC;
  margin: 0 6px;
}

.info-intro {
  margin-top: 8px;
  
  text {
    font-size: 13px;
    color: #999999;
    line-height: 1.4;
  }
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #F0F0F0;
}

.action-btn {
  padding: 8px 20px;
  border-radius: 8px;
  
  text {
    font-size: 14px;
    font-weight: 500;
  }
  
  &.pass {
    background: #FF4D6A;
    
    text {
      color: #FFFFFF;
    }
  }
  
  &.reject {
    background: #F5F5F5;
    
    text {
      color: #666666;
    }
  }
  
  &.edit {
    background: #F5F5F5;
    
    text {
      color: #666666;
    }
  }
}

/* 加载状态 */
.load-status {
  text-align: center;
  padding: 20px;
}

.load-text {
  font-size: 13px;
  color: #999999;
}

/* 空状态 */
.empty-box {
  text-align: center;
  padding: 60px 0;
}

.empty-icon {
  font-size: 48px;
}

.empty-title {
  font-size: 15px;
  color: #999999;
  margin-top: 12px;
  display: block;
}

/* 添加按钮 */
.add-btn {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  background: #FF4D6A;
  padding: 12px 28px;
  border-radius: 24px;
  box-shadow: 0 4px 12px rgba(255, 77, 106, 0.3);
}

.add-icon {
  font-size: 18px;
  color: #FFFFFF;
}

.add-text {
  font-size: 15px;
  font-weight: 600;
  color: #FFFFFF;
}
</style>
