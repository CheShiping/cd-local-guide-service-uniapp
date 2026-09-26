<template>
  <view :class="['page', pageMotion]">
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- 导航栏：右侧是在线开关 -->
    <view class="navbar">
      <view
        class="icon-btn ds-pressable"
        hover-class="is-pressed"
        hover-stay-time="70"
        @click="goBack"
      >
        <text class="icon-btn__text back">‹</text>
      </view>
      <text class="navbar__title">接单</text>
      <view class="icon-btn ds-pressable" hover-class="is-pressed" hover-stay-time="70" @click="toggleOnline">
        <view :class="['switch', online ? 'is-on' : '']">
          <view class="switch__knob"></view>
        </view>
      </view>
    </view>

    <!-- 统计条：地陪端先看「有多少要处理」 -->
    <view class="stat-strip">
      <view class="stat">
        <text class="stat__value stat__value--alert">{{ counts.waiting }}</text>
        <text class="stat__label">待接单</text>
      </view>
      <view class="stat">
        <text class="stat__value">{{ counts.inProgress }}</text>
        <text class="stat__label">进行中</text>
      </view>
      <view class="stat">
        <text class="stat__value">{{ counts.todayFinished }}</text>
        <text class="stat__label">今日完成</text>
      </view>
    </view>

    <!-- 分段：scope 由接口负责过滤，前端不再自己筛；选中块是滑过去的，不是原地换底色 -->
    <view class="segmented">
      <view class="segmented__thumb" :style="thumbStyle"></view>
      <view
        v-for="tab in scopeTabs"
        :key="tab.value"
        :class="['segmented__item', 'ds-pressable', scope === tab.value ? 'is-on' : '']"
        hover-class="is-pressed"
        hover-stay-time="70"
        @click="changeScope(tab.value)"
      >
        <text class="segmented__text">{{ tab.label }}</text>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="list-scroll"
      :show-scrollbar="false"
      @scrolltolower="loadMore"
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
            <text :class="['tag', 'tag--state', 'tag--' + stateKey(item)]">{{ stateText(item) }}</text>
          </view>

          <view class="order__body">
            <view class="kv">
              <text class="kv__k">时间</text>
              <text class="kv__v">{{ timeText(item) }}</text>
            </view>
            <view class="kv">
              <text class="kv__k">集合</text>
              <text class="kv__v">待与游客确认</text>
            </view>
            <view class="kv" v-if="item.remark">
              <text class="kv__k">备注</text>
              <text class="kv__v">{{ item.remark }}</text>
            </view>
          </view>

          <view class="order__foot">
            <text class="price"><text class="price__symbol">¥</text>{{ item.amount }}</text>

            <view class="order__actions">
              <!-- 待接单：拒单描边、接单实心 —— 一单一个主操作 -->
              <template v-if="item.waitingGuideAccept">
                <view
                  class="btn btn--sm btn--outlined ds-pressable"
                  hover-class="is-pressed"
                  hover-stay-time="70"
                  hover-stop-propagation
                  @click="reject(item)"
                >
                  <text class="btn__text">拒单</text>
                </view>
                <view
                  class="btn btn--sm btn--filled ds-pressable"
                  hover-class="is-pressed"
                  hover-stay-time="70"
                  hover-stop-propagation
                  @click="accept(item)"
                >
                  <text class="btn__text">接单</text>
                </view>
              </template>

              <!-- 已接但平台未确认：没有可做的动作，如实说明 -->
              <text v-else-if="item.status === ORDER_STATUS.PENDING_CONFIRM" class="wait-tip">
                已接单，等平台确认档期
              </text>

              <view
                v-else
                class="btn btn--sm btn--tonal ds-pressable"
                hover-class="is-pressed"
                hover-stay-time="70"
                hover-stop-propagation
                @click="complete(item)"
              >
                <text class="btn__text">完成服务</text>
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
        <text class="empty-title">{{ emptyTitle }}</text>
        <text class="empty-tip">保持在线，有新预约会出现在这里</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
/**
 * 地陪端 · 接单（原型 06 屏）
 *
 * 地陪身份 MVP 由 mock 预置（dev-003：申请开通流程后续再做），
 * 入口在「我的」页按角色显示，登录后仍统一落首页。
 *
 * 关键语义：接单只写 guideAcceptedAt，订单状态仍是 0 待确认（等平台人工确认档期）。
 * 因此「进行中」的口径是 isGuideCommitted（我已接下的单），否则接完单的订单会从列表消失。
 */
import { OrderApi, ORDER_STATUS, BOOKING_TYPES, bookingTypeLabel } from '@/api/index.js';
import { createListEnter, createPageMotion, stepDirection, ENTER_UP } from '@/utils/motion.js';

const ONLINE_KEY = 'guide_online';

const scopeTabs = [
  { label: '待接单', value: 'waiting' },
  { label: '进行中', value: 'inProgress' }
];

/* 列表入场：切分段带方向，加载更多只让新追加的那几项上浮 */
const listEnter = createListEnter();

/* 页面转场：进入淡入 + 返回时先播离场动画（H5；小程序是原生转场） */
const pageMotion = createPageMotion();

export default {
  data() {
    return {
      ...listEnter.data(),
      ...pageMotion.data(),
      scopeTabs,
      scope: 'waiting',
      orderList: [],
      counts: { waiting: 0, inProgress: 0, todayFinished: 0 },
      pageNo: 1,
      pageSize: 10,
      loading: false,
      hasMore: true,
      online: true,
      statusBarHeight: 20,
      ORDER_STATUS
    };
  },

  computed: {
    emptyTitle() {
      return this.scope === 'waiting' ? '暂时没有等着你接的单' : '还没有进行中的订单';
    },
    activeScopeIndex() {
      const i = scopeTabs.findIndex((tab) => tab.value === this.scope);
      return i < 0 ? 0 : i;
    },
    /* 分段滑块：宽度由段数算，位移只用 translateX 的百分比（按自身宽度算，正好一段） */
    thumbStyle() {
      return {
        width: `calc((100% - 6px) / ${scopeTabs.length})`,
        transform: `translateX(${this.activeScopeIndex * 100}%)`
      };
    }
  },

  onLoad() {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    this.online = uni.getStorageSync(ONLINE_KEY) !== false;
    this.loadOrders(true);
  },

  onPullDownRefresh() {
    this.loadOrders(true);
  },

  methods: {
    ...listEnter.methods,
    ...pageMotion.methods,

    async loadOrders(refresh = false, dir = ENTER_UP) {
      if (this.loading) return;
      if (!refresh && !this.hasMore) return;

      this.loading = true;
      if (refresh) {
        this.pageNo = 1;
        this.orderList = [];
        this.hasMore = true;
      }

      try {
        const { list, hasMore, counts } = await OrderApi.getGuideOrders({
          scope: this.scope,
          pageNo: this.pageNo,
          pageSize: this.pageSize
        });

        /* 切分段：整批卡片换方向入场；加载更多：只有新追加的这几项上浮 */
        this.beginEnter(refresh ? dir : ENTER_UP, refresh ? 0 : this.orderList.length);
        this.orderList = refresh ? list : [...this.orderList, ...list];
        this.hasMore = hasMore;
        if (counts) this.counts = counts;
        this.pageNo++;
      } catch (e) {
        console.error('加载接单列表失败', e);
        uni.showToast({ title: (e && e.message) || '加载失败', icon: 'none' });
      } finally {
        this.loading = false;
        uni.stopPullDownRefresh();
      }
    },

    changeScope(scope, dir = 0) {
      if (this.scope === scope) return;
      /* 点选时方向由下标差推出（待接单 ↔ 进行中） */
      const from = this.activeScopeIndex;
      this.scope = scope;
      this.loadOrders(true, dir || stepDirection(from, this.activeScopeIndex));
    },

    loadMore() {
      this.loadOrders();
    },

    /** 地陪视角的状态文案：待接单 / 待平台确认 / 已确认（后两者都不是终态） */
    stateText(item) {
      if (item.waitingGuideAccept) return '待接单';
      if (item.status === ORDER_STATUS.PENDING_CONFIRM) return '待平台确认';
      return item.statusLabel;
    },

    /** 标签配色只按「待办 / 已定」两类，避免地陪端出现四种颜色 */
    stateKey(item) {
      return item.waitingGuideAccept || item.status === ORDER_STATUS.PENDING_CONFIRM ? 0 : 1;
    },

    timeText(item) {
      const [, month, day] = String(item.appointDate).split('-');
      const when = `${month}-${day}`;
      if (item.bookingType === BOOKING_TYPES.HOURLY) {
        return `${when} · ${bookingTypeLabel(item.bookingType)} ${item.hours || 1} 小时 · ${item.peopleCount} 人`;
      }
      return `${when} ${item.timeSlotLabel} · ${item.peopleCount} 人`;
    },

    toggleOnline() {
      this.online = !this.online;
      uni.setStorageSync(ONLINE_KEY, this.online);
      // 后端订单表暂无「接单开关」字段，MVP 只在前端记忆；接单时不拦截
      uni.showToast({
        title: this.online ? '已上线，可接单' : '已下线，暂不接新单',
        icon: 'none'
      });
    },

    accept(item) {
      uni.showModal({
        title: '接单',
        content: '接单后请按约定时间提供服务，平台确认档期后订单生效。',
        success: async (res) => {
          if (!res.confirm) return;
          try {
            await OrderApi.acceptOrder(item.id);
            uni.showToast({ title: '已接单，等平台确认', icon: 'success' });
            this.loadOrders(true);
          } catch (e) {
            uni.showToast({ title: (e && e.message) || '接单失败', icon: 'none' });
          }
        }
      });
    },

    reject(item) {
      uni.showModal({
        title: '拒单',
        content: '拒单后订单将直接取消，确定吗？',
        success: async (res) => {
          if (!res.confirm) return;
          try {
            await OrderApi.rejectOrder(item.id, { reason: '地陪拒单' });
            uni.showToast({ title: '已拒单', icon: 'success' });
            this.loadOrders(true);
          } catch (e) {
            uni.showToast({ title: (e && e.message) || '拒单失败', icon: 'none' });
          }
        }
      });
    },

    complete(item) {
      uni.showModal({
        title: '完成服务',
        content: '确认已按约定完成服务？',
        success: async (res) => {
          if (!res.confirm) return;
          try {
            await OrderApi.completeOrder(item.id);
            uni.showToast({ title: '已完成', icon: 'success' });
            this.loadOrders(true);
          } catch (e) {
            uni.showToast({ title: (e && e.message) || '操作失败', icon: 'none' });
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

/* 在线开关：圆点用 transform 滑过去，不要用 justify-content（那是硬跳） */
.switch {
  width: 44px;
  height: 24px;
  border-radius: $ds-shape-full;
  background: $ds-outline;
  padding: 2px;
  display: flex;
  transition: background-color $ds-dur-fast $ds-ease-out;

  &.is-on {
    background: $ds-primary;
  }
}

.switch__knob {
  width: 20px;
  height: 20px;
  border-radius: $ds-shape-full;
  background: $ds-on-primary;
  transition: transform $ds-dur-base $ds-ease-out;
}

.switch.is-on .switch__knob {
  transform: translateX(20px);
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

/* ---------- 分段控件 ---------- */
.segmented {
  position: relative;
  flex-shrink: 0;
  display: flex;
  margin: 0 $ds-pad-screen $ds-space-3;
  padding: 3px;
  background: $ds-surface-high;
  border-radius: $ds-shape-sm;
}

/* 选中块：只用 translateX 滑，不动 width / left */
.segmented__thumb {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  border-radius: $ds-shape-xs;
  background: $ds-surface-container;
  transition: transform $ds-dur-base $ds-ease-in-out;
}

.segmented__item {
  position: relative;
  z-index: 1;
  flex: 1;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $ds-shape-xs;

  &.is-on {
    .segmented__text {
      color: $ds-primary;
      font-weight: 600;
    }
  }
}

.segmented__text {
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

.wait-tip {
  font-size: $ds-fs-label-sm;
  color: $ds-ink-2;
}

/* ---------- 按钮 ---------- */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $ds-shape-sm;

  &--sm {
    height: 36px;
    padding: 0 $ds-space-4;
  }

  &--outlined {
    border: 1px solid $ds-outline;

    .btn__text {
      color: $ds-ink-2;
    }
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
