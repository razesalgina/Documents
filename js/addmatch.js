// js/addmatch.js
(function () {
  const REDIRECT_DELAY_MS = 1500;

  function showToast(message, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(message, type);
    }
  }

  function getElements() {
    return {
      formElement:     document.getElementById('addMatchForm'),
      eventGroup:      document.getElementById('eventGroup'),
      opponentGroup:   document.getElementById('opponentGroup'),
      opponentInput:   document.getElementById('opponentNameInput'),
      datetimeGroup:   document.getElementById('datetimeGroup'),
      formatGroup:     document.getElementById('formatGroup'),
      dateGroup:       document.getElementById('dateGroup'),
      timeGroup:       document.getElementById('timeGroup'),
      rankedAutoLabel: document.getElementById('rankedAutoLabel'),
      breadcrumbParent: document.getElementById('breadcrumbParent'),
      backBtn:         document.getElementById('backBtn'),
      cancelBtn:       document.getElementById('cancelBtn'),
    };
  }

  // ── Auto-generate ranked name ─────────────────────

  function fetchNextRankedName() {
    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    return fetch(`${apiBase}match_api.php?action=list`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) return 'Ranked1';
        const rankeds = (json.matches || []).filter(
          (m) => (m.type || '').toLowerCase() === 'ranked'
        );
        return `Ranked${rankeds.length + 1}`;
      })
      .catch(() => 'Ranked1');
  }

  // ── Update breadcrumb & back links ─────────────────

  function updateNavLinks(type) {
    const { breadcrumbParent, backBtn, cancelBtn } = getElements();
    const isTrainType = type === 'scrim' || type === 'ranked';
    const href        = isTrainType ? 'train.html' : 'match.html';
    const label       = isTrainType ? 'Train' : 'Match';

    if (breadcrumbParent) breadcrumbParent.textContent = label;
    if (backBtn)          backBtn.href   = href;
    if (cancelBtn)        cancelBtn.href = href;
  }

  // ── Form visibility ─────────────────────────────

  function updateFormVisibility(type) {
    const { eventGroup, opponentGroup, datetimeGroup, formatGroup,
            dateGroup, timeGroup, rankedAutoLabel } = getElements();
    if (!datetimeGroup) return;

    // Sembunyikan semua dulu
    [eventGroup, opponentGroup, datetimeGroup, formatGroup,
     dateGroup, timeGroup, rankedAutoLabel].forEach((el) => {
      if (el) el.classList.add('hidden');
    });

    // Update breadcrumb & tombol kembali
    updateNavLinks(type);

    if (type === 'tournament' || type === 'league') {
      if (eventGroup)    eventGroup.classList.remove('hidden');
      if (formatGroup)   formatGroup.classList.remove('hidden');
      if (opponentGroup) opponentGroup.classList.remove('hidden');
      if (datetimeGroup) datetimeGroup.classList.remove('hidden');
      if (dateGroup)     dateGroup.classList.remove('hidden');
      if (timeGroup)     timeGroup.classList.remove('hidden');
      loadUpcomingCompetitions();

    } else if (type === 'scrim') {
      if (formatGroup)   formatGroup.classList.remove('hidden');
      if (opponentGroup) opponentGroup.classList.remove('hidden');
      if (datetimeGroup) datetimeGroup.classList.remove('hidden');
      if (dateGroup)     dateGroup.classList.remove('hidden');

    } else if (type === 'ranked') {
      if (datetimeGroup)   datetimeGroup.classList.remove('hidden');
      if (dateGroup)       dateGroup.classList.remove('hidden');
      if (rankedAutoLabel) rankedAutoLabel.classList.remove('hidden');

      fetchNextRankedName().then((name) => {
        if (rankedAutoLabel) {
          rankedAutoLabel.textContent        = `Sesi ini akan disimpan sebagai: ${name}`;
          rankedAutoLabel.dataset.rankedName = name;
        }
      });
    }
  }

  function attachTypeListeners() {
    const { formElement } = getElements();
    if (!formElement) return;
    formElement.querySelectorAll('input[name="type"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        updateFormVisibility((e.target.value || '').toLowerCase());
      });
    });
  }

  // ── Submit ───────────────────────────────────

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const type          = (formData.get('type') || '').toLowerCase();
    const matchDate     = formData.get('matchDate') || '';
    const matchTime     = formData.get('matchTime') || '';
    const format        = formData.get('matchFormat') || null;
    const competitionId = formData.get('event') ? Number(formData.get('event')) : null;

    if (!type) { showToast('Kategori match wajib dipilih', 'error'); return; }

    let opponentName;

    if (type === 'ranked') {
      const rankedAutoLabel = document.getElementById('rankedAutoLabel');
      opponentName = (rankedAutoLabel && rankedAutoLabel.dataset.rankedName)
        ? rankedAutoLabel.dataset.rankedName
        : null;
      if (!matchDate) { showToast('Tanggal wajib diisi untuk Ranked', 'error'); return; }

    } else {
      opponentName = (formData.get('opponentName') || '').trim() || null;

      if ((type === 'tournament' || type === 'league') &&
          (!format || !opponentName || !matchDate || !matchTime || !competitionId)) {
        showToast('Format, lawan, tanggal, jam, dan nama kompetisi wajib diisi', 'error'); return;
      }
      if (type === 'scrim' && (!format || !opponentName || !matchDate)) {
        showToast('Format, lawan, dan tanggal wajib diisi untuk Scrim', 'error'); return;
      }
    }

    const payload = {
      action:         'add',
      type,
      competition_id: competitionId,
      format:         format ? format.toUpperCase() : null,
      opponent_name:  opponentName,
      our_score:      0,
      opponent_score: 0,
      match_date:     matchDate || null,
      match_time:     matchTime || null,
    };

    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    fetch(`${apiBase}match_api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || !json.ok) throw new Error((json && json.message) || 'Gagal menyimpan match.');
        return json.match;
      })
      .then(() => {
        showToast('Match berhasil disimpan!', 'success');
        const redirect = (type === 'scrim' || type === 'ranked') ? 'train.html' : 'match.html';
        setTimeout(() => { window.location.href = redirect; }, REDIRECT_DELAY_MS);
      })
      .catch((err) => showToast(err.message || 'Terjadi kesalahan saat menyimpan match.', 'error'));
  }

  // ── Load competitions ───────────────────────────

  function loadUpcomingCompetitions() {
    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    const select = document.getElementById('eventSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Pilih Tournament/League</option>';

    fetch(`${apiBase}competition_api.php?action=list`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error('Gagal mengambil daftar kompetisi.');
        return json.competitions || [];
      })
      .then((competitions) => {
        competitions
          .filter((c) => {
            const t = (c.type || '').toLowerCase();
            const s = (c.status || '').toLowerCase();
            return (t === 'tournament' || t === 'league') && s === 'upcoming';
          })
          .forEach((c) => {
            const opt = document.createElement('option');
            opt.value       = c.id;
            opt.textContent = `${c.name} (${c.type})`;
            select.appendChild(opt);
          });
      })
      .catch((err) => showToast(err.message || 'Gagal memuat daftar kompetisi.', 'error'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    attachTypeListeners();
    const form = document.getElementById('addMatchForm');
    if (form) form.addEventListener('submit', handleSubmit);
  });

})();