/**
 * 动效工具（与 utils/hscroll.js 同构）
 *
 * 页面里所有「动效」只解决三件事：
 *   1. 内容被整批替换时不要瞬移 —— 分类切换、加载更多
 *   2. 页面被整批替换时不要瞬移 —— 进入新页面、返回上一页
 *   3. 状态切换要看得见 —— 页签指示器、分段滑块、开关、单选、按压
 *
 * 三条硬约束（由 scripts/check-motion.mjs 把关，DESIGN.md §13 是规范来源）：
 *   - 只动 transform 与 opacity（外加颜色类），不动 width/height/margin/top/left
 *   - 入场用 ease-out，UI 动效不超过 400ms
 *   - 必须有 prefers-reduced-motion 的降级（保留淡入，去掉位移）
 *
 * 做法上刻意不用 JS 驱动逐帧动画：CSS 动画跑在主线程之外，列表还在加载时也不会掉帧。
 * 页面只需要给列表项绑一个 class + 一个 animation-delay，
 * 新节点创建时动画自然播放，不需要「移除类 → 强制重排 → 再加类」这类时序技巧。
 *
 * 纯计算部分单独导出，scripts/*.mjs 可直接断言（不依赖 DOM）。
 */

/**
 * 动效常量：与 uni.scss 的 $ds-dur-* / $ds-stagger-* 一一对应
 *
 * 两边必须同时改 —— 名字按 camelCase → kebab-case 对应
 * （`pageLeave` ↔ `$ds-dur-page-leave`、`staggerStep` ↔ `$ds-stagger-step`），
 * scripts/check-motion.mjs 会逐项比对，不一致直接失败。
 */
export const MOTION = {
  /** 按压反馈：要跟手，不能慢 */
  press: 140,
  /** 颜色 / 背景 / 边框等状态切换 */
  fast: 160,
  /** 指示器 / 分段滑块在屏上移动 */
  slide: 280,
  /** 内容切换：整批内容被替换，要慢到看得清是从哪边换过来的 */
  base: 360,
  /** 页面进入（H5 用 CSS 模拟；小程序是原生转场） */
  page: 320,
  /** 页面退出：与页面进入同幅同时长（进出对称），播完再真正 navigateBack */
  pageLeave: 320,
  /** 加载指示器转一圈（常量运动，用 linear） */
  spin: 900,
  /** 列表入场逐项延迟 */
  staggerStep: 60,
  /** 延迟上限：超过就直接同批出现，避免长列表越往下越慢 */
  staggerMax: 300,
  easeOut: 'cubic-bezier(0.23, 1, 0.32, 1)',
  easeInOut: 'cubic-bezier(0.77, 0, 0.175, 1)'
};

/** 入场方向：1 = 从右侧进（切到下一项），-1 = 从左侧进（切到上一项），0 = 原地淡入上浮 */
export const ENTER_UP = 0;
export const ENTER_NEXT = 1;
export const ENTER_PREV = -1;

/** 方向 → 动画 class（keyframes 定义在 App.vue 的全局样式里） */
export function enterAnimClass(dir) {
  if (dir === ENTER_NEXT) return 'ds-enter-next';
  if (dir === ENTER_PREV) return 'ds-enter-prev';
  return 'ds-enter-up';
}

/** 第 index 项的入场延迟（ms）：逐项 +60ms，封顶 300ms */
export function staggerDelay(index, { step = MOTION.staggerStep, max = MOTION.staggerMax } = {}) {
  if (!(index > 0)) return 0;
  return Math.min(index * step, max);
}

/** 由「旧下标 → 新下标」推出切换方向：0 = 无方向（刷新 / 排序变化），仅上浮 */
export function stepDirection(fromIndex, toIndex) {
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return 0;
  return toIndex > fromIndex ? ENTER_NEXT : ENTER_PREV;
}

/**
 * 生成一套「列表入场」页面行为（data 与 methods 各一片，页面 spread 进去即可）
 *
 * 用法（页面侧 5 行）：
 *   const listEnter = createListEnter();
 *   data()   { return { ...listEnter.data(), ... }; }
 *   methods: { ...listEnter.methods, ... }
 *
 * 模板：
 *   <view
 *     v-for="(item, index) in list"
 *     :key="enterSeq + '-' + item.id"
 *     :class="['card', 'ds-pressable', enterAnim]"
 *     :style="enterStyle(index)"
 *     hover-class="is-pressed"
 *   >
 *
 * 数据层（刷新时带方向，追加时只带上浮）：
 *   this.beginEnter(dir, 0);                     // 切分类：整列表重来
 *   this.beginEnter(ENTER_UP, this.list.length)  // 加载更多：只有新增的那几项入场
 */
export function createListEnter() {
  return {
    data() {
      return {
        /* 入场动画 class：由 beginEnter() 按切换方向写入 */
        enterAnim: 'ds-enter-up',
        /* 延迟基准：刷新为 0，加载更多为「追加前的列表长度」 */
        enterBase: 0,
        /* 批次号：进 :key，切分类时整批换新节点，动画才会重播 */
        enterSeq: 0
      };
    },

    methods: {
      /**
       * 开始一次入场
       * @param {Number} dir  方向：ENTER_NEXT / ENTER_PREV / ENTER_UP
       * @param {Number} base 延迟基准下标
       */
      beginEnter(dir = ENTER_UP, base = 0) {
        this.enterAnim = enterAnimClass(dir);
        this.enterBase = base;
        /* 换方向（= 换分类）才换批次；加载更多沿用同一批，避免旧卡片重播 */
        if (dir !== ENTER_UP) this.enterSeq += 1;
      },

      /** 没有方向的整批刷新（改排序、改日期筛选）：也要换批次，否则同一批 key 不会重播入场 */
      renewEnter() {
        this.enterAnim = enterAnimClass(ENTER_UP);
        this.enterBase = 0;
        this.enterSeq += 1;
      },

      /** 绑给列表项：只给 animation-delay，动画名与时长由 class 提供（降级时才能整体替换） */
      enterStyle(index) {
        return { animationDelay: `${staggerDelay(index - this.enterBase)}ms` };
      }
    }
  };
}

/**
 * 生成一套「页面转场」页面行为
 *
 * 用法：
 *   const pageMotion = createPageMotion();
 *   data()  { return { ...pageMotion.data(), ... } }   // 只有一个 pageMotion
 *   模板：<view :class="['page', pageMotion]">
 *   返回：goBack() { this.goBackWithMotion(); }
 *
 * 为什么只有 H5 靠它：小程序（含微信）的 navigateTo / navigateBack 本身就是原生转场动画，
 * 自己再动一层会变成双重动画。所以：
 *   - 进入：根节点上一直带着 is-page-in，H5 下页面被创建时动画自然播一次；
 *   - 退出：返回前把类换成 is-page-out，播完再真正 navigateBack —— 否则上一页会硬切；
 *   - 小程序端这两个类没有样式（App.vue 里用条件编译包住了），goBack 也走同步分支，
 *     行为与改动前完全一致。
 */
export function createPageMotion() {
  return {
    data() {
      return {
        /* 根节点上的转场 class；取值 'is-page-in' | 'is-page-out' */
        pageMotion: 'is-page-in'
      };
    },

    methods: {
      /**
       * 返回上一页：H5 先播离场动画，再真正返回
       * 非 H5 平台直接返回（原生转场已经够好看，也不用白等 260ms）
       */
      goBackWithMotion() {
        // #ifdef H5
        if (this.pageMotion !== 'is-page-out') {
          this.pageMotion = 'is-page-out';
          setTimeout(() => uni.navigateBack(), MOTION.pageLeave);
          return;
        }
        // #endif
        uni.navigateBack();
      }
    }
  };
}
