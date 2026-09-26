<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- 导航栏 -->
    <view class="navbar">
      <view class="icon-btn" @click="goBack">
        <text class="icon-btn__text back">‹</text>
      </view>
      <text class="navbar__title">{{ title }}</text>
      <view class="icon-btn"></view>
    </view>

    <!-- 摘要行：把「这是谁、有几个、大概多久」先说清楚 -->
    <view class="hint-bar">
      <text class="hint">{{ hintText }}</text>
    </view>

    <!-- 二级筛选用 chip（一级页签在首页）：激活 chip 自动居中，列表可左右滑动切换类型 -->
    <scroll-view
      scroll-x
      class="chip-scroll"
      :show-scrollbar="false"
      :scroll-left="tabScrollLeft"
      scroll-with-animation
      @scroll="onTabScroll"
    >
      <view class="chip-row">
        <view
          v-for="chip in bookingTypeChips"
          :key="chip.value"
          :class="['chip', bookingType === chip.value ? 'is-on' : '']"
          @click="changeBookingType(chip.value)"
        >
          <text class="chip__text">{{ chip.label }}</text>
        </view>
        <view class="chip chip--lead" @click="toggleSort">
          <text class="chip__text">{{ sortLabel }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 地陪列表 -->
    <scroll-view
      scroll-y
      class="list-scroll"
      :show-scrollbar="false"
      @scrolltolower="loadMore"
      @touchstart="onTabTouchStart"
      @touchend="onTabTouchEnd"
    >
      <view class="list">
        <view
          v-for="item in guideList"
          :key="item.id"
          class="card guide"
          @click="goDetail(item)"
        >
          <view class="avatar">
            <image :src="item.avatarUrl" class="avatar__img" mode="aspectFill" />
          </view>

          <view class="guide__body">
            <view class="guide__top">
              <text class="guide__name">{{ item.nickname }}</text>
              <text class="guide__stat">接单 {{ item.orderCount }} 单</text>
            </view>

            <view class="tag-row">
              <text
                v-for="region in (item.regionTypes || []).slice(0, 2)"
                :key="region.id"
                class="tag"
              >
                {{ region.name }}
              </text>
            </view>

            <text class="guide__service">{{ serviceText(item) }}</text>

            <view class="guide__foot">
              <view class="price-block">
                <text class="price"><text class="price__symbol">¥</text>{{ item.priceFrom }}</text>
                <text class="guide__stat">起 / {{ priceUnit(item) }}</text>
              </view>
              <view class="btn btn--tonal btn--sm" @click.stop="goDetail(item)">
                <text class="btn__text">看详情</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="load-status">
        <text v-if="loading" class="load-text">加载中…</text>
        <text v-else-if="!hasMore && guideList.length > 0" class="load-text">没有更多了</text>
      </view>

      <view v-if="!loading && guideList.length === 0" class="empty-box">
        <text class="empty-icon">◎</text>
        <text class="empty-title">这个景点还没有可约地陪</text>
        <text class="empty-tip">换个筛选条件，或返回上一步换个景点</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
/**
 * 游客端 · 地陪列表（原型 02 屏）
 *
 * 由首页景点卡进入：/pages/guide/list?attractionId=xxx&name=景点名
 * 只列「能带这个景点且已通过审核」的地陪，按擅长景点反查（GuideApi 内做过滤）。
 *
 * 筛选：一级（区域）在首页，本页只做二级 chip —— 预约类型 + 排序。
 * 区块顺序与原型一致，视觉令牌取 uni.scss 的 $ds-*。
 */
import { GuideApi, BOOKING_TYPES, bookingTypeLabel, bookingTypeUnit } from '@/api/index.js';
import { createTabRow } from '@/utils/hscroll.js';

/* 预约类型 chip：激活 chip 自动滚到中间 + 列表左右滑动切换（排序 chip 不参与） */
const bookingTabRow = createTabRow({
  container: '.chip-scroll',
  row: '.chip-row',
  item: '.chip',
  index: (vm) => vm.activeChipIndex,
  onStep: (vm, step) => vm.stepBookingType(step)
});

const bookingTypeChips = [
  { label: '全部', value: '' },
  { label: '半日', value: BOOKING_TYPES.HALF_DAY },
  { label: '全天', value: BOOKING_TYPES.FULL_DAY },
  { label: '专项', value: BOOKING_TYPES.HOURLY }
];

export default {
  data() {
    return {
      ...bookingTabRow.data(),
      attractionId: '',
      attractionName: '',
      bookingTypeChips,
      bookingType: '',
      sort: '',
      guideList: [],
      pageNo: 1,
      pageSize: 10,
      total: 0,
      loading: false,
      hasMore: true,
      statusBarHeight: 20
    };
  },

  computed: {
    title() {
      return this.attractionName ? `${this.attractionName}的地陪` : '地陪列表';
    },
    hintText() {
      if (this.loading && this.total === 0) return '正在找能带这里的本地地陪…';
      return `共 ${this.total} 位可约 · 半天约 4-5 小时，全天 8-10 小时`;
    },
    sortLabel() {
      return this.sort === 'priceAsc' ? '价格从低到高' : '接单从多到少';
    },
    /* chip 行 = [全部, ...预约类型, 排序]：只有预约类型参与居中 */
    activeChipIndex() {
      const i = bookingTypeChips.findIndex((chip) => chip.value === this.bookingType);
      return i < 0 ? 0 : i;
    }
  },

  onLoad(options = {}) {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    this.attractionId = options.attractionId || '';
    this.attractionName = options.name ? decodeURIComponent(options.name) : '';
    this.loadGuides(true);
  },

  methods: {
    ...bookingTabRow.methods,

    async loadGuides(refresh = false) {
      if (this.loading) return;
      if (!refresh && !this.hasMore) return;

      this.loading = true;
      if (refresh) {
        this.pageNo = 1;
        this.guideList = [];
        this.hasMore = true;
      }

      try {
        const params = { pageNo: this.pageNo, pageSize: this.pageSize };
        if (this.attractionId) params.attractionId = this.attractionId;
        if (this.bookingType) params.bookingType = this.bookingType;
        if (this.sort) params.sort = this.sort;

        const { list, total, hasMore } = await GuideApi.getGuideList(params);

        this.guideList = refresh ? list : [...this.guideList, ...list];
        this.total = total || 0;
        this.hasMore = hasMore;
        this.pageNo++;
      } catch (e) {
        console.error('加载地陪失败', e);
        uni.showToast({ title: (e && e.message) || '加载失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },

    changeBookingType(value) {
      if (this.bookingType === value) return;
      this.bookingType = value;
      this.centerActiveTab();
      this.loadGuides(true);
    },

    /* 横滑：上/下一个预约类型；「全部」的左边就是边界 */
    stepBookingType(step) {
      const current = Math.max(bookingTypeChips.findIndex((chip) => chip.value === this.bookingType), 0);
      const next = current + step;
      if (next < 0 || next >= bookingTypeChips.length) return;
      this.changeBookingType(bookingTypeChips[next].value);
    },

    toggleSort() {
      this.sort = this.sort === 'priceAsc' ? '' : 'priceAsc';
      this.loadGuides(true);
    },

    loadMore() {
      this.loadGuides();
    },

    /** 服务类型行：半天 · 全天（取地陪可接的预约类型，最多 3 项） */
    serviceText(item) {
      const types = item.bookingTypes || [];
      if (!types.length) return '';
      return types.map((type) => bookingTypeLabel(type)).join(' · ');
    },

    /** 起价的单位：取最便宜的那个套餐的类型（半日 / 全天 / 小时） */
    priceUnit(item) {
      const packages = item.packages || [];
      if (!packages.length) return '次';
      const cheapest = packages.reduce((min, pkg) => (pkg.price < min.price ? pkg : min), packages[0]);
      return bookingTypeUnit(cheapest.bookingType) || '次';
    },

    goBack() {
      uni.navigateBack();
    },

    goDetail(item) {
      const attraction = this.attractionId ? `&attractionId=${this.attractionId}` : '';
      uni.navigateTo({ url: `/pages/clerk/detail?id=${item.id}${attraction}` });
    }
  }
};
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $ds-surface;
}

.status-bar {
  flex-shrink: 0;
}

/* ---------- 导航栏 ---------- */
.navbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  height: $ds-h-navbar;
  padding: 0 $ds-space-2;
}

.icon-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn__text {
  font-size: 24px;
  line-height: 1;
  color: $ds-ink;
}

.back {
  font-size: 26px;
}

.navbar__title {
  flex: 1;
  text-align: center;
  font-family: $ds-font-title;
  font-size: $ds-fs-title;
  font-weight: 700;
  letter-spacing: $ds-ls-title;
  color: $ds-ink;
}

/* ---------- 摘要行 ---------- */
.hint-bar {
  flex-shrink: 0;
  padding: 0 $ds-pad-screen $ds-space-2;
}

.hint {
  font-size: $ds-fs-label-sm;
  color: $ds-ink-2;
}

/* ---------- chip 筛选 ---------- */
.chip-scroll {
  flex-shrink: 0;
  white-space: nowrap;
}

.chip-row {
  display: inline-flex;
  align-items: center;
  gap: $ds-space-2;
  padding: 0 $ds-pad-screen $ds-space-3;
}

.chip {
  /* 关键：横向滚动容器里的 chip 是 flex 子项，默认 flex-shrink:1 会被压窄导致文字竖排换行 */
  flex: none;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 $ds-space-3;
  border-radius: $ds-shape-full;
  border: 1px solid $ds-outline;
  background: transparent;

  &.is-on {
    background: $ds-secondary-container;
    border-color: $ds-secondary-container;
  }

  /* 排序 chip 与筛选项不同类，用文字色区分而不是再加一种底色 */
  &--lead {
    border-style: dashed;

    .chip__text {
      color: $ds-primary;
    }
  }
}

.chip__text {
  white-space: nowrap;
  font-size: $ds-fs-label;
  color: $ds-ink-2;
}

/* ---------- 列表 ---------- */
.list-scroll {
  flex: 1;
  height: 0;
}

.list {
  display: flex;
  flex-direction: column;
  gap: $ds-space-3;
  padding: 0 $ds-pad-screen;
}

.card {
  background: $ds-surface-container;
  border: $ds-card-border;
  border-radius: $ds-shape-md;
}

.guide {
  display: flex;
  padding: $ds-space-3;
}

.avatar {
  position: relative;
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: $ds-shape-sm;
  overflow: hidden;
  /* 字段为空或加载失败时露底色兜底 */
  background: $ds-primary-container;
}

.avatar__img {
  width: 100%;
  height: 100%;
  display: block;
}

.guide__body {
  flex: 1;
  min-width: 0;
  margin-left: $ds-space-3;
}

.guide__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.guide__name {
  font-size: $ds-fs-title;
  font-weight: 600;
  color: $ds-ink;
}

.guide__stat {
  font-size: $ds-fs-label-sm;
  color: $ds-ink-2;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: $ds-space-2;
  margin-top: $ds-space-2;
}

.tag {
  padding: 2px $ds-space-2;
  border: 1px solid $ds-outline;
  border-radius: $ds-shape-xs;
  font-size: $ds-fs-caption;
  color: $ds-ink-2;
}

.guide__service {
  display: block;
  margin-top: $ds-space-2;
  font-size: $ds-fs-label-sm;
  color: $ds-ink-2;
}

.guide__foot {
  margin-top: $ds-space-3;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.price-block {
  display: flex;
  align-items: baseline;
  gap: $ds-space-1;
}

.price {
  font-size: $ds-fs-title-lg;
  font-weight: 700;
  color: $ds-tertiary;
}

.price__symbol {
  font-size: $ds-fs-label;
  font-weight: 600;
}

/* ---------- 按钮（DESIGN.md 的第 2 种变体：Tonal） ---------- */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $ds-shape-sm;
  font-weight: 600;

  &--tonal {
    background: $ds-primary-container;

    .btn__text {
      color: $ds-on-primary-container;
    }
  }

  &--sm {
    height: $ds-h-btn-sm;
    padding: 0 $ds-space-4;
  }
}

.btn__text {
  font-size: $ds-fs-label;
  font-weight: 600;
}

/* ---------- 状态区 ---------- */
.load-status {
  text-align: center;
  padding: $ds-space-5;
}

.load-text {
  font-size: $ds-fs-label;
  color: $ds-ink-2;
}

.empty-box {
  text-align: center;
  padding: 64px $ds-pad-screen;
}

.empty-icon {
  font-size: 40px;
  color: $ds-primary-dim;
}

.empty-title {
  display: block;
  margin-top: $ds-space-3;
  font-size: $ds-fs-body-sm;
  color: $ds-ink;
}

.empty-tip {
  display: block;
  margin-top: $ds-space-2;
  font-size: $ds-fs-label;
  color: $ds-ink-2;
}
</style>
