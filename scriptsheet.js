/* Shared site-wide behaviour for every page.
   Consolidates the navigation toggle, responsive reset, page-transition
   fade and dark-mode handling that previously lived inline on each page. */

// Toggle the collapsible navigation on small screens.
// Exposed globally because the menu button uses an inline onclick handler.
function toggleNav() {
  const menu = document.getElementById('navBox');
  if (!menu) return;
  const isHidden = menu.style.display === 'none' || !menu.style.display;
  menu.style.display = isHidden ? 'flex' : 'none';
}

// Reset the inline display style once the viewport is wide enough so the
// nav is controlled by CSS again instead of the toggle state.
window.addEventListener('resize', function () {
  const menu = document.getElementById('navBox');
  if (menu && window.innerWidth > 900) {
    menu.style.display = '';
  }
});

// Fade the page out before following in-page navigation links.
function initPageTransitions() {
  document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href && !href.startsWith('#')) {
        e.preventDefault();
        document.body.classList.add('fade-out');
        setTimeout(() => {
          window.location.href = href;
        }, 300);
      }
    });
  });
}

// Apply the saved colour-scheme preference and wire up the toggle button.
function initDarkMode() {
  const modeBtn = document.getElementById('modeBtn');
  const savedMode = localStorage.getItem('pageMode');

  const updateModeIcon = () => {
    if (!modeBtn) return;
    modeBtn.textContent = document.body.classList.contains('dark-mode') ? '☀' : '☾';
  };

  if (savedMode === 'dark') {
    document.body.classList.add('dark-mode');
  } else if (savedMode === 'light') {
    document.body.classList.remove('dark-mode');
  }
  updateModeIcon();

  if (modeBtn) {
    modeBtn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-mode');
      localStorage.setItem('pageMode', isDark ? 'dark' : 'light');
      updateModeIcon();
    });
  }
}

initPageTransitions();
initDarkMode();
