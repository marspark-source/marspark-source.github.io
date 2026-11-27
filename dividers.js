// Simple thin divider lines between project sections. Each sits 16px under the last visible thing in the
// section above it (captions that hang below a section count too), so it never floats far below the content.
(() => {
  const sheets = document.querySelector('.sheets'); if (!sheets) return;
  const isPart = el => !/^(STYLE|SCRIPT|TEMPLATE|LINK)$/.test(el.tagName) && !el.classList.contains('divider');
  const parts = [...sheets.children].filter(isPart);
  const pairs = parts.slice(1).map((el, i) => {
    const d = document.createElement('div'); d.className = 'divider plain'; d.setAttribute('aria-hidden', 'true');
    sheets.appendChild(d); return [d, parts[i], el];
  });
  const place = () => {
    const top0 = sheets.getBoundingClientRect().top;
    pairs.forEach(([d, prev, el]) => {
      let low = prev.getBoundingClientRect().bottom;
      prev.querySelectorAll('*').forEach(e => { const r = e.getBoundingClientRect(); if (r.height && r.width && getComputedStyle(e).visibility !== 'hidden') low = Math.max(low, r.bottom); });
      const y = Math.min(low - top0 + 16, el.offsetTop - 12);   // never into the next section
      Object.assign(d.style, { top: y + 'px', left: el.offsetLeft + 'px', width: el.offsetWidth + 'px', right: 'auto' });
    });
  };
  place(); addEventListener('resize', place); addEventListener('load', place);
  if (document.fonts) document.fonts.ready.then(place);
  setTimeout(place, 600);
})();
