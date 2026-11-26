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
    if (el.tagName.toLowerCase() === 'svg' && el.classList.contains('mh-callouts')) {
      const parts = [...el.querySelectorAll('path,circle,text,line,rect')].map(c => c.getBoundingClientRect()).filter(q => q.width || q.height);
      if (parts.length) { const l = Math.min(...parts.map(q => q.left)), t = Math.min(...parts.map(q => q.top));
        r = { left: l, top: t, width: Math.max(...parts.map(q => q.right)) - l, height: Math.max(...parts.map(q => q.bottom)) - t }; }
    }
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
    // plain words outside the dark panels become real text on the phone (readable size, wrapping);
    // everything else (pictures, panels, drawn boxes) is shown as clipped pieces of the slide
    const panels = back.filter(i => i.el.classList.contains('panel'));
    const inPanel = i => panels.some(pn => i.x + i.w / 2 > pn.x && i.x + i.w / 2 < pn.x + pn.w && i.y + i.h / 2 > pn.y && i.y + i.h / 2 < pn.y + pn.h);
    const isText = i => {
      const el = i.el;
      if (el.querySelector('img,svg,video') || /^(IMG|VIDEO|svg|BUTTON)$/i.test(el.tagName) || el.classList.contains('zoom')) return false;
      if (!el.textContent.trim() || inPanel(i) || [...el.classList].some(c => c.startsWith('mh-') || c === 'lg' || c.startsWith('lg-'))) return false;
      const cs = getComputedStyle(el);
      const filled = (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') || parseFloat(cs.borderTopWidth) > 0;
      return !filled;
    };
    const texts = all.filter(i => !back.includes(i) && isText(i));
    const items = all.filter(i => !back.includes(i) && !texts.includes(i));
    if (!items.length && !texts.length) return;
    items.forEach(i => { i.x1 = i.x + i.w; i.y1 = i.y + i.h; });

    // 1) bands: split top-to-bottom where nothing crosses a tall enough empty strip
    const bands = [];
    spans(items.map(i => ({ a: i.y, b: i.y1 })), 'a', 'b').forEach(([a, b]) => {
      const last = bands[bands.length - 1];
      if (last && a - last[1] < BAND_GAP) last[1] = b; else bands.push([a, b]);
    });

    const pieces = [];
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
    // text rows: words that share a line (a table label and its value) stay side by side
    const isLabel = e => e.el.classList.contains('k16') || e.el.classList.contains('rl');
    const rows = texts.filter(isLabel).map(t => ({ y0: t.y, y1: t.y + t.h, items: [t] }));
    texts.filter(t => !isLabel(t)).sort((a, b) => a.y - b.y || a.x - b.x).forEach(t => {
      const r = rows.filter(r => isLabel(r.items[0]) && t.x > r.items[0].x && Math.min(r.y1, t.y + t.h) - Math.max(r.y0, t.y) > Math.min(t.h, r.y1 - r.y0) * 0.4)
        .sort((a, b) => (t.x - a.items[0].x) - (t.x - b.items[0].x))[0];
      if (r) { r.items.push(t); r.y1 = Math.max(r.y1, t.y + t.h); }
      else rows.push({ y0: t.y, y1: t.y + t.h, items: [t] });
    });
    const textEl = t => { const c = t.el.cloneNode(true); c.classList.remove('a'); c.removeAttribute('style'); c.classList.add('ph-t'); return c; };
    // reading order: things that sit side by side on the slide are read column by column
    // (the whole left column first, then the right one), otherwise top to bottom
    const raw = [
      ...rows.map(r => ({ y: r.y0, y1: r.y1, x: Math.min(...r.items.map(t => t.x + t.w / 2)), row: r })),
      ...els.map(w => ({ y: w._p.y0 + PAD + 12, y1: w._p.y0 + w._p.h - PAD, x: w._p.x0 + w._p.w / 2, el: w })),
    ].sort((a, b) => a.y - b.y);
    const clusters = [];
    raw.forEach(o => { const c = clusters[clusters.length - 1]; if (c && o.y < c.y1 + 60) { c.list.push(o); c.y1 = Math.max(c.y1, o.y1); } else clusters.push({ y1: o.y1, list: [o] }); });
    const three = raw.some(o => o.x > 464 && o.x < 832) && raw.some(o => o.x > 856);
    const col = o => three ? (o.x < 452 ? 0 : o.x < 844 ? 1 : 2) : (o.x < 648 ? 0 : 1);
    const order = clusters.flatMap(c => c.list.sort((a, b) => col(a) - col(b) || a.y - b.y));
    const blocks = []; let tbox = null;
    order.forEach(o => {
      if (o.row) {
        if (!tbox) { tbox = document.createElement('div'); tbox.className = 'ph-text'; blocks.push(tbox); }
        const r = document.createElement('div'); r.className = 'ph-row' + (o.row.items.length > 1 ? ' kv' : '');
        o.row.items.sort((a, b) => a.x - b.x).forEach(t => r.appendChild(textEl(t)));
        tbox.appendChild(r);
      } else { tbox = null; blocks.push(o.el); if (o.el._hint) blocks.push(o.el._hint); }
    });
    sheet.replaceChildren(...blocks); sheet.classList.add('split');

    const fit = () => els.forEach(wrap => {
      const p = wrap._p, W = wrap.clientWidth;
      const s = p.wide ? W / (p.w / 2) : Math.min(W / p.w, 2);
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
