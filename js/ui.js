/* 中医内科学 · 路由 / 头部 / 底栏 / 弹窗 / 通用渲染 */
(function () {
  'use strict';
  var Z = window.ZNK;
  var esc = Z.esc;

  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/>',
    cards: '<rect x="3" y="5" width="13" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v12"/>',
    practice: '<path d="M4 20h16"/><path d="M6 20V9l6-5 6 5v11"/><path d="M9.5 13h5"/>',
    star: '<path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.6 9.7l5.8-.8z"/>',
    me: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    back: '<path d="M15 5 8 12l7 7"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    note: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 10h8M8 14h5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    hide: '<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.4"/>',
    eyeoff: '<path d="M4 4l16 16"/><path d="M9.9 5.6A9.7 9.7 0 0 1 12 5.3c5.5 0 9 6 9 6a17 17 0 0 1-2.6 3.4"/><path d="M6.2 7.4A17 17 0 0 0 3 12s3.5 6 9 6c1.3 0 2.5-.3 3.6-.8"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v6h-6"/>',
    tip: '<path d="M12 21s-7-4.4-7-9a4.2 4.2 0 0 1 7-3.1A4.2 4.2 0 0 1 19 12c0 4.6-7 9-7 9z"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4.2" cy="6" r="1"/><circle cx="4.2" cy="12" r="1"/><circle cx="4.2" cy="18" r="1"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    left: '<path d="M15 5 8 12l7 7"/>',
    right: '<path d="m9 5 7 7-7 7"/>'
  };
  function icon(name, cls) {
    var p = ICONS[name] || '';
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>';
  }

  var TABS = [
    { id: 'home', hash: '#/home', name: '首页', icon: 'home' },
    { id: 'catalog', hash: '#/catalog', name: '病证', icon: 'cards' },
    { id: 'practice', hash: '#/practice', name: '练习', icon: 'practice' },
    { id: 'fav', hash: '#/fav', name: '收藏', icon: 'star' },
    { id: 'me', hash: '#/me', name: '我的', icon: 'me' }
  ];

  var VIEWS = {};
  var state = {
    route: { name: 'home', p: [], q: {} },
    headerActions: [],
    tab: 'home'
  };

  /* ---------------- 头部 ---------------- */
  function header(opts) {
    opts = opts || {};
    var h = [];
    if (opts.back) {
      h.push('<button class="hd-btn" id="hd-back" aria-label="返回">' + icon('back') + '</button>');
    }
    h.push('<div class="hd-title">' + (opts.title || '中医内科学') +
      (opts.sub ? '<small>' + esc(opts.sub) + '</small>' : '') + '</div>');
    (opts.actions || []).forEach(function (a, i) {
      h.push('<button class="hd-btn" data-hact="' + i + '" aria-label="' + esc(a.label || '') + '">' +
        (a.icon ? icon(a.icon) : '') + (a.text ? '<span>' + esc(a.text) + '</span>' : '') + '</button>');
    });
    var el = document.getElementById('hd');
    el.innerHTML = h.join('');
    var b = document.getElementById('hd-back');
    if (b) b.onclick = function () { opts.backTo ? replace(opts.backTo) : back(); };
    (opts.actions || []).forEach(function (a, i) {
      var btn = el.querySelector('[data-hact="' + i + '"]');
      if (btn) btn.onclick = function (e) { e.preventDefault(); a.onClick && a.onClick(); };
    });
    state.headerActions = opts.actions || [];
  }

  /* ---------------- 底栏 ---------------- */
  function tabbar(active) {
    state.tab = active || state.tab;
    var el = document.getElementById('tabbar');
    el.innerHTML = TABS.map(function (t) {
      return '<a href="' + t.hash + '" class="' + (t.id === state.tab ? 'on' : '') + '">' +
        icon(t.icon) + '<span>' + t.name + '</span></a>';
    }).join('');
  }

  /* ---------------- 路由 ---------------- */
  function parseHash() {
    var h = location.hash || '#/home';
    h = h.replace(/^#\/?/, '');
    var qi = h.indexOf('?');
    var q = {};
    if (qi >= 0) {
      h.slice(qi + 1).split('&').forEach(function (kv) {
        if (!kv) return;
        var p = kv.split('=');
        q[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
      });
      h = h.slice(0, qi);
    }
    var parts = h.split('/').filter(Boolean);
    return { name: parts[0] || 'home', p: parts.slice(1), q: q };
  }

  var TAB_OF = {
    home: 'home', catalog: 'catalog', card: 'catalog',
    practice: 'practice', fav: 'fav', me: 'me',
    search: 'catalog', tip: 'me', about: 'me'
  };

  function render() {
    var r = parseHash();
    state.route = r;
    var v = VIEWS[r.name] || VIEWS.home;
    var main = document.getElementById('main');
    main.className = '';
    main.innerHTML = '';
    window.scrollTo(0, 0);
    try {
      v(main, r.p, r.q);
    } catch (e) {
      main.innerHTML = '<div class="empty"><span class="em-ico">⚠</span>页面出错了<br><span class="tiny">' +
        esc(e && e.message ? e.message : e) + '</span></div>';
      header({ title: '出错' });
    }
    tabbar(TAB_OF[r.name] || 'home');
  }

  function go(hash) {
    if (location.hash === hash) { render(); return; }
    location.hash = hash;
  }
  /* 替换当前历史项并立即重绘：用于卡片内翻页/切换病证，避免「返回」退回到上一页 */
  function replaceHash(hash) {
    if (location.hash === hash) { render(); return; }
    try {
      history.replaceState(null, '', hash);
      render();
    } catch (e) {
      location.hash = hash;
    }
  }
  function replace(hash) {
    try { location.replace(hash); } catch (e) { location.hash = hash; }
  }
  function back() {
    if (location.hash && location.hash !== '#/home') history.back();
    else go('#/home');
  }

  /* ---------------- 弹窗 ---------------- */
  var dlgResolve = null;
  function dialog(opts) {
    opts = opts || {};
    var el = document.getElementById('dialog');
    var btns = (opts.buttons && opts.buttons.length) ? opts.buttons
      : [{ text: '知道了', value: true, primary: true }];
    el.innerHTML = '<div class="dlg" role="dialog" aria-modal="true">' +
      (opts.title ? '<h3>' + esc(opts.title) + '</h3>' : '') +
      (opts.html ? '<div class="dtxt">' + opts.html + '</div>' : (opts.text ? '<div class="dtxt">' + esc(opts.text) + '</div>' : '')) +
      '<div class="dact">' + btns.map(function (b, i) {
        return '<button class="btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : '') +
          '" data-di="' + i + '">' + esc(b.text) + '</button>';
      }).join('') + '</div></div>';
    el.classList.add('on');
    return new Promise(function (resolve) {
      dlgResolve = resolve;
      el.querySelectorAll('[data-di]').forEach(function (b) {
        b.onclick = function () {
          var i = +b.getAttribute('data-di');
          closeDialog(btns[i].value);
        };
      });
      el.onclick = function (e) { if (e.target === el && opts.dismissible !== false) closeDialog(null); };
    });
  }
  function closeDialog(v) {
    var el = document.getElementById('dialog');
    el.classList.remove('on');
    el.innerHTML = '';
    var r = dlgResolve; dlgResolve = null;
    if (r) r(v);
  }
  function confirmDialog(title, text, okText, cancelText) {
    return dialog({
      title: title, text: text,
      buttons: [
        { text: cancelText || '取消', value: false },
        { text: okText || '确定', value: true, primary: true }
      ]
    });
  }
  function dialogOpen() { return document.getElementById('dialog').classList.contains('on'); }

  /* ---------------- toast ---------------- */
  var toastTimer = null;
  function toast(msg, ms) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('on');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, ms || 1600);
  }

  /* ---------------- 小工具 ---------------- */
  function emptyBox(text, tip) {
    return '<div class="empty"><span class="em-ico">◌</span>' + esc(text) +
      (tip ? '<div class="tiny" style="margin-top:6px">' + esc(tip) + '</div>' : '') + '</div>';
  }
  function bind(root, sel, fn) {
    root.querySelectorAll(sel).forEach(function (el) { el.onclick = function (e) { fn(el, e); }; });
  }

  window.ZNK_UI = {
    ICONS: ICONS, icon: icon, TABS: TABS, VIEWS: VIEWS, state: state,
    header: header, tabbar: tabbar, render: render, go: go, replace: replace, replaceHash: replaceHash, back: back,
    dialog: dialog, closeDialog: closeDialog, confirmDialog: confirmDialog, dialogOpen: dialogOpen,
    toast: toast, emptyBox: emptyBox, bind: bind, parseHash: parseHash
  };
})();
