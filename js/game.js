// js/game.js
(function () {

  let matchId   = 0;
  let matchData = null;

  const apiBase = () => window.EsportConfig ? window.EsportConfig.apiBase : 'db/';

  function showToast(msg, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(msg, type);
    }
  }

  function getMatchIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('match_id') || params.get('id') || '0', 10);
  }

  function maxGamesFromFormat(fmt) {
    if (!fmt) return Infinity;
    const n = parseInt(fmt.replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? Infinity : n;
  }

  function resultBadgeHtml(result) {
    const r = (result || '').toLowerCase();
    const map = { win: 'badge badge-green', lose: 'badge badge-red', draw: 'badge badge-yellow' };
    const label = r.charAt(0).toUpperCase() + r.slice(1);
    return `<span class="${map[r] || 'badge badge-neutral'}">${label || '-'}</span>`;
  }

  function scoreBadgeHtml(kills, deaths) {
    return [
      `<span class="badge badge-blue">${kills}</span>`,
      `<span class="badge badge-neutral">:</span>`,
      `<span class="badge badge-red">${deaths}</span>`,
    ].join(' ');
  }

  function updateMatchMeta(match) {
    const opponentName = match.opponent_name || 'Match';

    document.title = `Game vs ${opponentName} — Esport`;

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = `Game vs ${opponentName}`;

    const pageSub = document.getElementById('pageSub');
    if (pageSub) pageSub.textContent = `Format: ${match.format || '-'}  |  Lihat semua game dalam match ini`;

    const breadcrumbMatch = document.getElementById('breadcrumbMatch');
    if (breadcrumbMatch) breadcrumbMatch.textContent = opponentName;

    const addGameBtn = document.getElementById('addGameBtn');
    if (addGameBtn) addGameBtn.href = `addgame.html?match_id=${matchId}`;

    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      const type = (match.type || '').toLowerCase();
      backBtn.href = (type === 'scrim' || type === 'ranked') ? 'train.html' : 'match.html';
    }
  }

  function renderGames(games) {
    const tbody    = document.getElementById('gameBody');
    const countEl  = document.getElementById('gameCount');
    const maxGames = matchData ? maxGamesFromFormat(matchData.format) : Infinity;

    if (countEl) {
      const remaining = maxGames === Infinity ? '' : ` / ${maxGames}`;
      countEl.textContent = `${games.length}${remaining} game`;
    }

    const addGameBtn = document.getElementById('addGameBtn');
    if (addGameBtn) {
      const full = games.length >= maxGames;
      addGameBtn.classList.toggle('hidden', full);
      full ? addGameBtn.setAttribute('aria-disabled', 'true') : addGameBtn.removeAttribute('aria-disabled');
    }

    if (!tbody) return;

    if (games.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="7">
          <div class="empty-state">
            <svg viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <h3>Belum ada game</h3>
            <p>Tambahkan data game pertama untuk menampilkan statistik match.</p>
            <a href="addgame.html?match_id=${matchId}" class="btn btn-primary btn-sm">
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tambah Game
            </a>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = games.map((g) => {
      const dur = `${g.duration_minutes || 0}m ${String(g.duration_seconds || 0).padStart(2, '0')}s`;
      const mvp = g.mvp
        ? `<span class="badge badge-blue">${g.mvp}</span>`
        : `<span class="badge badge-neutral">—</span>`;

      return `
        <tr>
          <td><strong>Game ${g.game_number}</strong></td>
          <td>${resultBadgeHtml(g.result)}</td>
          <td>${dur}</td>
          <td>${scoreBadgeHtml(g.team_kills, g.team_deaths)}</td>
          <td>${mvp}</td>
          <td class="actions-cell">
            <a href="editgame.html?id=${g.id}" class="btn btn-sm btn-secondary">Edit</a>
            <button class="btn btn-sm btn-danger" data-id="${g.id}" data-num="${g.game_number}">Hapus</button>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => handleDelete(Number(btn.dataset.id), btn.dataset.num));
    });
  }

  function handleDelete(id, num) {
    if (!confirm(`Hapus Game ${num}? Tindakan ini tidak bisa dibatalkan.`)) return;
    fetch(`${apiBase()}game_api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error((json && json.message) || 'Gagal menghapus.');
        showToast(`Game ${num} berhasil dihapus.`, 'success');
        loadGames();
      })
      .catch((err) => showToast(err.message || 'Gagal menghapus game.', 'error'));
  }

  function loadMatchInfo() {
    return fetch(`${apiBase()}match_api.php?action=get&id=${matchId}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error('Match tidak ditemukan');
        return json.match;
      })
      .then((match) => {
        matchData = match;
        updateMatchMeta(match);
      })
      .catch((err) => showToast(err.message || 'Gagal memuat info match.', 'error'));
  }

  function loadGames() {
    fetch(`${apiBase()}game_api.php?action=list&match_id=${matchId}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error('Gagal mengambil data game');
        return json.games || [];
      })
      .then(renderGames)
      .catch((err) => showToast(err.message || 'Gagal memuat game.', 'error'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    matchId = getMatchIdFromUrl();
    if (matchId <= 0) {
      showToast('match_id tidak ditemukan di URL.', 'error');
      return;
    }
    loadMatchInfo().then(() => loadGames());
  });

})();