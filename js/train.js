// js/train.js
(function () {

  // ── State ─────────────────────────────────────
  let allScrims  = [];
  let allRankeds = [];

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

  // ── Delete ─────────────────────────────────

  function handleDelete(id, label) {
    if (!confirm(`Hapus ${label}? Tindakan ini tidak bisa dibatalkan.`)) return;

    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    fetch(`${apiBase}match_api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error((json && json.message) || 'Gagal menghapus.');
        showToast(`${label} berhasil dihapus.`, 'success');
        loadTrainData();
      })
      .catch((err) => showToast(err.message || 'Gagal menghapus.', 'error'));
  }

  // ── Filter helpers ───────────────────────────

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  // ── Scrim render ─────────────────────────────

  function getScrimFilters() {
    return {
      searchText: val('scrimSearch').trim().toLowerCase(),
      format:     val('scrimFilterFormat'),
      status:     val('scrimFilterStatus'),
      result:     val('scrimFilterResult'),
    };
  }

  function applyScrimFilters(data) {
    const { searchText, format, status, result } = getScrimFilters();
    return data.filter((m) => {
      if (searchText && !(m.opponent_name || '').toLowerCase().includes(searchText)) return false;
      if (format     && (m.format || '').toUpperCase()  !== format.toUpperCase())    return false;
      if (status     && (m.status || '').toLowerCase()  !== status.toLowerCase())    return false;
      if (result) {
        const r = getResult(m.our_score, m.opponent_score, m.result);
        if (r !== result.toLowerCase()) return false;
      }
      return true;
    });
  }

  function renderScrimEmpty(tbody, isFiltered) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <h3>${isFiltered ? 'Tidak ada hasil' : 'Belum ada scrim'}</h3>
          <p>${isFiltered ? 'Tidak ada scrim yang sesuai filter.' : 'Tambahkan sesi scrim untuk melacak perkembangan tim'}</p>
          ${!isFiltered ? `
          <a href="addmatch.html" class="btn btn-primary btn-sm">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Scrim
          </a>` : ''}
        </div>
      </td></tr>`;
  }

  function renderScrimTable() {
    const tbody = document.getElementById('scrimBody');
    const countEl = document.getElementById('scrimCount');
    if (!tbody) return;

    const filtered   = applyScrimFilters(allScrims);
    const isFiltered = allScrims.length > 0 && filtered.length === 0;

    if (countEl) countEl.textContent = `${allScrims.length} match`;

    if (filtered.length === 0) {
      renderScrimEmpty(tbody, isFiltered);
      return;
    }

    tbody.innerHTML = filtered.map((m, i) => {
      const our = m.our_score != null ? m.our_score : 0;
      const opp = m.opponent_score != null ? m.opponent_score : 0;
      const safeName = (m.opponent_name || '').replace(/"/g, '&quot;');
      return `
        <tr>
          <td>${i + 1}</td>
          <td><a href="editmatch.html?id=${m.id}" class="link-primary">${m.opponent_name || '-'}</a></td>
          <td>${our}:${opp}&nbsp;${resultBadgeHtml(our, opp, m.result)}</td>
          <td>${m.format || '-'}</td>
          <td>${statusBadgeHtml(m.status)}</td>
          <td>
            <button class="btn btn-sm btn-danger" data-id="${m.id}" data-label="scrim vs &quot;${safeName}&quot;">
              Hapus
            </button>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => handleDelete(Number(btn.dataset.id), btn.dataset.label));
    });
  }

  // ── Ranked render ────────────────────────────

  function getRankedFilters() {
    return {
      searchText: val('rankedSearch').trim().toLowerCase(),
      status:     val('rankedFilterStatus'),
      result:     val('rankedFilterResult'),
    };
  }

  function applyRankedFilters(data) {
    const { searchText, status, result } = getRankedFilters();
    return data.filter((m) => {
      if (searchText && !(m.opponent_name || '').toLowerCase().includes(searchText)) return false;
      if (status     && (m.status || '').toLowerCase() !== status.toLowerCase())    return false;
      if (result) {
        const r = getResult(m.our_score, m.opponent_score, m.result);
        if (r !== result.toLowerCase()) return false;
      }
      return true;
    });
  }

  function renderRankedEmpty(tbody, isFiltered) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state">
          <svg viewBox="0 0 24 24">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <h3>${isFiltered ? 'Tidak ada hasil' : 'Belum ada ranked'}</h3>
          <p>${isFiltered ? 'Tidak ada ranked yang sesuai filter.' : 'Catat game ranked untuk analisis performa individual'}</p>
          ${!isFiltered ? `
          <a href="addmatch.html" class="btn btn-primary btn-sm">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Ranked
          </a>` : ''}
        </div>
      </td></tr>`;
  }

  function renderRankedTable() {
    const tbody = document.getElementById('rankedBody');
    const countEl = document.getElementById('rankedCount');
    if (!tbody) return;

    const filtered   = applyRankedFilters(allRankeds);
    const isFiltered = allRankeds.length > 0 && filtered.length === 0;

    if (countEl) countEl.textContent = `${allRankeds.length} match`;

    if (filtered.length === 0) {
      renderRankedEmpty(tbody, isFiltered);
      return;
    }

    tbody.innerHTML = filtered.map((m, i) => {
      const our = m.our_score != null ? m.our_score : 0;
      const opp = m.opponent_score != null ? m.opponent_score : 0;
      return `
        <tr>
          <td>${i + 1}</td>
          <td><a href="editmatch.html?id=${m.id}" class="link-primary">${m.opponent_name || '-'}</a></td>
          <td>${our}:${opp}&nbsp;${resultBadgeHtml(our, opp, m.result)}</td>
          <td>${statusBadgeHtml(m.status)}</td>
          <td>
            <button class="btn btn-sm btn-danger" data-id="${m.id}" data-label="${(m.opponent_name || 'ranked').replace(/"/g, '&quot;')}">
              Hapus
            </button>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => handleDelete(Number(btn.dataset.id), btn.dataset.label));
    });
  }

  // ── Toolbar factory ───────────────────────────

  function makeSelect(id, placeholder, options, onChange) {
    const sel = document.createElement('select');
    sel.id = id;
    sel.className = 'form-select form-select-sm table-filter-select';
    sel.innerHTML = `<option value="">${placeholder}</option>` +
      options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    sel.addEventListener('change', onChange);
    return sel;
  }

  function setupScrimToolbar() {
    const tableWrap = document.getElementById('scrimTableWrap');
    if (!tableWrap || document.getElementById('scrimSearch')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'table-toolbar';

    const left = document.createElement('div');
    left.className = 'table-toolbar-left';
    const right = document.createElement('div');
    right.className = 'table-toolbar-right';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'scrimSearch';
    searchInput.className = 'form-input form-input-sm table-search-input';
    searchInput.placeholder = 'Cari nama lawan…';
    searchInput.addEventListener('input', renderScrimTable);
    left.appendChild(searchInput);

    right.appendChild(makeSelect('scrimFilterFormat', 'Format: Semua', [
      ['BO1','BO1'], ['BO2','BO2'], ['BO3','BO3'],
      ['BO4','BO4'], ['BO5','BO5'], ['BO7','BO7'],
    ], renderScrimTable));

    right.appendChild(makeSelect('scrimFilterStatus', 'Status: Semua', [
      ['upcoming','Upcoming'], ['finished','Finished'], ['cancel','Cancel'],
    ], renderScrimTable));

    right.appendChild(makeSelect('scrimFilterResult', 'Result: Semua', [
      ['win','Win'], ['draw','Draw'], ['lose','Lose'],
    ], renderScrimTable));

    toolbar.appendChild(left);
    toolbar.appendChild(right);
    tableWrap.parentElement.insertBefore(toolbar, tableWrap);
  }

  function setupRankedToolbar() {
    const tableWrap = document.getElementById('rankedTableWrap');
    if (!tableWrap || document.getElementById('rankedSearch')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'table-toolbar';

    const left = document.createElement('div');
    left.className = 'table-toolbar-left';
    const right = document.createElement('div');
    right.className = 'table-toolbar-right';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'rankedSearch';
    searchInput.className = 'form-input form-input-sm table-search-input';
    searchInput.placeholder = 'Cari sesi ranked…';
    searchInput.addEventListener('input', renderRankedTable);
    left.appendChild(searchInput);

    right.appendChild(makeSelect('rankedFilterStatus', 'Status: Semua', [
      ['upcoming','Upcoming'], ['finished','Finished'], ['cancel','Cancel'],
    ], renderRankedTable));

    right.appendChild(makeSelect('rankedFilterResult', 'Result: Semua', [
      ['win','Win'], ['draw','Draw'], ['lose','Lose'],
    ], renderRankedTable));

    toolbar.appendChild(left);
    toolbar.appendChild(right);
    tableWrap.parentElement.insertBefore(toolbar, tableWrap);
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
  });

})();