// js/train.js
(function () {

  // ── State ─────────────────────────────────────
  let allScrims  = [];
  let allRankeds = [];

  // Sort state per tabel — { key: string|null, dir: 'asc'|'desc' }
  const scrimSort  = { key: null, dir: 'asc' };
  const rankedSort = { key: null, dir: 'asc' };

  // ── Toast ────────────────────────────────────
  function showToast(message, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(message, type);
    }
  }

  // ── Badge helpers ───────────────────────────

  function getResult(our, opp, resultFromDb) {
    let r = (resultFromDb || '').toLowerCase();
    if (!r) {
      const a = parseInt(our, 10) || 0;
      const b = parseInt(opp, 10) || 0;
      if (a > b)      r = 'win';
      else if (a < b) r = 'lose';
      else            r = 'draw';
    }
    return r;
  }

  function resultBadgeHtml(our, opp, resultFromDb) {
    const r = getResult(our, opp, resultFromDb);
    const cssMap = { win: 'badge badge-green', lose: 'badge badge-red', draw: 'badge badge-yellow' };
    const label  = r.charAt(0).toUpperCase() + r.slice(1);
    return `<span class="${cssMap[r] || 'badge badge-neutral'}">${label}</span>`;
  }

  function statusBadgeHtml(status) {
    const s = (status || '').toLowerCase();
    const cssMap   = { upcoming: 'badge badge-yellow', finished: 'badge badge-green', cancel: 'badge badge-red' };
    const labelMap = { upcoming: 'Upcoming', finished: 'Finished', cancel: 'Cancel' };
    return `<span class="${cssMap[s] || 'badge badge-neutral'}">${labelMap[s] || s || '-'}</span>`;
  }

  // ── Sort helpers ────────────────────────────

  const SORT_ICON = {
    none: `<svg class="sort-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M7 15l5 5 5-5M7 9l5-5 5 5"/></svg>`,
    asc:  `<svg class="sort-icon sort-active" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 15l7-7 7 7"/></svg>`,
    desc: `<svg class="sort-icon sort-active" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M19 9l-7 7-7-7"/></svg>`,
  };

  /**
   * @param {any[]} data
   * @param {{ key: string|null, dir: 'asc'|'desc' }} sortState
   * @returns {any[]}
   */
  function applySorting(data, sortState) {
    if (!sortState.key) return [...data];
    const dir = sortState.dir === 'desc' ? -1 : 1;
    const key = sortState.key;

    const valueOf = (m) => {
      switch (key) {
        case 'date':     return (m.match_date || '');
        case 'opponent': return (m.opponent_name || '').toLowerCase();
        case 'score': {
          const our = parseInt(m.our_score, 10) || 0;
          const opp = parseInt(m.opponent_score, 10) || 0;
          return our - opp;
        }
        case 'format':   return (m.format || '').toLowerCase();
        case 'status':   return (m.status || '').toLowerCase();
        default:         return '';
      }
    };

    return [...data].sort((a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return  1 * dir;
      return 0;
    });
  }

  function updateSortIcons(theadId, sortState) {
    const thead = document.getElementById(theadId);
    if (!thead) return;
    thead.querySelectorAll('th[data-sort-key]').forEach((th) => {
      const key  = th.dataset.sortKey;
      const wrap = th.querySelector('.sort-icon-wrap');
      if (!wrap) return;
      if (sortState.key !== key) wrap.innerHTML = SORT_ICON.none;
      else wrap.innerHTML = sortState.dir === 'asc' ? SORT_ICON.asc : SORT_ICON.desc;
    });
  }

  function bindSortHeaders(theadId, sortState, rerender) {
    const thead = document.getElementById(theadId);
    if (!thead) return;
    thead.querySelectorAll('th[data-sort-key]').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.sortKey;
        if (sortState.key === key) sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
        else { sortState.key = key; sortState.dir = 'asc'; }
        rerender();
      });
    });
  }

  // ── Stats helpers ───────────────────────────

  function computeStats(matches) {
    let win = 0, draw = 0, lose = 0;
    matches.forEach((m) => {
      const r = getResult(m.our_score, m.opponent_score, m.result);
      if (r === 'win') win += 1;
      else if (r === 'draw') draw += 1;
      else lose += 1;
    });
    const total = matches.length;
    const winRate = total ? Math.round((win / total) * 100) : 0;
    return { total, win, draw, lose, winRate };
  }

  function renderStatsBar(containerId, stats, isFiltered) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { total, win, draw, lose, winRate } = stats;
    const winPct  = total ? (win  / total) * 100 : 0;
    const drawPct = total ? (draw / total) * 100 : 0;
    const losePct = total ? (lose / total) * 100 : 0;

    container.innerHTML = `
      <div class="stats-bar">
        <div class="stats-bar-items">
          <div class="stats-item"><div class="stats-num">${total}</div><div class="stats-label">Match</div></div>
          <div class="stats-item stats-win"><div class="stats-num">${win}</div><div class="stats-label">Win</div></div>
          <div class="stats-item stats-draw"><div class="stats-num">${draw}</div><div class="stats-label">Draw</div></div>
          <div class="stats-item stats-lose"><div class="stats-num">${lose}</div><div class="stats-label">Lose</div></div>
          <div class="stats-item stats-winrate"><div class="stats-num">${winRate}%</div><div class="stats-label">Win Rate</div></div>
        </div>
        <div class="stats-progress" aria-hidden="true">
          <div class="stats-progress-win" style="width:${winPct}%"></div>
          <div class="stats-progress-draw" style="width:${drawPct}%"></div>
          <div class="stats-progress-lose" style="width:${losePct}%"></div>
        </div>
        ${isFiltered ? '<div class="page-subtitle">Statistik mengikuti hasil filter aktif.</div>' : ''}
      </div>`;
  }

  // ── Small DOM helpers ───────────────────────

  function makeInput(id, placeholder, onInput) {
    const input = document.createElement('input');
    input.id = id;
    input.type = 'search';
    input.className = 'form-input form-input-sm table-search-input';
    input.placeholder = placeholder;
    input.addEventListener('input', onInput);
    return input;
  }

  function makeSelect(id, firstLabel, options, onChange) {
    const select = document.createElement('select');
    select.id = id;
    select.className = 'form-select form-select-sm table-filter-select';
    select.innerHTML = `<option value="">${firstLabel}</option>` +
      options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
    select.addEventListener('change', onChange);
    return select;
  }

  function makeDateRangeGroup(fromId, toId, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'date-range-group';

    const from = document.createElement('input');
    from.type = 'date';
    from.id = fromId;
    from.className = 'table-date-input';
    from.addEventListener('change', onChange);

    const sep = document.createElement('span');
    sep.className = 'date-range-sep';
    sep.textContent = '—';

    const to = document.createElement('input');
    to.type = 'date';
    to.id = toId;
    to.className = 'table-date-input';
    to.addEventListener('change', onChange);

    wrap.appendChild(from);
    wrap.appendChild(sep);
    wrap.appendChild(to);
    return wrap;
  }

  // ── Delete Modal ────────────────────────────

  const DeleteModal = (function () {
    let _overlay, _content;
    function _ensure() {
      if (_overlay) return;
      _overlay = document.createElement('div');
      _overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;z-index:1200;padding:20px';
      _content = document.createElement('div');
      _content.style.cssText = 'width:min(100%,420px);background:var(--color-surface,#fff);border:1px solid var(--color-border,#e2e8f0);border-radius:18px;box-shadow:0 20px 45px rgba(0,0,0,.35);padding:26px';
      _overlay.appendChild(_content);
      _overlay.addEventListener('click', function (e) { if (e.target === _overlay) _close(); });
      document.body.appendChild(_overlay);
    }
    function _close() { if (_overlay) _overlay.style.display = 'none'; }
    function _btn(label, variant) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      const common = 'display:inline-flex;align-items:center;justify-content:center;gap:8px;height:40px;padding:0 16px;border-radius:12px;font-weight:600;border:1px solid transparent;cursor:pointer';
      const styles = {
        secondary: 'background:var(--color-surface-offset,#f1f5f9);color:var(--color-text,#0f172a);border-color:var(--color-border,#e2e8f0)',
        danger:    'background:#dc2626;color:#fff;border-color:#dc2626',
      };
      b.style.cssText = `${common};${styles[variant] || styles.secondary}`;
      return b;
    }
    function show(label, onConfirm) {
      _ensure();
      _content.innerHTML = '';
      const icon = document.createElement('div');
      icon.style.cssText = 'width:54px;height:54px;margin:0 auto 16px;border-radius:999px;background:rgba(220,38,38,.12);display:flex;align-items:center;justify-content:center;font-size:1.35rem;color:#dc2626';
      icon.textContent = '⚠️';
      const title = document.createElement('p');
      title.style.cssText = 'margin:0 0 8px;font-size:1rem;font-weight:700;color:var(--color-text,#1e293b);text-align:center';
      title.textContent = 'Konfirmasi Hapus';
      const msg = document.createElement('p');
      msg.style.cssText = 'margin:0 0 22px;font-size:.85rem;color:var(--color-text-muted,#64748b);text-align:center;line-height:1.55';
      msg.innerHTML = `Yakin ingin menghapus <strong>${label}</strong> beserta <strong>semua Game</strong> di dalamnya?<br><span style="color:#dc2626">Tindakan ini tidak bisa dibatalkan.</span>`;
      const footer = document.createElement('div');
      footer.style.cssText = 'display:flex;justify-content:flex-end;gap:10px';
      const cancelBtn  = _btn('Batal', 'secondary'); cancelBtn.addEventListener('click', _close);
      const confirmBtn = _btn('🗑️ Ya, Hapus', 'danger');
      confirmBtn.addEventListener('click', () => { _close(); onConfirm(); });
      footer.appendChild(cancelBtn); footer.appendChild(confirmBtn);
      _content.appendChild(icon); _content.appendChild(title); _content.appendChild(msg); _content.appendChild(footer);
      _overlay.style.display = 'flex';
    }
    return { show, close: _close };
  })();

  function handleDelete(id, label) {
    DeleteModal.show(label, function () {
      const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
      fetch(`${apiBase}match_api.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id, mode: 'cascade' }),
      })
        .then(async (res) => {
          const json = await res.json().catch(() => null);
          if (!json || !json.ok) throw new Error((json && json.message) || 'Gagal menghapus.');
          showToast(`${label} beserta semua Game-nya berhasil dihapus.`, 'success');
          loadTrainData();
        })
        .catch((err) => showToast(err.message || 'Gagal menghapus.', 'error'));
    });
  }

  // ── Filter helpers ───────────────────────────

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function inDateRange(m, from, to) {
    if (!from && !to) return true;
    const d = m.match_date || '';
    if (!d) return false;
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  }

  // ── Scrim ────────────────────────────────────

  function getScrimFilters() {
    return {
      searchText: val('scrimSearch').trim().toLowerCase(),
      format:     val('scrimFilterFormat'),
      status:     val('scrimFilterStatus'),
      result:     val('scrimFilterResult'),
      dateFrom:   val('scrimDateFrom'),
      dateTo:     val('scrimDateTo'),
    };
  }

  function applyScrimFilters(data) {
    const { searchText, format, status, result, dateFrom, dateTo } = getScrimFilters();
    return data.filter((m) => {
      if (searchText && !(m.opponent_name || '').toLowerCase().includes(searchText)) return false;
      if (format     && (m.format || '').toUpperCase() !== format.toUpperCase())     return false;
      if (status     && (m.status || '').toLowerCase() !== status.toLowerCase())     return false;
      if (result) {
        const r = getResult(m.our_score, m.opponent_score, m.result);
        if (r !== result.toLowerCase()) return false;
      }
      if (!inDateRange(m, dateFrom, dateTo)) return false;
      return true;
    });
  }

  function renderScrimEmpty(tbody, isFiltered) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <h3>${isFiltered ? 'Tidak ada hasil' : 'Belum ada scrim'}</h3>
      <p>${isFiltered ? 'Tidak ada scrim yang sesuai filter.' : 'Tambahkan sesi scrim untuk melacak perkembangan tim'}</p>
      ${!isFiltered ? `<a href="addmatch.html" class="btn btn-primary btn-sm"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Tambah Scrim</a>` : ''}
    </div></td></tr>`;
  }

  function renderScrimTable() {
    const tbody   = document.getElementById('scrimBody');
    const countEl = document.getElementById('scrimCount');
    if (!tbody) return;

    const filters = getScrimFilters();
    const hasActiveFilter = Object.values(filters).some(Boolean);
    const filtered   = applyScrimFilters(allScrims);
    const sorted     = applySorting(filtered, scrimSort);
    const isFiltered = allScrims.length > 0 && filtered.length === 0;

    if (countEl) {
      countEl.textContent = hasActiveFilter
        ? `${filtered.length} / ${allScrims.length} match`
        : `${allScrims.length} match`;
    }

    renderStatsBar('scrimStatsBar', computeStats(hasActiveFilter ? filtered : allScrims), hasActiveFilter);
    updateSortIcons('scrimThead', scrimSort);

    if (sorted.length === 0) { renderScrimEmpty(tbody, isFiltered); return; }

    tbody.innerHTML = sorted.map((m, i) => {
      const our = m.our_score != null ? m.our_score : 0;
      const opp = m.opponent_score != null ? m.opponent_score : 0;
      const safeName = (m.opponent_name || '').replace(/"/g, '&quot;');
      const dateStr  = m.match_date ? new Date(m.match_date).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) : '-';
      return `<tr>
        <td>${i + 1}</td>
        <td data-label="Tanggal">${dateStr}</td>
        <td><a href="editmatch.html?id=${m.id}" class="link-primary">${m.opponent_name || '-'}</a></td>
        <td>${our}:${opp}&nbsp;${resultBadgeHtml(our, opp, m.result)}</td>
        <td>${m.format || '-'}</td>
        <td>${statusBadgeHtml(m.status)}</td>
        <td><a href="match-detail.html?id=${m.id}" class="btn btn-sm btn-outline-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Games</a></td>
        <td><div class="btn-action-group">
          <a href="editmatch.html?id=${m.id}" class="btn btn-sm btn-outline" aria-label="Edit scrim ${safeName}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</a>
          <button class="btn btn-sm btn-danger" data-id="${m.id}" data-label="scrim vs &quot;${safeName}&quot;" aria-label="Hapus scrim ${safeName}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>Hapus</button>
        </div></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => handleDelete(Number(btn.dataset.id), btn.dataset.label));
    });
  }

  // ── Ranked ───────────────────────────────────

  function getRankedFilters() {
    return {
      searchText: val('rankedSearch').trim().toLowerCase(),
      status:     val('rankedFilterStatus'),
      result:     val('rankedFilterResult'),
      dateFrom:   val('rankedDateFrom'),
      dateTo:     val('rankedDateTo'),
    };
  }

  function applyRankedFilters(data) {
    const { searchText, status, result, dateFrom, dateTo } = getRankedFilters();
    return data.filter((m) => {
      if (searchText && !(m.opponent_name || '').toLowerCase().includes(searchText)) return false;
      if (status     && (m.status || '').toLowerCase() !== status.toLowerCase())     return false;
      if (result) {
        const r = getResult(m.our_score, m.opponent_score, m.result);
        if (r !== result.toLowerCase()) return false;
      }
      if (!inDateRange(m, dateFrom, dateTo)) return false;
      return true;
    });
  }

  function renderRankedEmpty(tbody, isFiltered) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
      <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      <h3>${isFiltered ? 'Tidak ada hasil' : 'Belum ada ranked'}</h3>
      <p>${isFiltered ? 'Tidak ada ranked yang sesuai filter.' : 'Catat game ranked untuk analisis performa individual'}</p>
      ${!isFiltered ? `<a href="addmatch.html" class="btn btn-primary btn-sm"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Tambah Ranked</a>` : ''}
    </div></td></tr>`;
  }

  function renderRankedTable() {
    const tbody   = document.getElementById('rankedBody');
    const countEl = document.getElementById('rankedCount');
    if (!tbody) return;

    const filters = getRankedFilters();
    const hasActiveFilter = Object.values(filters).some(Boolean);
    const filtered   = applyRankedFilters(allRankeds);
    const sorted     = applySorting(filtered, rankedSort);
    const isFiltered = allRankeds.length > 0 && filtered.length === 0;

    if (countEl) {
      countEl.textContent = hasActiveFilter
        ? `${filtered.length} / ${allRankeds.length} match`
        : `${allRankeds.length} match`;
    }

    renderStatsBar('rankedStatsBar', computeStats(hasActiveFilter ? filtered : allRankeds), hasActiveFilter);
    updateSortIcons('rankedThead', rankedSort);

    if (sorted.length === 0) { renderRankedEmpty(tbody, isFiltered); return; }

    tbody.innerHTML = sorted.map((m, i) => {
      const our = m.our_score != null ? m.our_score : 0;
      const opp = m.opponent_score != null ? m.opponent_score : 0;
      const safeName = (m.opponent_name || '').replace(/"/g, '&quot;');
      const dateStr  = m.match_date ? new Date(m.match_date).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) : '-';
      return `<tr>
        <td>${i + 1}</td>
        <td data-label="Tanggal">${dateStr}</td>
        <td><a href="editmatch.html?id=${m.id}" class="link-primary">${m.opponent_name || '-'}</a></td>
        <td>${our}:${opp}&nbsp;${resultBadgeHtml(our, opp, m.result)}</td>
        <td>${statusBadgeHtml(m.status)}</td>
        <td><a href="match-detail.html?id=${m.id}" class="btn btn-sm btn-outline-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Games</a></td>
        <td><div class="btn-action-group">
          <a href="editmatch.html?id=${m.id}" class="btn btn-sm btn-outline" aria-label="Edit ranked ${safeName}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</a>
          <button class="btn btn-sm btn-danger" data-id="${m.id}" data-label="ranked vs &quot;${safeName}&quot;" aria-label="Hapus ranked ${safeName}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>Hapus</button>
        </div></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => handleDelete(Number(btn.dataset.id), btn.dataset.label));
    });
  }

  // ── Toolbar setup ───────────────────────────

  function setupScrimToolbar() {
    const tableWrap = document.getElementById('scrimTableWrap');
    if (!tableWrap || tableWrap.dataset.toolbarReady === '1') return;
    tableWrap.dataset.toolbarReady = '1';

    const statsHolder = document.createElement('div');
    statsHolder.id = 'scrimStatsBar';

    const toolbar = document.createElement('div');
    toolbar.className = 'table-toolbar';

    const left = document.createElement('div');
    left.className = 'table-toolbar-left';
    left.appendChild(makeInput('scrimSearch', 'Cari lawan scrim…', renderScrimTable));

    const right = document.createElement('div');
    right.className = 'table-toolbar-right';
    right.appendChild(makeDateRangeGroup('scrimDateFrom', 'scrimDateTo', renderScrimTable));
    right.appendChild(makeSelect('scrimFilterFormat', 'Format: Semua', [
      ['BO1','BO1'], ['BO2','BO2'], ['BO3','BO3'], ['BO5','BO5'],
    ], renderScrimTable));
    right.appendChild(makeSelect('scrimFilterStatus', 'Status: Semua', [
      ['upcoming','Upcoming'], ['finished','Finished'], ['cancel','Cancel'],
    ], renderScrimTable));
    right.appendChild(makeSelect('scrimFilterResult', 'Result: Semua', [
      ['win','Win'], ['draw','Draw'], ['lose','Lose'],
    ], renderScrimTable));

    toolbar.appendChild(left);
    toolbar.appendChild(right);

    tableWrap.parentElement.insertBefore(statsHolder, tableWrap);
    tableWrap.parentElement.insertBefore(toolbar, tableWrap);

    bindSortHeaders('scrimThead', scrimSort, renderScrimTable);
  }

  function setupRankedToolbar() {
    const tableWrap = document.getElementById('rankedTableWrap');
    if (!tableWrap || tableWrap.dataset.toolbarReady === '1') return;
    tableWrap.dataset.toolbarReady = '1';

    const statsHolder = document.createElement('div');
    statsHolder.id = 'rankedStatsBar';

    const toolbar = document.createElement('div');
    toolbar.className = 'table-toolbar';

    const left = document.createElement('div');
    left.className = 'table-toolbar-left';
    left.appendChild(makeInput('rankedSearch', 'Cari lawan / sesi ranked…', renderRankedTable));

    const right = document.createElement('div');
    right.className = 'table-toolbar-right';
    right.appendChild(makeDateRangeGroup('rankedDateFrom', 'rankedDateTo', renderRankedTable));
    right.appendChild(makeSelect('rankedFilterStatus', 'Status: Semua', [
      ['upcoming','Upcoming'], ['finished','Finished'], ['cancel','Cancel'],
    ], renderRankedTable));
    right.appendChild(makeSelect('rankedFilterResult', 'Result: Semua', [
      ['win','Win'], ['draw','Draw'], ['lose','Lose'],
    ], renderRankedTable));

    toolbar.appendChild(left);
    toolbar.appendChild(right);
    tableWrap.parentElement.insertBefore(statsHolder, tableWrap);
    tableWrap.parentElement.insertBefore(toolbar, tableWrap);

    bindSortHeaders('rankedThead', rankedSort, renderRankedTable);
  }

  // ── Fetch & init ───────────────────────────

  function loadTrainData() {
    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    fetch(`${apiBase}match_api.php?action=list`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error('Gagal mengambil data latihan');
        return json.matches || [];
      })
      .then((matches) => {
        allScrims  = matches.filter((m) => (m.type || '').toLowerCase() === 'scrim');
        allRankeds = matches.filter((m) => (m.type || '').toLowerCase() === 'ranked');
        renderScrimTable();
        renderRankedTable();
      })
      .catch((err) => showToast(err.message || 'Gagal memuat data latihan.', 'error'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupScrimToolbar();
    setupRankedToolbar();
    loadTrainData();

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', loadTrainData);
    }
  });

})();
