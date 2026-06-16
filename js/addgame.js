// js/addgame.js
(function () {
  const REDIRECT_DELAY_MS = 1500;
  const ROLES = [
    { key: 'jungler',   label: 'Jungler' },
    { key: 'roamer',    label: 'Roamer' },
    { key: 'midlaner',  label: 'Mid Laner' },
    { key: 'explaner',  label: 'Exp Laner' },
    { key: 'goldlaner', label: 'Gold Laner' },
  ];

  // ── State ───────────────────────────────────
  let matchId    = 0;
  let gameNumber = 0; // akan di-set setelah fetch

  const apiBase = () => window.EsportConfig ? window.EsportConfig.apiBase : 'db/';

  // ── Toast ──────────────────────────────────
  function showToast(msg, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(msg, type);
    }
  }

  // ── URL helpers ─────────────────────────────
  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // ── Update back-btn & breadcrumb ────────────────
  function updateNavLinks(mid) {
    const gameUrl = `game.html?match_id=${mid}`;
    const backBtn = document.getElementById('backBtn');
    const breadcrumbGame = document.getElementById('breadcrumbGame');
    if (backBtn)        backBtn.href = gameUrl;
    if (breadcrumbGame) breadcrumbGame.href = gameUrl;
  }

  // ── Populate dropdowns ────────────────────────
  function populateDropdowns(players, heroes) {
    const allPlayerSelects = document.querySelectorAll('.select-player');
    const allHeroSelects   = document.querySelectorAll('.select-hero');

    const playerOpts = players
      .map((p) => `<option value="${p.name}">${p.name} (${p.primary_role})</option>`)
      .join('');
    const heroOpts = heroes
      .map((h) => `<option value="${h}">${h}</option>`)
      .join('');

    allPlayerSelects.forEach((sel) => {
      sel.innerHTML = `<option value="" disabled selected>Pilih Pemain</option>${playerOpts}`;
    });
    allHeroSelects.forEach((sel) => {
      sel.innerHTML = `<option value="" disabled selected>Pilih Hero</option>${heroOpts}`;
    });
  }

  async function loadDropdowns() {
    try {
      const [pRes, hRes] = await Promise.all([
        fetch(`${apiBase()}game_api.php?action=players`),
        fetch(`${apiBase()}game_api.php?action=heroes`),
      ]);
      const pJson = await pRes.json().catch(() => null);
      const hJson = await hRes.json().catch(() => null);
      const players = (pJson && pJson.ok) ? pJson.players : [];
      const heroes  = (hJson && hJson.ok) ? hJson.heroes  : [];
      populateDropdowns(players, heroes);
    } catch (_) {
      showToast('Gagal memuat data pemain / hero.', 'error');
    }
  }

  // ── Fetch auto game_number preview ──────────────
  async function loadGameNumber() {
    if (matchId <= 0) return;
    try {
      const res  = await fetch(`${apiBase()}game_api.php?action=list&match_id=${matchId}`);
      const json = await res.json().catch(() => null);
      const count = (json && json.ok) ? (json.games || []).length : 0;
      gameNumber = count + 1;
      const el = document.getElementById('gameNumberDisplay');
      if (el) el.textContent = `Game ${gameNumber}`;
    } catch (_) { /* silent */ }
  }

  // ── Role tab switching (fase pattern) ────────────
  function updateRoleProgress() {
    let filled = 0;
    ROLES.forEach(({ key }) => {
      const card = document.getElementById(`card-${key}`);
      if (!card) return;
      const player = card.querySelector('.select-player');
      const hero   = card.querySelector('.select-hero');
      const kills  = card.querySelector('.input-kills');
      const deaths = card.querySelector('.input-deaths');
      const assists = card.querySelector('.input-assists');
      const gold   = card.querySelector('.input-gold');
      if (player && player.value &&
          hero   && hero.value &&
          kills  && kills.value.trim() !== '' &&
          deaths && deaths.value.trim() !== '' &&
          assists && assists.value.trim() !== '' &&
          gold   && gold.value.trim() !== '') {
        filled++;
      }
    });
    const el = document.getElementById('roleProgress');
    if (el) el.textContent = `${filled} / 5 role`;
  }

  function switchRole(roleKey) {
    ROLES.forEach(({ key }) => {
      const card = document.getElementById(`card-${key}`);
      if (card) card.classList.toggle('hidden', key !== roleKey);
    });
  }

  function attachRoleTabListeners() {
    const radios = document.querySelectorAll('input[name="activeRole"]');
    radios.forEach((radio) => {
      radio.addEventListener('change', () => {
        switchRole(radio.value);
        updateRoleProgress();
      });
    });
    // Update progress on any input change
    const container = document.getElementById('playerContainer');
    if (container) {
      container.addEventListener('change', updateRoleProgress);
      container.addEventListener('input',  updateRoleProgress);
    }
  }

  // ── Validation helpers ────────────────────────
  function markError(el) { if (el) el.classList.add('field-error'); }
  function clearErrors() {
    document.querySelectorAll('.field-error').forEach((el) => el.classList.remove('field-error'));
  }

  function validateStep1() {
    clearErrors();
    const kills   = document.getElementById('teamKills');
    const deaths  = document.getElementById('teamDeaths');
    const durMin  = document.getElementById('gameDurationMin');
    const durSec  = document.getElementById('gameDurationSec');

    if (!kills || kills.value.trim() === '')   { markError(kills);  return { valid: false, message: 'Total kills wajib diisi.' }; }
    if (!deaths || deaths.value.trim() === '')  { markError(deaths); return { valid: false, message: 'Total deaths wajib diisi.' }; }
    if (!durMin || durMin.value.trim() === '')  { markError(durMin); return { valid: false, message: 'Menit durasi wajib diisi.' }; }
    if (!durSec || durSec.value.trim() === '')  { markError(durSec); return { valid: false, message: 'Detik durasi wajib diisi.' }; }
    if (Number(durSec.value) < 0 || Number(durSec.value) > 59) {
      markError(durSec);
      return { valid: false, message: 'Detik harus 0–59.' };
    }
    return { valid: true };
  }

  function validateStep2() {
    clearErrors();
    for (const { key, label } of ROLES) {
      const card    = document.getElementById(`card-${key}`);
      if (!card) continue;
      const player  = card.querySelector('.select-player');
      const hero    = card.querySelector('.select-hero');
      const kills   = card.querySelector('.input-kills');
      const deaths  = card.querySelector('.input-deaths');
      const assists = card.querySelector('.input-assists');
      const gold    = card.querySelector('.input-gold');

      if (!player || !player.value) {
        // Switch ke role yang error
        switchRole(key);
        document.querySelector(`input[name="activeRole"][value="${key}"]`).checked = true;
        markError(player);
        return { valid: false, message: `Pilih pemain untuk ${label}.` };
      }
      if (!hero || !hero.value) {
        switchRole(key);
        document.querySelector(`input[name="activeRole"][value="${key}"]`).checked = true;
        markError(hero);
        return { valid: false, message: `Pilih hero untuk ${label}.` };
      }
      if (!kills || kills.value.trim() === '') {
        switchRole(key); document.querySelector(`input[name="activeRole"][value="${key}"]`).checked = true;
        markError(kills); return { valid: false, message: `Kill untuk ${label} wajib diisi.` };
      }
      if (!deaths || deaths.value.trim() === '') {
        switchRole(key); document.querySelector(`input[name="activeRole"][value="${key}"]`).checked = true;
        markError(deaths); return { valid: false, message: `Death untuk ${label} wajib diisi.` };
      }
      if (!assists || assists.value.trim() === '') {
        switchRole(key); document.querySelector(`input[name="activeRole"][value="${key}"]`).checked = true;
        markError(assists); return { valid: false, message: `Assist untuk ${label} wajib diisi.` };
      }
      if (!gold || gold.value.trim() === '') {
        switchRole(key); document.querySelector(`input[name="activeRole"][value="${key}"]`).checked = true;
        markError(gold); return { valid: false, message: `Total Gold untuk ${label} wajib diisi.` };
      }
    }
    return { valid: true };
  }

  // ── Collect data ─────────────────────────────
  function getGameInfo() {
    return {
      matchId,
      result:          document.getElementById('gameResult')?.value || 'win',
      teamKills:       Number(document.getElementById('teamKills')?.value) || 0,
      teamDeaths:      Number(document.getElementById('teamDeaths')?.value) || 0,
      durationMinutes: Number(document.getElementById('gameDurationMin')?.value) || 0,
      durationSeconds: Number(document.getElementById('gameDurationSec')?.value) || 0,
    };
  }

  function getPlayerStats() {
    return ROLES.map(({ key, label }) => {
      const card = document.getElementById(`card-${key}`);
      return {
        roleName:   key,
        playerName: card?.querySelector('.select-player')?.value || '',
        heroName:   card?.querySelector('.select-hero')?.value   || '',
        kills:      Number(card?.querySelector('.input-kills')?.value)   || 0,
        deaths:     Number(card?.querySelector('.input-deaths')?.value)  || 0,
        assists:    Number(card?.querySelector('.input-assists')?.value) || 0,
        totalGold:  Number(card?.querySelector('.input-gold')?.value)    || 0,
      };
    });
  }

  // ── Step navigation ───────────────────────────
  function goToStep2() {
    document.getElementById('tahap1')?.classList.add('hidden');
    document.getElementById('tahap2')?.classList.remove('hidden');
    updateRoleProgress();
  }
  function goToStep1() {
    document.getElementById('tahap2')?.classList.add('hidden');
    document.getElementById('tahap1')?.classList.remove('hidden');
  }

  function handleNextStep() {
    const v = validateStep1();
    if (!v.valid) { showToast(v.message, 'error'); return; }
    goToStep2();
  }

  // ── Submit ──────────────────────────────────
  function handleSubmitAll() {
    const v = validateStep2();
    if (!v.valid) { showToast(v.message, 'error'); return; }

    const payload = { game: getGameInfo(), players: getPlayerStats() };

    fetch(`${apiBase()}save_game.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || !json.ok) throw new Error((json && json.message) || 'Gagal menyimpan game.');
        return json;
      })
      .then(() => {
        showToast('Game berhasil disimpan!', 'success');
        setTimeout(() => {
          window.location.href = `game.html?match_id=${matchId}`;
        }, REDIRECT_DELAY_MS);
      })
      .catch((err) => showToast(err.message || 'Terjadi kesalahan.', 'error'));
  }

  // ── Init ────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    matchId = parseInt(getParam('match_id') || '0', 10);
    if (matchId <= 0) showToast('match_id tidak ditemukan di URL.', 'error');

    updateNavLinks(matchId);
    loadDropdowns();
    loadGameNumber();
    attachRoleTabListeners();

    document.getElementById('btnNextStep')?.addEventListener('click', handleNextStep);
    document.getElementById('btnBackStep')?.addEventListener('click', goToStep1);
    document.getElementById('btnSubmitAll')?.addEventListener('click', handleSubmitAll);
  });

})();