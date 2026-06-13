// js/match.js
(function () {
  function getStoredMatches() {
    // Placeholder: nanti bisa ganti ambil dari localStorage / API
    return [];
  }

  function renderEmptyState(matchBodyElement) {
    // Saat belum ada data, kita biarkan HTML default (empty state) yang sudah ada di match.html.
    // Jadi di sini tidak perlu diubah apa-apa.
    if (!matchBodyElement) return;
  }

  function renderMatchRows(matches) {
    const matchBodyElement = document.getElementById('matchBody');
    if (!matchBodyElement) return;

    if (!matches || matches.length === 0) {
      renderEmptyState(matchBodyElement);
      return;
    }

    // TODO: nanti ganti isi tbody dengan baris match sebenarnya
    // dan panggil window.TourneyPro.showToast('Match berhasil dimuat', 'success') jika perlu.
  }

  function initMatchPage() {
    const matches = getStoredMatches();
    renderMatchRows(matches);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMatchPage();
  });
})();