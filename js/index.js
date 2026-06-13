// js/index.js
(function () {
  const DEFAULT_WINRATE_TEXT = '0%';

  function createInitialAppState() {
    return {
      tournaments: [],
      matches: [],
      team: [],
      games: [],
    };
  }

  function updateKpiCards(state) {
    const tournamentCountElement = document.getElementById('kpiTournament');
    const matchCountElement = document.getElementById('kpiMatch');
    const teamCountElement = document.getElementById('kpiTeam');
    const winrateElement = document.getElementById('kpiWinrate');

    if (tournamentCountElement) {
      tournamentCountElement.textContent = String(state.tournaments.length || 0);
    }

    if (matchCountElement) {
      matchCountElement.textContent = String(state.matches.length || 0);
    }

    if (teamCountElement) {
      teamCountElement.textContent = String(state.team.length || 0);
    }

    if (winrateElement) {
      winrateElement.textContent = DEFAULT_WINRATE_TEXT;
    }
  }

  function initDashboard() {
    const appState = createInitialAppState();
    updateKpiCards(appState);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
  });
})();