/* ==========================================================================
   图标库（共享）
   24×24 网格，stroke=currentColor，粗细由 --icon-sw 控制，颜色随主题。
   index.html 与 design-system.html 共用这一份，改图标只改这里。
   ========================================================================== */
(function () {
  var SVG =
  '<svg class="sprite" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><defs>' +
  /* 系统 */
  '<symbol id="i-wifi" viewBox="0 0 24 24"><path d="M3.4 9.2a13 13 0 0 1 17.2 0"/><path d="M7 12.8a8.4 8.4 0 0 1 10 0"/><circle cx="12" cy="16.6" r="1.3"/></symbol>' +
  '<symbol id="i-back" viewBox="0 0 24 24"><path d="M14.6 5.2 8 12l6.6 6.8"/></symbol>' +
  '<symbol id="i-chev" viewBox="0 0 24 24"><path d="M9.4 5.2 16 12l-6.6 6.8"/></symbol>' +
  '<symbol id="i-chev-down" viewBox="0 0 24 24"><path d="M5.2 9.4 12 16l6.8-6.6"/></symbol>' +
  '<symbol id="i-arrow-ur" viewBox="0 0 24 24"><path d="M7.6 16.4 16.4 7.6"/><path d="M9.6 7.6h6.8v6.8"/></symbol>' +
  '<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.2"/><path d="M15.6 15.6 20.4 20.4"/></symbol>' +
  '<symbol id="i-sliders" viewBox="0 0 24 24"><path d="M4 7h16M7 12h10M10 17h4"/></symbol>' +
  '<symbol id="i-close" viewBox="0 0 24 24"><path d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6"/></symbol>' +
  '<symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.6 9.4 17 19 7.4"/></symbol>' +
  '<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5.6v12.8M5.6 12h12.8"/></symbol>' +
  '<symbol id="i-minus" viewBox="0 0 24 24"><path d="M5.6 12h12.8"/></symbol>' +
  '<symbol id="i-bell" viewBox="0 0 24 24"><path d="M12 4.2a5.4 5.4 0 0 0-5.4 5.4v3l-1.6 2.8h14l-1.6-2.8v-3A5.4 5.4 0 0 0 12 4.2z"/><path d="M10.2 18.6a1.9 1.9 0 0 0 3.6 0"/></symbol>' +
  '<symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.8"/><path d="M12 11v5.4M12 8.2v.6"/></symbol>' +
  '<symbol id="i-refresh" viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20.6 4.2v4.4h-4.4"/></symbol>' +
  /* 导航 */
  '<symbol id="i-home" viewBox="0 0 24 24"><path d="M3.6 11.2 12 4.4l8.4 6.8v8a1.6 1.6 0 0 1-1.6 1.6h-3.9v-5.6H9.1v5.6H5.2a1.6 1.6 0 0 1-1.6-1.6z"/></symbol>' +
  '<symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8.2" r="3.4"/><path d="M5 20c1.4-3.6 4-5.4 7-5.4S17.6 16.4 19 20"/></symbol>' +
  '<symbol id="i-list" viewBox="0 0 24 24"><path d="M4.4 7h15.2M4.4 12h15.2M4.4 17h9.6"/></symbol>' +
  '<symbol id="i-grid" viewBox="0 0 24 24"><rect x="4" y="4" width="6.6" height="6.6" rx="1.9"/><rect x="13.4" y="4" width="6.6" height="6.6" rx="1.9"/><rect x="4" y="13.4" width="6.6" height="6.6" rx="1.9"/><rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1.9"/></symbol>' +
  '<symbol id="i-compass" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.8"/><path d="M15.4 8.6 13.4 13.4 8.6 15.4 10.6 10.6z"/></symbol>' +
  '<symbol id="i-map" viewBox="0 0 24 24"><path d="M4 6.6 9.4 4.4l5.2 2.2 5.4-2.2v13l-5.4 2.2-5.2-2.2L4 19.6z"/><path d="M9.4 4.4v13M14.6 6.6v13"/></symbol>' +
  /* 内容 */
  '<symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 20.6s6.4-5.8 6.4-10.2A6.4 6.4 0 0 0 5.6 10.4c0 4.4 6.4 10.2 6.4 10.2z"/><circle cx="12" cy="10.4" r="2.2"/></symbol>' +
  '<symbol id="i-calendar" viewBox="0 0 24 24"><rect x="4" y="6.8" width="16" height="13" rx="2.6"/><path d="M8 4.2v4.4M16 4.2v4.4M4 11.2h16"/></symbol>' +
  '<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.6"/><path d="M12 7.8V12l3.4 2.1"/></symbol>' +
  '<symbol id="i-users" viewBox="0 0 24 24"><circle cx="9.2" cy="8.8" r="3.1"/><path d="M3.2 19c1-3.1 3.3-4.6 6-4.6s5 1.5 6 4.6"/><path d="M16.6 7.2a3 3 0 0 1 0 5.6"/><path d="M18 19h3c-.4-1.7-1.1-2.9-2.1-3.6"/></symbol>' +
  '<symbol id="i-chat" viewBox="0 0 24 24"><path d="M20 12.4c0 3.4-3.6 6.2-8 6.2-1 0-2-.2-2.9-.5L4.6 20l1.3-3.6A5.6 5.6 0 0 1 4 12.4C4 9 7.6 6.2 12 6.2s8 2.8 8 6.2z"/><path d="M9.2 12.2h.1M12 12.2h.1M14.8 12.2h.1"/></symbol>' +
  '<symbol id="i-star" viewBox="0 0 24 24"><path d="M12 4.4l2.3 4.9 5.3.7-3.9 3.7.9 5.3L12 16.4 7.4 19l.9-5.3L4.4 10l5.3-.7z"/></symbol>' +
  '<symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 19.6S4.4 15.2 4.4 10a4 4 0 0 1 7.6-2.1A4 4 0 0 1 19.6 10c0 5.2-7.6 9.6-7.6 9.6z"/></symbol>' +
  '<symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3.6 19 6.2v5.4c0 4.2-2.8 7.4-7 8.6-4.2-1.2-7-4.4-7-8.6V6.2z"/><path d="M9 12.2l2.2 2.2L15.4 10"/></symbol>' +
  '<symbol id="i-ticket" viewBox="0 0 24 24"><path d="M4 8.2h16v2.4a2.2 2.2 0 0 0 0 4.4v2.4H4v-2.4a2.2 2.2 0 0 0 0-4.4z"/><path d="M14.4 8.2v10" stroke-dasharray="2 2.4"/></symbol>' +
  '<symbol id="i-wallet" viewBox="0 0 24 24"><rect x="4" y="6.6" width="16" height="12" rx="2.6"/><path d="M4 10.6h16"/><path d="M15.4 14.4h2.4"/></symbol>' +
  '<symbol id="i-card" viewBox="0 0 24 24"><rect x="3.4" y="6" width="17.2" height="12" rx="2.6"/><path d="M3.4 10.2h17.2M6.8 14.2h3.6"/></symbol>' +
  '<symbol id="i-tag" viewBox="0 0 24 24"><path d="M12.6 3.8H20v7.4l-8.4 8.4L4.2 12z"/><circle cx="16.6" cy="7.4" r="1.3"/></symbol>' +
  '<symbol id="i-spark" viewBox="0 0 24 24"><path d="M10.6 3.6c.6 3.9 2.3 5.6 6.2 6.2-3.9.6-5.6 2.3-6.2 6.2-.6-3.9-2.3-5.6-6.2-6.2 3.9-.6 5.6-2.3 6.2-6.2z"/><path d="M17.8 14.6c.3 1.8 1.1 2.6 2.9 2.9-1.8.3-2.6 1.1-2.9 2.9-.3-1.8-1.1-2.6-2.9-2.9 1.8-.3 2.6-1.1 2.9-2.9z"/></symbol>' +
  '<symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13.4 3.4 6.8 13.4h4.4l-.8 7.2 6.8-10h-4.4z"/></symbol>' +
  '<symbol id="i-fire" viewBox="0 0 24 24"><path d="M12 3.6c.4 3 2.6 3.8 3.8 5.6a5.4 5.4 0 1 1-9.4 3.4c0-1.6.6-2.8 1.6-4 .2 1.4.8 2.2 1.8 2.4-.4-2.6.6-5.4 2.2-7.4z"/></symbol>' +
  '<symbol id="i-crown" viewBox="0 0 24 24"><path d="M4.4 17.2 3.2 7.6l4.8 3.4L12 5.6l4 5.4 4.8-3.4-1.2 9.6z"/><path d="M4.4 17.2h15.2"/></symbol>' +
  '<symbol id="i-gift" viewBox="0 0 24 24"><rect x="3.8" y="8.6" width="16.4" height="3.4" rx="1.2"/><rect x="5.4" y="12" width="13.2" height="7.6" rx="1.6"/><path d="M12 8.6v11M12 8.6C10.4 8.6 7.8 8 7.8 6.2a2.1 2.1 0 0 1 4.2-.6M12 8.6c1.6 0 4.2-.6 4.2-2.4a2.1 2.1 0 0 0-4.2-.6"/></symbol>' +
  '<symbol id="i-send" viewBox="0 0 24 24"><path d="M20.4 4.2 3.8 11l6.6 2.4 2.4 6.6z"/><path d="M10.4 13.4 20.4 4.2"/></symbol>' +
  '<symbol id="i-camera" viewBox="0 0 24 24"><path d="M4 8.6h3.2l1.7-2.4h6.2l1.7 2.4H20v10.4H4z"/><circle cx="12" cy="13.6" r="3.2"/></symbol>' +
  '<symbol id="i-image" viewBox="0 0 24 24"><rect x="3.8" y="5.4" width="16.4" height="13.2" rx="2.6"/><circle cx="8.8" cy="9.8" r="1.6"/><path d="M4.4 16.6 9.6 12l3.4 3 3-2.6 3.6 3.2"/></symbol>' +
  '<symbol id="i-edit" viewBox="0 0 24 24"><path d="M4.6 19.4h3.2L18.4 8.8a2.26 2.26 0 0 0-3.2-3.2L4.6 16.2z"/><path d="M14.4 6.4 17.6 9.6"/></symbol>' +
  '<symbol id="i-share" viewBox="0 0 24 24"><circle cx="17.4" cy="6.2" r="2.6"/><circle cx="6.6" cy="12" r="2.6"/><circle cx="17.4" cy="17.8" r="2.6"/><path d="M15.2 7.6 8.8 10.6M8.8 13.4l6.4 3"/></symbol>' +
  '<symbol id="i-phone" viewBox="0 0 24 24"><rect x="7.2" y="3.2" width="9.6" height="17.6" rx="2.6"/><path d="M10.6 6.4h2.8M11 17.6h2"/></symbol>' +
  '<symbol id="i-smile" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.8"/><path d="M9.2 14.2a3.6 3.6 0 0 0 5.6 0"/><path d="M9.6 9.8h.1M14.4 9.8h.1"/></symbol>' +
  /* 景点主题 */
  '<symbol id="i-temple" viewBox="0 0 24 24"><path d="M3.6 10.6 12 5.2l8.4 5.4"/><path d="M5.8 10.6v8.8h12.4v-8.8"/><path d="M9.8 19.4v-5.2h4.4v5.2"/><path d="M4 19.4h16"/></symbol>' +
  '<symbol id="i-panda" viewBox="0 0 24 24"><circle cx="12" cy="13.4" r="6.4"/><circle cx="7.4" cy="7.6" r="2.7"/><circle cx="16.6" cy="7.6" r="2.7"/><circle cx="9.6" cy="12.4" r="1.25"/><circle cx="14.4" cy="12.4" r="1.25"/><path d="M10.4 15.6h3.2"/></symbol>' +
  '<symbol id="i-pagoda" viewBox="0 0 24 24"><path d="M12 3.4 6.6 7.2h10.8z"/><path d="M7.6 7.2v3.2h8.8V7.2"/><path d="M8.8 10.4v3.2h6.4v-3.2"/><path d="M10.2 13.6v5.8h3.6v-5.8"/><path d="M4.6 19.4h14.8"/></symbol>' +
  '<symbol id="i-lantern" viewBox="0 0 24 24"><path d="M12 3.2v1.6"/><path d="M7.6 4.8h8.8l1.2 3.4a6 6 0 0 1-11.2 0z"/><path d="M12 14.6v3.4"/><path d="M9.6 18h4.8M9.9 20.4h4.2"/></symbol>' +
  '<symbol id="i-tea" viewBox="0 0 24 24"><path d="M4.8 9.4h11.2v4.6a4.6 4.6 0 0 1-4.6 4.6H9.4a4.6 4.6 0 0 1-4.6-4.6z"/><path d="M16 11.2h1.6a2.4 2.4 0 0 1 0 4.8H16"/><path d="M3.8 20.6h13.2"/></symbol>' +
  '<symbol id="i-leaf" viewBox="0 0 24 24"><path d="M19.2 4.8c0 8.2-4.6 12.6-11.6 12.6-1 0-2-2.4-2-4.8 0-4.8 4.2-7.8 13.6-7.8z"/><path d="M6.8 18.6 14.8 10.4"/></symbol>' +
  '<symbol id="i-water" viewBox="0 0 24 24"><path d="M12 3.8s5.4 5.6 5.4 9.2a5.4 5.4 0 0 1-10.8 0C6.6 9.4 12 3.8 12 3.8z"/><path d="M9.6 13.6a2.6 2.6 0 0 0 2.6 2.6"/></symbol>' +
  '<symbol id="i-mountain" viewBox="0 0 24 24"><path d="M3 18.4 9.4 8.2l3.2 5.4 2-2.8 5.8 7.6z"/><path d="M2.6 18.4h18.8"/></symbol>' +
  '</defs></svg>';

  document.currentScript.insertAdjacentHTML('afterend', SVG);
}());
