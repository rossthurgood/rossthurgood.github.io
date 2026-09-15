function toggleNav() {
  const menu = document.getElementById('navBox');
  const menuBtn = document.querySelector('.menuBtn'); 
  if (!menu) return;
  
  const isHidden = menu.style.display === 'none' || !menu.style.display;
  menu.style.display = isHidden ? 'flex' : 'none';
  
  if (menuBtn) {
    menuBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
  }
}

window.addEventListener('resize', function () {
  const menu = document.getElementById('navBox');
  const menuBtn = document.querySelector('.menuBtn');
  if (menu && window.innerWidth > 900) {
    menu.style.display = '';
    if (menuBtn) menuBtn.removeAttribute('aria-expanded');
  }
});

function initPageTransitions() {
  document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      const target = this.getAttribute('target');
      
      if (href && !href.startsWith('#') && target !== '_blank' && !href.startsWith('http')) {
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

  const themes = ['dark', 'high-contrast', 'light-blue'];

  const applyTheme = (mode) => {
    document.body.classList.remove('dark-mode', 'high-contrast', 'light-blue');
    if (mode === 'dark') document.body.classList.add('dark-mode');
    else if (mode === 'high-contrast') document.body.classList.add('high-contrast');
    else if (mode === 'light-blue') document.body.classList.add('light-blue');

    if (!modeBtn) return;
    if (mode === 'high-contrast') modeBtn.textContent = 'HC';
    else if (mode === 'dark') modeBtn.textContent = '☾';
    else if (mode === 'light-blue') modeBtn.textContent = '☀';
  };

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

      let idx = themes.indexOf(current);
      if (idx === -1) idx = 0;
      const next = themes[(idx + 1) % themes.length];

      const duration = 260;
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.zIndex = 9999;
      overlay.style.pointerEvents = 'none';
      overlay.style.background = getComputedStyle(document.body).background || getComputedStyle(document.documentElement).background;
      overlay.style.transition = `opacity ${duration}ms ease`;
      overlay.style.opacity = '0';
      document.body.appendChild(overlay);
      requestAnimationFrame(() => { overlay.style.opacity = '1'; });
      setTimeout(() => {
        applyTheme(next);
        localStorage.setItem('pageMode', next);
        requestAnimationFrame(() => { overlay.style.opacity = '0'; });
        setTimeout(() => { overlay.remove(); }, duration + 20);
      }, duration);
    });
  }
}

initPageTransitions();
initDarkMode();
