/**
 * hero-picker.js
 * ==============
 * Komponen Hero Picker Popup untuk halaman addgame / editgame.
 *
 * Usage HTML:
 *   <div class="hero-picker-wrapper"
 *        data-picker-input="hero_team_a_1"
 *        data-picker-label="preview-team-a-1">
 *     <button type="button" class="open-hero-picker">
 *       <svg>...</svg> Pilih Hero
 *     </button>
 *     <span class="hero-picker-preview" id="preview-team-a-1">
 *       <span class="preview-empty">Belum dipilih</span>
 *     </span>
 *   </div>
 *   <input type="hidden" id="hero_team_a_1" name="hero_team_a_1">
 *
 * Cara kerja:
 *   - Klik tombol => popup muncul di posisi optimal (bawah/atas tombol)
 *   - Search real-time menyaring nama hero
 *   - Filter role (All/Tank/Fighter/Assassin/Marksman/Mage/Support)
 *   - Klik hero card => highlight, tombol Select aktif
 *   - Klik Select => isi hidden input + preview, tutup popup
 *   - Klik luar popup / tombol close => tutup popup
 *   - Resize window => posisi popup dihitung ulang
 *
 * Data hero disimpan di HERO_DATA (array of objects).
 * Tambah / edit array ini sesuai roster Mobile Legends.
 */

/* ============================================================
   HERO DATA
   Struktur: { id, name, role, image }
   image: path relatif dari root project, mis. 'assets/heroes/akai.jpg'
   Jika file gambar belum ada, komponen tetap berjalan (fallback inisial).
   ============================================================ */
const HERO_DATA = [
  /* =========================
 * FIGHTER
 * ========================= */
  { id: 1, name: 'Akai', role: 'tank', image: 'assets/heroes/akai.png' },
  { id: 2, name: 'Atlas', role: 'tank', image: 'assets/heroes/atlas.png' },
  { id: 3, name: 'Belerick', role: 'tank', image: 'assets/heroes/belerick.png' },
  { id: 4, name: 'Baxia', role: 'tank', image: 'assets/heroes/baxia.png' },
  { id: 5, name: 'Edith', role: 'tank', image: 'assets/heroes/edith.png' },
  { id: 6, name: 'Franco', role: 'tank', image: 'assets/heroes/franco.png' },
  { id: 7, name: 'Gloo', role: 'tank', image: 'assets/heroes/gloo.png' },
  { id: 8, name: 'Hylos', role: 'tank', image: 'assets/heroes/hylos.png' },
  { id: 9, name: 'Johnson', role: 'tank', image: 'assets/heroes/johnson.png' },
  { id: 10, name: 'Khufra', role: 'tank', image: 'assets/heroes/khufra.png' },
  { id: 11, name: 'Minotaur', role: 'tank', image: 'assets/heroes/minotaur.png' },
  { id: 12, name: 'Tigreal', role: 'tank', image: 'assets/heroes/tigreal.png' },
  { id: 13, name: 'Gatotkaca', role: 'tank', image: 'assets/heroes/gatotkaca.png' },
  { id: 14, name: 'Grock', role: 'tank', image: 'assets/heroes/grock.png' },
  { id: 15, name: 'Lolita', role: 'tank', image: 'assets/heroes/lolita.png' },
  { id: 16, name: 'Uranus', role: 'tank', image: 'assets/heroes/uranus.png' },
  { id: 17, name: 'Barats', role: 'tank', image: 'assets/heroes/barats.png' },
  { id: 18, name: 'Alice', role: 'tank', image: 'assets/heroes/alice.png' },
  { id: 19, name: 'Hilda', role: 'tank', image: 'assets/heroes/hilda.png' },
  { id: 20, name: 'Esmeralda', role: 'tank', image: 'assets/heroes/esmeralda.png' },
  /* =========================
  * FIGHTER
  * ========================= */
  { id: 21, name: 'Aldous', role: 'fighter', image: 'assets/heroes/aldous.png' },
  { id: 22, name: 'Alpha', role: 'fighter', image: 'assets/heroes/alpha.png' },
  { id: 23, name: 'Alucard', role: 'fighter', image: 'assets/heroes/alucard.png' },
  { id: 24, name: 'Argus', role: 'fighter', image: 'assets/heroes/argus.png' },
  { id: 25, name: 'Arlott', role: 'fighter', image: 'assets/heroes/arlott.png' },
  { id: 26, name: 'Aulus', role: 'fighter', image: 'assets/heroes/aulus.png' },
  { id: 27, name: 'Badang', role: 'fighter', image: 'assets/heroes/badang.png' },
  { id: 28, name: 'Balmond', role: 'fighter', image: 'assets/heroes/balmond.png' },
  { id: 29, name: 'Bane', role: 'fighter', image: 'assets/heroes/bane.png' },
  { id: 30, name: 'Chou', role: 'fighter', image: 'assets/heroes/chou.png' },
  { id: 31, name: 'Cici', role: 'fighter', image: 'assets/heroes/cici.png' },
  { id: 32, name: 'Dyrroth', role: 'fighter', image: 'assets/heroes/dyrroth.png' },
  { id: 33, name: 'Fredrinn', role: 'fighter', image: 'assets/heroes/fredrinn.png' },
  { id: 34, name: 'Freya', role: 'fighter', image: 'assets/heroes/freya.png' },
  { id: 35, name: 'Guinevere', role: 'fighter', image: 'assets/heroes/guinevere.png' },
  { id: 36, name: 'Jawhead', role: 'fighter', image: 'assets/heroes/jawhead.png' },
  { id: 37, name: 'Julian', role: 'fighter', image: 'assets/heroes/julian.png' },
  { id: 38, name: 'Kalea', role: 'fighter', image: 'assets/heroes/kalea.png' },
  { id: 39, name: 'Khaleed', role: 'fighter', image: 'assets/heroes/khaleed.png' },
  { id: 40, name: 'Lapu-Lapu', role: 'fighter', image: 'assets/heroes/lapu-lapu.png' },
  { id: 41, name: 'Leomord', role: 'fighter', image: 'assets/heroes/leomord.png' },
  { id: 42, name: 'Lukas', role: 'fighter', image: 'assets/heroes/lukas.png' },
  { id: 43, name: 'Martis', role: 'fighter', image: 'assets/heroes/martis.png' },
  { id: 44, name: 'Masha', role: 'fighter', image: 'assets/heroes/masha.png' },
  { id: 45, name: 'Minsitthar', role: 'fighter', image: 'assets/heroes/minsitthar.png' },
  { id: 46, name: 'Paquito', role: 'fighter', image: 'assets/heroes/paquito.png' },
  { id: 47, name: 'Phoveus', role: 'fighter', image: 'assets/heroes/phoveus.png' },
  { id: 48, name: 'Roger', role: 'fighter', image: 'assets/heroes/roger.png' },
  { id: 49, name: 'Ruby', role: 'fighter', image: 'assets/heroes/ruby.png' },
  { id: 50, name: 'Silvanna', role: 'fighter', image: 'assets/heroes/silvanna.png' },
  { id: 51, name: 'Sora', role: 'fighter', image: 'assets/heroes/sora.png' },
  { id: 52, name: 'Sun', role: 'fighter', image: 'assets/heroes/sun.png' },
  { id: 53, name: 'Terizla', role: 'fighter', image: 'assets/heroes/terizla.png' },
  { id: 54, name: 'Thamuz', role: 'fighter', image: 'assets/heroes/thamuz.png' },
  { id: 55, name: 'X.Borg', role: 'fighter', image: 'assets/heroes/xborg.png' },
  { id: 56, name: 'Yu Zhong', role: 'fighter', image: 'assets/heroes/yuzhong.png' },
  { id: 57, name: 'Zilong', role: 'fighter', image: 'assets/heroes/zilong.png' },
  /* =========================
  * ASSASSIN
  * ========================= */
  { id: 58, name: 'Aamon', role: 'assassin', image: 'assets/heroes/aamon.png' },
  { id: 59, name: 'Benedetta', role: 'assassin', image: 'assets/heroes/benedetta.png' },
  { id: 60, name: 'Fanny', role: 'assassin', image: 'assets/heroes/fanny.png' },
  { id: 61, name: 'Gusion', role: 'assassin', image: 'assets/heroes/gusion.png' },
  { id: 62, name: 'Hanzo', role: 'assassin', image: 'assets/heroes/hanzo.png' },
  { id: 63, name: 'Harley', role: 'assassin', image: 'assets/heroes/harley.png' },
  { id: 64, name: 'Hayabusa', role: 'assassin', image: 'assets/heroes/hayabusa.png' },
  { id: 65, name: 'Helcurt', role: 'assassin', image: 'assets/heroes/helcurt.png' },
  { id: 66, name: 'Hirara', role: 'assassin', image: 'assets/heroes/hirara.png' },
  { id: 67, name: 'Joy', role: 'assassin', image: 'assets/heroes/joy.png' },
  { id: 68, name: 'Kadita', role: 'assassin', image: 'assets/heroes/kadita.png' },
  { id: 69, name: 'Karina', role: 'assassin', image: 'assets/heroes/karina.png' },
  { id: 70, name: 'Lancelot', role: 'assassin', image: 'assets/heroes/lancelot.png' },
  { id: 71, name: 'Ling', role: 'assassin', image: 'assets/heroes/ling.png' },
  { id: 72, name: 'Natalia', role: 'assassin', image: 'assets/heroes/natalia.png' },
  { id: 73, name: 'Nolan', role: 'assassin', image: 'assets/heroes/nolan.png' },
  { id: 74, name: 'Saber', role: 'assassin', image: 'assets/heroes/saber.png' },
  { id: 75, name: 'Selena', role: 'assassin', image: 'assets/heroes/selena.png' },
  { id: 76, name: 'Suyou', role: 'assassin', image: 'assets/heroes/suyou.png' },
  { id: 77, name: 'Yi Sun-shin', role: 'assassin', image: 'assets/heroes/yi_sun-shin.png' },
  { id: 78, name: 'Yin', role: 'fighter', image: 'assets/heroes/yin.png' },
  /* =========================
  * MARKSMAN
  * ========================= */
  { id: 79, name: 'Beatrix', role: 'marksman', image: 'assets/heroes/beatrix.png' },
  { id: 80, name: 'Brody', role: 'marksman', image: 'assets/heroes/brody.png' },
  { id: 81, name: 'Bruno', role: 'marksman', image: 'assets/heroes/bruno.png' },
  { id: 82, name: 'Claude', role: 'marksman', image: 'assets/heroes/claude.png' },
  { id: 83, name: 'Clint', role: 'marksman', image: 'assets/heroes/clint.png' },
  { id: 84, name: 'Granger', role: 'marksman', image: 'assets/heroes/granger.png' },
  { id: 85, name: 'Hanabi', role: 'marksman', image: 'assets/heroes/hanabi.png' },
  { id: 86, name: 'Irithel', role: 'marksman', image: 'assets/heroes/irithel.png' },
  { id: 87, name: 'Ixia', role: 'marksman', image: 'assets/heroes/ixia.png' },
  { id: 88, name: 'Karrie', role: 'marksman', image: 'assets/heroes/karrie.png' },
  { id: 89, name: 'Kimmy', role: 'marksman', image: 'assets/heroes/kimmy.png' },
  { id: 90, name: 'Layla', role: 'marksman', image: 'assets/heroes/layla.png' },
  { id: 91, name: 'Lesley', role: 'marksman', image: 'assets/heroes/lesley.png' },
  { id: 92, name: 'Melissa', role: 'marksman', image: 'assets/heroes/melissa.png' },
  { id: 93, name: 'Miya', role: 'marksman', image: 'assets/heroes/miya.png' },
  { id: 94, name: 'Moskov', role: 'marksman', image: 'assets/heroes/moskov.png' },
  { id: 95, name: 'Natan', role: 'marksman', image: 'assets/heroes/natan.png' },
  { id: 96, name: 'Obsidia', role: 'marksman', image: 'assets/heroes/obsidia.png' },
  { id: 97, name: 'Popol and Kupa', role: 'marksman', image: 'assets/heroes/popol_and_kupa.png' },
  { id: 98, name: 'Wanwan', role: 'marksman', image: 'assets/heroes/wanwan.png' },
  /* =========================
  * MAGE
  * ========================= */
  { id: 99, name: 'Aurora', role: 'mage', image: 'assets/heroes/aurora.png' },
  { id: 100, name: 'Cecilion', role: 'mage', image: 'assets/heroes/cecilion.png' },
  { id: 101, name: "Chang'e", role: 'mage', image: "assets/heroes/chang'e.png" },
  { id: 102, name: 'Cyclops', role: 'mage', image: 'assets/heroes/cyclops.png' },
  { id: 103, name: 'Eudora', role: 'mage', image: 'assets/heroes/eudora.png' },
  { id: 104, name: 'Faramis', role: 'mage', image: 'assets/heroes/faramis.png' },
  { id: 105, name: 'Gord', role: 'mage', image: 'assets/heroes/gord.png' },
  { id: 106, name: 'Harith', role: 'mage', image: 'assets/heroes/harith.png' },
  { id: 107, name: 'Kagura', role: 'mage', image: 'assets/heroes/kagura.png' },
  { id: 108, name: 'Lunox', role: 'mage', image: 'assets/heroes/lunox.png' },
  { id: 109, name: 'Luo Yi', role: 'mage', image: 'assets/heroes/luo-yi.png' },
  { id: 110, name: 'Lylia', role: 'mage', image: 'assets/heroes/lylia.png' },
  { id: 111, name: 'Nana', role: 'mage', image: 'assets/heroes/nana.png' },
  { id: 112, name: 'Novaria', role: 'mage', image: 'assets/heroes/novaria.png' },
  { id: 113, name: 'Odette', role: 'mage', image: 'assets/heroes/odette.png' },
  { id: 114, name: 'Parsha', role: 'mage', image: 'assets/heroes/pharsa.png' },
  { id: 115, name: 'Vale', role: 'mage', image: 'assets/heroes/vale.png' },
  { id: 116, name: 'Valentina', role: 'mage', image: 'assets/heroes/valentina.png' },
  { id: 117, name: 'Valir', role: 'mage', image: 'assets/heroes/valir.png' },
  { id: 118, name: 'Vexana', role: 'mage', image: 'assets/heroes/vexana.png' },
  { id: 119, name: 'Xavier', role: 'mage', image: 'assets/heroes/xavier.png' },
  { id: 120, name: 'Yve', role: 'mage', image: 'assets/heroes/yve.png' },
  { id: 121, name: 'Zhask', role: 'mage', image: 'assets/heroes/zhask.png' },
  { id: 122, name: 'Zetian', role: 'mage', image: 'assets/heroes/zetian.png' },
  { id: 123, name: 'Zhuxin', role: 'mage', image: 'assets/heroes/zhuxin.png' },
  /* =========================
  * SUPPORT
  * ========================= */
  { id: 124, name: 'Angela', role: 'support', image: 'assets/heroes/angela.png' },
  { id: 125, name: 'Carmilla', role: 'support', image: 'assets/heroes/carmilla.png' },
  { id: 126, name: 'Chip', role: 'support', image: 'assets/heroes/chip.png' },
  { id: 127, name: 'Diggie', role: 'support', image: 'assets/heroes/diggie.png' },
  { id: 128, name: 'Estes', role: 'support', image: 'assets/heroes/estes.png' },
  { id: 129, name: 'Floryn', role: 'support', image: 'assets/heroes/floryn.png' },
  { id: 130, name: 'Kaja', role: 'support', image: 'assets/heroes/kaja.png' },
  { id: 131, name: 'Marcel', role: 'support', image: 'assets/heroes/marcel.png' },
  { id: 132, name: 'Mathilda', role: 'support', image: 'assets/heroes/mathilda.png' },
  { id: 133, name: 'Rafaela', role: 'support', image: 'assets/heroes/rafaela.png' },
];

/* ============================================================
   HERO PICKER CLASS
   Satu instance per tombol "Pilih Hero" di halaman.
   ============================================================ */
class HeroPicker {
  /**
   * @param {HTMLElement} triggerBtn   - tombol .open-hero-picker
   * @param {HTMLInputElement} inputEl  - hidden input target
   * @param {HTMLElement|null} previewEl - elemen preview nama hero (opsional)
   */
  constructor(triggerBtn, inputEl, previewEl = null) {
    this.triggerBtn  = triggerBtn;
    this.inputEl     = inputEl;
    this.previewEl   = previewEl;

    this.state = {
      isOpen:       false,
      activeRole:   'all',
      keyword:      '',
      selectedHero: null,
    };

    this._popup    = null;
    this._backdrop = null;
    this._onResize = this._onResize.bind(this);

    this._buildPopup();
    this._attachTrigger();
  }

  /* ----------------------------------------------------------
     BUILD DOM popup
  ---------------------------------------------------------- */
  _buildPopup() {
    this._backdrop = document.createElement('div');
    this._backdrop.className = 'hero-popup-backdrop';
    this._backdrop.setAttribute('aria-hidden', 'true');
    this._backdrop.addEventListener('click', () => this.close());

    const popup = document.createElement('div');
    popup.className = 'hero-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-label', 'Pilih Hero');
    popup.setAttribute('hidden', '');

    /* ---- Header ---- */
    const header = document.createElement('div');
    header.className = 'hero-popup__header';

    const searchWrap = document.createElement('div');
    searchWrap.className = 'hero-popup__search-wrap';
    searchWrap.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>`;
    const searchInput = document.createElement('input');
    searchInput.type         = 'text';
    searchInput.className    = 'hero-popup__search';
    searchInput.placeholder  = 'Cari nama hero...';
    searchInput.autocomplete = 'off';
    searchInput.setAttribute('aria-label', 'Cari nama hero');
    searchWrap.appendChild(searchInput);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'hero-popup__close';
    closeBtn.setAttribute('aria-label', 'Tutup popup');
    closeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>`;
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(searchWrap);
    header.appendChild(closeBtn);

    /* ---- Filter row ---- */
    const filterRow = document.createElement('div');
    filterRow.className = 'hero-popup__filters';

    const ROLES = [
      { key: 'all',      label: 'All' },
      { key: 'tank',     label: 'Tank' },
      { key: 'fighter',  label: 'Fighter' },
      { key: 'assassin', label: 'Assassin' },
      { key: 'marksman', label: 'Marksman' },
      { key: 'mage',     label: 'Mage' },
      { key: 'support',  label: 'Support' },
    ];

    ROLES.forEach(({ key, label }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hero-filter' + (key === 'all' ? ' is-active' : '');
      btn.dataset.role = key;
      btn.setAttribute('aria-pressed', key === 'all' ? 'true' : 'false');

      if (key !== 'all') {
        const dot = document.createElement('span');
        dot.className = 'role-dot';
        dot.setAttribute('aria-hidden', 'true');
        btn.appendChild(dot);
      }
      btn.appendChild(document.createTextNode(label));

      btn.addEventListener('click', () => {
        this.state.activeRole = key;
        filterRow.querySelectorAll('.hero-filter').forEach(b => {
          b.classList.toggle('is-active', b === btn);
          b.setAttribute('aria-pressed', String(b === btn));
        });
        this._renderGrid();
      });

      filterRow.appendChild(btn);
    });

    /* ---- Grid ---- */
    const grid = document.createElement('div');
    grid.className = 'hero-popup__grid';

    /* ---- Footer ---- */
    const footer = document.createElement('div');
    footer.className = 'hero-popup__footer';

    const selectedLabel = document.createElement('span');
    selectedLabel.className = 'hero-popup__selected-label';
    selectedLabel.textContent = 'Belum dipilih';

    const selectBtn = document.createElement('button');
    selectBtn.type = 'button';
    selectBtn.className = 'hero-popup__select';
    selectBtn.disabled  = true;
    selectBtn.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Select`;
    selectBtn.addEventListener('click', () => this._confirmSelection());

    footer.appendChild(selectedLabel);
    footer.appendChild(selectBtn);

    /* Assemble */
    popup.appendChild(header);
    popup.appendChild(filterRow);
    popup.appendChild(grid);
    popup.appendChild(footer);

    this._popup         = popup;
    this._grid          = grid;
    this._searchInput   = searchInput;
    this._selectedLabel = selectedLabel;
    this._selectBtn     = selectBtn;

    searchInput.addEventListener('input', () => {
      this.state.keyword = searchInput.value.trim();
      this._renderGrid();
    });

    popup.addEventListener('click', e => e.stopPropagation());
    popup.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.close();
    });
  }

  /* ----------------------------------------------------------
     TRIGGER
  ---------------------------------------------------------- */
  _attachTrigger() {
    this.triggerBtn.addEventListener('click', e => {
      e.stopPropagation();
      this.state.isOpen ? this.close() : this.open();
    });
  }

  /* ----------------------------------------------------------
     OPEN
  ---------------------------------------------------------- */
  open() {
    this.state.isOpen   = true;
    this.state.keyword  = '';
    this._searchInput.value = '';

    document.body.appendChild(this._backdrop);
    document.body.appendChild(this._popup);
    this._popup.removeAttribute('hidden');

    this._renderGrid();
    this._position();

    requestAnimationFrame(() => this._searchInput.focus());

    window.addEventListener('resize', this._onResize);
    window.addEventListener('scroll', this._onResize, { passive: true });
  }

  /* ----------------------------------------------------------
     CLOSE — dengan animasi fade/scale
  ---------------------------------------------------------- */
  close() {
    if (!this.state.isOpen) return;
    this._popup.classList.add('is-closing');
    this.state.isOpen = false;

    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('scroll', this._onResize);

    const cleanup = () => {
      this._popup.classList.remove('is-closing');
      this._popup.setAttribute('hidden', '');
      if (this._popup.parentNode)    this._popup.parentNode.removeChild(this._popup);
      if (this._backdrop.parentNode) this._backdrop.parentNode.removeChild(this._backdrop);
    };

    this._popup.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, 300);
  }

  /* ----------------------------------------------------------
     POSITION — bawah atau atas tombol
  ---------------------------------------------------------- */
  _position() {
    const popup  = this._popup;
    const btn    = this.triggerBtn;
    const margin = 8;

    const btnRect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pw = popup.offsetWidth  || 440;
    const ph = popup.offsetHeight || 420;

    let top, left;

    if (btnRect.bottom + ph + margin <= vh) {
      top  = btnRect.bottom + margin + window.scrollY;
      left = Math.min(
        Math.max(btnRect.left + window.scrollX, margin),
        vw - pw - margin + window.scrollX
      );
    } else if (btnRect.top - ph - margin >= 0) {
      top  = btnRect.top - ph - margin + window.scrollY;
      left = Math.min(
        Math.max(btnRect.left + window.scrollX, margin),
        vw - pw - margin + window.scrollX
      );
    } else {
      top  = Math.max((vh - ph) / 2 + window.scrollY, margin);
      left = Math.max((vw - pw) / 2 + window.scrollX, margin);
    }

    popup.style.top  = top  + 'px';
    popup.style.left = left + 'px';
  }

  _onResize() {
    if (this.state.isOpen) this._position();
  }

  /* ----------------------------------------------------------
     RENDER GRID
  ---------------------------------------------------------- */
  _renderGrid() {
    const { activeRole, keyword, selectedHero } = this.state;

    const filtered = HERO_DATA.filter(hero => {
      const matchRole    = activeRole === 'all' || hero.role === activeRole;
      const matchKeyword = hero.name.toLowerCase().includes(keyword.toLowerCase());
      return matchRole && matchKeyword;
    });

    if (!filtered.length) {
      this._grid.innerHTML = `
        <div class="hero-grid-empty">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span>Hero "<strong>${this._escHtml(keyword)}</strong>" tidak ditemukan</span>
        </div>`;
      return;
    }

    this._grid.innerHTML = '';
    filtered.forEach(hero => {
      const card = document.createElement('button');
      card.type      = 'button';
      card.className = 'hero-card' + (selectedHero?.id === hero.id ? ' is-selected' : '');
      card.dataset.id = hero.id;
      card.setAttribute('aria-label', hero.name);
      card.setAttribute('aria-pressed', String(selectedHero?.id === hero.id));

      const img = document.createElement('img');
      img.className = 'hero-card__img';
      img.alt       = hero.name;
      img.loading   = 'lazy';
      img.src       = hero.image;
      img.onerror   = function () {
        this.style.display = 'none';
        const ph = document.createElement('div');
        ph.className = 'hero-card__img';
        ph.style.cssText = 'display:flex;align-items:center;justify-content:center;' +
          'background:var(--color-surface-offset);font-size:11px;font-weight:700;' +
          'color:var(--color-text-faint)';
        ph.textContent = hero.name.charAt(0).toUpperCase();
        card.insertBefore(ph, card.firstChild);
      };

      const nameEl = document.createElement('div');
      nameEl.className   = 'hero-card__name';
      nameEl.textContent = hero.name;

      card.appendChild(img);
      card.appendChild(nameEl);

      card.addEventListener('click', () => {
        this.state.selectedHero = hero;
        this._selectBtn.disabled = false;
        this._selectedLabel.innerHTML =
          `Dipilih: <strong>${this._escHtml(hero.name)}</strong>`;
        this._renderGrid();
      });

      this._grid.appendChild(card);
    });
  }

  /* ----------------------------------------------------------
     CONFIRM SELECTION
  ---------------------------------------------------------- */
  _confirmSelection() {
    const hero = this.state.selectedHero;
    if (!hero) return;

    this.inputEl.value = hero.name;
    this.inputEl.dispatchEvent(new Event('change', { bubbles: true }));

    if (this.previewEl) {
      this.previewEl.innerHTML = `
        <img src="${hero.image}" alt="${this._escHtml(hero.name)}"
             loading="lazy" onerror="this.style.display='none'">
        ${this._escHtml(hero.name)}`;
    }

    this.close();
  }

  /* ----------------------------------------------------------
     HELPER: escape HTML
  ---------------------------------------------------------- */
  _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

/* ============================================================
   AUTO-INIT — semua .hero-picker-wrapper di halaman
   ============================================================ */
function initHeroPickers() {
  document.querySelectorAll('.hero-picker-wrapper').forEach(wrapper => {
    const triggerBtn = wrapper.querySelector('.open-hero-picker');
    if (!triggerBtn) return;

    const inputId   = wrapper.dataset.pickerInput;
    const labelId   = wrapper.dataset.pickerLabel;
    const inputEl   = inputId ? document.getElementById(inputId)  : null;
    const previewEl = labelId ? document.getElementById(labelId)  : null;

    if (!inputEl) {
      console.warn('[HeroPicker] Input tidak ditemukan untuk wrapper:', wrapper);
      return;
    }

    new HeroPicker(triggerBtn, inputEl, previewEl);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeroPickers);
} else {
  initHeroPickers();
}
