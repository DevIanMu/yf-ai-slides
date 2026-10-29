(function () {
  'use strict';

  var DATA_SETS = [
    { id: 'latest', data: window.WEEKLY_DEMO_DATA_LATEST },
    { id: 'history', data: window.WEEKLY_DEMO_DATA }
  ].filter(function (item) { return item.data && item.data.personas && item.data.personas.length; });
  if (!DATA_SETS.length) {
    document.getElementById('singleMail').textContent = '演示数据未加载，请先运行 build_demo.py。';
    return;
  }

  var DATA = DATA_SETS[0].data;
  var personas = DATA.personas;
  var state = {
    version: DATA_SETS[0].id,
    mode: 'single',
    current: Math.max(0, personas.findIndex(function (p) { return p.id === DATA.meta.defaultPersona; })),
    compareA: 'tech',
    compareB: 'income'
  };
  var sectionTypes = {
    '本周一览': 'overview',
    '一、你的自选股本周表现': 'performance',
    '一、热门港股本周表现': 'performance',
    '二、机构观点精选': 'clues',
    '三、后续关注': 'catalysts',
    '四、本周热点回顾': 'hot'
  };
  var sectionNumbers = { overview: '01', performance: '02', clues: '03', catalysts: '04', hot: '05' };

  function el(id) { return document.getElementById(id); }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function direction(value) { return String(value).trim().startsWith('-') ? 'down' : 'up'; }
  function inline(value) {
    return esc(value).replace(/([+-]\d+(?:\.\d+)?%)/g, function (_, pct) {
      return '<span class="pct num ' + direction(pct) + '">' + pct + '</span>';
    });
  }
  function fmtPct(value) { return (value >= 0 ? '+' : '') + Number(value).toFixed(2) + '%'; }
  function findPersona(id) { return personas.find(function (p) { return p.id === id; }) || personas[0]; }
  function cleanLines(lines) {
    return lines.map(function (line) { return line.trim(); }).filter(function (line) {
      return line && !/^[=]+$/.test(line);
    });
  }

  function parseEmail(raw) {
    var sections = [];
    var footer = [];
    var current = null;
    var inFooter = false;
    raw.split('\n').forEach(function (line) {
      var trimmed = line.trim();
      var heading = trimmed.match(/^【(.+)】$/);
      if (heading) {
        current = { title: heading[1], type: sectionTypes[heading[1]] || 'generic', lines: [] };
        sections.push(current);
        return;
      }
      if (/^-{10,}$/.test(trimmed)) {
        current = null;
        inFooter = true;
        return;
      }
      if (current) current.lines.push(line);
      else if (inFooter && trimmed) footer.push(trimmed);
    });
    return { sections: sections, footer: footer };
  }

  function sectionStart(type, title, suffix) {
    return '<section class="mail-section mail-' + type + '"><div class="section-heading">' +
      '<span class="section-number">' + sectionNumbers[type] + '</span><h3>' + esc(title) + '</h3>' +
      (suffix ? '<span>' + esc(suffix) + '</span>' : '') + '</div>';
  }

  function renderOverview(section) {
    var lines = cleanLines(section.lines);
    var indices = [];
    var portfolio = [];
    lines.forEach(function (line) {
      var match = line.match(/^(.+?)\s+([\d,]+\.\d+)（本周\s+([+-][\d.]+%)）$/);
      if (match) indices.push(match);
      else portfolio.push(line);
    });
    var html = sectionStart('overview', section.title);
    html += '<div class="index-grid">' + indices.map(function (m) {
      return '<div class="index-tile"><span class="index-name">' + esc(m[1]) + '</span>' +
        '<strong class="index-value num">' + esc(m[2]) + '</strong>' +
        '<span class="index-pct pct num ' + direction(m[3]) + '">' + esc(m[3]) + '</span></div>';
    }).join('') + '</div>';
    html += '<div class="portfolio-box">' + portfolio.map(function (line) {
      return '<p>' + inline(line) + '</p>';
    }).join('') + '</div></section>';
    return html;
  }

  function renderPerformance(section) {
    var items = [];
    var notes = [];
    var current = null;
    cleanLines(section.lines).forEach(function (line) {
      var stock = line.match(/^([▲▼])\s+(.+?)\s+(\d{5})　([+-]\d+\.\d+%)　收\s+([\d,]+\.\d+)$/);
      if (stock) {
        current = { arrow: stock[1], name: stock[2], code: stock[3], pct: stock[4], close: stock[5], summary: '', source: '' };
        items.push(current);
        return;
      }
      var summary = line.match(/^(.*?)　（Gangtise 看点 ·\s*([^）]+)）$/);
      if (summary && current) {
        current.summary = summary[1];
        current.source = summary[2];
      } else if (line.startsWith('…') || line.startsWith('（')) notes.push(line);
    });
    var html = sectionStart('performance', section.title, items.length + ' 只逐只展示');
    html += items.map(function (item) {
      var dir = item.arrow === '▼' ? 'down' : 'up';
      return '<div class="stock-item"><div class="stock-head">' +
        '<span class="stock-direction ' + dir + '" aria-label="' + (dir === 'up' ? '上涨' : '下跌') + '">' + item.arrow + '</span>' +
        '<span class="stock-name">' + esc(item.name) + '</span><span class="stock-code num">' + esc(item.code) + '</span>' +
        '<span class="stock-pct pct num ' + dir + '">' + esc(item.pct) + '</span>' +
        '<span class="stock-close num">收 ' + esc(item.close) + '</span></div>' +
        (item.summary ? '<p class="stock-summary">' + inline(item.summary) + '</p><span class="stock-source">Gangtise 看点 · ' + esc(item.source) + '</span>' : '') +
        '</div>';
    }).join('');
    html += notes.map(function (note) { return '<p class="section-note">' + inline(note) + '</p>'; }).join('');
    return html + '</section>';
  }

  function renderClues(section) {
    var items = [];
    var generic = [];
    var current = null;
    cleanLines(section.lines).forEach(function (line) {
      var clue = line.match(/^▸\s+(.+?)｜(.*)$/);
      if (clue) {
        current = { stock: clue[1], title: clue[2], summary: '', source: '', date: '' };
        items.push(current);
        return;
      }
      var summary = line.match(/^(.*?)　（(.*?) ·\s*(\d{2}-\d{2})）$/);
      if (summary && current) {
        current.summary = summary[1];
        current.source = summary[2];
        current.date = summary[3];
      } else generic.push(line);
    });
    var html = sectionStart('clues', section.title, items.length + ' 条');
    html += items.map(function (item) {
      return '<div class="clue-item"><span class="clue-stock">' + esc(item.stock) + '</span>' +
        '<h4 class="clue-title">' + inline(item.title) + '</h4>' +
        '<p class="clue-summary">' + inline(item.summary) + '</p>' +
        '<span class="clue-source">' + esc(item.source) + ' · ' + esc(item.date) + '</span></div>';
    }).join('');
    html += generic.map(function (line) { return '<p class="generic-line">' + inline(line) + '</p>'; }).join('');
    return html + '</section>';
  }

  function renderCatalysts(section) {
    var items = [];
    var notes = [];
    var current = null;
    cleanLines(section.lines).forEach(function (line) {
      var event = line.match(/^·\s+(.+?)　(.*)$/);
      if (event && current) {
        current.events.push({ date: event[1], text: event[2] });
        return;
      }
      var stock = line.match(/^(.+?)\s+(\d{5})$/);
      if (stock) {
        current = { name: stock[1], code: stock[2], events: [] };
        items.push(current);
      } else notes.push(line);
    });
    var html = sectionStart('catalysts', section.title, items.length + ' 只有催化');
    html += '<div class="catalyst-list">' + items.map(function (item) {
      return '<div class="catalyst-item"><div class="catalyst-stock"><strong>' + esc(item.name) + '</strong><span class="num">' + esc(item.code) + '</span></div>' +
        item.events.map(function (event) {
          return '<div class="catalyst-event"><span class="catalyst-date">' + esc(event.date) + '</span><span class="catalyst-text">' + inline(event.text) + '</span></div>';
        }).join('') + '</div>';
    }).join('') + '</div>';
    html += notes.map(function (note) { return '<p class="section-note">' + inline(note) + '</p>'; }).join('');
    return html + '</section>';
  }

  function renderHot(section, persona) {
    var items = [];
    var generic = [];
    var current = null;
    var discovery = persona.mode === 'discovery';
    cleanLines(section.lines).forEach(function (line) {
      if (line.startsWith('·')) {
        var hit = line.indexOf('（含你的自选）') >= 0 || line.indexOf('（本周精选）') >= 0;
        var title = line.slice(1).trim().replace('（含你的自选）', '').replace('（本周精选）', '');
        current = { title: title, hit: hit, related: '' };
        items.push(current);
      } else if (line.startsWith('相关标的：') && current) current.related = line.replace('相关标的：', '');
      else generic.push(line);
    });
    var html = sectionStart('hot', section.title, items.length + ' 个话题');
    html += '<div class="hot-list">' + items.map(function (item) {
      var tag = discovery ? '本周精选' : '含你的自选';
      return '<div class="hot-item">' + (item.hit ? '<span class="hot-tag">' + tag + '</span>' : '') +
        '<h4 class="hot-title">' + inline(item.title) + '</h4><p class="hot-related">相关标的：' + esc(item.related) + '</p></div>';
    }).join('') + '</div>';
    html += generic.map(function (line) { return '<p class="generic-line">' + inline(line) + '</p>'; }).join('');
    return html + '</section>';
  }

  function renderGeneric(section) {
    return sectionStart('generic', section.title) + cleanLines(section.lines).map(function (line) {
      return '<p class="generic-line">' + inline(line) + '</p>';
    }).join('') + '</section>';
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
    var parsed = parseEmail(persona.email);
    var discovery = persona.mode === 'discovery';
    var reportTitle = discovery ? '热门港股周报' : '港股自选股周报';
    var countLabel = discovery ? '热门港股' : '港股自选';
    var context = discovery
      ? '<div class="report-context discovery"><strong>你还没有港股自选股</strong><p>本期先为你精选 6 只热门港股；添加后，下期将按你的名单生成。</p></div>'
      : '';
    var warnings = DATA.meta.warnings || [];
    var warning = warnings.length
      ? '<div class="data-warning"><strong>本版部分数据未获取</strong><p>' + warnings.map(esc).join('；') + '</p></div>'
      : '';
    var html = '<header class="mail-header"><div><div class="mail-brand">' +
      '<img class="mail-logo" src="../../assets/yf-brand/logo_blue@3x.png" alt="" width="34" height="34">' +
      '<div><p class="mail-kicker">YF HK WEEKLY</p><h2>' + reportTitle + '</h2></div></div>' +
      '<div class="mail-meta"><span class="num">' + esc(DATA.meta.window) + '</span><span>' + countLabel + ' ' + persona.metrics.watchlistCount + ' 只</span><span>数据来源：Gangtise 投研</span></div></div>' +
      '<span class="ai-badge">AI 生成</span></header><div class="mail-body">' + warning + context;
    html += parsed.sections.map(function (section) {
      var content;
      if (section.type === 'overview') content = renderOverview(section);
      else if (section.type === 'performance') content = renderPerformance(section);
      else if (section.type === 'clues') content = renderClues(section);
      else if (section.type === 'catalysts') content = renderCatalysts(section);
      else if (section.type === 'hot') content = renderHot(section, persona) + downloadCta(persona);
      else content = renderGeneric(section);
      return content;
    }).join('');
    html += '</div><footer class="mail-footer">' + parsed.footer.map(function (line) {
      var cls = line.startsWith('内容限制规则') ? 'limit-note' : (line.startsWith('退订') ? 'unsubscribe-note' : 'legal-note');
      return '<p class="' + cls + '">' + inline(line) + '</p>';
    }).join('') + '</footer>';
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
    var listTitle = discovery ? '本期热门港股' : 'TA 的港股自选';
    var hitLabel = discovery ? '命中热门股热点' : '命中自选热点';
    return '<p class="insight-eyebrow">为什么 TA 看到这封</p><h2>' + esc(persona.name) + '</h2>' +
      '<p class="insight-summary">' + esc(persona.summary) + '</p>' +
      '<div class="metric-grid">' + metrics.map(function (item) {
        return '<div class="metric"><strong class="num">' + item[0] + '</strong><span>' + item[1] + '</span></div>';
      }).join('') + '</div>' +
      '<section class="insight-section"><h3>' + listTitle + '</h3><div class="watchlist">' + persona.watchlist.map(function (stock) {
        return '<div class="watch-item"><span class="watch-name">' + esc(stock.name) + '</span><span class="pct num ' + direction(stock.pct) + '">' + fmtPct(stock.pct) + '</span></div>';
      }).join('') + '</div></section>' +
      '<section class="insight-section"><h3>本封触发的组装规则</h3><ol class="rule-list">' + persona.rules.map(function (rule) {
        return '<li>' + esc(rule) + '</li>';
      }).join('') + '</ol><p class="char-note">正文 ' + m.charCount.toLocaleString('zh-CN') + ' 字符 · ' + hitLabel + ' ' + m.topicHitCount + ' 个</p></section>';
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
      ['催化标的（只）', 'catalystStockCount'],
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

  function renderVersionButtons() {
    DATA_SETS.forEach(function (item) {
      var button = el(item.id + 'Version');
      if (!button) return;
      var active = item.id === state.version;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      var label = item.id === 'latest' ? '最新数据' : '历史数据';
      button.innerHTML = '<strong>' + label + '</strong><span class="num">' + esc(item.data.meta.window) + '</span>';
    });
  }

  function setVersion(version) {
    if (version === state.version) return;
    var selected = DATA_SETS.find(function (item) { return item.id === version; });
    if (!selected) return;
    state.version = version;
    DATA = selected.data;
    personas = DATA.personas;
    state.current = Math.max(0, personas.findIndex(function (p) { return p.id === DATA.meta.defaultPersona; }));
    state.compareA = 'tech';
    state.compareB = 'income';
    el('dataWindow').textContent = DATA.meta.window;
    el('personaModes').textContent = (personas.length - 1) + '+1';
    renderVersionButtons();
    renderPersonaCards();
    renderCompareOptions();
    setMode(state.mode);
  }

  function init() {
    el('dataWindow').textContent = DATA.meta.window;
    el('personaModes').textContent = (personas.length - 1) + '+1';
    renderVersionButtons();
    renderPersonaCards();
    renderCompareOptions();
    el('latestVersion').addEventListener('click', function () { setVersion('latest'); });
    el('historyVersion').addEventListener('click', function () { setVersion('history'); });
    el('compareA').addEventListener('change', function (event) { state.compareA = event.target.value; renderCompare(); });
    el('compareB').addEventListener('change', function (event) { state.compareB = event.target.value; renderCompare(); });
    el('singleMode').addEventListener('click', function () { setMode('single'); });
    el('compareMode').addEventListener('click', function () { setMode('compare'); });
    document.addEventListener('keydown', function (event) {
      if (state.mode !== 'single' || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
      if (event.target.closest('input, select, textarea')) return;
      event.preventDefault();
      var delta = event.key === 'ArrowRight' ? 1 : -1;
      state.current = (state.current + delta + personas.length) % personas.length;
      renderSingle();
    });
    renderSingle();
  }

  init();
})();
