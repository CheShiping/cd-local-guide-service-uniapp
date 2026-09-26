<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    
    <!-- 顶部导航 -->
    <view class="navbar">
      <view class="nav-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="nav-title">达人详情</text>
      <view class="nav-right"></view>
    </view>

    <!-- 达人信息卡片 -->
    <view class="clerk-card">
      <view class="clerk-header">
        <image 
          :src="clerkInfo.avatar || '/static/images/default-avatar.png'" 
          class="clerk-avatar"
          mode="aspectFill"
        />
        <view class="clerk-info">
          <view class="clerk-top">
            <text class="clerk-name">{{ clerkInfo.nickname }}</text>
            <view :class="['sex-tag', clerkInfo.sex === 2 ? 'female' : 'male']">
              <text>{{ clerkInfo.sex === 2 ? '♀' : '♂' }}</text>
            </view>
          </view>
          <view class="clerk-meta">
            <text class="meta-text">{{ clerkInfo.city || '未知城市' }}</text>
            <text class="meta-dot">·</text>
            <text class="meta-text">{{ clerkInfo.orderCount || 0 }} 单</text>
          </view>
        </view>
      </view>
      
      <view class="clerk-tags">
        <text 
          v-for="(tag, idx) in (clerkInfo.skills || []).slice(0, 4)" 
          :key="idx"
          class="clerk-tag"
        >
          {{ tag }}
        </text>
      </view>
      
      <view class="clerk-intro" v-if="clerkInfo.introduce">
        <text class="intro-text">{{ clerkInfo.introduce }}</text>
      </view>
    </view>

    <!-- 服务项目 -->
    <view class="section-card">
      <text class="section-title">选择服务</text>
      <view class="goods-list">
        <view 
          v-for="(item, idx) in goodsList" 
          :key="idx"
          :class="['goods-item', selectGoods === idx ? 'selected' : '']"
          @click="selectGoods = idx"
        >
          <view class="goods-left">
            <text class="goods-name">{{ item.name }}</text>
            <text class="goods-desc">{{ item.description }}</text>
          </view>
          <view class="goods-right">
            <view class="goods-price">
              <text class="price-symbol">¥</text>
              <text class="price-value">{{ item.price }}</text>
              <text class="price-unit">/局</text>
            </view>
            <view :class="['check-circle', selectGoods === idx ? 'checked' : '']">
              <text v-if="selectGoods === idx">✓</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 预约信息 -->
    <view class="section-card">
      <text class="section-title">预约信息</text>
      
      <view class="form-group">
        <text class="form-label">预约日期</text>
        <picker mode="date" :value="date" :start="minDate" @change="onDateChange">
          <view class="form-picker">
            <text class="picker-text">{{ date || '请选择日期' }}</text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
      </view>

      <view class="form-group">
        <text class="form-label">预约时段</text>
        <view class="time-grid">
          <view 
            v-for="(slot, idx) in timeSlots" 
            :key="idx"
            :class="['time-item', timeIndex === idx ? 'active' : '']"
            @click="timeIndex = idx"
          >
            <text class="time-text">{{ slot.label }}</text>
          </view>
        </view>
      </view>

      <view class="form-group">
        <text class="form-label">备注</text>
        <textarea 
          v-model="remark"
          class="form-textarea"
          placeholder="请输入备注信息（选填）"
          placeholder-class="textarea-placeholder"
        />
      </view>
    </view>

    <view class="bottom-space"></view>

    <!-- 底部栏 -->
    <view class="bottom-bar">
      <view class="price-section">
        <text class="price-label">合计</text>
        <view class="price-main">
          <text class="price-symbol">¥</text>
          <text class="price-num">{{ totalPrice }}</text>
        </view>
      </view>
      <view class="submit-btn" @click="submitAppointment">
        <text class="btn-text">立即预约</text>
      </view>
    </view>
  </view>
</template>

<script>
import { ClerkApi, AppointmentApi } from '@/api/index.js';

export default {
  data() {
    return {
      clerkId: '',
      clerkInfo: {},
      goodsList: [
        { name: '陪玩服务', description: '专业陪玩', price: 30 }
      ],
      selectGoods: 0,
      date: '',
      minDate: '',
      timeSlots: [
        { label: '上午', value: 'morning' },
        { label: '下午', value: 'afternoon' },
        { label: '晚上', value: 'evening' }
      ],
      timeIndex: 0,
      remark: '',
      statusBarHeight: 20
    };
  },
  
  computed: {
    totalPrice() {
      const goods = this.goodsList[this.selectGoods];
      return goods?.price || 0;
    }
  },
  
  onLoad(options) {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    
    this.clerkId = options.id;
    this.initDate();
    this.loadClerkDetail();
  },
  
  methods: {
    initDate() {
      const today = new Date();
      this.minDate = today.toISOString().split('T')[0];
      this.date = this.minDate;
    },

    async loadClerkDetail() {
      try {
        const data = await ClerkApi.getClerkDetail(this.clerkId);
        this.clerkInfo = data || {};
        this.goodsList = data?.goodsList?.length ? data.goodsList : this.goodsList;
      } catch (e) {
        console.error('加载失败', e);
        uni.showToast({ title: '加载失败', icon: 'none' });
      }
    },

    goBack() {
      uni.navigateBack();
    },

    onDateChange(e) {
      this.date = e.detail.value;
    },

    async submitAppointment() {
      if (!this.date) {
        uni.showToast({ title: '请选择日期', icon: 'none' });
        return;
      }

      try {
        const goods = this.goodsList[this.selectGoods];
        await AppointmentApi.createAppointment({
          clerkId: this.clerkId,
          goodsId: goods._id,
          goodsName: goods.name,
          date: this.date,
          timeSlot: this.timeSlots[this.timeIndex].value,
          price: goods.price,
          remark: this.remark
        });

        uni.showToast({ title: '预约成功', icon: 'success' });
        setTimeout(() => uni.navigateBack(), 1500);
      } catch (e) {
        console.error('预约失败', e);
        uni.showToast({ title: '预约失败', icon: 'none' });
      }
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

/* 达人卡片 */
.clerk-card {
  margin: 16px;
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  border: 1px solid #F0F0F0;
}

.clerk-header {
  display: flex;
  align-items: center;
}

.clerk-avatar {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: #F5F5F5;
}

.clerk-info {
  flex: 1;
  margin-left: 12px;
}

.clerk-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clerk-name {
  font-size: 17px;
  font-weight: 600;
  color: #000000;
}

.sex-tag {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  
  &.female {
    background: #FFF0F3;
    color: #FF4D6A;
  }
  
  &.male {
    background: #E6F2FF;
    color: #007AFF;
  }
}

.clerk-meta {
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

.clerk-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #F0F0F0;
}

.clerk-tag {
  font-size: 12px;
  color: #FF4D6A;
  background: #FFF0F3;
  padding: 4px 10px;
  border-radius: 4px;
}

.clerk-intro {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #F0F0F0;
}

.intro-text {
  font-size: 14px;
  color: #666666;
  line-height: 1.5;
}

/* 区块卡片 */
.section-card {
  margin: 0 16px 12px;
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  border: 1px solid #F0F0F0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 12px;
  display: block;
}

/* 服务列表 */
.goods-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.goods-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #F5F5F5;
  border-radius: 10px;
  border: 2px solid transparent;
  
  &.selected {
    border-color: #FF4D6A;
    background: #FFF0F3;
  }
}

.goods-left {
  flex: 1;
}

.goods-name {
  font-size: 15px;
  font-weight: 500;
  color: #1A1A1A;
  display: block;
}

.goods-desc {
  font-size: 12px;
  color: #999999;
  margin-top: 4px;
  display: block;
}

.goods-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.goods-price {
  display: flex;
  align-items: baseline;
}

.price-symbol {
  font-size: 12px;
  font-weight: 600;
  color: #FF4D6A;
}

.price-value {
  font-size: 18px;
  font-weight: 700;
  color: #FF4D6A;
}

.price-unit {
  font-size: 11px;
  color: #999999;
  margin-left: 2px;
}

.check-circle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #CCCCCC;
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

/* 表单 */
.form-group {
  margin-bottom: 16px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #666666;
  margin-bottom: 8px;
  display: block;
}

.form-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #F5F5F5;
  border-radius: 10px;
}

.picker-text {
  font-size: 14px;
  color: #1A1A1A;
}

.picker-arrow {
  font-size: 18px;
  color: #CCCCCC;
}

.time-grid {
  display: flex;
  gap: 10px;
}

.time-item {
  flex: 1;
  text-align: center;
  padding: 12px;
  background: #F5F5F5;
  border-radius: 10px;
  
  &.active {
    background: #FF4D6A;
  }
}

.time-text {
  font-size: 14px;
  color: #666666;
  
  .active & {
    color: #FFFFFF;
    font-weight: 500;
  }
}

.form-textarea {
  width: 100%;
  height: 80px;
  padding: 12px;
  background: #F5F5F5;
  border-radius: 10px;
  font-size: 14px;
  color: #1A1A1A;
}

.textarea-placeholder {
  color: #999999;
}

.bottom-space {
  height: 100px;
}

/* 底部栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: #FFFFFF;
  border-top: 1px solid #E5E5E5;
}

.price-section {
  display: flex;
  flex-direction: column;
}

.price-label {
  font-size: 12px;
  color: #999999;
}

.price-main {
  display: flex;
  align-items: baseline;
}

.price-main .price-symbol {
  font-size: 14px;
  font-weight: 600;
  color: #FF4D6A;
}

.price-main .price-num {
  font-size: 24px;
  font-weight: 700;
  color: #FF4D6A;
}

.submit-btn {
  background: #FF4D6A;
  padding: 12px 32px;
  border-radius: 10px;
}

.btn-text {
  font-size: 15px;
  font-weight: 600;
  color: #FFFFFF;
}
</style>
