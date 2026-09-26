<template>
  <view :class="['page', pageMotion]">
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- 页面标题：宋体大标题 + 一句把下一步说清楚的副标题 -->
    <view class="screen-head">
      <text class="screen-kicker">成都 · 地陪预约</text>
      <text class="screen-title">今天去哪儿</text>
      <text class="screen-sub">{{ total }} 个景点 · 本地地陪带路，先选地方再挑人</text>
    </view>

    <!-- 区域文字页签（一级筛选用下划线，不用胶囊）：激活项自动居中，列表可左右滑动切换 -->
    <scroll-view
      scroll-x
      class="tabline"
      :show-scrollbar="false"
      :scroll-left="tabScrollLeft"
      scroll-with-animation
      @scroll="onTabScroll"
    >
      <view class="tabline__inner">
        <view
          :class="['tabline__item', 'ds-pressable', regionTypeId === '' ? 'is-on' : '']"
          hover-class="is-pressed"
          hover-stay-time="70"
          @click="changeRegion('')"
        >
          <text class="tabline__text">全部</text>
          <view class="tabline__bar"></view>
        </view>
        <view
          v-for="region in regionList"
          :key="region.id"
          :class="['tabline__item', 'ds-pressable', regionTypeId === region.id ? 'is-on' : '']"
          hover-class="is-pressed"
          hover-stay-time="70"
          @click="changeRegion(region.id)"
        >
          <text class="tabline__text">{{ region.name }}</text>
          <view class="tabline__bar"></view>
        </view>
      </view>
    </scroll-view>

    <!-- 景点列表 -->
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
          v-for="(item, index) in attractionList"
          :key="enterSeq + '-' + item.id"
          :class="['card', 'attract', 'ds-pressable', enterAnim]"
          :style="enterStyle(index)"
          hover-class="is-pressed"
          hover-stay-time="70"
          @click="goGuideList(item)"
        >
          <view class="thumb">
            <image :src="item.coverUrl" class="thumb__img" mode="aspectFill" />
          </view>
          <view class="attract__body">
            <text class="attract__name">{{ item.name }}</text>
            <text class="attract__meta">{{ item.district }} · {{ item.scene }}</text>
            <view class="attract__foot">
              <text class="attract__guides">{{ item.guideCount }} 位地陪可约</text>
              <view class="attract__go">
                <text class="attract__go-icon">›</text>
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
        <text v-else-if="!hasMore && attractionList.length > 0" class="load-text ds-fade-in">没有更多了</text>
      </view>

      <view v-if="!loading && attractionList.length === 0" class="empty-box ds-fade-in">
        <text class="empty-icon">◎</text>
        <text class="empty-title">这个区域还没有景点</text>
        <text class="empty-tip">换个区域看看，或先选「全部」</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
/**
 * 游客端 · 景点列表（首页，原型 01 屏）
 *
 * 信息架构按 dev-001：先选景点 → 再选能带这个景点的地陪。
 * 因此首页是景点列表，点卡片进入 /pages/guide/list?attractionId=xxx。
 *
 * 数据来源：RegionApi（区域字典，后台可维护）+ AttractionApi（景点，20 条 → 2 页）
 */
import { RegionApi, AttractionApi } from '@/api/index.js';
import { createTabRow } from '@/utils/hscroll.js';
import { createListEnter, createPageMotion, stepDirection, ENTER_UP } from '@/utils/motion.js';

/* 区域页签：激活项自动滚到可视区中间 + 内容左右滑动切换（见 utils/hscroll.js） */
const regionTabRow = createTabRow({
  container: '.tabline',
  row: '.tabline__inner',
  item: '.tabline__item',
  index: (vm) => vm.activeTabIndex,
  onStep: (vm, step) => vm.stepRegion(step)
});

/* 列表入场：切区域带方向（卡片从行进方向那一侧进来），加载更多只让新追加的那几项上浮 */
const listEnter = createListEnter();

/* 页面转场：首页是 tabBar 页，只用到进入（H5；小程序是原生转场） */
const pageMotion = createPageMotion();

export default {
  data() {
    return {
      ...regionTabRow.data(),
      ...listEnter.data(),
      ...pageMotion.data(),
      regionList: [],
      regionTypeId: '',
      attractionList: [],
      pageNo: 1,
      pageSize: 10,
      total: 0,
      loading: false,
      hasMore: true,
      statusBarHeight: 20
    };
  },

  computed: {
    /* 页签行 = [全部, ...区域]，下标 0 是「全部」 */
    activeTabIndex() {
      const i = this.regionList.findIndex((region) => region.id === this.regionTypeId);
      return i < 0 ? 0 : i + 1;
    }
  },

  onLoad() {
    const sys = uni.getSystemInfoSync();
    this.statusBarHeight = sys.statusBarHeight || 20;
    this.loadRegions();
    this.loadAttractions(true);
  },

  methods: {
    ...regionTabRow.methods,
    ...listEnter.methods,
    ...pageMotion.methods,

    async loadRegions() {
      try {
        this.regionList = (await RegionApi.getRegionList()) || [];
      } catch (e) {
        console.error('加载区域失败', e);
      }
    },

    async loadAttractions(refresh = false, dir = ENTER_UP) {
      if (this.loading) return;
      if (!refresh && !this.hasMore) return;

      this.loading = true;
      if (refresh) {
        this.pageNo = 1;
        this.attractionList = [];
        this.hasMore = true;
      }

      try {
        const params = { pageNo: this.pageNo, pageSize: this.pageSize };
        if (this.regionTypeId) {
          params.regionTypeId = this.regionTypeId;
        }

        const { list, total, hasMore } = await AttractionApi.getAttractionList(params);

        /* 切换区域：整批卡片换方向入场；加载更多：只有新追加的这几项上浮 */
        this.beginEnter(refresh ? dir : ENTER_UP, refresh ? 0 : this.attractionList.length);
        this.attractionList = refresh ? list : [...this.attractionList, ...list];
        this.total = total || 0;
        this.hasMore = hasMore;
        this.pageNo++;
      } catch (e) {
        console.error('加载景点失败', e);
        uni.showToast({ title: (e && e.message) || '加载失败', icon: 'none' });
      } finally {
        this.loading = false;
      }
    },

    changeRegion(regionTypeId, dir = 0) {
      if (this.regionTypeId === regionTypeId) return;
      /* 点选时方向由下标差推出；横滑时直接用滑动方向（step） */
      const from = this.activeTabIndex;
      this.regionTypeId = regionTypeId;
      this.centerActiveTab();
      this.loadAttractions(true, dir || stepDirection(from, this.activeTabIndex));
    },

    /* 横滑：上/下一个区域；到两端就停住 */
    stepRegion(step) {
      const tabs = ['', ...this.regionList.map((region) => region.id)];
      const next = this.activeTabIndex + step;
      if (next < 0 || next >= tabs.length) return;
      this.changeRegion(tabs[next], step);
    },

    loadMore() {
      this.loadAttractions();
    },

    goGuideList(item) {
      const name = encodeURIComponent(item.name);
      uni.navigateTo({ url: `/pages/guide/list?attractionId=${item.id}&name=${name}` });
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

/* ---------- 页面标题 ---------- */
.screen-head {
  flex-shrink: 0;
  padding: $ds-space-3 $ds-pad-screen $ds-space-4;
}

.screen-kicker {
  display: block;
  font-size: $ds-fs-label-sm;
  color: $ds-ink-2;
}

.screen-title {
  display: block;
  margin-top: $ds-space-1;
  font-family: $ds-font-title;
  font-size: $ds-fs-display;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: $ds-ls-title;
  color: $ds-ink;
}

.screen-sub {
  display: block;
  margin-top: $ds-space-2;
  font-size: $ds-fs-label-sm;
  color: $ds-ink-2;
}

/* ---------- 区域文字页签 ---------- */
.tabline {
  flex-shrink: 0;
  white-space: nowrap;
  border-bottom: 1px solid $ds-outline-variant;
}

.tabline__inner {
  display: inline-flex;
  align-items: stretch;
  padding: 0 $ds-space-3;
}

.tabline__item {
  position: relative;
  /* 关键：横向滚动容器里的页签是 flex 子项，默认 flex-shrink:1 会被压窄导致文字竖排换行 */
  flex: none;
  white-space: nowrap;
  padding: $ds-space-3 $ds-space-3;
  min-height: $ds-h-touch;

  &.is-on {
    .tabline__text {
      color: $ds-primary;
      font-weight: 600;
    }

    /* 激活下划线：宽度固定 22px，只用 scaleX 收放，不去动 width */
    .tabline__bar {
      opacity: 1;
      transform: translateX(-50%) scaleX(1);
    }
  }
}

.tabline__bar {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 22px;
  height: 2px;
  border-radius: 1px;
  background: $ds-primary;
  /* 切换时旧项的线收回去、新项的线展开，读起来就是「线移过去了」 */
  opacity: 0;
  transform: translateX(-50%) scaleX(0);
  transition: transform $ds-dur-base $ds-ease-out, opacity $ds-dur-fast $ds-ease-out;
}

.tabline__text {
  white-space: nowrap;
  font-size: $ds-fs-body-sm;
  color: $ds-ink-2;
  transition: color $ds-dur-fast $ds-ease-out;
}

/* ---------- 列表 ---------- */
.list-scroll {
  flex: 1;
  height: 0; /* 让 flex 子项可滚动 */
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

.attract {
  display: flex;
  padding: $ds-space-3;
}

.thumb {
  position: relative;
  flex-shrink: 0;
  width: 76px;
  height: 76px;
  border-radius: $ds-shape-sm;
  overflow: hidden;
  /* 字段为空或加载失败时露出这个底色兜底（不裂图、不拉伸） */
  background: $ds-primary-container;
}

.thumb__img {
  width: 100%;
  height: 100%;
  display: block;
}

.attract__body {
  flex: 1;
  min-width: 0;
  margin-left: $ds-space-3;
  display: flex;
  flex-direction: column;
}

.attract__name {
  font-size: $ds-fs-title;
  font-weight: 600;
  color: $ds-ink;
}

.attract__meta {
  margin-top: $ds-space-1;
  font-size: $ds-fs-label-sm;
  color: $ds-ink-2;
}

.attract__foot {
  margin-top: auto;
  padding-top: $ds-space-2;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.attract__guides {
  font-size: $ds-fs-label;
  font-weight: 600;
  color: $ds-primary;
}

.attract__go {
  width: 24px;
  height: 24px;
  border-radius: $ds-shape-full;
  border: 1px solid $ds-outline;
  display: flex;
  align-items: center;
  justify-content: center;
}

.attract__go-icon {
  font-size: 14px;
  line-height: 1;
  color: $ds-ink-2;
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
  padding: 64px 0;
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
