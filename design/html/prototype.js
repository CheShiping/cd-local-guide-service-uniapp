/* 成都景点地陪小程序 · HTML 原型交互
   只有两件事：切选中态、加减人数。没有框架、没有依赖、没有请求。
   定稿主题「宣纸 · 疏」写在 :root，不再运行时切换。 */
(function () {
  'use strict';

  /* 单选用组：同一组内互斥高亮 */
  function bindRadioGroup(selector, activeClass) {
    var items = Array.prototype.slice.call(document.querySelectorAll(selector));
    items.forEach(function (item) {
      item.addEventListener('click', function () {
        var group = item.parentNode;
        Array.prototype.slice.call(group.querySelectorAll(selector)).forEach(function (sibling) {
          sibling.classList.remove(activeClass);
        });
        item.classList.add(activeClass);
      });
    });
  }

  bindRadioGroup('.tabline__item', 'is-on');
  bindRadioGroup('.chip', 'is-on');
  bindRadioGroup('.option', 'is-on');
  bindRadioGroup('.date', 'is-on');
  bindRadioGroup('.segmented__item', 'is-on');
  bindRadioGroup('.tabbar .tab', 'is-on');

  /* 在线开关（接单页） */
  document.querySelectorAll('.switch').forEach(function (sw) {
    sw.addEventListener('click', function () {
      sw.classList.toggle('is-off');
    });
  });

  /* 人数加减：只改数字，保持原型轻量 */
  document.querySelectorAll('.stepper').forEach(function (stepper) {
    var num = stepper.querySelector('.stepper__num');
    var buttons = stepper.querySelectorAll('.stepper__btn');
    var value = parseInt(num.textContent, 10) || 1;

    function render() {
      num.textContent = String(value);
    }

    buttons[0].addEventListener('click', function () {
      value = Math.max(1, value - 1);
      render();
    });

    buttons[1].addEventListener('click', function () {
      value = Math.min(9, value + 1);
      render();
    });
  });
}());
