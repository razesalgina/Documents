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

  // ─────────────────────────────────────────────────────────────────
  // DELETE MODAL  (2-step) — FIX BUG-1 & BUG-3
  // Mengganti native confirm() dengan DeleteModal konsisten dengan
  // match.js, sekaligus mengirim mode:'cascade' agar child games
  // ikut terhapus dari DB.
  // ─────────────────────────────────────────────────────────────────
  const DeleteModal = (function () {
    let _overlay = null;

    function _ensureDOM() {
      if (_overlay) return;

      _overlay = document.createElement('div');
      _overlay.id = 'trainDeleteModal';
      _overlay.style.cssText = [
        'display:none',
        'position:fixed',
        'inset:0',
        'z-index:9999',
        'background:rgba(15,23,42,.55)',
        'backdrop-filter:blur(3px)',
        'align-items:center',
        'justify-content:center',
      ].join(';');

      _overlay.innerHTML = `
        <div id="trainDeleteModalBox" style="
          background:var(--color-surface,#fff);
          border:1px solid var(--color-border,#e2e8f0);
          border-radius:14px;
          box-shadow:0 20px 48px rgba(15,23,42,.18);
          padding:28px 28px 22px;
          width:min(440px,92vw);
          max-width:100%;
          font-family:inherit;
        ">
          <div id="trainDeleteModalContent"></div>
        </div>`;

      _overlay.addEventListener('click', (e) => {
        if (e.target === _overlay) _close();
      });
      document.body.appendChild(_overlay);
    }

    function _close() {
      if (_overlay) {
        _overlay.style.display = 'none';
        document.getElementById('trainDeleteModalContent').innerHTML = '';
      }
    }

    function _btn(label, variant) {
      const colors = {
        danger:    'background:#dc2626;color:#fff;border:none',
        secondary: 'background:var(--color-surface-offset,#f1f5f9);color:var(--color-text,#1e293b);border:1px solid var(--color-border,#e2e8f0)',
      };
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = label;
      b.style.cssText = `
        display:inline-flex;align-items:center;gap:6px;
        padding:9px 18px;border-radius:9px;cursor:pointer;
        font-size:0.875rem;font-weight:600;line-height:1;
        transition:filter .15s;
        ${colors[variant] || colors.secondary}
      `;
      b.addEventListener('mouseenter', () => { b.style.filter = 'brightness(.88)'; });
      b.addEventListener('mouseleave', () => { b.style.filter = ''; });
      return b;
    }

    function show(label, onConfirm) {
      _ensureDOM();
      const content = document.getElementById('trainDeleteModalContent');
      content.innerHTML = '';

      const icon = document.createElement('div');
      icon.style.cssText = 'font-size:2.5rem;text-align:center;margin-bottom:12px';
      icon.textContent = '\u26A0\uFE0F';

      const title = document.createElement('p');
      title.style.cssText = 'margin:0 0 8px;font-size:1rem;font-weight:700;color:var(--color-text,#1e293b);text-align:center';
      title.textContent = 'Konfirmasi Hapus';

      const msg = document.createElement('p');
      msg.style.cssText = 'margin:0 0 22px;font-size:.85rem;color:var(--color-text-muted,#64748b);text-align:center;line-height:1.55';
      msg.innerHTML = `Yakin ingin menghapus <strong>${label}</strong> beserta <strong>semua Game</strong> di dalamnya?<br><span style="color:#dc2626">Tindakan ini tidak bisa dibatalkan.</span>`;

      const footer = document.createElement('div');
      footer.style.cssText = 'display:flex;justify-content:flex-end;gap:10px';

      const cancelBtn = _btn('Batal', 'secondary');
      cancelBtn.addEventListener('click', _close);

      const confirmBtn = _btn('\uD83D\uDDD1\uFE0F Ya, Hapus', 'danger');
      confirmBtn.addEventListener('click', () => { _close(); onConfirm(); });

      footer.appendChild(cancelBtn);
      footer.appendChild(confirmBtn);

      content.appendChild(icon);
      content.appendChild(title);
      content.appendChild(msg);
      content.appendChild(footer);

      _overlay.style.display = 'flex';
    }

    return { show, close: _close };
  })();

  // ── handleDelete — FIX BUG-1, BUG-3 ─────────
  // Pakai DeleteModal (bukan confirm()), kirim mode:'cascade'
  // agar match_api.php selalu hapus match + semua game anak.
  function handleDelete(id, label) {
    DeleteModal.show(label, function () {
      const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
      fetch(`${apiBase}match_api.php`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // FIX BUG-3: tambah mode:'cascade' supaya child games ikut terhapus
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
    const tbody   = document.getElementById('scrimBody');
    const countEl = document.getElementById('scrimCount');
    if (!tbody) return;

    const filtered   = applyScrimFilters(allScrims);
    const isFiltered = allScrims.length > 0 && filtered.length === 0;

    // FIX BUG-4: tampilkan filtered.length saat filter aktif,
    // total allScrims.length hanya saat tidak ada filter.
    if (countEl) {
      const hasActiveFilter = Object.values(getScrimFilters()).some(Boolean);
      countEl.textContent = hasActiveFilter
        ? `${filtered.length} / ${allScrims.length} match`
        : `${allScrims.length} match`;
    }

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
    const tbody   = document.getElementById('rankedBody');
    const countEl = document.getElementById('rankedCount');
    if (!tbody) return;

    const filtered   = applyRankedFilters(allRankeds);
    const isFiltered = allRankeds.length > 0 && filtered.length === 0;

    // FIX BUG-4: badge counter sinkron dengan hasil filter
    if (countEl) {
      const hasActiveFilter = Object.values(getRankedFilters()).some(Boolean);
      countEl.textContent = hasActiveFilter
        ? `${filtered.length} / ${allRankeds.length} match`
        : `${allRankeds.length} match`;
    }

    if (filtered.length === 0) {
      renderRankedEmpty(tbody, isFiltered);
      return;
    }

    tbody.innerHTML = filtered.map((m, i) => {
      const our = m.our_score != null ? m.our_score : 0;
      const opp = m.opponent_score != null ? m.opponent_score : 0;
      const safeLabel = (m.opponent_name || 'ranked').replace(/"/g, '&quot;');
      return `
        <tr>
          <td>${i + 1}</td>
          <td><a href="editmatch.html?id=${m.id}" class="link-primary">${m.opponent_name || '-'}</a></td>
          <td>${our}:${opp}&nbsp;${resultBadgeHtml(our, opp, m.result)}</td>
          <td>${statusBadgeHtml(m.status)}</td>
          <td>
            <button class="btn btn-sm btn-danger" data-id="${m.id}" data-label="${safeLabel}">
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

    const left  = document.createElement('div');
    left.className  = 'table-toolbar-left';
    const right = document.createElement('div');
    right.className = 'table-toolbar-right';

    const searchInput = document.createElement('input');
    searchInput.type        = 'text';
    searchInput.id          = 'scrimSearch';
    searchInput.className   = 'form-input form-input-sm table-search-input';
    searchInput.placeholder = 'Cari nama lawan\u2026';
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

    const left  = document.createElement('div');
    left.className  = 'table-toolbar-left';
    const right = document.createElement('div');
    right.className = 'table-toolbar-right';

    const searchInput = document.createElement('input');
    searchInput.type        = 'text';
    searchInput.id          = 'rankedSearch';
    searchInput.className   = 'form-input form-input-sm table-search-input';
    searchInput.placeholder = 'Cari sesi ranked\u2026';
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
