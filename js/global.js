// js/global.js
(function () {
  const documentElement = document.documentElement;

  const themeToggleButton = document.getElementById('themeToggle');
  const sidebarElement = document.getElementById('sidebar');
  const sidebarOverlayElement = document.getElementById('sidebarOverlay');
  const menuToggleButton = document.getElementById('menuToggle');

  const THEME_ATTRIBUTE = 'data-theme';
  const DARK_THEME = 'dark';
  const LIGHT_THEME = 'light';

  const TOAST_DURATION_MS = 3500;

  function detectPreferredTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? DARK_THEME : LIGHT_THEME;
  }

  function setTheme(theme) {
    documentElement.setAttribute(THEME_ATTRIBUTE, theme);
    updateThemeToggleIcon(theme);
  }

  function getCurrentTheme() {
    return documentElement.getAttribute(THEME_ATTRIBUTE) || detectPreferredTheme();
  }

  function updateThemeToggleIcon(theme) {
    if (!themeToggleButton) return;

    const sunIcon =
      '<svg viewBox="0 0 24 24">' +
      '<circle cx="12" cy="12" r="5"/>' +
      '<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>' +
      '</svg>';

    const moonIcon =
      '<svg viewBox="0 0 24 24">' +
      '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>' +
      '</svg>';

    themeToggleButton.innerHTML = theme === DARK_THEME ? sunIcon : moonIcon;
  }

  function toggleTheme() {
    const currentTheme = getCurrentTheme();
    const nextTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
    setTheme(nextTheme);
  }

  function initTheme() {
    const initialTheme = getCurrentTheme();
    setTheme(initialTheme);

    if (themeToggleButton) {
      themeToggleButton.addEventListener('click', toggleTheme);
    }
  }

  function initSidebar() {
    if (!sidebarElement || !sidebarOverlayElement || !menuToggleButton) return;

    menuToggleButton.addEventListener('click', () => {
      sidebarElement.classList.toggle('open');
      sidebarOverlayElement.classList.toggle('show');
    });

    sidebarOverlayElement.addEventListener('click', () => {
      sidebarElement.classList.remove('open');
      sidebarOverlayElement.classList.remove('show');
    });
  }

  function markActiveNavigationItem() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navItems = document.querySelectorAll('.nav-item[data-page]');

    navItems.forEach((item) => {
      if (item.dataset.page === currentPath) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  function showToast(message, type) {
    const toastType = type || 'success';
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toastElement = document.createElement('div');
    toastElement.className = `toast ${toastType}`;

    const successIcon =
      '<svg viewBox="0 0 24 24">' +
      '<polyline points="20 6 9 17 4 12"/>' +
      '</svg>';

    const errorIcon =
      '<svg viewBox="0 0 24 24">' +
      '<line x1="18" y1="6" x2="6" y2="18"/>' +
      '<line x1="6" y1="6" x2="18" y2="18"/>' +
      '</svg>';

    const iconMarkup = toastType === 'success' ? successIcon : errorIcon;

    toastElement.innerHTML =
      '<span class="toast-icon">' +
        iconMarkup +
      '</span>' +
      `<span class="toast-msg">${message}</span>` +
      '<button class="toast-close" type="button">×</button>';

    const closeButton = toastElement.querySelector('.toast-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        toastElement.remove();
      });
    }

    container.appendChild(toastElement);

    setTimeout(() => {
      toastElement.remove();
    }, TOAST_DURATION_MS);
  }
  
  function initGlobal() {
    initTheme();
    initSidebar();
    markActiveNavigationItem();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initGlobal();
  });

  window.TourneyPro = window.TourneyPro || {};
  window.TourneyPro.showToast = showToast;
  window.TourneyPro.getCurrentTheme = getCurrentTheme;
  window.TourneyPro.setTheme = setTheme;
})();