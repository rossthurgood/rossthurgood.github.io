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
  const savedMode = localStorage.getItem('pageMode') || 'light-blue';

  // theme order: dark -> high-contrast -> light-blue -> dark ...
  const themes = ['dark', 'high-contrast', 'light-blue'];

  const applyTheme = (mode) => {
    document.body.classList.remove('dark-mode', 'high-contrast', 'light-blue');
    if (mode === 'dark') document.body.classList.add('dark-mode');
    else if (mode === 'high-contrast') document.body.classList.add('high-contrast');
    else if (mode === 'light-blue') document.body.classList.add('light-blue');

    // update icon/text
    if (!modeBtn) return;
    if (mode === 'high-contrast') modeBtn.textContent = 'HC';
    else if (mode === 'dark') modeBtn.textContent = '☾';
    else if (mode === 'light-blue') modeBtn.textContent = '☀';
  };

  // initialize: apply saved theme if valid, otherwise default to light-blue
  if (['dark','high-contrast','light-blue'].includes(savedMode)) {
    applyTheme(savedMode);
  } else {
    applyTheme('light-blue');
  }

  if (modeBtn) {
    modeBtn.addEventListener('click', () => {
      const current = document.body.classList.contains('dark-mode') ? 'dark'
        : document.body.classList.contains('high-contrast') ? 'high-contrast'
        : document.body.classList.contains('light-blue') ? 'light-blue' : 'gold';

      // find next in order (if current not in themes, start at dark)
      let idx = themes.indexOf(current);
      if (idx === -1) idx = 0; // default to dark
      const next = themes[(idx + 1) % themes.length];

      // Smooth switch: create overlay, fade in, change theme, fade out to avoid visual flash
      const duration = 260; // ms
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.zIndex = 9999;
      overlay.style.pointerEvents = 'none';
      overlay.style.background = getComputedStyle(document.body).background || getComputedStyle(document.documentElement).background;
      overlay.style.transition = `opacity ${duration}ms ease`;
      overlay.style.opacity = '0';
      document.body.appendChild(overlay);
      // start fade-in
      requestAnimationFrame(() => { overlay.style.opacity = '1'; });
      setTimeout(() => {
        applyTheme(next);
        localStorage.setItem('pageMode', next);
        // fade-out
        requestAnimationFrame(() => { overlay.style.opacity = '0'; });
        setTimeout(() => { overlay.remove(); }, duration + 20);
      }, duration);
    });
  }
}

initPageTransitions();
initDarkMode();
