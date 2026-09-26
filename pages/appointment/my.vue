<template>
  <view :class="['page', pageMotion]">
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
      <text class="navbar__title">我的订单</text>
      <view class="icon-btn"></view>
    </view>

    <!-- 四态文字页签（顺序与文案取自 api/constants.js）；等宽，下划线是一根会滑的线 -->
    <view class="tabline">
      <view
        v-for="tab in statusTabs"
        :key="tab.value"
        :class="['tabline__item', 'ds-pressable', currentStatus === tab.value ? 'is-on' : '']"
        hover-class="is-pressed"
        hover-stay-time="70"
        @click="changeStatus(tab.value)"
      >
        <text class="tabline__text">{{ tab.label }}</text>
      </view>
      <view class="tabline__indicator" :style="indicatorStyle">
        <view class="tabline__bar"></view>
      </view>
    </view>

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
          v-for="(item, index) in orderList"
          :key="enterSeq + '-' + item.id"
          :class="['card', 'order', enterAnim]"
          :style="enterStyle(index)"
        >
          <view class="order__top">
            <view class="avatar avatar--sm">
              <image :src="item.guideAvatarUrl" class="avatar__img" mode="aspectFill" />
            </view>
            <view class="order__head">
              <text class="order__title">{{ item.attractionName }} · {{ item.packageName }}</text>
              <text class="order__no">#{{ item.orderNo }}</text>
            </view>
            <text :class="['tag', 'tag--state', 'tag--' + item.status]">{{ item.statusLabel }}</text>
          </view>

          <view class="order__body">
            <view class="kv">
              <text class="kv__k">时间</text>
              <text class="kv__v">{{ timeText(item) }}</text>
            </view>
            <view class="kv">
              <text class="kv__k">地陪</text>
              <text class="kv__v">{{ item.guideNickname }}</text>
            </view>
            <view class="kv" v-if="item.remark">
              <text class="kv__k">备注</text>
              <text class="kv__v">{{ item.remark }}</text>
            </view>
          </view>

          <view class="order__foot">
            <text class="price"><text class="price__symbol">¥</text>{{ item.amount }}</text>
            <view
              v-if="canCancel(item.status)"
              :class="['btn', 'btn--sm', 'ds-pressable', item.status === 0 ? 'btn--danger' : 'btn--outlined']"
              hover-class="is-pressed"
              hover-stay-time="70"
              hover-stop-propagation
              @click="cancelOrder(item)"
            >
              <text class="btn__text">取消预约</text>
            </view>
          </view>
        </view>
      </view>

      <view class="load-status">
        <view v-if="loading" class="load-row">
          <view class="ds-spinner"></view>
          <text class="load-text">加载中…</text>
        </view>
        <text v-else-if="!hasMore && orderList.length > 0" class="load-text ds-fade-in">没有更多了</text>
      </view>

      <view v-if="!loading && orderList.length === 0" class="empty-box ds-fade-in">
        <text class="empty-icon">◎</text>
        <text class="empty-title">这里还没有订单</text>
        <text class="empty-tip">去首页挑个景点，再选能带这个景点的地陪</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
/**
 * 游客端 · 我的订单（原型 05 屏）
 *
 * 四态语义与数据源在 feat-005 已收口到 api/constants.js + OrderApi；
 * 本页只做视觉重做与订单卡字段补全（订单号 / 景点·套餐 / 金额 / 人数）。
 */
import { OrderApi, ORDER_STATUS, ORDER_STATUS_LABELS, BOOKING_TYPES, canTransit, bookingTypeLabel } from '@/api/index.js';
import { createTabRow } from '@/utils/hscroll.js';
import { createListEnter, createPageMotion, stepDirection, ENTER_UP } from '@/utils/motion.js';

/* 四态页签是等宽的（不溢出，所以不需要居中），只接「内容左右滑动切换」 */
const statusTabRow = createTabRow({
  index: (vm) => vm.activeTabIndex,
  onStep: (vm, step) => vm.stepStatus(step)
});

/* 列表入场：切状态带方向，加载更多只让新追加的那几项上浮 */
const listEnter = createListEnter();

/* 页面转场：进入淡入 + 返回时先播离场动画（H5；小程序是原生转场） */
const pageMotion = createPageMotion();

const statusTabs = [
  { label: ORDER_STATUS_LABELS[ORDER_STATUS.PENDING_CONFIRM], value: ORDER_STATUS.PENDING_CONFIRM },
  { label: ORDER_STATUS_LABELS[ORDER_STATUS.CONFIRMED], value: ORDER_STATUS.CONFIRMED },
  { label: ORDER_STATUS_LABELS[ORDER_STATUS.COMPLETED], value: ORDER_STATUS.COMPLETED },
  { label: ORDER_STATUS_LABELS[ORDER_STATUS.CANCELLED], value: ORDER_STATUS.CANCELLED }
];

export default {
  data() {
    return {
      ...statusTabRow.data(),
      ...listEnter.data(),
      ...pageMotion.data(),
      statusTabs,
      currentStatus: ORDER_STATUS.PENDING_CONFIRM,
      orderList: [],
      pageNo: 1,
      pageSize: 10,
      total: 0,
      loading: false,
      hasMore: true,
      statusBarHeight: 20
    };
  },

  computed: {
    activeTabIndex() {
      const i = statusTabs.findIndex((tab) => tab.value === this.currentStatus);
      return i < 0 ? 0 : i;
    },
    /* 下划线：外层跟页签等宽，靠 translateX 的百分比（按自身宽度算）整格滑动，不去动 width */
    indicatorStyle() {
      return {
        width: `${100 / statusTabs.length}%`,
        transform: `translateX(${this.activeTabIndex * 100}%)`
      };
    }
  },

  onLoad() {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    this.loadList(true);
  },

  onPullDownRefresh() {
    this.loadList(true);
  },

  methods: {
    ...statusTabRow.methods,
    ...listEnter.methods,
    ...pageMotion.methods,

    /* 横滑：上/下一个状态；顺序与文案取自 api/constants.js */
    stepStatus(step) {
      const next = this.activeTabIndex + step;
      if (next < 0 || next >= statusTabs.length) return;
      this.changeStatus(statusTabs[next].value, step);
    },

    async loadList(refresh = false, dir = ENTER_UP) {
      if (this.loading) return;
      if (!refresh && !this.hasMore) return;

      this.loading = true;
      if (refresh) {
        this.pageNo = 1;
        this.orderList = [];
        this.hasMore = true;
      }

      try {
        const { list, total, hasMore } = await OrderApi.getMyOrders({
          pageNo: this.pageNo,
          pageSize: this.pageSize,
          status: this.currentStatus
        });

        /* 切状态：整批卡片换方向入场；加载更多：只有新追加的这几项上浮 */
        this.beginEnter(refresh ? dir : ENTER_UP, refresh ? 0 : this.orderList.length);
        this.orderList = refresh ? list : [...this.orderList, ...list];
        this.total = total || 0;
        this.hasMore = hasMore;
        this.pageNo++;
      } catch (e) {
        console.error('加载订单失败', e);
        uni.showToast({ title: (e && e.message) || '加载失败', icon: 'none' });
      } finally {
        this.loading = false;
        uni.stopPullDownRefresh();
      }
    },

    changeStatus(status, dir = 0) {
      if (this.currentStatus === status) return;
      /* 点选时方向由下标差推出；横滑时直接用滑动方向（step） */
      const from = this.activeTabIndex;
      this.currentStatus = status;
      this.loadList(true, dir || stepDirection(from, this.activeTabIndex));
    },

    loadMore() {
      this.loadList();
    },

    /** 时间行：全天/半日显示时段，小时加购显示小时数 */
    timeText(item) {
      const [, month, day] = String(item.appointDate).split('-');
      const when = `${month}-${day}`;
      if (item.bookingType === BOOKING_TYPES.HOURLY) {
        return `${when} · ${bookingTypeLabel(item.bookingType)} ${item.hours || 1} 小时 · ${item.peopleCount} 人`;
      }
      const slot = item.timeSlotLabel || '';
      return `${when} ${slot} · ${item.peopleCount} 人`;
    },

    canCancel(status) {
      return canTransit(status, ORDER_STATUS.CANCELLED);
    },

    cancelOrder(order) {
      uni.showModal({
        title: '取消预约',
        content: '确定要取消这笔预约吗？取消后不可恢复。',
        success: async (res) => {
          if (!res.confirm) return;
          try {
            await OrderApi.cancelOrder(order.id, { reason: '游客取消' });
            uni.showToast({ title: '已取消', icon: 'success' });
            this.loadList(true);
          } catch (e) {
            uni.showToast({ title: (e && e.message) || '取消失败', icon: 'none' });
          }
        }
      });
    },

    goBack() {
      this.goBackWithMotion();
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

/* ---------- 四态页签 ---------- */
.tabline {
  position: relative;
  flex-shrink: 0;
  display: flex;
  border-bottom: 1px solid $ds-outline-variant;
}

.tabline__item {
  position: relative;
  flex: 1;
  min-height: $ds-h-touch;
  display: flex;
  align-items: center;
  justify-content: center;

  &.is-on {
    .tabline__text {
      color: $ds-primary;
      font-weight: 600;
    }
  }
}

/* 等宽页签用一根会滑的线：宽度由下标算，位移只用 translateX 的百分比 */
.tabline__indicator {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 2px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  transition: transform $ds-dur-base $ds-ease-in-out;
}

.tabline__bar {
  width: 22px;
  height: 2px;
  border-radius: 1px;
  background: $ds-primary;
}

.tabline__text {
  font-size: $ds-fs-body-sm;
  color: $ds-ink-2;
  transition: color $ds-dur-fast $ds-ease-out;
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
  padding: $ds-space-4 $ds-pad-screen 0;
}

.card {
  background: $ds-surface-container;
  border: $ds-card-border;
  border-radius: $ds-shape-md;
}

.order {
  padding: $ds-space-4;
}

.order__top {
  display: flex;
  align-items: flex-start;
}

.avatar {
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  background: $ds-primary-container;

  &--sm {
    width: 44px;
    height: 44px;
    border-radius: $ds-shape-xs;
  }
}

.avatar__img {
  width: 100%;
  height: 100%;
  display: block;
}

.order__head {
  flex: 1;
  min-width: 0;
  margin: 0 $ds-space-3;
}

.order__title {
  font-size: $ds-fs-body-sm;
  font-weight: 600;
  color: $ds-ink;
}

.order__no {
  display: block;
  margin-top: $ds-space-1;
  font-size: $ds-fs-caption;
  color: $ds-ink-2;
}

/* 状态标签：四态固定配色 */
.tag {
  flex-shrink: 0;
  padding: 2px $ds-space-2;
  border-radius: $ds-shape-xs;
  font-size: $ds-fs-caption;

  &--0 {
    background: $ds-warning-container;
    color: $ds-warning;
  }

  &--1 {
    background: $ds-success-container;
    color: $ds-success;
  }

  &--2 {
    background: $ds-surface-high;
    color: $ds-ink-2;
  }

  &--3 {
    background: $ds-error-container;
    color: $ds-error;
  }
}

.order__body {
  margin-top: $ds-space-3;
  padding-top: $ds-space-3;
  border-top: 1px solid $ds-outline-variant;
}

.kv {
  display: flex;
  margin-bottom: $ds-space-2;

  &:last-child {
    margin-bottom: 0;
  }
}

.kv__k {
  flex-shrink: 0;
  width: 44px;
  font-size: $ds-fs-label;
  color: $ds-ink-2;
}

.kv__v {
  flex: 1;
  font-size: $ds-fs-label;
  color: $ds-ink;
}

.order__foot {
  margin-top: $ds-space-3;
  padding-top: $ds-space-3;
  border-top: 1px solid $ds-outline-variant;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.price {
  font-size: $ds-fs-title-lg;
  font-weight: 700;
  color: $ds-tertiary;
}

.price__symbol {
  font-size: $ds-fs-label-sm;
  font-weight: 600;
}

/* ---------- 按钮：一屏一个主操作，取消类用朱砂 ---------- */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $ds-shape-sm;

  &--sm {
    height: $ds-h-btn-sm;
    padding: 0 $ds-space-4;
  }

  &--outlined {
    border: 1px solid $ds-outline;

    .btn__text {
      color: $ds-ink-2;
    }
  }

  &--danger {
    border: 1px solid $ds-error;

    .btn__text {
      color: $ds-error;
    }
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

.load-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $ds-space-2;
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
