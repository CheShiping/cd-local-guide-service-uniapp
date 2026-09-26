<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="nav-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="nav-title">预约管理</text>
      <view class="nav-right"></view>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <picker mode="date" :value="filterDate" @change="onDateChange">
        <view class="filter-item">
          <text class="filter-text">{{ filterDate || '选择日期' }}</text>
          <text class="filter-arrow">›</text>
        </view>
      </picker>
      
      <picker :range="statusOptions" range-key="label" @change="onStatusChange">
        <view class="filter-item">
          <text class="filter-text">{{ statusOptions[statusIndex].label }}</text>
          <text class="filter-arrow">›</text>
        </view>
      </picker>
    </view>

    <!-- 预约列表 -->
    <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
      <view class="appointment-list">
        <view v-for="item in appointmentList" :key="item._id" class="appointment-card">
          <view class="card-header">
            <view class="user-section">
              <image 
                :src="item.userAvatar || '/static/images/default-avatar.png'" 
                class="user-avatar" 
                mode="aspectFill" 
              />
              <view class="user-info">
                <text class="user-name">{{ item.userName || '用户' }}</text>
                <text class="user-date">{{ item.appointDate }} {{ timeSlotLabel(item.timeSlot) }}</text>
              </view>
            </view>
            <view :class="['status-tag', 'status-' + item.status]">
              <text>{{ statusLabel(item.status) }}</text>
            </view>
          </view>
          
          <view class="card-body">
            <view class="info-row">
              <text class="info-label">预约达人</text>
              <text class="info-value">{{ item.clerkName }}</text>
            </view>
            <view class="info-row" v-if="item.remark">
              <text class="info-label">备注</text>
              <text class="info-value">{{ item.remark }}</text>
            </view>
          </view>
          
          <view class="card-footer">
            <text class="footer-time">{{ formatTime(item.createTime) }}</text>
            <view v-if="item.status === 0" class="footer-action" @click="completeAppointment(item._id)">
              <text>标记完成</text>
            </view>
          </view>
        </view>
      </view>

      <view class="load-status">
        <text v-if="loading" class="load-text">加载中...</text>
        <text v-else-if="!hasMore && appointmentList.length > 0" class="load-text">没有更多了</text>
      </view>

      <view v-if="!loading && appointmentList.length === 0" class="empty-box">
        <text class="empty-icon">📋</text>
        <text class="empty-title">暂无预约记录</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { AppointmentApi } from '@/api/index.js';

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待服务', value: 0 },
  { label: '已完成', value: 1 },
  { label: '已取消', value: 2 }
];

const timeSlots = {
  morning: '上午',
  afternoon: '下午',
  evening: '晚上'
};

const statusLabels = {
  0: '待服务',
  1: '已完成',
  2: '已取消'
};

export default {
  data() {
    return {
      filterDate: '',
      statusOptions,
      statusIndex: 0,
      appointmentList: [],
      pageNo: 1,
      pageSize: 10,
      loading: false,
      hasMore: true,
      statusBarHeight: 20
    };
  },
  
  onLoad() {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    this.loadList();
  },
  
  methods: {
    goBack() {
      uni.navigateBack();
    },

    async loadList(refresh = false) {
      if (this.loading) return;

      this.loading = true;
      if (refresh) {
        this.pageNo = 1;
        this.appointmentList = [];
        this.hasMore = true;
      }

      try {
        const params = {
          pageNo: this.pageNo,
          pageSize: this.pageSize
        };
        
        if (this.filterDate) {
          params.appointDate = this.filterDate;
        }
        
        const status = this.statusOptions[this.statusIndex].value;
        if (status !== '') {
          params.status = status;
        }

        const { list, total } = await AppointmentApi.getAllAppointments(params);
        
        this.appointmentList = refresh ? list : [...this.appointmentList, ...list];
        this.hasMore = this.appointmentList.length < total;
        this.pageNo++;
      } catch (e) {
        console.error('加载失败', e);
        uni.showToast({ title: '加载失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },

    onDateChange(e) {
      this.filterDate = e.detail.value;
      this.loadList(true);
    },

    onStatusChange(e) {
      this.statusIndex = e.detail.value;
      this.loadList(true);
    },

    loadMore() {
      this.loadList();
    },

    timeSlotLabel(slot) {
      return timeSlots[slot] || slot;
    },

    statusLabel(status) {
      return statusLabels[status] || '';
    },

    formatTime(time) {
      if (!time) return '';
      const date = new Date(time);
      return `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
    },

    async completeAppointment(id) {
      uni.showModal({
        title: '提示',
        content: '确定标记为已完成吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await AppointmentApi.completeAppointment(id);
              uni.showToast({ title: '操作成功', icon: 'success' });
              this.loadList(true);
            } catch (e) {
              uni.showToast({ title: '操作失败', icon: 'none' });
            }
          }
        }
      });
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

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  background: #FFFFFF;
  border-bottom: 1px solid #E5E5E5;
}

.filter-item {
  display: flex;
  align-items: center;
  padding: 8px 14px;
  background: #F5F5F5;
  border-radius: 8px;
}

.filter-text {
  font-size: 14px;
  color: #1A1A1A;
}

.filter-arrow {
  font-size: 16px;
  color: #CCCCCC;
  margin-left: 6px;
}

/* 列表 */
.list-scroll {
  height: calc(100vh - 130px);
}

.appointment-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.appointment-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  border: 1px solid #F0F0F0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.user-section {
  display: flex;
  align-items: center;
}

.user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #F5F5F5;
}

.user-info {
  margin-left: 12px;
}

.user-name {
  font-size: 15px;
  font-weight: 600;
  color: #000000;
  display: block;
}

.user-date {
  font-size: 13px;
  color: #FF4D6A;
  margin-top: 4px;
  display: block;
}

.status-tag {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
  
  &.status-0 {
    background: #FFF4E5;
    
    text {
      color: #FF9500;
    }
  }
  
  &.status-1 {
    background: #E6FFF2;
    
    text {
      color: #34C759;
    }
  }
  
  &.status-2 {
    background: #F5F5F5;
    
    text {
      color: #999999;
    }
  }
}

.card-body {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #F0F0F0;
}

.info-row {
  display: flex;
  margin-bottom: 6px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.info-label {
  font-size: 13px;
  color: #999999;
  width: 70px;
  flex-shrink: 0;
}

.info-value {
  font-size: 13px;
  color: #666666;
  flex: 1;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #F0F0F0;
}

.footer-time {
  font-size: 12px;
  color: #999999;
}

.footer-action {
  padding: 6px 14px;
  background: #FF4D6A;
  border-radius: 6px;
  
  text {
    font-size: 13px;
    color: #FFFFFF;
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
</style>
