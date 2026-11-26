// Phone layout for project pages: every slide-like section (.sheet) is cut into pieces that are
// shown one under the other, never through a picture or a heading:
//   1. the section is split into bands where there is a clear empty gap from left to right;
//   2. inside a band, it is cut only down the empty gaps between things (so a heading stays with
//      the pictures under it, and a caption with its picture);
//   3. narrow neighbours are put back together up to about half a slide wide, so small pictures
//      come three in a row;
//   4. something wider than that which cannot be cut (one big diagram) is shown half a screen at
//      a time: swipe sideways to see the rest.
(() => {
  if (!matchMedia('(max-width: 760px)').matches) return;
  const MAXW = 620;      // widest piece shown at full phone width (about half a 1296 slide)
  const BAND_GAP = 40;   // an empty strip this tall (Figma px) starts a new band
  const PAD = 12;

  const isBack = el => el.classList.contains('panel') || el.classList.contains('rule') || el.classList.contains('mh-frame')
    || el.classList.contains('sh-mood');
  function box(el, o) {
    let r = el.getBoundingClientRect();
    // plain text: measure the words themselves, not the (often much wider) text box
    if (!el.querySelector('svg,img,video') && el.textContent.trim() && !/^(IMG|VIDEO|svg)$/i.test(el.tagName)) {
      const cs = getComputedStyle(el);
      const filled = (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') || parseFloat(cs.borderTopWidth) > 0;
      if (!filled) { const rg = document.createRange(); rg.selectNodeContents(el); const t = rg.getBoundingClientRect(); if (t.width && t.height) r = t; }
    }
    return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
  }
  const spans = (list, a, b) => {           // merge overlapping [a,b] ranges
    const s = list.map(i => [i[a], i[b]]).sort((p, q) => p[0] - q[0]), out = [];
    s.forEach(r => { const l = out[out.length - 1]; if (l && r[0] <= l[1] + 4) l[1] = Math.max(l[1], r[1]); else out.push([...r]); });
    return out;
  };

  document.querySelectorAll('.sheet').forEach(sheet => {
    const inner = sheet.querySelector('.sheet-in'); if (!inner) return;
    inner.style.cssText += ';position:absolute;left:0;top:0;width:1296px;height:864px;transform:none;zoom:1;margin:0';
    const o = inner.getBoundingClientRect();
    const all = [...inner.children].map(el => ({ el, ...box(el, o) }))
      .filter(i => i.w > 0 && i.h > 0 && getComputedStyle(i.el).display !== 'none');
    const back = all.filter(i => isBack(i.el) || i.h < 3);
    // the section title goes first, on its own; everything else is cut below it
    const titles = all.filter(i => i.el.classList.contains('h2') && !back.includes(i));
    const items = all.filter(i => !back.includes(i) && !titles.includes(i));
    if (!items.length) return;
    items.forEach(i => { i.x1 = i.x + i.w; i.y1 = i.y + i.h; });

    // 1) bands: split top-to-bottom where nothing crosses a tall enough empty strip
    const bands = [];
    spans(items.map(i => ({ a: i.y, b: i.y1 })), 'a', 'b').forEach(([a, b]) => {
      const last = bands[bands.length - 1];
      if (last && a - last[1] < BAND_GAP) last[1] = b; else bands.push([a, b]);
    });

    const pieces = titles.map(t => ({ x0: t.x - PAD, y0: t.y - PAD, w: Math.min(t.w, MAXW) + PAD * 2, h: t.h + PAD * 2, title: true }));
    bands.forEach(([ya, yb]) => {
      const inBand = items.filter(i => i.y >= ya - 1 && i.y1 <= yb + 1);
      // 2) atoms: column ranges that no empty vertical gap runs through
      const atoms = spans(inBand.map(i => ({ a: i.x, b: i.x1 })), 'a', 'b');
      // 3) pack narrow neighbours together up to MAXW
      const groups = [];
      atoms.forEach(([a, b]) => {
        const g = groups[groups.length - 1];
        if (g && b - g[0] <= MAXW && g[1] - g[0] <= MAXW) g[1] = b; else groups.push([a, b]);
      });
      groups.forEach(([a, b]) => {
        const mine = inBand.filter(i => i.x + i.w / 2 >= a - 1 && i.x + i.w / 2 <= b + 1);
        const y0 = Math.min(...mine.map(i => i.y)), y1 = Math.max(...mine.map(i => i.y1));
        pieces.push({ x0: a - PAD, y0: y0 - PAD, w: b - a + PAD * 2, h: y1 - y0 + PAD * 2, wide: b - a > MAXW + 40 });
      });
    });

    // 4) build the pieces: a clipped copy of the slide for each
    const els = pieces.map((p, n) => {
      const wrap = document.createElement('div'); wrap.className = 'half' + (p.wide ? ' swipe' : '');
      const copy = inner.cloneNode(true); copy.classList.add('half-in');
      copy.querySelectorAll('img[loading]').forEach(img => { img.loading = 'eager'; });
      const suffix = '-p' + n + Math.random().toString(36).slice(2, 6);   // keep SVG ids unique per copy
      copy.querySelectorAll('[id]').forEach(el => {
        const old = el.id, neu = old + suffix; el.id = neu;
        copy.querySelectorAll('*').forEach(m => [...m.attributes].forEach(at => {
          if (at.value.includes('#' + old)) m.setAttribute(at.name, at.value.split('url(#' + old + ')').join('url(#' + neu + ')').replace(new RegExp('^#' + old + '$'), '#' + neu));
        }));
      });
      if (p.wide) {   // half a screen at a time: an inner track twice the screen wide, swiped sideways
        const track = document.createElement('div'); track.className = 'swipe-track';
        track.appendChild(copy); wrap.appendChild(track);
        ['a', 'b'].forEach(k => { const snap = document.createElement('span'); snap.className = 'snap snap-' + k; track.appendChild(snap); });   // stops: left half, right half
        const hint = document.createElement('p'); hint.className = 'swipe-hint'; hint.textContent = 'Swipe to see the rest →';
        wrap._hint = hint;
      } else wrap.appendChild(copy);
      wrap._p = p; return wrap;
    });
    const blocks = [];
    els.forEach(w => { blocks.push(w); if (w._hint) blocks.push(w._hint); });
    sheet.replaceChildren(...blocks); sheet.classList.add('split');

    const fit = () => els.forEach(wrap => {
      const p = wrap._p, W = wrap.clientWidth;
      const s = p.wide ? W / (p.w / 2) : p.title ? Math.min(W / p.w, 0.9) : Math.min(W / p.w, 2);
      const copy = wrap.querySelector('.half-in');
      copy.style.transform = `scale(${s}) translate(${-p.x0}px, ${-p.y0}px)`;
      wrap.style.height = p.h * s + 'px';
      if (p.wide) wrap.firstChild.style.width = p.w * s + 'px';
    });
    fit(); addEventListener('resize', fit);
  });

  // pictures inside the copies can still be tapped to enlarge (copies don't keep click handlers)
  document.addEventListener('click', e => {
    const z = e.target.closest('.half .zoom, .half .slide'); if (!z || typeof lb === 'undefined') return;
    const i = z.querySelector('img'); if (!i) return;
    lbImg.src = i.src; lbImg.alt = i.alt; lb.classList.add('open');
  });
})();
