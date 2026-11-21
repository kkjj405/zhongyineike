/* 中医内科学 · 数据层 / 本地存储 / 渲染 / 工具函数 */
(function () {
  'use strict';

  var D = window.ZNK_DATA;
  if (!D) {
    document.body.innerHTML = '<div class="empty">数据文件加载失败，请重新打开应用</div>';
    return;
  }

  var diseases = D.diseases || [];
  var attaches = D.attaches || [];
  var chapters = D.chapters || [];
  var byId = Object.create(null);
  var attachOf = Object.create(null);
  diseases.forEach(function (d) { byId[d.id] = d; });
  attaches.forEach(function (a) { byId[a.id] = a; });

  /* ---------------- 本地存储 ---------------- */
  var KEY = 'znk.data.v1';
  var DEFAULT = {
    notes: {},
    hidden: {},
    edits: {},
    fav: { groups: [{ id: 'g0', name: '默认分组' }], items: {} },
    pos: { last: '' },
    drafts: [],
    settings: { order: 'random' },
    meta: { firstOpen: 0, lastVersion: '', annOpen: false }
  };
  var store = load();
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULT);
      var o = JSON.parse(raw);
      Object.keys(DEFAULT).forEach(function (k) {
        if (o[k] === undefined || o[k] === null) o[k] = clone(DEFAULT[k]);
      });
      if (!o.fav || !Array.isArray(o.fav.groups) || !o.fav.groups.length) o.fav = clone(DEFAULT.fav);
      if (!o.fav.items) o.fav.items = {};
      if (!Array.isArray(o.drafts)) o.drafts = [];
      return o;
    } catch (e) { return clone(DEFAULT); }
  }
  var saveTimer = null;
  function save(now) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (now) { persist(); return; }
    saveTimer = setTimeout(persist, 120);
  }
  function persist() {
    saveTimer = null;
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { }
  }
  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') persist();
  });

  /* ---------------- 工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function inline(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function uniq(arr) {
    var seen = Object.create(null), out = [];
    arr.forEach(function (x) { if (!seen[x]) { seen[x] = 1; out.push(x); } });
    return out;
  }
  function uniqBy(arr, fn) {
    var seen = Object.create(null), out = [];
    arr.forEach(function (x) { var k = fn(x); if (!seen[k]) { seen[k] = 1; out.push(x); } });
    return out;
  }
  function nowText(ts) {
    var d = new Date(ts || Date.now());
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
      p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function clip(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  /* ---------------- markdown-lite 文本 → 块 ---------------- */
  function parseMdText(text) {
    var lines = String(text || '').split(/\r?\n/);
    var blocks = [];
    var para = [];
    var i = 0;
    function flush() {
      if (para.length) { blocks.push({ t: 'p', x: para.join('\n') }); para = []; }
    }
    while (i < lines.length) {
      var s = lines[i].replace(/^\s+|\s+$/g, '');
      if (!s) { flush(); i++; continue; }
      if (s.charAt(0) === '|') {
        flush();
        var rows = [];
        while (i < lines.length && lines[i].replace(/^\s+|\s+$/g, '').charAt(0) === '|') {
          var cells = lines[i].replace(/^\s+|\s+$/g, '').replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); });
          if (!cells.every(function (c) { return /^-+$/.test(c) || c === ''; })) rows.push(cells);
          i++;
        }
        if (rows.length) blocks.push({ t: 'table', caption: '', head: rows[0], rows: rows.slice(1) });
        continue;
      }
      var mb = s.match(/^\*\*(.+)\*\*$/);
      if (mb) { flush(); blocks.push({ t: 'b', x: mb[1] }); i++; continue; }
      if (s.charAt(0) === '>') {
        flush();
        var q = [];
        while (i < lines.length && lines[i].replace(/^\s+|\s+$/g, '').charAt(0) === '>') {
          q.push(lines[i].replace(/^\s+|\s+$/g, '').replace(/^>\s?/, '')); i++;
        }
        blocks.push({ t: 'q', x: q.join('\n') });
        continue;
      }
      if (/^[-*]\s+/.test(s)) {
        flush();
        var items = [];
        while (i < lines.length && /^[-*]\s+/.test(lines[i].replace(/^\s+|\s+$/g, ''))) {
          items.push(lines[i].replace(/^\s+|\s+$/g, '').replace(/^[-*]\s+/, '')); i++;
        }
        blocks.push({ t: 'ul', items: items });
        continue;
      }
      if (/^\d+[.．、)]\s*/.test(s)) {
        flush();
        var oitems = [];
        while (i < lines.length && /^\d+[.．、)]\s*/.test(lines[i].replace(/^\s+|\s+$/g, ''))) {
          oitems.push(lines[i].replace(/^\s+|\s+$/g, '')); i++;
        }
        blocks.push({ t: 'ol', items: oitems });
        continue;
      }
      para.push(s); i++;
    }
    flush();
    return blocks;
  }

  /* ---------------- 块 → HTML（统一渲染器） ---------------- */
  function tableHTML(bl) {
    var h = [];
    if (bl.caption) h.push('<div class="tbl-cap">' + inline(bl.caption) + '</div>');
    h.push('<div class="tbl-wrap"><table>');
    h.push('<thead><tr>');
    (bl.head || []).forEach(function (c) { h.push('<th>' + inline(c) + '</th>'); });
    h.push('</tr></thead><tbody>');
    (bl.rows || []).forEach(function (r) {
      h.push('<tr>');
      r.forEach(function (c, ci) {
        h.push('<td' + (ci === 0 ? ' class="fc"' : '') + '>' + inline(c) + '</td>');
      });
      h.push('</tr>');
    });
    h.push('</tbody></table></div>');
    return h.join('');
  }
  function blockHTML(bl) {
    if (!bl || !bl.t) return '';
    switch (bl.t) {
      case 'p': {
        var hx = inline(bl.x).replace(/\n/g, '<br>');
        hx = hx.replace(/^(临床表现|证候分析|治法|代表方|方药|证候特点)：/, '<b class="fl">$1：</b>');
        return '<p>' + hx + '</p>';
      }
      case 'b': return '<div class="rich-b">' + inline(bl.x) + '</div>';
      case 'q': return '<blockquote>' + inline(bl.x).replace(/\n/g, '<br>') + '</blockquote>';
      case 'ul': return '<ul class="rich-ul">' + (bl.items || []).map(function (x) {
        return '<li>' + inline(x) + '</li>';
      }).join('') + '</ul>';
      case 'ol': return '<div class="rich-ol">' + (bl.items || []).map(function (x) {
        var m = String(x).match(/^(\d+)[.．、)]\s*([\s\S]*)$/);
        return '<div class="ol-i"><span class="ol-n">' + (m ? m[1] + '.' : '·') + '</span><span class="ol-x">' +
          inline(m ? m[2] : x) + '</span></div>';
      }).join('') + '</div>';
      case 'h': return '<div class="rich-h lv' + (bl.lv || 5) + '">' + inline(bl.x) + '</div>';
      case 'table': return tableHTML(bl);
      default: return '';
    }
  }
  function renderRich(input) {
    var blocks = Array.isArray(input) ? input : parseMdText(input);
    return blocks.map(blockHTML).join('');
  }
  function blocksOfField(input) {
    return Array.isArray(input) ? input : parseMdText(input);
  }
  function fieldText(input) {
    /* 供编辑面板：块 → 纯文本（保留 **粗体** / |表格| / - 列表 / 1. 列表 / > 引用） */
    if (typeof input === 'string') return input;
    if (!Array.isArray(input)) return '';
    var out = [];
    input.forEach(function (bl) {
      if (typeof bl === 'string') { out.push(bl); return; }
      if (!bl || !bl.t) return;
      if (bl.t === 'p' || bl.t === 'q') out.push((bl.t === 'q' ? '> ' : '') + bl.x);
      else if (bl.t === 'b') out.push('**' + bl.x + '**');
      else if (bl.t === 'ul') bl.items.forEach(function (x) { out.push('- ' + x); });
      else if (bl.t === 'ol') bl.items.forEach(function (x) { out.push(x); });
      else if (bl.t === 'h') out.push(bl.x);
      else if (bl.t === 'table') {
        if (bl.caption) out.push('**' + bl.caption + '**');
        out.push('| ' + bl.head.join(' | ') + ' |');
        out.push('| ' + bl.head.map(function () { return '---'; }).join(' | ') + ' |');
        bl.rows.forEach(function (r) { out.push('| ' + r.join(' | ') + ' |'); });
      }
    });
    return out.join('\n');
  }

  /* ---------------- 目录顺序（53 病证） ---------------- */
  var order = diseases.map(function (d) { return d.id; });
  var orderIndex = Object.create(null);
  order.forEach(function (id, i) { orderIndex[id] = i; });

  /* ---------------- 收藏 ---------------- */
  function isFav(id) { return !!store.fav.items[id]; }
  function favGroup(id) { return store.fav.items[id] || null; }
  function toggleFav(id, groupId) {
    if (store.fav.items[id]) delete store.fav.items[id];
    else store.fav.items[id] = groupId || (store.fav.groups[0] && store.fav.groups[0].id) || 'g0';
    save(true);
  }
  function favList(groupId) {
    return Object.keys(store.fav.items)
      .filter(function (id) { return byId[id] && (!groupId || store.fav.items[id] === groupId); })
      .sort(function (a, b) { return (orderIndex[a] || 0) - (orderIndex[b] || 0); });
  }

  /* ---------------- 隐藏 ---------------- */
  function isHidden(id) { return !!store.hidden[id]; }
  function setHidden(id, v) { if (v) store.hidden[id] = 1; else delete store.hidden[id]; save(true); }
  function hiddenCount() { return Object.keys(store.hidden).length; }

  /* ---------------- 笔记 ---------------- */
  function note(id) { var n = store.notes[id]; return n ? n.t : ''; }
  function setNote(id, text) {
    if (text && text.trim()) store.notes[id] = { t: text, ts: Date.now() };
    else delete store.notes[id];
    save(true);
  }
  function noteCount() { return Object.keys(store.notes).length; }

  /* ---------------- 搜索（病证名） ---------------- */
  function searchDiseases(kw) {
    kw = String(kw || '').trim().toLowerCase();
    if (!kw) return [];
    var res = [];
    diseases.forEach(function (d) {
      var n = d.name.toLowerCase();
      var score = n === kw ? 0 : (n.indexOf(kw) === 0 ? 1 : (n.indexOf(kw) >= 0 ? 2 : -1));
      if (score >= 0) res.push({ d: d, score: score, idx: orderIndex[d.id] || 0 });
    });
    res.sort(function (a, b) { return a.score - b.score || a.idx - b.idx; });
    return res.map(function (x) { return x.d; });
  }

  /* ---------------- 合并用户编辑后的视图 ---------------- */
  function view(d) {
    var e = store.edits[d.id] || {};
    var v = {
      id: d.id, name: d.name, kind: d.kind, parent: d.parent,
      chapterNo: d.chapterNo, chapterName: d.chapterName,
      attachIds: (d.attachIds || []).slice(),
      edited: Object.keys(e).length > 0
    };
    function field(key, orig) {
      return e[key] != null ? e[key] : orig;
    }
    v.yinbing = field('yinbing', d.yinbing);
    v.bingji = field('bingji', d.bingji);
    v.zhenduan = field('zhenduan', d.zhenduan);
    v.jianbie = field('jianbie', d.jianbie);
    v.bianzheng = field('bianzheng', d.bianzheng);
    v.zhize = field('zhize', d.zhize);
    v.linchuang = field('linchuang', d.linchuang);
    v.yufang = field('yufang', d.yufang);
    var se = e.syndrome || {};
    v.syndrome = (d.syndrome || []).map(function (s) {
      var o = se[s.id] || {};
      return {
        id: s.id, name: s.name, label: s.label, group: s.group,
        clinic: o.clinic != null ? o.clinic : s.clinic,
        analysis: o.analysis != null ? o.analysis : s.analysis,
        treat: o.treat != null ? o.treat : s.treat,
        formulaRaw: o.formulaRaw != null ? o.formulaRaw : s.formulaRaw,
        formulaName: o.formulaName != null ? o.formulaName : s.formulaName,
        fangjie: o.fangjie != null ? o.fangjie : s.fangjie
      };
    });
    v.hasEdit = (e.yinbing != null || e.bingji != null || e.zhenduan != null ||
      e.jianbie != null || e.bianzheng != null || e.zhize != null ||
      e.linchuang != null || e.yufang != null || (e.syndrome && Object.keys(e.syndrome).length));
    return v;
  }
  function viewAttach(a) {
    var e = store.edits[a.id] || {};
    return {
      id: a.id, name: a.name, kind: 'attach', parent: a.parent, parentName: a.parentName,
      chapterNo: a.chapterNo,
      raw: e.raw != null ? e.raw : a.raw,
      syndrome: a.syndrome || [],
      hasEdit: e.raw != null
    };
  }
  function clearEdits(id) {
    delete store.edits[id];
    save(true);
  }

  /* ---------------- 上一个/下一个（跳过隐藏） ---------------- */
  function navigate(id, dir) {
    var i = orderIndex[id];
    if (i == null) return null;
    var n = order.length;
    for (var step = 1; step <= n; step++) {
      var j = (i + dir * step + n * 2) % n;
      var cand = order[j];
      if (!isHidden(cand)) return cand;
    }
    return null;
  }
  function visibleCount() {
    return order.filter(function (id) { return !isHidden(id); }).length;
  }

  /* ---------------- 练习计数 ---------------- */
  function practiceTotal(rec) {
    if (!rec) return 0;
    if (rec.mode === 'mo') return rec.order.length;
    return (rec.qs || []).length;
  }
  function practiceDone(rec) {
    if (!rec) return 0;
    if (rec.mode === 'mo') return Object.keys(rec.submitted || {}).length;
    return (rec.qs || []).filter(function (q) { return q.done; }).length;
  }

  window.ZNK = {
    D: D, diseases: diseases, attaches: attaches, chapters: chapters,
    byId: byId, order: order, orderIndex: orderIndex,
    store: store, save: save, persist: persist,
    esc: esc, inline: inline, shuffle: shuffle, uniq: uniq, uniqBy: uniqBy,
    nowText: nowText, clip: clip,
    parseMdText: parseMdText, renderRich: renderRich, blocksOfField: blocksOfField,
    fieldText: fieldText, tableHTML: tableHTML,
    view: view, viewAttach: viewAttach, clearEdits: clearEdits,
    isFav: isFav, favGroup: favGroup, toggleFav: toggleFav, favList: favList,
    isHidden: isHidden, setHidden: setHidden, hiddenCount: hiddenCount,
    note: note, setNote: setNote, noteCount: noteCount,
    searchDiseases: searchDiseases,
    navigate: navigate, visibleCount: visibleCount,
    practiceTotal: practiceTotal, practiceDone: practiceDone
  };
})();
