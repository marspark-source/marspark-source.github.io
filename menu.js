// Phones: the top menu is a "Menu" button that opens the pages as a vertical list.
(() => {
  const bar = document.querySelector('.topbar'), nav = bar && bar.querySelector('nav');
  if (!nav) return;
  nav.id = nav.id || 'site-menu';
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'menu-btn';
  btn.setAttribute('aria-controls', nav.id); btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span class="menu-label">Menu</span><span class="menu-icon" aria-hidden="true"><i></i><i></i><i></i></span>';
  nav.before(btn);
  const set = open => { bar.classList.toggle('menu-open', open); btn.setAttribute('aria-expanded', String(open)); btn.querySelector('.menu-label').textContent = open ? 'Close' : 'Menu'; };
  btn.addEventListener('click', () => set(!bar.classList.contains('menu-open')));
  addEventListener('keydown', e => { if (e.key === 'Escape' && bar.classList.contains('menu-open')) { set(false); btn.focus(); } });
  nav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
})();
