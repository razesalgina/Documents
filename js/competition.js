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

    // Status (badge style baru)
    const statusCell = document.createElement('td');
    const badge = document.createElement('span');

    const rawStatus = (competition.status || '').toLowerCase();
    const statusMap = {
      '': 'badge badge-neutral', // Unknown
      upcoming: 'badge badge-yellow',
      cancel: 'badge badge-red',
      finished: 'badge badge-green',
    };

    badge.className = statusMap[rawStatus] || 'badge badge-neutral';

    const statusLabelMap = {
      '': 'Unknown',
      upcoming: 'Upcoming',
      cancel: 'Cancel',
      finished: 'Finished',
    };
    badge.textContent = statusLabelMap[rawStatus] || 'Unknown';

    statusCell.appendChild(badge);

    // Aksi (hapus saja, tanpa Edit)
    const actionsCell = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-danger';
    deleteBtn.textContent = 'Hapus';
    deleteBtn.addEventListener('click', () =>
      handleDeleteCompetition(competition.id, competition.name),
    );
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
      // Search nama
      if (searchText) {
        const name = (c.name || '').toLowerCase();
        if (!name.includes(searchText)) return false;
      }

      // Status
      if (status) {
        const s = (c.status || '').toLowerCase();
        if (s !== status) return false;
      }

      // Rank
      if (rank) {
        const r = (c.final_rank || '').toLowerCase();
        if (r !== rank.toLowerCase()) return false;
      }

      // Prizepool
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

    if (!allCompetitions || allCompetitions.length === 0) {
      return;
    }

    const tournamentsAll = allCompetitions.filter((c) => c.type === 'tournament');
    const leaguesAll = allCompetitions.filter((c) => c.type === 'league');

    const tournaments = applyFilters(tournamentsAll, 'tournament');
    const leagues = applyFilters(leaguesAll, 'league');

    if (tournaments.length === 0) {
      tournamentBody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <svg viewBox="0 0 24 24">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
              </svg>
              <h3>Belum ada turnamen</h3>
              <p>Mulai dengan menambahkan turnamen pertama tim kamu</p>
              <a href="addcompetition.html" class="btn btn-primary btn-sm">
                <svg viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Tambah Turnamen Baru
              </a>
            </div>
          </td>
        </tr>
      `;
    } else {
      tournaments.forEach((competition, index) => {
        const row = createCompetitionRow(competition, index);
        tournamentBody.appendChild(row);
      });
    }

    if (leagues.length === 0) {
      leagueBody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <svg viewBox="0 0 24 24">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
              </svg>
              <h3>Belum ada liga</h3>
              <p>Mulai dengan menambahkan liga pertama tim kamu</p>
              <a href="addcompetition.html" class="btn btn-primary btn-sm">
                <svg viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Tambah Liga Baru
              </a>
            </div>
          </td>
        </tr>
      `;
    } else {
      leagues.forEach((competition, index) => {
        const row = createCompetitionRow(competition, index);
        leagueBody.appendChild(row);
      });
    }
  }

  // -------- Toolbar (search + filter) reusable --------

  function createTableToolbar({ prefix, title, container }) {
    if (!container) return null;

    const toolbar = document.createElement('div');
    toolbar.className = 'table-toolbar';

    const left = document.createElement('div');
    left.className = 'table-toolbar-left';

    const right = document.createElement('div');
    right.className = 'table-toolbar-right';

    // Search
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = `${prefix}Search`;
    searchInput.className = 'form-input form-input-sm table-search-input';
    searchInput.placeholder = `Cari ${title}`;
    searchInput.addEventListener('input', () => {
      renderFilteredTables();
    });
    left.appendChild(searchInput);

    // Filter Status
    const statusSelect = document.createElement('select');
    statusSelect.id = `${prefix}FilterStatus`;
    statusSelect.className = 'form-select form-select-sm table-filter-select';
    statusSelect.innerHTML = `
      <option value="">Status: Semua</option>
      <option value="upcoming">Upcoming</option>
      <option value="cancel">Cancel</option>
      <option value="finished">Finished</option>
    `;
    statusSelect.addEventListener('change', () => {
      renderFilteredTables();
    });

    // Filter Rank
    const rankSelect = document.createElement('select');
    rankSelect.id = `${prefix}FilterRank`;
    rankSelect.className = 'form-select form-select-sm table-filter-select';
    rankSelect.innerHTML = `
      <option value="">Rank: Semua</option>
      <option value="1st">1st</option>
      <option value="2nd">2nd</option>
      <option value="3rd">3rd</option>
      <option value="4th">4th</option>
      <option value="8th">8th</option>
      <option value="16th">16th</option>
      <option value="failed">Failed</option>
    `;
    rankSelect.addEventListener('change', () => {
      renderFilteredTables();
    });

    // Filter Prizepool
    const prizeSelect = document.createElement('select');
    prizeSelect.id = `${prefix}FilterPrize`;
    prizeSelect.className = 'form-select form-select-sm table-filter-select';
    prizeSelect.innerHTML = `
      <option value="">Prizepool: Semua</option>
      <option value="zero">0</option>
      <option value="lt10">&lt; 10 Juta</option>
      <option value="10to50">10–50 Juta</option>
      <option value="gt50">&gt; 50 Juta</option>
    `;
    prizeSelect.addEventListener('change', () => {
      renderFilteredTables();
    });

    right.appendChild(statusSelect);
    right.appendChild(rankSelect);
    right.appendChild(prizeSelect);

    toolbar.appendChild(left);
    toolbar.appendChild(right);

    // Sisipkan sebelum .table-wrap
    container.parentElement.insertBefore(toolbar, container);

    return toolbar;
  }

  function setupToolbars() {
    const { tournamentTableWrap, leagueTableWrap } = getElements();
    createTableToolbar({
      prefix: 'tournament',
      title: 'turnamen',
      container: tournamentTableWrap,
    });
    createTableToolbar({
      prefix: 'league',
      title: 'liga',
      container: leagueTableWrap,
    });
  }

  // -------- Fetch & init --------

  function fetchCompetitions() {
    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    return fetch(`${apiBase}competition_api.php?action=list`)
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (!response.ok || !json || !json.ok) {
          const message = (json && json.message) || 'Gagal memuat data kompetisi.';
          throw new Error(message);
        }
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