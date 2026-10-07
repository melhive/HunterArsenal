/* Hunter’s License renderer.
 * The card is a VIEW of getHunterCardData(): nothing here stores or computes progression.
 * Drawn on a 1600x1000 canvas so "Save as Image" and the in-app view are the same picture.
 * Layout follows the license reference sheets. Each rank has its own palette (E green, D cyan, C blue,
 * B steel-blue, A violet and gold, S gold). Optional art slots (all fall back to drawn graphics):
 *   assets/branding/license-art.png        scene shown on the right of the rank panel
 *   assets/branding/license-art-<E..S>.png per-rank override of the scene
 * It is an in-app collectible, not an identity document, and says so on its face. */
(function (g) {
  'use strict';
  const HA = (g.HA = g.HA || {});
  const W = 1600, H = 1000;
  const FONT = '"Oswald","Rajdhani","IBM Plex Sans Condensed","Arial Narrow","Segoe UI",system-ui,sans-serif';
  const MONO = '"JetBrains Mono","IBM Plex Mono","Consolas","Courier New",monospace';
  // rank palettes: main colour, secondary colour, frame trim
  const PAL = {
    E: { m: '#5fe07a', s: '#2fa14b', t: '#8dffa6' },
    D: { m: '#38d9f0', s: '#1597b0', t: '#9bf0ff' },
    C: { m: '#4f8dff', s: '#9b7bff', t: '#a9c4ff' },
    B: { m: '#3da5ff', s: '#d4e6ff', t: '#e3f0ff' },
    A: { m: '#a56bff', s: '#f0d08a', t: '#f0d08a' },
    S: { m: '#f5c24f', s: '#5fa8ff', t: '#ffe39a' }
  };
  const VIV = { STR: '#ff5d6c', VIT: '#43e08f', INT: '#38c8ff', PER: '#a56bff', CHA: '#ffd24a' };
  const TIER_ICON = ['target', 'bolt', 'swords', 'shield', 'crown', 'flame', 'star'];
  const FOOT_QUOTES = ['SAME PERSON. HIGHER STANDARDS.', 'DISCIPLINE BUILDS FREEDOM.', 'SMALL STEPS. SERIOUS RESULTS.', 'CONSISTENCY IS THE WEAPON.', 'PROGRESS IS A DAILY DECISION.'];
  const BOX_QUOTES = [['CONSISTENCY TURNS', 'ORDINARY PEOPLE INTO', 'LEGENDARY HUNTERS.'], ['SMALL STEPS TODAY.', 'STRONGER HUNTER', 'TOMORROW.'], ['A SHARPER MIND', 'BUILDS A BRIGHTER', 'TOMORROW.'], ['CONSISTENT ACTION', 'TURNS POTENTIAL', 'INTO REAL PROGRESS.']];

  const loadImg = (src) => new Promise((res) => { if (!src) return res(null); let done=false; const finish=v=>{if(!done){done=true;res(v);}}; const i = new Image(); i.onload = () => finish(i); i.onerror = () => finish(null); i.src = src; setTimeout(()=>finish(null),2000); });
  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const niceDate = k => { const [y, m, d] = k.split('-').map(Number); return `${String(d).padStart(2, '0')} ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][m - 1]} ${y}`; };

  function chamfer(c, x, y, w, h, k) {
    c.beginPath(); c.moveTo(x + k, y); c.lineTo(x + w - k, y); c.lineTo(x + w, y + k); c.lineTo(x + w, y + h - k);
    c.lineTo(x + w - k, y + h); c.lineTo(x + k, y + h); c.lineTo(x, y + h - k); c.lineTo(x, y + k); c.closePath();
  }
  function box(c, x, y, w, h, o) {
    o = o || {}; const k = o.k || 16, col = o.color;
    c.save(); chamfer(c, x, y, w, h, k);
    const gr = c.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, o.fill1 || 'rgba(16,22,30,.92)'); gr.addColorStop(1, o.fill2 || 'rgba(8,12,18,.94)');
    c.fillStyle = gr; c.shadowColor = hexA(col, .35); c.shadowBlur = o.glow === undefined ? 16 : o.glow; c.fill(); c.restore();
    c.save(); chamfer(c, x, y, w, h, k); c.lineWidth = o.lw || 2.5; c.strokeStyle = hexA(col, o.alpha || .85); c.stroke(); c.restore();
    // corner ticks
    c.save(); c.strokeStyle = o.trim || col; c.lineWidth = (o.lw || 2.5) + 1.5; c.lineCap = 'round';
    [[x + k, y, 22, 0], [x, y + k, 0, 22]].forEach(([px, py, dx, dy]) => { c.beginPath(); c.moveTo(px, py); c.lineTo(px + dx, py + dy); c.stroke(); });
    [[x + w - k, y + h, -22, 0], [x + w, y + h - k, 0, -22]].forEach(([px, py, dx, dy]) => { c.beginPath(); c.moveTo(px, py); c.lineTo(px + dx, py + dy); c.stroke(); });
    c.restore();
  }
  function text(c, t, x, y, size, color, o) {
    o = o || {}; c.save(); c.fillStyle = color; c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'alphabetic';
    if ('letterSpacing' in c) c.letterSpacing = (o.spacing || 0) + 'px';
    c.font = `${o.weight || 600} ${size}px ${o.mono ? MONO : FONT}`;
    if (o.fit) { let sz = size; while (sz > size * 0.5) { c.font = `${o.weight || 600} ${sz}px ${o.mono ? MONO : FONT}`; if (c.measureText(String(t)).width <= o.fit) break; sz -= 1; } }
    if (o.glow) { c.shadowColor = o.glow; c.shadowBlur = o.blur || 14; }
    let s = String(t); if (o.max) { while (c.measureText(s).width > o.max && s.length > 1) s = s.slice(0, -1); }
    c.fillText(s, x, y); c.restore();
  }
  function textW(c, t, size, weight, spacing) { c.save(); c.font = `${weight || 600} ${size}px ${FONT}`; if ('letterSpacing' in c) c.letterSpacing = (spacing || 0) + 'px'; const w = c.measureText(t).width; c.restore(); return w; }
  function bar(c, x, y, w, h, pct, col, trim) {
    c.save(); c.fillStyle = 'rgba(40,50,62,.75)'; c.beginPath(); c.roundRect(x, y, w, h, h / 2); c.fill();
    const fw = Math.max(0, Math.min(1, pct / 100)) * w;
    if (fw > 0) { const gr = c.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, hexA(col, .55)); gr.addColorStop(1, col); c.fillStyle = gr; c.shadowColor = hexA(col, .5); c.shadowBlur = 12; c.beginPath(); c.roundRect(x, y, Math.max(h, fw), h, h / 2); c.fill(); }
    c.restore();
  }
  // draw one of the app's line icons (path / circle / rect markup) onto the canvas
  function icon(c, name, cx, cy, size, color, lw) {
    if (typeof Path2D === 'undefined') return;
    const ICONS = HA.Icons || {}, src = ICONS[name]; if (!src) return;
    c.save(); c.translate(cx - size / 2, cy - size / 2); c.scale(size / 24, size / 24);
    c.strokeStyle = color; c.lineWidth = lw || 1.8; c.lineCap = 'round'; c.lineJoin = 'round';
    const attr = (s, k) => { const m = new RegExp(k + '="([^"]*)"').exec(s); return m ? m[1] : null; };
    (src.match(/<(path|circle|rect)\b[^>]*>/g) || []).forEach((el) => {
      if (el.startsWith('<path')) c.stroke(new Path2D(attr(el, 'd')));
      else if (el.startsWith('<circle')) { c.beginPath(); c.arc(+attr(el, 'cx'), +attr(el, 'cy'), +attr(el, 'r'), 0, Math.PI * 2); c.stroke(); }
      else { c.beginPath(); c.roundRect(+attr(el, 'x'), +attr(el, 'y'), +attr(el, 'width'), +attr(el, 'height'), +(attr(el, 'rx') || 0)); c.stroke(); }
    });
    c.restore();
  }
  function hexagon(c, cx, cy, r, lw, col, glow) {
    c.save(); c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3 - Math.PI / 2 + Math.PI / 6; const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath();
    c.lineWidth = lw; c.strokeStyle = col; if (glow) { c.shadowColor = glow; c.shadowBlur = 22; } c.stroke(); c.restore();
  }
  function wings(c, cx, cy, n, col) {
    if (!n) return;
    c.save(); c.lineCap = 'round';
    [-1, 1].forEach((sd) => { for (let i = 0; i < n; i++) {
      const ang = -0.62 + i * 0.2, len = 92 - i * 7, x0 = cx + sd * (112 + i * 3), y0 = cy - 46 + i * 17;
      c.strokeStyle = hexA(col, .95 - i * .09); c.lineWidth = 8 - i * .6; c.shadowColor = hexA(col, .55); c.shadowBlur = 9;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + sd * Math.cos(ang) * len, y0 + Math.sin(ang) * len); c.stroke(); } });
    c.restore();
  }
  function crown(c, cx, cy, col) {
    c.save(); c.fillStyle = col; c.shadowColor = hexA(col, .8); c.shadowBlur = 14; c.beginPath();
    c.moveTo(cx - 34, cy + 16); c.lineTo(cx - 40, cy - 14); c.lineTo(cx - 18, cy + 2); c.lineTo(cx, cy - 22); c.lineTo(cx + 18, cy + 2); c.lineTo(cx + 40, cy - 14); c.lineTo(cx + 34, cy + 16); c.closePath(); c.fill(); c.restore();
  }
  function idMark(c, x, y, s, id, col) {
    const h = hash(id), n = 9, cell = s / n; c.save(); c.fillStyle = hexA(col, .95);
    for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) {
      const finder = (r < 3 && q < 3) || (r < 3 && q >= n - 3) || (r >= n - 3 && q < 3);
      const on = finder ? !((r % 2 === 1 && q % 2 === 1) && false) && (r === 0 || r === 2 || q === 0 || q === 2 || r === n - 1 || r === n - 3 || q === n - 1 || q === n - 3 || (r % (n - 3) === 1 && q % (n - 3) === 1)) : ((h >> ((r * n + q) % 31)) & 1) === 1;
      if (on) c.fillRect(x + q * cell, y + r * cell, cell - 1, cell - 1);
    }
    c.restore();
  }
  function barcode(c, x, y, w, h, id, col) {
    let hh = hash(id + 'bar'), cx = x; c.save(); c.fillStyle = hexA(col, .9);
    while (cx < x + w) { hh = Math.imul(hh ^ (hh >>> 13), 1274126177) >>> 0; const bw = 2 + (hh % 4), gap = 2 + ((hh >> 3) % 4); c.fillRect(cx, y, bw, h); cx += bw + gap; }
    c.restore();
  }
  function skyline(c, x, y, w, h, col, seed) {
    let hh = hash(seed), cx = x; c.save(); c.fillStyle = hexA(col, .1); c.strokeStyle = hexA(col, .22); c.lineWidth = 1.5;
    while (cx < x + w) { hh = Math.imul(hh ^ (hh >>> 15), 2246822519) >>> 0; const bw = 18 + (hh % 34), bh = h * (.25 + ((hh >> 5) % 70) / 100); c.fillRect(cx, y + h - bh, bw, bh); c.strokeRect(cx, y + h - bh, bw, bh); if ((hh >> 9) % 3 === 0) { c.beginPath(); c.moveTo(cx + bw / 2, y + h - bh); c.lineTo(cx + bw / 2, y + h - bh - 26); c.stroke(); } cx += bw + 4; }
    c.restore();
  }

  function draw(d, canvas, assets) {
    canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d'), G = HA.Game;
    if (!c) throw new Error('Canvas is unavailable');
    if (!c.roundRect) c.roundRect = function(x,y,w,h,r){r=Math.min(r||0,w/2,h/2);this.beginPath();this.moveTo(x+r,y);this.lineTo(x+w-r,y);this.quadraticCurveTo(x+w,y,x+w,y+r);this.lineTo(x+w,y+h-r);this.quadraticCurveTo(x+w,y+h,x+w-r,y+h);this.lineTo(x+r,y+h);this.quadraticCurveTo(x,y+h,x,y+h-r);this.lineTo(x,y+r);this.quadraticCurveTo(x,y,x+r,y);this.closePath();};
    const pal = PAL[d.rank] || PAL.E, M = pal.m, S2 = pal.s, TR = pal.t;
    const logo = assets && assets.logo || null, avatar = assets && assets.avatar || null, art = assets && (assets.rankArt || assets.art) || null;
    const ver = 'v' + (g.APP_VERSION || '');

    // ---- background
    let gr = c.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#070a0f'); gr.addColorStop(.55, '#0d121a'); gr.addColorStop(1, '#06080c'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    gr = c.createRadialGradient(W * .8, H * .28, 30, W * .8, H * .28, 720); gr.addColorStop(0, hexA(M, .22)); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    gr = c.createRadialGradient(W * .12, H * .95, 20, W * .12, H * .95, 560); gr.addColorStop(0, hexA(S2, .13)); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.save(); c.strokeStyle = hexA(M, .05); c.lineWidth = 1; for (let x = 0; x < W; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } c.restore();

    // ---- outer frame (double line, corner brackets, side segments)
    box(c, 14, 14, W - 28, H - 28, { color: M, k: 54, fill1: 'rgba(0,0,0,0)', fill2: 'rgba(0,0,0,0)', lw: 4, glow: 26, trim: TR });
    box(c, 34, 34, W - 68, H - 68, { color: S2, k: 44, fill1: 'rgba(0,0,0,0)', fill2: 'rgba(0,0,0,0)', lw: 1.4, glow: 0, alpha: .55, trim: S2 });
    c.save(); c.strokeStyle = hexA(M, .8); c.lineWidth = 4; c.lineCap = 'round'; c.shadowColor = hexA(M, .6); c.shadowBlur = 10;
    [[W / 2 - 90, 14, W / 2 + 90, 14], [W / 2 - 90, H - 14, W / 2 + 90, H - 14]].forEach(([a, b, e, f]) => { c.beginPath(); c.moveTo(a, b); c.lineTo(e, f); c.stroke(); }); c.restore();

    // ---- header
    if (logo) c.drawImage(logo, 66, 62, 128, 128);
    else { c.save();c.strokeStyle=hexA(M,.9);c.lineWidth=3;c.beginPath();c.arc(130,126,58,0,Math.PI*2);c.stroke();c.fillStyle='#e6ebf0';c.font=`700 32px ${FONT}`;c.textAlign='center';c.fillText('HA',130,137);c.restore(); }
    text(c, 'Hunter', 232, 124, 70, '#f1f4f8', { weight: 700 });
    text(c, 'Arsenal', 232 + textW(c, 'Hunter', 70, 700) + 4, 124, 70, M, { weight: 700, glow: hexA(M, .7) });
    text(c, 'OFFICIAL HUNTER’S LICENSE', 234, 168, 35, '#e8edf3', { spacing: 10, fit: 690 });
    text(c, 'PERSONAL HUNTER IDENTIFICATION', 236, 198, 19, '#8e99a8', { spacing: 8, mono: true, weight: 500 });
    // system block (top right)
    text(c, 'HUNTERARSENAL SYSTEM', 960, 88, 21, M, { mono: true, spacing: 3, weight: 600, fit: 400 });
    text(c, 'DISCIPLINE · PROGRESS · A BETTER YOU', 960, 116, 14, '#7c8796', { mono: true, spacing: 2, weight: 500, fit: 400 });
    text(c, 'VER.', W - 76, 80, 20, '#8e99a8', { mono: true, align: 'right', spacing: 3 });
    text(c, ver, W - 76, 110, 26, '#dfe5ec', { mono: true, align: 'right', weight: 700 });

    // ---- photo
    box(c, 62, 224, 304, 336, { color: M, k: 22, trim: TR });
    const photoBorder=HA.Game.COSMETICS.find(x=>x.id===d.photoBorder); if(photoBorder){c.save();c.strokeStyle=photoBorder.color;c.lineWidth=10;c.shadowColor=hexA(photoBorder.color,.7);c.shadowBlur=14;chamfer(c,62,224,304,336,22);c.stroke();c.restore();}
    c.save(); chamfer(c, 72, 234, 284, 316, 16); c.clip();
    if (avatar) { const s = Math.max(284 / avatar.width, 316 / avatar.height), iw = avatar.width * s, ih = avatar.height * s; c.drawImage(avatar, 72 + (284 - iw) / 2, 234 + (316 - ih) / 2, iw, ih); }
    else { const gg = c.createLinearGradient(72, 234, 356, 550); gg.addColorStop(0, '#26303c'); gg.addColorStop(1, '#10151c'); c.fillStyle = gg; c.fillRect(72, 234, 284, 316); text(c, (d.name || 'H').trim().charAt(0).toUpperCase(), 214, 440, 200, hexA(M, .9), { align: 'center', weight: 700, glow: hexA(M, .6) }); }
    const sh = c.createLinearGradient(0, 470, 0, 550); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.78)'); c.fillStyle = sh; c.fillRect(72, 470, 284, 80);
    c.fillStyle = 'rgba(255,255,255,.035)'; for (let y = 234; y < 550; y += 4) c.fillRect(72, y, 284, 1);
    c.restore();
    text(c, 'HUNTER ID', 86, 520, 12, '#aab4c1', { mono: true, spacing: 2, weight: 600 }); text(c, d.hunterId, 86, 540, 17, '#f1f4f8', { mono: true, weight: 700, spacing: 1 });
    idMark(c, 308, 498, 38, d.hunterId, '#e8edf3');

    // ---- name / id / issued
    box(c, 386, 224, 548, 212, { color: M, trim: TR });
    text(c, 'NAME', 418, 266, 21, M, { spacing: 6 });
    const namePlate=HA.Game.COSMETICS.find(x=>x.id===d.namePlate); if(namePlate){c.save();c.fillStyle=hexA(namePlate.color,.18);c.fillRect(418,280,484,9);c.restore();}
    text(c, d.name.toUpperCase(), 418, 350, 86, '#f1f4f8', { weight: 700, fit: 490, glow: hexA(M, .35) });
    c.save(); c.strokeStyle = hexA(M, .35); c.lineWidth = 1.5; c.beginPath(); c.moveTo(418, 372); c.lineTo(902, 372); c.stroke(); c.restore();
    text(c, 'HUNTER ID', 418, 402, 17, M, { spacing: 5 }); text(c, d.hunterId, 418, 428, 28, '#f1f4f8', { mono: true, weight: 700, spacing: 1 });
    c.save(); c.strokeStyle = hexA(M, .45); c.lineWidth = 2; c.beginPath(); c.moveTo(664, 384); c.lineTo(664, 430); c.stroke(); c.restore();
    text(c, 'ISSUED', 690, 402, 17, M, { spacing: 5 }); text(c, niceDate(d.issuedDate), 690, 428, 28, '#f1f4f8', { mono: true, weight: 700, spacing: 1 });

    // ---- class + title
    const pa = G.ATTRS[d.primaryAttribute], pc = VIV[d.primaryAttribute];
    box(c, 386, 452, 548, 108, { color: pc, trim: pc });
    c.save(); c.fillStyle = 'rgba(255,255,255,.06)'; c.beginPath(); c.roundRect(406, 472, 68, 68, 12); c.fill(); c.restore(); icon(c, pa.icon, 440, 506, 40, '#dfe5ec', 1.7);
    text(c, 'CLASS', 490, 490, 16, '#9aa5b4', { spacing: 5 }); text(c, d.class.toUpperCase(), 490, 534, 42, '#f1f4f8', { weight: 700, fit: 196 });
    c.save(); c.strokeStyle = hexA(M, .45); c.lineWidth = 2; c.beginPath(); c.moveTo(704, 470); c.lineTo(704, 542); c.stroke(); c.restore();
    icon(c, 'crown', 742, 506, 38, '#f5c24f', 1.7);
    text(c, 'TITLE', 774, 490, 15, '#9aa5b4', { spacing: 4, fit: 150 });
    const dsg = d.title ? d.title.toUpperCase() : 'UNASSIGNED', dcol = d.title ? '#f5c24f' : '#6a7583';
    c.save(); c.font = `700 30px ${FONT}`; const dw = c.measureText(dsg).width; c.restore();
    if (dw <= 150 || dsg.indexOf(' ') < 0) text(c, dsg, 774, 532, 30, dcol, { weight: 700, fit: 150, glow: d.title ? 'rgba(245,194,79,.4)' : null });
    else { const k = dsg.lastIndexOf(' '), l1 = dsg.slice(0, k), l2 = dsg.slice(k + 1); text(c, l1, 774, 516, 26, dcol, { weight: 700, fit: 150 }); text(c, l2, 774, 546, 26, dcol, { weight: 700, fit: 150 }); }

    // ---- rank panel (right)
    box(c, 960, 150, 584, 410, { color: M, k: 34, trim: TR });
    if (art) { c.save(); chamfer(c, 964, 154, 576, 402, 32); c.clip(); const s = Math.max(576 / art.width, 402 / art.height); c.globalAlpha = .75; c.drawImage(art, 964 + (576 - art.width * s) / 2, 154 + (402 - art.height * s) / 2, art.width * s, art.height * s); c.globalAlpha = 1; const fade = c.createLinearGradient(964, 0, 1540, 0); fade.addColorStop(0, 'rgba(8,12,18,.96)'); fade.addColorStop(.62, 'rgba(8,12,18,.5)'); fade.addColorStop(1, 'rgba(8,12,18,0)'); c.fillStyle = fade; c.fillRect(964, 154, 576, 402); c.restore(); }
    else { c.save(); chamfer(c, 964, 154, 576, 402, 32); c.clip(); skyline(c, 1170, 330, 380, 220, M, d.hunterId); c.restore(); }
    text(c, 'HUNTER RANK', 1170, 190, 24, M, { align: 'center', spacing: 9 });
    const wn = { E: 0, D: 0, C: 3, B: 4, A: 5, S: 6 }[d.rank] || 0; wings(c, 1170, 312, wn, d.rank === 'A' || d.rank === 'S' ? TR : S2);
    hexagon(c, 1170, 312, 96, 5, hexA(M, .95), hexA(M, .8)); hexagon(c, 1170, 312, 79, 1.5, hexA(S2, .6));
    if (d.rank === 'A' || d.rank === 'S') crown(c, 1170, 224, TR);
    text(c, d.rank, 1170, 363, 124, M, { align: 'center', weight: 700, glow: hexA(M, .85), blur: 26, base: 'alphabetic' });
    c.save(); chamfer(c, 1020, 420, 300, 44, 14); c.fillStyle = 'rgba(8,12,18,.85)'; c.fill(); c.lineWidth = 2; c.strokeStyle = hexA(M, .85); c.stroke(); c.restore();
    text(c, `${d.rank}-RANK HUNTER`, 1170, 453, 27, '#f1f4f8', { align: 'center', spacing: 4, weight: 600, fit: 272 });
    text(c, `LEVEL ${d.level}`, 1170, 506, 38, M, { align: 'center', spacing: 8, weight: 600, glow: hexA(M, .5) });
    bar(c, 992, 524, 504, 18, d.maxLevel ? 100 : d.xpPct, M);
    text(c, d.maxLevel ? 'MAX LEVEL' : `${fmt(d.xp)} / ${fmt(d.xpNeed)} XP`, 1496, 520, 15, '#c3cbd5', { align: 'right', mono: true, weight: 600 });

    // ---- primary attribute
    box(c, 62, 580, 304, 322, { color: pc, trim: pc });
    text(c, '▸▸ PRIMARY ATTRIBUTE', 92, 622, 18, pc, { spacing: 3, fit: 250 });
    c.save(); c.strokeStyle = hexA(pc, .45); c.lineWidth = 2; c.beginPath(); c.arc(214, 735, 72, 0, Math.PI * 2); c.stroke(); c.strokeStyle = hexA(pc, .85); c.lineWidth = 3; c.beginPath(); c.arc(214, 735, 72, -1.2, 0.6); c.stroke(); c.restore();
    icon(c, pa.icon, 214, 735, 82, pc, 1.5);
    text(c, d.primaryAttribute, 214, 852, 62, '#f1f4f8', { align: 'center', weight: 700, glow: hexA(pc, .6) });
    text(c, pa.name.toUpperCase(), 214, 884, 22, '#aab4c1', { align: 'center', spacing: 6 });

    // ---- attributes
    box(c, 386, 580, 718, 322, { color: M, trim: TR });
    text(c, 'ATTRIBUTES', 418, 622, 21, M, { spacing: 6 });
    G.ATTR_ORDER.forEach((a, i) => {
      const at = d.attributes[a], y = 644 + i * 50, col = VIV[a];
      c.save(); c.fillStyle = hexA(col, .16); c.strokeStyle = hexA(col, .7); c.lineWidth = 1.5; c.beginPath(); c.roundRect(418, y, 42, 38, 8); c.fill(); c.stroke(); c.restore();
      icon(c, G.ATTRS[a].icon, 439, y + 19, 24, col, 1.8);
      text(c, a, 480, y + 28, 28, '#f1f4f8', { weight: 700, spacing: 1 });
      bar(c, 556, y + 12, 222, 14, at.pct, col);
      text(c, `${fmt(at.xp)} XP`, 884, y + 28, 22, '#d5dbe2', { align: 'right', mono: true, weight: 600 });
      c.save(); c.fillStyle = hexA(col, .1); c.strokeStyle = hexA(col, .8); c.lineWidth = 1.6; c.beginPath(); c.roundRect(912, y + 2, 166, 34, 8); c.fill(); c.stroke(); c.restore();
      text(c, at.tier.toUpperCase(), 995, y + 26, 17, col, { align: 'center', weight: 700, spacing: 2, max: 150 });
    });

    // ---- highest mastery + quote
    const hm = d.highestMastery, tc = '#f5c24f';
    box(c, 1124, 580, 420, 150, { color: tc, trim: tc });
    text(c, 'HIGHEST HABIT MASTERY', 1152, 618, 17, tc, { spacing: 3, fit: 364 });
    c.save(); c.fillStyle = hexA(tc, .1); c.strokeStyle = hexA(tc, .7); c.lineWidth = 1.6; c.beginPath(); c.roundRect(1152, 636, 76, 76, 12); c.fill(); c.stroke(); c.restore();
    icon(c, TIER_ICON[Math.min(6, hm.tier || 0)], 1190, 674, 44, tc, 1.6);
    text(c, hm.rank, 1248, 676, 42, '#f1f4f8', { weight: 700, fit: 270 }); text(c, (hm.habitName || 'NO habit YET').toUpperCase(), 1248, 706, 19, '#9aa5b4', { spacing: 3, fit: 270 });
    box(c, 1124, 750, 420, 152, { color: M, trim: TR });
    const qb = BOX_QUOTES[hash(d.hunterId + d.rank) % BOX_QUOTES.length];
    qb.forEach((ln, i) => text(c, (i === 0 ? '“' : '') + ln + (i === qb.length - 1 ? '”' : ''), 1156, 804 + i * 34, 21, '#dfe5ec', { mono: true, spacing: 3, weight: 500 }));
    c.save(); c.strokeStyle = hexA(M, .8); c.lineWidth = 3; [0, 1, 2].forEach(i => { c.beginPath(); c.moveTo(1470, 788 + i * 14); c.lineTo(1514, 788 + i * 14); c.stroke(); }); c.restore();

    // ---- footer
    text(c, `“${FOOT_QUOTES[hash(d.hunterId) % FOOT_QUOTES.length]}”`, 96, 940, 20, '#aab4c1', { mono: true, spacing: 3, weight: 500 });
    barcode(c, 1000, 920, 170, 30, d.hunterId, M);
    text(c, 'HUNTERARSENAL SYSTEM', 1200, 934, 19, '#dfe5ec', { mono: true, spacing: 3, weight: 600, fit: 320 });
    text(c, 'PERSONAL HUNTER IDENTIFICATION', 1200, 956, 14, '#8e99a8', { mono: true, spacing: 2, weight: 500, fit: 320 });
    text(c, 'In-app license. Not an official identification document.', W / 2, 984, 13, 'rgba(160,170,184,.55)', { align: 'center', mono: true, spacing: 1 });
    return canvas;
  }

  async function render(d, canvas) {
    try { draw(d,canvas,null); }
    catch(e) { const c=canvas.getContext('2d'); if(c){canvas.width=W;canvas.height=H;c.fillStyle='#0b0e12';c.fillRect(0,0,W,H);c.fillStyle='#e6ebf0';c.font='600 32px sans-serif';c.fillText('Hunter License preview could not be drawn.',48,90);} throw e; }
    const jobs=Promise.all([
      loadImg('assets/branding/hunterarsenal-logo.png').then(x=>x||loadImg('assets/fallback/logo-mark.svg')),
      loadImg(d.avatar),loadImg(`assets/branding/license-art-${d.rank}.png`),loadImg('assets/branding/license-art.png'),
      document.fonts&&document.fonts.ready?Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2000))]).then(()=>null):Promise.resolve(null)
    ]);
    const [logo,avatar,rankArt,art]=await Promise.race([jobs,new Promise(resolve=>setTimeout(()=>resolve([null,null,null,null,null]),2000))]);
    try { draw(d,canvas,{logo,avatar,rankArt,art}); } catch(e) { console.warn('Hunter License redraw failed',e); }
    return canvas;
  }

  const toBlob = (canvas) => new Promise((res, rej) => {
    if (canvas.toBlob) return canvas.toBlob(b => (b ? res(b) : rej(new Error('Could not create image'))), 'image/png');
    try { const data=canvas.toDataURL('image/png'), raw=atob(data.split(',')[1]), bytes=new Uint8Array(raw.length); for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);res(new Blob([bytes],{type:'image/png'})); } catch(e) { rej(e); }
  });
  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function share(blob, name) {
    const file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'My Hunter’s License' }); return 'shared'; }
      catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
    }
    download(blob, name); return 'downloaded';   // fallback where Web Share files is unsupported
  }

  HA.Card = { render, toBlob, download, share, W, H };
})(window);
