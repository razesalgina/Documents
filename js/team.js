// js/team.js
(function () {
  const roleColors = {
    Jungler: 'badge-red',
    Roamer: 'badge-blue',
    'Mid Laner': 'badge-yellow',
    'Exp Laner': 'badge-green',
    'Gold Laner': 'badge-neutral',
  };

  const players = [];
  const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';

  function syncPlayersFromServer() {
    return fetch(`${apiBase}team_api.php?action=list`)
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (!response.ok || !json || !json.ok) {
          const message = (json && json.message) || 'Gagal memuat roster dari server.';
          throw new Error(message);
        }
        return json.players || [];
      })
      .then((serverPlayers) => {
        players.length = 0;
        serverPlayers.forEach((p) => {
          players.push({
            id: p.id,
            name: p.name,
            role: p.primary_role,
            role2: p.secondary_role || '',
            active: !!p.is_active,
          });
        });
        renderPlayers();
      })
      .catch((error) => {
        showToast(error.message || 'Gagal memuat roster dari server.', 'error');
      });
  }

  function getElements() {
    return {
      teamBody: document.getElementById('teamBody'),
      rosterCount: document.getElementById('rosterCount'),
      teamForm: document.getElementById('teamForm'),
      nameInput: document.getElementById('namaPemain'),
      primaryRoleSelect: document.getElementById('rolePrimary'),
      secondaryRoleSelect: document.getElementById('roleSecondary'),
    };
  }

  function showToast(message, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(message, type);
    }
  }

  function renderEmptyState(teamBodyElement) {
    teamBodyElement.innerHTML =
      '<tr>' +
      '<td colspan="6">' +
      '<div class="empty-state">' +
      '<svg viewBox="0 0 24 24">' +
      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>' +
      '<circle cx="9" cy="7" r="4"/>' +
      '<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>' +
      '<path d="M16 3.13a4 4 0 0 1 0 7.75"/>' +
      '</svg>' +
      '<h3>Roster kosong</h3>' +
      '<p>Tambahkan pemain menggunakan form di samping</p>' +
      '</div>' +
      '</td>' +
      '</tr>';
  }

  function renderPlayers() {
    const { teamBody, rosterCount } = getElements();
    if (!teamBody || !rosterCount) return;

    rosterCount.textContent = `${players.length} pemain`;

    if (players.length === 0) {
      renderEmptyState(teamBody);
      return;
    }

    teamBody.innerHTML = players
      .map((player, index) => {
        const primaryRoleClass = roleColors[player.role] || 'badge-neutral';
        const secondaryRoleClass = player.role2
          ? roleColors[player.role2] || 'badge-neutral'
          : '';
        const statusClass = player.active ? 'badge-green' : 'badge-neutral';
        const statusText = player.active ? 'Aktif' : 'Tidak Aktif';

        const secondaryRoleContent = player.role2
          ? `<span class="badge ${secondaryRoleClass}">${player.role2}</span>`
          : '<span class="text-faint">—</span>';

        const toggleLabel = player.active ? 'Nonaktifkan' : 'Aktifkan';

        return (
          '<tr>' +
          `<td><span class="badge badge-neutral">${index + 1}</span></td>` +
          `<td><strong>${player.name}</strong></td>` +
          `<td><span class="badge ${primaryRoleClass}">${player.role}</span></td>` +
          `<td>${secondaryRoleContent}</td>` +
          `<td><span class="badge ${statusClass}">${statusText}</span></td>` +
          '<td>' +
          '<div class="table-actions">' +
          `<button class="btn btn-sm btn-ghost" data-action="toggle-status" data-index="${index}">` +
          `${toggleLabel}` +
          '</button>' +
          `<button class="btn btn-sm btn-danger" data-action="remove-player" data-index="${index}">Hapus</button>` +
          '</div>' +
          '</td>' +
          '</tr>'
        );
      })
      .join('');
  }

  function handleAddPlayer(event) {
    event.preventDefault();

    const { nameInput, primaryRoleSelect, secondaryRoleSelect, teamForm } = getElements();
    if (!nameInput || !primaryRoleSelect || !secondaryRoleSelect || !teamForm) return;

    const name = nameInput.value.trim();
    const primaryRole = primaryRoleSelect.value;
    const secondaryRole = secondaryRoleSelect.value;

    if (!name || !primaryRole) {
      showToast('Nama dan role utama wajib diisi', 'error');
      return;
    }

    if (primaryRole && secondaryRole && primaryRole === secondaryRole) {
      showToast('Role utama dan kedua tidak boleh sama', 'error');
      return;
    }

    const payload = {
      action: 'add',
      name,
      primary_role: primaryRole,
      secondary_role: secondaryRole || '',
      is_active: 1,
    };

    fetch(`${apiBase}team_api.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (!response.ok || !json || !json.ok) {
          const message = (json && json.message) || 'Gagal menambahkan pemain.';
          throw new Error(message);
        }
        return json.player;
      })
      .then((player) => {
        players.push({
          id: player.id,
          name: player.name,
          role: player.primary_role,
          role2: player.secondary_role || '',
          active: !!player.is_active,
        });

        teamForm.reset();
        renderPlayers();
        showToast(`${player.name} berhasil ditambahkan!`, 'success');
      })
      .catch((error) => {
        showToast(error.message || 'Gagal menambahkan pemain.', 'error');
      });
  }

  function handleTableClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const action = target.getAttribute('data-action');
    const indexString = target.getAttribute('data-index');
    if (!action || indexString == null) return;

    const index = Number(indexString);
    const player = players[index];
    if (Number.isNaN(index) || !player) return;

    if (action === 'remove-player') {
      if (!player.id) {
        // fallback lokal
        players.splice(index, 1);
        renderPlayers();
        showToast('Pemain dihapus dari roster', 'success');
        return;
      }

      const payload = { action: 'delete', id: player.id };

      fetch(`${apiBase}team_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(async (response) => {
          const json = await response.json().catch(() => null);
          if (!response.ok || !json || !json.ok) {
            const message = (json && json.message) || 'Gagal menghapus pemain.';
            throw new Error(message);
          }
        })
        .then(() => {
          players.splice(index, 1);
          renderPlayers();
          showToast('Pemain dihapus dari roster', 'success');
        })
        .catch((error) => {
          showToast(error.message || 'Gagal menghapus pemain.', 'error');
        });

      return;
    }

    if (action === 'toggle-status') {
      if (!player.id) {
        player.active = !player.active;
        renderPlayers();
        return;
      }

      const payload = { action: 'toggle', id: player.id };

      fetch(`${apiBase}team_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(async (response) => {
          const json = await response.json().catch(() => null);
          if (!response.ok || !json || !json.ok) {
            const message = (json && json.message) || 'Gagal mengubah status pemain.';
            throw new Error(message);
          }
          return json.is_active;
        })
        .then((isActive) => {
          players[index].active = !!isActive;
          renderPlayers();
        })
        .catch((error) => {
          showToast(error.message || 'Gagal mengubah status pemain.', 'error');
        });
    }
  }

  function attachEventListeners() {
    const { teamForm, teamBody } = getElements();
    if (teamForm) {
      teamForm.addEventListener('submit', handleAddPlayer);
    }
    if (teamBody) {
      teamBody.addEventListener('click', handleTableClick);
    }
  }

  function initTeamPage() {
    attachEventListeners();
    syncPlayersFromServer();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTeamPage();
  });
})();