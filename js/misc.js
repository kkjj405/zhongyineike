/* 中医内科学 · 首页 / 收藏 / 搜索 / 打赏 / 我的 / 关于 */
(function () {
  'use strict';
  var Z = window.ZNK, UI = window.ZNK_UI;
  var esc = Z.esc, icon = UI.icon;
  var VER = window.ZNK_VERSION || { web: '1.0.0', app: '1.0.0' };

  /* ---------------- 首页 ---------------- */
  var ANNOUNCE = [
    '本程序内容完全基于中国中医药出版社十五五教材《中医内科学》。本程序仅供学习使用，不提供临床用药指导。',
    '如果觉得有用的话，可以分享给身边的朋友、同学，支持免费分享，支持白嫖',
    '制作不易，可以给作者一点赞赏嘛，赞赏码在「我的 → 赞赏支持」'
  ];

  function renderHome(main) {
    UI.header({ title: '中医内科学' });
    var open = !!Z.store.meta.annOpen;
    var h = [];
    h.push('<div class="hero"><h1 class="serif">中医内科学</h1>' +
      '<p>病证卡片 · 默写 · 选择题 · 离线可用</p>' +
      '<div class="mini"><span><b>' + Z.diseases.length + '</b>病证</span>' +
      '<span><b>' + Z.attaches.length + '</b>附病</span>' +
      '<span><b>' + Z.D.stats.syndromes + '</b>证型</span>' +
      '<span><b>' + Z.D.stats.tables + '</b>教材表格</span></div></div>');

    /* 公告（默认折叠） */
    h.push('<div class="announce' + (open ? ' open' : '') + '" id="ann"><button class="ann-hd" id="ann-toggle">' +
      '<span class="ann-ic">告</span><span class="ann-t">公告</span>' +
      '<span class="ann-x">' + (open ? '收起' : '展开') + '</span></button>' +
      '<div class="ann-bd">' + ANNOUNCE.map(function (t, i) {
        return '<div class="ann-i"><span class="ann-no">' + (i + 1) + '.</span><span>' + esc(t) + '</span></div>';
      }).join('') + '</div></div>');

    /* 入口 */
    var entries = [
      { href: '#/catalog', ic: 'cards', t: '病证目录', s: '53 个病证 + 附病' },
      { href: '#/setup/mo', ic: 'practice', t: '默写练习', s: '病因 / 证治分类' },
      { href: '#/setup/tc', ic: 'check', t: '选择题', s: '证型多选 + 3 小题' },
      { href: '#/fav', ic: 'star', t: '收藏', s: '分组管理' },
      { href: '#/search', ic: 'search', t: '搜索', s: '按病证名' },
      { href: '#/tip', ic: 'tip', t: '赞赏支持', s: '自愿 · 随意' }
    ];
    h.push('<div class="entry-grid">' + entries.map(function (e) {
      return '<a class="entry" href="' + e.href + '"><span class="e-ic">' + icon(e.ic) + '</span>' +
        '<span class="e-t">' + e.t + '</span><span class="e-s">' + e.s + '</span></a>';
    }).join('') + '</div>');

    /* 说明卡 */
    h.push('<div class="card flat"><p class="small muted" style="margin:0">' +
      '数据来源：中国中医药出版社「十五五」规划教材《中医内科学》（第六版）。卡片含教材全部 ' +
      Z.D.stats.tables + ' 张表格；附病 ' + Z.attaches.length + ' 个。离线可用，记录保存在本机。</p></div>');

    main.innerHTML = h.join('');
    var ann = main.querySelector('#ann');
    var tg = main.querySelector('#ann-toggle');
    if (tg) tg.onclick = function () {
      var now = !ann.classList.contains('open');
      ann.classList.toggle('open', now);
      Z.store.meta.annOpen = now;
      Z.save(true);
      var x = main.querySelector('.ann-x');
      if (x) x.textContent = now ? '收起' : '展开';
    };
  }

  /* ---------------- 收藏 ---------------- */
  function renderFav(main) {
    UI.header({
      title: '收藏', sub: Z.favList().length + ' 个',
      actions: [{
        icon: 'list', label: '新建分组', onClick: function () {
          UI.dialog({
            title: '新建收藏分组',
            html: '<input class="input" id="new-gname" placeholder="分组名称（如：重点病证）" style="width:100%">',
            buttons: [{ text: '取消', value: false }, { text: '创建', value: true, primary: true }]
          }).then(function (ok) {
            if (!ok) return;
            var inp = document.getElementById('new-gname');
            var name = ((inp && inp.value) || '').trim() || ('分组' + (Z.store.fav.groups.length + 1));
            Z.store.fav.groups.push({ id: 'g' + Date.now(), name: name });
            Z.save(true); renderFav(main); UI.toast('已创建「' + name + '」');
          });
        }
      }]
    });
    var h = [];
    var total = Z.favList().length;
    if (!total) {
      h.push(UI.emptyBox('还没有收藏', '在病证卡片里点「收藏」即可；可自建分组管理'));
    } else {
      Z.store.fav.groups.forEach(function (g) {
        var ids = Z.favList(g.id);
        h.push('<div class="card"><div class="row between mb8"><b>' + esc(g.name) + '</b>' +
          '<span class="row" style="gap:6px"><span class="chip gray tiny">' + ids.length + ' 个</span>' +
          (Z.store.fav.groups.length > 1 && g.id !== 'g0' ? '<button class="btn xs danger" data-gdel="' + g.id + '">删组</button>' : '') +
          '</span></div>');
        if (!ids.length) h.push('<p class="tiny dim" style="margin:0">空分组</p>');
        ids.forEach(function (id) {
          var d = Z.byId[id];
          if (!d) return;
          h.push('<div class="fav-row"><a class="grow fav-nm" href="#/card/' + id + '">' + esc(d.name) +
            '<span class="tiny dim"> ' + esc(d.chapterNo) + '</span></a>' +
            '<button class="btn xs" data-gmv="' + id + '">移动</button>' +
            '<button class="btn xs danger" data-grm="' + id + '">删除</button></div>');
        });
        h.push('</div>');
      });
    }
    main.innerHTML = h.join('');
    main.querySelectorAll('[data-grm]').forEach(function (b) {
      b.onclick = function () {
        Z.toggleFav(b.getAttribute('data-grm'));
        renderFav(main); UI.toast('已删除收藏');
      };
    });
    main.querySelectorAll('[data-gmv]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-gmv');
        var cur = Z.favGroup(id);
        var opts = Z.store.fav.groups.filter(function (g) { return g.id !== cur; });
        if (!opts.length) { UI.toast('只有一个分组'); return; }
        UI.dialog({
          title: '移动到分组',
          html: opts.map(function (g, i) {
            return '<button class="btn block" data-mvg="' + g.id + '" style="margin-bottom:8px">' + esc(g.name) + '</button>';
          }).join(''),
          buttons: [{ text: '取消', value: false }]
        }).then(function () { });
        /* 直接在弹窗里绑定按钮 */
        setTimeout(function () {
          var dlg = document.getElementById('dialog');
          dlg.querySelectorAll('[data-mvg]').forEach(function (mb) {
            mb.onclick = function () {
              Z.toggleFav(id); Z.toggleFav(id, mb.getAttribute('data-mvg'));
              UI.closeDialog(null); renderFav(main); UI.toast('已移动');
            };
          });
        }, 30);
      };
    });
    main.querySelectorAll('[data-gdel]').forEach(function (b) {
      b.onclick = function () {
        var gid = b.getAttribute('data-gdel');
        var g = Z.store.fav.groups.filter(function (x) { return x.id === gid; })[0];
        if (!g) return;
        UI.confirmDialog('删除分组', '「' + g.name + '」里的收藏会移到默认分组，确定删除该分组？', '删除', '取消')
          .then(function (ok) {
            if (!ok) return;
            Object.keys(Z.store.fav.items).forEach(function (id) {
              if (Z.store.fav.items[id] === gid) Z.store.fav.items[id] = 'g0';
            });
            Z.store.fav.groups = Z.store.fav.groups.filter(function (x) { return x.id !== gid; });
            Z.save(true); renderFav(main);
          });
      };
    });
  }

  /* ---------------- 搜索 ---------------- */
  function renderSearch(main, p, q) {
    UI.header({ title: '搜索病证', back: true });
    var h = ['<div class="searchbox mb10"><svg class="s-ico" viewBox="0 0 24 24">' +
      '<circle cx="11" cy="11" r="6.5" fill="none" stroke-width="1.9"/><path d="m16 16 4.5 4.5" stroke-width="1.9" stroke-linecap="round" fill="none"/></svg>' +
      '<input class="input" id="s-kw" placeholder="输入病证名（如 感冒 / 咳 / 痛）" value="' + esc((q && q.kw) || '') + '" autocomplete="off"></div>',
      '<div id="s-res"></div>'];
    main.innerHTML = h.join('');
    var inp = main.querySelector('#s-kw');
    var box = main.querySelector('#s-res');
    var timer = null, composing = false;
    function renderRes() {
      var kw = inp.value.trim();
      if (!kw) {
        box.innerHTML = '<div class="card flat"><p class="small muted" style="margin:0">输入病证名开始搜索；点结果直接打开卡片。</p></div>';
        return;
      }
      var hits = Z.searchDiseases(kw);
      if (!hits.length) {
        box.innerHTML = UI.emptyBox('没有找到「' + kw + '」', '试试更短的关键词');
        return;
      }
      box.innerHTML = '<div class="tiny dim" style="margin:0 4px 8px">找到 ' + hits.length + ' 个病证</div>' +
        '<div class="card flat" style="padding:2px 0">' + hits.map(function (d) {
          return '<a class="fav-row" href="#/card/' + d.id + '"><span class="grow fav-nm">' + esc(d.name) +
            '<span class="tiny dim"> ' + esc(d.chapterNo) + ' · ' + (d.syndrome || []).length + ' 证型</span></span>' +
            '<span class="at-go">打开 ›</span></a>';
        }).join('') + '</div>';
    }
    inp.addEventListener('compositionstart', function () { composing = true; });
    inp.addEventListener('compositionend', function () { composing = false; renderRes(); });
    inp.oninput = function () { if (composing) return; clearTimeout(timer); timer = setTimeout(renderRes, 150); };
    inp.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); renderRes(); inp.blur(); } };
    renderRes();
  }

  /* ---------------- 打赏 ---------------- */
  function renderTip(main) {
    UI.header({ title: '赞赏支持', back: true });
    main.innerHTML = '<div class="card tip-card">' +
      '<p class="tip-t serif">制作不易，如果觉得有用的话，可以给作者一点赞赏嘛，多少都是可以的，' +
      '一块钱也是爱，当然没有打赏也是可以的，支持免费使用，大家都是医学生，不必为难</p>' +
      '<div class="qr-wrap"><img src="qr.jpg" alt="赞赏码" class="qr-img"></div>' +
      '<p class="tiny dim center">微信 / 支付宝 扫码 · 完全自愿</p></div>';
  }

  /* ---------------- 我的 ---------------- */
  function renderMe(main) {
    UI.header({ title: '我的' });
    var h = [];
    h.push('<div class="card me-card"><div class="me-av">内</div><div class="grow">' +
      '<div class="me-nm">中医内科学</div>' +
      '<div class="tiny dim">v' + esc(VER.web) + ' · ' + Z.diseases.length + ' 病证 · ' + Z.D.stats.syndromes + ' 证型</div>' +
      '</div></div>');
    h.push('<div class="card list">' +
      item('tip', '赞赏支持', '喜欢的话可以支持一下', '#/tip') +
      '<div class="li" id="upd-li"><span class="li-ic">' + icon('refresh') + '</span><span class="grow">' +
      '<span class="li-t">检查更新</span><span class="li-s" id="upd-msg">点右侧按钮检查</span></span>' +
      '<button class="btn xs" id="upd-btn">检查</button></div>' +
      '</div>');
    h.push('<div class="card list">' +
      '<div class="li" id="bk-li"><span class="li-ic">' + icon('note') + '</span><span class="grow">' +
      '<span class="li-t">备份与恢复</span><span class="li-s">导出/导入本机记录（笔记·收藏·隐藏·编辑·草稿）</span></span>' +
      '<button class="btn xs" id="bk-out">导出</button><button class="btn xs" id="bk-in">导入</button></div>' +
      '<div class="li"><span class="li-ic">' + icon('eyeoff') + '</span><span class="grow">' +
      '<span class="li-t">清空本机数据</span><span class="li-s">笔记 / 收藏 / 隐藏 / 编辑 / 草稿</span></span>' +
      '<button class="btn xs danger" id="clr">清空</button></div>' +
      '</div>');
    h.push('<div class="card list">' + item('list', '关于', '数据来源与免责声明', '#/about') + '</div>');
    main.innerHTML = h.join('');
    var ub = main.querySelector('#upd-btn');
    if (ub) ub.onclick = function () { doCheckUpdate(main); };
    var bo = main.querySelector('#bk-out');
    if (bo) bo.onclick = function () { doExport(); };
    var bi = main.querySelector('#bk-in');
    if (bi) bi.onclick = function () { doImport(main); };
    var cl = main.querySelector('#clr');
    if (cl) cl.onclick = function () {
      UI.confirmDialog('清空本机数据', '将删除本机的笔记、收藏、隐藏、编辑与练习草稿，且不可恢复。教材原文不受影响。确定清空？', '清空', '取消')
        .then(function (ok) {
          if (!ok) return;
          localStorage.removeItem('znk.data.v1');
          UI.toast('已清空，重新载入…');
          setTimeout(function () { location.reload(); }, 700);
        });
    };
  }
  function item(ic, t, s, href) {
    return '<a class="li" href="' + href + '"><span class="li-ic">' + icon(ic) + '</span>' +
      '<span class="grow"><span class="li-t">' + esc(t) + '</span><span class="li-s">' + esc(s) + '</span></span>' +
      '<span class="at-go">›</span></a>';
  }

  /* ---------------- 检查更新 ---------------- */
  function cmpVer(a, b) {
    var pa = String(a || '0').split('.'), pb = String(b || '0').split('.');
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var x = parseInt(pa[i] || 0, 10), y = parseInt(pb[i] || 0, 10);
      if (x !== y) return x > y ? 1 : -1;
    }
    return 0;
  }
  function doCheckUpdate(main) {
    var msg = main.querySelector('#upd-msg');
    function say(t) { if (msg) msg.innerHTML = t; }
    if (window.NativeBridge && window.NativeBridge.checkUpdate) {
      say('正在检查…');
      try { window.NativeBridge.checkUpdate(); } catch (e) { say('检查失败：' + e.message); }
      return;
    }
    say('正在检查…');
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        var remote = j.web || j.version || '';
        if (cmpVer(remote, VER.web) > 0) {
          say('发现新版本 v' + remote + '，正在更新…');
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.getRegistration().then(function (reg) {
              if (reg) reg.update();
              setTimeout(function () { location.reload(); }, 1200);
            });
          } else setTimeout(function () { location.reload(); }, 800);
        } else {
          say('已是最新版本（v' + VER.web + '）');
          UI.toast('已是最新版本');
        }
      })
      .catch(function (e) {
        say('检查失败：' + (e.message || '网络不可用') + '（不影响使用）');
      });
  }
  window.__onUpdateResult = function (json) {
    var o = {};
    try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { }
    var msg = document.querySelector('#upd-msg');
    var t = o.msg || (o.ok ? '已是最新版本' : '检查失败');
    if (msg) msg.textContent = t;
    UI.toast(t);
    if (o.updated) setTimeout(function () {
      try { window.NativeBridge.reload(); } catch (e) { location.reload(); }
    }, 900);
  };
  window.__onAutoUpdate = function (json) {
    var o = {};
    try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { }
    if (o.updated) {
      UI.dialog({
        title: '更新完成', text: '新版本资源已下载完成，重启后生效。',
        buttons: [{ text: '稍后', value: false }, { text: '立即重启', value: true, primary: true }]
      }).then(function (ok) {
        if (ok) { try { window.NativeBridge.reload(); } catch (e) { location.reload(); } }
      });
    }
  };

  /* ---------------- 备份 / 恢复 ---------------- */
  function doExport() {
    var obj = { app: 'znk', version: VER.app, ts: Date.now(), data: Z.store };
    var blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '中医内科学备份_' + Z.nowText().replace(/[: ]/g, '-') + '.json';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    UI.toast('已导出备份');
  }
  function doImport(main) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var o = JSON.parse(fr.result);
          var data = o.data || o;
          if (!data || typeof data !== 'object' || !data.notes) throw new Error('格式不对');
          Object.keys(Z.store).forEach(function (k) { delete Z.store[k]; });
          Object.keys(data).forEach(function (k) { Z.store[k] = data[k]; });
          Z.save(true);
          UI.toast('导入成功，正在刷新…');
          setTimeout(function () { location.reload(); }, 800);
        } catch (e) {
          UI.dialog({ title: '导入失败', text: '文件不是本应用的备份，或已损坏。' });
        }
      };
      fr.readAsText(f);
    };
    inp.click();
  }

  /* ---------------- 关于 ---------------- */
  function renderAbout(main) {
    UI.header({ title: '关于', back: true });
    main.innerHTML = '<div class="card">' +
      '<h3 class="serif" style="margin:0 0 8px">中医内科学 · 学习卡片</h3>' +
      '<p class="small">本程序内容完全基于中国中医药出版社十五五教材《中医内科学》（第六版）。本程序仅供学习使用，不提供临床用药指导。</p>' +
      '<p class="small muted">数据范围：第四章 感冒 ～ 第五十六章 腰痛，共 ' + Z.diseases.length +
      ' 个病证、' + Z.attaches.length + ' 个附病、' + Z.D.stats.syndromes + ' 个证型、' +
      Z.D.stats.tables + ' 张教材表格。</p>' +
      '<p class="small muted">版本 v' + esc(VER.web) + ' · 记录仅保存在本机 · 支持离线使用</p>' +
      '</div>';
  }

  UI.VIEWS.home = renderHome;
  UI.VIEWS.fav = renderFav;
  UI.VIEWS.search = renderSearch;
  UI.VIEWS.tip = renderTip;
  UI.VIEWS.me = renderMe;
  UI.VIEWS.about = renderAbout;
})();
