// js/competition.js
(function () {
  let allCompetitions = [];

  function getElements() {
    return {
      tournamentBody: document.getElementById('tournamentBody'),
      leagueBody: document.getElementById('leagueBody'),
      tournamentTableWrap: document.querySelector('#tournamentSection .table-wrap'),
      leagueTableWrap: document.querySelector('#leagueSection .table-wrap'),
    };
  }

  function clearTableBody(bodyElement) {
    if (!bodyElement) return;
    while (bodyElement.firstChild) {
      bodyElement.removeChild(bodyElement.firstChild);
    }
  }

  function showToast(message, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(message, type);
    }
  }

  function handleDeleteCompetition(id, name) {
    if (!confirm(`Hapus kompetisi "${name}"? Tindakan ini tidak bisa dibatalkan.`)) return;

    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    fetch(`${apiBase}competition_api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error((json && json.message) || 'Gagal menghapus.');
        showToast(`Kompetisi "${name}" berhasil dihapus.`, 'success');
        initCompetitionPage();
      })
      .catch((error) => {
        showToast(error.message || 'Gagal menghapus kompetisi.', 'error');
      });
  }

  function createCompetitionRow(competition, index) {
    const row = document.createElement('tr');

    // No.
    const indexCell = document.createElement('td');
    indexCell.textContent = String(index + 1);

    // Nama (klik untuk edit)
    const nameCell = document.createElement('td');
    const nameLink = document.createElement('a');
    nameLink.href = `editcompetition.html?id=${competition.id}`;
    nameLink.textContent = competition.name || '-';
    nameLink.className = 'link-primary';
    nameCell.appendChild(nameLink);

    // Total tim
    const teamCountCell = document.createElement('td');
    teamCountCell.textContent = String(competition.team_count || 0);

    // Prizepool (bold)
    const prizepoolCell = document.createElement('td');
    const prizeStrong = document.createElement('strong');
    if (competition.prizepool) {
      prizeStrong.textContent = `Rp ${Number(competition.prizepool).toLocaleString('id-ID')}`;
    } else {
      prizeStrong.textContent = '-';
    }
    prizepoolCell.appendChild(prizeStrong);

    // Rank akhir
    const rankCell = document.createElement('td');
    rankCell.textContent = competition.final_rank || '-';

    // Status badge
    const statusCell = document.createElement('td');
    const badge = document.createElement('span');
    const rawStatus = (competition.status || '').toLowerCase();
    const statusMap = {
      '': 'badge badge-neutral',
      upcoming: 'badge badge-yellow',
      cancel: 'badge badge-red',
      finished: 'badge badge-green',
    };
    badge.className = statusMap[rawStatus] || 'badge badge-neutral';
    const statusLabelMap = { '': 'Unknown', upcoming: 'Upcoming', cancel: 'Cancel', finished: 'Finished' };
    badge.textContent = statusLabelMap[rawStatus] || 'Unknown';
    statusCell.appendChild(badge);

    // Aksi: Edit + Hapus
    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions-cell';

    const editBtn = document.createElement('a');
    editBtn.href = `editcompetition.html?id=${competition.id}`;
    editBtn.className = 'btn btn-sm btn-secondary';
    editBtn.textContent = 'Edit';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-danger';
    deleteBtn.textContent = 'Hapus';
    deleteBtn.addEventListener('click', () =>
      handleDeleteCompetition(competition.id, competition.name),
    );

    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(deleteBtn);

    row.appendChild(indexCell);
    row.appendChild(nameCell);
    row.appendChild(teamCountCell);
    row.appendChild(prizepoolCell);
    row.appendChild(rankCell);
    row.appendChild(statusCell);
    row.appendChild(actionsCell);

    return row;
  }

  // -------- Search & Filter --------

  function getFiltersFromControls(prefix) {
    const searchInput = document.getElementById(`${prefix}Search`);
    const statusSelect = document.getElementById(`${prefix}FilterStatus`);
    const rankSelect = document.getElementById(`${prefix}FilterRank`);
    const prizeSelect = document.getElementById(`${prefix}FilterPrize`);

    return {
      searchText: searchInput ? searchInput.value.trim().toLowerCase() : '',
      status: statusSelect ? statusSelect.value : '',
      rank: rankSelect ? rankSelect.value : '',
      prize: prizeSelect ? prizeSelect.value : '',
    };
  }

  function applyFilters(data, prefix) {
    const { searchText, status, rank, prize } = getFiltersFromControls(prefix);

    return data.filter((c) => {
      if (searchText) {
        const name = (c.name || '').toLowerCase();
        if (!name.includes(searchText)) return false;
      }
      if (status) {
        const s = (c.status || '').toLowerCase();
        if (s !== status) return false;
      }
      if (rank) {
        const r = (c.final_rank || '').toLowerCase();
        if (r !== rank.toLowerCase()) return false;
      }
      if (prize) {
        const p = Number(c.prizepool || 0);
        if (prize === 'zero' && p !== 0) return false;
        if (prize === 'lt10' && !(p > 0 && p < 10_000_000)) return false;
        if (prize === '10to50' && !(p >= 10_000_000 && p <= 50_000_000)) return false;
        if (prize === 'gt50' && !(p > 50_000_000)) return false;
      }
      return true;
    });
  }

  function renderFilteredTables() {
    const { tournamentBody, leagueBody } = getElements();
    if (!tournamentBody || !leagueBody) return;

    clearTableBody(tournamentBody);
    clearTableBody(leagueBody);

    if (!allCompetitions || allCompetitions.length === 0) return;

    const tournamentsAll = allCompetitions.filter((c) => c.type === 'tournament');
    const leaguesAll     = allCompetitions.filter((c) => c.type === 'league');

    const tournaments = applyFilters(tournamentsAll, 'tournament');
    const leagues     = applyFilters(leaguesAll, 'league');

    const emptyHtml = (type, label, addLabel) => `
      <tr><td colspan="7">
        <div class="empty-state">
          <svg viewBox="0 0 24 24">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
            <path d="M4 22h16"/>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
          </svg>
          <h3>${label}</h3>
          <p>Mulai dengan menambahkan ${type} pertama tim kamu</p>
          <a href="addcompetition.html" class="btn btn-primary btn-sm">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${addLabel}
          </a>
        </div>
      </td></tr>`;

    if (tournaments.length === 0) {
      tournamentBody.innerHTML = emptyHtml('turnamen', 'Belum ada turnamen', 'Tambah Turnamen Baru');
    } else {
      tournaments.forEach((c, i) => tournamentBody.appendChild(createCompetitionRow(c, i)));
    }

    if (leagues.length === 0) {
      leagueBody.innerHTML = emptyHtml('liga', 'Belum ada liga', 'Tambah Liga Baru');
    } else {
      leagues.forEach((c, i) => leagueBody.appendChild(createCompetitionRow(c, i)));
    }
  }

  // -------- Toolbar --------

  function createTableToolbar({ prefix, title, container }) {
    if (!container) return null;

    const toolbar = document.createElement('div');
    toolbar.className = 'table-toolbar';

    const left  = document.createElement('div');
    left.className = 'table-toolbar-left';
    const right = document.createElement('div');
    right.className = 'table-toolbar-right';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = `${prefix}Search`;
    searchInput.className = 'form-input form-input-sm table-search-input';
    searchInput.placeholder = `Cari ${title}`;
    searchInput.addEventListener('input', renderFilteredTables);
    left.appendChild(searchInput);

    const makeSelect = (id, placeholder, options) => {
      const sel = document.createElement('select');
      sel.id = id;
      sel.className = 'form-select form-select-sm table-filter-select';
      sel.innerHTML = `<option value="">${placeholder}</option>` +
        options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
      sel.addEventListener('change', renderFilteredTables);
      return sel;
    };

    right.appendChild(makeSelect(`${prefix}FilterStatus`, 'Status: Semua', [
      ['upcoming','Upcoming'], ['cancel','Cancel'], ['finished','Finished'],
    ]));
    right.appendChild(makeSelect(`${prefix}FilterRank`, 'Rank: Semua', [
      ['1st','1st'], ['2nd','2nd'], ['3rd','3rd'], ['4th','4th'],
      ['8th','8th'], ['16th','16th'], ['failed','Failed'],
    ]));
    right.appendChild(makeSelect(`${prefix}FilterPrize`, 'Prizepool: Semua', [
      ['zero','0'], ['lt10','< 10 Juta'], ['10to50','10–50 Juta'], ['gt50','> 50 Juta'],
    ]));

    toolbar.appendChild(left);
    toolbar.appendChild(right);
    container.parentElement.insertBefore(toolbar, container);
    return toolbar;
  }

  function setupToolbars() {
    const { tournamentTableWrap, leagueTableWrap } = getElements();
    createTableToolbar({ prefix: 'tournament', title: 'turnamen', container: tournamentTableWrap });
    createTableToolbar({ prefix: 'league',     title: 'liga',     container: leagueTableWrap });
  }

  // -------- Fetch & init --------

  function fetchCompetitions() {
    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    return fetch(`${apiBase}competition_api.php?action=list`)
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (!response.ok || !json || !json.ok) throw new Error((json && json.message) || 'Gagal memuat data kompetisi.');
        return json.competitions || [];
      })
      .catch((error) => {
        showToast(error.message || 'Gagal memuat kompetisi.', 'error');
        return [];
      });
  }

  function initCompetitionPage() {
    fetchCompetitions().then((competitions) => {
      allCompetitions = competitions;
      renderFilteredTables();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupToolbars();
    initCompetitionPage();
  });
})();