/* 中医内科学 · 病证目录 / 5 页卡片 / 笔记 / 收藏 / 编辑 / 隐藏 */
(function () {
  'use strict';
  var Z = window.ZNK, UI = window.ZNK_UI;
  var esc = Z.esc, icon = UI.icon;

  /* =================================================================
   *  目录
   * ================================================================= */
  var catState = { manage: false, sel: {}, kw: '' };

  function selCount() { return Object.keys(catState.sel).length; }
  function clearSel() { catState.sel = {}; }

  function diseaseRow(d, manage) {
    var hid = Z.isHidden(d.id);
    var flags = [];
    if (hid) flags.push('<span class="flag" title="已隐藏">⊘</span>');
    if (Z.isFav(d.id)) flags.push('<span class="flag" style="color:#b8892f">★</span>');
    if (Z.note(d.id)) flags.push('<span class="flag" style="color:#2f5573">✎</span>');
    if (Object.keys(Z.store.edits[d.id] || {}).length) flags.push('<span class="flag" title="已修改">✐</span>');
    return '<div class="dr' + (hid ? ' hid' : '') +
      (catState.sel[d.id] ? ' sel' : '') + '" data-dr="' + d.id + '">' +
      (manage ? '<label class="ck"><input type="checkbox" data-ck="' + d.id + '"' + (catState.sel[d.id] ? ' checked' : '') + '></label>' : '') +
      '<span class="nm">' + esc(d.name) + '</span>' +
      '<span class="chip gray tiny cn-chip">' + esc(d.chapterNo) + '</span>' +
      '<span class="flags">' + flags.join('') + '</span></div>';
  }

  function matchDisease(d, kw) {
    if (!kw) return true;
    return d.name.indexOf(kw) >= 0 || d.chapterNo.indexOf(kw) >= 0;
  }
  function catListHTML() {
    var kw = catState.kw;
    var hits = Z.diseases.filter(function (d) { return matchDisease(d, kw); });
    var out = [];
    if (!hits.length) {
      return '<div class="empty">没有找到包含「' + esc(kw) + '」的病证<br>' +
        '<span class="small dim">试试更短的关键词（如「咳」「痛」），或清空搜索</span></div>';
    }
    if (kw) {
      out.push('<div class="tiny dim" style="margin:0 4px 8px">匹配 <b style="color:#27425c">' + hits.length +
        '</b> 个病证 · 点病名进卡片</div>');
    }
    var rows = hits.map(function (d) { return diseaseRow(d, catState.manage); }).join('');
    out.push('<div class="card flat" style="padding:2px 0">' + rows + '</div>');
    out.push('<div class="small dim center" style="margin:12px 0 4px">— 共 ' + Z.diseases.length +
      ' 个病证（' + Z.chapters.length + ' 章） · 附病 ' + Z.attaches.length + ' 个 —</div>');
    return out.join('');
  }

  function bindCatalogList(main) {
    main.querySelectorAll('[data-dr]').forEach(function (el) {
      el.onclick = function (e) {
        var id = el.getAttribute('data-dr');
        if (catState.manage) {
          if (e.target.closest && e.target.closest('.ck')) return;
          toggleSel(id);
          el.classList.toggle('sel', !!catState.sel[id]);
          var ck = el.querySelector('input'); if (ck) ck.checked = !!catState.sel[id];
          paintManageBar(main);
          return;
        }
        UI.go('#/card/' + id);
      };
    });
    main.querySelectorAll('[data-ck]').forEach(function (ck) {
      ck.onclick = function (e) {
        e.stopPropagation();
        var id = ck.getAttribute('data-ck');
        toggleSel(id);
        var row = ck.closest('.dr'); if (row) row.classList.toggle('sel', !!catState.sel[id]);
        paintManageBar(main);
      };
    });
  }

  function toggleSel(id) { if (catState.sel[id]) delete catState.sel[id]; else catState.sel[id] = 1; }
  function removeManageBar() { var b = document.getElementById('fbar'); if (b) b.remove(); }

  function paintManageBar(main) {
    if (!catState.manage) { removeManageBar(); return; }
    var bar = document.getElementById('fbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'fbar';
      document.getElementById('app').appendChild(bar);
    }
    var n = selCount();
    var hiddenN = Z.hiddenCount();
    bar.innerHTML =
      '<button class="btn sm" data-mb="all">全选</button>' +
      '<button class="btn sm" data-mb="none">清空</button>' +
      '<span class="grow"></span>' +
      '<button class="btn sm danger" data-mb="hide"' + (n ? '' : ' disabled') + '>隐藏' + (n ? '(' + n + ')' : '') + '</button>' +
      (hiddenN ? '<button class="btn sm" data-mb="unhide">取消隐藏</button>' : '');
    if (main) {
      bar.querySelector('[data-mb="all"]').onclick = function () {
        Z.diseases.forEach(function (d) { catState.sel[d.id] = 1; });
        renderCatalog(main); paintManageBar(main);
      };
      bar.querySelector('[data-mb="none"]').onclick = function () {
        clearSel(); renderCatalog(main); paintManageBar(main);
      };
      bar.querySelector('[data-mb="hide"]').onclick = function () {
        var ids = Object.keys(catState.sel);
        if (!ids.length) return;
        ids.forEach(function (id) { Z.setHidden(id, true); });
        UI.toast('已隐藏 ' + ids.length + ' 个病证');
        clearSel(); renderCatalog(main);
      };
      var uh = bar.querySelector('[data-mb="unhide"]');
      if (uh) uh.onclick = function () {
        var ids = Object.keys(catState.sel).filter(function (id) { return Z.isHidden(id); });
        if (!ids.length) { UI.toast('勾选里没有已隐藏的病证'); return; }
        ids.forEach(function (id) { Z.setHidden(id, false); });
        UI.toast('已取消隐藏 ' + ids.length + ' 个病证');
        clearSel(); renderCatalog(main);
      };
    }
  }

  function renderCatalog(main) {
    var mg = catState.manage;
    UI.header({
      title: '病证目录',
      sub: Z.diseases.length + ' 个',
      actions: [
        { icon: 'search', label: '搜索', onClick: function () { UI.go('#/search'); } },
        {
          text: mg ? '完成' : '管理', label: '批量管理', onClick: function () {
            catState.manage = !mg;
            clearSel();
            renderCatalog(main);
          }
        }
      ]
    });

    var html = [];
    var hc = Z.hiddenCount();
    if (hc && !mg) {
      html.push('<div class="card" style="padding:10px 12px"><div class="row between"><div class="small muted">已隐藏 ' +
        hc + ' 个病证（目录中带删除线，卡片切换时跳过）</div>' +
        '<button class="btn xs" id="show-hidden">去取消隐藏</button></div></div>');
    }
    html.push('<div class="searchbox mb10" style="margin-bottom:10px"><svg class="s-ico" viewBox="0 0 24 24">' +
      '<circle cx="11" cy="11" r="6.5" fill="none" stroke-width="1.9"/><path d="m16 16 4.5 4.5" stroke-width="1.9" stroke-linecap="round" fill="none"/></svg>' +
      '<input class="input" id="cat-kw" placeholder="在本目录中查找病证名（如 感冒）" value="' + esc(catState.kw) + '" ' +
      'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></div>');
    if (mg) {
      html.push('<div class="card flat" style="padding:9px 11px"><div class="row between"><span class="small muted">勾选要隐藏（或取消隐藏）的病证</span>' +
        '<span class="chip solid tiny" id="sel-count">已选 ' + selCount() + '</span></div></div>');
    }
    html.push('<div id="cat-list">' + catListHTML() + '</div>');
    main.innerHTML = html.join('');
    main.className = mg ? 'has-bar' : '';
    bindCatalogList(main);

    /* 搜索框：永不重建，输入法合成期间不刷新，只替换 #cat-list */
    var kw = main.querySelector('#cat-kw');
    if (kw) {
      var composing = false, timer = null;
      function applyFilter() {
        catState.kw = kw.value.trim();
        var box = main.querySelector('#cat-list');
        if (box) { box.innerHTML = catListHTML(); bindCatalogList(main); }
        var sc = main.querySelector('#sel-count');
        if (sc) sc.textContent = '已选 ' + selCount();
        if (catState.manage) paintManageBar(main);
      }
      function schedule() { clearTimeout(timer); timer = setTimeout(applyFilter, 180); }
      kw.addEventListener('compositionstart', function () { composing = true; });
      kw.addEventListener('compositionend', function () { composing = false; schedule(); });
      kw.oninput = function () { if (composing) return; schedule(); };
      kw.onkeydown = function (e) {
        if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); applyFilter(); kw.blur(); }
        else if (e.key === 'Escape') { kw.value = ''; catState.kw = ''; clearTimeout(timer); applyFilter(); }
      };
    }
    var sh = main.querySelector('#show-hidden');
    if (sh) sh.onclick = function () {
      catState.manage = true; catState.sel = {};
      renderCatalog(main);
      UI.toast('已进入管理，勾选被隐藏的病证再点「取消隐藏」');
    };
    if (mg) paintManageBar(main); else removeManageBar();
  }

  /* =================================================================
   *  卡片（固定 5 页）
   * ================================================================= */
  var cardState = { panel: null, panelId: '', page: 0 };

  var PAGE_NAMES = ['病因·病机', '诊断·鉴别·辨证要点', '治则治法·证治分类', '临证备要·预防调护', '附病'];

  function secHTML(title, field) {
    if (field == null) return '';
    var blocks;
    if (Array.isArray(field)) {
      if (!field.length) return '';
      blocks = (typeof field[0] === 'string')
        ? field.map(function (x) { return { t: 'p', x: x }; })
        : field;
      if (!Z.renderRich(blocks).trim()) return '';
    } else {
      if (String(field).trim() === '') return '';
      blocks = null;
    }
    return '<section class="sec"><h2 class="sec-h">' + esc(title) + '</h2>' +
      '<div class="rich">' + (blocks ? Z.renderRich(blocks) : Z.renderRich(String(field))) + '</div></section>';
  }

  function syndromeListHTML(v) {
    var out = [];
    var n = 0, lastGroup = null;
    v.syndrome.forEach(function (s) {
      if (s.group && s.group !== lastGroup) {
        out.push('<div class="grp">' + esc(s.group) + '</div>');
        n = 0;
      }
      lastGroup = s.group || lastGroup;
      n++;
      var parts = [];
      if (s.clinic) parts.push('<p><b class="fl">临床表现：</b>' + Z.inline(s.clinic) + '</p>');
      if (s.analysis) parts.push('<p><b class="fl">证候分析：</b>' + Z.inline(s.analysis) + '</p>');
      if (s.treat) parts.push('<p><b class="fl">治法：</b>' + Z.inline(s.treat) + '</p>');
      if (s.formulaRaw) parts.push('<p><b class="fl">代表方：</b>' + Z.inline(s.formulaRaw) + '</p>');
      if (s.fangjie) parts.push('<p class="fj"><b class="fl">方解：</b>' + Z.inline(s.fangjie) + '</p>');
      out.push('<div class="syn" data-sid="' + s.id + '">' +
        '<div class="syn-h"><span class="syn-n">' + n + '</span>' +
        '<span class="syn-t">' + esc(s.name) + '</span></div>' +
        '<div class="syn-b">' + parts.join('') + '</div></div>');
    });
    return out.join('');
  }

  function attachLinksHTML(v) {
    var out = [];
    (v.attachIds || []).forEach(function (aid) {
      var a = Z.byId[aid];
      if (!a) return;
      out.push('<a class="att-link" href="#/attach/' + aid + '"><span class="at-nm">附：' + esc(a.name) + '</span>' +
        '<span class="at-go">查看 ›</span></a>');
    });
    return out.join('');
  }

  function pageHTML(v, page) {
    var h = [];
    if (page === 0) {
      h.push(secHTML('病因', v.yinbing));
      h.push(secHTML('病机', v.bingji));
    } else if (page === 1) {
      h.push(secHTML('诊断', v.zhenduan));
      h.push(secHTML('鉴别诊断', v.jianbie));
      h.push(secHTML('辨证要点', v.bianzheng));
    } else if (page === 2) {
      h.push(secHTML('治则治法', v.zhize));
      if (v.syndrome && v.syndrome.length) {
        h.push('<section class="sec"><h2 class="sec-h">证治分类</h2><div class="rich syn-wrap">' +
          syndromeListHTML(v) + '</div></section>');
      }
    } else if (page === 3) {
      h.push(secHTML('临证备要', v.linchuang));
      h.push(secHTML('预防调护', v.yufang));
    } else if (page === 4) {
      var links = attachLinksHTML(v);
      if (links) {
        h.push('<section class="sec"><h2 class="sec-h">附病</h2><div class="att-list">' + links + '</div></section>');
      }
      (v.attachIds || []).forEach(function (aid) {
        var a = Z.byId[aid];
        if (!a) return;
        h.push('<section class="sec"><h2 class="sec-h">附：' + esc(a.name) + '</h2>' +
          '<div class="rich">' + Z.renderRich(a.raw) + '</div></section>');
      });
    }
    return h.join('') || '<div class="empty">本页暂无内容</div>';
  }

  function panelHTML(v, kind) {
    if (kind === 'note') {
      return '<div class="panel" id="card-panel"><div class="p-hd"><span>笔记</span>' +
        '<button class="btn xs ghost" data-pc="close">收起</button></div>' +
        '<textarea class="textarea" id="note-txt" placeholder="写点自己的理解、口诀或易错点…">' + esc(Z.note(v.id)) + '</textarea>' +
        '<div class="p-ft"><button class="btn sm" data-pc="note-del">清除</button>' +
        '<button class="btn sm primary" data-pc="note-save">保存笔记</button></div></div>';
    }
    if (kind === 'fav') {
      var cur = Z.isFav(v.id);
      var gs = Z.store.fav.groups.map(function (g) {
        var on = cur && Z.favGroup(v.id) === g.id;
        return '<button class="chip' + (on ? ' on' : '') + '" data-fg="' + g.id + '">' + esc(g.name) +
          (on ? ' ✓' : '') + '</button>';
      }).join('');
      return '<div class="panel" id="card-panel"><div class="p-hd"><span>收藏到分组</span>' +
        '<button class="btn xs ghost" data-pc="close">收起</button></div>' +
        '<div class="row wrap" style="gap:6px">' + gs + '</div>' +
        '<div class="p-ft"><button class="btn sm" data-pc="fav-new">新建分组</button>' +
        (cur ? '<button class="btn sm danger" data-pc="fav-del">取消收藏</button>' : '') +
        '</div></div>';
    }
    if (kind === 'edit') {
      return editPanelHTML(v);
    }
    if (kind === 'hide') {
      var hid = Z.isHidden(v.id);
      return '<div class="panel" id="card-panel"><div class="p-hd"><span>' + (hid ? '取消隐藏' : '隐藏病证') + '</span>' +
        '<button class="btn xs ghost" data-pc="close">收起</button></div>' +
        '<p class="small muted">' + (hid
          ? '取消隐藏后，该病证会重新出现在目录并恢复卡片切换。'
          : '隐藏后，目录中显示删除线、卡片「上一/下一」切换会跳过它，可在目录「管理」里批量取消。') + '</p>' +
        '<div class="p-ft"><button class="btn sm primary" data-pc="hide-do">' + (hid ? '取消隐藏' : '确认隐藏') + '</button></div></div>';
    }
    return '';
  }

  function editPanelHTML(v) {
    var fields = [
      ['yinbing', '病因', 'y'],
      ['bingji', '病机', 'y'],
      ['zhenduan', '诊断', 'y'],
      ['jianbie', '鉴别诊断', 'y'],
      ['bianzheng', '辨证要点（表格可原样编辑）', 'y'],
      ['zhize', '治则治法', 'y'],
      ['linchuang', '临证备要（一行一条）', 'y'],
      ['yufang', '预防调护（一行一段）', 'y']
    ];
    var h = ['<div class="panel" id="card-panel"><div class="p-hd"><span>编辑内容</span>' +
      '<button class="btn xs ghost" data-pc="close">收起</button></div>' +
      '<p class="tiny dim">保存后仅本机生效；可随时「恢复原文」。</p>'];
    fields.forEach(function (f) {
      var val = Z.fieldText(v[f[0]]);
      h.push('<div class="ef"><label>' + esc(f[1]) + '</label>' +
        '<textarea class="textarea" data-f="' + f[0] + '">' + esc(val) + '</textarea></div>');
    });
    h.push('<div class="ef"><label>证治分类（逐证型）</label>');
    (v.syndrome || []).forEach(function (s) {
      h.push('<details class="sy-ed"><summary>' + esc(s.name) + '</summary>' +
        '<div class="ef"><label>证候名称</label><input class="input" data-sf="name" data-sid="' + s.id + '" value="' + esc(s.name) + '"></div>' +
        '<div class="ef"><label>临床表现</label><textarea class="textarea" data-sf="clinic" data-sid="' + s.id + '">' + esc(s.clinic) + '</textarea></div>' +
        '<div class="ef"><label>证候分析</label><textarea class="textarea" data-sf="analysis" data-sid="' + s.id + '">' + esc(s.analysis) + '</textarea></div>' +
        '<div class="ef"><label>治法</label><input class="input" data-sf="treat" data-sid="' + s.id + '" value="' + esc(s.treat) + '"></div>' +
        '<div class="ef"><label>代表方（原文）</label><input class="input" data-sf="formulaRaw" data-sid="' + s.id + '" value="' + esc(s.formulaRaw) + '"></div>' +
        '<div class="ef"><label>方名（练习答案）</label><input class="input" data-sf="formulaName" data-sid="' + s.id + '" value="' + esc(s.formulaName) + '"></div>' +
        '<div class="ef"><label>方解/加减</label><textarea class="textarea" data-sf="fangjie" data-sid="' + s.id + '">' + esc(s.fangjie) + '</textarea></div>' +
        '</details>');
    });
    h.push('</div>');
    h.push('<div class="p-ft"><button class="btn sm" data-pc="edit-reset">恢复原文</button>' +
      '<button class="btn sm primary" data-pc="edit-save">保存修改</button></div></div>');
    return h.join('');
  }

  function bindPanel(main, v, kind) {
    var panel = main.querySelector('#card-panel');
    if (!panel) return;
    function close() { cardState.panel = null; renderCard(main, [v.id], {}); }
    panel.querySelectorAll('[data-pc="close"]').forEach(function (b) { b.onclick = close; });
    var sv = panel.querySelector('[data-pc="note-save"]');
    if (sv) sv.onclick = function () {
      Z.setNote(v.id, panel.querySelector('#note-txt').value);
      UI.toast('笔记已保存'); close();
    };
    var dl = panel.querySelector('[data-pc="note-del"]');
    if (dl) dl.onclick = function () { Z.setNote(v.id, ''); UI.toast('已清除笔记'); close(); };
    panel.querySelectorAll('[data-fg]').forEach(function (b) {
      b.onclick = function () {
        var gid = b.getAttribute('data-fg');
        if (Z.isFav(v.id) && Z.favGroup(v.id) === gid) Z.toggleFav(v.id);
        else { if (Z.isFav(v.id)) Z.toggleFav(v.id); Z.toggleFav(v.id, gid); }
        UI.toast('已更新收藏'); close();
      };
    });
    var nd = panel.querySelector('[data-pc="fav-new"]');
    if (nd) nd.onclick = function () {
      UI.dialog({
        title: '新建收藏分组',
        html: '<input class="input" id="new-gname" placeholder="分组名称（如：重点病证）" style="width:100%">',
        buttons: [{ text: '取消', value: false }, { text: '创建', value: true, primary: true }]
      }).then(function (ok) {
        if (!ok) return;
        var inp = document.getElementById('new-gname');
        var name = (inp && inp.value || '').trim() || ('分组' + (Z.store.fav.groups.length + 1));
        var gid = 'g' + Date.now();
        Z.store.fav.groups.push({ id: gid, name: name });
        Z.toggleFav(v.id, gid); Z.save(true);
        UI.toast('已创建「' + name + '」并收藏');
        close();
      });
    };
    var fd = panel.querySelector('[data-pc="fav-del"]');
    if (fd) fd.onclick = function () { Z.toggleFav(v.id); UI.toast('已取消收藏'); close(); };
    var hd = panel.querySelector('[data-pc="hide-do"]');
    if (hd) hd.onclick = function () {
      var cur = Z.isHidden(v.id);
      Z.setHidden(v.id, !cur);
      UI.toast(cur ? '已取消隐藏' : '已隐藏该病证');
      close();
    };
    var er = panel.querySelector('[data-pc="edit-reset"]');
    if (er) er.onclick = function () {
      UI.confirmDialog('恢复原文', '将清除该病证的全部修改，恢复教材原文。确定吗？', '恢复', '取消').then(function (ok) {
        if (!ok) return;
        Z.clearEdits(v.id); UI.toast('已恢复原文'); close();
      });
    };
    var es = panel.querySelector('[data-pc="edit-save"]');
    if (es) es.onclick = function () {
      var e = {};
      panel.querySelectorAll('textarea[data-f]').forEach(function (ta) {
        var key = ta.getAttribute('data-f');
        var orig = key === 'linchuang' || key === 'yufang'
          ? Z.fieldText(v[key])
          : Z.fieldText(v[key]);
        if (ta.value.trim() !== String(orig).trim()) e[key] = ta.value;
      });
      var se = {};
      panel.querySelectorAll('[data-sf]').forEach(function (inp) {
        var sid = inp.getAttribute('data-sid');
        var f = inp.getAttribute('data-sf');
        var cur = v.syndrome.filter(function (x) { return x.id === sid; })[0];
        if (!cur) return;
        if (String(inp.value) !== String(cur[f] == null ? '' : cur[f])) {
          se[sid] = se[sid] || {};
          se[sid][f] = inp.value;
        }
      });
      if (Object.keys(se).length) e.syndrome = se;
      if (!Object.keys(e).length) { UI.toast('没有改动'); return; }
      Z.store.edits[v.id] = e;
      Z.save(true);
      UI.toast('已保存修改'); close();
    };
  }

  function renderCard(main, p, q) {
    var id = p[0];
    var raw = Z.byId[id];
    if (!raw) { main.innerHTML = UI.emptyBox('病证不存在'); return; }
    var v = Z.view(raw);
    var pages = 4 + ((v.attachIds || []).length ? 1 : 0);
    var page = Math.min(Math.max(0, cardState.page | 0), pages - 1);
    if (q && q.p != null) page = Math.min(pages - 1, Math.max(0, parseInt(q.p, 10) || 0));
    cardState.page = page;

    var hid = Z.isHidden(v.id);
    UI.header({
      title: v.name,
      sub: v.chapterNo,
      back: true,
      backTo: '#/catalog',
      actions: []
    });

    var h = [];
    if (hid) {
      h.push('<div class="notice warn mb10"><span>该病证已隐藏（目录带删除线、卡片切换跳过）。</span>' +
        '<button class="btn xs" id="unhide-now">取消隐藏</button></div>');
    }
    if (v.hasEdit) {
      h.push('<div class="notice mb10"><span>内容已按你的编辑显示。</span>' +
        '<button class="btn xs" id="reset-now">恢复原文</button></div>');
    }
    h.push('<div class="card card-main">');
    h.push('<div class="ct-hd"><div class="ct-name">' + esc(v.name) + '</div>' +
      '<div class="ct-sub">' + esc(v.chapterNo) + ' · ' + (v.syndrome || []).length + ' 个证型</div></div>');
    /* 页签 */
    var tabs = [];
    for (var pi = 0; pi < pages; pi++) {
      tabs.push('<button class="pg-tab' + (pi === page ? ' on' : '') + '" data-pg="' + pi + '">' +
        '<span class="pg-i">' + (pi + 1) + '</span><span class="pg-t">' + PAGE_NAMES[pi] + '</span></button>');
    }
    h.push('<div class="pg-tabs">' + tabs.join('') + '</div>');
    h.push('<div class="ct-body" id="ct-body">' + pageHTML(v, page) + '</div>');
    /* 页内翻页 */
    h.push('<div class="pager"><button class="btn sm" id="pg-prev"' + (page <= 0 ? ' disabled' : '') + '>‹ 上一页</button>' +
      '<span class="pg-now">第 ' + (page + 1) + '/' + pages + ' 页</span>' +
      '<button class="btn sm" id="pg-next"' + (page >= pages - 1 ? ' disabled' : '') + '>下一页 ›</button></div>');
    /* 卡片按钮 */
    h.push('<div class="ct-acts">' +
      '<button class="btn sm" data-act="note">' + icon('note') + '笔记</button>' +
      '<button class="btn sm' + (Z.isFav(v.id) ? ' on' : '') + '" data-act="fav">' + icon('star') + (Z.isFav(v.id) ? '已藏' : '收藏') + '</button>' +
      '<button class="btn sm" data-act="edit">' + icon('edit') + '编辑</button>' +
      '<button class="btn sm" data-act="hide">' + icon('hide') + '隐藏</button>' +
      '</div>');
    if (cardState.panel && cardState.panelId === v.id) {
      h.push(panelHTML(v, cardState.panel));
    } else {
      h.push('<div id="card-panel"></div>');
    }
    h.push('</div>');
    /* 上一/下一病证（独立一行） */
    var prev = Z.navigate(v.id, -1), next = Z.navigate(v.id, 1);
    h.push('<div class="pager-row"><button class="btn sm" id="d-prev"' + (prev ? '' : ' disabled') + '>‹ 上一病证</button>' +
      '<button class="btn sm" id="d-next"' + (next ? '' : ' disabled') + '>下一病证 ›</button></div>');
    main.innerHTML = h.join('');
    bindCard(main, v);
  }

  function bindCard(main, v) {
    var pages = 4 + ((v.attachIds || []).length ? 1 : 0);
    function gotoPage(i) {
      i = Math.min(Math.max(0, i), pages - 1);
      cardState.page = i;
      UI.replaceHash('#/card/' + v.id + '?p=' + i);
    }
    main.querySelectorAll('[data-pg]').forEach(function (b) {
      b.onclick = function () { gotoPage(+b.getAttribute('data-pg')); };
    });
    var pi = main.querySelector('#pg-prev'); if (pi) pi.onclick = function () { gotoPage(cardState.page - 1); };
    var nx = main.querySelector('#pg-next'); if (nx) nx.onclick = function () { gotoPage(cardState.page + 1); };
    var dp = main.querySelector('#d-prev');
    if (dp) dp.onclick = function () { var id = Z.navigate(v.id, -1); if (id) { cardState.page = 0; UI.replaceHash('#/card/' + id + '?p=0'); } };
    var dn = main.querySelector('#d-next');
    if (dn) dn.onclick = function () { var id = Z.navigate(v.id, 1); if (id) { cardState.page = 0; UI.replaceHash('#/card/' + id + '?p=0'); } };
    var uh = main.querySelector('#unhide-now');
    if (uh) uh.onclick = function () { Z.setHidden(v.id, false); UI.toast('已取消隐藏'); renderCard(main, [v.id], {}); };
    var rs = main.querySelector('#reset-now');
    if (rs) rs.onclick = function () {
      Z.confirmDialog('恢复原文', '将清除该病证的全部修改，恢复教材原文。确定吗？', '恢复', '取消').then(function (ok) {
        if (ok) { Z.clearEdits(v.id); UI.toast('已恢复原文'); renderCard(main, [v.id], {}); }
      });
    };
    main.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () {
        var a = b.getAttribute('data-act');
        cardState.panel = a; cardState.panelId = v.id;
        renderCard(main, [v.id], {});
      };
    });
    bindPanel(main, v, cardState.panel);
  }

  function renderAttach(main, p) {
    var a = Z.byId[p[0]];
    if (!a) { main.innerHTML = UI.emptyBox('附病不存在'); return; }
    var v = Z.viewAttach(a);
    UI.header({ title: '附：' + v.name, sub: v.parentName, back: true, backTo: '#/card/' + v.parent });
    var h = [];
    h.push('<div class="notice mb10"><span>附病 · 隶属「' + esc(v.parentName) + '」' +
      (v.chapterNo ? '（' + esc(v.chapterNo) + '）' : '') + '</span>' +
      '<a class="btn xs" href="#/card/' + v.parent + '">回正文 ›</a></div>');
    h.push('<div class="card card-main"><div class="ct-hd"><div class="ct-name">附：' + esc(v.name) + '</div>' +
      '<div class="ct-sub">' + esc(v.parentName) + '</div></div>' +
      '<div class="ct-body rich">' + Z.renderRich(v.raw) + '</div></div>');
    main.innerHTML = h.join('');
  }

  /* ---------------- 键盘 ←/→ 翻页（守卫） ---------------- */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.isComposing) return;
    var t = e.target || {};
    var tag = (t.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || t.isContentEditable) return;
    if (location.hash.indexOf('#/card/') !== 0) return;
    e.preventDefault();
    var route = UI.parseHash();
    var id = route.p[0];
    if (!id) return;
    var d = Z.byId[id];
    if (!d) return;
    var pages = 4 + ((d.attachIds || []).length ? 1 : 0);
    var cur = (typeof cardState.page === 'number') ? cardState.page : 0;
    var np = Math.min(Math.max(0, cur + (e.key === 'ArrowRight' ? 1 : -1)), pages - 1);
    if (np !== cur) { cardState.page = np; UI.replaceHash('#/card/' + id + '?p=' + np); }
  });

  UI.VIEWS.catalog = renderCatalog;
  UI.VIEWS.card = renderCard;
  UI.VIEWS.attach = renderAttach;
  window.ZNK_CARDS = { removeManageBar: removeManageBar };
})();
