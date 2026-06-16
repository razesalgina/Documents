// js/match.js
(function () {
  function showToast(message, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(message, type);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatType(type) {
    const map = { tournament: 'Tournament', league: 'League', scrim: 'Scrim', ranked: 'Ranked' };
    return map[(type || '').toLowerCase()] || type || '-';
  }

  function formatStatus(status) {
    const map = {
      upcoming: '<span class="badge badge-upcoming">Upcoming</span>',
      finished: '<span class="badge badge-finished">Finished</span>',
      cancel:   '<span class="badge badge-cancel">Cancel</span>',
    };
    return map[(status || '').toLowerCase()] || status || '-';
  }

  function renderEmptyState(tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <svg viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <h3>Belum ada match</h3>
            <p>Tambahkan match pertama untuk mulai melacak performa tim</p>
            <a href="addmatch.html" class="btn btn-primary btn-sm">
              <svg viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Tambah Match
            </a>
          </div>
        </td>
      </tr>`;
  }

  function renderMatchRows(matches) {
    const tbody = document.getElementById('matchBody');
    if (!tbody) return;

    if (!matches || matches.length === 0) {
      renderEmptyState(tbody);
      return;
    }

    tbody.innerHTML = matches.map((m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${m.opponent_name || '-'}</td>
        <td>${formatDate(m.match_date)}</td>
        <td>${formatType(m.type)}</td>
        <td>${m.match_format || '-'}</td>
        <td>${formatStatus(m.status)}</td>
        <td>
          <a href="editmatch.html?id=${m.id}" class="btn btn-sm btn-secondary">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </a>
        </td>
      </tr>`).join('');
  }

  function loadMatches() {
    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    fetch(`${apiBase}match_api.php?action=list`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error('Gagal mengambil data match');
        return json.matches || [];
      })
      .then((matches) => {
        renderMatchRows(matches);
      })
      .catch((err) => {
        showToast(err.message || 'Gagal memuat match.', 'error');
      });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadMatches();
  });
})();