(function () {
  'use strict';

  var DATA = window.WEEKLY_DEMO_DATA_V3;
  if (!DATA || !DATA.personas || !DATA.personas.length) {
    document.getElementById('singleMail').textContent = '演示数据未加载，请先运行 build_v3.py。';
    return;
  }
  var personas = DATA.personas;
  var state = {
    mode: 'single',
    current: Math.max(0, personas.findIndex(function (p) { return p.id === DATA.meta.defaultPersona; })),
    compareA: 'tech',
    compareB: 'income'
  };

  function el(id) { return document.getElementById(id); }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function dirOf(value) { return Number(value) < 0 ? 'down' : 'up'; }
  function fmtPct(value) { return (value >= 0 ? '+' : '') + Number(value).toFixed(2) + '%'; }
  function findPersona(id) { return personas.find(function (p) { return p.id === id; }) || personas[0]; }

  function mailHeader(persona) {
    var discovery = persona.mode === 'discovery';
    var reportTitle = discovery ? '热门港股周报' : '港股自选股周报';
    var countLabel = discovery ? '热门港股' : '港股自选';
    var context = discovery
      ? '<div class="report-context discovery"><strong>你还没有港股自选股</strong><p>本期先为你精选热门港股；添加后，下期将按你的名单生成。</p></div>'
      : '';
    return '<header class="mail-header"><div><div class="mail-brand">' +
      '<img class="mail-logo" src="assets/logo_blue@3x.png" alt="" width="34" height="34">' +
      '<div><p class="mail-kicker">YF HK WEEKLY · V3</p><h2>' + reportTitle + '</h2></div></div>' +
      '<div class="mail-meta"><span class="num">' + esc(DATA.meta.window) + '</span><span>' + countLabel + ' ' + persona.metrics.watchlistCount + ' 只</span><span>数据来源：Gangtise 投研</span></div></div>' +
      '<span class="ai-badge">AI 生成</span></header><div class="mail-body">' + context;
  }

  function overviewSection(o) {
    var html = '<section class="mail-section mail-overview"><div class="section-heading">' +
      '<span class="section-number">01</span><h3>本周一览</h3></div>';
    html += '<div class="index-grid">' + o.indices.map(function (ix) {
      return '<div class="index-tile"><span class="index-name">' + esc(ix.name) + '</span>' +
        '<strong class="index-value num">' + ix.last.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) + '</strong>' +
        '<span class="index-pct pct num ' + dirOf(ix.pct) + '">' + fmtPct(ix.pct) + '</span></div>';
    }).join('') + '</div>';
    html += '<div class="portfolio-box"><p>' + o.ups + ' 只上涨、' + o.downs + ' 只下跌，平均 <span class="pct num ' + dirOf(o.avg) + '">' + fmtPct(o.avg) + '</span></p>' +
      '<p>表现最好：' + esc(o.best.name) + ' <span class="pct num ' + dirOf(o.best.pct) + '">' + fmtPct(o.best.pct) + '</span>' +
      '　表现最弱：' + esc(o.worst.name) + ' <span class="pct num ' + dirOf(o.worst.pct) + '">' + fmtPct(o.worst.pct) + '</span></p></div></section>';
    return html;
  }

  function performanceSection(persona) {
    var html = '<section class="mail-section mail-performance"><div class="section-heading">' +
      '<span class="section-number">02</span><h3>' + (persona.mode === 'discovery' ? '热门港股本周表现' : '你的自选股本周表现') + '</h3>' +
      '<span>' + persona.performance.length + ' 只逐只展示</span></div>';
    html += persona.performance.map(function (s) {
      var d = dirOf(s.pct);
      return '<div class="stock-item"><div class="stock-head">' +
        '<span class="stock-direction ' + d + '">' + (d === 'up' ? '▲' : '▼') + '</span>' +
        '<span class="stock-name">' + esc(s.name) + '</span><span class="stock-code num">' + esc(s.shortCode) + '</span>' +
        '<span class="stock-pct pct num ' + d + '">' + fmtPct(s.pct) + '</span>' +
        '<span class="stock-close num">收 ' + s.close.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) + '</span></div>' +
        (s.summary ? '<p class="stock-summary">' + esc(s.summary) + '</p><span class="stock-source">Gangtise 看点</span>' : '') +
        (s.change ? '<p class="stock-change"><span class="block-tag">公司近况</span>' + esc(s.change) + '</p>' : '') +
        '</div>';
    }).join('');
    if (persona.restStat) {
      html += '<p class="section-note">其余 ' + persona.restStat.count + ' 只：' + persona.restStat.ups + ' 只上涨、' +
        persona.restStat.downs + ' 只下跌，平均 <span class="pct num ' + dirOf(persona.restStat.avg) + '">' + fmtPct(persona.restStat.avg) + '</span></p>';
    }
    return html + '</section>';
  }

  function cluesSection(persona) {
    var html = '<section class="mail-section mail-clues"><div class="section-heading">' +
      '<span class="section-number">03</span><h3>机构观点精选</h3>' +
      '<span>' + persona.clues.length + ' 条 · 摘要 200 字</span></div>';
    html += persona.clues.map(function (cl) {
      return '<div class="clue-item"><span class="clue-stock">' + esc(cl.label) + '</span>' +
        '<h4 class="clue-title">' + esc(cl.title) + '</h4>' +
        '<p class="clue-summary">' + esc(cl.summary) + '</p>' +
        '<span class="clue-source">' + esc(cl.publisher) + ' · ' + esc(cl.date) + '</span></div>';
    }).join('');
    if (!persona.clues.length) html += '<p class="generic-line">（本周无新增机构观点）</p>';
    html += '<p class="clue-more">摘要为节选，<a href="https://www.yfyy.com/download" target="_blank" rel="noopener noreferrer">下载云锋 App 查看完整内容</a></p>';
    return html + '</section>';
  }

  function catalystsSection(persona) {
    var html = '<section class="mail-section mail-catalysts"><div class="section-heading">' +
      '<span class="section-number">04</span><h3>后续关注</h3>' +
      '<span>' + persona.catalysts.length + ' 只有看点</span></div>';
    html += '<div class="catalyst-list">' + persona.catalysts.map(function (c) {
      return '<div class="catalyst-item"><div class="catalyst-stock"><strong>' + esc(c.name) + '</strong><span class="num">' + esc(c.shortCode) + '</span></div>' +
        c.events.map(function (ev) {
          return '<div class="catalyst-event"><span class="catalyst-date">' + esc(ev.when) + '</span><span class="catalyst-text">' + esc(ev.event) + '</span></div>';
        }).join('') +
        (c.watching.length ? '<p class="watching-title">机构在跟踪什么</p><ul class="watching-list">' + c.watching.map(function (w) {
          return '<li><strong>' + esc(w.title) + '</strong>　' + esc(w.text) + '</li>';
        }).join('') + '</ul>' : '') +
        '</div>';
    }).join('') + '</div>';
    if (persona.catalystNote) html += '<p class="section-note">' + esc(persona.catalystNote) + '</p>';
    return html + '</section>';
  }

  function hotSection(persona) {
    var discovery = persona.mode === 'discovery';
    var html = '<section class="mail-section mail-hot"><div class="section-heading">' +
      '<span class="section-number">05</span><h3>本周热点回顾</h3>' +
      '<span>' + persona.topics.length + ' 个话题</span></div>';
    html += '<div class="hot-list">' + persona.topics.map(function (t) {
      return '<div class="hot-item">' + (t.hit ? '<span class="hot-tag">' + (discovery ? '本周精选' : '含你的自选') + '</span>' : '') +
        '<h4 class="hot-title">' + esc(t.title) + '</h4>' +
        (t.event ? '<p class="hot-event">' + esc(t.event) + '</p>' : '') +
        '<p class="hot-related">相关标的：' + esc(t.related) + '</p></div>';
    }).join('') + '</div>';
    return html + '</section>';
  }

  function downloadCta(persona) {
    var discovery = persona.mode === 'discovery';
    var text = discovery
      ? '添加港股自选后，下期将按你的名单生成专属周报。'
      : '周报回顾截至周五收盘；通过云锋 App 查看最新港股行情与资讯。';
    var button = discovery ? '下载云锋 App 添加自选' : '下载云锋 App 看港股';
    return '<div class="app-cta"><div class="app-cta-copy"><strong>继续查看港股行情与资讯</strong>' +
      '<p>' + text + '</p><a class="download-button" href="https://www.yfyy.com/download" target="_blank" rel="noopener noreferrer">' + button + '</a></div>' +
      '<a class="qr-link" href="https://www.yfyy.com/download" target="_blank" rel="noopener noreferrer" aria-label="打开云锋 App 官方下载页">' +
      '<img src="download-qr.png" alt="扫码打开云锋 App 官方下载页" width="96" height="96" loading="lazy"><span>手机扫码继续</span></a></div>';
  }

  function mailMarkup(persona) {
    var html = mailHeader(persona);
    html += overviewSection(persona.overview);
    html += performanceSection(persona);
    html += cluesSection(persona);
    html += catalystsSection(persona);
    html += hotSection(persona) + downloadCta(persona);
    html += '</div><footer class="mail-footer">' +
      '<p class="legal-note">本内容基于公开信息由 AI 生成，不构成投资建议；内容截至周五收盘。</p>' +
      '<p class="unsubscribe-note">数据来源：Gangtise 投研｜退订：点击邮件底部「退订周报」</p></footer>';
    return html;
  }

  function insightMarkup(persona) {
    var m = persona.metrics;
    var discovery = persona.mode === 'discovery';
    var metrics = [
      [m.watchlistCount, discovery ? '热门港股（只）' : '港股自选（只）'],
      [m.shownStockCount, '逐只展示（只）'],
      [m.clueCount, '机构观点（条）'],
      [m.catalystCount, '催化事件（条）']
    ];
    return '<p class="insight-eyebrow">为什么 TA 看到这封</p><h2>' + esc(persona.name) + '</h2>' +
      '<p class="insight-summary">' + esc(persona.summary) + '</p>' +
      '<div class="metric-grid">' + metrics.map(function (item) {
        return '<div class="metric"><strong class="num">' + item[0] + '</strong><span>' + item[1] + '</span></div>';
      }).join('') + '</div>' +
      '<section class="insight-section"><h3>' + (discovery ? '本期热门港股' : 'TA 的港股自选') + '</h3>' +
      '<div class="watchlist">' + persona.watchlist.map(function (s) {
        return '<div class="watch-item"><span class="watch-name">' + esc(s.name) + '</span><span class="pct num ' + dirOf(s.pct) + '">' + fmtPct(s.pct) + '</span></div>';
      }).join('') + '</div></section>' +
      '<section class="insight-section"><h3>本封触发的组装规则</h3><ol class="rule-list">' + persona.rules.map(function (rule) {
        return '<li>' + esc(rule) + '</li>';
      }).join('') + '</ol><p class="char-note">正文约 ' + m.charCount.toLocaleString('zh-CN') + ' 字符 · 命中相关热点 ' + m.topicHitCount + ' 个</p></section>';
  }

  function renderPersonaCards() {
    el('personaGrid').innerHTML = personas.map(function (p, i) {
      var countLabel = p.mode === 'discovery' ? '热门兜底' : p.metrics.watchlistCount + ' 只港股';
      return '<button type="button" class="persona-card" data-index="' + i + '" aria-pressed="false">' +
        '<span class="persona-top"><span class="persona-number num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="persona-count num">' + countLabel + '</span></span>' +
        '<h3>' + esc(p.name) + '</h3><p>' + esc(p.summary) + '</p></button>';
    }).join('');
    el('personaGrid').querySelectorAll('.persona-card').forEach(function (button) {
      button.addEventListener('click', function () {
        state.current = Number(button.dataset.index);
        renderSingle();
      });
    });
  }

  function renderSingle() {
    var persona = personas[state.current];
    el('personaGrid').querySelectorAll('.persona-card').forEach(function (button, i) {
      var active = i === state.current;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    el('singleMail').innerHTML = mailMarkup(persona);
    el('insightPanel').innerHTML = insightMarkup(persona);
    el('liveStatus').textContent = '已切换到' + persona.name + '，纳入港股 ' + persona.metrics.watchlistCount + ' 只';
  }

  function renderCompare() {
    var a = findPersona(state.compareA);
    var b = findPersona(state.compareB);
    el('compareA').value = a.id;
    el('compareB').value = b.id;
    el('compareAHeader').innerHTML = '<strong>A · ' + esc(a.name) + '</strong><span>' + esc(a.summary) + '</span>';
    el('compareBHeader').innerHTML = '<strong>B · ' + esc(b.name) + '</strong><span>' + esc(b.summary) + '</span>';
    el('compareAMail').innerHTML = mailMarkup(a);
    el('compareBMail').innerHTML = mailMarkup(b);
    var rows = [
      ['纳入港股（只）', 'watchlistCount'],
      ['逐只展示（只）', 'shownStockCount'],
      ['机构观点（条）', 'clueCount'],
      ['催化事件（条）', 'catalystCount'],
      ['命中相关热点（个）', 'topicHitCount'],
      ['正文字符', 'charCount']
    ];
    el('compareSummary').innerHTML = '<div class="table-wrapper" tabindex="0" role="region" aria-label="两类用户周报内容对比">' +
      '<table class="compare-table"><caption>同一数据窗口 · 内容差异一览</caption><thead><tr><th scope="col">指标</th><th scope="col">A · ' + esc(a.short) + '</th><th scope="col">B · ' + esc(b.short) + '</th></tr></thead><tbody>' +
      rows.map(function (row) {
        return '<tr><th scope="row">' + row[0] + '</th><td>' + a.metrics[row[1]].toLocaleString('zh-CN') + '</td><td>' + b.metrics[row[1]].toLocaleString('zh-CN') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function setMode(mode) {
    state.mode = mode;
    var single = mode === 'single';
    el('singleMode').classList.toggle('active', single);
    el('compareMode').classList.toggle('active', !single);
    el('singleMode').setAttribute('aria-pressed', String(single));
    el('compareMode').setAttribute('aria-pressed', String(!single));
    el('personaGrid').hidden = !single;
    el('singleView').hidden = !single;
    el('comparePicker').hidden = single;
    el('compareView').hidden = single;
    el('controlTitle').textContent = single ? '选择一种用户视角' : '选择两类用户对比';
    if (single) renderSingle();
    else renderCompare();
  }

  function renderCompareOptions() {
    var options = personas.map(function (p) {
      return '<option value="' + esc(p.id) + '">' + esc(p.name) + ' · ' + p.metrics.watchlistCount + ' 只</option>';
    }).join('');
    el('compareA').innerHTML = options;
    el('compareB').innerHTML = options;
  }

  function init() {
    el('dataWindow').textContent = DATA.meta.window;
    el('personaModes').textContent = String(personas.length);
    renderPersonaCards();
    renderCompareOptions();
    el('compareA').addEventListener('change', function (e) { state.compareA = e.target.value; renderCompare(); });
    el('compareB').addEventListener('change', function (e) { state.compareB = e.target.value; renderCompare(); });
    el('singleMode').addEventListener('click', function () { setMode('single'); });
    el('compareMode').addEventListener('click', function () { setMode('compare'); });
    document.addEventListener('keydown', function (event) {
      if (state.mode !== 'single' || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
      if (event.target.closest('input, select, textarea, button')) return;
      event.preventDefault();
      var delta = event.key === 'ArrowRight' ? 1 : -1;
      state.current = (state.current + delta + personas.length) % personas.length;
      renderSingle();
    });
    renderSingle();
  }

  init();
})();
