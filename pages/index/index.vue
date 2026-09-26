<template>
  <view class="page">
    <!-- 状态栏占位 -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px', background: '#FFFFFF' }"></view>
    
    <!-- 搜索栏 -->
    <view class="search-header">
      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input 
          v-model="keyword" 
          placeholder="搜索达人昵称"
          class="search-input"
          placeholder-class="placeholder"
          @confirm="onSearch"
        />
      </view>
    </view>

    <!-- 技能标签 -->
    <view class="skill-section">
      <scroll-view scroll-x class="skill-scroll" show-scrollbar="false">
        <view class="skill-list">
          <view 
            :class="['skill-item', skillFilter === '' ? 'active' : '']"
            @click="skillFilter = ''; loadClerks(true)"
          >
            <text class="skill-text">全部</text>
          </view>
          <view 
            v-for="cat in categoryList" 
            :key="cat._id"
            :class="['skill-item', skillFilter === cat._id ? 'active' : '']"
            @click="skillFilter = cat._id; loadClerks(true)"
          >
            <text class="skill-text">{{ cat.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 达人列表 -->
    <scroll-view 
      scroll-y 
      class="clerk-scroll"
      @scrolltolower="loadMore"
      :style="{ height: listHeight + 'px' }"
    >
      <view class="list-container">
        <view class="list-header">
          <view class="list-title-wrap">
            <text class="list-title">推荐达人</text>
            <text class="list-count">· {{ total }} 位</text>
          </view>
          <view class="filter-btn" @click="showDrawer = true">
            <text class="filter-icon">⚙</text>
            <text class="filter-text">筛选</text>
          </view>
        </view>

        <view class="clerk-list">
          <view 
            v-for="clerk in clerkList" 
            :key="clerk._id" 
            class="clerk-card"
            @click="goDetail(clerk._id)"
          >
            <view class="card-avatar-wrap">
              <image 
                :src="clerk.avatar || '/static/images/default-avatar.png'" 
                class="card-avatar" 
                mode="aspectFill" 
              />
            </view>
            
            <view class="card-content">
              <view class="card-header">
                <text class="card-name">{{ clerk.nickname }}</text>
                <view :class="['sex-tag', clerk.sex === 2 ? 'female' : 'male']">
                  <text>{{ clerk.sex === 2 ? '♀' : '♂' }}</text>
                </view>
              </view>
              
              <view class="card-tags">
                <text 
                  v-for="(tag, idx) in (clerk.skills || []).slice(0, 2)" 
                  :key="idx"
                  class="card-tag"
                >
                  {{ tag }}
                </text>
              </view>
              
              <view class="card-footer">
                <view class="card-price">
                  <text class="price-symbol">¥</text>
                  <text class="price-value">{{ clerk.price || 0 }}</text>
                  <text class="price-unit">/局</text>
                </view>
                <view class="card-orders">
                  <text class="orders-value">{{ clerk.orderCount || 0 }}</text>
                  <text class="orders-label">单</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="load-status">
          <text v-if="loading" class="load-text">加载中...</text>
          <text v-else-if="!hasMore && clerkList.length > 0" class="load-text">没有更多了</text>
        </view>

        <view v-if="!loading && clerkList.length === 0" class="empty-box">
          <text class="empty-icon">🔍</text>
          <text class="empty-title">暂无达人</text>
          <text class="empty-tip">换个条件试试吧</text>
        </view>
      </view>
    </scroll-view>

    <!-- 筛选抽屉 -->
    <view v-if="showDrawer" class="drawer-mask" @click="showDrawer = false"></view>
    <view v-if="showDrawer" class="drawer">
      <view class="drawer-header">
        <text class="drawer-title">筛选</text>
        <text class="drawer-close" @click="showDrawer = false">✕</text>
      </view>

      <view class="drawer-section">
        <text class="drawer-label">性别</text>
        <view class="drawer-options">
          <view 
            :class="['drawer-option', drawerFilter.sex === '' ? 'active' : '']"
            @click="drawerFilter.sex = ''"
          >
            <text>不限</text>
          </view>
          <view 
            :class="['drawer-option', drawerFilter.sex === 'female' ? 'active' : '']"
            @click="drawerFilter.sex = 'female'"
          >
            <text>女生</text>
          </view>
          <view 
            :class="['drawer-option', drawerFilter.sex === 'male' ? 'active' : '']"
            @click="drawerFilter.sex = 'male'"
          >
            <text>男生</text>
          </view>
        </view>
      </view>

      <view class="drawer-section">
        <text class="drawer-label">价格区间</text>
        <view class="drawer-options">
          <view 
            :class="['drawer-option', drawerFilter.price === '' ? 'active' : '']"
            @click="drawerFilter.price = ''"
          >
            <text>不限</text>
          </view>
          <view 
            :class="['drawer-option', drawerFilter.price === '0-30' ? 'active' : '']"
            @click="drawerFilter.price = '0-30'"
          >
            <text>30以下</text>
          </view>
          <view 
            :class="['drawer-option', drawerFilter.price === '30-50' ? 'active' : '']"
            @click="drawerFilter.price = '30-50'"
          >
            <text>30-50</text>
          </view>
          <view 
            :class="['drawer-option', drawerFilter.price === '50+' ? 'active' : '']"
            @click="drawerFilter.price = '50+'"
          >
            <text>50以上</text>
          </view>
        </view>
      </view>

      <view class="drawer-footer">
        <view class="drawer-btn reset" @click="resetFilter">
          <text>重置</text>
        </view>
        <view class="drawer-btn confirm" @click="confirmFilter">
          <text>确定</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { ClerkApi, CategoryApi } from '@/api/index.js';

export default {
  data() {
    return {
      keyword: '',
      skillFilter: '',
      categoryList: [],
      clerkList: [],
      pageNo: 1,
      pageSize: 10,
      total: 0,
      loading: false,
      hasMore: true,
      listHeight: 500,
      statusBarHeight: 20,
      showDrawer: false,
      drawerFilter: {
        sex: '',
        price: ''
      }
    };
  },
  
  onLoad() {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    this.loadCategories();
    this.loadClerks();
    this.calcHeight();
  },
  
  methods: {
    calcHeight() {
      const sys = uni.getSystemInfoSync();
      this.listHeight = sys.windowHeight - this.statusBarHeight - 110;
    },

    async loadCategories() {
      try {
        const list = await CategoryApi.getCategoryList();
        this.categoryList = list || [];
      } catch (e) {
        console.error('加载分类失败', e);
      }
    },

    async loadClerks(refresh = false) {
      if (this.loading) return;
      if (!refresh && !this.hasMore) return;

      this.loading = true;
      if (refresh) {
        this.pageNo = 1;
        this.clerkList = [];
        this.hasMore = true;
      }

      try {
        const params = {
          pageNo: this.pageNo,
          pageSize: this.pageSize,
          keyword: this.keyword
        };

        if (this.skillFilter) {
          params.categoryId = this.skillFilter;
        }
        
        if (this.drawerFilter.sex) {
          params.sex = this.drawerFilter.sex === 'female' ? 2 : 1;
        }
        
        if (this.drawerFilter.price) {
          if (this.drawerFilter.price === '50+') {
            params.minPrice = 50;
          } else if (this.drawerFilter.price === '0-30') {
            params.maxPrice = 30;
          } else {
            const [min, max] = this.drawerFilter.price.split('-');
            params.minPrice = parseInt(min);
            params.maxPrice = parseInt(max);
          }
        }

        const { list, total } = await ClerkApi.getClerkList(params);
        
        this.clerkList = refresh ? list : [...this.clerkList, ...list];
        this.total = total || 0;
        this.hasMore = this.clerkList.length < total;
        this.pageNo++;
      } catch (e) {
        console.error('加载达人失败', e);
        uni.showToast({ title: '加载失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },

    onSearch() {
      this.loadClerks(true);
    },

    loadMore() {
      this.loadClerks();
    },

    goDetail(clerkId) {
      uni.navigateTo({
        url: `/pages/clerk/detail?id=${clerkId}`
      });
    },

    resetFilter() {
      this.drawerFilter = { sex: '', price: '' };
    },

    confirmFilter() {
      this.showDrawer = false;
      this.loadClerks(true);
    }
  }
};
</script>

<style lang="scss" scoped>
/* 页面背景 */
.page {
  background: #F5F5F5;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 状态栏 */
.status-bar {
  flex-shrink: 0;
}

/* 搜索栏 */
.search-header {
  background: #FFFFFF;
  padding: 12px 16px;
  flex-shrink: 0;
}

.search-box {
  display: flex;
  align-items: center;
  background: #F5F5F5;
  border-radius: 20px;
  padding: 0 14px;
  height: 36px;
}

.search-icon {
  font-size: 14px;
  color: #999999;
}

.search-input {
  flex: 1;
  font-size: 14px;
  color: #1A1A1A;
  margin-left: 8px;
}

.placeholder {
  color: #999999;
}

/* 技能标签 */
.skill-section {
  background: #FFFFFF;
  padding: 0 16px 12px;
  flex-shrink: 0;
}

.skill-scroll {
  white-space: nowrap;
}

.skill-list {
  display: inline-flex;
  gap: 8px;
}

.skill-item {
  display: inline-block;
  padding: 6px 16px;
  background: #F5F5F5;
  border-radius: 16px;
  
  &.active {
    background: #FF4D6A;
  }
}

.skill-text {
  font-size: 13px;
  color: #666666;
  
  .active & {
    color: #FFFFFF;
  }
}

/* 达人列表 */
.clerk-scroll {
  flex: 1;
}

.list-container {
  padding: 0 16px 80px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0 12px;
}

.list-title-wrap {
  display: flex;
  align-items: baseline;
}

.list-title {
  font-size: 17px;
  font-weight: 600;
  color: #000000;
}

.list-count {
  font-size: 13px;
  color: #999999;
  margin-left: 4px;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #FFFFFF;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.filter-icon {
  font-size: 14px;
}

.filter-text {
  font-size: 13px;
  color: #666666;
}

/* 达人卡片 */
.clerk-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.clerk-card {
  display: flex;
  background: #FFFFFF;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  border: 1px solid #F0F0F0;
}

.card-avatar-wrap {
  flex-shrink: 0;
}

.card-avatar {
  width: 68px;
  height: 68px;
  border-radius: 12px;
  background: #F5F5F5;
}

.card-content {
  flex: 1;
  margin-left: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-name {
  font-size: 16px;
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

.card-tags {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.card-tag {
  font-size: 11px;
  color: #FF4D6A;
  background: #FFF0F3;
  padding: 3px 8px;
  border-radius: 4px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 8px;
}

.card-price {
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
  margin-left: 1px;
}

.price-unit {
  font-size: 11px;
  color: #999999;
  margin-left: 2px;
}

.card-orders {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.orders-value {
  font-size: 13px;
  font-weight: 600;
  color: #666666;
}

.orders-label {
  font-size: 11px;
  color: #999999;
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
  color: #1A1A1A;
  margin-top: 12px;
  display: block;
}

.empty-tip {
  font-size: 13px;
  color: #999999;
  margin-top: 6px;
  display: block;
}

/* 筛选抽屉 */
.drawer-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 280px;
  background: #FFFFFF;
  z-index: 101;
  padding: 20px;
  padding-bottom: 100px;
  border-radius: 16px 0 0 16px;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.drawer-title {
  font-size: 18px;
  font-weight: 600;
  color: #000000;
}

.drawer-close {
  font-size: 18px;
  color: #999999;
  padding: 4px;
}

.drawer-section {
  margin-bottom: 24px;
}

.drawer-label {
  font-size: 14px;
  font-weight: 500;
  color: #666666;
  margin-bottom: 12px;
  display: block;
}

.drawer-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.drawer-option {
  padding: 10px 16px;
  background: #F5F5F5;
  border-radius: 8px;
  
  text {
    font-size: 14px;
    color: #666666;
  }
  
  &.active {
    background: #FF4D6A;
    
    text {
      color: #FFFFFF;
      font-weight: 500;
    }
  }
}

.drawer-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 20px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  display: flex;
  gap: 12px;
  background: #FFFFFF;
  border-top: 1px solid #E5E5E5;
}

.drawer-btn {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  text-align: center;
  
  text {
    font-size: 15px;
    font-weight: 500;
  }
  
  &.reset {
    background: #F5F5F5;
    
    text {
      color: #666666;
    }
  }
  
  &.confirm {
    background: #FF4D6A;
    
    text {
      color: #FFFFFF;
    }
  }
}
</style>
