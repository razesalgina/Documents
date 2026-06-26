// js/editmatch.js
(function () {
  const REDIRECT_DELAY_MS = 1500;

  function apiBase() {
    return window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
  }

  function showToast(message, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(message, type);
    }
  }

  function getElements() {
    return {
      formElement:    document.getElementById('editMatchForm'),
      eventGroup:     document.getElementById('eventGroup'),
      eventLabel:     document.getElementById('eventLabel'),
      eventSelect:    document.getElementById('eventSelect'),
      formatGroup:    document.getElementById('formatGroup'),
      matchFormat:    document.getElementById('matchFormat'),
      opponentGroup:  document.getElementById('opponentGroup'),
      opponentInput:  document.getElementById('opponentNameInput'),
      datetimeGroup:  document.getElementById('datetimeGroup'),
      dateGroup:      document.getElementById('dateGroup'),
      timeGroup:      document.getElementById('timeGroup'),
      rankedAutoLabel: document.getElementById('rankedAutoLabel'),
    };
  }

  // ── Bangun URL kembali secara dinamis ─────────────────────────
  // Membaca competition_id yang disimpan di hidden input #matchCompetitionId.
  // Jika ada → match.html?competition_id=X
  // Jika tidak → match.html atau train.html berdasarkan tipe
  function buildBackUrl(type) {
    const compIdInput = document.getElementById('matchCompetitionId');
    const compId = compIdInput ? parseInt(compIdInput.value || '0', 10) : 0;
    if (compId > 0) return `match.html?competition_id=${compId}`;
    const t = (type || '').toLowerCase();
    return (t === 'scrim' || t === 'ranked') ? 'train.html' : 'match.html';
  }

  // ── Pasang href dinamis pada semua tombol Batal/Kembali ───────
  function setupBackButtons() {
    const getType = () => {
      const checked = document.querySelector('input[name="type"]:checked');
      return checked ? checked.value : '';
    };

    const update = () => {
      const url = buildBackUrl(getType());
      document.querySelectorAll('[data-back-btn]').forEach((el) => {
        if (el.tagName === 'A') {
          el.href = url;
        } else {
          el.addEventListener('click', () => { window.location.href = url; }, { once: true });
        }
      });
    };

    // Update setiap kali radio type berubah
    document.querySelectorAll('input[name="type"]').forEach((radio) => {
      radio.addEventListener('change', update);
    });

    // Update awal setelah form dipopulate (dipanggil dari populateForm)
    return update;
  }

  // ── Auto-generate ranked name (sama seperti addmatch) ──
  function fetchNextRankedName(currentMatchId) {
    return fetch(`${apiBase()}match_api.php?action=list`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) return 'Ranked1';
        const rankeds = (json.matches || []).filter(
          (m) =>
            (m.type || '').toLowerCase() === 'ranked' &&
            Number(m.id) !== Number(currentMatchId)
        );
        return `Ranked${rankeds.length + 1}`;
      })
      .catch(() => 'Ranked1');
  }

  function updateEventLabel(type) {
    const { eventLabel, eventSelect } = getElements();
    const labelMap = { tournament: 'Pilih Tournament', league: 'Pilih League' };
    const text = labelMap[type] || 'Pilih Tournament/League';
    if (eventLabel) eventLabel.textContent = text;
    if (eventSelect && eventSelect.options.length > 0 && eventSelect.options[0].value === '') {
      eventSelect.options[0].textContent = text;
    }
  }

  function updateFormVisibility(type) {
    const {
      eventGroup, formatGroup, opponentGroup,
      datetimeGroup, dateGroup, timeGroup, rankedAutoLabel,
    } = getElements();
    if (!datetimeGroup) return;

    [eventGroup, formatGroup, opponentGroup,
     datetimeGroup, dateGroup, timeGroup, rankedAutoLabel].forEach((el) => {
      if (el) el.classList.add('hidden');
    });

    if (type === 'tournament' || type === 'league') {
      if (eventGroup)    eventGroup.classList.remove('hidden');
      if (formatGroup)   formatGroup.classList.remove('hidden');
      if (opponentGroup) opponentGroup.classList.remove('hidden');
      if (datetimeGroup) datetimeGroup.classList.remove('hidden');
      if (dateGroup)     dateGroup.classList.remove('hidden');
      if (timeGroup)     timeGroup.classList.remove('hidden');

    } else if (type === 'scrim') {
      if (formatGroup)   formatGroup.classList.remove('hidden');
      if (opponentGroup) opponentGroup.classList.remove('hidden');
      if (datetimeGroup) datetimeGroup.classList.remove('hidden');
      if (dateGroup)     dateGroup.classList.remove('hidden');

    } else if (type === 'ranked') {
      if (datetimeGroup)   datetimeGroup.classList.remove('hidden');
      if (dateGroup)       dateGroup.classList.remove('hidden');
      if (rankedAutoLabel) rankedAutoLabel.classList.remove('hidden');

      const matchId = document.getElementById('matchId')?.value || null;
      fetchNextRankedName(matchId).then((name) => {
        if (rankedAutoLabel) {
          rankedAutoLabel.textContent        = `Sesi ini akan disimpan sebagai: ${name}`;
          rankedAutoLabel.dataset.rankedName = name;
        }
      });
    }
  }

  function loadCompetitions(filterType, selectedId) {
    const { eventSelect } = getElements();
    if (!eventSelect) return;

    updateEventLabel(filterType);
    eventSelect.innerHTML = '';

    const placeholderOpt       = document.createElement('option');
    placeholderOpt.value       = '';
    placeholderOpt.textContent = filterType === 'tournament' ? 'Pilih Tournament' : 'Pilih League';
    placeholderOpt.disabled = true;
    placeholderOpt.selected = true;
    eventSelect.appendChild(placeholderOpt);

    fetch(`${apiBase()}competition_api.php?action=list`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error('Gagal memuat kompetisi');
        return json.competitions || [];
      })
      .then((competitions) => {
        competitions
          .filter((c) => {
            const t = (c.type   || '').toLowerCase();
            const s = (c.status || '').toLowerCase();
            return t === filterType && s === 'upcoming';
          })
          .forEach((c) => {
            const opt       = document.createElement('option');
            opt.value       = c.id;
            opt.textContent = c.name;
            if (selectedId && Number(c.id) === Number(selectedId)) opt.selected = true;
            eventSelect.appendChild(opt);
          });
      })
      .catch((err) => showToast(err.message || 'Gagal memuat daftar kompetisi.', 'error'));
  }

  function attachTypeListeners() {
    const { formElement } = getElements();
    if (!formElement) return;

    formElement.querySelectorAll('input[name="type"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const type = (e.target.value || '').toLowerCase();
        updateFormVisibility(type);
        if (type === 'tournament' || type === 'league') {
          loadCompetitions(type, null);
        }
      });
    });
  }

  function populateForm(match, updateBackButtons) {
    document.getElementById('matchId').value = match.id;

    // ── FIX: simpan competition_id ke hidden input agar buildBackUrl bisa membacanya
    const compIdInput = document.getElementById('matchCompetitionId');
    if (compIdInput) compIdInput.value = match.competition_id || '';

    const type = (match.type || '').toLowerCase();
    const typeRadio = document.querySelector(`input[name="type"][value="${type}"]`);
    if (typeRadio) typeRadio.checked = true;
    updateFormVisibility(type);

    const opponentInput = document.getElementById('opponentNameInput');
    if (opponentInput) opponentInput.value = match.opponent_name || '';

    const dateInput = document.getElementById('matchDateInput');
    if (dateInput) dateInput.value = match.match_date || '';

    const timeInput = document.getElementById('matchTimeInput');
    if (timeInput) {
      const rawTime = match.match_time || '';
      timeInput.value = rawTime.length >= 5 ? rawTime.substring(0, 5) : rawTime;
    }

    const formatSelect = document.getElementById('matchFormat');
    if (formatSelect && match.format) formatSelect.value = match.format;

    const oppScoreInput = document.getElementById('opponentScore');
    if (oppScoreInput) oppScoreInput.value = match.opponent_score != null ? match.opponent_score : 0;

    const statusSelect = document.getElementById('matchStatus');
    if (statusSelect) statusSelect.value = match.status || 'upcoming';

    if ((type === 'tournament' || type === 'league') && match.competition_id) {
      loadCompetitions(type, match.competition_id);
    }

    const label      = match.opponent_name || 'Edit Match';
    const breadcrumb = document.getElementById('breadcrumbMatchLabel');
    const pageTitle  = document.getElementById('pageTitle');
    if (breadcrumb) breadcrumb.textContent = label;
    if (pageTitle)  pageTitle.textContent  = label;

    // ── FIX: update href tombol Batal/Kembali setelah data dimuat
    if (typeof updateBackButtons === 'function') updateBackButtons();
  }

  async function buildPayload(formData) {
    const type = (formData.get('type') || '').toLowerCase();

    const payload = {
      action:         'update',
      id:             parseInt(formData.get('id') || '0', 10),
      type,
      competition_id: null,
      format:         null,
      opponent_name:  null,
      match_date:     formData.get('matchDate') || null,
      match_time:     null,
      opponent_score: parseInt(formData.get('opponentScore') || '0', 10),
      status:         formData.get('matchStatus') || null,
    };

    if (type === 'tournament' || type === 'league') {
      payload.competition_id = formData.get('event') ? Number(formData.get('event')) : null;
      payload.format         = formData.get('matchFormat')
        ? formData.get('matchFormat').toUpperCase()
        : null;
      payload.opponent_name  = (formData.get('opponentName') || '').trim() || null;
      payload.match_time     = formData.get('matchTime') || null;

    } else if (type === 'scrim') {
      payload.format        = formData.get('matchFormat')
        ? formData.get('matchFormat').toUpperCase()
        : null;
      payload.opponent_name = (formData.get('opponentName') || '').trim() || null;
      const rawTime = formData.get('matchTime') || '';
      payload.match_time = rawTime || '00:00:00';
    } else if (type === 'ranked') {
      const rankedAutoLabel = document.getElementById('rankedAutoLabel');
      const autoName = rankedAutoLabel?.dataset.rankedName || null;
      if (autoName) {
        payload.opponent_name = autoName;
      } else {
        payload.opponent_name = await fetchNextRankedName(payload.id);
      }
    }

    return payload;
  }

  function validatePayload(payload) {
    if (!payload.id)   return { valid: false, message: 'ID match tidak ditemukan' };
    if (!payload.type) return { valid: false, message: 'Kategori match wajib dipilih' };

    if (payload.type === 'tournament' || payload.type === 'league') {
      if (!payload.competition_id) return { valid: false, message: 'Kompetisi wajib dipilih' };
      if (!payload.format)         return { valid: false, message: 'Format match wajib dipilih' };
      if (!payload.opponent_name)  return { valid: false, message: 'Nama lawan wajib diisi' };
      if (!payload.match_date)     return { valid: false, message: 'Tanggal match wajib diisi' };
      if (!payload.match_time)     return { valid: false, message: 'Jam match wajib diisi' };
    }
    if (payload.type === 'scrim') {
      if (!payload.format)        return { valid: false, message: 'Format wajib dipilih untuk Scrim' };
      if (!payload.opponent_name) return { valid: false, message: 'Nama lawan wajib diisi untuk Scrim' };
      if (!payload.match_date)    return { valid: false, message: 'Tanggal wajib diisi untuk Scrim' };
    }
    if (payload.type === 'ranked' && !payload.match_date) {
      return { valid: false, message: 'Tanggal wajib diisi untuk Ranked' };
    }

    return { valid: true, message: '' };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const payload    = await buildPayload(formData);
    const validation = validatePayload(payload);
    if (!validation.valid) { showToast(validation.message, 'error'); return; }

    fetch(`${apiBase()}match_api.php`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || !json.ok) throw new Error((json && json.message) || 'Gagal memperbarui match.');
        return json.match;
      })
      .then((savedMatch) => {
        showToast('Match berhasil diperbarui!', 'success');
        const savedCompId = savedMatch && savedMatch.competition_id
          ? savedMatch.competition_id
          : null;

        let redirect;
        if (savedCompId) {
          redirect = `match.html?competition_id=${savedCompId}`;
        } else {
          const t = (savedMatch && savedMatch.type) || payload.type;
          redirect = (t === 'scrim' || t === 'ranked') ? 'train.html' : 'match.html';
        }
        setTimeout(() => { window.location.href = redirect; }, REDIRECT_DELAY_MS);
      })
      .catch((err) => showToast(err.message || 'Terjadi kesalahan saat memperbarui match.', 'error'));
  }

  function getIdFromUrl() {
    return new URLSearchParams(window.location.search).get('id');
  }

  function initEditMatchPage() {
    const formElement = document.getElementById('editMatchForm');
    if (!formElement) return;

    const id = getIdFromUrl();
    if (!id) { window.location.href = 'match.html'; return; }

    attachTypeListeners();

    // Setup back buttons dan simpan fungsi update-nya
    const updateBackButtons = setupBackButtons();

    fetch(`${apiBase()}match_api.php?action=get&id=${id}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error('Match tidak ditemukan');
        return json.match;
      })
      .then((match) => {
        populateForm(match, updateBackButtons);
        formElement.addEventListener('submit', handleSubmit);
      })
      .catch(() => { window.location.href = 'match.html'; });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initEditMatchPage();
  });

})();
