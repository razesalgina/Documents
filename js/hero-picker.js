/**
 * hero-picker.js
 * Hero Picker Popup — MLBB Manager
 * Batch 1: core logic (search, role filter, select, positioning)
 */

( function () {
  'use strict';

  /* ─────────────────────────────────────────
   * 1. HERO DATA
   * Sumber: data statis MLBB. Ganti / extend
   * lewat window.HERO_DATA sebelum script ini
   * di-load, atau nanti lewat fetch ke PHP.
   * ───────────────────────────────────────── */
  const HERO_DATA = window.HERO_DATA || [
    /* Tank */
    { id: 1,  name: 'Tigreal',   role: 'tank',     img: 'assets/heroes/tigreal.jpg' },
    { id: 2,  name: 'Akai',      role: 'tank',     img: 'assets/heroes/akai.jpg' },
    { id: 3,  name: 'Minotaur',  role: 'tank',     img: 'assets/heroes/minotaur.jpg' },
    { id: 4,  name: 'Atlas',     role: 'tank',     img: 'assets/heroes/atlas.jpg' },
    { id: 5,  name: 'Johnson',   role: 'tank',     img: 'assets/heroes/johnson.jpg' },
    { id: 6,  name: 'Khufra',    role: 'tank',     img: 'assets/heroes/khufra.jpg' },
    { id: 7,  name: 'Baxia',     role: 'tank',     img: 'assets/heroes/baxia.jpg' },
    { id: 8,  name: 'Edith',     role: 'tank',     img: 'assets/heroes/edith.jpg' },
    /* Fighter */
    { id: 9,  name: 'Aldous',    role: 'fighter',  img: 'assets/heroes/aldous.jpg' },
    { id: 10, name: 'Chou',      role: 'fighter',  img: 'assets/heroes/chou.jpg' },
    { id: 11, name: 'Julian',    role: 'fighter',  img: 'assets/heroes/julian.jpg' },
    { id: 12, name: 'Thamuz',    role: 'fighter',  img: 'assets/heroes/thamuz.jpg' },
    { id: 13, name: 'Paquito',   role: 'fighter',  img: 'assets/heroes/paquito.jpg' },
    { id: 14, name: 'Jawhead',   role: 'fighter',  img: 'assets/heroes/jawhead.jpg' },
    { id: 15, name: 'Fredrinn',  role: 'fighter',  img: 'assets/heroes/fredrinn.jpg' },
    { id: 16, name: 'Badang',    role: 'fighter',  img: 'assets/heroes/badang.jpg' },
    /* Assassin */
    { id: 17, name: 'Fanny',     role: 'assassin', img: 'assets/heroes/fanny.jpg' },
    { id: 18, name: 'Gusion',    role: 'assassin', img: 'assets/heroes/gusion.jpg' },
    { id: 19, name: 'Lancelot',  role: 'assassin', img: 'assets/heroes/lancelot.jpg' },
    { id: 20, name: 'Ling',      role: 'assassin', img: 'assets/heroes/ling.jpg' },
    { id: 21, name: 'Hayabusa',  role: 'assassin', img: 'assets/heroes/hayabusa.jpg' },
    { id: 22, name: 'Benedetta', role: 'assassin', img: 'assets/heroes/benedetta.jpg' },
    { id: 23, name: 'Suyou',     role: 'assassin', img: 'assets/heroes/suyou.jpg' },
    /* Marksman */
    { id: 24, name: 'Brody',     role: 'marksman', img: 'assets/heroes/brody.jpg' },
    { id: 25, name: 'Beatrix',   role: 'marksman', img: 'assets/heroes/beatrix.jpg' },
    { id: 26, name: 'Melissa',   role: 'marksman', img: 'assets/heroes/melissa.jpg' },
    { id: 27, name: 'Granger',   role: 'marksman', img: 'assets/heroes/granger.jpg' },
    { id: 28, name: 'Natan',     role: 'marksman', img: 'assets/heroes/natan.jpg' },
    { id: 29, name: 'Xavier',    role: 'marksman', img: 'assets/heroes/xavier.jpg' },
    { id: 30, name: 'Moskov',    role: 'marksman', img: 'assets/heroes/moskov.jpg' },
    /* Mage */
    { id: 31, name: 'Yve',       role: 'mage',     img: 'assets/heroes/yve.jpg' },
    { id: 32, name: 'Lunox',     role: 'mage',     img: 'assets/heroes/lunox.jpg' },
    { id: 33, name: 'Kagura',    role: 'mage',     img: 'assets/heroes/kagura.jpg' },
    { id: 34, name: 'Vale',      role: 'mage',     img: 'assets/heroes/vale.jpg' },
    { id: 35, name: 'Pharsa',    role: 'mage',     img: 'assets/heroes/pharsa.jpg' },
    { id: 36, name: 'Cecilion',  role: 'mage',     img: 'assets/heroes/cecilion.jpg' },
    { id: 37, name: 'Lylia',     role: 'mage',     img: 'assets/heroes/lylia.jpg' },
    /* Support */
    { id: 38, name: 'Angela',    role: 'support',  img: 'assets/heroes/angela.jpg' },
    { id: 39, name: 'Rafaela',   role: 'support',  img: 'assets/heroes/rafaela.jpg' },
    { id: 40, name: 'Estes',     role: 'support',  img: 'assets/heroes/estes.jpg' },
    { id: 41, name: 'Floryn',    role: 'support',  img: 'assets/heroes/floryn.jpg' },
    { id: 42, name: 'Mathilda',  role: 'support',  img: 'assets/heroes/mathilda.jpg' },
    { id: 43, name: 'Diggie',    role: 'support',  img: 'assets/heroes/diggie.jpg' },
  ];

  const ROLES = ['all', 'tank', 'fighter', 'assassin', 'marksman', 'mage', 'support'];

  /* ─────────────────────────────────────────
   * 2. STATE  (singleton — only 1 popup open)
   * ───────────────────────────────────────── */
  const State = {
    isOpen:       false,
    activeRole:   'all',
    keyword:      '',
    selectedHero: null,   // hero object
    targetInput:  null,   // <input type="hidden">
    targetLabel:  null,   // <span class="hero-picker-preview">
    triggerBtn:   null,   // button that opened the popup
  };

  /* ─────────────────────────────────────────
   * 3. BUILD POPUP DOM (once, reused)
   * ───────────────────────────────────────── */
  let popup = null;
  let popupSearch, popupClose, popupGrid, popupSelectBtn;
  const filterBtnMap = {};

  function buildPopup() {
    popup = document.createElement('div');
    popup.className  = 'hero-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-label', 'Pilih Hero');
    popup.hidden = true;

    /* — Header — */
    const header = document.createElement('div');
    header.className = 'hero-popup__header';

    popupSearch = document.createElement('input');
    popupSearch.type        = 'text';
    popupSearch.className   = 'hero-popup__search';
    popupSearch.placeholder = 'Cari nama hero...';
    popupSearch.setAttribute('autocomplete', 'off');

    popupClose = document.createElement('button');
    popupClose.type      = 'button';
    popupClose.className = 'hero-popup__close';
    popupClose.setAttribute('aria-label', 'Tutup popup');
    popupClose.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    header.appendChild(popupSearch);
    header.appendChild(popupClose);

    /* — Filters — */
    const filterRow = document.createElement('div');
    filterRow.className = 'hero-popup__filters';

    ROLES.forEach( function (role) {
      const btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = 'hero-filter' + (role === 'all' ? ' is-active' : '');
      btn.dataset.role = role;
      btn.textContent  = role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1);
      filterBtnMap[role] = btn;
      filterRow.appendChild(btn);
    });

    /* — Grid — */
    popupGrid = document.createElement('div');
    popupGrid.className = 'hero-popup__grid';

    /* — Footer — */
    const footer = document.createElement('div');
    footer.className = 'hero-popup__footer';

    popupSelectBtn = document.createElement('button');
    popupSelectBtn.type      = 'button';
    popupSelectBtn.className = 'hero-popup__select btn btn-primary';
    popupSelectBtn.textContent = 'Select';
    popupSelectBtn.disabled  = true;

    footer.appendChild(popupSelectBtn);

    popup.appendChild(header);
    popup.appendChild(filterRow);
    popup.appendChild(popupGrid);
    popup.appendChild(footer);

    document.body.appendChild(popup);

    /* — Events (delegated to popup) — */
    popupClose.addEventListener('click', closePopup);

    filterRow.addEventListener('click', function (e) {
      const btn = e.target.closest('.hero-filter');
      if (!btn) return;
      Object.values(filterBtnMap).forEach( b => b.classList.remove('is-active') );
      btn.classList.add('is-active');
      State.activeRole = btn.dataset.role;
      renderGrid();
    });

    popupSearch.addEventListener('input', function () {
      State.keyword = popupSearch.value.trim();
      renderGrid();
    });

    popupGrid.addEventListener('click', function (e) {
      const card = e.target.closest('.hero-card');
      if (!card) return;
      const heroId = Number(card.dataset.heroId);
      State.selectedHero = HERO_DATA.find( h => h.id === heroId ) || null;
      popupSelectBtn.disabled = !State.selectedHero;

      popupGrid.querySelectorAll('.hero-card').forEach( c => c.classList.remove('is-selected') );
      card.classList.add('is-selected');
    });

    popupSelectBtn.addEventListener('click', confirmSelection);

    popup.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  /* ─────────────────────────────────────────
   * 4. RENDER GRID
   * ───────────────────────────────────────── */
  function renderGrid() {
    const kw = State.keyword.toLowerCase();
    const filtered = HERO_DATA.filter( function (h) {
      const matchRole = State.activeRole === 'all' || h.role === State.activeRole;
      const matchKw   = h.name.toLowerCase().includes(kw);
      return matchRole && matchKw;
    });

    if (!filtered.length) {
      popupGrid.innerHTML = '<p class="hero-popup__empty">Hero tidak ditemukan</p>';
      return;
    }

    popupGrid.innerHTML = filtered.map( function (h) {
      const selected = State.selectedHero && State.selectedHero.id === h.id ? ' is-selected' : '';
      return (
        '<button type="button" class="hero-card' + selected + '" ' +
        'data-hero-id="' + h.id + '" ' +
        'aria-label="Pilih ' + h.name + '">' +
        '<img src="' + h.img + '" alt="' + h.name + '" ' +
        'width="64" height="64" loading="lazy" ' +
        'onerror="this.src=\'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'64\' height=\'64\'%3E%3Crect width=\'64\' height=\'64\' rx=\'8\' fill=\'%23e2e8f0\'/%3E%3C/svg%3E\'"/>' +
        '<span class="hero-card__name">' + h.name + '</span>' +
        '</button>'
      );
    }).join('');
  }

  /* ─────────────────────────────────────────
   * 5. POSITION POPUP
   * ───────────────────────────────────────── */
  function positionPopup() {
    if (!State.triggerBtn || !popup) return;

    const btnRect = State.triggerBtn.getBoundingClientRect();
    const vpW     = window.innerWidth;
    const vpH     = window.innerHeight;
    const pW      = popup.offsetWidth  || 420;
    const pH      = popup.offsetHeight || 420;
    const margin  = 8;

    let top  = btnRect.bottom + margin + window.scrollY;
    let left = btnRect.left   + window.scrollX;

    /* Overflow right → shift left */
    if (left + pW > vpW - margin) {
      left = Math.max(margin, vpW - pW - margin);
    }

    /* Overflow bottom → open upward */
    if (btnRect.bottom + pH + margin > vpH) {
      top = btnRect.top - pH - margin + window.scrollY;
    }

    popup.style.left = left + 'px';
    popup.style.top  = top  + 'px';
  }

  /* ─────────────────────────────────────────
   * 6. OPEN / CLOSE
   * ───────────────────────────────────────── */
  function openPopup(wrapper) {
    const inputId   = wrapper.dataset.pickerInput;
    const labelId   = wrapper.dataset.pickerLabel;
    const triggerBtn = wrapper.querySelector('.open-hero-picker');

    State.targetInput  = document.getElementById(inputId);
    State.targetLabel  = document.getElementById(labelId);
    State.triggerBtn   = triggerBtn;
    State.isOpen       = true;

    /* Reset UI */
    State.activeRole   = 'all';
    State.keyword      = '';
    popupSearch.value  = '';
    Object.values(filterBtnMap).forEach( b => b.classList.remove('is-active') );
    filterBtnMap['all'].classList.add('is-active');

    /* Pre-select hero if already chosen */
    const existingVal = State.targetInput ? State.targetInput.value : '';
    State.selectedHero = HERO_DATA.find( h => h.name === existingVal ) || null;
    popupSelectBtn.disabled = !State.selectedHero;

    renderGrid();

    popup.hidden = false;
    positionPopup();
    popupSearch.focus();
  }

  function closePopup() {
    if (!popup) return;
    popup.hidden   = true;
    State.isOpen   = false;
    State.triggerBtn && State.triggerBtn.focus();
  }

  /* ─────────────────────────────────────────
   * 7. CONFIRM SELECTION
   * ───────────────────────────────────────── */
  function confirmSelection() {
    if (!State.selectedHero) return;

    /* Write to hidden input */
    if (State.targetInput) {
      State.targetInput.value = State.selectedHero.name;
    }

    /* Update preview label */
    if (State.targetLabel) {
      State.targetLabel.innerHTML =
        '<img class="preview-thumb" src="' + State.selectedHero.img + '" ' +
        'alt="' + State.selectedHero.name + '" width="28" height="28" ' +
        'onerror="this.style.display=\'none\'">' +
        '<span class="preview-name">' + State.selectedHero.name + '</span>' +
        '<span class="preview-role badge-role badge-role--' + State.selectedHero.role + '">' +
        State.selectedHero.role.charAt(0).toUpperCase() + State.selectedHero.role.slice(1) +
        '</span>';
    }

    closePopup();
  }

  /* ─────────────────────────────────────────
   * 8. KEYBOARD: ESC to close
   * ───────────────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && State.isOpen) closePopup();
  });

  /* Click outside closes popup */
  document.addEventListener('click', function (e) {
    if (State.isOpen && popup && !popup.contains(e.target)) {
      closePopup();
    }
  });

  /* Reposition on resize */
  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout( function () {
      if (State.isOpen) positionPopup();
    }, 50);
  });

  /* ─────────────────────────────────────────
   * 9. INIT — attach open-button listeners
   * ───────────────────────────────────────── */
  function init() {
    buildPopup();

    document.querySelectorAll('.hero-picker-wrapper').forEach( function (wrapper) {
      const btn = wrapper.querySelector('.open-hero-picker');
      if (!btn) return;

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const alreadyOpen = State.isOpen && State.triggerBtn === btn;
        if (alreadyOpen) {
          closePopup();
        } else {
          closePopup();
          openPopup(wrapper);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
