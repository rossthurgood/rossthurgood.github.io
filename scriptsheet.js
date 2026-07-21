function toggleNav() {
  const menu = document.getElementById('navBox');
  if (!menu) return;
  const isHidden = menu.style.display === 'none' || !menu.style.display;
  menu.style.display = isHidden ? 'flex' : 'none';
}

window.addEventListener('resize', function () {
  const menu = document.getElementById('navBox');
  if (menu && window.innerWidth > 900) {
    menu.style.display = '';
  }
});

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
