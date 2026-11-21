/* 中医内科学 · 启动与路由派发 */
(function () {
  'use strict';
  var Z = window.ZNK, UI = window.ZNK_UI;
  if (!Z || !UI) return;
  var VER = window.ZNK_VERSION || { web: '1.0.0' };

  // 首次打开 / 版本变化
  try {
    if (!Z.store.meta.firstOpen) Z.store.meta.firstOpen = Date.now();
    if (Z.store.meta.lastVersion && Z.store.meta.lastVersion !== VER.web) {
      setTimeout(function () { UI.toast('已更新到 v' + VER.web); }, 600);
    }
    Z.store.meta.lastVersion = VER.web;
    Z.save();
  } catch (e) { }

  UI.tabbar('home');

  function onHash() {
    var h = location.hash || '#/home';
    if (window.ZNK_PRACTICE && window.ZNK_PRACTICE.beforeRoute &&
      window.ZNK_PRACTICE.beforeRoute(h) === false) return;
    document.onkeydown = null;
    if (window.ZNK_CARDS) window.ZNK_CARDS.removeManageBar();
    UI.render();
  }

  window.addEventListener('hashchange', onHash);
  if (!location.hash) {
    try { history.replaceState(null, '', '#/home'); } catch (e) { location.hash = '#/home'; }
  }
  UI.render();
})();
