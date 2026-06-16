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
      formElement:   document.getElementById('addMatchForm'),
      eventGroup:    document.getElementById('eventGroup'),
      opponentGroup: document.getElementById('opponentGroup'),
      datetimeGroup: document.getElementById('datetimeGroup'),
      formatGroup:   document.getElementById('formatGroup'),
      dateGroup:     document.getElementById('dateGroup'),
      timeGroup:     document.getElementById('timeGroup'),
    };
  }

  function updateFormVisibility(type) {
    const { eventGroup, opponentGroup, datetimeGroup, formatGroup, dateGroup, timeGroup } = getElements();
    if (!eventGroup) return;

    [eventGroup, opponentGroup, datetimeGroup, formatGroup, dateGroup, timeGroup].forEach((el) => {
      if (el) el.classList.add('hidden');
    });

    if (type === 'tournament' || type === 'league') {
      eventGroup.classList.remove('hidden');
      formatGroup.classList.remove('hidden');
      opponentGroup.classList.remove('hidden');
      datetimeGroup.classList.remove('hidden');
      dateGroup.classList.remove('hidden');
      timeGroup.classList.remove('hidden');
      loadUpcomingCompetitions();
    } else if (type === 'scrim') {
      formatGroup.classList.remove('hidden');
      opponentGroup.classList.remove('hidden');
      datetimeGroup.classList.remove('hidden');
      dateGroup.classList.remove('hidden');
    } else if (type === 'ranked') {
      datetimeGroup.classList.remove('hidden');
      dateGroup.classList.remove('hidden');
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

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const type          = (formData.get('type') || '').toLowerCase();
    const opponentName  = formData.get('opponentName') || '';
    const matchDate     = formData.get('matchDate') || '';
    const matchTime     = formData.get('matchTime') || '';
    const format        = formData.get('matchFormat') || null;  // select id="matchFormat", name="matchFormat"
    const competitionId = formData.get('event') ? Number(formData.get('event')) : null;

    if (!type) { showToast('Kategori match wajib dipilih', 'error'); return; }

    if ((type === 'tournament' || type === 'league') && (!format || !opponentName || !matchDate || !matchTime || !competitionId)) {
      showToast('Format, lawan, tanggal, jam, dan nama kompetisi wajib diisi', 'error'); return;
    }
    if (type === 'scrim' && (!format || !opponentName || !matchDate)) {
      showToast('Format, lawan, dan tanggal wajib diisi untuk Scrim', 'error'); return;
    }
    if (type === 'ranked' && !matchDate) {
      showToast('Tanggal wajib diisi untuk Ranked', 'error'); return;
    }

    const payload = {
      action:         'add',
      type,
      competition_id: competitionId,
      format:         format ? format.toUpperCase() : null,
      opponent_name:  opponentName || null,
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
        setTimeout(() => { window.location.href = 'match.html'; }, REDIRECT_DELAY_MS);
      })
      .catch((err) => showToast(err.message || 'Terjadi kesalahan saat menyimpan match.', 'error'));
  }

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
            opt.value = c.id;
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