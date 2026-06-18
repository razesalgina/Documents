// js/addgame.js
// Hero picker visual (popup grid) ditangani oleh hero-picker.js.
// File ini hanya mengurus: player dropdown, role tabs, validasi, dan submit.
(function () {
  const REDIRECT_DELAY_MS = 1500;
  const ROLES = [
    { key: 'jungler',   label: 'Jungler' },
    { key: 'roamer',    label: 'Roamer' },
    { key: 'midlaner',  label: 'Mid Laner' },
    { key: 'explaner',  label: 'Exp Laner' },
    { key: 'goldlaner', label: 'Gold Laner' },
  ];

  // Role mapping: key -> nilai primary_role di DB
  const ROLE_DB_MAP = {
    jungler:   'jungler',
    roamer:    'roamer',
    midlaner:  'midlaner',
    explaner:  'explaner',
    goldlaner: 'goldlaner',
  };

  let matchId    = 0;
  let gameNumber = 0;
  let allPlayers = []; // [{ id, name, primary_role }]

  const apiBase = () => window.EsportConfig ? window.EsportConfig.apiBase : 'db/';

  function showToast(msg, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(msg, type);
    }
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function updateNavLinks(mid) {
    const gameUrl = `game.html?match_id=${mid}`;
    const backBtn        = document.getElementById('backBtn');
    const breadcrumbGame = document.getElementById('breadcrumbGame');
    if (backBtn)         backBtn.href = gameUrl;
    if (breadcrumbGame)  breadcrumbGame.href = gameUrl;
  }

  // ═══════════════════════════════════════════════════════
  // PLAYER DROPDOWN — filter by role
  // ═══════════════════════════════════════════════════════

  function refreshPlayerDropdown(roleKey) {
    const card = document.getElementById(`card-${roleKey}`);
    if (!card) return;
    const sel = card.querySelector('.select-player');
    if (!sel) return;

    const prevVal = sel.value;
    const dbRole  = ROLE_DB_MAP[roleKey] || roleKey;
    const filtered = allPlayers.filter(
      (p) => (p.primary_role || '').toLowerCase() === dbRole.toLowerCase()
    );
    const pool = filtered.length > 0 ? filtered : allPlayers;

    sel.innerHTML = `<option value="" disabled>Pilih Pemain</option>` +
      pool.map((p) => `<option value="${p.name}">${p.name}</option>`).join('');

    sel.value = (prevVal && pool.some((p) => p.name === prevVal)) ? prevVal : '';
  }

  function refreshAllPlayerDropdowns() {
    ROLES.forEach(({ key }) => refreshPlayerDropdown(key));
  }

  // ═══════════════════════════════════════════════════════
  // HERO VALUE HELPER
  // Nilai hero disimpan di <input type="hidden" id="hero_{role}">
  // yang diisi oleh hero-picker.js saat user klik Select di popup.
  // ═══════════════════════════════════════════════════════

  function getHeroValue(roleKey) {
    const el = document.getElementById(`hero_${roleKey}`);
    return el ? el.value.trim() : '';
  }

  // ═══════════════════════════════════════════════════════
  // LOAD DROPDOWNS (players only — heroes diurus hero-picker.js)
  // ═══════════════════════════════════════════════════════

  async function loadDropdowns() {
    try {
      const pRes  = await fetch(`${apiBase()}game_api.php?action=players`);
      const pJson = await pRes.json().catch(() => null);
      allPlayers  = (pJson && pJson.ok) ? pJson.players : [];
      refreshAllPlayerDropdowns();
    } catch (_) {
      showToast('Gagal memuat data pemain.', 'error');
    }
  }

  // ═══════════════════════════════════════════════════════
  // GAME NUMBER PREVIEW
  // ═══════════════════════════════════════════════════════

  async function loadGameNumber() {
    if (matchId <= 0) return;
    try {
      const res   = await fetch(`${apiBase()}game_api.php?action=list&match_id=${matchId}`);
      const json  = await res.json().catch(() => null);
      const count = (json && json.ok) ? (json.games || []).length : 0;
      gameNumber  = count + 1;
      const el    = document.getElementById('gameNumberDisplay');
      if (el) el.textContent = `Game ${gameNumber}`;
    } catch (_) { /* silent */ }
  }

  // ═══════════════════════════════════════════════════════
  // ROLE PROGRESS BADGE
  // ═══════════════════════════════════════════════════════

  function updateRoleProgress() {
    let filled = 0;
    ROLES.forEach(({ key }) => {
      const card = document.getElementById(`card-${key}`);
      if (!card) return;
      const player  = card.querySelector('.select-player');
      const heroVal = getHeroValue(key);
      const kills   = card.querySelector('.input-kills');
      const deaths  = card.querySelector('.input-deaths');
      const assists = card.querySelector('.input-assists');
      const gold    = card.querySelector('.input-gold');
      if (
        player?.value &&
        heroVal !== '' &&
        kills?.value.trim()   !== '' &&
        deaths?.value.trim()  !== '' &&
        assists?.value.trim() !== '' &&
        gold?.value.trim()    !== ''
      ) filled++;
    });
    const el = document.getElementById('roleProgress');
    if (el) el.textContent = `${filled} / 5 role`;
  }

  // ═══════════════════════════════════════════════════════
  // ROLE TABS
  // ═══════════════════════════════════════════════════════

  function switchRole(roleKey) {
    ROLES.forEach(({ key }) => {
      document.getElementById(`card-${key}`)?.classList.toggle('hidden', key !== roleKey);
    });
  }

  function attachRoleTabListeners() {
    document.querySelectorAll('input[name="activeRole"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        switchRole(radio.value);
        refreshPlayerDropdown(radio.value);
        updateRoleProgress();
      });
    });

    // Pantau perubahan stats + hidden input hero (dikirim hero-picker.js via 'change' event)
    const container = document.getElementById('playerContainer');
    if (container) {
      container.addEventListener('change', updateRoleProgress);
      container.addEventListener('input',  updateRoleProgress);
    }
  }

  // ═══════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════

  function markError(el) { if (el) el.classList.add('field-error'); }
  function clearErrors() {
    document.querySelectorAll('.field-error').forEach((el) => el.classList.remove('field-error'));
  }

  function validateStep1() {
    clearErrors();
    const kills  = document.getElementById('teamKills');
    const deaths = document.getElementById('teamDeaths');
    const durMin = document.getElementById('gameDurationMin');
    const durSec = document.getElementById('gameDurationSec');

    if (!kills?.value.trim())  { markError(kills);  return { valid: false, message: 'Total kills wajib diisi.' }; }
    if (!deaths?.value.trim()) { markError(deaths); return { valid: false, message: 'Total deaths wajib diisi.' }; }
    if (!durMin?.value.trim()) { markError(durMin); return { valid: false, message: 'Menit durasi wajib diisi.' }; }
    if (!durSec?.value.trim()) { markError(durSec); return { valid: false, message: 'Detik durasi wajib diisi.' }; }
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
      const heroVal = getHeroValue(key);
      const kills   = card.querySelector('.input-kills');
      const deaths  = card.querySelector('.input-deaths');
      const assists = card.querySelector('.input-assists');
      const gold    = card.querySelector('.input-gold');

      const switchToRole = () => {
        switchRole(key);
        const radio = document.querySelector(`input[name="activeRole"][value="${key}"]`);
        if (radio) radio.checked = true;
      };

      if (!player?.value) {
        switchToRole(); markError(player);
        return { valid: false, message: `Pilih pemain untuk ${label}.` };
      }
      // Hero: error highlight pada wrapper button open-hero-picker
      if (!heroVal) {
        switchToRole();
        const btn = card.querySelector('.open-hero-picker');
        if (btn) btn.classList.add('field-error');
        return { valid: false, message: `Pilih hero untuk ${label}.` };
      }
      if (!kills?.value.trim()) {
        switchToRole(); markError(kills);
        return { valid: false, message: `Kill untuk ${label} wajib diisi.` };
      }
      if (!deaths?.value.trim()) {
        switchToRole(); markError(deaths);
        return { valid: false, message: `Death untuk ${label} wajib diisi.` };
      }
      if (!assists?.value.trim()) {
        switchToRole(); markError(assists);
        return { valid: false, message: `Assist untuk ${label} wajib diisi.` };
      }
      if (!gold?.value.trim()) {
        switchToRole(); markError(gold);
        return { valid: false, message: `Total Gold untuk ${label} wajib diisi.` };
      }
    }
    return { valid: true };
  }

  // ═══════════════════════════════════════════════════════
  // COLLECT DATA
  // ═══════════════════════════════════════════════════════

  function getGameInfo() {
    return {
      matchId,
      result:          document.getElementById('gameResult')?.value || 'win',
      teamKills:       Number(document.getElementById('teamKills')?.value)       || 0,
      teamDeaths:      Number(document.getElementById('teamDeaths')?.value)      || 0,
      durationMinutes: Number(document.getElementById('gameDurationMin')?.value) || 0,
      durationSeconds: Number(document.getElementById('gameDurationSec')?.value) || 0,
    };
  }

  function getPlayerStats() {
    return ROLES.map(({ key }) => {
      const card = document.getElementById(`card-${key}`);
      return {
        roleName:   key,
        playerName: card?.querySelector('.select-player')?.value || '',
        heroName:   getHeroValue(key),
        kills:      Number(card?.querySelector('.input-kills')?.value)   || 0,
        deaths:     Number(card?.querySelector('.input-deaths')?.value)  || 0,
        assists:    Number(card?.querySelector('.input-assists')?.value) || 0,
        totalGold:  Number(card?.querySelector('.input-gold')?.value)    || 0,
      };
    });
  }

  // ═══════════════════════════════════════════════════════
  // STEP NAVIGATION
  // ═══════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════
  // SUBMIT
  // ═══════════════════════════════════════════════════════

  function handleSubmitAll() {
    const v = validateStep2();
    if (!v.valid) { showToast(v.message, 'error'); return; }

    const payload = { game: getGameInfo(), players: getPlayerStats() };

    fetch(`${apiBase()}save_game.php`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || !json.ok) throw new Error((json && json.message) || 'Gagal menyimpan game.');
        return json;
      })
      .then(() => {
        showToast('Game berhasil disimpan!', 'success');
        setTimeout(() => { window.location.href = `game.html?match_id=${matchId}`; }, REDIRECT_DELAY_MS);
      })
      .catch((err) => showToast(err.message || 'Terjadi kesalahan.', 'error'));
  }

  // ═══════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════

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
