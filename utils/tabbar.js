/**
 * 角色化底部栏（tabBar）配置 —— 唯一来源
 *
 * 三种角色看到不同的底部栏：
 *   游客   [首页 · 我的]
 *   地陪   [接单 · 我的]
 *   管理员 [订单管理 · 地陪审核 · 我的]
 *
 * 为什么不用原生 tabBar：
 *   pages.json 的 tabBar 是编译期静态的，项数与文案改不了、更没法按角色增删。
 *   所以 pages.json 里照旧把 5 个页面都标成 tabBar 页（switchTab 才能用），
 *   运行时由 components/ds-tabbar 调 uni.hideTabBar 隐藏原生栏，再按角色自绘。
 *   页面只消费本文件的 tabItemsByRole / homePathByRole，不要各写一套。
 *
 * 图标：static/tabbar/<icon>.png 与 <icon>-active.png，由 scripts/gen-tabbar-icons.mjs 生成，
 * 不要手工替换（颜色写死在 png 里，手改必然与设计系统脱钩）。
 */
import { ROLES } from '@/api/constants.js';

const TABS = {
  [ROLES.TOURIST]: [
    { icon: 'home', text: '首页', path: '/pages/index/index' },
    { icon: 'mine', text: '我的', path: '/pages/tabbar/mine' }
  ],
  [ROLES.GUIDE]: [
    { icon: 'orders', text: '接单', path: '/pages/guide/orders' },
    { icon: 'mine', text: '我的', path: '/pages/tabbar/mine' }
  ],
  [ROLES.ADMIN]: [
    { icon: 'orders', text: '订单管理', path: '/pages/admin/appointment' },
    { icon: 'clerk', text: '地陪审核', path: '/pages/admin/clerk' },
    { icon: 'mine', text: '我的', path: '/pages/tabbar/mine' }
  ]
};

/** 当前角色的底部栏项（未知 / 未登录角色退回游客） */
export function tabItemsByRole(role) {
  return TABS[role] || TABS[ROLES.TOURIST];
}

/** 当前角色的第一屏：角色与当前页不匹配时，用它把用户送回该角色首页 */
export function homePathByRole(role) {
  return tabItemsByRole(role)[0].path;
}

/** 该路径是否属于当前角色的底部栏（用于判断「当前页该不该出现在这个角色下」） */
export function isTabPath(role, path) {
  return tabItemsByRole(role).some((item) => item.path === path);
}

/** 底部栏图标地址（普通 / 选中） */
export function tabIconPath(icon, active = false) {
  return `/static/tabbar/${icon}${active ? '-active' : ''}.png`;
}
