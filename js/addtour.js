// js/addtour.js
(function () {
  const REDIRECT_DELAY_MS = 1500;

  function getFormElement() {
    return document.getElementById('tourForm');
  }

  function getSelectedFormats() {
    const checkedBoxes = document.querySelectorAll('input[name="format"]:checked');
    return Array.from(checkedBoxes).map((checkbox) => checkbox.value);
  }

  function buildTournamentData(formElement) {
    const namaTurnamenInput = formElement.querySelector('#namaTurnamen');
    const jumlahTimSelect = formElement.querySelector('#jumlahTim');
    const faseSelect = formElement.querySelector('#faseSelect');

    const formats = getSelectedFormats();

    return {
      name: namaTurnamenInput ? namaTurnamenInput.value.trim() : '',
      teamCount: jumlahTimSelect ? Number(jumlahTimSelect.value) : 0,
      phase: faseSelect ? faseSelect.value : '',
      formats,
    };
  }

  function validateTournamentData(tournamentData) {
    if (!tournamentData.formats || tournamentData.formats.length === 0) {
      return {
        valid: false,
        message: 'Pilih minimal satu format turnamen',
      };
    }

    return { valid: true, message: '' };
  }

  function showToast(message, type) {
    if (window.TourneyPro && typeof window.TourneyPro.showToast === 'function') {
      window.TourneyPro.showToast(message, type);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const tournamentData = buildTournamentData(formElement);
    const validationResult = validateTournamentData(tournamentData);

    if (!validationResult.valid) {
      showToast(validationResult.message, 'error');
      return;
    }

    // TODO: simpan tournamentData ke storage (localStorage / backend) di iterasi berikutnya

    showToast('Turnamen berhasil disimpan!', 'success');

    setTimeout(() => {
      window.location.href = 'tournament.html';
    }, REDIRECT_DELAY_MS);
  }

  function initAddTournamentPage() {
    const formElement = getFormElement();
    if (!formElement) return;

    formElement.addEventListener('submit', handleSubmit);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initAddTournamentPage();
  });
})();