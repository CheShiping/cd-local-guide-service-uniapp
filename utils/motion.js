/**
 * 动效常量
 *
 * 页面切换一律瞬时：小程序（含微信）的 navigateTo / navigateBack 本身就是原生转场，
 * H5 不再做手写转场（淡入淡出会透出下层页面，观感是「先看见下面的内容」）。
 *
 * 动效只服务状态变化（shadcn 对齐）：按压、颜色过渡、指示器移动。
 * 这批时长与 uni.scss 的 $ds-dur-* / $ds-ease-* 一一对应，两边必须成对修改。
 */
export const MOTION = {
  /** 按压反馈：要跟手，不能慢 */
  press: 150,
  /** 颜色 / 背景 / 边框等状态切换 */
  fast: 150,
  /** 指示器 / 分段滑块在屏上移动 */
  slide: 200,
  /** 较大表面（卡片、面板）的过渡 */
  base: 200,
  /** 加载指示器转一圈（常量运动，用 linear） */
  spin: 900,
  easeOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
};
