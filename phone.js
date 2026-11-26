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
;
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
    // a hand-made phone version (in a <template class="phone-version">) replaces the slide's pieces
    const tpl = sheet.querySelector('template.phone-version');
    if (tpl) {
      const inner0 = sheet.querySelector('.sheet-in'), h2 = inner0 && inner0.querySelector('.h2'), cap = inner0 && inner0.querySelector('.v20');
      const strip = el => { const c = el.cloneNode(true); c.classList.remove('a'); c.removeAttribute('style'); c.classList.add('ph-t'); return c; };
      const head = document.createElement('div'); head.className = 'ph-text'; if (h2) head.appendChild(strip(h2));
      const tail = document.createElement('div'); tail.className = 'ph-text'; if (cap) tail.appendChild(strip(cap));
      const body = tpl.content.cloneNode(true);
      body.querySelectorAll('img[loading]').forEach(i => { i.loading = 'eager'; });
      sheet.replaceChildren(head, ...body.children, tail); sheet.classList.add('split', 'hand-made');
      return;
    }
    const inner = sheet.querySelector('.sheet-in'); if (!inner) return;
    inner.style.cssText += ';position:absolute;left:0;top:0;width:1296px;height:864px;transform:none;zoom:1;margin:0';
    const o = inner.getBoundingClientRect();
    const all = [...inner.children].filter(el => !el.hasAttribute('data-ph-skip')).map(el => ({ el, ...box(el, o) }))
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

    // tables whose columns sit under a row of pictures (What / Why under each picture) become
    // one card per picture: the picture, then its What and Why, two cards per row
    const tableGrids = [];
    texts.filter(t => t.el.classList.contains('rl') && /^\s*what\s*$/i.test(t.el.textContent)).forEach(whatL => {
      const sameRow = (a, b) => Math.abs(a.y - b.y) < 8;
      const whats = texts.filter(t => t !== whatL && sameRow(t, whatL) && t.x > whatL.x);
      const whyL = texts.find(t => t.el.classList.contains('rl') && /^\s*why\s*$/i.test(t.el.textContent) && t.y > whatL.y && t.y - whatL.y < 80);
      const whys = whyL ? texts.filter(t => t !== whyL && sameRow(t, whyL) && t.x > whyL.x) : [];
      const pics = items.filter(i => i.el.classList.contains('zoom') && i.y < whatL.y && whatL.y - i.y < 260);
      const cols = whats.map(w => ({ w, y: whys.find(v => Math.abs(v.x - w.x) < 12), pic: pics.find(z => Math.abs(z.x - w.x) < 12) })).filter(c => c.pic);
      if (cols.length < 3) return;
      const grid = document.createElement('div'); grid.className = 'ph-cards';
      cols.sort((a, b) => a.w.x - b.w.x).forEach(c => {
        const card = document.createElement('div'); card.className = 'ph-card';
        const z = c.pic.el.cloneNode(true); z.classList.remove('a'); z.removeAttribute('style'); z.classList.add('ph-card-pic');
        z.querySelectorAll('img[loading]').forEach(i => { i.loading = 'eager'; });
        card.appendChild(z);
        const line = (label, item) => { if (!item) return; const pEl = document.createElement('p'); pEl.className = 'ph-card-t'; pEl.innerHTML = '<b>' + label + '</b> '; pEl.append(item.el.innerHTML.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()); card.appendChild(pEl); };
        line('What', c.w); line('Why', c.y);
        grid.appendChild(card);
      });
      const used = new Set([whatL, ...whats, whyL, ...whys].filter(Boolean));
      for (let k = texts.length - 1; k >= 0; k--) if (used.has(texts[k])) texts.splice(k, 1);
      cols.forEach(c => { const k = items.indexOf(c.pic); if (k >= 0) items.splice(k, 1); });
      tableGrids.push({ y: Math.min(...cols.map(c => c.pic.y)) + 2, y1: Math.max(...cols.map(c => (c.y || c.w).y + 30)), x: 92, grid });
    });
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

    // 3a) a chart with its numbered list beside it (ol.steps): the chart gets the full width, the list goes under it
    const listBlocks = [];
    pieces.forEach(p => {
      const inP = i => i.x + i.w / 2 > p.x0 && i.x + i.w / 2 < p.x0 + p.w && i.y + i.h / 2 > p.y0 && i.y + i.h / 2 < p.y0 + p.h;
      const ols = items.filter(i => i.el.tagName === 'OL' && i.el.classList.contains('steps') && inP(i));
      if (!ols.length) return;
      const rest = items.filter(i => inP(i) && !ols.includes(i) && i.x + i.w <= Math.min(...ols.map(o => o.x)) + 4);
      if (!rest.length) return;
      const x0 = Math.min(...rest.map(i => i.x)), x1 = Math.max(...rest.map(i => i.x + i.w)), y0 = Math.min(...rest.map(i => i.y)), y1 = Math.max(...rest.map(i => i.y + i.h));
      Object.assign(p, { x0: x0 - PAD, y0: y0 - PAD, w: x1 - x0 + PAD * 2, h: y1 - y0 + PAD * 2, dark: true });
      ols.forEach(o => {
        const box = document.createElement('div'); box.className = 'ph-list';
        const c = o.el.cloneNode(true); c.classList.remove('a'); c.removeAttribute('style'); box.appendChild(c);
        listBlocks.push({ y: p.y0 + p.h - 1, y1: p.y0 + p.h, x: x0 + 20, grid: box, last: false });
      });
    });

    // 3b) a dark panel holding a grid of steps (3+ pictures with captions) becomes one card per step,
    //     later shown two per row in reading order (1 2 / 3 4 / 5 6)
    const zooms = items.filter(i => i.el.classList.contains('zoom') && inPanel(i));
    const stepCards = [];
    for (let n = pieces.length - 1; n >= 0; n--) {
      const p = pieces[n];
      const inside = zooms.filter(z => z.x + z.w / 2 > p.x0 && z.x + z.w / 2 < p.x0 + p.w && z.y + z.h / 2 > p.y0 && z.y + z.h / 2 < p.y0 + p.h);
      if (inside.length < 2 || zooms.length < 3) continue;
      const capOf = z => items.filter(i => i !== z && !i.el.classList.contains('zoom') && i.x + i.w / 2 > z.x - 4 && i.x + i.w / 2 < z.x + z.w + 4 && i.y >= z.y + z.h - 6 && i.y < z.y + z.h + 46);
      const cards = inside.map(z => { const cap = capOf(z); return { z, cap, bottom: Math.max(z.y + z.h, ...cap.map(i => i.y + i.h)) }; });
      // only when every picture has its own caption and nothing else in this part would be left out
      const covered = new Set(cards.flatMap(c => [c.z, ...c.cap]));
      const inPiece = items.filter(i => i.x + i.w / 2 > p.x0 && i.x + i.w / 2 < p.x0 + p.w && i.y + i.h / 2 > p.y0 && i.y + i.h / 2 < p.y0 + p.h);
      if (cards.some(c => !c.cap.length) || inPiece.some(i => !covered.has(i) && i.el.textContent.trim())) continue;
      cards.forEach(({ z, bottom }) => stepCards.push({ x0: z.x - 8, y0: z.y - 8, w: z.w + 16, h: bottom - z.y + 16, card: true, row: Math.round(z.y / 60), col: z.x }));
      pieces.splice(n, 1);
    }
    stepCards.sort((a, b) => a.row - b.row || a.col - b.col);
    pieces.push(...stepCards);

    const els = pieces.map((p, n) => {
      const inDark = panels.some(pn => p.x0 + p.w / 2 > pn.x && p.x0 + p.w / 2 < pn.x + pn.w && p.y0 + p.h / 2 > pn.y && p.y0 + p.h / 2 < pn.y + pn.h);
      const wrap = document.createElement('div'); wrap.className = 'half' + (p.wide ? ' swipe' : '') + (inDark || p.dark || p.card ? ' dark' : '');
      const copy = inner.cloneNode(true); copy.classList.add('half-in');
      copy.querySelectorAll('img[loading]').forEach(img => { img.loading = 'eager'; });
      // a black panel with a title then a drawing: centre the drawing (and its labels) under the title
      if (inDark && !p.card) {
        const inP = items.concat(texts).filter(i => i.x + i.w / 2 > p.x0 && i.x + i.w / 2 < p.x0 + p.w && i.y + i.h / 2 > p.y0 && i.y + i.h / 2 < p.y0 + p.h);
        const top = inP.slice().sort((a, b) => a.y - b.y)[0];
        const rest = inP.filter(i => i !== top && i.y > top.y + top.h + 10);
        if (top && rest.length > 3 && !top.el.querySelector('img,svg')) {
          const l = Math.min(...rest.map(i => i.x)), r = Math.max(...rest.map(i => i.x + i.w));
          const dx = (p.x0 + p.w / 2) - (l + r) / 2;
          if (Math.abs(dx) > 4) { const kids = [...inner.children]; rest.forEach(i => { const c = copy.children[kids.indexOf(i.el)]; if (c) c.style.translate = dx.toFixed(1) + 'px 0'; }); }
        }
      }
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
      ...rows.map(r => ({ y: r.y0, y1: r.y1, x: Math.min(...r.items.map(t => t.x)) + 20, wide: r.items.length > 1 && Math.max(...r.items.map(t => t.x + t.w)) - Math.min(...r.items.map(t => t.x)) > 700, last: r.items.some(t => t.el.classList.contains('v20')), row: r })),   // text belongs to the column it starts in
      ...els.map(w => ({ y: w._p.y0 + PAD + 12, y1: w._p.y0 + w._p.h - PAD, x: w._p.x0 + w._p.w / 2, el: w })),
      ...tableGrids,
      ...listBlocks,
    ].sort((a, b) => a.y - b.y);
    const clusters = [];
    raw.forEach(o => { const c = clusters[clusters.length - 1]; if (c && o.y < c.y1 + 60) { c.list.push(o); c.y1 = Math.max(c.y1, o.y1); } else clusters.push({ y1: o.y1, list: [o] }); });
    const pics = raw.filter(o => o.el);   // three columns only when the pictures themselves sit in three columns
    const three = pics.some(o => o.x < 452) && pics.some(o => o.x > 464 && o.x < 832) && pics.some(o => o.x > 856);
    const col = o => three ? (o.x < 452 ? 0 : o.x < 844 ? 1 : 2) : (o.x < 648 ? 0 : 1);
    const key = o => o.last ? 10 : o.wide ? 9 : col(o);   // the slide's closing caption is read last   // rows that run across all columns (a table under pictures) come after them
    const order = clusters.flatMap(c => c.list.sort((a, b) => key(a) - key(b) || a.y - b.y));
    const blocks = []; let tbox = null, stepGrid = null;
    order.forEach(o => {
      if (o.row) {
        if (!tbox) { tbox = document.createElement('div'); tbox.className = 'ph-text'; blocks.push(tbox); }
        const r = document.createElement('div'); r.className = 'ph-row' + (o.row.items.length > 1 ? ' kv' : '');
        o.row.items.sort((a, b) => a.x - b.x).forEach(t => r.appendChild(textEl(t)));
        tbox.appendChild(r);
      } else if (o.grid) { tbox = null; blocks.push(o.grid);
      } else if (o.el._p.card) {
        tbox = null;
        if (!stepGrid) {
          stepGrid = document.createElement('div'); stepGrid.className = 'card-grid in-panel'; stepGrid.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
          stepGrid.style.background = '#000'; els.filter(w => w._p.card).forEach(w => stepGrid.appendChild(w)); blocks.push(stepGrid);
        }
      } else { tbox = null; blocks.push(o.el); if (o.el._hint) blocks.push(o.el._hint); }
    });
    // hand-made phone parts (template.phone-part) go in before the section's closing caption
    sheet.querySelectorAll('template.phone-part').forEach(t => {
      const frag = t.content.cloneNode(true); frag.querySelectorAll('img[loading]').forEach(i => { i.loading = 'eager'; });
      let at = blocks.length;
      const last = blocks[blocks.length - 1];
      const capRow = last && last.classList.contains('ph-text') ? [...last.children].find(r => r.querySelector('.v20')) : null;
      if (capRow) {
        if (last.children.length > 1) { const nb = document.createElement('div'); nb.className = 'ph-text'; nb.appendChild(capRow); blocks.push(nb); }
        at = blocks.length - 1;
      }
      blocks.splice(at, 0, ...frag.children);
    });
    const isDark = b => b && (b.classList.contains('dark') || b.classList.contains('in-panel') || b.classList.contains('ph-list') || b.classList.contains('ev-group'));
    blocks.forEach((b, i) => { if (isDark(b) && isDark(blocks[i - 1])) b.classList.add('joined'); if (isDark(b) && isDark(blocks[i + 1])) b.classList.add('joins'); });
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
