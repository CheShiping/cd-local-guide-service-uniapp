<template>
  <view class="ds-tabbar">
    <view class="ds-tabbar__bar">
      <view
        v-for="item in items"
        :key="item.path"
        :class="['ds-tabbar__item', 'ds-pressable', item.path === current ? 'is-on' : '']"
        hover-class="is-pressed"
        hover-stay-time="70"
        @click="go(item)"
      >
        <image class="ds-tabbar__icon" :src="iconOf(item)" mode="aspectFit" />
        <text class="ds-tabbar__text">{{ item.text }}</text>
      </view>
    </view>
  </view>
</template>

<script>
/**
 * 角色化底部栏（自绘）
 *
 * 项数与文案随角色变化（游客 2 项 / 地陪 2 项 / 管理员 3 项），
 * 定义只写在 utils/tabbar.js；原生 tabBar 是静态的，所以这里先 hideTabBar 再自绘。
 *
 * 用法：把 <ds-tabbar /> 放在页面根节点内容的最后一项即可 ——
 * 组件自带 $ds-h-tabbar 高的占位，flex 页面（100vh 列布局）会自动把内容区让出来，
 * 各页不需要再写 padding-bottom。
 *
 * 顺带做角色兜底：若当前页不属于当前角色（管理员停在游客首页、切换身份后停留等），
 * 自动回到该角色的第一屏 —— 登录后落首页的情形也由它收敛。
 */
import { UserApi } from '@/api/index.js';
import { tabItemsByRole, homePathByRole, isTabPath, tabIconPath } from '@/utils/tabbar.js';

/** 当前页面路径（含前导 /，去掉 query），用于高亮当前项 */
function currentRoute() {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1];
  const raw = page && (page.route || (page.$page && page.$page.path));
  if (!raw) return '';
  const path = String(raw).split('?')[0];
  return path.charAt(0) === '/' ? path : `/${path}`;
}

export default {
  name: 'DsTabbar',

  data() {
    return {
      items: tabItemsByRole(''),
      role: '',
      current: ''
    };
  },

  mounted() {
    this.current = currentRoute();
    this.hideNative();
    this.refresh();
    /* 「我的」页切换演示身份后广播，底部栏据此换项；页面首次挂载时也会自己拉一次 */
    uni.$on('role:change', this.refresh);
  },

  unmounted() {
    uni.$off('role:change', this.refresh);
  },

  methods: {
    /** 原生 tabBar 项数与文案编译期固定，按角色增删做不到 —— 藏掉它，用自绘的 */
    hideNative() {
      uni.hideTabBar({ animation: false, fail: () => {} });
    },

    async refresh() {
      try {
        const user = await UserApi.getCurrentUser();
        this.role = (user && user.role) || '';
      } catch (e) {
        console.error('底部栏读取当前角色失败', e);
        this.role = '';
      }
      this.items = tabItemsByRole(this.role);
      this.guard();
    },

    /** 当前页不属于当前角色 → 回该角色第一屏（一次性，避免来回跳） */
    guard() {
      if (this._guarded || !this.role || !this.current) return;
      if (isTabPath(this.role, this.current)) return;
      this._guarded = true;
      this.jump(homePathByRole(this.role));
    },

    go(item) {
      this.jump(item.path);
    },

    jump(path) {
      if (!path || path === this.current) return;
      uni.switchTab({
        url: path,
        fail: () => uni.reLaunch({ url: path })
      });
    },

    iconOf(item) {
      return tabIconPath(item.icon, item.path === this.current);
    }
  }
};
</script>

<style lang="scss" scoped>
/* 占位：页面内容末尾插入本组件即自动让出底部栏高度（flex 页面会自动收窄内容区） */
.ds-tabbar {
  flex-shrink: 0;
  height: $ds-h-tabbar;
}

/* 玻璃底 + 向上柔影：与 .bottom-bar 同一语言（DESIGN.md §8） */
.ds-tabbar__bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  display: flex;
  align-items: stretch;
  background: $ds-surface;
  box-shadow: $ds-el-3;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.ds-tabbar__item {
  flex: 1;
  height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* 按压叠层要圆角，否则是个方块（和 .icon-btn 同理） */
  border-radius: $ds-shape-sm;
}

.ds-tabbar__icon {
  width: 22px;
  height: 22px;
}

.ds-tabbar__text {
  margin-top: 3px;
  font-size: 10.5px;
  color: $ds-ink-3;
  transition: color $ds-dur-fast $ds-ease-out;
}

.ds-tabbar__item.is-on .ds-tabbar__text {
  color: $ds-secondary;
  font-weight: 650;
}
</style>
