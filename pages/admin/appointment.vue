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
      <text class="navbar__title">订单管理</text>
      <view class="icon-btn"></view>
    </view>

    <!-- 统计条：后台看的是「有多少要处理」 -->
    <view class="stat-strip">
      <view class="stat">
        <text class="stat__value stat__value--alert">{{ counts.pendingConfirm }}</text>
        <text class="stat__label">待确认</text>
      </view>
      <view class="stat">
        <text class="stat__value">{{ counts.confirmed }}</text>
        <text class="stat__label">已确认</text>
      </view>
      <view class="stat">
        <text class="stat__value">{{ counts.todayAppoint }}</text>
        <text class="stat__label">今日订单</text>
      </view>
    </view>

    <!-- 筛选行：日期 + 状态 chip（激活 chip 自动居中，列表可左右滑动切换状态） -->
    <scroll-view
      scroll-x
      class="chip-scroll"
      :show-scrollbar="false"
      :scroll-left="tabScrollLeft"
      scroll-with-animation
      @scroll="onTabScroll"
    >
      <view class="chip-row">
        <picker class="chip-picker" mode="date" :value="filterDate" @change="onDateChange">
          <view
            :class="['chip', 'chip--lead', 'ds-pressable', filterDate ? 'is-on' : '']"
            hover-class="is-pressed"
            hover-stay-time="70"
          >
            <text class="chip__text">{{ dateChipText }}</text>
          </view>
        </picker>
        <view
          v-for="option in statusOptions"
          :key="option.value"
          :class="['chip', 'ds-pressable', currentStatus === option.value ? 'is-on' : '']"
          hover-class="is-pressed"
          hover-stay-time="70"
          @click="changeStatus(option.value)"
        >
          <text class="chip__text">{{ option.label }}</text>
        </view>
      </view>
    </scroll-view>

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
            <view class="avatar">
              <image :src="item.touristAvatarUrl" class="avatar__img" mode="aspectFill" />
            </view>
            <view class="order__head">
              <text class="order__title">{{ item.attractionName }} · {{ item.packageName }}</text>
              <text class="order__no">#{{ item.orderNo }} · 游客 {{ item.touristNickname || '—' }}</text>
            </view>
            <text :class="['tag', 'tag--state', 'tag--' + item.status]">{{ item.statusLabel }}</text>
          </view>

          <view class="order__body">
            <view class="kv">
              <text class="kv__k">地陪</text>
              <text class="kv__v">{{ item.guideNickname }}</text>
            </view>
            <view class="kv">
              <text class="kv__k">时间</text>
              <text class="kv__v">{{ timeText(item) }}</text>
            </view>
            <view class="kv" v-if="item.remark">
              <text class="kv__k">备注</text>
              <text class="kv__v">{{ item.remark }}</text>
            </view>
          </view>

          <view class="order__foot">
            <text class="price"><text class="price__symbol">¥</text>{{ item.amount }}</text>

            <view class="order__actions">
              <view
                v-if="canCancel(item.status)"
                class="btn btn--sm btn--danger ds-pressable"
                hover-class="is-pressed"
                hover-stay-time="70"
                hover-stop-propagation
                @click="cancelOrder(item)"
              >
                <text class="btn__text">处理取消</text>
              </view>
              <view
                v-if="canComplete(item.status)"
                class="btn btn--sm btn--tonal ds-pressable"
                hover-class="is-pressed"
                hover-stay-time="70"
                hover-stop-propagation
                @click="completeOrder(item)"
              >
                <text class="btn__text">标记完成</text>
              </view>
              <view
                v-if="canConfirm(item.status)"
                class="btn btn--sm btn--filled ds-pressable"
                hover-class="is-pressed"
                hover-stay-time="70"
                hover-stop-propagation
                @click="confirmOrder(item)"
              >
                <text class="btn__text">确认档期</text>
              </view>
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
        <text class="empty-title">没有符合条件的订单</text>
        <text class="empty-tip">清掉日期筛选，或换个状态看看</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
/**
 * 管理端 · 订单管理（原型 07 屏）
 *
 * 平台在这条链路上只做两件事：人工确认档期（0 → 1）、处理取消（0/1 → 3）；
 * 已确认的单由地陪完成服务后进终态。
 *
 * 四态语义与操作白名单在 feat-005 已收口（api/constants.js 的 canTransit），
 * 本页只做视觉重做与统计条；counts 由接口一次返回，不在前端重复统计。
 */
import {
  OrderApi,
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  BOOKING_TYPES,
  bookingTypeLabel,
  canTransit
} from '@/api/index.js';
import { createTabRow } from '@/utils/hscroll.js';
import { createListEnter, createPageMotion, stepDirection, ENTER_UP } from '@/utils/motion.js';

/* 筛选行：激活 chip 自动滚到中间 + 列表左右滑动切换状态（见 utils/hscroll.js） */
const filterTabRow = createTabRow({
  container: '.chip-scroll',
  row: '.chip-row',
  item: '.chip',
  index: (vm) => vm.activeChipIndex,
  onStep: (vm, step) => vm.stepStatus(step)
});

/* 列表入场：切状态带方向，加载更多只让新追加的那几项上浮 */
const listEnter = createListEnter();

/* 页面转场：进入淡入 + 返回时先播离场动画（H5；小程序是原生转场） */
const pageMotion = createPageMotion();

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: ORDER_STATUS_LABELS[ORDER_STATUS.PENDING_CONFIRM], value: ORDER_STATUS.PENDING_CONFIRM },
  { label: ORDER_STATUS_LABELS[ORDER_STATUS.CONFIRMED], value: ORDER_STATUS.CONFIRMED },
  { label: ORDER_STATUS_LABELS[ORDER_STATUS.COMPLETED], value: ORDER_STATUS.COMPLETED },
  { label: ORDER_STATUS_LABELS[ORDER_STATUS.CANCELLED], value: ORDER_STATUS.CANCELLED }
];

const DOW = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export default {
  data() {
    return {
      ...filterTabRow.data(),
      ...listEnter.data(),
      ...pageMotion.data(),
      statusOptions,
      currentStatus: '',
      filterDate: '',
      orderList: [],
      counts: { pendingConfirm: 0, confirmed: 0, todayAppoint: 0, total: 0 },
      pageNo: 1,
      pageSize: 10,
      loading: false,
      hasMore: true,
      statusBarHeight: 20
    };
  },

  computed: {
    dateChipText() {
      if (!this.filterDate) return '全部日期';
      const [year, month, day] = this.filterDate.split('-').map(Number);
      return `${month}-${day} ${DOW[new Date(year, month - 1, day).getDay()]}`;
    },
    /* chip 行 = [日期, ...状态]：日期固定在第 0 位，状态从第 1 位起 */
    activeChipIndex() {
      const i = statusOptions.findIndex((option) => option.value === this.currentStatus);
      return i < 0 ? 1 : i + 1;
    }
  },

  onLoad() {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    this.loadList(true);
  },

  methods: {
    ...filterTabRow.methods,
    ...listEnter.methods,
    ...pageMotion.methods,

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
        const params = { pageNo: this.pageNo, pageSize: this.pageSize };
        if (this.currentStatus !== '') params.status = this.currentStatus;
        if (this.filterDate) params.appointDate = this.filterDate;

        const { list, hasMore, counts } = await OrderApi.getAllOrders(params);

        /* 切状态：整批卡片换方向入场；加载更多：只有新追加的这几项上浮 */
        this.beginEnter(refresh ? dir : ENTER_UP, refresh ? 0 : this.orderList.length);
        this.orderList = refresh ? list : [...this.orderList, ...list];
        this.hasMore = hasMore;
        if (counts) this.counts = counts;
        this.pageNo++;
      } catch (e) {
        console.error('加载订单失败', e);
        uni.showToast({ title: (e && e.message) || '加载失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },

    changeStatus(status, dir = 0) {
      if (this.currentStatus === status) return;
      /* 点选时方向由下标差推出；横滑时直接用滑动方向（step） */
      const from = this.activeChipIndex;
      this.currentStatus = status;
      this.centerActiveTab();
      this.loadList(true, dir || stepDirection(from, this.activeChipIndex));
    },

    /* 横滑：上/下一个状态；「全部状态」的左边就是边界 */
    stepStatus(step) {
      const current = statusOptions.findIndex((option) => option.value === this.currentStatus);
      const next = Math.max(current, 0) + step;
      if (next < 0 || next >= statusOptions.length) return;
      this.changeStatus(statusOptions[next].value, step);
    },

    onDateChange(e) {
      this.filterDate = e.detail.value;
      /* 日期 chip 在行首：选完把行滚回最左，保证它完整可见 */
      this.tabScrollLeft = 0;
      /* 改日期没有方向，但要换批次让卡片重播上浮入场 */
      this.renewEnter();
      this.loadList(true);
    },

    loadMore() {
      this.loadList();
    },

    timeText(item) {
      const [, month, day] = String(item.appointDate).split('-');
      const when = `${month}-${day}`;
      if (item.bookingType === BOOKING_TYPES.HOURLY) {
        return `${when} · ${bookingTypeLabel(item.bookingType)} ${item.hours || 1} 小时 · ${item.peopleCount} 人`;
      }
      return `${when} ${item.timeSlotLabel} · ${item.peopleCount} 人`;
    },

    canConfirm(status) {
      return canTransit(status, ORDER_STATUS.CONFIRMED);
    },

    canComplete(status) {
      return canTransit(status, ORDER_STATUS.COMPLETED);
    },

    canCancel(status) {
      return canTransit(status, ORDER_STATUS.CANCELLED);
    },

    async confirmOrder(order) {
      const res = await this.confirmModal('确认档期', '确认该地陪当天可接单？确认后订单生效。');
      if (!res) return;
      await this.runAction(() => OrderApi.confirmOrder(order.id), '已确认档期');
    },

    async completeOrder(order) {
      const res = await this.confirmModal('标记完成', '确认这单已按约定完成？');
      if (!res) return;
      await this.runAction(() => OrderApi.completeOrder(order.id), '已完成');
    },

    async cancelOrder(order) {
      const res = await this.confirmModal('处理取消', '取消后订单不可恢复，确定吗？');
      if (!res) return;
      await this.runAction(() => OrderApi.cancelOrder(order.id, { reason: '平台处理取消' }), '已取消');
    },

    confirmModal(title, content) {
      return new Promise((resolve) => {
        uni.showModal({
          title,
          content,
          success: (res) => resolve(res.confirm),
          fail: () => resolve(false)
        });
      });
    },

    async runAction(action, successText) {
      try {
        await action();
        uni.showToast({ title: successText, icon: 'success' });
        this.loadList(true);
      } catch (e) {
        uni.showToast({ title: (e && e.message) || '操作失败', icon: 'none' });
      }
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

/* ---------- 统计条 ---------- */
.stat-strip {
  flex-shrink: 0;
  display: flex;
  margin: 0 $ds-pad-screen $ds-space-3;
  padding: $ds-space-3 0;
  background: $ds-surface-container;
  border: $ds-card-border;
  border-radius: $ds-shape-md;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat__value {
  font-size: $ds-fs-title-lg;
  font-weight: 700;
  color: $ds-ink;

  &--alert {
    color: $ds-tertiary;
  }
}

.stat__label {
  margin-top: $ds-space-1;
  font-size: $ds-fs-caption;
  color: $ds-ink-2;
}

/* ---------- 筛选 chip ---------- */
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

/* picker 包着日期 chip，也是 flex 子项，同样不能被压缩 */
.chip-picker {
  flex: none;
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
  /* chip 是实底选中态：底色与边框一起过渡，切换才不是硬跳 */
  transition: background-color $ds-dur-fast $ds-ease-out, border-color $ds-dur-fast $ds-ease-out;

  &.is-on {
    background: $ds-secondary-container;
    border-color: $ds-secondary-container;

    .chip__text {
      color: $ds-on-secondary-container;
      font-weight: 600;
    }
  }

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
  padding: 0 $ds-pad-screen;
}

.card {
  background: $ds-surface-container;
  border: $ds-card-border;
  border-radius: $ds-shape-md;
}

/* 后台密度比游客端高一档 */
.order {
  padding: $ds-space-3;
}

.order__top {
  display: flex;
  align-items: flex-start;
}

.avatar {
  position: relative;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: $ds-shape-xs;
  overflow: hidden;
  background: $ds-primary-container;
}

.avatar__img {
  width: 100%;
  height: 100%;
  display: block;
}

.order__head {
  flex: 1;
  min-width: 0;
  margin: 0 $ds-space-2;
}

.order__title {
  font-size: $ds-fs-body-sm;
  font-weight: 600;
  color: $ds-ink;
}

.order__no {
  display: block;
  margin-top: 2px;
  font-size: $ds-fs-caption;
  color: $ds-ink-2;
}

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
  margin-top: $ds-space-2;
  padding-top: $ds-space-2;
  border-top: 1px solid $ds-outline-variant;
}

.kv {
  display: flex;
  margin-bottom: $ds-space-1;

  &:last-child {
    margin-bottom: 0;
  }
}

.kv__k {
  flex-shrink: 0;
  width: 40px;
  font-size: $ds-fs-label-sm;
  color: $ds-ink-2;
}

.kv__v {
  flex: 1;
  font-size: $ds-fs-label-sm;
  color: $ds-ink;
}

.order__foot {
  margin-top: $ds-space-2;
  padding-top: $ds-space-2;
  border-top: 1px solid $ds-outline-variant;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.price {
  font-size: $ds-fs-title;
  font-weight: 700;
  color: $ds-tertiary;
}

.price__symbol {
  font-size: $ds-fs-caption;
  font-weight: 600;
}

.order__actions {
  display: flex;
  align-items: center;
  gap: $ds-space-2;
}

/* ---------- 按钮 ---------- */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $ds-shape-sm;

  &--sm {
    height: 36px;
    padding: 0 $ds-space-3;
  }

  &--filled {
    background: $ds-primary;

    .btn__text {
      color: $ds-on-primary;
    }
  }

  &--tonal {
    background: $ds-primary-container;

    .btn__text {
      color: $ds-on-primary-container;
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
