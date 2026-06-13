// js/addgame.js
(function () {
  const REDIRECT_DELAY_MS = 1500;

  function getElements() {
    return {
      tahap1Section: document.getElementById('tahap1'),
      tahap2Section: document.getElementById('tahap2'),
      nextButton: document.getElementById('btnNextStep'),
      backButton: document.getElementById('btnBackStep'),
      submitButton: document.getElementById('btnSubmitAll'),
      gameNumberSelect: document.getElementById('gameNumber'),
      gameResultSelect: document.getElementById('gameResult'),
      teamKillsInput: document.getElementById('teamKills'),
      teamDeathsInput: document.getElementById('teamDeaths'),
      durationMinInput: document.getElementById('gameDurationMin'),
      durationSecInput: document.getElementById('gameDurationSec'),
      playerContainer: document.getElementById('playerContainer'),
    };
  }

  function showToast(message, type) {
    if (window.TourneyPro && typeof window.TourneyPro.showToast === 'function') {
      window.TourneyPro.showToast(message, type);
    }
  }
  
  function clearStep1Errors() {
    const {
      teamKillsInput,
      teamDeathsInput,
      durationMinInput,
      durationSecInput,
    } = getElements();

    [teamKillsInput, teamDeathsInput, durationMinInput, durationSecInput]
      .forEach((el) => {
        if (el) {
          el.classList.remove('field-error');
        }
      });
  }

  function clearStep2Errors() {
    const { playerContainer } = getElements();
    if (!playerContainer) return;

    const errorFields = playerContainer.querySelectorAll('.field-error');
    errorFields.forEach((el) => {
      el.classList.remove('field-error');
    });
  }  

  function markFieldError(element) {
    if (!element) return;
    element.classList.add('field-error');
  }

  function validateStep1() {
    const {
      gameNumberSelect,
      gameResultSelect,
      teamKillsInput,
      teamDeathsInput,
      durationMinInput,
      durationSecInput,
    } = getElements();

    if (
      !gameNumberSelect ||
      !gameResultSelect ||
      !teamKillsInput ||
      !teamDeathsInput ||
      !durationMinInput ||
      !durationSecInput
    ) {
      return { valid: false, message: 'Form tidak lengkap.' };
    }

    clearStep1Errors();

    let firstErrorField = null;

    function setError(field, message) {
      markFieldError(field);
      if (!firstErrorField) {
        firstErrorField = field;
      }
      throw new Error(message);
    }

    try {
      // Cek kosong (user belum isi)
      if (teamKillsInput.value.trim() === '') {
        setError(teamKillsInput, 'Total kills tim wajib diisi.');
      }

      if (teamDeathsInput.value.trim() === '') {
        setError(teamDeathsInput, 'Total deaths tim wajib diisi.');
      }

      if (durationMinInput.value.trim() === '') {
        setError(durationMinInput, 'Menit durasi wajib diisi.');
      }

      if (durationSecInput.value.trim() === '') {
        setError(durationSecInput, 'Detik durasi wajib diisi.');
      }

      const kills = Number(teamKillsInput.value);
      const deaths = Number(teamDeathsInput.value);
      const minutes = Number(durationMinInput.value);
      const seconds = Number(durationSecInput.value);

      if (Number.isNaN(kills) || kills < 0) {
        setError(teamKillsInput, 'Total kills tidak boleh negatif.');
      }

      if (Number.isNaN(deaths) || deaths < 0) {
        setError(teamDeathsInput, 'Total deaths tidak boleh negatif.');
      }

      if (Number.isNaN(minutes) || minutes < 0) {
        setError(durationMinInput, 'Menit durasi tidak valid.');
      }

      if (Number.isNaN(seconds) || seconds < 0 || seconds > 59) {
        setError(durationSecInput, 'Detik durasi harus 0–59.');
      }
    } catch (error) {
      if (firstErrorField && typeof firstErrorField.focus === 'function') {
        firstErrorField.focus();
      }
      return { valid: false, message: error.message };
    }

    return { valid: true, message: '' };
  }

  function getGameInfo() {
    const {
      gameNumberSelect,
      gameResultSelect,
      teamKillsInput,
      teamDeathsInput,
      durationMinInput,
      durationSecInput,
    } = getElements();

    return {
      gameNumber: gameNumberSelect ? Number(gameNumberSelect.value) : 1,
      result: gameResultSelect ? gameResultSelect.value : 'win',
      teamKills: teamKillsInput ? Number(teamKillsInput.value) : 0,
      teamDeaths: teamDeathsInput ? Number(teamDeathsInput.value) : 0,
      durationMinutes: durationMinInput ? Number(durationMinInput.value) : 0,
      durationSeconds: durationSecInput ? Number(durationSecInput.value) : 0,
    };
  }

  function getPlayerStats() {
    const { playerContainer } = getElements();
    if (!playerContainer) return [];

    const roleCards = playerContainer.querySelectorAll('.role-card');
    const playersStats = [];

    roleCards.forEach((card) => {
      const roleNameElement = card.querySelector('.role-name');
      const playerSelect = card.querySelector('.select-player');
      const heroSelect = card.querySelector('.select-hero');
      const killsInput = card.querySelector('.input-kills');
      const deathsInput = card.querySelector('.input-deaths');
      const assistsInput = card.querySelector('.input-assists');
      const goldInput = card.querySelector('.input-gold');

      playersStats.push({
        roleName: roleNameElement ? roleNameElement.textContent.trim() : '',
        playerName: playerSelect ? playerSelect.value : '',
        heroName: heroSelect ? heroSelect.value : '',
        kills: killsInput ? Number(killsInput.value) : 0,
        deaths: deathsInput ? Number(deathsInput.value) : 0,
        assists: assistsInput ? Number(assistsInput.value) : 0,
        totalGold: goldInput ? Number(goldInput.value) : 0,
      });
    });

    return playersStats;
  }  

  function validateStep2() {
    const { playerContainer } = getElements();
    if (!playerContainer) {
      return { valid: false, message: 'Container player tidak ditemukan.' };
    }

    clearStep2Errors();

    const roleCards = playerContainer.querySelectorAll('.role-card');
    if (roleCards.length === 0) {
      return { valid: false, message: 'Tidak ada data role pemain.' };
    }

    let firstErrorField = null;

    for (const card of roleCards) {
      const roleNameElement = card.querySelector('.role-name');
      const playerSelect = card.querySelector('.select-player');
      const heroSelect = card.querySelector('.select-hero');
      const killsInput = card.querySelector('.input-kills');
      const deathsInput = card.querySelector('.input-deaths');
      const assistsInput = card.querySelector('.input-assists');
      const goldInput = card.querySelector('.input-gold');

      const roleName = roleNameElement ? roleNameElement.textContent.trim() : 'Role';

      // Helper lokal untuk set error dan simpan field pertama yang error
      function setError(element, message) {
        markFieldError(element);
        if (!firstErrorField) {
          firstErrorField = element;
        }
        throw new Error(message); // untuk keluar dari loop dengan pesan
      }

      try {
        if (!playerSelect || playerSelect.value.trim() === '') {
          setError(playerSelect, `Pilih pemain untuk ${roleName}.`);
        }

        if (!heroSelect || heroSelect.value.trim() === '') {
          setError(heroSelect, `Pilih hero untuk ${roleName}.`);
        }

        if (!killsInput || killsInput.value.trim() === '') {
          setError(killsInput, `Kolom Kill untuk ${roleName} wajib diisi.`);
        }

        if (!deathsInput || deathsInput.value.trim() === '') {
          setError(deathsInput, `Kolom Death untuk ${roleName} wajib diisi.`);
        }

        if (!assistsInput || assistsInput.value.trim() === '') {
          setError(assistsInput, `Kolom Assist untuk ${roleName} wajib diisi.`);
        }

        if (!goldInput || goldInput.value.trim() === '') {
          setError(goldInput, `Total Gold untuk ${roleName} wajib diisi.`);
        }

        const kills = Number(killsInput.value);
        const deaths = Number(deathsInput.value);
        const assists = Number(assistsInput.value);
        const totalGold = Number(goldInput.value);

        if (Number.isNaN(kills) || kills < 0) {
          setError(killsInput, `Kill untuk ${roleName} tidak boleh negatif.`);
        }

        if (Number.isNaN(deaths) || deaths < 0) {
          setError(deathsInput, `Death untuk ${roleName} tidak boleh negatif.`);
        }

        if (Number.isNaN(assists) || assists < 0) {
          setError(assistsInput, `Assist untuk ${roleName} tidak boleh negatif.`);
        }

        if (Number.isNaN(totalGold) || totalGold < 0) {
          setError(goldInput, `Total Gold untuk ${roleName} tidak boleh negatif.`);
        }
      } catch (e) {
        // e.message akan berisi pesan pertama yang kita lempar
        if (firstErrorField && typeof firstErrorField.focus === 'function') {
          firstErrorField.focus();
        }
        return { valid: false, message: e.message };
      }
    }

    return { valid: true, message: '' };
  }

  function goToStep2() {
    const { tahap1Section, tahap2Section } = getElements();
    if (!tahap1Section || !tahap2Section) return;

    tahap1Section.classList.add('hidden');
    tahap2Section.classList.remove('hidden');
  }

  function goToStep1() {
    const { tahap1Section, tahap2Section } = getElements();
    if (!tahap1Section || !tahap2Section) return;

    tahap2Section.classList.add('hidden');
    tahap1Section.classList.remove('hidden');
  }

  function handleNextStep() {
    const validation = validateStep1();
    if (!validation.valid) {
      showToast(validation.message, 'error');
      return;
    }

    goToStep2();
  }

  function handleBackStep() {
    goToStep1();
  }

  function handleSubmitAll() {
    const step2Validation = validateStep2();
    if (!step2Validation.valid) {
      showToast(step2Validation.message, 'error');
      return;
    }

    const gameInfo = getGameInfo();
    const playerStats = getPlayerStats();

    // TODO: simpan gameInfo + playerStats ke storage (localStorage / backend)
    // dan hubungkan dengan matchId tertentu (kalau sudah ada).

    showToast('Game berhasil disimpan!', 'success');

    setTimeout(() => {
      window.location.href = 'game.html';
    }, REDIRECT_DELAY_MS);
  }

  function attachEventListeners() {
    const { nextButton, backButton, submitButton } = getElements();

    if (nextButton) {
      nextButton.addEventListener('click', handleNextStep);
    }

    if (backButton) {
      backButton.addEventListener('click', handleBackStep);
    }

    if (submitButton) {
      submitButton.addEventListener('click', handleSubmitAll);
    }
  }

  function initAddGamePage() {
    attachEventListeners();
    // TODO: isi dropdown pemain & hero jika ada sumber datanya
  }

  document.addEventListener('DOMContentLoaded', () => {
    initAddGamePage();
  });
})();