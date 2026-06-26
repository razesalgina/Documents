// js/match.js
(function () {

  // ── State ──────────────────────────
  let allMatches      = [];
  let competitionId   = 0;
  let competitionName = '';

  // Sort state: { key: string|null, dir: 'asc'|'desc' }
  const matchSort = { key: null, dir: 'asc' };

  // ── Helpers ───────────────────────
  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function showToast(message, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(message, type);
    }
  }

  // ── Badge helpers ────────────────────
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
    const r      = getResult(our, opp, resultFromDb);
    const cssMap = { win: 'badge badge-green', lose: 'badge badge-red', draw: 'badge badge-yellow' };
    const label  = r.charAt(0).toUpperCase() + r.slice(1);
    return `<span class="${cssMap[r] || 'badge badge-neutral'}">${label}</span>`;
  }

  // TAMBAH — setelah fungsi resultBadgeHtml
  function scoreBadgeHtml(our, opp) {
    return [
      `<span class="badge badge-blue">${our}</span>`,
      `<span class="badge badge-neutral">:</span>`,
      `<span class="badge badge-red">${opp}</span>`,
    ].join(' ');
  }

  function statusBadgeHtml(status) {
    const s        = (status || '').toLowerCase();
    const cssMap   = { upcoming: 'badge badge-yellow', finished: 'badge badge-green', cancel: 'badge badge-red' };
    const labelMap = { upcoming: 'Upcoming', finished: 'Finished', cancel: 'Cancel' };
    return `<span class="${cssMap[s] || 'badge badge-neutral'}">${labelMap[s] || s || '-'}</span>`;
  }

  function formatTypeLabel(type) {
    const map = { tournament: 'Tournament', league: 'League', scrim: 'Scrim', ranked: 'Ranked' };
    return map[(type || '').toLowerCase()] || type || '-';
  }

  // ── Sort helpers ─────────────────────────────────────────────────

  const SORT_ICON = {
    none: `<svg class="sort-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M7 15l5 5 5-5M7 9l5-5 5 5"/></svg>`,
    asc:  `<svg class="sort-icon sort-active" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 15l7-7 7 7"/></svg>`,
    desc: `<svg class="sort-icon sort-active" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M19 9l-7 7-7-7"/></svg>`,
  };

  function applySorting(data, sortState) {
    if (!sortState.key) return data;
    const { key, dir } = sortState;
    const mul = dir === 'asc' ? 1 : -1;

    return [...data].sort((a, b) => {
      let av, bv;
      switch (key) {
        case 'date':
          av = a.match_date || '';
          bv = b.match_date || '';
          break;
        case 'opponent':
          av = (a.opponent_name || '').toLowerCase();
          bv = (b.opponent_name || '').toLowerCase();
          break;
        case 'kategori':
          av = (a.type || '').toLowerCase();
          bv = (b.type || '').toLowerCase();
          break;
        case 'score':
          av = (parseInt(a.our_score, 10) || 0) - (parseInt(a.opponent_score, 10) || 0);
          bv = (parseInt(b.our_score, 10) || 0) - (parseInt(b.opponent_score, 10) || 0);
          return (av - bv) * mul;
        case 'format':
          av = (a.format || '').toUpperCase();
          bv = (b.format || '').toUpperCase();
          break;
        case 'status':
          av = (a.status || '').toLowerCase();
          bv = (b.status || '').toLowerCase();
          break;
        case 'result':
          av = getResult(a.our_score, a.opponent_score, a.result);
          bv = getResult(b.our_score, b.opponent_score, b.result);
          break;
        default:
          return 0;
      }
      if (av < bv) return -1 * mul;
      if (av > bv) return  1 * mul;
      return 0;
    });
  }

  function bindSortHeaders(theadId, sortState, rerender) {
    const thead = document.getElementById(theadId);
    if (!thead) return;
    thead.querySelectorAll('th[data-sort-key]').forEach((th) => {
      th.style.cursor     = 'pointer';
      th.style.userSelect = 'none';
      th.style.whiteSpace = 'nowrap';
      th.addEventListener('click', () => {
        const k = th.dataset.sortKey;
        if (sortState.key === k) {
          sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
        } else {
          sortState.key = k;
          sortState.dir = 'asc';
        }
        rerender();
      });
    });
  }

  function updateSortIcons(theadId, sortState) {
    const thead = document.getElementById(theadId);
    if (!thead) return;
    thead.querySelectorAll('th[data-sort-key]').forEach((th) => {
      const iconEl = th.querySelector('.sort-icon-wrap');
      if (!iconEl) return;
      const isActive = sortState.key === th.dataset.sortKey;
      iconEl.innerHTML = isActive ? SORT_ICON[sortState.dir] : SORT_ICON.none;
    });
  }

  // ── DELETE MODAL  (2 langkah) ─────────────────────────────────────
  const DeleteModal = (function () {
    let _overlay = null;

    function _ensureDOM() {
      if (_overlay) return;
      _overlay = document.createElement('div');
      _overlay.id = 'matchDeleteModal';
      _overlay.style.cssText = [
        'display:none', 'position:fixed', 'inset:0', 'z-index:9999',
        'background:rgba(15,23,42,.55)', 'backdrop-filter:blur(3px)',
        'align-items:center', 'justify-content:center',
      ].join(';');
      _overlay.innerHTML = `
        <div id="matchDeleteModalBox" style="
          background:var(--color-surface,#fff);
          border:1px solid var(--color-border,#e2e8f0);
          border-radius:14px;
          box-shadow:0 20px 48px rgba(15,23,42,.18);
          padding:28px 28px 22px;
          width:min(440px,92vw);
          max-width:100%;
          font-family:inherit;
        ">
          <div id="matchDeleteModalContent"></div>
        </div>`;
      _overlay.addEventListener('click', (e) => { if (e.target === _overlay) _close(); });
      document.body.appendChild(_overlay);
    }

    function _close() {
      if (_overlay) {
        _overlay.style.display = 'none';
        document.getElementById('matchDeleteModalContent').innerHTML = '';
      }
    }

    function _btn(label, variant) {
      const colors = {
        danger:    'background:#dc2626;color:#fff;border:none',
        warning:   'background:#d97706;color:#fff;border:none',
        secondary: 'background:var(--color-surface-offset,#f1f5f9);color:var(--color-text,#1e293b);border:1px solid var(--color-border,#e2e8f0)',
      };
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = label;
      b.style.cssText = `display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:9px;cursor:pointer;font-size:0.875rem;font-weight:600;line-height:1;transition:filter .15s;${colors[variant] || colors.secondary}`;
      b.addEventListener('mouseenter', () => b.style.filter = 'brightness(.88)');
      b.addEventListener('mouseleave', () => b.style.filter = '');
      return b;
    }

    function showStep1(label, onMode) {
      _ensureDOM();
      const content = document.getElementById('matchDeleteModalContent');
      content.innerHTML = '';
      const title = document.createElement('p');
      title.style.cssText = 'margin:0 0 6px;font-size:1.05rem;font-weight:700;color:var(--color-text,#1e293b)';
      title.textContent = `Hapus ${label}`;
      const sub = document.createElement('p');
      sub.style.cssText = 'margin:0 0 20px;font-size:.85rem;color:var(--color-text-muted,#64748b)';
      sub.textContent = 'Pilih cara penghapusan:';
      const cards = document.createElement('div');
      cards.style.cssText = 'display:flex;flex-direction:column;gap:10px;margin-bottom:20px';
      const makeCard = (icon, heading, desc, mode) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.style.cssText = `display:flex;align-items:flex-start;gap:12px;padding:13px 14px;border-radius:10px;cursor:pointer;border:1.5px solid var(--color-border,#e2e8f0);background:var(--color-surface,#fff);text-align:left;transition:border-color .15s,background .15s;`;
        card.innerHTML = `<span style="font-size:1.4rem;line-height:1">${icon}</span><span><strong style="display:block;font-size:.875rem;color:var(--color-text,#1e293b);margin-bottom:2px">${heading}</strong><span style="font-size:.78rem;color:var(--color-text-muted,#64748b);line-height:1.4">${desc}</span></span>`;
        card.addEventListener('mouseenter', () => { card.style.borderColor = 'var(--color-primary,#2563eb)'; card.style.background = 'var(--color-primary-highlight,#eff6ff)'; });
        card.addEventListener('mouseleave', () => { card.style.borderColor = 'var(--color-border,#e2e8f0)'; card.style.background = 'var(--color-surface,#fff)'; });
        card.addEventListener('click', () => { _close(); onMode(mode); });
        return card;
      };
      cards.appendChild(makeCard('\uD83D\uDDD1\uFE0F', 'Hapus beserta semua Game di dalamnya', 'Match ini dan semua data Game di dalamnya akan dihapus secara permanen.', 'cascade'));
      cards.appendChild(makeCard('\uD83D\uDEAB', 'Hapus match dan semua Game-nya', 'Match beserta semua data Game akan dihapus. Tindakan ini tidak bisa dibatalkan.', 'detach'));
      const footer = document.createElement('div');
      footer.style.cssText = 'display:flex;justify-content:flex-end';
      const cancelBtn = _btn('Batal', 'secondary');
      cancelBtn.addEventListener('click', _close);
      footer.appendChild(cancelBtn);
      content.appendChild(title); content.appendChild(sub); content.appendChild(cards); content.appendChild(footer);
      _overlay.style.display = 'flex';
    }

    function showStep2(label, mode, onConfirm) {
      _ensureDOM();
      const content = document.getElementById('matchDeleteModalContent');
      content.innerHTML = '';
      const isCascade = mode === 'cascade';
      const icon = document.createElement('div');
      icon.style.cssText = 'font-size:2.5rem;text-align:center;margin-bottom:12px';
      icon.textContent = '\u26A0\uFE0F';
      const title = document.createElement('p');
      title.style.cssText = 'margin:0 0 8px;font-size:1rem;font-weight:700;color:var(--color-text,#1e293b);text-align:center';
      title.textContent = isCascade ? 'Konfirmasi Hapus Semua' : 'Konfirmasi Hapus Match & Game';
      const msg = document.createElement('p');
      msg.style.cssText = 'margin:0 0 22px;font-size:.85rem;color:var(--color-text-muted,#64748b);text-align:center;line-height:1.55';
      msg.innerHTML = isCascade
        ? `Yakin ingin menghapus <strong>${label}</strong> beserta <strong>semua Game</strong> di dalamnya?<br><span style="color:#dc2626">Tindakan ini tidak bisa dibatalkan.</span>`
        : `Yakin ingin menghapus <strong>${label}</strong> beserta <strong>semua Game</strong>-nya?<br><span style="color:#dc2626">Tindakan ini tidak bisa dibatalkan.</span>`;
      const footer = document.createElement('div');
      footer.style.cssText = 'display:flex;justify-content:flex-end;gap:10px';
      const backBtn = _btn('\u2190 Kembali', 'secondary');
      backBtn.addEventListener('click', () => showStep1(label, (m) => showStep2(label, m, onConfirm)));
      const confirmBtn = _btn(isCascade ? '\uD83D\uDDD1\uFE0F Ya, Hapus Semua' : '\uD83D\uDEAB Ya, Hapus Match & Game', 'danger');
      confirmBtn.addEventListener('click', () => { _close(); onConfirm(mode); });
      footer.appendChild(backBtn); footer.appendChild(confirmBtn);
      content.appendChild(icon); content.appendChild(title); content.appendChild(msg); content.appendChild(footer);
      _overlay.style.display = 'flex';
    }

    return { showStep1, showStep2, close: _close };
  })();

  function handleDeleteMatch(id, opponentName) {
    const label = opponentName ? `Match vs "${opponentName}"` : `match #${id}`;
    DeleteModal.showStep1(label, function (mode) {
      DeleteModal.showStep2(label, mode, function (confirmedMode) {
        const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
        fetch(`${apiBase}match_api.php`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action: 'delete', id, mode: 'cascade' }),
        })
          .then(async (res) => {
            const json = await res.json().catch(() => null);
            if (!json || !json.ok) throw new Error((json && json.message) || 'Gagal menghapus.');
            showToast(`${label.charAt(0).toUpperCase() + label.slice(1)} beserta semua Game-nya berhasil dihapus.`, 'success');
            loadMatches();
          })
          .catch((err) => showToast(err.message || 'Gagal menghapus match.', 'error'));
      });
    });
  }

  // ── Filter helpers ────────────────────────────────────────────────

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  /** Filter date range: true jika match_date berada di dalam [from, to] */
  function inDateRange(m, from, to) {
    if (!from && !to) return true;
    const d = m.match_date || '';
    if (!d) return false;
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  }

  function getFilters() {
    return {
      searchText: val('matchSearch').trim().toLowerCase(),
      kategori:   val('matchFilterKategori'),
      format:     val('matchFilterFormat'),
      status:     val('matchFilterStatus'),
      result:     val('matchFilterResult'),
      dateFrom:   val('matchDateFrom'),
      dateTo:     val('matchDateTo'),
    };
  }

  function applyFilters(data) {
    const { searchText, kategori, format, status, result, dateFrom, dateTo } = getFilters();
    return data.filter((m) => {
      if (searchText && !(m.opponent_name || '').toLowerCase().includes(searchText)) return false;
      if (kategori   && (m.type   || '').toLowerCase() !== kategori.toLowerCase())  return false;
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

  // ── Render ───────────────────────
  function renderEmptyState(tbody, isFiltered) {
    const addLink = competitionId ? `addmatch.html?competition_id=${competitionId}` : 'addmatch.html';
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state">
          <svg viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <h3>${isFiltered ? 'Tidak ada hasil' : 'Belum ada match'}</h3>
          <p>${isFiltered ? 'Tidak ada match yang sesuai filter.' : 'Tambahkan match pertama untuk mulai melacak performa tim'}</p>
          ${!isFiltered ? `
          <a href="${addLink}" class="btn btn-primary btn-sm">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Match
          </a>` : ''}
        </div>
      </td></tr>`;
  }

  function renderFilteredTable() {
    const tbody = document.getElementById('matchBody');
    if (!tbody) return;

    const source     = competitionId
      ? allMatches.filter((m) => m.competition_id == competitionId)
      : allMatches;
    const filtered   = applyFilters(source);
    const sorted     = applySorting(filtered, matchSort);
    const isFiltered = source.length > 0 && filtered.length === 0;

    updateSortIcons('matchThead', matchSort);

    if (sorted.length === 0) { renderEmptyState(tbody, isFiltered); return; }

    tbody.innerHTML = sorted.map((m, i) => {
      const our = m.our_score != null ? m.our_score : 0;
      const opp = m.opponent_score != null ? m.opponent_score : 0;
      const safeOpponent = (m.opponent_name || '').replace(/"/g, '&quot;');
      const dateDisplay  = m.match_date
        ? new Date(m.match_date + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        : '-';

      return `
        <tr>
          <td>${i + 1}</td>
          <td>${dateDisplay}</td>
          <td>
            <a href="game.html?match_id=${m.id}" class="link-primary">${m.opponent_name || '-'}</a>
          </td>
          <td>${formatTypeLabel(m.type)}</td>
          <td>${scoreBadgeHtml(our, opp)}&nbsp;${resultBadgeHtml(our, opp, m.result)}</td>
          <td>${m.format || '-'}</td>
          <td>${statusBadgeHtml(m.status)}</td>
          <td>
            <div class="btn-action-group">
              <a href="editmatch.html?id=${m.id}" class="btn btn-sm btn-outline">
                <svg aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>Edit
              </a>
              <button class="btn btn-sm btn-danger" data-id="${m.id}" data-name="${safeOpponent}">Hapus</button>
            </div>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => handleDeleteMatch(Number(btn.dataset.id), btn.dataset.name));
    });
  }

  // ── Toolbar ──────────────────────
  function makeSelect(id, placeholder, options) {
    const sel = document.createElement('select');
    sel.id        = id;
    sel.className = 'form-select form-select-sm table-filter-select';
    sel.innerHTML = `<option value="">${placeholder}</option>` +
      options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    sel.addEventListener('change', renderFilteredTable);
    return sel;
  }

  function makeDateInput(id, placeholder) {
    const input = document.createElement('input');
    input.type        = 'date';
    input.id          = id;
    input.className   = 'form-input form-input-sm table-filter-date';
    input.title       = placeholder;
    input.style.cssText = 'width:auto;min-width:130px';
    input.addEventListener('change', renderFilteredTable);
    return input;
  }

  function setupToolbar() {
    const tableWrap = document.getElementById('matchTableWrap');
    if (!tableWrap || document.getElementById('matchSearch')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'table-toolbar';

    const left  = document.createElement('div'); left.className  = 'table-toolbar-left';
    const right = document.createElement('div'); right.className = 'table-toolbar-right';

    // Search input
    const searchInput = document.createElement('input');
    searchInput.type        = 'text';
    searchInput.id          = 'matchSearch';
    searchInput.className   = 'form-input form-input-sm table-search-input';
    searchInput.placeholder = 'Cari nama lawan\u2026';
    searchInput.addEventListener('input', renderFilteredTable);
    left.appendChild(searchInput);

    // Date range
    const dateWrap = document.createElement('div');
    dateWrap.className  = 'date-range-wrap';
    dateWrap.style.cssText = 'display:flex;align-items:center;gap:6px';
    const dateLabel = document.createElement('span');
    dateLabel.style.cssText = 'font-size:0.8125rem;color:var(--color-text-muted,#64748b);white-space:nowrap';
    const dateSep = document.createElement('span');
    dateSep.textContent = '\u2013';
    dateSep.style.cssText = 'color:var(--color-text-muted,#64748b)';
    dateWrap.appendChild(dateLabel);
    dateWrap.appendChild(makeDateInput('matchDateFrom', 'Dari tanggal'));
    dateWrap.appendChild(dateSep);
    dateWrap.appendChild(makeDateInput('matchDateTo', 'Sampai tanggal'));
    left.appendChild(dateWrap);

    // Selects
    right.appendChild(makeSelect('matchFilterKategori', 'Kategori: Semua', [
      ['tournament','Tournament'], ['league','League'], ['scrim','Scrim'], ['ranked','Ranked'],
    ]));
    right.appendChild(makeSelect('matchFilterFormat', 'Format: Semua', [
      ['BO1','BO1'], ['BO2','BO2'], ['BO3','BO3'],
      ['BO4','BO4'], ['BO5','BO5'], ['BO7','BO7'],
    ]));
    right.appendChild(makeSelect('matchFilterStatus', 'Status: Semua', [
      ['upcoming','Upcoming'], ['finished','Finished'], ['cancel','Cancel'],
    ]));
    right.appendChild(makeSelect('matchFilterResult', 'Result: Semua', [
      ['win','Win'], ['draw','Draw'], ['lose','Lose'],
    ]));

    toolbar.appendChild(left);
    toolbar.appendChild(right);
    tableWrap.parentElement.insertBefore(toolbar, tableWrap);
  }

  // ── Table header dengan sort ─────────────────────────────────────
  function setupTableHeader() {
    const table = document.querySelector('#matchTableWrap table');
    if (!table) return;

    const sortCols = [
      { key: 'date',     label: 'Tanggal' },
      { key: 'opponent', label: 'Nama Lawan' },
      { key: 'kategori', label: 'Kategori' },
      { key: 'score',    label: 'Score' },
      { key: 'format',   label: 'Format' },
      { key: 'status',   label: 'Status' },
    ];

    const thead = table.querySelector('thead');
    if (!thead) return;
    thead.id = 'matchThead';

    const tr = thead.querySelector('tr');
    if (!tr) return;

    tr.innerHTML = `<th>#</th>` +
      sortCols.map(({ key, label }) =>
        `<th data-sort-key="${key}">${label} <span class="sort-icon-wrap">${SORT_ICON.none}</span></th>`
      ).join('') +
      `<th>Aksi</th>`;

    bindSortHeaders('matchThead', matchSort, renderFilteredTable);
  }

  // ── Competition context ──────────────
  function setupCompetitionContext() {
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      if (competitionId) { backBtn.href = 'competition.html'; }
      else { backBtn.style.display = 'none'; }
    }

    const addMatchBtn = document.getElementById('addMatchBtn');
    if (addMatchBtn && competitionId) {
      addMatchBtn.href = `addmatch.html?competition_id=${competitionId}&from=match`;
    }

    if (!competitionId) return;

    const breadcrumbWrap = document.querySelector('.topbar-breadcrumb');
    if (breadcrumbWrap) {
      const current = breadcrumbWrap.querySelector('.current');
      if (current && !breadcrumbWrap.querySelector('a[href="competition.html"]')) {
        const sepComp  = document.createElement('span'); sepComp.className = 'sep'; sepComp.textContent = '/';
        const linkComp = document.createElement('a');
        linkComp.href        = 'competition.html';
        linkComp.textContent = 'Competition';
        const sepMatch = document.createElement('span'); sepMatch.className = 'sep'; sepMatch.textContent = '/';
        current.parentElement.insertBefore(sepComp,  current);
        current.parentElement.insertBefore(linkComp, sepComp);
        current.textContent = 'Match';
      }
    }

    const pageTitle = document.querySelector('.page-title');
    const pageSub   = document.querySelector('.page-sub');
    if (pageTitle) pageTitle.textContent = competitionName ? `${competitionName}` : 'Match Turnamen';
    if (pageSub)   pageSub.textContent   = competitionName
      ? `Daftar match untuk ${competitionName}`
      : 'Daftar match untuk turnamen ini';

    const sectionTitle = document.querySelector('#matchSection .section-title');
    if (sectionTitle) sectionTitle.textContent = competitionName
      ? `Match: ${competitionName}`
      : 'Match Turnamen Ini';
  }

  // ── Fetch competition name ─────────────────
  async function fetchCompetitionName(cid) {
    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    try {
      const res  = await fetch(`${apiBase}competition_api.php?action=get&id=${cid}`);
      const json = await res.json().catch(() => null);
      if (json && json.ok && json.competition) return json.competition.name || '';
    } catch (_) { /* silent */ }
    return '';
  }

  // ── Fetch & init ──────────────────────
  function loadMatches() {
    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    const url = competitionId
      ? `${apiBase}match_api.php?action=list&competition_id=${competitionId}`
      : `${apiBase}match_api.php?action=list`;

    fetch(url)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error('Gagal mengambil data match');
        return json.matches || [];
      })
      .then((matches) => {
        allMatches = matches;
        renderFilteredTable();
      })
      .catch((err) => showToast(err.message || 'Gagal memuat match.', 'error'));
  }

  document.addEventListener('DOMContentLoaded', async () => {
    competitionId = parseInt(getParam('competition_id') || '0', 10);

    if (competitionId > 0) {
      competitionName = await fetchCompetitionName(competitionId);
    }

    setupToolbar();
    setupTableHeader();
    setupCompetitionContext();
    loadMatches();
  });

})();
