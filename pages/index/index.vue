<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- 分类页签 Dock：滚过页签后淡入固定（sticky 在 scroll-view 里不可靠，改用滚动阈值） -->
    <view class="tabline-dock" :class="{ 'is-show': tabDocked }" :style="{ top: statusBarHeight + 'px' }">
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
    </view>

    <!-- 整页滚动：标题 / 搜索 / 快捷入口随滚动一起消失，只保留分类及以下内容 -->
    <scroll-view
      scroll-y
      class="page-scroll"
      :show-scrollbar="false"
      :scroll-top="mainScrollTop"
      @scroll="onMainScroll"
      @scrolltolower="loadMore"
      @touchstart="onTabTouchStart"
      @touchend="onTabTouchEnd"
    >
    <!-- 页面标题：大标题 800 + 一句把下一步说清楚的副标题 -->
    <view class="screen-head">
      <text class="screen-kicker">耍搭 · 地陪预约</text>
      <text class="screen-title">今天去哪儿</text>
      <text class="screen-sub">{{ total }} 个景点 · 成都本地地陪带路，先选地方再挑人</text>
    </view>

    <!-- 搜索条：输入框样式（按压只变底色，不做缩放，与设计系统 .searchbar:active 一致） -->
    <view class="searchbar" hover-class="searchbar--active" hover-stay-time="70">
      <view class="searchbar__glass">
        <view class="searchbar__ico">
          <view class="searchbar__ico-ring"></view>
          <view class="searchbar__ico-handle"></view>
        </view>
        <input
          class="searchbar__input"
          placeholder="搜景点、地陪、路线"
          placeholder-class="searchbar__ph"
          confirm-type="search"
          @confirm="onSearchConfirm"
        />
        <view class="searchbar__btn">
          <view class="searchbar__btn-line searchbar__btn-line--1"></view>
          <view class="searchbar__btn-line searchbar__btn-line--2"></view>
          <view class="searchbar__btn-knob searchbar__btn-knob--1"></view>
          <view class="searchbar__btn-knob searchbar__btn-knob--2"></view>
        </view>
      </view>
    </view>

    <!-- 快捷入口：四个彩底圆形图标 + 白卡片矩阵（原型 01 屏） -->
    <view class="quick">
      <view class="quick__item ds-pressable" hover-class="is-pressed" hover-stay-time="70">
        <view class="quick__ico quick__ico--panda">
          <view class="qpanda-ear qpanda-ear--l"></view>
          <view class="qpanda-ear qpanda-ear--r"></view>
          <view class="qpanda-face"></view>
          <view class="qpanda-eye qpanda-eye--l"></view>
          <view class="qpanda-eye qpanda-eye--r"></view>
        </view>
        <text class="quick__label">熊猫基地</text>
      </view>
      <view class="quick__item ds-pressable" hover-class="is-pressed" hover-stay-time="70">
        <view class="quick__ico quick__ico--map">
          <view class="qmap-body"></view>
          <view class="qmap-fold qmap-fold--1"></view>
          <view class="qmap-fold qmap-fold--2"></view>
        </view>
        <text class="quick__label">一日游</text>
      </view>
      <view class="quick__item ds-pressable" hover-class="is-pressed" hover-stay-time="70">
        <view class="quick__ico quick__ico--lantern">
          <view class="qlan-top"></view>
          <view class="qlan-body"></view>
          <view class="qlan-bottom"></view>
        </view>
        <text class="quick__label">夜游锦里</text>
      </view>
      <view class="quick__item ds-pressable" hover-class="is-pressed" hover-stay-time="70">
        <view class="quick__ico quick__ico--tea">
          <view class="qtea-cup"></view>
          <view class="qtea-handle"></view>
          <view class="qtea-saucer"></view>
        </view>
        <text class="quick__label">盖碗茶</text>
      </view>
    </view>

    <!-- 区域页签吸顶：滚动后只保留分类及以下内容（胶囊，选中 = 黑胶囊） -->
    <view class="tabline-sticky">
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
    </view>

      <!-- 区块标题：附近热门 + 景点数量 -->
      <view class="section-hd">
        <view class="section-hd__t">
          <view class="section-hd__flame"></view>
          <text class="section-hd__text">附近热门</text>
        </view>
        <text class="section-hd__n">{{ total }} 个景点</text>
      </view>

      <view class="list">
        <view
          v-for="item in attractionList"
          :key="item.id"
          class="card attract ds-pressable"
          hover-class="is-pressed"
          hover-stay-time="70"
          @click="goGuideList(item)"
        >
          <view class="thumb">
            <image :src="item.coverUrl" class="thumb__img" mode="aspectFill" />
            <!-- 封面角标：定位 + 场景标签（取景点数据里的 scene，如「亲子热门」） -->
            <view class="thumb__cc">
              <view class="thumb__cc-pin">
                <view class="thumb__cc-pin-body"></view>
                <view class="thumb__cc-pin-dot"></view>
              </view>
              <text class="thumb__cc-text">{{ item.scene }}</text>
            </view>
          </view>
          <view class="attract__body">
            <text class="attract__name">{{ item.name }}</text>
            <text class="attract__meta">{{ item.district }}</text>
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

    <!-- 角色化底部栏：游客是「首页 · 我的」；地陪 / 管理员不会停在本页（组件会收敛到各自第一屏） -->
    <ds-tabbar />
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

/* 区域页签：激活项自动滚到可视区中间 + 内容左右滑动切换（见 utils/hscroll.js） */
const regionTabRow = createTabRow({
  container: '.tabline',
  row: '.tabline__inner',
  item: '.tabline__item',
  index: (vm) => vm.activeTabIndex,
  onStep: (vm, step) => vm.stepRegion(step)
});

export default {
  data() {
    return {
      ...regionTabRow.data(),
      regionList: [],
      regionTypeId: '',
      attractionList: [],
      pageNo: 1,
      pageSize: 10,
      total: 0,
      loading: false,
      hasMore: true,
      /* 分类页签吸顶 Dock：滚过页签顶部后淡入显示（sticky 在 scroll-view 里不可靠） */
      tabDocked: false,
      tabDockTop: 280,
      /* 滚动位置镜像：切分类时用它把滚动复位到顶部 */
      mainScrollTop: 0,
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
    this.$nextTick(() => this.measureTabDock());
  },

  methods: {
    ...regionTabRow.methods,

    async loadRegions() {
      try {
        this.regionList = (await RegionApi.getRegionList()) || [];
      } catch (e) {
        console.error('加载区域失败', e);
      }
    },

    async loadAttractions(refresh = false) {
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

    changeRegion(regionTypeId) {
      if (this.regionTypeId === regionTypeId) return;
      this.regionTypeId = regionTypeId;
      this.centerActiveTab();
      /* 切分类回到顶部：避免内容清空时 scrollTop 被钳制，页签 Dock 出现「下沉」闪烁 */
      this.mainScrollTop = 0;
      this.tabDocked = false;
      this.loadAttractions(true);
    },

    /* 横滑：上/下一个区域；到两端就停住 */
    stepRegion(step) {
      const tabs = ['', ...this.regionList.map((region) => region.id)];
      const next = this.activeTabIndex + step;
      if (next < 0 || next >= tabs.length) return;
      this.changeRegion(tabs[next]);
    },

    /* 滚过页签顶部后，把页签 Dock 淡入固定在状态栏下方 */
    onMainScroll(e) {
      const top = (e && e.detail && e.detail.scrollTop) || 0;
      this.mainScrollTop = top;
      this.tabDocked = top >= this.tabDockTop;
    },

    /* 页签在滚动内容里的偏移：超过它 Dock 就该出现 */
    measureTabDock() {
      uni.createSelectorQuery()
        .select('.tabline-sticky')
        .boundingClientRect((rect) => {
          if (rect) this.tabDockTop = Math.max(rect.top - this.statusBarHeight, 0);
        })
        .exec();
    },

    loadMore() {
      this.loadAttractions();
    },

    goGuideList(item) {
      const name = encodeURIComponent(item.name);
      uni.navigateTo({ url: `/pages/guide/list?attractionId=${item.id}&name=${name}` });
    },

    onSearchConfirm() {
      uni.showToast({ title: '搜索即将上线，先按区域逛逛', icon: 'none' });
    }
  }
};
</script>

<style lang="scss" scoped>
.page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $ds-surface;
  /* 首页光斑：右上 → 左下，三色最全（气泡漫游 · bg-tr 档） */
  background-image: $ds-bg-tr;
}

.status-bar {
  flex-shrink: 0;
}

.page-scroll {
  flex: 1;
  height: 0; /* 让 flex 子项可滚动 */
}

/* ---------- 页面标题 ---------- */
.screen-head {
  flex-shrink: 0;
  padding: $ds-space-3 $ds-pad-screen $ds-space-4;
}

.screen-kicker {
  display: block;
  font-size: $ds-fs-label-sm;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: $ds-secondary;
}

.screen-title {
  display: block;
  margin-top: $ds-space-1;
  font-size: $ds-fs-display;
  line-height: 1.28;
  font-weight: 800;
  color: $ds-ink;
}

.screen-sub {
  display: block;
  margin-top: $ds-space-2;
  font-size: $ds-fs-label-sm;
  color: $ds-ink-2;
}

/* ---------- 搜索条（玻璃胶囊 + 紫圆 GO） ---------- */
.searchbar {
  flex-shrink: 0;
  margin: 0 $ds-pad-screen $ds-space-3;
}

.searchbar__glass {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 46px;
  padding: 0 6px 0 15px;
  border-radius: $ds-shape-full;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 14px 30px -26px rgba(80, 70, 140, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.8) inset;
  /* 与设计系统一致：按压只做 150ms 底色加深，不缩放、不位移 */
  transition: background-color $ds-dur-fast $ds-ease-out;
}

.searchbar--active .searchbar__glass {
  background: rgba(255, 255, 255, 0.92);
}

.searchbar__ico {
  position: relative;
  width: 19px;
  height: 19px;
}

.searchbar__ico-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 13px;
  height: 13px;
  border: 1.7px solid $ds-secondary;
  border-radius: 50%;
}

.searchbar__ico-handle {
  position: absolute;
  right: 1px;
  bottom: 2px;
  width: 7px;
  height: 1.7px;
  border-radius: 1px;
  background: $ds-secondary;
  transform: rotate(45deg);
}

.searchbar__input {
  flex: 1;
  min-width: 0;
  height: 46px;
  font-size: 13.5px;
  color: $ds-ink;
  background: transparent;
}

.searchbar__ph {
  color: $ds-ink-3;
}

/* 右侧紫圆：筛选（sliders）图标，纯 CSS 绘制 */
.searchbar__btn {
  position: relative;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: $ds-primary;
}

.searchbar__btn-line {
  position: absolute;
  left: 9px;
  right: 9px;
  height: 1.6px;
  border-radius: 1px;
  background: #ffffff;
}

.searchbar__btn-line--1 { top: 12px; }
.searchbar__btn-line--2 { top: 20px; }

.searchbar__btn-knob {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
}

.searchbar__btn-knob--1 { top: 10px; left: 12px; }
.searchbar__btn-knob--2 { top: 18px; right: 12px; }

/* ---------- 快捷入口：一整块白卡片矩阵包住四个彩底圆形图标 ---------- */
.quick {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin: 0 $ds-pad-screen $ds-space-4;
  padding: 14px 8px 12px;
  border-radius: $ds-shape-lg;
  background: rgba(255, 255, 255, 0.6);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.7) inset;
}

.quick__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.quick__ico {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
}

.quick__label {
  font-size: 11px;
  font-weight: 600;
  color: $ds-ink-2;
}

/* 熊猫基地：雾紫 */
.quick__ico--panda { background: rgba(143, 127, 224, 0.15); }

.qpanda-face {
  position: absolute;
  left: 12px;
  top: 14px;
  width: 20px;
  height: 19px;
  border: 1.7px solid #6f61bd;
  border-radius: 50% 50% 46% 46%;
}

.qpanda-ear {
  position: absolute;
  top: 10px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6f61bd;
}

.qpanda-ear--l { left: 11px; }
.qpanda-ear--r { right: 11px; }

.qpanda-eye {
  position: absolute;
  top: 20px;
  width: 5px;
  height: 6.5px;
  border-radius: 50%;
  background: #6f61bd;
}

.qpanda-eye--l { left: 17px; transform: rotate(18deg); }
.qpanda-eye--r { right: 17px; transform: rotate(-18deg); }

/* 一日游：藕粉（折叠地图） */
.quick__ico--map { background: rgba(229, 143, 166, 0.16); }

.qmap-body {
  position: absolute;
  left: 13px;
  top: 15px;
  width: 18px;
  height: 14px;
  border: 1.7px solid #c4718a;
  border-radius: 3px;
}

.qmap-fold {
  position: absolute;
  top: 15px;
  width: 1.7px;
  height: 14px;
  background: #c4718a;
}

.qmap-fold--1 { left: 19px; }
.qmap-fold--2 { left: 25px; }

/* 夜游锦里：薄荷（灯笼） */
.quick__ico--lantern { background: rgba(127, 196, 174, 0.18); }

.qlan-top {
  position: absolute;
  left: 19px;
  top: 11px;
  width: 6px;
  height: 2px;
  border-radius: 1px;
  background: #4f9a83;
}

.qlan-body {
  position: absolute;
  left: 15px;
  top: 14px;
  width: 14px;
  height: 15px;
  border: 1.7px solid #4f9a83;
  border-radius: 50% / 42%;
}

.qlan-bottom {
  position: absolute;
  left: 17.5px;
  top: 30px;
  width: 9px;
  height: 2px;
  border-radius: 1px;
  background: #4f9a83;
}

/* 盖碗茶：浅紫（盖碗） */
.quick__ico--tea { background: rgba(199, 183, 236, 0.2); }

.qtea-cup {
  position: absolute;
  left: 13px;
  top: 15px;
  width: 13px;
  height: 10px;
  border: 1.7px solid #8574cf;
  border-radius: 2px 2px 8px 8px;
}

.qtea-handle {
  position: absolute;
  left: 26px;
  top: 16px;
  width: 6px;
  height: 7px;
  border: 1.7px solid #8574cf;
  border-left: none;
  border-radius: 0 5px 5px 0;
}

.qtea-saucer {
  position: absolute;
  left: 12px;
  top: 28px;
  width: 18px;
  height: 1.7px;
  border-radius: 1px;
  background: #8574cf;
}

/* ---------- 区块标题：附近热门 + 数量 ---------- */
.section-hd {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 2px $ds-pad-screen 0;
  margin-bottom: $ds-space-3;
}

.section-hd__t {
  display: flex;
  align-items: center;
  gap: 7px;
}

.section-hd__text {
  font-size: 15.5px;
  font-weight: 750;
  color: $ds-ink;
}

/* 火苗：水滴形，尖角朝上 */
.section-hd__flame {
  width: 9px;
  height: 9px;
  background: $ds-secondary;
  border-radius: 0 50% 50% 50%;
  transform: rotate(-45deg);
}

.section-hd__n {
  font-size: 12px;
  color: $ds-ink-3;
}

/* ---------- 区域页签：滚动后由 Dock 固定（sticky 在 scroll-view 里不可靠） ---------- */
.tabline-sticky {
  padding: $ds-space-2 0 $ds-space-3;
}

/* 页签 Dock：滚过页签顶部后淡入固定在状态栏下方（150ms 淡入 + 4px 下滑，shadcn 风格） */
.tabline-dock {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 20;
  padding: $ds-space-2 0 $ds-space-3;
  background: rgba(253, 252, 250, 0.96);
  box-shadow: 0 10px 30px -26px rgba(80, 70, 140, 0.7);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-4px);
  transition: opacity $ds-dur-fast $ds-ease-out, transform $ds-dur-fast $ds-ease-out;

  &.is-show {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }
}

/* ---------- 区域页签：胶囊，选中 = 黑胶囊 ---------- */
.tabline {
  white-space: nowrap;
}

.tabline__inner {
  display: inline-flex;
  align-items: center;
  gap: $ds-space-2;
  padding: 0 $ds-pad-screen;
}

.tabline__item {
  position: relative;
  /* 关键：横向滚动容器里的页签是 flex 子项，默认 flex-shrink:1 会被压窄导致文字竖排换行 */
  flex: none;
  white-space: nowrap;
  padding: 9px 16px;
  border-radius: $ds-shape-full;
  background: rgba(255, 255, 255, 0.6);
  transition: background-color $ds-dur-fast $ds-ease-out, transform $ds-dur-fast $ds-ease-out;

  &.is-on {
    background: $ds-ink-btn;
    box-shadow: $ds-btn-shadow;

    .tabline__text {
      color: #ffffff;
      font-weight: 700;
    }
  }
}

.tabline__bar {
  display: none;   /* 新规范：页签选中态用黑胶囊，不再用下划线 */
}

.tabline__text {
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: $ds-ink-3;
  transition: color $ds-dur-fast $ds-ease-out;
}

/* ---------- 列表 ---------- */
.list {
  display: flex;
  flex-direction: column;
  gap: $ds-space-3;
  padding: 0 $ds-pad-screen $ds-space-5;
}

.card {
  background: $ds-surface-container;
  border: $ds-card-border;
  border-radius: $ds-shape-lg;
  box-shadow: $ds-el-1;
}

.attract {
  display: flex;
  padding: $ds-space-4;
}

.thumb {
  position: relative;
  flex-shrink: 0;
  width: 92px;
  height: 92px;
  border-radius: $ds-shape-md;
  overflow: hidden;
  /* 字段为空或加载失败时露出这个底色兜底（不裂图、不拉伸） */
  background: $ds-primary-container;
}

.thumb__img {
  width: 100%;
  height: 100%;
  display: block;
}

/* 封面角标：白色小胶囊 + 定位图标 + 场景标签 */
.thumb__cc {
  position: absolute;
  left: 8px;
  bottom: 8px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px 3px 6px;
  border-radius: $ds-shape-full;
  background: rgba(255, 255, 255, 0.86);
}

.thumb__cc-pin {
  position: relative;
  width: 10px;
  height: 12px;
}

/* 定位图标：水滴形尖角垂直朝下 + 白色内点 */
.thumb__cc-pin-body {
  position: absolute;
  left: 1.5px;
  top: 0;
  width: 7.5px;
  height: 7.5px;
  background: $ds-secondary;
  border-radius: 0 50% 50% 50%;
  transform: rotate(-135deg);
}

.thumb__cc-pin-dot {
  position: absolute;
  left: 3.7px;
  top: 2.4px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #ffffff;
}

.thumb__cc-text {
  font-size: 10.5px;
  font-weight: 700;
  color: $ds-ink-2;
}

.attract__body {
  flex: 1;
  min-width: 0;
  margin-left: $ds-space-4;
  display: flex;
  flex-direction: column;
}

.attract__name {
  font-size: $ds-fs-title;
  font-weight: 750;
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
  font-size: 12.5px;
  font-weight: 650;
  color: $ds-secondary;
}

.attract__go {
  width: 30px;
  height: 30px;
  border-radius: $ds-shape-full;
  background: $ds-primary-container;
  display: flex;
  align-items: center;
  justify-content: center;
}

.attract__go-icon {
  font-size: 16px;
  line-height: 1;
  color: $ds-secondary;
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
