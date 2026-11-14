// Token Radar dashboard: the board, the detail view and the filters, no network.
//
// Reads window.RADAR (written by main.ts from the same board.json the gate reads), so
// the page and the board can never disagree. Hash routes, so a screenshot can open a
// view directly: #/detail/<slug>, #/filter/<category>, #/watchlist, #/early, #/live.

(function () {
  'use strict';
  var D = window.RADAR || { rows: [], live: [], multiples: [] };
  var rows = D.rows || [];
  var live = D.live || [];

  var state = { q: '', cat: '', chain: '', scope: 'all', sort: 'value', selected: null };

  function $(id) { return document.getElementById(id); }
  function money(n) {
    if (n === null || n === undefined) return '—';
    var abs = Math.abs(n);
    if (abs >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (abs >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n;
  }
  function pct(v) {
    if (v === null || v === undefined) return '<span class="flat">—</span>';
    var cls = v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
    var sign = v > 0 ? '+' : '';
    return '<span class="' + cls + '">' + sign + v.toFixed(1) + '%</span>';
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function filtered() {
    var list = rows.filter(function (r) {
      if (state.scope === 'watchlist' && !r.watchlist) return false;
      if (state.scope === 'early' && r.watchlist) return false;
      if (state.cat && (r.category || '') !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (state.q) {
        var q = state.q.toLowerCase();
        if (r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    });
    var key = state.sort;
    var cmp = {
      value: function (a, b) { return b.implied_value_usd - a.implied_value_usd; },
      tvl: function (a, b) { return b.tvl_usd - a.tvl_usd; },
      change: function (a, b) { return (b.change_7d || 0) - (a.change_7d || 0); },
      age: function (a, b) { return (b.age_days || 0) - (a.age_days || 0); },
      name: function (a, b) { return a.name < b.name ? -1 : 1; },
    }[key] || function (a, b) { return a.rank - b.rank; };
    return list.slice().sort(cmp);
  }

  function renderRows() {
    var body = $('rows');
    var head = document.querySelector('#board thead tr');
    if (state.scope === 'live') {
      head.innerHTML = '<th>#</th><th>Protocol</th><th>Category</th><th>Chains</th>' +
        '<th class="num">TVL</th><th class="num">7d</th><th class="num">Market cap</th><th class="num">mcap / TVL</th>';
      body.innerHTML = live.map(function (p, i) {
        var ratio = p.tvl_usd ? (p.mcap_usd || 0) / p.tvl_usd : null;
        return '<tr data-slug="' + esc(p.slug) + '">' +
          '<td class="rk">' + (i + 1) + '</td>' +
          '<td class="nm">' + esc(p.name) + '</td>' +
          '<td>' + esc(p.category || '—') + '</td>' +
          '<td>' + esc(p.chains.slice(0, 3).join(', ')) + '</td>' +
          '<td class="num">' + money(p.tvl_usd) + '</td>' +
          '<td class="num">' + pct(p.change_7d) + '</td>' +
          '<td class="num">' + money(p.mcap_usd) + '</td>' +
          '<td class="num">' + (ratio === null ? '—' : ratio.toFixed(2) + '×') + '</td></tr>';
      }).join('');
      $('count').textContent = live.length + ' live-token protocols, by market cap. These already trade: the market value, never a model claim.';
      $('tablenote').textContent = 'Live rows are the comparables the category multiples are priced from. Click a row to see it on the board — live protocols are not ranked.';
      return;
    }
    head.innerHTML = '<th data-k="rank">#</th><th data-k="name">Protocol</th><th data-k="category">Category</th>' +
      '<th>Chains</th><th data-k="tvl" class="num">TVL</th><th data-k="change" class="num">7d</th>' +
      '<th data-k="age" class="num">Age</th><th data-k="value" class="num">Implied value</th>';
    var list = filtered();
    body.innerHTML = list.map(function (r) {
      return '<tr data-slug="' + esc(r.slug) + '"' + (state.selected === r.slug ? ' class="sel"' : '') + '>' +
        '<td class="rk">' + r.rank + '</td>' +
        '<td class="nm">' + esc(r.name) + (r.watchlist ? '<span class="tag">watchlist</span>' : '') + '</td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(r.chains.slice(0, 3).join(', ')) + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + (r.age_days === null ? '—' : r.age_days + 'd') + '</td>' +
        '<td class="num val">' + money(r.implied_value_usd) + '</td></tr>';
    }).join('');
    var scopeName = { all: 'pre-token protocols', watchlist: 'watchlist protocols', early: 'early finds' }[state.scope] || 'rows';
    $('count').textContent = list.length + ' of ' + rows.length + ' ' + scopeName + ' shown. Click a row for its detail view and farm plan.';
    $('tablenote').textContent = 'Implied value is this radar\'s own claim from the snapshot\'s figures — TVL × category multiple × growth × maturity × breadth — not a price, and not a promise a token is coming.';
  }

  function renderDetail(slug) {
    var box = $('detail');
    var r = null;
    for (var i = 0; i < rows.length; i++) if (rows[i].slug === slug) { r = rows[i]; break; }
    if (!r) { box.hidden = true; state.selected = null; return; }
    state.selected = slug;
    var base = r.tvl_usd * r.category_multiple;
    var implied = r.implied_value_usd;
    box.hidden = false;
    box.innerHTML =
      '<button class="close" id="detailclose">Close ✕</button>' +
      '<h2>#' + r.rank + ' ' + esc(r.name) + '</h2>' +
      '<p class="sub">' + esc(r.category || 'Uncategorised') + ' · ' + esc(r.chains.join(', ') || 'no chain listed') +
      ' · tracked since ' + esc(r.listed_at || 'unknown') + (r.watchlist ? ' · on the house watchlist' : '') + '</p>' +
      '<div class="badges"><span class="badge hot">Implied value ' + money(implied) + '</span>' +
      '<span class="badge">TVL ' + money(r.tvl_usd) + '</span>' +
      '<span class="badge">7d ' + (r.change_7d === null ? 'unreported' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</span>' +
      '<span class="badge">Age ' + (r.age_days === null ? 'unknown' : r.age_days + ' days') + '</span>' +
      '<span class="badge">Records no token</span></div>' +
      '<h3>How the value is built</h3>' +
      '<table><thead><tr><th>Leg</th><th class="num">Value</th></tr></thead><tbody>' +
      '<tr><td>TVL × category multiple (' + r.category_multiple.toFixed(2) + '×, the live median for ' + esc(r.category || 'Uncategorised') + ')</td><td class="num">' + money(Math.round(base)) + '</td></tr>' +
      '<tr><td>Growth ×' + r.growth_multiplier.toFixed(2) + ' (7d ' + (r.change_7d === null ? 'unreported' : r.change_7d.toFixed(1) + '%') + ', clamped to −40…+60%)</td><td class="num">×' + r.growth_multiplier.toFixed(2) + '</td></tr>' +
      '<tr><td>Maturity ×' + r.maturity_multiplier.toFixed(2) + ' (' + (r.age_days === null ? 'age unknown, counted as 365 days' : r.age_days + ' days with no token') + ')</td><td class="num">×' + r.maturity_multiplier.toFixed(2) + '</td></tr>' +
      '<tr><td>Breadth ×' + r.breadth_multiplier.toFixed(2) + ' (' + r.chains.length + ' chain' + (r.chains.length === 1 ? '' : 's') + ')</td><td class="num">×' + r.breadth_multiplier.toFixed(2) + '</td></tr>' +
      '<tr><td><strong>Implied value</strong></td><td class="num"><strong>' + money(implied) + '</strong></td></tr>' +
      '</tbody></table>' +
      '<h3>How to farm it</h3><ol>' +
      r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
      '</ol>';
    $('detailclose').addEventListener('click', function () {
      state.selected = null; box.hidden = true;
      renderRows();
      if (location.hash.indexOf('#/detail/') === 0) history.replaceState(null, '', '#/');
    });
  }

  function renderStats() {
    $('asof').textContent = D.as_of || '';
    var top = rows.length ? rows[0] : null;
    $('stats').innerHTML =
      '<div class="stat"><b>' + rows.length + '</b><span>pre-token protocols ranked</span></div>' +
      '<div class="stat"><b>' + (D.watchlist_size || 0) + '</b><span>on the house watchlist</span></div>' +
      '<div class="stat"><b>' + (D.early_size || 0) + '</b><span>early finds below the floor</span></div>' +
      '<div class="stat"><b>' + (top ? money(top.implied_value_usd) : '—') + '</b><span>top implied value' + (top ? ' — ' + esc(top.name) : '') + '</span></div>';
    $('source').textContent = 'Source: ' + (D.source || '') + '. Snapshot floor $' + (D.floor_usd || 0).toLocaleString('en-US') + '. Model ' + (D.model_version || '') + '. Built by an AI agent for make.fun’s token-radar-01 bounty.';
    var m = $('mults');
    m.innerHTML = (D.multiples || []).map(function (x) {
      return '<tr><td>' + esc(x.category) + '</td><td class="num">' + x.multiple.toFixed(2) + '×</td><td class="num">' + x.comparables + '</td></tr>';
    }).join('');
  }

  function fillSelects() {
    var cats = {};
    rows.forEach(function (r) { cats[r.category || 'Uncategorised'] = true; });
    $('cat').innerHTML = '<option value="">All categories</option>' +
      Object.keys(cats).sort().map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
    var chains = {};
    rows.forEach(function (r) { r.chains.forEach(function (c) { chains[c] = true; }); });
    $('chain').innerHTML = '<option value="">All chains</option>' +
      Object.keys(chains).sort().map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
  }

  function setScope(scope) {
    state.scope = scope;
    var btns = document.querySelectorAll('.scopes button');
    for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('on', btns[i].getAttribute('data-scope') === scope);
    renderRows();
  }

  function applyHash() {
    var h = location.hash || '';
    if (h.indexOf('#/detail/') === 0) {
      var slug = decodeURIComponent(h.slice(9));
      setScope(state.scope === 'live' ? 'all' : state.scope);
      renderDetail(slug);
      renderRows();
      var box = $('detail');
      if (!box.hidden) box.scrollIntoView();
      return;
    }
    if (h.indexOf('#/filter/') === 0) {
      state.cat = decodeURIComponent(h.slice(9));
      $('cat').value = state.cat;
      setScope('all');
      return;
    }
    if (h === '#/watchlist') { setScope('watchlist'); return; }
    if (h === '#/early') { setScope('early'); return; }
    if (h === '#/live') { setScope('live'); return; }
    setScope(state.scope);
  }

  $('q').addEventListener('input', function (e) { state.q = e.target.value; renderRows(); });
  $('cat').addEventListener('change', function (e) { state.cat = e.target.value; renderRows(); });
  $('chain').addEventListener('change', function (e) { state.chain = e.target.value; renderRows(); });
  $('sort').addEventListener('change', function (e) { state.sort = e.target.value; renderRows(); });
  var scopeBtns = document.querySelectorAll('.scopes button');
  for (var i = 0; i < scopeBtns.length; i++) {
    scopeBtns[i].addEventListener('click', function (e) { setScope(e.target.getAttribute('data-scope')); });
  }
  document.querySelector('#board thead').addEventListener('click', function (e) {
    var k = e.target.getAttribute('data-k');
    if (!k) return;
    state.sort = { rank: 'value', name: 'name', category: 'value', tvl: 'tvl', change: 'change', age: 'age', value: 'value' }[k] || 'value';
    $('sort').value = state.sort;
    renderRows();
  });
  $('rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr');
    if (!tr) return;
    var slug = tr.getAttribute('data-slug');
    if (!slug) return;
    if (state.scope === 'live') {
      var found = null;
      for (var i = 0; i < rows.length; i++) if (rows[i].slug === slug) { found = rows[i]; break; }
      if (found) { location.hash = '#/detail/' + slug; return; }
      return;
    }
    location.hash = '#/detail/' + slug;
  });
  window.addEventListener('hashchange', applyHash);

  fillSelects();
  renderStats();
  applyHash();
})();
