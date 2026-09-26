/**
 * 横向页签 / chip 行的通用行为
 *
 * 页面里的分类行有两个诉求（原型 01 屏与 07 屏都提过）：
 *   1. 当前激活项自动滚到可视区**中间** —— `scroll-into-view` 只保证「可见」，
 *      激活项会停在右边缘被裁掉（截图里「已完成」「川西」就是这样）
 *   2. 内容区**左右滑动切换**分类 —— 横滑位移足够大、且明显大于纵向位移时才切换，
 *      不抢列表的纵向滚动
 *
 * 用 createTabRow() 一次性接上；纯计算部分单独导出，scripts/smoke-flow.mjs 直接断言（不依赖 DOM）。
 */

/** 让第 index 项居中所需的 scrollLeft（纯函数） */
export function centerScrollLeft({ scrollLeft = 0, containerWidth = 0, contentWidth = 0, itemLeft = 0, itemWidth = 0 }) {
  if (!containerWidth) return 0;
  const centered = scrollLeft + itemLeft - (containerWidth - itemWidth) / 2;
  const max = Math.max(contentWidth - containerWidth, 0);
  return Math.round(Math.min(Math.max(centered, 0), max));
}

/** 横滑方向：1 = 左滑（下一项），-1 = 右滑（上一项），0 = 不构成切换（纯函数） */
export function swipeStep({ dx = 0, dy = 0, minDistance = 60, ratio = 1.5 }) {
  if (Math.abs(dx) < minDistance) return 0;
  if (Math.abs(dx) < Math.abs(dy) * ratio) return 0;
  return dx < 0 ? 1 : -1;
}

/**
 * 测量并算出「第 index 项居中」的 scrollLeft
 *
 * 位置用 boundingClientRect 拿（容器与子项都在同一坐标系，相减即子项在可视区内的偏移），
 * 内容总宽用内容行（row）的宽度，避免依赖 scrollOffset 在各端的实现差异。
 *
 * @param {Object} options
 * @param {String} options.container  滚动容器选择器，如 '.tabline'
 * @param {String} options.row        内容行选择器（拿内容总宽），如 '.tabline__inner'
 * @param {String} options.item       子项选择器，如 '.tabline__item'
 * @param {Number} options.index      目标下标
 * @param {Number} options.scrollLeft 当前 scrollLeft
 * @param {Object} [options.vm]       自定义组件实例；页面里不用传，自定义组件里传 this
 * @returns {Promise<Number|null>} null = 节点还没渲染出来（这次忽略）
 */
export function centerItemScrollLeft({ container, row, item, index, scrollLeft = 0, vm = null }) {
  return new Promise((resolve) => {
    if (!container || !row || !item || index < 0) return resolve(null);

    const query = uni.createSelectorQuery();
    if (vm) query.in(vm);
    query.select(container).boundingClientRect();
    query.select(row).boundingClientRect();
    query.selectAll(item).boundingClientRect();

    query.exec((res = []) => {
      const box = res[0];
      const inner = res[1];
      const list = res[2] || [];
      const target = list[index];
      if (!box || !inner || !target) return resolve(null);

      resolve(
        centerScrollLeft({
          scrollLeft,
          containerWidth: box.width,
          contentWidth: inner.width,
          itemLeft: target.left - box.left,
          itemWidth: target.width
        })
      );
    });
  });
}

/**
 * 生成一套「横向页签行」页面行为（data 与 methods 各一片，页面 spread 进去即可）
 *
 * 页面侧只需几行：
 *   const tabRow = createTabRow({
 *     container: '.tabline', row: '.tabline__inner', item: '.tabline__item',
 *     index: (vm) => vm.activeTabIndex,        // 当前激活下标
 *     onStep: (vm, step) => vm.stepRegion(step) // 下一项 / 上一项由页面决定
 *   });
 *   data()    { return { ...tabRow.data(), ... }; }
 *   methods:  { ...tabRow.methods, ... }
 *
 * 模板：
 *   页签行：:scroll-left="tabScrollLeft" scroll-with-animation @scroll="onTabScroll"
 *   内容区：@touchstart="onTabTouchStart" @touchend="onTabTouchEnd"
 *
 * 等宽分段（不溢出的 tab）只传 index / onStep 即可 —— 没有 container 就不做居中。
 */
export function createTabRow({ container, row, item, index, onStep, minDistance, ratio } = {}) {
  return {
    data() {
      return {
        /* 绑给 scroll-view 的 :scroll-left */
        tabScrollLeft: 0,
        /* 手势起点：放进 data 保证各平台都能正常读写（不参与渲染） */
        tabTouchStart: null
      };
    },

    methods: {
      onTabScroll(e) {
        this.tabScrollLeft = (e && e.detail && e.detail.scrollLeft) || 0;
      },

      onTabTouchStart(e) {
        const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
        this.tabTouchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
      },

      onTabTouchEnd(e) {
        const start = this.tabTouchStart;
        this.tabTouchStart = null;
        const touch = e.changedTouches && e.changedTouches[0];
        if (!start || !touch) return;

        const step = swipeStep({ dx: touch.clientX - start.x, dy: touch.clientY - start.y, minDistance, ratio });
        if (step && typeof onStep === 'function') onStep(this, step);
      },

      /** 把当前激活项滚到中间：点选页签、横滑切换后都调它 */
      async centerActiveTab() {
        if (!container || typeof index !== 'function') return;
        const target = await centerItemScrollLeft({
          container,
          row,
          item,
          index: index(this),
          scrollLeft: this.tabScrollLeft
        });
        if (target !== null) this.tabScrollLeft = target;
      }
    }
  };
}
