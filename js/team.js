// js/team.js
(function () {
  const ROLE_LABEL = {
    jungler:   'Jungler',
    roamer:    'Roamer',
    midlaner:  'Mid Laner',
    explaner:  'Exp Laner',
    goldlaner: 'Gold Laner',
  };
  const ROLE_BADGE = {
    jungler:   'badge-green',
    roamer:    'badge-red',
    midlaner:  'badge-blue',
    explaner:  'badge-neutral',
    goldlaner: 'badge-yellow',
  };

  let players = [];
  const apiBase = () => window.EsportConfig ? window.EsportConfig.apiBase : 'db/';

  function showToast(msg, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(msg, type);
    }
  }

  // ── Helpers ────────────────────────────────
  function roleLabel(key) {
    return ROLE_LABEL[key] || key || '—';
  }
  function roleBadge(key) {
    return ROLE_BADGE[key] || 'badge-neutral';
  }
  function formatDate(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── Render ────────────────────────────────
  function getFilters() {
    const status = document.getElementById('filterStatus')?.value || 'all';
    const role   = document.getElementById('filterRole')?.value   || 'all';
    return { status, role };
  }

  function renderPlayers() {
    const tbody      = document.getElementById('teamBody');
    const countEl    = document.getElementById('rosterCount');
    if (!tbody) return;

    const { status, role } = getFilters();
    const filtered = players.filter((p) => {
      if (status === 'active'   && !p.is_active) return false;
      if (status === 'inactive' && p.is_active)  return false;
      if (role !== 'all' && p.primary_role !== role) return false;
      return true;
    });

    if (countEl) countEl.textContent = `${filtered.length} / ${players.length} pemain`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <h3>Tidak ada pemain</h3><p>Coba ubah filter pencarian</p>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((p, i) => {
      const sec = p.secondary_role
        ? `<span class="badge ${roleBadge(p.secondary_role)}">${roleLabel(p.secondary_role)}</span>`
        : '<span class="text-faint">—</span>';
      const statusBadge = p.is_active
        ? '<span class="badge badge-green">Aktif</span>'
        : '<span class="badge badge-neutral">Tidak Aktif</span>';
      const toggleLabel = p.is_active ? 'Nonaktifkan' : 'Aktifkan';
      return `
        <tr>
          <td><span class="badge badge-neutral">${i + 1}</span></td>
          <td><strong>${p.name}</strong></td>
          <td><span class="badge ${roleBadge(p.primary_role)}">${roleLabel(p.primary_role)}</span></td>
          <td>${sec}</td>
          <td>${statusBadge}</td>
          <td><small class="text-faint">${formatDate(p.created_at)}</small></td>
          <td>
            <div class="btn-action-group">
              <button class="btn btn-sm btn-outline" data-action="edit" data-id="${p.id}">
                <svg aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>Edit
              </button>
              <button class="btn btn-sm btn-ghost" data-action="toggle" data-id="${p.id}">${toggleLabel}</button>
              <button class="btn btn-sm btn-danger" data-action="delete" data-id="${p.id}">Hapus</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  // ── Filter ────────────────────────
  function createTeamToolbar(container) {
    if (!container) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'table-toolbar';

    const left  = document.createElement('div'); left.className = 'table-toolbar-left';
    const right = document.createElement('div'); right.className = 'table-toolbar-right';

    // Badge count — ditempatkan di kiri
    const countBadge = document.createElement('span');
    countBadge.id        = 'rosterCount';
    countBadge.className = 'badge badge-blue';
    countBadge.textContent = '0 pemain';
    left.appendChild(countBadge);

    const makeSelect = (id, placeholder, options) => {
      const sel = document.createElement('select');
      sel.id        = id;
      sel.className = 'form-select form-select-sm table-filter-select';
      sel.innerHTML = `<option value="all">${placeholder}</option>` +
        options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
      sel.addEventListener('change', renderPlayers);
      return sel;
    };

    right.appendChild(makeSelect('filterStatus', 'Semua Status', [
      ['active',   'Aktif'],
      ['inactive', 'Tidak Aktif'],
    ]));
    right.appendChild(makeSelect('filterRole', 'Semua Role', [
      ['jungler',    'Jungler'],
      ['roamer',     'Roamer'],
      ['midlaner',   'Mid Laner'],
      ['explaner',   'Exp Laner'],
      ['goldlaner',  'Gold Laner'],
    ]));

    toolbar.appendChild(left);
    toolbar.appendChild(right);
    container.parentElement.insertBefore(toolbar, container);
  }

  // ── Load from server ────────────────────────
  function loadPlayers() {
    fetch(`${apiBase()}team_api.php?action=list`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error(json?.message || 'Gagal memuat roster.');
        return json.players || [];
      })
      .then((data) => {
        players = data;
        renderPlayers();
      })
      .catch((err) => showToast(err.message, 'error'));
  }

  // ── Add player ───────────────────────────
  function handleAddPlayer(e) {
    e.preventDefault();
    const name    = document.getElementById('namaPemain')?.value.trim();
    const primary = document.getElementById('rolePrimary')?.value;
    const second  = document.getElementById('roleSecondary')?.value || '';

    if (!name || !primary) { showToast('Nama dan role utama wajib diisi.', 'error'); return; }
    if (primary && second && primary === second) { showToast('Role utama dan kedua tidak boleh sama.', 'error'); return; }

    fetch(`${apiBase()}team_api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', name, primary_role: primary, secondary_role: second || null, is_active: 1 }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error(json?.message || 'Gagal menambahkan pemain.');
        return json.player;
      })
      .then((player) => {
        players.push(player);
        document.getElementById('teamForm')?.reset();
        renderPlayers();
        showToast(`${player.name} berhasil ditambahkan!`, 'success');
      })
      .catch((err) => showToast(err.message, 'error'));
  }

  // ── Edit modal ───────────────────────────
  function openEditModal(id) {
    const p = players.find((x) => x.id == id);
    if (!p) return;
    document.getElementById('editPlayerId').value     = p.id;
    document.getElementById('editNamaPemain').value   = p.name;
    document.getElementById('editRolePrimary').value  = p.primary_role;
    document.getElementById('editRoleSecondary').value = p.secondary_role || '';
    document.getElementById('editModal')?.classList.remove('hidden');
  }
  function closeEditModal() {
    document.getElementById('editModal')?.classList.add('hidden');
  }

  function handleEditSubmit(e) {
    e.preventDefault();
    const id      = parseInt(document.getElementById('editPlayerId')?.value, 10);
    const name    = document.getElementById('editNamaPemain')?.value.trim();
    const primary = document.getElementById('editRolePrimary')?.value;
    const second  = document.getElementById('editRoleSecondary')?.value || '';

    if (!name || !primary) { showToast('Nama dan role utama wajib diisi.', 'error'); return; }
    if (primary && second && primary === second) { showToast('Role utama dan kedua tidak boleh sama.', 'error'); return; }

    fetch(`${apiBase()}team_api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id, name, primary_role: primary, secondary_role: second || null }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error(json?.message || 'Gagal memperbarui pemain.');
      })
      .then(() => {
        const idx = players.findIndex((x) => x.id == id);
        if (idx !== -1) {
          players[idx] = { ...players[idx], name, primary_role: primary, secondary_role: second || null };
        }
        closeEditModal();
        renderPlayers();
        showToast('Data pemain diperbarui!', 'success');
      })
      .catch((err) => showToast(err.message, 'error'));
  }

  // ── Table click delegation ────────────────────
  function handleTableClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id     = parseInt(btn.dataset.id, 10);
    if (!id) return;

    if (action === 'edit') {
      openEditModal(id);
      return;
    }

    if (action === 'toggle') {
      fetch(`${apiBase()}team_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id }),
      })
        .then(async (res) => {
          const json = await res.json().catch(() => null);
          if (!json || !json.ok) throw new Error(json?.message || 'Gagal mengubah status.');
          return json.is_active;
        })
        .then((isActive) => {
          const p = players.find((x) => x.id == id);
          if (p) p.is_active = isActive;
          renderPlayers();
        })
        .catch((err) => showToast(err.message, 'error'));
      return;
    }

    if (action === 'delete') {
      const p = players.find((x) => x.id == id);
      if (!confirm(`Hapus pemain "${p?.name || id}"? Tindakan ini tidak bisa dibatalkan.`)) return;
      fetch(`${apiBase()}team_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      })
        .then(async (res) => {
          const json = await res.json().catch(() => null);
          if (!json || !json.ok) throw new Error(json?.message || 'Gagal menghapus.');
        })
        .then(() => {
          players = players.filter((x) => x.id != id);
          renderPlayers();
          showToast('Pemain dihapus dari roster.', 'success');
        })
        .catch((err) => showToast(err.message, 'error'));
    }
  }

  // ── Init ────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    createTeamToolbar(document.getElementById('teamTableWrap'));
    loadPlayers();

    document.getElementById('teamForm')?.addEventListener('submit', handleAddPlayer);
    document.getElementById('teamBody')?.addEventListener('click', handleTableClick);
    document.getElementById('editForm')?.addEventListener('submit', handleEditSubmit);
    document.getElementById('editModalClose')?.addEventListener('click', closeEditModal);
    document.getElementById('editModalCancel')?.addEventListener('click', closeEditModal);
    document.getElementById('editModal')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('editModal')) closeEditModal();
    });
  });
})();