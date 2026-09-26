<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- 导航栏 -->
    <view class="navbar">
      <view
        class="icon-btn ds-pressable"
        hover-class="is-pressed"
        hover-stay-time="70"
        @click="goBack"
      >
        <text class="icon-btn__text back">‹</text>
      </view>
      <text class="navbar__title">地陪详情</text>
      <view class="icon-btn"></view>
    </view>

    <scroll-view scroll-y class="body-scroll" :show-scrollbar="false">
      <!-- 身份块 -->
      <view class="panel">
        <view class="identity">
          <view class="avatar">
            <image :src="guide.avatarUrl" class="avatar__img" mode="aspectFill" />
          </view>
          <view class="identity__main">
            <text class="identity__name">{{ guide.nickname }}</text>
            <view class="tag-row">
              <text
                v-for="(region, index) in (guide.regionTypes || []).slice(0, 2)"
                :key="region.id"
                :class="['tag', index === 0 ? 'tag--solid' : '']"
              >
                {{ region.name }}
              </text>
            </view>
          </view>
        </view>

        <text v-if="guide.introduce" class="identity__intro">{{ guide.introduce }}</text>

        <view class="metrics">
          <view class="metric">
            <text class="metric__value">{{ guide.orderCount || 0 }}</text>
            <text class="metric__label">接单</text>
          </view>
          <view class="metric">
            <text class="metric__value">{{ weekAvailableCount }}</text>
            <text class="metric__label">本周可约</text>
          </view>
          <view class="metric">
            <text class="metric__value">{{ (guide.packages || []).length }} 个</text>
            <text class="metric__label">服务套餐</text>
          </view>
        </view>
      </view>

      <!-- 擅长景点 -->
      <view class="panel" v-if="(guide.attractions || []).length">
        <text class="panel__title">擅长景点</text>
        <view class="tag-row">
          <text
            v-for="attraction in guide.attractions"
            :key="attraction.id"
            class="tag tag--quiet"
          >
            {{ attraction.name }}
          </text>
        </view>
      </view>

      <!-- 服务套餐（单选，决定下单页的控件与金额） -->
      <view class="panel panel--flush">
        <text class="panel__title panel__title--inset">服务套餐</text>
        <view
          v-for="(pkg, index) in guide.packages || []"
          :key="pkg.packageSkuId"
          :class="['option', 'ds-pressable', packageIndex === index ? 'is-on' : '']"
          hover-class="is-pressed"
          hover-stay-time="70"
          @click="selectPackage(index)"
        >
          <view class="radio">
            <text v-if="packageIndex === index" class="radio__check ds-pop-in">✓</text>
          </view>
          <view class="option__body">
            <text class="option__name">{{ pkg.name }}</text>
            <text class="option__desc">{{ pkg.durationDesc }}</text>
          </view>
          <view class="option__price">
            <text class="price"><text class="price__symbol">¥</text>{{ pkg.price }}</text>
            <text class="option__unit">/ {{ unitLabel(pkg) }}</text>
          </view>
        </view>
      </view>

      <!-- 可约日期 -->
      <view class="panel">
        <text class="panel__title">可约日期</text>
        <scroll-view v-if="availableDates.length" scroll-x :show-scrollbar="false">
          <view class="date-row">
            <view
              v-for="item in availableDates"
              :key="item.appointDate"
              :class="['date', 'ds-pressable', selectedDate === item.appointDate ? 'is-on' : '']"
              hover-class="is-pressed"
              hover-stay-time="70"
              @click="selectedDate = item.appointDate"
            >
              <text class="date__dow">{{ dowText(item.appointDate) }}</text>
              <text class="date__day">{{ mdText(item.appointDate) }}</text>
            </view>
          </view>
        </scroll-view>
        <text v-else class="date-empty">近两周暂无档期，可稍后再看</text>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>

    <!-- 底部固定操作栏：一屏只有一个主操作 -->
    <view class="bottom-bar">
      <view class="price-block">
        <text class="price-block__label">合计 · {{ selectedPackage.name || '未选套餐' }}</text>
        <text class="price price--lg"><text class="price__symbol">¥</text>{{ selectedPackage.price || 0 }}</text>
      </view>
      <view
        class="btn btn--filled ds-pressable"
        hover-class="is-pressed"
        hover-stay-time="70"
        @click="goCreateOrder"
      >
        <text class="btn__text">立即预约</text>
      </view>
    </view>
  </view>
</template>

<script>
/**
 * 游客端 · 地陪详情（原型 03 屏）
 *
 * 与重构前的差别：
 *   1. 按 dev-002 移除评价区块（全站不做评价）
 *   2. 预约表单整体剥离到下单页 /pages/order/create，本页只负责「选套餐 + 选日期」
 *   3. 主操作从「提交」变成「立即预约」，把填写留到下一页，降低首次决策成本
 */
import { GuideApi, bookingTypeUnit } from '@/api/index.js';

const DOW = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export default {
  data() {
    return {
      guideId: '',
      attractionId: '',
      guide: {},
      availableDateRows: [],
      packageIndex: 0,
      selectedDate: '',
      statusBarHeight: 20
    };
  },

  computed: {
    /** 已选套餐（套餐是详情页的必选动作，无法为空） */
    selectedPackage() {
      const packages = this.guide.packages || [];
      return packages[this.packageIndex] || {};
    },

    /** 只列当前套餐类型能约的日期：套餐类型决定可用档期（BOOKING_TYPE_UI 里也这么约定） */
    availableDates() {
      const bookingType = this.selectedPackage.bookingType;
      if (!bookingType) return [];
      return this.availableDateRows.filter(
        (row) => row.isAvailable === 1 && (row.bookingTypes || []).indexOf(bookingType) >= 0
      );
    },

    /** 身份块指标：未来 7 天（含今天）可约天数 */
    weekAvailableCount() {
      const limit = this.formatDate(new Date(Date.now() + 6 * 24 * 3600 * 1000));
      const count = this.availableDateRows.filter(
        (row) => row.isAvailable === 1 && row.appointDate <= limit
      ).length;
      return `${count} 天`;
    }
  },

  onLoad(options = {}) {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    this.guideId = options.id || '';
    this.attractionId = options.attractionId || '';
    this.loadDetail();
    this.loadAvailableDates();
  },

  methods: {
    async loadDetail() {
      try {
        const data = await GuideApi.getGuideDetail(this.guideId);
        this.guide = data || {};
        this.packageIndex = 0;
        this.syncDateSelection();
      } catch (e) {
        console.error('加载地陪详情失败', e);
        uni.showToast({ title: (e && e.message) || '加载失败', icon: 'none' });
      }
    },

    async loadAvailableDates() {
      try {
        this.availableDateRows = (await GuideApi.getGuideAvailableDates(this.guideId, { days: 14 })) || [];
        this.syncDateSelection();
      } catch (e) {
        console.error('加载可约日期失败', e);
      }
    },

    /** 切换套餐后重新校正日期选择：当前日期不支持新类型时回落到第一个可约日期 */
    syncDateSelection() {
      const dates = this.availableDates;
      const stillValid = dates.some((row) => row.appointDate === this.selectedDate);
      if (!stillValid) {
        this.selectedDate = dates.length ? dates[0].appointDate : '';
      }
    },

    selectPackage(index) {
      if (this.packageIndex === index) return;
      this.packageIndex = index;
      this.syncDateSelection();
    },

    unitLabel(pkg) {
      return bookingTypeUnit(pkg.bookingType) || '次';
    },

    dowText(appointDate) {
      const today = this.formatDate(new Date());
      if (appointDate === today) return '今天';
      return DOW[this.parseDate(appointDate).getDay()];
    },

    mdText(appointDate) {
      const [, month, day] = appointDate.split('-');
      return `${month}-${day}`;
    },

    /** 'YYYY-MM-DD' → Date（手动拆分，避免被当 UTC 解析导致差一天） */
    parseDate(appointDate) {
      const [year, month, day] = String(appointDate).split('-').map(Number);
      return new Date(year, (month || 1) - 1, day || 1);
    },

    formatDate(date) {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${date.getFullYear()}-${month}-${day}`;
    },

    goBack() {
      uni.navigateBack();
    },

    goCreateOrder() {
      const pkg = this.selectedPackage;
      if (!pkg.packageSkuId) {
        uni.showToast({ title: '请先选择套餐', icon: 'none' });
        return;
      }
      if (!this.selectedDate) {
        uni.showToast({ title: '请选择预约日期', icon: 'none' });
        return;
      }

      // 景点：优先上游带过来的，否则用套餐类型对应的第一个擅长景点
      const attractionId = this.attractionId || (this.guide.attractionIds || [])[0] || '';
      const url =
        `/pages/order/create?guideId=${this.guideId}` +
        `&packageSkuId=${pkg.packageSkuId}` +
        `&attractionId=${attractionId}` +
        `&appointDate=${this.selectedDate}`;
      uni.navigateTo({ url });
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
  /* 光斑：顶光打在头像和身份区，紫为主（气泡漫游 · bg-top 档） */
  background-image: $ds-bg-top;
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

/* ---------- 内容 ---------- */
.body-scroll {
  flex: 1;
  height: 0;
}

.panel {
  margin: 0 $ds-pad-screen $ds-space-3;
  padding: 18px;
  background: $ds-surface-container;
  border: $ds-card-border;
  border-radius: $ds-shape-lg;
  box-shadow: $ds-el-1;

  &--flush {
    padding: $ds-space-4 0;
    overflow: hidden;
  }
}

.panel__title {
  display: block;
  font-size: 15px;
  font-weight: 750;
  color: $ds-ink;
  margin-bottom: $ds-space-3;

  &--inset {
    padding: 0 18px;
  }
}

/* ---------- 身份块 ---------- */
.identity {
  display: flex;
  align-items: center;
}

.avatar {
  position: relative;
  flex-shrink: 0;
  width: 74px;
  height: 74px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.9), 0 0 0 3.5px rgba(143, 127, 224, 0.22);
  background: $ds-surface-high;
}

.avatar__img {
  width: 100%;
  height: 100%;
  display: block;
}

.identity__main {
  flex: 1;
  min-width: 0;
  margin-left: 15px;
}

.identity__name {
  font-size: 18.5px;
  font-weight: 800;
  color: $ds-ink;
}

.identity__intro {
  display: block;
  margin-top: 15px;
  padding-top: 14px;
  border-top: 1px dashed $ds-outline;
  font-size: 13px;
  line-height: 1.72;
  color: $ds-ink-2;
}

/* 三项指标：三格浅底小方块，数字用深紫 */
.metrics {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.metric {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 11px 6px;
  border-radius: $ds-shape-sm;
  background: $ds-surface-high;
}

.metric__value {
  font-size: 17px;
  font-weight: 750;
  color: $ds-tertiary;
}

.metric__label {
  font-size: 10.5px;
  color: $ds-ink-3;
}

/* ---------- 标签 ---------- */
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: $ds-space-2;
  margin-top: $ds-space-2;
}

.tag {
  display: inline-flex;
  align-items: center;
  height: 23px;
  padding: 0 10px;
  border-radius: $ds-shape-full;
  font-size: $ds-fs-caption;
  font-weight: 600;
  color: $ds-on-secondary-container;
  background: rgba(143, 127, 224, 0.1);

  &--solid {
    background: $ds-primary;
    color: $ds-on-primary;
  }

  &--quiet {
    background: transparent;
    color: $ds-ink-3;
    box-shadow: inset 0 0 0 1px $ds-outline;
  }
}

/* ---------- 套餐单选（选中 = 黑胶囊圆点 + 雾紫浅底） ---------- */
.option {
  display: flex;
  align-items: center;
  padding: 15px 18px;
  border-top: 1px solid $ds-outline-variant;
  transition: background-color $ds-dur-fast $ds-ease-out;

  &.is-on {
    background: $ds-tertiary-container;
  }

  &:first-of-type {
    border-top: none;
  }
}

.option__name {
  transition: color $ds-dur-fast $ds-ease-out;
}

.radio {
  flex-shrink: 0;
  width: 21px;
  height: 21px;
  border-radius: $ds-shape-full;
  box-shadow: inset 0 0 0 1.6px $ds-outline;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color $ds-dur-fast $ds-ease-out, box-shadow $ds-dur-fast $ds-ease-out;

  .is-on & {
    background: $ds-ink-btn;
    box-shadow: none;
  }
}

.radio__check {
  font-size: 12px;
  line-height: 1;
  color: $ds-on-primary;
}

.option__body {
  flex: 1;
  min-width: 0;
  margin-left: $ds-space-3;
}

.option__name {
  display: block;
  font-size: 14.5px;
  font-weight: 700;
  color: $ds-ink;
}

.option__desc {
  display: block;
  margin-top: 3px;
  font-size: $ds-fs-label-sm;
  color: $ds-ink-3;
}

.option__price {
  display: flex;
  align-items: baseline;
}

.option__unit {
  margin-left: 2px;
  font-size: 10.5px;
  color: $ds-ink-3;
}

/* ---------- 价格 ---------- */
.price {
  font-size: $ds-fs-title-lg;
  font-weight: 750;
  color: $ds-tertiary;

  &--lg {
    font-size: 25px;
  }
}

.price__symbol {
  font-size: $ds-fs-label-sm;
  font-weight: 600;
}

/* ---------- 日期横条（选中 = 黑胶囊） ---------- */
.date-row {
  display: inline-flex;
  gap: 9px;
  padding: 2px;
}

.date {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 68px;
  padding: 12px 9px;
  border-radius: $ds-shape-sm;
  background: $ds-surface-high;
  transition: background-color $ds-dur-fast $ds-ease-out, transform $ds-dur-fast $ds-ease-out;

  &.is-on {
    background: $ds-ink-btn;
    box-shadow: $ds-btn-shadow;

    .date__dow,
    .date__day {
      color: rgba(255, 255, 255, 0.78);
    }

    .date__day {
      color: #ffffff;
    }
  }
}

.date__dow {
  font-size: 10.5px;
  color: $ds-ink-2;
  transition: color $ds-dur-fast $ds-ease-out;
}

.date__day {
  font-size: 15px;
  font-weight: 750;
  color: $ds-ink;
  transition: color $ds-dur-fast $ds-ease-out;
}

.date-empty {
  font-size: $ds-fs-label;
  color: $ds-ink-2;
}

/* ---------- 底部操作栏 ---------- */
.bottom-space {
  height: 80px;
}

.bottom-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 13px $ds-pad-screen;
  padding-bottom: max(13px, env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.78);
  border-top: 1px solid rgba(42, 39, 64, 0.06);
  box-shadow: $ds-el-3;
}

.price-block__label {
  display: block;
  font-size: $ds-fs-caption;
  color: $ds-ink-3;
}

/* 主按钮：纯黑胶囊（不用渐变），一屏一个主操作 */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $ds-shape-full;

  &--filled {
    height: $ds-h-btn;
    padding: 0 $ds-space-6;
    background: $ds-ink-btn;
    box-shadow: $ds-btn-shadow;

    .btn__text {
      color: #ffffff;
    }
  }
}

.btn__text {
  font-size: $ds-fs-body-sm;
  font-weight: 600;
}
</style>
