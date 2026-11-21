/* 中医内科学 · 练习：默写 / 选择题 / 草稿 / 退出守卫 */
(function () {
  'use strict';
  var Z = window.ZNK, UI = window.ZNK_UI;
  var esc = Z.esc, icon = UI.icon;

  var LETTERS = 'ABCDEFGHIJKLMN';      /* 14 个字母，选项上限 12，绝不 undefined */
  var MAX_OPT = 12;
  var MAX_DRAFTS = 5;

  var st = { mode: 'mo', fields: [], sel: {}, order: 'random' };
  var run = null;                      /* 当前练习 */
  var draftSnap = null;                /* 最近一次自动保存快照 */

  function letter(i) { return LETTERS.charAt(i) || '?'; }
  function fieldsLabel(fields) {
    return (fields.indexOf('yinbing') >= 0 ? '病因' : '') +
      (fields.indexOf('yinbing') >= 0 && fields.indexOf('zhenzhi') >= 0 ? ' + ' : '') +
      (fields.indexOf('zhenzhi') >= 0 ? '证治分类' : '');
  }
  function modeLabel(m) { return m === 'mo' ? '默写' : '选择题'; }

  /* ---------------- 数据辅助 ---------------- */
  function allSyndromeNames(excludeId) {
    var out = [];
    Z.diseases.forEach(function (d) {
      if (d.id === excludeId) return;
      (d.syndrome || []).forEach(function (s) { out.push(s.name); });
    });
    Z.attaches.forEach(function (a) {
      (a.syndrome || []).forEach(function (s) { out.push(s.name); });
    });
    return Z.uniq(out);
  }
  function allTreats(excludeId) {
    var out = [];
    Z.diseases.forEach(function (d) {
      if (d.id === excludeId) return;
      (d.syndrome || []).forEach(function (s) { if (s.treat) out.push(s.treat); });
    });
    return Z.uniq(out);
  }
  function allFormulaNames(excludeId) {
    var out = [];
    Z.diseases.forEach(function (d) {
      if (d.id === excludeId) return;
      (d.syndrome || []).forEach(function (s) { if (s.formulaName) out.push(s.formulaName); });
    });
    return Z.uniq(out);
  }
  function allDiseaseNames(excludeId) {
    return Z.diseases.filter(function (d) { return d.id !== excludeId; }).map(function (d) { return d.name; });
  }
  function pickDecoys(pool, correct, n) {
    var p = Z.uniq(pool).filter(function (x) { return correct.indexOf(x) < 0; });
    return Z.shuffle(p).slice(0, n);
  }
  function excerpt(text, n) {
    var t = String(text || '').replace(/\*\*/g, '').replace(/\|/g, ' ').replace(/\n+/g, ' ').trim();
    return t.length > n ? t.slice(0, n) + '…' : t;
  }

  /* ---------------- 题目生成（选择题） ---------------- */
  /* 病因要点：取病因段的小标题（**1. 六淫病邪** 这类）拼成一句，如「六淫病邪、时行疫疠」 */
  function yinbingKey(d) {
    var keys = [];
    (d.yinbing || []).forEach(function (b) {
      if (b && b.t === 'b') {
        var k = String(b.x).replace(/^\d+[.、]\s*/, '').trim();
        if (k) keys.push(k);
      }
    });
    if (keys.length) return keys.join('、');
    return excerpt(Z.fieldText(d.yinbing), 40);
  }
  function makeYinbingQ(d) {
    var correctText = yinbingKey(d);
    var pool = [];
    Z.diseases.forEach(function (x) {
      if (x.id === d.id) return;
      var k = yinbingKey(Z.view(x));
      if (k && k !== correctText) pool.push(k);
    });
    var decoys = Z.shuffle(Z.uniq(pool)).slice(0, 3);
    var opts = Z.shuffle([correctText].concat(decoys));
    return {
      kind: 'single', tag: '病因',
      stem: '「' + esc(d.name) + '」的病因是？',
      opts: opts, correct: [opts.indexOf(correctText)], chosen: [], done: false, synIdx: -1
    };
  }
  function makeMultiQ(d) {
    var names = Z.uniq((d.syndrome || []).map(function (s) { return s.name; }));
    var correctN = Math.min(names.length, 6);
    var correctNames = Z.shuffle(names).slice(0, correctN);
    var decoyN = Math.min(MAX_OPT - correctN, Math.max(2, Math.round(correctN * 1.2)));
    var decoys = pickDecoys(allSyndromeNames(d.id), names, decoyN);
    var opts = Z.shuffle(correctNames.concat(decoys));
    return {
      kind: 'multi', tag: '证治分类',
      stem: '「' + esc(d.name) + '」的证治分类包括以下哪些证型？<span class="tiny dim">（多选，共 ' + correctN + ' 个正确项）</span>',
      opts: opts,
      correct: correctNames.map(function (x) { return opts.indexOf(x); }).sort(function (a, b) { return a - b; }),
      chosen: [], done: false
    };
  }
  function makeFieldQ(d, s, field) {
    var correctText = field === 'name' ? s.name : (field === 'treat' ? s.treat : s.formulaName);
    var pool = field === 'name' ? allSyndromeNames(d.id) : (field === 'treat' ? allTreats(d.id) : allFormulaNames(d.id));
    var decoys = pickDecoys(pool, [correctText], 3);
    var opts = Z.shuffle([correctText].concat(decoys));
    var label = field === 'name' ? '证候名称' : (field === 'treat' ? '治法' : '代表方');
    var clinic = String(s.clinic || '').trim();
    return {
      kind: 'single', tag: label,
      stem: '病证「' + esc(d.name) + '」中，临床表现「<span class="q-quote">' + esc(clinic) +
        '</span>」的' + label + '是？',
      opts: opts, correct: [opts.indexOf(correctText)], chosen: [], done: false,
      synIdx: s.__idx
    };
  }
  function buildQuestions(d) {
    var qs = [];
    if (st.fields.indexOf('yinbing') >= 0) qs.push(makeYinbingQ(d));
    if (st.fields.indexOf('zhenzhi') >= 0) {
      qs.push(makeMultiQ(d));
      (d.syndrome || []).forEach(function (s, si) {
        s.__idx = si;
        qs.push(makeFieldQ(d, s, 'name'));
        qs.push(makeFieldQ(d, s, 'treat'));
        qs.push(makeFieldQ(d, s, 'formula'));
        delete s.__idx;
      });
    }
    return qs;
  }
  function qcountFor(d) {
    var n = 0;
    if (st.fields.indexOf('yinbing') >= 0) n += 1;
    if (st.fields.indexOf('zhenzhi') >= 0) n += 1 + 3 * ((d.syndrome || []).length);
    return n;
  }

  /* ---------------- 运行状态 ---------------- */
  function newRun(mode, fields, ids) {
    var r = {
      mode: mode, fields: fields.slice(), order: Z.shuffle(ids.slice()),
      idx: 0, answers: {}, submitted: {}, qcache: {}, ts: Date.now(), done: false
    };
    if (st.order === 'catalog') r.order = ids.slice();
    return r;
  }
  function curDisease() {
    if (!run) return null;
    var id = run.order[run.idx];
    var d = Z.byId[id];
    return d ? Z.view(d) : null;
  }
  function totalQuestions() {
    if (!run) return 0;
    if (run.mode === 'mo') return run.order.length;   /* 默写：一个病证算一题 */
    var n = 0;
    run.order.forEach(function (id) {
      var d = Z.byId[id];
      if (d) n += qcountFor(Z.view(d));
    });
    return n;
  }
  function doneQuestions() {
    if (!run) return 0;
    var n = 0;
    if (run.mode === 'mo') {
      run.order.forEach(function (id) { if (run.submitted[id]) n += 1; });
      return n;
    }
    run.order.forEach(function (id) {
      (run.qcache[id] || []).forEach(function (q) { if (q.done) n += 1; });
    });
    return n;
  }

  /* ---------------- 草稿 ---------------- */
  function captureDom() {
    /* 把当前默写页输入框内容抓进 run.answers（切题/退出/保存草稿前调用） */
    if (!run || run.mode !== 'mo') return;
    var d = curDisease();
    if (!d) return;
    var box = document.getElementById('mo-box');
    if (!box) return;
    var ans = run.answers[d.id] || (run.answers[d.id] = { syn: {} });
    var yb = box.querySelector('[data-mo="yinbing"]');
    if (yb) ans.yinbing = yb.value;
    box.querySelectorAll('[data-mo-syn]').forEach(function (inp) {
      var sid = inp.getAttribute('data-mo-syn');
      var f = inp.getAttribute('data-mo-f');
      ans.syn[sid] = ans.syn[sid] || {};
      ans.syn[sid][f] = inp.value;
    });
  }
  function saveDraft(silent) {
    if (!run) return false;
    captureDom();
    var d = curDisease();
    var snap = JSON.parse(JSON.stringify({
      mode: run.mode, fields: run.fields, order: run.order, idx: run.idx,
      answers: run.answers, submitted: run.submitted, qcache: run.qcache,
      ts: Date.now(), done: run.done,
      title: (d ? d.name : '') + ' · ' + modeLabel(run.mode) + ' · ' + fieldsLabel(run.fields),
      progress: doneQuestions() + '/' + totalQuestions()
    }));
    /* 同一练习只保留最新一份：按 order 前 40 个字符去重 */
    var key = run.order.join(',');
    Z.store.drafts = Z.store.drafts.filter(function (x) { return x.key !== key; });
    snap.key = key;
    Z.store.drafts.unshift(snap);
    if (Z.store.drafts.length > MAX_DRAFTS) Z.store.drafts = Z.store.drafts.slice(0, MAX_DRAFTS);
    Z.save(true);
    if (!silent) UI.toast('练习已保存，可在「练习」页继续');
    return true;
  }

  /* ---------------- 练习首页 ---------------- */
  function renderHome(main) {
    UI.header({ title: '练习', sub: '默写 · 选择题' });
    var h = [];
    h.push('<div class="tile-grid">' +
      '<a class="tile" href="#/setup/mo"><div class="t-ic">✍</div><div class="t-t">默写练习</div>' +
      '<div class="t-s">看名答病因 / 证治分类（3 小题）</div></a>' +
      '<a class="tile" href="#/setup/tc"><div class="t-ic">☑</div><div class="t-t">选择题</div>' +
      '<div class="t-s">证型多选 + 每证型 3 小题</div></a>' +
      '</div>');
    var drafts = Z.store.drafts || [];
    h.push('<div class="card"><div class="row between mb8"><b>未完成练习</b><span class="tiny dim">最多保留 ' + MAX_DRAFTS + ' 份</span></div>');
    if (!drafts.length) {
      h.push('<p class="small muted">暂无。练习中途退出会自动保存到这里。</p>');
    } else {
      drafts.forEach(function (dr, i) {
        h.push('<div class="draft-row"><div class="grow"><div class="d-t">' + esc(dr.title || '练习') + '</div>' +
          '<div class="tiny dim">' + esc(Z.nowText(dr.ts)) + ' · 进度 ' + esc(dr.progress || '') + '</div></div>' +
          '<button class="btn xs primary" data-dres="' + i + '">继续</button>' +
          '<button class="btn xs danger" data-ddel="' + i + '">删除</button></div>');
      });
    }
    h.push('</div>');
    h.push('<div class="card flat"><p class="small muted" style="margin:0">练习中途退出时，已回答的内容会自动保存；保存的练习记录都能在「练习」页面找到。</p></div>');
    main.innerHTML = h.join('');
    main.querySelectorAll('[data-dres]').forEach(function (b) {
      b.onclick = function () {
        var dr = Z.store.drafts[+b.getAttribute('data-dres')];
        if (!dr) return;
        run = JSON.parse(JSON.stringify(dr));
        run.key = dr.key;
        st.mode = run.mode; st.fields = run.fields.slice();
        UI.go('#/run/' + run.mode);
      };
    });
    main.querySelectorAll('[data-ddel]').forEach(function (b) {
      b.onclick = function () {
        var i = +b.getAttribute('data-ddel');
        UI.confirmDialog('删除草稿', '确定删除这份未完成练习？', '删除', '取消').then(function (ok) {
          if (!ok) return;
          Z.store.drafts.splice(i, 1); Z.save(true); renderHome(main);
        });
      };
    });
  }

  /* ---------------- 设置页 ---------------- */
  function renderSetup(main, p) {
    var mode = p[0] === 'tc' ? 'tc' : 'mo';
    st.mode = mode;
    UI.header({ title: modeLabel(mode) + ' · 设置', back: true });

    var h = [];
    h.push('<div class="card"><div class="row between mb8"><b>范围</b>' +
      '<span class="tiny dim">已选 <b id="sc-n">' + selCount() + '</b> 个病证</span></div>');
    h.push('<div class="row wrap" style="gap:6px;margin-bottom:8px">' +
      '<button class="btn xs" id="sel-all">全选 53</button>' +
      '<button class="btn xs" id="sel-none">清空</button></div>');
    /* 按章列出（53 个病证） */
    h.push('<div class="pick-list">');
    Z.diseases.forEach(function (d) {
      h.push('<label class="pick"><input type="checkbox" data-sel="' + d.id + '"' + (st.sel[d.id] ? ' checked' : '') + '>' +
        '<span class="pk-nm">' + esc(d.name) + '</span>' +
        '<span class="tiny dim">' + esc(d.chapterNo) + '</span></label>');
    });
    h.push('</div></div>');

    h.push('<div class="card"><b>内容</b>' +
      '<div class="row wrap" style="gap:6px;margin-top:8px">' +
      '<button class="chip' + (st.fields.indexOf('yinbing') >= 0 ? ' on' : '') + '" data-fld="yinbing">病因</button>' +
      '<button class="chip' + (st.fields.indexOf('zhenzhi') >= 0 ? ' on' : '') + '" data-fld="zhenzhi">证治分类</button>' +
      '</div><p class="tiny dim" style="margin:8px 0 0">默写：病因整段作答；证治分类每个证型 3 小题（名称 / 治法 / 代表方）。</p></div>');

    h.push('<div class="card"><b>顺序</b><div class="row" style="gap:6px;margin-top:8px">' +
      '<button class="chip' + (st.order === 'random' ? ' on' : '') + '" data-ord="random">随机</button>' +
      '<button class="chip' + (st.order === 'catalog' ? ' on' : '') + '" data-ord="catalog">按目录</button>' +
      '</div></div>');

    h.push('<button class="btn primary block" id="start-btn" style="height:46px">开始练习</button>');
    main.innerHTML = h.join('');

    function updateStart() {
      var ok = selCount() > 0 && st.fields.length > 0;
      var b = main.querySelector('#start-btn');
      if (b) b.disabled = !ok;
      var n = main.querySelector('#sc-n');
      if (n) n.textContent = selCount();
    }
    main.querySelectorAll('[data-sel]').forEach(function (ck) {
      ck.onchange = function () {
        var id = ck.getAttribute('data-sel');
        if (ck.checked) st.sel[id] = 1; else delete st.sel[id];
        updateStart();
      };
    });
    main.querySelector('#sel-all').onclick = function () {
      Z.diseases.forEach(function (d) { st.sel[d.id] = 1; });
      main.querySelectorAll('[data-sel]').forEach(function (ck) { ck.checked = true; });
      updateStart();
    };
    main.querySelector('#sel-none').onclick = function () {
      st.sel = {};
      main.querySelectorAll('[data-sel]').forEach(function (ck) { ck.checked = false; });
      updateStart();
    };
    main.querySelectorAll('[data-fld]').forEach(function (b) {
      b.onclick = function () {
        var f = b.getAttribute('data-fld');
        var i = st.fields.indexOf(f);
        if (i >= 0) st.fields.splice(i, 1); else st.fields.push(f);
        b.classList.toggle('on', st.fields.indexOf(f) >= 0);
        updateStart();
      };
    });
    main.querySelectorAll('[data-ord]').forEach(function (b) {
      b.onclick = function () {
        st.order = b.getAttribute('data-ord');
        main.querySelectorAll('[data-ord]').forEach(function (x) { x.classList.toggle('on', x === b); });
      };
    });
    main.querySelector('#start-btn').onclick = function () {
      var ids = Z.diseases.map(function (d) { return d.id; }).filter(function (id) { return st.sel[id]; });
      run = newRun(mode, st.fields, ids);
      UI.go('#/run/' + mode);
    };
    updateStart();
  }
  function selCount() { return Object.keys(st.sel).length; }

  /* ---------------- 运行页 ---------------- */
  function renderRun(main, p) {
    if (!run) { UI.go('#/practice'); return; }
    var d = curDisease();
    if (!d) { finishRun(true); return; }
    UI.header({
      title: modeLabel(run.mode) + ' · ' + (run.idx + 1) + '/' + run.order.length,
      sub: fieldsLabel(run.fields),
      back: true,
      actions: [{ text: '结束', label: '结束练习', onClick: requestFinish }]
    });
    var h = [];
    h.push('<div class="card flat" style="padding:9px 12px"><div class="row between">' +
      '<span class="small muted">已完成 ' + doneQuestions() + ' / ' + totalQuestions() + ' 题</span>' +
      '<span class="small muted">' + esc(d.name) + '</span></div>' +
      progressBar(doneQuestions(), totalQuestions()) + '</div>');
    if (run.mode === 'mo') {
      h.push(moBody(d));
    } else {
      h.push(tcBody(d));
    }
    h.push('<div class="pager-row">' +
      '<button class="btn sm" id="r-prev"' + (run.idx <= 0 ? ' disabled' : '') + '>‹ 上一题</button>' +
      '<button class="btn sm" id="r-next">' + (run.idx >= run.order.length - 1 ? '完成练习 ›' : '下一题 ›') + '</button>' +
      '</div>');
    main.innerHTML = h.join('');
    bindRun(main, d);
  }
  function progressBar(done, total) {
    var pct = total ? Math.round(done * 100 / total) : 0;
    return '<div class="pbar"><i style="width:' + pct + '%"></i></div>';
  }

  /* ---------- 默写 ---------- */
  function moBody(d) {
    var h = [];
    h.push('<div class="card"><div class="q-hd"><span class="q-nm">' + esc(d.name) + '</span>' +
      '<span class="chip gray tiny">' + esc(d.chapterNo) + '</span></div>');
    h.push('<div id="mo-box">');
    if (run.fields.indexOf('yinbing') >= 0) {
      h.push('<div class="sub-h">病因</div>' +
        '<textarea class="textarea mo-ta" data-mo="yinbing" placeholder="默写病因…">' +
        esc(moAns(d.id, null, 'yinbing')) + '</textarea>');
    }
    if (run.fields.indexOf('zhenzhi') >= 0) {
      h.push('<div class="sub-h">证治分类 <span class="tiny dim">（每个证型 3 小题：证候名称 / 治法 / 代表方）</span></div>');
      (d.syndrome || []).forEach(function (s, i) {
        var a = moAns(d.id, s.id);
        h.push('<div class="mo-syn"><div class="mo-syn-h">第 ' + (i + 1) + ' 证</div>' +
          '<div class="mo-row"><label>证候名称</label><input class="input" data-mo-syn="' + s.id + '" data-mo-f="name" value="' + esc(a.name || '') + '" placeholder="证候名称"></div>' +
          '<div class="mo-row"><label>治法</label><input class="input" data-mo-syn="' + s.id + '" data-mo-f="treat" value="' + esc(a.treat || '') + '" placeholder="治法"></div>' +
          '<div class="mo-row"><label>代表方</label><input class="input" data-mo-syn="' + s.id + '" data-mo-f="formula" value="' + esc(a.formula || '') + '" placeholder="方名（含加减）"></div>' +
          '</div>');
      });
    }
    h.push('</div>');
    h.push('<div class="row" style="gap:8px;margin-top:10px">' +
      '<button class="btn primary grow" id="mo-submit">提交，显示答案</button></div>');
    h.push('<div id="mo-ans"></div>');
    if (run.submitted[d.id]) h.push(moAnswersHTML(d));
    h.push('</div>');
    return h.join('');
  }
  function moAns(did, sid, field) {
    var a = run.answers[did] || { syn: {} };
    if (sid == null) return a[field] || '';
    var s = a.syn[sid] || {};
    return s[field] || '';
  }
  function moAnswersHTML(d) {
    var h = ['<div class="ans-box"><div class="ans-h">参考答案 <span class="tiny dim">（自行校对）</span></div>'];
    if (run.fields.indexOf('yinbing') >= 0) {
      h.push('<div class="ans-sec"><div class="ans-t">病因</div><div class="rich">' +
        Z.renderRich(Z.blocksOfField(d.yinbing)) + '</div></div>');
    }
    if (run.fields.indexOf('zhenzhi') >= 0) {
      h.push('<div class="ans-sec"><div class="ans-t">证治分类</div>');
      (d.syndrome || []).forEach(function (s) {
        h.push('<div class="ans-syn"><div class="as-nm">' + esc(s.name) + '</div>' +
          '<div class="as-row"><b>证候名称：</b>' + esc(s.name) + '</div>' +
          '<div class="as-row"><b>治法：</b>' + esc(s.treat) + '</div>' +
          '<div class="as-row"><b>代表方：</b>' + esc(s.formulaName) + '</div>' +
          '<details class="as-more"><summary>临床表现 / 证候分析</summary>' +
          '<div class="rich"><p><b class="fl">临床表现：</b>' + Z.inline(s.clinic) + '</p>' +
          '<p><b class="fl">证候分析：</b>' + Z.inline(s.analysis) + '</p>' +
          (s.fangjie ? '<p class="fj"><b class="fl">方解：</b>' + Z.inline(s.fangjie) + '</p>' : '') +
          '</div></details></div>');
      });
      h.push('</div>');
    }
    h.push('</div>');
    return h.join('');
  }

  /* ---------- 选择题 ---------- */
  function tcBody(d) {
    if (!run.qcache[d.id]) run.qcache[d.id] = buildQuestions(d);
    var qs = run.qcache[d.id];
    var h = ['<div class="card"><div class="q-hd"><span class="q-nm">' + esc(d.name) + '</span>' +
      '<span class="chip gray tiny">' + esc(d.chapterNo) + '</span>' +
      '<span class="chip gray tiny">' + qs.length + ' 题</span></div>'];
    var lastSyn = -2;
    qs.forEach(function (q, qi) {
      if (q.synIdx != null && q.synIdx >= 0 && q.synIdx !== lastSyn) {
        if (lastSyn >= 0) h.push('<hr class="q-sep">');
        h.push('<div class="q-syn"><span class="q-syn-n">证型 ' + (q.synIdx + 1) + '</span></div>');
        lastSyn = q.synIdx;
      }
      h.push('<div class="q" data-q="' + qi + '">');
      h.push('<div class="q-stem"><span class="q-tag">' + esc(q.tag) + '</span>' + q.stem + '</div>');
      h.push('<div class="q-opts">');
      q.opts.forEach(function (o, oi) {
        var mark = '';
        var cls = '';
        if (q.done) {
          if (q.correct.indexOf(oi) >= 0) cls = ' right';
          if (q.chosen.indexOf(oi) >= 0 && q.correct.indexOf(oi) < 0) cls = ' wrong';
          if (q.chosen.indexOf(oi) >= 0 && q.correct.indexOf(oi) >= 0) cls = ' right chosen';
        } else if (q.chosen.indexOf(oi) >= 0) {
          cls = ' chosen';
        }
        mark = '<span class="q-lt">' + letter(oi) + '</span>';
        h.push('<button class="q-opt' + cls + '" data-qo="' + qi + '-' + oi + '"' + (q.done ? ' disabled' : '') + '>' +
          mark + '<span class="q-ot">' + esc(o) + '</span></button>');
      });
      h.push('</div>');
      if (!q.done) {
        h.push('<div class="q-ft"><button class="btn xs primary" data-qs="' + qi + '">提交本题</button></div>');
      } else {
        var okAll = q.chosen.length === q.correct.length && q.chosen.every(function (c) { return q.correct.indexOf(c) >= 0; });
        h.push('<div class="q-res' + (okAll ? ' ok' : ' bad') + '">' +
          (okAll ? '✓ 回答正确' : '✗ 回答有误') +
          '<span class="tiny dim"> 正确答案：' + q.correct.map(function (i) { return letter(i); }).join('') + '</span></div>');
      }
      h.push('</div>');
    });
    h.push('</div>');
    return h.join('');
  }

  function bindRun(main, d) {
    var pv = main.querySelector('#r-prev');
    if (pv) pv.onclick = function () { captureDom(); run.idx--; UI.go('#/run/' + run.mode); };
    var nx = main.querySelector('#r-next');
    if (nx) nx.onclick = function () {
      captureDom();
      if (run.idx >= run.order.length - 1) { requestFinish(true); return; }
      run.idx++; UI.go('#/run/' + run.mode);
    };
    var sb = main.querySelector('#mo-submit');
    if (sb) sb.onclick = function () {
      captureDom();
      run.submitted[d.id] = true;
      UI.go('#/run/' + run.mode);
    };
    main.querySelectorAll('[data-qo]').forEach(function (b) {
      b.onclick = function () {
        var parts = b.getAttribute('data-qo').split('-');
        var qi = +parts[0], oi = +parts[1];
        var q = (run.qcache[d.id] || [])[qi];
        if (!q || q.done) return;
        if (q.kind === 'multi') {
          var i = q.chosen.indexOf(oi);
          if (i >= 0) q.chosen.splice(i, 1); else q.chosen.push(oi);
        } else {
          q.chosen = [oi];
        }
        /* 原地更新本题选项状态，避免整页重绘导致滚动回顶部 */
        var box = b.closest('.q');
        if (box) {
          box.querySelectorAll('[data-qo]').forEach(function (ob) {
            var oi2 = +ob.getAttribute('data-qo').split('-')[1];
            ob.classList.toggle('chosen', q.chosen.indexOf(oi2) >= 0);
          });
        }
      };
    });
    main.querySelectorAll('[data-qs]').forEach(function (b) {
      b.onclick = function () {
        var qi = +b.getAttribute('data-qs');
        var q = (run.qcache[d.id] || [])[qi];
        if (!q || q.done) return;
        if (!q.chosen.length) { UI.toast('先选一个选项'); return; }
        q.done = true;
        var y = window.scrollY;
        UI.go('#/run/' + run.mode);
        window.scrollTo(0, y);
      };
    });
  }

  /* ---------------- 结束 / 退出 ---------------- */
  function requestFinish(quiet) {
    if (!run) { UI.go('#/practice'); return; }
    var done = doneQuestions(), total = totalQuestions();
    if (quiet && done < total) {
      UI.confirmDialog('还没做完', '已完成 ' + done + '/' + total + '。现在结束并保存，之后可在「练习」页继续？', '结束并保存', '继续练习')
        .then(function (ok) { if (ok) doFinish(); });
      return;
    }
    doFinish();
  }
  function doFinish() {
    captureDom();
    var done = doneQuestions();
    var total = totalQuestions();
    var all = done >= total && total > 0;
    var mode = run.mode;
    if (!all) saveDraft(true);
    else { Z.store.drafts = Z.store.drafts.filter(function (x) { return x.key !== run.key; }); Z.save(true); }
    run = null;
    if (all) {
      var msg = mode === 'mo'
        ? '已完成全部 ' + total + ' 个病证。'
        : '已完成全部 ' + total + ' 题。';
      UI.dialog({
        title: '练习完成',
        text: msg,
        buttons: [{ text: '回练习页', value: true, primary: true }]
      }).then(function () { UI.go('#/practice'); });
    } else {
      UI.toast('已保存，可在「练习」页继续');
      UI.go('#/practice');
    }
  }

  /* 路由守卫：run 存在且未结束 → 确认 */
  var guardOpen = false;
  function runHash() { return '#/run/' + (run ? run.mode : 'mo'); }
  function beforeRoute(hash) {
    if (!run || run.done) return true;
    if (hash.indexOf('#/run/') === 0) return true;
    if (guardOpen) return false;
    guardOpen = true;
    var prevHash = location.hash || runHash();
    captureDom();
    UI.dialog({
      title: '退出练习',
      text: '退出后已回答的内容会自动保存，保存的练习记录都能在「练习」页面找到。',
      buttons: [
        { text: '继续练习', value: false },
        { text: '退出并保存', value: true, primary: true }
      ]
    }).then(function (ok) {
      guardOpen = false;
      if (ok) {
        saveDraft(true);
        run = null;
        if (location.hash === hash) UI.render();   /* 目标 hash 已生效，需手动重绘 */
        else location.hash = hash;
      } else {
        /* 取消：把地址栏恢复到练习页（用 replaceState 避免再次触发守卫） */
        try { history.replaceState(null, '', prevHash); } catch (e) { }
      }
    });
    return false;
  }

  /* 浏览器返回键 / 页面离开 */
  window.addEventListener('beforeunload', function (e) {
    if (run && !run.done) {
      captureDom();
      saveDraft(true);
      e.preventDefault();
      e.returnValue = '';
    }
  });

  UI.VIEWS.practice = renderHome;
  UI.VIEWS.setup = renderSetup;
  UI.VIEWS.run = renderRun;
  window.ZNK_PRACTICE = { beforeRoute: beforeRoute, _buildQuestions: buildQuestions, _setFields: function (f) { st.fields = f; }, _setOrder: function (o) { st.order = o; } };
})();
