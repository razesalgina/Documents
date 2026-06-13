// js/addmatch.js
(function () {
  const REDIRECT_DELAY_MS = 1500;

  function getFormElement() {
    return document.getElementById('addMatchForm');
  }

  function handleSubmit(event) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);

    const matchData = {
      kategori: formData.get('kategori'),
      opponentName: formData.get('opponentName'),
      matchDate: formData.get('matchDate'),
      matchFormat: formData.get('matchFormat'),
    };

    // TODO: simpan matchData ke storage (localStorage / backend) di iterasi berikutnya

    if (window.TourneyPro && typeof window.TourneyPro.showToast === 'function') {
      window.TourneyPro.showToast('Match berhasil disimpan!', 'success');
    }

    setTimeout(() => {
      window.location.href = 'match.html';
    }, REDIRECT_DELAY_MS);
  }

  function initAddMatchPage() {
    const formElement = getFormElement();
    if (!formElement) return;

    formElement.addEventListener('submit', handleSubmit);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initAddMatchPage();
  });
})();