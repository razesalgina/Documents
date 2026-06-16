// js/editgame.js
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
  let gameId  = 0;
  let matchId = 0;

  const apiBase = () => window.EsportConfig ? window.EsportConfig.apiBase : 'db/';

  function showToast(msg, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(msg, type);
    }
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // ── Nav links ──────────────────────────────
  function updateNavLinks(mid) {
    const gameUrl = `game.html?match_id=${mid}`;
    const backBtn        = document.getElementById('backBtn');
    const breadcrumbGame = document.getElementById('breadcrumbGame');
    if (backBtn)         backBtn.href = gameUrl;
    if (breadcrumbGame)  breadcrumbGame.href = gameUrl;
  }

  // ── Populate dropdowns ────────────────────────
  function buildPlayerOpts(players, selected) {
    return `<option value="" disabled ${!selected ? 'selected' : ''}>Pilih Pemain</option>` +
      players.map((p) => `<option value="${p.name}" ${p.name === selected ? 'selected' : ''}>${p.name} (${p.primary_role})</option>`).join('');
  }
  function buildHeroOpts(heroes, selected) {
    return `<option value="" disabled ${!selected ? 'selected' : ''}>Pilih Hero</option>` +
      heroes.map((h) => `<option value="${h}" ${h === selected ? 'selected' : ''}>${h}</option>`).join('');
  }

  async function loadDropdowns(players, heroes, gameData) {
    ROLES.forEach(({ key }) => {
      const card       = document.getElementById(`card-${key}`);
      if (!card) return;
      const pSelect    = card.querySelector('.select-player');
      const hSelect    = card.querySelector('.select-hero');

      const existing   = (gameData.players || []).find(
        (p) => (p.role_name || '').toLowerCase().replace(/\s/g, '') === key
      );

      if (pSelect) pSelect.innerHTML = buildPlayerOpts(players, existing?.player_name || '');
      if (hSelect) hSelect.innerHTML = buildHeroOpts(heroes,  existing?.hero_name    || '');

      if (existing) {
        const fill = (cls, val) => { const el = card.querySelector(cls); if (el) el.value = val; };
        fill('.input-kills',   existing.kills);
        fill('.input-deaths',  existing.deaths);
        fill('.input-assists', existing.assists);
        fill('.input-gold',    existing.total_gold);
      }
    });
  }

  async function loadGameData() {
    const [gRes, pRes, hRes] = await Promise.all([
      fetch(`${apiBase()}game_api.php?action=get&id=${gameId}`),
      fetch(`${apiBase()}game_api.php?action=players`),
      fetch(`${apiBase()}game_api.php?action=heroes`),
    ]);
    const gJson = await gRes.json().catch(() => null);
    const pJson = await pRes.json().catch(() => null);
    const hJson = await hRes.json().catch(() => null);

    if (!gJson || !gJson.ok) throw new Error('Game tidak ditemukan');

    const game    = gJson.game;
    const players = (pJson && pJson.ok) ? pJson.players : [];
    const heroes  = (hJson && hJson.ok) ? hJson.heroes  : [];

    matchId = game.match_id;
    updateNavLinks(matchId);

    // Fill tahap 1
    const numEl = document.getElementById('gameNumberDisplay');
    if (numEl) numEl.textContent = `Game ${game.game_number}`;

    const result = document.getElementById('gameResult');
    if (result) result.value = game.result || 'win';

    const tk = document.getElementById('teamKills');
    const td = document.getElementById('teamDeaths');
    const dm = document.getElementById('gameDurationMin');
    const ds = document.getElementById('gameDurationSec');
    if (tk) tk.value = game.team_kills;
    if (td) td.value = game.team_deaths;
    if (dm) dm.value = game.duration_minutes;
    if (ds) ds.value = game.duration_seconds;

    // Update meta
    const pageTitle = document.getElementById('pageTitle');
    const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
    if (pageTitle) pageTitle.textContent = `Edit Game ${game.game_number}`;
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = `Edit Game ${game.game_number}`;

    await loadDropdowns(players, heroes, game);
    updateRoleProgress();
  }

  // ── Role tab ─────────────────────────────────
  function updateRoleProgress() {
    let filled = 0;
    ROLES.forEach(({ key }) => {
      const card = document.getElementById(`card-${key}`);
      if (!card) return;
      const p = card.querySelector('.select-player');
      const h = card.querySelector('.select-hero');
      const k = card.querySelector('.input-kills');
      const d = card.querySelector('.input-deaths');
      const a = card.querySelector('.input-assists');
      const g = card.querySelector('.input-gold');
      if (p?.value && h?.value && k?.value.trim() && d?.value.trim() && a?.value.trim() && g?.value.trim()) filled++;
    });
    const el = document.getElementById('roleProgress');
    if (el) el.textContent = `${filled} / 5 role`;
  }

  function switchRole(roleKey) {
    ROLES.forEach(({ key }) => {
      document.getElementById(`card-${key}`)?.classList.toggle('hidden', key !== roleKey);
    });
  }

  function attachRoleTabListeners() {
    document.querySelectorAll('input[name="activeRole"]').forEach((radio) => {
      radio.addEventListener('change', () => { switchRole(radio.value); updateRoleProgress(); });
    });
    const container = document.getElementById('playerContainer');
    if (container) {
      container.addEventListener('change', updateRoleProgress);
      container.addEventListener('input',  updateRoleProgress);
    }
  }

  // ── Validation ──────────────────────────────
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
    if (!durSec?.value.trim()) { markError(durSec); return { valid: false, message: 'Detik wajib diisi.' }; }
    if (Number(durSec.value) < 0 || Number(durSec.value) > 59) {
      markError(durSec); return { valid: false, message: 'Detik harus 0–59.' };
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
      const goToRole = () => {
        switchRole(key);
        document.querySelector(`input[name="activeRole"][value="${key}"]`).checked = true;
      };
      if (!player?.value)       { goToRole(); markError(player);  return { valid: false, message: `Pilih pemain untuk ${label}.` }; }
      if (!hero?.value)          { goToRole(); markError(hero);    return { valid: false, message: `Pilih hero untuk ${label}.` }; }
      if (!kills?.value.trim())  { goToRole(); markError(kills);   return { valid: false, message: `Kill ${label} wajib diisi.` }; }
      if (!deaths?.value.trim()) { goToRole(); markError(deaths);  return { valid: false, message: `Death ${label} wajib diisi.` }; }
      if (!assists?.value.trim()){ goToRole(); markError(assists); return { valid: false, message: `Assist ${label} wajib diisi.` }; }
      if (!gold?.value.trim())   { goToRole(); markError(gold);    return { valid: false, message: `Gold ${label} wajib diisi.` }; }
    }
    return { valid: true };
  }

  // ── Collect data ─────────────────────────────
  function getGameInfo() {
    return {
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

    const payload = {
      action: 'update',
      id: gameId,
      game: getGameInfo(),
      players: getPlayerStats(),
    };

    fetch(`${apiBase()}game_api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || !json.ok) throw new Error((json && json.message) || 'Gagal menyimpan.');
        return json;
      })
      .then(() => {
        showToast('Game berhasil diperbarui!', 'success');
        setTimeout(() => {
          window.location.href = `game.html?match_id=${matchId}`;
        }, REDIRECT_DELAY_MS);
      })
      .catch((err) => showToast(err.message || 'Terjadi kesalahan.', 'error'));
  }

  // ── Init ────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    gameId = parseInt(getParam('id') || '0', 10);
    if (gameId <= 0) {
      showToast('ID game tidak ditemukan di URL.', 'error');
      return;
    }

    attachRoleTabListeners();

    loadGameData().catch((err) => showToast(err.message || 'Gagal memuat data game.', 'error'));

    document.getElementById('btnNextStep')?.addEventListener('click', handleNextStep);
    document.getElementById('btnBackStep')?.addEventListener('click', goToStep1);
    document.getElementById('btnSubmitAll')?.addEventListener('click', handleSubmitAll);
  });

})();