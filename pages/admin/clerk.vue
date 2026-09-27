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
      <text class="navbar__title">地陪审核</text>
      <view class="icon-btn"></view>
    </view>

    <!-- 统计条 -->
    <view class="stat-strip">
      <view class="stat">
        <text class="stat__value stat__value--alert">{{ pendingTotal }}</text>
        <text class="stat__label">待审核</text>
      </view>
      <view class="stat">
        <text class="stat__value">{{ approvedTotal }}</text>
        <text class="stat__label">已通过</text>
      </view>
      <view class="stat">
        <text class="stat__value">{{ pendingTotal + approvedTotal }}</text>
        <text class="stat__label">合计</text>
      </view>
    </view>

    <!-- 两个页签：MVP 的审核只需通过 / 拒绝 -->
    <view class="tabline">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tabline__item', 'ds-pressable', currentTab === tab.value ? 'is-on' : '']"
        hover-class="is-pressed"
        hover-stay-time="70"
        @click="changeTab(tab.value)"
      >
        <text class="tabline__text">{{ tab.label }}</text>
        <text v-if="tab.value === 0 && pendingTotal" class="tabline__badge">{{ pendingTotal }}</text>
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
    >
      <view class="list">
        <view v-for="guide in guideList" :key="guide.id" class="card">
          <view class="card__main">
            <view class="avatar">
              <image :src="guide.avatarUrl" class="avatar__img" mode="aspectFill" />
            </view>
            <view class="card__info">
              <view class="card__head">
                <text class="card__name">{{ guide.nickname }}</text>
                <text :class="['tag', 'tag--state', 'tag--' + guide.status]">{{ guide.statusLabel }}</text>
              </view>
              <view class="tag-row">
                <text
                  v-for="region in (guide.regionTypes || []).slice(0, 3)"
                  :key="region.id"
                  class="tag"
                >
                  {{ region.name }}
                </text>
              </view>
              <text v-if="guide.introduce" class="card__intro">{{ guide.introduce }}</text>
              <text class="card__meta">
                擅长 {{ (guide.attractions || []).length }} 个景点
                <text v-if="guide.priceFrom"> · 起价 ¥{{ guide.priceFrom }}</text>
                <text v-if="guide.orderCount"> · 接单 {{ guide.orderCount }} 单</text>
              </text>
            </view>
          </view>

          <!-- 待审核才有操作：一单一个主操作，拒绝用描边避免同等重 -->
          <view v-if="guide.status === GUIDE_STATUS.PENDING" class="card__actions">
            <view
              class="btn btn--sm btn--danger ds-pressable"
              hover-class="is-pressed"
              hover-stay-time="70"
              hover-stop-propagation
              @click="reject(guide)"
            >
              <text class="btn__text">拒绝</text>
            </view>
            <view
              class="btn btn--sm btn--filled ds-pressable"
              hover-class="is-pressed"
              hover-stay-time="70"
              hover-stop-propagation
              @click="approve(guide)"
            >
              <text class="btn__text">通过</text>
            </view>
          </view>
        </view>
      </view>

      <view class="load-status">
        <view v-if="loading" class="load-row">
          <view class="ds-spinner"></view>
          <text class="load-text">加载中…</text>
        </view>
        <text v-else-if="!hasMore && guideList.length > 0" class="load-text ds-fade-in">没有更多了</text>
      </view>

      <view v-if="!loading && guideList.length === 0" class="empty-box ds-fade-in">
        <text class="empty-icon">◎</text>
        <text class="empty-title">{{ currentTab === 0 ? '没有待审核的地陪' : '还没有已通过的地陪' }}</text>
        <text class="empty-tip">地陪申请开通流程为后续升级，MVP 阶段由种子数据预置</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
/**
 * 管理端 · 地陪审核
 *
 * 按 MVP 砍范围（gap-003 的 resolution）：审核只需要「通过 / 拒绝」，
 * 因此移除指向 /pages/admin/clerk/edit 的「添加 / 编辑达人」入口，不新建该页面。
 * 地陪申请开通流程本身是后续升级项（dev-003），MVP 的地陪由 mock 种子数据预置。
 */
import { GuideApi, GUIDE_STATUS } from '@/api/index.js';

const tabs = [
  { label: '待审核', value: GUIDE_STATUS.PENDING },
  { label: '已通过', value: GUIDE_STATUS.APPROVED }
];

export default {
  data() {
    return {
      tabs,
      currentTab: GUIDE_STATUS.PENDING,
      guideList: [],
      pendingTotal: 0,
      approvedTotal: 0,
      pageNo: 1,
      pageSize: 10,
      loading: false,
      hasMore: true,
      statusBarHeight: 20,
      GUIDE_STATUS
    };
  },

  computed: {
    activeTabIndex() {
      const i = tabs.findIndex((tab) => tab.value === this.currentTab);
      return i < 0 ? 0 : i;
    },
    /* 下划线：外层跟页签等宽，靠 translateX 的百分比（按自身宽度算）整格滑动，不去动 width */
    indicatorStyle() {
      return {
        width: `${100 / tabs.length}%`,
        transform: `translateX(${this.activeTabIndex * 100}%)`
      };
    }
  },

  onLoad() {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    this.loadList(true);
    this.loadTotals();
  },

  methods: {
    async loadTotals() {
      try {
        const [pending, approved] = await Promise.all([
          GuideApi.getPendingGuides({ pageNo: 1, pageSize: 1 }),
          GuideApi.getGuideList({ pageNo: 1, pageSize: 1 })
        ]);
        this.pendingTotal = pending.total || 0;
        this.approvedTotal = approved.total || 0;
      } catch (e) {
        console.error('加载地陪统计失败', e);
      }
    },

    async loadList(refresh = false) {
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
        const { list, hasMore } = this.currentTab === GUIDE_STATUS.PENDING
          ? await GuideApi.getPendingGuides(params)
          : await GuideApi.getGuideList(params);

        this.guideList = refresh ? list : [...this.guideList, ...list];
        this.hasMore = hasMore;
        this.pageNo++;
      } catch (e) {
        console.error('加载地陪列表失败', e);
        uni.showToast({ title: (e && e.message) || '加载失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },

    changeTab(tab) {
      if (this.currentTab === tab) return;
      this.currentTab = tab;
      this.loadList(true);
    },

    loadMore() {
      this.loadList();
    },

    async approve(guide) {
      const ok = await this.confirm('通过审核', `确定让「${guide.nickname}」上线接单吗？`);
      if (!ok) return;
      await this.audit(guide, GUIDE_STATUS.APPROVED, '已通过');
    },

    async reject(guide) {
      const ok = await this.confirm('拒绝申请', `拒绝后「${guide.nickname}」不会出现在游客端，确定吗？`);
      if (!ok) return;
      await this.audit(guide, GUIDE_STATUS.REJECTED, '已拒绝');
    },

    async audit(guide, status, successText) {
      try {
        await GuideApi.auditGuide(guide.id, { status });
        uni.showToast({ title: successText, icon: 'success' });
        this.loadList(true);
        this.loadTotals();
      } catch (e) {
        uni.showToast({ title: (e && e.message) || '操作失败', icon: 'none' });
      }
    },

    confirm(title, content) {
      return new Promise((resolve) => {
        uni.showModal({
          title,
          content,
          success: (res) => resolve(res.confirm),
          fail: () => resolve(false)
        });
      });
    },

    goBack() {
      uni.navigateBack();
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
  /* 光斑：后台最安静（气泡漫游 · bg-calm-ink 档） */
  background-image: $ds-bg-calm-ink;
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

/* ---------- 统计条（玻璃三格，数字用深紫、警示用藕粉） ---------- */
.stat-strip {
  flex-shrink: 0;
  display: flex;
  margin: 0 $ds-pad-screen $ds-space-3;
  padding: 15px 0;
  background: $ds-surface-container;
  border: $ds-card-border;
  border-radius: $ds-shape-lg;
  box-shadow: $ds-el-1;
  overflow: hidden;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.5);
}

.stat__value {
  font-size: 23px;
  font-weight: 750;
  line-height: 1;
  color: $ds-tertiary;

  &--alert {
    color: $ds-brand-2;
  }
}

.stat__label {
  font-size: 10.5px;
  color: $ds-ink-3;
}

/* ---------- 页签（新规范：选中态 = 黑胶囊） ---------- */
.tabline {
  position: relative;
  flex-shrink: 0;
  display: flex;
  gap: $ds-space-2;
  padding: 0 $ds-pad-screen 14px;
}

.tabline__item {
  position: relative;
  flex: 1;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $ds-shape-full;
  background: rgba(255, 255, 255, 0.6);
  transition: background-color $ds-dur-fast $ds-ease-out;

  &.is-on {
    background: $ds-ink-btn;
    box-shadow: $ds-btn-shadow;

    .tabline__text {
      color: #ffffff;
      font-weight: 700;
    }
  }
}

.tabline__indicator {
  display: none;   /* 胶囊选中态替代了下划线 */
}

.tabline__bar {
  display: none;
}

.tabline__text {
  font-size: 13px;
  font-weight: 600;
  color: $ds-ink-3;
  transition: color $ds-dur-fast $ds-ease-out;
}

.tabline__badge {
  margin-left: $ds-space-1;
  padding: 0 5px;
  border-radius: $ds-shape-full;
  background: $ds-brand-2;
  font-size: $ds-fs-caption;
  color: #ffffff;
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
  padding: $ds-space-4;
  background: $ds-surface-container;
  border: $ds-card-border;
  border-radius: $ds-shape-lg;
  box-shadow: $ds-el-1;
}

.card__main {
  display: flex;
}

.avatar {
  position: relative;
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  background: $ds-surface-high;
}

.avatar__img {
  width: 100%;
  height: 100%;
  display: block;
}

.card__info {
  flex: 1;
  min-width: 0;
  margin-left: $ds-space-3;
}

.card__head {
  display: flex;
  align-items: center;
  gap: $ds-space-2;
}

.card__name {
  font-size: $ds-fs-body-sm;
  font-weight: 750;
  color: $ds-ink;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
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

  &--state {
    font-weight: 700;
  }

  &--0 {
    background: $ds-warning-container;
    color: $ds-warning;
  }

  &--1 {
    background: $ds-success-container;
    color: $ds-success;
  }

  &--2 {
    background: $ds-error-container;
    color: $ds-error;
  }
}

.card__intro {
  display: block;
  margin-top: $ds-space-2;
  font-size: $ds-fs-label-sm;
  line-height: 1.5;
  color: $ds-ink-2;
}

.card__meta {
  display: block;
  margin-top: $ds-space-2;
  font-size: $ds-fs-caption;
  color: $ds-ink-2;
}

.card__actions {
  display: flex;
  justify-content: flex-end;
  gap: $ds-space-2;
  margin-top: $ds-space-3;
  padding-top: $ds-space-3;
  border-top: 1px solid $ds-outline-variant;
}

/* ---------- 按钮：一律胶囊；通过黑实心、拒绝藕粉描边 ---------- */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $ds-shape-full;

  &--sm {
    height: 36px;
    padding: 0 16px;
  }

  &--filled {
    background: $ds-ink-btn;
    box-shadow: $ds-btn-shadow;

    .btn__text {
      color: #ffffff;
    }
  }

  &--danger {
    background: transparent;
    box-shadow: inset 0 0 0 1px rgba(176, 69, 47, 0.4);

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
