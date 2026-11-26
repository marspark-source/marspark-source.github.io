// Simple thin divider lines between project sections. They sit in the middle of each gap
// (measured, because the sections clip anything outside their own box).
(() => {
  const sheets = document.querySelector('.sheets'); if (!sheets) return;
  const pairs = [...sheets.children].slice(1).map(el => {
    const d = document.createElement('div'); d.className = 'divider plain'; d.setAttribute('aria-hidden', 'true');
    sheets.appendChild(d); return [d, el];
  });
  const place = () => {
    const gap = parseFloat(getComputedStyle(sheets).rowGap) || 0;
    pairs.forEach(([d, el]) => { d.style.top = (el.offsetTop - gap / 2) + 'px'; });
  };
  place(); addEventListener('resize', place); addEventListener('load', place);
})();
