// js/tournament.js
(function () {
  function getStoredTournaments() {
    // Placeholder: nanti bisa ambil dari localStorage / API
    return [];
  }

  function renderEmptyState() {
    // HTML default empty-state sudah disiapkan di tournament.html
    // Jadi kalau tidak ada data, kita tidak perlu mengubah tbody.
  }

  function clearTableBody(bodyElement) {
    while (bodyElement.firstChild) {
      bodyElement.removeChild(bodyElement.firstChild);
    }
  }

  function createTournamentRow(tournament, index) {
    const row = document.createElement('tr');

    const indexCell = document.createElement('td');
    indexCell.textContent = String(index + 1);

    const nameCell = document.createElement('td');
    nameCell.textContent = tournament.name || '-';

    const teamCountCell = document.createElement('td');
    teamCountCell.textContent = String(tournament.teamCount || 0);

    const phaseCell = document.createElement('td');
    phaseCell.textContent = tournament.phase || '-';

    const formatCell = document.createElement('td');
    formatCell.textContent = tournament.format || '-';

    const actionsCell = document.createElement('td');
    actionsCell.textContent = '-'; // TODO: tombol aksi (detail/edit/hapus)

    row.appendChild(indexCell);
    row.appendChild(nameCell);
    row.appendChild(teamCountCell);
    row.appendChild(phaseCell);
    row.appendChild(formatCell);
    row.appendChild(actionsCell);

    return row;
  }

  function renderTournamentRows(tournaments) {
    const tournamentBodyElement = document.getElementById('tournamentBody');
    if (!tournamentBodyElement) return;

    if (!tournaments || tournaments.length === 0) {
      renderEmptyState();
      return;
    }

    clearTableBody(tournamentBodyElement);

    tournaments.forEach((tournament, index) => {
      const row = createTournamentRow(tournament, index);
      tournamentBodyElement.appendChild(row);
    });
  }

  function initTournamentPage() {
    const tournaments = getStoredTournaments();
    renderTournamentRows(tournaments);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTournamentPage();
  });
})();