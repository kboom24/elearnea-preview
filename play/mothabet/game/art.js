/* Mothabet: paper-cut / felt night-garden art kit. All procedural Canvas2D (original), cached into sprites per size.
   Palette (concept): indigo, marigold, coral, mint (+ cream, lilac). The only light sources are the moths and the lantern jar. */
(function (root) {
  'use strict';
  const MB = root.MB, TAU = Math.PI * 2;
  const C = MB.C = { ink: '#100d2e', indigo: '#1d1850', indigo2: '#272066', indigoL: '#3a3184', marigold: '#f5b335', gold: '#ffd34d', coral: '#f07a6a', rose: '#e87fa0', mint: '#8fd6b4', cream: '#f3e3c3', lilac: '#a993d6', fern: '#3f8f6b', fernD: '#2a5f55', fernL: '#5fae84', violet: '#5b4aa0', violetD: '#3f3480', glow: '#ffe7a3' };
  MB.hex2rgb = function (h) { h = h.replace('#', ''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  MB.shade = function (h, k) { const [r, g, b] = MB.hex2rgb(h); const f = (c) => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k)); return `rgb(${f(r)},${f(g)},${f(b)})`; };
  MB.rgba = function (h, a) { const [r, g, b] = MB.hex2rgb(h); return `rgba(${r},${g},${b},${a})`; };
  const shade = MB.shade, rgba = MB.rgba;
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  MB.canvas = canvas;

  /* ---------- grain (risograph / felt fibres) ---------- */
  let GRAIN = null;
  MB.grain = function () {
    if (GRAIN) return GRAIN; const c = canvas(192, 192), x = c.getContext('2d'), im = x.createImageData(192, 192), r = HX.RNG(4242);
    for (let i = 0; i < im.data.length; i += 4) { const v = r.next(); const on = v < .5 ? 0 : 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = on; im.data[i + 3] = Math.floor(Math.abs(v - .5) * 2 * 34); }
    x.putImageData(im, 0, 0);
    // a few fibres
    x.globalAlpha = .08; x.strokeStyle = '#fff'; x.lineWidth = .7; for (let i = 0; i < 70; i++) { const a = r.next() * TAU, px = r.next() * 192, py = r.next() * 192, l = 3 + r.next() * 7; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + 1) * l * .5, py + Math.sin(a + 1) * l * .5, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
    GRAIN = c; return c;
  };
  MB.grainFill = function (ctx, alpha) { const p = ctx.createPattern(MB.grain(), 'repeat'); ctx.save(); ctx.globalAlpha *= alpha == null ? 1 : alpha; ctx.fillStyle = p; ctx.fill(); ctx.restore(); };

  /* ---------- felt patch (panels, buttons): flat colour + grain + stitched inner seam ---------- */
  MB.rr = function (ctx, x, y, w, h, r) { w = Math.max(0, w); h = Math.max(0, h); r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  MB.patch = function (ctx, x, y, w, h, col, o) {
    o = o || {}; const r = o.r == null ? Math.min(h * .28, 30) : o.r, lw = Math.max(1.5, Math.min(w, h) * .022);
    ctx.save();
    if (!o.flat) { MB.rr(ctx, x + 2, y + (o.depth == null ? Math.max(4, h * .06) : o.depth), w, h, r); ctx.fillStyle = 'rgba(6,4,24,.45)'; ctx.fill(); }
    MB.rr(ctx, x, y, w, h, r); ctx.fillStyle = col; ctx.fill(); MB.grainFill(ctx, o.grain == null ? .9 : o.grain);
    // soft top light
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.12)'); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = shade(col, -.35); ctx.stroke();
    if (o.stitch !== false) { const ins = Math.max(5, Math.min(w, h) * .075); ctx.setLineDash([Math.max(4, lw * 3), Math.max(3, lw * 2.4)]); ctx.lineWidth = lw * .9; ctx.strokeStyle = o.stitchCol || rgba('#ffffff', .45); MB.rr(ctx, x + ins, y + ins, w - ins * 2, h - ins * 2, Math.max(2, r - ins * .8)); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
  };

  /* ---------- paper shapes ---------- */
  let SH = 1;
  function paperShadow(ctx, s) { s *= SH; ctx.shadowColor = 'rgba(5,3,20,.55)'; ctx.shadowBlur = s * .6; ctx.shadowOffsetX = s * .15; ctx.shadowOffsetY = s * .35; }
  function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
  MB.paperShadow = paperShadow; MB.noShadow = noShadow;
  // fern frond: from (x,y) along angle a, length L, leaflets alternating
  function fern(ctx, x, y, a, L, col, w, r) {
    const n = 11, bend = (r.next() - .5) * .9;
    ctx.fillStyle = col; ctx.strokeStyle = shade(col, -.25); ctx.lineWidth = Math.max(1, w * .12);
    const pts = []; for (let i = 0; i <= n; i++) { const t = i / n, aa = a + bend * t * t; pts.push([x + Math.cos(aa) * L * t, y + Math.sin(aa) * L * t, aa]); }
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.lineWidth = Math.max(1.5, w * .22); ctx.strokeStyle = shade(col, -.15); ctx.stroke();
    ctx.beginPath();
    for (let i = 1; i < n; i++) { const [px, py, aa] = pts[i], t = i / n, ll = L * .3 * Math.sin(Math.PI * (t * .85 + .1)) * (1 - t * .25);
      for (const sd of [-1, 1]) { const la = aa + sd * 1.05; ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + Math.cos(la - sd * .35) * ll * .6, py + Math.sin(la - sd * .35) * ll * .6, px + Math.cos(la) * ll, py + Math.sin(la) * ll);
        ctx.quadraticCurveTo(px + Math.cos(la + sd * .5) * ll * .45, py + Math.sin(la + sd * .5) * ll * .45, px, py); } }
    ctx.fill();
  }
  function leaf(ctx, x, y, a, L, col) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(L * .5, -L * .32, L, 0); ctx.quadraticCurveTo(L * .5, L * .32, 0, 0); ctx.fill();
    ctx.strokeStyle = shade(col, -.25); ctx.lineWidth = Math.max(1, L * .03); ctx.beginPath(); ctx.moveTo(L * .05, 0); ctx.lineTo(L * .9, 0); ctx.stroke(); ctx.restore(); }
  function flower(ctx, x, y, R, col, center, petals, rot) {
    petals = petals || 7; ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    for (let layer = 0; layer < 2; layer++) { const rr = R * (layer ? .72 : 1), c = layer ? shade(col, .18) : col; ctx.fillStyle = c;
      for (let i = 0; i < petals; i++) { const a = (i + layer * .5) / petals * TAU; ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(rr * .35, -rr * .42, rr * .95, -rr * .32, rr, 0); ctx.bezierCurveTo(rr * .95, rr * .32, rr * .35, rr * .42, 0, 0); ctx.fill(); ctx.restore(); } }
    ctx.fillStyle = center || C.marigold; ctx.beginPath(); ctx.arc(0, 0, R * .26, 0, TAU); ctx.fill(); ctx.fillStyle = C.ink; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; ctx.beginPath(); ctx.arc(Math.cos(a) * R * .15, Math.sin(a) * R * .15, R * .035, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  MB.flower = flower; MB.fern = fern; MB.leaf = leaf;
  function star5(ctx, x, y, R, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); }
  MB.star5 = star5;
  function moon(ctx, x, y, R) { ctx.save(); paperShadow(ctx, R * .12); ctx.fillStyle = C.cream; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.arc(x + R * .42, y - R * .22, R * .86, 0, TAU, true); ctx.fill('evenodd'); noShadow(ctx); ctx.restore(); }
  MB.moon = moon;

  /* ---------- the garden backdrop (cached per W,H,scale) ---------- */
  let BG = null, BGK = '';
  MB.garden = function (W, H, scale, opts) {
    opts = opts || {}; const k = [W, H, scale, opts.variant || 'play'].join('|'); if (BG && BGK === k) return BG;
    const s = Math.min(2.5, scale), c = canvas(W * s, H * s), x = c.getContext('2d'); x.scale(s, s); SH = s; const r = HX.RNG('garden' + (opts.variant || 'play'));
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#16123f'); g.addColorStop(.55, C.indigo); g.addColorStop(1, '#14113a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    // moon glow halo (soft, far)
    const mx = opts.variant === 'title' ? W * .86 : W * .2, my = opts.variant === 'title' ? H * .07 : Math.min(H * .2, 210), mr = Math.min(W, H) * (opts.variant === 'title' ? .085 : .075);
    let gl = x.createRadialGradient(mx, my, 0, mx, my, mr * 4.5); gl.addColorStop(0, 'rgba(255,231,163,.18)'); gl.addColorStop(1, 'rgba(255,231,163,0)'); x.fillStyle = gl; x.fillRect(0, 0, W, H);
    // mottled felt clouds
    for (let i = 0; i < 9; i++) { const cx = r.next() * W, cy = r.next() * H * .7, cr = 80 + r.next() * 220; const cg = x.createRadialGradient(cx, cy, 0, cx, cy, cr); cg.addColorStop(0, 'rgba(70,58,150,.22)'); cg.addColorStop(1, 'rgba(70,58,150,0)'); x.fillStyle = cg; x.fillRect(cx - cr, cy - cr, cr * 2, cr * 2); }
    // stars (paper + tiny dots)
    x.fillStyle = 'rgba(243,227,195,.75)'; for (let i = 0; i < 70; i++) { x.globalAlpha = .25 + r.next() * .6; x.beginPath(); x.arc(r.next() * W, r.next() * H * .75, .8 + r.next() * 1.6, 0, TAU); x.fill(); } x.globalAlpha = 1;
    for (let i = 0; i < 7; i++) { const sx = r.next() * W, sy = r.next() * H * .45, sr = 6 + r.next() * 8; x.save(); paperShadow(x, sr * .3); x.fillStyle = r.next() < .5 ? C.coral : C.cream; star5(x, sx, sy, sr, sr * .45); x.fill(); x.restore(); }
    moon(x, mx, my, mr);
    // fern layers from left/right edges and the floor (back = violet, front = greens)
    const por = H > W;
    const layers = [{ cols: [C.violetD, '#4a3d8f'], n: por ? 7 : 9, len: [.32, .5], sh: .3 }, { cols: [C.fernD, '#356e5e', C.violet], n: por ? 7 : 9, len: [.26, .42], sh: .5 }, { cols: [C.fern, C.fernL, '#4c9a76'], n: por ? 6 : 8, len: [.2, .34], sh: .8 }];
    const U = Math.min(W, H);
    layers.forEach((L, li) => {
      x.save(); paperShadow(x, 6 + li * 3);
      for (let i = 0; i < L.n; i++) {
        const side = i % 3; let bx, by, a;
        if (side === 0) { bx = -10; by = H * (.25 + r.next() * .75); a = -.35 - r.next() * .8; }
        else if (side === 1) { bx = W + 10; by = H * (.25 + r.next() * .75); a = Math.PI + .35 + r.next() * .8; }
        else { bx = r.next() * W; by = H + 10; a = -Math.PI / 2 + (r.next() - .5) * 1.4; }
        // keep the centre column calmer
        fern(x, bx, by, a, U * (L.len[0] + r.next() * (L.len[1] - L.len[0])) * (side === 2 ? .8 : 1.1), r.pick(L.cols), U * .018, r);
      }
      if (li === 1) for (let i = 0; i < (por ? 5 : 7); i++) { const left = i % 2 === 0; leaf(x, left ? -5 : W + 5, H * (.35 + r.next() * .6), left ? -.4 - r.next() * .6 : Math.PI + .4 + r.next() * .6, U * (.12 + r.next() * .1), r.pick([C.fernD, C.violet, '#4c9a76'])); }
      x.restore();
    });
    // moon-flowers at the edges
    x.save(); paperShadow(x, 8);
    const fl = por ? [[.06, .5], [.94, .62], [.05, .84], [.96, .9], [.15, .97], [.86, .36]] : [[.04, .55], [.96, .5], [.08, .92], [.93, .9], [.2, .98], [.8, .99]];
    fl.forEach(([fx, fy], i) => flower(x, W * fx, H * fy, U * (.055 + (i % 3) * .012), [C.coral, C.cream, C.rose][i % 3], i % 3 === 1 ? C.marigold : C.gold, 7 + (i % 2), i));
    x.restore();
    // floor vignette + grain over everything
    const vg = x.createRadialGradient(W / 2, H * .5, Math.min(W, H) * .3, W / 2, H * .5, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(5,3,22,.5)'); x.fillStyle = vg; x.fillRect(0, 0, W, H);
    x.fillStyle = x.createPattern(MB.grain(), 'repeat'); x.globalAlpha = .9; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
    SH = 1; BG = c; BGK = k; return c;
  };

  /* ---------- glow sprite ---------- */
  const GLOW = {};
  MB.glowSprite = function (col) { if (GLOW[col]) return GLOW[col]; const c = canvas(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, rgba(col, .55)); g.addColorStop(.35, rgba(col, .22)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(0, 0, 128, 128); GLOW[col] = c; return c; };
  MB.glow = function (ctx, x, y, r, col, a) { ctx.save(); if (a != null) ctx.globalAlpha *= a; ctx.drawImage(MB.glowSprite(col), x - r, y - r, r * 2, r * 2); ctx.restore(); };

  /* ---------- letter-moth sprites: wing (one side) + body, per colour + size ---------- */
  const MOTHC = {};
  function wingPath(x, R, upper) { x.beginPath(); if (upper) { x.moveTo(0, -R * .05); x.bezierCurveTo(R * .3, -R * .95, R * 1.2, -R * 1.05, R * 1.25, -R * .4); x.bezierCurveTo(R * 1.28, -R * .05, R * .8, R * .12, 0, R * .1); }
    else { x.moveTo(0, R * .05); x.bezierCurveTo(R * .6, R * .05, R * 1.05, R * .25, R * .95, R * .7); x.bezierCurveTo(R * .85, R * 1.02, R * .3, R * .95, 0, R * .3); } x.closePath(); }
  MB.mothSprite = function (col, R, pat, col2) {
    const key = col + '|' + Math.round(R) + '|' + (pat || '') + '|' + (col2 || ''); if (MOTHC[key]) return MOTHC[key];
    const pad = R * .25, ww = R * 1.35 + pad, wh = R * 2.2 + pad * 2;
    const wing = canvas(ww * 2, wh * 2), x = wing.getContext('2d'); x.scale(2, 2); x.translate(2, wh / 2);
    const light = shade(col, .35), dark = shade(col, -.3);
    for (const up of [false, true]) {
      x.save(); wingPath(x, R, up); x.fillStyle = up ? col : shade(col, .12); x.fill(); x.save(); x.clip(); x.fillStyle = x.createPattern(MB.grain(), 'repeat'); x.fillRect(-10, -wh, ww + 20, wh * 2);
      // inner lighter panel + pattern
      x.fillStyle = rgba('#ffffff', .18); x.beginPath(); x.ellipse(R * (up ? .62 : .5), up ? -R * .38 : R * .5, R * (up ? .42 : .3), R * (up ? .28 : .22), up ? -.4 : .5, 0, TAU); x.fill();
      x.fillStyle = col2 ? col2 : dark; x.strokeStyle = dark; x.lineWidth = R * .04;
      if (pat === 'dots' || !pat) for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(R * (.45 + i * .2), up ? -R * (.25 + (i % 2) * .22) : R * (.35 + (i % 2) * .15), R * .06, 0, TAU); x.fill(); }
      if (pat === 'eyes') { x.beginPath(); x.arc(R * .72, up ? -R * .42 : R * .52, R * .17, 0, TAU); x.fill(); x.fillStyle = light; x.beginPath(); x.arc(R * .72, up ? -R * .42 : R * .52, R * .08, 0, TAU); x.fill(); }
      if (pat === 'bands') { x.lineWidth = R * .1; x.strokeStyle = col2 || dark; x.beginPath(); x.arc(0, 0, R * (up ? .8 : .62), up ? -1.3 : .2, up ? -.1 : 1.2); x.stroke(); }
      if (pat === 'veins') { x.lineWidth = R * .03; for (let i = 0; i < 4; i++) { const a = up ? -1.25 + i * .32 : .25 + i * .3; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * R * 1.1, Math.sin(a) * R * 1.1); x.stroke(); } }
      if (pat === 'stars') { x.fillStyle = col2 || light; star5(x, R * .75, up ? -R * .45 : R * .5, R * .16, R * .07); x.fill(); }
      if (pat === 'moons') { x.fillStyle = col2 || light; x.beginPath(); x.arc(R * .72, up ? -R * .42 : R * .5, R * .15, 0, TAU); x.arc(R * .78, up ? -R * .46 : R * .46, R * .12, 0, TAU, true); x.fill('evenodd'); }
      x.restore();
      // scalloped stitched edge
      wingPath(x, R, up); x.lineWidth = R * .045; x.strokeStyle = dark; x.stroke();
      x.setLineDash([R * .07, R * .06]); x.lineWidth = R * .025; x.strokeStyle = rgba('#ffffff', .5); x.save(); x.translate(R * .06, up ? R * .04 : -R * .02); x.scale(.88, .86); wingPath(x, R, up); x.stroke(); x.restore(); x.setLineDash([]);
      x.restore();
    }
    // body
    const bw = R * .7, bh = R * 1.5, body = canvas(bw * 2 * 2, (bh + R * .6) * 2), y = body.getContext('2d'); y.scale(2, 2); y.translate(bw, R * .45);
    y.strokeStyle = shade(C.cream, -.45); y.lineWidth = R * .05; y.lineCap = 'round';
    for (const sd of [-1, 1]) { y.beginPath(); y.moveTo(sd * R * .1, R * .05); y.quadraticCurveTo(sd * R * .2, -R * .25, sd * R * .42, -R * .36); y.stroke(); y.fillStyle = C.coral; y.beginPath(); y.ellipse(sd * R * .45, -R * .36, R * .09, R * .06, 0, 0, TAU); y.fill(); }
    y.fillStyle = shade(C.cream, -.08); y.beginPath(); y.ellipse(0, R * .62, R * .3, R * .62, 0, 0, TAU); y.fill(); y.save(); y.clip(); y.fillStyle = y.createPattern(MB.grain(), 'repeat'); y.fillRect(-bw, -R, bw * 2, bh * 2); y.restore();
    y.lineWidth = R * .035; y.strokeStyle = shade(C.cream, -.4); y.stroke();
    const out = { wing, body, ww, wh, bw, bh: bh + R * .6, R };
    MOTHC[key] = out; return out;
  };
  // draw a moth with flap phase f (0..1 wing openness), letter label
  MB.drawMoth = function (ctx, x, y, R, o) {
    o = o || {}; const sp = MB.mothSprite(o.col || C.mint, R, o.pat, o.col2); const open = o.open == null ? 1 : o.open;
    ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.scale) ctx.scale(o.scale, o.scale); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.glow !== false) MB.glow(ctx, 0, 0, R * 2.3, o.glowCol || C.glow, o.glowA == null ? .9 : o.glowA);
    const sx = .35 + .65 * open;
    for (const sd of [-1, 1]) { ctx.save(); ctx.scale(sd * sx, 1); ctx.drawImage(sp.wing, -R * .05, -sp.wh / 2, sp.ww, sp.wh); ctx.restore(); }
    ctx.drawImage(sp.body, -sp.bw, -R * .45 - R * .25, sp.bw * 2, sp.bh);
    if (o.label != null) {
      const L = String(o.label), fs = R * (L.length > 2 ? .62 : L.length > 1 ? .82 : 1.02);
      // glowing letter "lantern" on the body
      ctx.fillStyle = rgba('#fff7dc', .92); ctx.beginPath(); ctx.ellipse(0, R * .25, R * (L.length > 1 ? .62 : .5), R * .5, 0, 0, TAU); ctx.fill();
      HX.UI.text(ctx, L, 0, R * .27, { size: fs, color: o.ink || '#2a1f5c', weight: 700, display: true });
    }
    ctx.restore();
  };

  /* ---------- the lantern jar ---------- */
  // geometry relative to (cx, cy) centre and body width w, height h
  MB.drawJar = function (ctx, cx, cy, w, h, glowAmt, t) {
    const x = cx - w / 2, y = cy - h / 2, nr = w * .36, neckH = h * .09, lidH = h * .07;
    ctx.save();
    // lantern light pool on the ground
    MB.glow(ctx, cx, cy + h * .1, Math.max(w, h) * (1.05 + glowAmt * .25), C.marigold, .55 + glowAmt * .45);
    // handle wire
    ctx.strokeStyle = '#6b5a8f'; ctx.lineWidth = Math.max(3, w * .03); ctx.beginPath(); ctx.ellipse(cx, y - neckH - lidH * .4, nr * 1.05, h * .14, 0, Math.PI, TAU); ctx.stroke();
    // lid (paper-cut tin)
    ctx.fillStyle = '#4e4377'; MB.rr(ctx, cx - nr * 1.12, y - neckH - lidH, nr * 2.24, lidH, lidH * .3); ctx.fill(); ctx.strokeStyle = '#2c2450'; ctx.lineWidth = Math.max(2, w * .015); ctx.stroke();
    ctx.fillStyle = '#6a5d9a'; ctx.fillRect(cx - nr * 1.05, y - neckH - lidH * .62, nr * 2.1, lidH * .18);
    // glass body path
    const path = () => { ctx.beginPath(); ctx.moveTo(cx - nr, y - neckH); ctx.lineTo(cx - nr, y); ctx.bezierCurveTo(cx - w / 2, y + h * .02, x, y + h * .08, x, y + h * .22); ctx.lineTo(x, y + h * .86); ctx.quadraticCurveTo(x, y + h, x + w * .14, y + h); ctx.lineTo(x + w * .86, y + h); ctx.quadraticCurveTo(x + w, y + h, x + w, y + h * .86); ctx.lineTo(x + w, y + h * .22); ctx.bezierCurveTo(x + w, y + h * .08, cx + w / 2, y + h * .02, cx + nr, y); ctx.lineTo(cx + nr, y - neckH); ctx.closePath(); };
    path(); ctx.fillStyle = 'rgba(120,140,200,.16)'; ctx.fill();
    ctx.save(); path(); ctx.clip();
    // inner glow
    const gi = ctx.createRadialGradient(cx, y + h * .72, 0, cx, y + h * .6, h * .75); gi.addColorStop(0, rgba(C.gold, .55 + glowAmt * .4)); gi.addColorStop(.5, rgba(C.marigold, .22 + glowAmt * .25)); gi.addColorStop(1, 'rgba(245,179,53,0)'); ctx.fillStyle = gi; ctx.fillRect(x - 10, y - neckH, w + 20, h + neckH);
    // glowing dust at the bottom
    ctx.fillStyle = rgba(C.gold, .55 + glowAmt * .3); ctx.beginPath(); ctx.ellipse(cx, y + h * .97, w * .44, h * .09, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 22; i++) { const px = x + w * (.1 + ((i * 37) % 80) / 100), py = y + h * (.35 + ((i * 53) % 60) / 100) - ((t * 14 + i * 9) % (h * .3)); ctx.globalAlpha = .35 + .4 * Math.sin(t * 2 + i); ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(px, py, Math.max(1, w * .008), 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    // glass highlights
    ctx.fillStyle = 'rgba(255,255,255,.16)'; MB.rr(ctx, x + w * .07, y + h * .2, w * .07, h * .6, w * .035); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.08)'; MB.rr(ctx, x + w * .85, y + h * .25, w * .04, h * .45, w * .02); ctx.fill();
    ctx.restore();
    path(); ctx.lineWidth = Math.max(2.5, w * .022); ctx.strokeStyle = 'rgba(210,220,255,.5)'; ctx.stroke();
    ctx.restore();
    return { x, y, w, h, neckY: y - neckH };
  };

  /* ---------- mascot: fuzzy moth holding a lantern ---------- */
  MB.drawMascot = function (ctx, x, y, R, t, mood) {
    ctx.save(); ctx.translate(x, y + Math.sin(t * 2) * R * .04);
    MB.glow(ctx, R * .45, R * .35, R * 1.8, C.marigold, .7);
    const flap = .85 + .15 * Math.sin(t * 6);
    // wings (felt moth wings: mint left, coral right, upper + lower with stitched edges)
    for (const sd of [-1, 1]) { const sp = MB.mothSprite(sd < 0 ? '#9fd9bf' : '#ec9f98', R * .82, sd < 0 ? 'veins' : 'dots', sd < 0 ? '#6fae95' : '#c27a7a'); ctx.save(); ctx.scale(sd * flap, 1); ctx.rotate(-.12); ctx.drawImage(sp.wing, R * .18, -sp.wh / 2 + R * .1, sp.ww, sp.wh); ctx.restore(); }
    // fuzzy body
    ctx.fillStyle = '#ead6ad'; ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, rr = R * (.62 + .035 * Math.sin(a * 13)); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 1.05 + R * .1); } ctx.closePath(); ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = ctx.createPattern(MB.grain(), 'repeat'); ctx.fillRect(-R, -R, R * 2, R * 2); ctx.restore();
    ctx.strokeStyle = '#b9a07a'; ctx.lineWidth = R * .03; ctx.stroke();
    // antennae (feathery)
    for (const sd of [-1, 1]) { ctx.save(); ctx.translate(sd * R * .22, -R * .5); ctx.rotate(sd * .4); ctx.fillStyle = C.coral; ctx.beginPath(); ctx.ellipse(0, -R * .28, R * .09, R * .3, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#b5594d'; ctx.lineWidth = R * .02; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, -R * (.05 + i * .1)); ctx.lineTo(sd * R * .08, -R * (.1 + i * .1)); ctx.stroke(); } ctx.restore(); }
    // face
    const blink = (t % 4) < .12 ? .15 : 1;
    ctx.fillStyle = '#2a1f3c'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * R * .2, -R * .02, R * .07, R * .085 * blink, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#fff'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * R * .2 + R * .02, -R * .05, R * .025 * blink, 0, TAU); ctx.fill(); }
    ctx.fillStyle = rgba(C.coral, .55); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * R * .34, R * .1, R * .08, R * .05, 0, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#2a1f3c'; ctx.lineWidth = R * .03; ctx.lineCap = 'round'; ctx.beginPath(); if (mood === 'cheer') ctx.arc(0, R * .08, R * .1, .1, Math.PI - .1); else ctx.arc(0, R * .06, R * .07, .3, Math.PI - .3); ctx.stroke();
    // lantern
    const lx = R * .5, ly = R * .42; ctx.strokeStyle = '#3a2f55'; ctx.lineWidth = R * .03; ctx.beginPath(); ctx.arc(lx, ly - R * .26, R * .08, Math.PI, TAU); ctx.stroke();
    ctx.fillStyle = '#3a2f55'; MB.rr(ctx, lx - R * .16, ly - R * .26, R * .32, R * .07, R * .02); ctx.fill(); MB.rr(ctx, lx - R * .17, ly + R * .2, R * .34, R * .07, R * .02); ctx.fill();
    ctx.fillStyle = '#ffd77a'; MB.rr(ctx, lx - R * .13, ly - R * .2, R * .26, R * .4, R * .06); ctx.fill(); ctx.fillStyle = '#fff4c9'; ctx.beginPath(); ctx.ellipse(lx, ly + R * .02, R * .05, R * .1 + Math.sin(t * 9) * R * .01, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a2f55'; ctx.lineWidth = R * .02; ctx.beginPath(); ctx.moveTo(lx, ly - R * .2); ctx.lineTo(lx, ly + R * .2); ctx.stroke();
    // little arms hugging the lantern
    ctx.fillStyle = '#e0c99c'; for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(lx + k * R * .17, ly, R * .07, R * .1, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  };

  /* ---------- firefly hint buddy ---------- */
  MB.drawFirefly = function (ctx, x, y, R, t, lit) {
    ctx.save(); ctx.translate(x, y);
    MB.glow(ctx, 0, R * .2, R * (lit ? 2.6 : 1.7), C.gold, lit ? 1 : .55);
    const fl = .8 + .2 * Math.sin(t * 14);
    for (const sd of [-1, 1]) { ctx.save(); ctx.scale(sd, 1); ctx.rotate(-.3 * fl); ctx.fillStyle = 'rgba(190,235,215,.85)'; ctx.beginPath(); ctx.ellipse(R * .55, -R * .45, R * .5, R * .28, -.5, 0, TAU); ctx.fill(); ctx.strokeStyle = '#6fae95'; ctx.lineWidth = R * .04; ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = lit ? '#ffe066' : '#f5c84a'; ctx.beginPath(); ctx.ellipse(0, R * .15, R * .78, R * .68, 0, 0, TAU); ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = ctx.createPattern(MB.grain(), 'repeat'); ctx.fillRect(-R, -R, R * 2, R * 2); ctx.restore();
    ctx.strokeStyle = '#b9862a'; ctx.lineWidth = R * .04; ctx.stroke();
    ctx.strokeStyle = '#3a2f55'; ctx.lineWidth = R * .045; ctx.lineCap = 'round'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * R * .18, -R * .45); ctx.quadraticCurveTo(sd * R * .25, -R * .8, sd * R * .4, -R * .85); ctx.stroke(); ctx.fillStyle = '#3a2f55'; ctx.beginPath(); ctx.arc(sd * R * .4, -R * .85, R * .06, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#2a1f3c'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * R * .22, -R * .08, R * .07, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.arc(0, R * .02, R * .12, .2, Math.PI - .2); ctx.stroke();
    ctx.restore();
  };


  /* ---------- logo: chunky felt letters ---------- */
  const LOGOC = {};
  MB.drawLogo = function (ctx, x, y, size, t) {
    const k = Math.round(size); let c = LOGOC[k];
    if (!c) { const s = 2, word = 'Mothabet', cols = [C.marigold, C.marigold, '#f7c25a', C.marigold, C.cream, C.marigold, C.cream, '#f7c25a'], rots = [-.08, .06, -.04, .07, -.06, .05, -.07, .06];
      const fs = size, tmp = canvas(1, 1).getContext('2d'); tmp.font = `700 ${fs}px ${HX.theme.displayFont || 'sans-serif'}`;
      const ws = [...word].map(ch => tmp.measureText(ch).width * .93), tw = ws.reduce((a, b) => a + b, 0);
      c = canvas((tw + fs * .5) * s, fs * 1.5 * s); const z = c.getContext('2d'); z.scale(s, s); z.textAlign = 'center'; z.textBaseline = 'middle'; z.font = `700 ${fs}px ${HX.theme.displayFont || 'sans-serif'}`;
      let px = fs * .25; const cy = fs * .78;
      [...word].forEach((ch, i) => { const cx = px + ws[i] / 2, dy = (i % 2 ? -1 : 1) * fs * .03; z.save(); z.translate(cx, cy + dy); z.rotate(rots[i]);
        z.fillStyle = 'rgba(8,5,30,.6)'; z.fillText(ch, fs * .03, fs * .07);
        z.lineJoin = 'round'; z.lineWidth = fs * .08; z.strokeStyle = shade(cols[i], -.45); z.strokeText(ch, 0, 0); z.fillStyle = cols[i]; z.fillText(ch, 0, 0);
        z.restore(); px += ws[i]; });
      z.globalCompositeOperation = 'source-atop'; z.fillStyle = z.createPattern(MB.grain(), 'repeat'); z.globalAlpha = .9; z.fillRect(0, 0, c.width, c.height);
      const hl = z.createLinearGradient(0, 0, 0, fs * 1.5); hl.addColorStop(0, 'rgba(255,255,255,.18)'); hl.addColorStop(.5, 'rgba(255,255,255,0)'); hl.addColorStop(1, 'rgba(0,0,0,.12)'); z.globalAlpha = 1; z.fillStyle = hl; z.fillRect(0, 0, c.width, c.height);
      c._w = tw + fs * .5; c._h = fs * 1.5; LOGOC[k] = c; }
    ctx.drawImage(c, x - c._w / 2, y - c._h / 2, c._w, c._h); return { w: c._w, h: c._h };
  };

  /* ---------- icons (felt style, centred, size = box) ---------- */
  MB.icon = function (ctx, name, x, y, S, col) {
    ctx.save(); ctx.translate(x, y); const s = S / 2; col = col || C.cream; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const ink = '#2a1f5c';
    switch (name) {
      case 'speaker': { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-s * .75, -s * .28); ctx.lineTo(-s * .35, -s * .28); ctx.lineTo(s * .1, -s * .7); ctx.lineTo(s * .1, s * .7); ctx.lineTo(-s * .35, s * .28); ctx.lineTo(-s * .75, s * .28); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = s * .13; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(s * .1, 0, s * (.42 + i * .3), -.75, .75); ctx.stroke(); } break; }
      case 'eye': { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-s * .85, 0); ctx.quadraticCurveTo(0, -s * .8, s * .85, 0); ctx.quadraticCurveTo(0, s * .8, -s * .85, 0); ctx.fill(); ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(0, 0, s * .3, 0, TAU); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(s * .1, -s * .1, s * .09, 0, TAU); ctx.fill(); break; }
      case 'ear': { ctx.fillStyle = C.coral; ctx.beginPath(); ctx.moveTo(-s * .1, s * .85); ctx.bezierCurveTo(-s * .7, s * .7, -s * .65, -s * .1, -s * .55, -s * .35); ctx.bezierCurveTo(-s * .4, -s * .9, s * .55, -s * .95, s * .6, -s * .25); ctx.bezierCurveTo(s * .62, s * .2, s * .1, s * .25, s * .15, s * .55); ctx.quadraticCurveTo(s * .15, s * .9, -s * .1, s * .85); ctx.fill();
        ctx.strokeStyle = shade(C.coral, -.4); ctx.lineWidth = s * .1; ctx.beginPath(); ctx.moveTo(-s * .2, s * .2); ctx.bezierCurveTo(-s * .45, -s * .1, -s * .2, -s * .6, s * .15, -s * .45); ctx.quadraticCurveTo(s * .35, -s * .25, s * .05, -s * .05); ctx.stroke();
        ctx.strokeStyle = C.coral; ctx.lineWidth = s * .08; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * s * .95, -s * .3); ctx.lineTo(sd * s * 1.1, -s * .45); ctx.stroke(); } break; }
      case 'pencil': { ctx.rotate(.75); ctx.fillStyle = '#3d4b8c'; MB.rr(ctx, -s * .2, -s * .85, s * .4, s * 1.25, s * .06); ctx.fill(); ctx.fillStyle = C.coral; MB.rr(ctx, -s * .2, -s * .95, s * .4, s * .22, s * .08); ctx.fill(); ctx.fillStyle = '#e8c79a'; ctx.beginPath(); ctx.moveTo(-s * .2, s * .4); ctx.lineTo(s * .2, s * .4); ctx.lineTo(0, s * .85); ctx.closePath(); ctx.fill(); ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(-s * .07, s * .7); ctx.lineTo(s * .07, s * .7); ctx.lineTo(0, s * .85); ctx.closePath(); ctx.fill(); break; }
      case 'calendar': { ctx.fillStyle = C.cream; MB.rr(ctx, -s * .75, -s * .6, s * 1.5, s * 1.4, s * .18); ctx.fill(); ctx.fillStyle = C.coral; MB.rr(ctx, -s * .75, -s * .6, s * 1.5, s * .38, s * .14); ctx.fill(); ctx.fillStyle = ink; for (const k of [-1, 1]) MB.rr(ctx, k * s * .4 - s * .06, -s * .8, s * .12, s * .35, s * .05), ctx.fill(); ctx.fillStyle = '#3d4b8c'; star5(ctx, 0, s * .28, s * .38, s * .16); ctx.fill(); break; }
      case 'flame': { ctx.fillStyle = '#f07a3a'; ctx.beginPath(); ctx.moveTo(0, -s * .95); ctx.bezierCurveTo(s * .5, -s * .45, s * .8, -s * .05, s * .65, s * .4); ctx.bezierCurveTo(s * .5, s * .85, -s * .5, s * .85, -s * .65, s * .4); ctx.bezierCurveTo(-s * .8, 0, -s * .3, -s * .3, -s * .2, -s * .6); ctx.quadraticCurveTo(-s * .05, -s * .3, 0, -s * .95); ctx.fill();
        ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(0, -s * .2); ctx.bezierCurveTo(s * .35, s * .05, s * .4, s * .3, s * .3, s * .5); ctx.bezierCurveTo(s * .15, s * .72, -s * .15, s * .72, -s * .3, s * .5); ctx.bezierCurveTo(-s * .4, s * .25, -s * .1, 0, 0, -s * .2); ctx.fill(); break; }
      case 'jar': { ctx.fillStyle = 'rgba(200,215,255,.3)'; MB.rr(ctx, -s * .55, -s * .45, s * 1.1, s * 1.3, s * .25); ctx.fill(); ctx.strokeStyle = 'rgba(220,230,255,.8)'; ctx.lineWidth = s * .08; ctx.stroke(); ctx.fillStyle = '#6a5d9a'; MB.rr(ctx, -s * .42, -s * .75, s * .84, s * .26, s * .06); ctx.fill();
        for (const [a, b, c2] of [[-.2, .1, C.coral], [.2, .35, C.marigold], [-.1, .55, C.mint]]) { ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(a * s, b * s, s * .16, 0, TAU); ctx.fill(); } break; }
      case 'star': { ctx.fillStyle = C.gold; star5(ctx, 0, s * .05, s * .9, s * .42); ctx.fill(); ctx.strokeStyle = shade(C.gold, -.35); ctx.lineWidth = s * .08; ctx.stroke(); break; }
      case 'lock': { ctx.strokeStyle = col; ctx.lineWidth = s * .2; ctx.beginPath(); ctx.arc(0, -s * .2, s * .38, Math.PI, TAU); ctx.lineTo(s * .38, 0); ctx.moveTo(-s * .38, 0); ctx.lineTo(-s * .38, -s * .2); ctx.stroke(); ctx.fillStyle = col; MB.rr(ctx, -s * .62, -s * .05, s * 1.24, s * .9, s * .16); ctx.fill(); ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(0, s * .35, s * .12, 0, TAU); ctx.fill(); break; }
      case 'book': { ctx.fillStyle = C.mint; MB.rr(ctx, -s * .8, -s * .6, s * .78, s * 1.2, s * .1); ctx.fill(); MB.rr(ctx, s * .02, -s * .6, s * .78, s * 1.2, s * .1); ctx.fill(); ctx.fillStyle = C.cream; MB.rr(ctx, -s * .7, -s * .5, s * .62, s * 1.0, s * .06); ctx.fill(); MB.rr(ctx, s * .08, -s * .5, s * .62, s * 1.0, s * .06); ctx.fill(); ctx.strokeStyle = 'rgba(42,31,92,.4)'; ctx.lineWidth = s * .06; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-s * .6, -s * .25 + i * s * .25); ctx.lineTo(-s * .2, -s * .25 + i * s * .25); ctx.moveTo(s * .2, -s * .25 + i * s * .25); ctx.lineTo(s * .6, -s * .25 + i * s * .25); ctx.stroke(); } break; }
      case 'back': { ctx.strokeStyle = col; ctx.lineWidth = s * .22; ctx.beginPath(); ctx.moveTo(s * .3, -s * .6); ctx.lineTo(-s * .3, 0); ctx.lineTo(s * .3, s * .6); ctx.stroke(); break; }
      case 'home': { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-s * .8, -s * .05); ctx.lineTo(0, -s * .8); ctx.lineTo(s * .8, -s * .05); ctx.lineTo(s * .55, -s * .05); ctx.lineTo(s * .55, s * .75); ctx.lineTo(-s * .55, s * .75); ctx.lineTo(-s * .55, -s * .05); ctx.closePath(); ctx.fill(); ctx.fillStyle = ink; MB.rr(ctx, -s * .18, s * .25, s * .36, s * .5, s * .06); ctx.fill(); break; }
      case 'again': { ctx.strokeStyle = col; ctx.lineWidth = s * .2; ctx.beginPath(); ctx.arc(0, 0, s * .58, -.6, Math.PI * 1.5); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(s * .15, -s * .95); ctx.lineTo(s * .7, -s * .55); ctx.lineTo(s * .1, -s * .25); ctx.closePath(); ctx.fill(); break; }
      case 'next': { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-s * .5, -s * .7); ctx.lineTo(s * .6, 0); ctx.lineTo(-s * .5, s * .7); ctx.closePath(); ctx.fill(); break; }
      case 'path': { ctx.strokeStyle = col; ctx.lineWidth = s * .14; ctx.setLineDash([s * .2, s * .16]); ctx.beginPath(); ctx.moveTo(-s * .7, s * .7); ctx.bezierCurveTo(-s * .2, s * .5, s * .3, s * .2, -s * .2, -s * .1); ctx.bezierCurveTo(-s * .6, -s * .4, s * .2, -s * .7, s * .7, -s * .6); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = C.gold; star5(ctx, s * .65, -s * .62, s * .32, s * .14); ctx.fill(); break; }
      case 'share': { ctx.strokeStyle = col; ctx.lineWidth = s * .16; ctx.beginPath(); ctx.moveTo(0, s * .3); ctx.lineTo(0, -s * .8); ctx.moveTo(-s * .38, -s * .45); ctx.lineTo(0, -s * .85); ctx.lineTo(s * .38, -s * .45); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * .35, -s * .1); ctx.lineTo(-s * .7, -s * .1); ctx.lineTo(-s * .7, s * .8); ctx.lineTo(s * .7, s * .8); ctx.lineTo(s * .7, -s * .1); ctx.lineTo(s * .35, -s * .1); ctx.stroke(); break; }
      case 'check': { ctx.strokeStyle = col; ctx.lineWidth = s * .24; ctx.beginPath(); ctx.moveTo(-s * .6, 0); ctx.lineTo(-s * .15, s * .45); ctx.lineTo(s * .65, -s * .5); ctx.stroke(); break; }
      case 'close': { ctx.strokeStyle = col; ctx.lineWidth = s * .22; ctx.beginPath(); ctx.moveTo(-s * .5, -s * .5); ctx.lineTo(s * .5, s * .5); ctx.moveTo(s * .5, -s * .5); ctx.lineTo(-s * .5, s * .5); ctx.stroke(); break; }
      default: HX.UI.icon(ctx, name, 0, 0, S * .8, col);
    }
    ctx.restore();
  };

  /* ---------- picture hints (paper-cut pictograms, unit space -1..1) ---------- */
  const PICC = {};
  const P = {};
  function E(x, cx, cy, rx, ry, col, rot) { x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, rx, ry, rot || 0, 0, TAU); x.fill(); }
  function R_(x, a, b, w, h, r, col) { x.fillStyle = col; MB.rr(x, a, b, w, h, r); x.fill(); }
  function Pl(x, pts, col) { x.fillStyle = col; x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fill(); }
  function Ln(x, pts, col, w) { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke(); }
  function eyes(x, cx, cy, d, r) { E(x, cx - d, cy, r, r, '#2a1f3c'); E(x, cx + d, cy, r, r, '#2a1f3c'); }
  const CR = C.cream, CO = C.coral, MI = C.mint, MA = C.marigold, LI = C.lilac, RO = C.rose, BR = '#b98a5a', GR = '#7fbf6a', INK = '#2a1f3c', GY = '#b7b3c9';
  P.sun = x => { for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; Pl(x, [[Math.cos(a - .15) * .5, Math.sin(a - .15) * .5], [Math.cos(a) * .92, Math.sin(a) * .92], [Math.cos(a + .15) * .5, Math.sin(a + .15) * .5]], MA); } E(x, 0, 0, .55, .55, C.gold); eyes(x, 0, -.05, .18, .06); Ln(x, [[-.15, .15], [0, .24], [.15, .15]], INK, .05); };
  P.sock = x => { Pl(x, [[-.3, -.85], [.25, -.85], [.25, .25], [.65, .45], [.6, .85], [-.2, .85], [-.4, .55]], CO); R_(x, -.33, -.9, .62, .25, .06, CR); E(x, .1, .2, .12, .12, CR); E(x, -.1, -.3, .1, .1, CR); };
  P.ant = x => { E(x, -.55, .1, .22, .2, INK); E(x, -.1, .15, .2, .16, INK); E(x, .45, .1, .32, .26, INK); for (const k of [-.4, -.1, .25]) Ln(x, [[k, .2], [k - .12, .6]], INK, .06); Ln(x, [[-.65, -.05], [-.8, -.4]], INK, .05); eyes(x, -.58, .05, .07, .04); E(x, -.6, .05, .04, .04, CR); };
  P.apple = x => { E(x, -.22, .12, .5, .62, CO); E(x, .22, .12, .5, .62, CO); Ln(x, [[0, -.45], [.05, -.8]], BR, .09); E(x, .25, -.62, .2, .1, GR, -.5); E(x, -.25, -.05, .1, .18, 'rgba(255,255,255,.35)'); };
  P.tent = x => { Pl(x, [[-.85, .7], [0, -.8], [.85, .7]], CO); Pl(x, [[-.2, .7], [0, .05], [.2, .7]], INK); Ln(x, [[0, -.8], [0, -.95]], BR, .06); Pl(x, [[0, -.95], [.25, -.88], [0, -.8]], MA); };
  P.top = x => { Pl(x, [[-.7, -.2], [.7, -.2], [0, .85]], MI); Pl(x, [[-.7, -.2], [.7, -.2], [.5, -.45], [-.5, -.45]], CO); R_(x, -.07, -.8, .14, .4, .05, BR); Ln(x, [[-.6, -.05], [.6, -.05]], MA, .08); };
  P.pig = x => { E(x, 0, .05, .75, .62, RO); Pl(x, [[-.6, -.4], [-.45, -.8], [-.25, -.5]], RO); Pl(x, [[.6, -.4], [.45, -.8], [.25, -.5]], RO); E(x, 0, .2, .28, .2, '#f5a7bb'); E(x, -.1, .2, .05, .07, INK); E(x, .1, .2, .05, .07, INK); eyes(x, 0, -.15, .28, .06); };
  P.pan = x => { E(x, -.15, 0, .6, .5, '#4a4570'); E(x, -.15, -.05, .48, .38, '#6c6898'); R_(x, .4, -.08, .55, .16, .06, BR); E(x, -.2, -.05, .2, .16, C.gold); };
  P.pot = x => { R_(x, -.6, -.35, 1.2, 1.05, .25, CO); R_(x, -.72, -.48, 1.44, .2, .08, shade(CO, -.2)); E(x, -.75, 0, .15, .1, shade(CO, -.2)); E(x, .75, 0, .15, .1, shade(CO, -.2)); Ln(x, [[-.2, -.65], [-.1, -.85], [-.2, -1]], 'rgba(255,255,255,.6)', .05); Ln(x, [[.2, -.65], [.3, -.85], [.2, -1]], 'rgba(255,255,255,.6)', .05); };
  P.igloo = x => { x.fillStyle = '#e8f2ff'; x.beginPath(); x.arc(0, .55, .85, Math.PI, TAU); x.fill(); x.fillStyle = '#5a6ea8'; x.beginPath(); x.arc(.25, .55, .28, Math.PI, TAU); x.fill(); Ln(x, [[-.85, .3], [.85, .3]], GY, .04); Ln(x, [[-.7, 0], [.7, 0]], GY, .04); Ln(x, [[-.4, -.22], [.4, -.22]], GY, .04); };
  P.insect = x => { E(x, 0, .15, .42, .6, CO); Ln(x, [[0, -.45], [0, .75]], INK, .05); E(x, 0, -.55, .25, .22, INK); for (const k of [-1, 1]) { E(x, k * .18, .0, .09, .09, INK); E(x, k * .2, .4, .08, .08, INK); Ln(x, [[k * .35, -.1], [k * .75, -.3]], INK, .05); Ln(x, [[k * .4, .25], [k * .8, .3]], INK, .05); Ln(x, [[k * .35, .55], [k * .7, .85]], INK, .05); } };
  P.net = x => { Ln(x, [[.2, .2], [.85, .85]], BR, .1); x.strokeStyle = CR; x.lineWidth = .06; x.beginPath(); x.ellipse(-.2, -.2, .55, .5, -.6, 0, TAU); x.stroke(); x.lineWidth = .025; for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(-.2 + i * .14, -.65); x.lineTo(-.2 + i * .14, .25); x.stroke(); x.beginPath(); x.moveTo(-.7, -.2 + i * .13); x.lineTo(.3, -.2 + i * .13); x.stroke(); } };
  P.nut = x => { E(x, 0, .2, .6, .55, BR); R_(x, -.65, -.55, 1.3, .45, .2, shade(BR, -.3)); Ln(x, [[0, -.55], [.05, -.8]], shade(BR, -.4), .08); E(x, -.2, .15, .1, .2, 'rgba(255,255,255,.25)'); };
  P.nest = x => { E(x, 0, .3, .85, .45, BR); E(x, -.25, .05, .2, .25, '#cfe7ff'); E(x, .05, 0, .2, .25, '#cfe7ff'); E(x, .33, .05, .2, .25, '#cfe7ff'); E(x, 0, .4, .8, .3, shade(BR, -.15)); for (let i = 0; i < 6; i++) Ln(x, [[-.7 + i * .25, .25], [-.5 + i * .25, .6]], shade(BR, -.4), .04); };
  P.cat = x => { E(x, 0, .1, .7, .62, LI); Pl(x, [[-.65, -.15], [-.55, -.85], [-.15, -.45]], LI); Pl(x, [[.65, -.15], [.55, -.85], [.15, -.45]], LI); Pl(x, [[-.5, -.3], [-.47, -.65], [-.25, -.42]], RO); Pl(x, [[.5, -.3], [.47, -.65], [.25, -.42]], RO); eyes(x, 0, 0, .25, .07); Pl(x, [[-.07, .15], [.07, .15], [0, .24]], RO); Ln(x, [[-.25, .25], [-.75, .2]], INK, .025); Ln(x, [[.25, .25], [.75, .2]], INK, .025); Ln(x, [[-.25, .32], [-.7, .38]], INK, .025); Ln(x, [[.25, .32], [.7, .38]], INK, .025); };
  P.cup = x => { Pl(x, [[-.55, -.5], [.45, -.5], [.35, .7], [-.45, .7]], MI); x.strokeStyle = MI; x.lineWidth = .14; x.beginPath(); x.arc(.5, .05, .25, -1.3, 1.3); x.stroke(); E(x, -.05, -.5, .5, .1, shade(MI, -.3)); Ln(x, [[-.15, -.7], [-.05, -.9], [-.15, -1]], 'rgba(255,255,255,.6)', .05); };
  P.king = x => { E(x, 0, .25, .5, .55, CR); Pl(x, [[-.55, -.2], [-.55, -.75], [-.28, -.45], [0, -.85], [.28, -.45], [.55, -.75], [.55, -.2]], MA); E(x, 0, -.4, .08, .08, CO); eyes(x, 0, .15, .18, .06); E(x, 0, .55, .3, .22, '#d8d0bf'); };
  P.kite = x => { Pl(x, [[0, -.9], [.55, -.15], [0, .55], [-.55, -.15]], CO); Pl(x, [[0, -.9], [.55, -.15], [0, -.15]], MA); Pl(x, [[0, .55], [-.55, -.15], [0, -.15]], MA); Ln(x, [[0, .55], [.15, .75], [-.05, .85], [.1, 1]], CR, .04); };
  P.egg = x => { E(x, 0, .1, .55, .75, CR); E(x, -.18, -.15, .1, .2, 'rgba(255,255,255,.5)'); };
  P.elf = x => { E(x, 0, .3, .45, .5, '#f3d3b0'); Pl(x, [[-.55, 0], [.55, 0], [.35, -.9]], MI); E(x, .35, -.9, .1, .1, CO); Pl(x, [[-.45, .25], [-.75, .05], [-.45, .45]], '#f3d3b0'); Pl(x, [[.45, .25], [.75, .05], [.45, .45]], '#f3d3b0'); eyes(x, 0, .25, .17, .05); Ln(x, [[-.1, .5], [0, .56], [.1, .5]], INK, .04); };
  P.hat = x => { E(x, 0, .45, .9, .22, LI); R_(x, -.48, -.6, .96, 1.05, .12, LI); R_(x, -.48, .1, .96, .2, .02, CO); };
  P.hen = x => { E(x, -.05, .2, .6, .5, CR); E(x, .35, -.3, .3, .3, CR); Pl(x, [[.25, -.6], [.35, -.85], [.45, -.6], [.55, -.8], [.55, -.55]], CO); Pl(x, [[.62, -.3], [.85, -.22], [.62, -.15]], MA); E(x, .4, -.35, .05, .05, INK); Pl(x, [[-.6, -.1], [-.9, -.45], [-.55, .2]], CR); Ln(x, [[-.1, .7], [-.1, .9]], MA, .05); Ln(x, [[.1, .7], [.1, .9]], MA, .05); };
  P.rat = x => { E(x, -.05, .2, .6, .4, GY); E(x, .55, .05, .25, .22, GY); E(x, .5, -.2, .14, .14, RO); E(x, .8, .08, .05, .05, RO); E(x, .6, 0, .04, .04, INK); x.strokeStyle = GY; x.lineWidth = .06; x.beginPath(); x.moveTo(-.65, .25); x.quadraticCurveTo(-1, .2, -.85, -.2); x.stroke(); };
  P.ring = x => { x.strokeStyle = MA; x.lineWidth = .16; x.beginPath(); x.arc(0, .2, .5, 0, TAU); x.stroke(); Pl(x, [[-.25, -.35], [.25, -.35], [.15, -.55], [-.15, -.55]], '#9be7ff'); Pl(x, [[-.25, -.35], [.25, -.35], [0, -.15]], '#7cc8e8'); };
  P.moon = x => { MB.moon(x, -.1, 0, .75); };
  P.mop = x => { Ln(x, [[.4, -.9], [-.05, .3]], BR, .1); for (let i = 0; i < 7; i++) Ln(x, [[-.05, .25], [-.45 + i * .12, .9]], CR, .1); R_(x, -.2, .15, .3, .18, .04, MI); };
  P.map = x => { Pl(x, [[-.85, -.6], [-.3, -.75], [.3, -.6], [.85, -.75], [.85, .6], [.3, .75], [-.3, .6], [-.85, .75]], CR); Pl(x, [[-.3, -.75], [.3, -.6], [.3, .75], [-.3, .6]], '#e3d0a8'); Ln(x, [[-.6, .4], [-.3, 0], [.1, .2], [.5, -.3]], CO, .05); Ln(x, [[.45, -.4], [.6, -.2]], INK, .06); Ln(x, [[.6, -.4], [.45, -.2]], INK, .06); };
  P.dog = x => { E(x, 0, .1, .6, .55, BR); E(x, -.6, .05, .2, .45, shade(BR, -.3), .3); E(x, .6, .05, .2, .45, shade(BR, -.3), -.3); E(x, 0, .35, .3, .22, CR); E(x, 0, .22, .1, .07, INK); eyes(x, 0, -.05, .22, .06); E(x, 0, .5, .08, .1, RO); };
  P.duck = x => { E(x, -.1, .3, .65, .45, C.gold); E(x, .35, -.3, .3, .3, C.gold); Pl(x, [[.6, -.32], [.92, -.2], [.6, -.12]], CO); E(x, .4, -.35, .05, .05, INK); E(x, -.2, .25, .3, .18, shade(C.gold, -.15), -.3); };
  P.drum = x => { R_(x, -.6, -.3, 1.2, .9, .1, CO); E(x, 0, -.3, .6, .18, CR); E(x, 0, .6, .6, .15, shade(CO, -.2)); Ln(x, [[-.6, -.2], [-.2, .5], [.2, -.2], [.6, .5]], MA, .05); Ln(x, [[-.3, -.95], [.1, -.4]], BR, .07); Ln(x, [[.4, -.95], [.05, -.42]], BR, .07); };
  P.gift = x => { R_(x, -.6, -.2, 1.2, .95, .06, MI); R_(x, -.7, -.42, 1.4, .3, .06, shade(MI, -.15)); R_(x, -.1, -.42, .2, 1.17, 0, CO); E(x, -.25, -.55, .25, .15, CO, .4); E(x, .25, -.55, .25, .15, CO, -.4); };
  P.goat = x => { E(x, 0, .15, .5, .6, CR); E(x, -.5, -.05, .22, .1, CR, .4); E(x, .5, -.05, .22, .1, CR, -.4); Pl(x, [[-.3, -.35], [-.5, -.85], [-.15, -.45]], GY); Pl(x, [[.3, -.35], [.5, -.85], [.15, -.45]], GY); eyes(x, 0, 0, .2, .05); Pl(x, [[-.1, .7], [.1, .7], [0, .95]], CR); E(x, 0, .45, .14, .1, RO); };
  P.octopus = x => { E(x, 0, -.25, .55, .5, LI); for (let i = 0; i < 6; i++) { const a = -.5 + i * .2; x.strokeStyle = LI; x.lineWidth = .14; x.lineCap = 'round'; x.beginPath(); x.moveTo(a * 1.1, .1); x.quadraticCurveTo(a * 1.6, .55, a * 1.3 + (i % 2 ? .15 : -.15), .85); x.stroke(); } eyes(x, 0, -.25, .2, .07); };
  P.ox = x => { E(x, 0, .1, .55, .6, BR); Pl(x, [[-.45, -.35], [-.95, -.6], [-.85, -.3]], CR); Pl(x, [[.45, -.35], [.95, -.6], [.85, -.3]], CR); E(x, 0, .45, .35, .25, '#d9a98a'); E(x, -.12, .45, .05, .06, INK); E(x, .12, .45, .05, .06, INK); eyes(x, 0, -.05, .22, .06); };
  P.umbrella = x => { x.fillStyle = CO; x.beginPath(); x.arc(0, 0, .85, Math.PI, TAU); x.fill(); x.fillStyle = MA; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, .85, Math.PI * 1.33, Math.PI * 1.66); x.fill(); x.strokeStyle = BR; x.lineWidth = .08; x.beginPath(); x.moveTo(0, -.05); x.lineTo(0, .65); x.arc(-.15, .65, .15, 0, Math.PI); x.stroke(); };
  P.up = x => { Pl(x, [[0, -.9], [.65, -.1], [.25, -.1], [.25, .85], [-.25, .85], [-.25, -.1], [-.65, -.1]], MI); };
  P.leaf = x => { MB.leaf(x, -.8, .6, -.75, 1.9, GR); };
  P.log = x => { R_(x, -.8, -.3, 1.4, .6, .3, BR); E(x, .6, 0, .25, .3, '#e3c08f'); x.strokeStyle = shade(BR, -.3); x.lineWidth = .03; x.beginPath(); x.ellipse(.6, 0, .14, .17, 0, 0, TAU); x.stroke(); E(x, -.3, -.35, .15, .1, GR); };
  P.leg = x => { R_(x, -.25, -.9, .45, 1.3, .2, '#f3d3b0'); R_(x, -.25, .3, .75, .4, .18, CO); };
  P.fish = x => { E(x, -.1, 0, .6, .4, MA); Pl(x, [[.4, 0], [.9, -.4], [.85, .4]], CO); E(x, -.45, -.08, .07, .07, INK); x.strokeStyle = shade(MA, -.3); x.lineWidth = .04; x.beginPath(); x.arc(-.15, 0, .25, -1, 1); x.stroke(); };
  P.fan = x => { for (let i = 0; i < 5; i++) { const a = -Math.PI * .85 + i * .3; Pl(x, [[0, .5], [Math.cos(a) * .9, .5 + Math.sin(a) * .9], [Math.cos(a + .28) * .9, .5 + Math.sin(a + .28) * .9]], i % 2 ? CO : MA); } E(x, 0, .5, .1, .1, BR); };
  P.fox = x => { Pl(x, [[-.75, -.35], [-.55, -.9], [-.2, -.45], [.2, -.45], [.55, -.9], [.75, -.35], [0, .7]], '#f29e4c'); Pl(x, [[-.6, -.2], [0, .7], [-.05, .1]], CR); Pl(x, [[.6, -.2], [0, .7], [.05, .1]], CR); E(x, 0, .62, .09, .07, INK); eyes(x, 0, -.08, .25, .06); };
  P.bat = x => { Pl(x, [[0, -.1], [-.4, -.5], [-.9, -.3], [-.75, .1], [-.5, 0], [-.35, .3], [0, .1], [.35, .3], [.5, 0], [.75, .1], [.9, -.3], [.4, -.5]], '#4a3d6e'); E(x, 0, -.05, .25, .3, '#5b4b85'); Pl(x, [[-.2, -.25], [-.15, -.55], [-.05, -.3]], '#5b4b85'); Pl(x, [[.2, -.25], [.15, -.55], [.05, -.3]], '#5b4b85'); E(x, -.09, -.1, .05, .05, C.gold); E(x, .09, -.1, .05, .05, C.gold); };
  P.bed = x => { R_(x, -.85, -.1, 1.7, .5, .08, LI); R_(x, -.85, -.6, .2, 1.3, .05, BR); R_(x, .65, -.3, .2, 1, .05, BR); E(x, -.45, -.2, .2, .13, CR); R_(x, -.3, -.2, 1, .25, .1, CO); };
  P.bug = x => { E(x, 0, .15, .6, .55, CO); Ln(x, [[0, -.35], [0, .7]], INK, .05); E(x, 0, -.45, .3, .2, INK); for (const [a, b] of [[-.25, 0], [.25, 0], [-.3, .35], [.3, .35]]) E(x, a, b, .09, .09, INK); Ln(x, [[-.12, -.6], [-.3, -.85]], INK, .04); Ln(x, [[.12, -.6], [.3, -.85]], INK, .04); };
  P.bus = x => { R_(x, -.9, -.55, 1.8, 1.05, .15, MA); for (let i = 0; i < 4; i++) R_(x, -.78 + i * .4, -.42, .3, .3, .05, '#cfe7ff'); E(x, -.5, .5, .17, .17, INK); E(x, .5, .5, .17, .17, INK); R_(x, -.9, .1, 1.8, .08, 0, CO); };
  P.bell = x => { x.fillStyle = MA; x.beginPath(); x.moveTo(-.65, .45); x.quadraticCurveTo(-.5, .3, -.45, -.2); x.quadraticCurveTo(-.4, -.75, 0, -.75); x.quadraticCurveTo(.4, -.75, .45, -.2); x.quadraticCurveTo(.5, .3, .65, .45); x.closePath(); x.fill(); E(x, 0, .55, .14, .14, shade(MA, -.3)); E(x, 0, -.8, .1, .1, shade(MA, -.3)); };
  P.jam = x => { R_(x, -.5, -.4, 1, 1.2, .2, CO); R_(x, -.55, -.6, 1.1, .25, .06, '#e0d2b0'); R_(x, -.35, -.05, .7, .45, .06, CR); E(x, 0, .17, .12, .12, CO); };
  P.jug = x => { x.fillStyle = MI; x.beginPath(); x.moveTo(-.4, -.6); x.lineTo(.3, -.6); x.lineTo(.45, -.4); x.quadraticCurveTo(.65, .2, .4, .8); x.lineTo(-.45, .8); x.quadraticCurveTo(-.7, .2, -.4, -.4); x.closePath(); x.fill(); x.strokeStyle = MI; x.lineWidth = .12; x.beginPath(); x.arc(-.6, .05, .25, Math.PI * .5, Math.PI * 1.5); x.stroke(); Pl(x, [[.3, -.6], [.6, -.7], [.42, -.45]], MI); };
  P.zip = x => { R_(x, -.12, -.85, .24, 1.7, .06, GY); for (let i = 0; i < 9; i++) R_(x, i % 2 ? -.2 : 0, -.8 + i * .18, .2, .1, .02, shade(GY, -.3)); R_(x, -.18, -.25, .36, .32, .06, MA); R_(x, -.08, .05, .16, .3, .05, MA); };
  P.zero = x => { x.strokeStyle = MI; x.lineWidth = .3; x.beginPath(); x.ellipse(0, 0, .45, .7, 0, 0, TAU); x.stroke(); };
  P.web = x => { x.strokeStyle = CR; x.lineWidth = .035; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * .9, Math.sin(a) * .9); x.stroke(); } for (let r = .25; r < .9; r += .2) { x.beginPath(); for (let i = 0; i <= 8; i++) { const a = i / 8 * TAU; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.stroke(); } E(x, .3, .25, .1, .1, INK); };
  P.worm = x => { x.strokeStyle = RO; x.lineWidth = .3; x.lineCap = 'round'; x.beginPath(); x.moveTo(-.75, .3); x.quadraticCurveTo(-.4, -.4, -.05, .2); x.quadraticCurveTo(.3, .7, .6, -.1); x.stroke(); E(x, .62, -.15, .05, .05, INK); };
  P.van = x => { R_(x, -.9, -.5, 1.4, .95, .15, MI); Pl(x, [[.5, -.25], [.9, -.05], [.9, .45], [.5, .45]], MI); Pl(x, [[.55, -.18], [.82, -.02], [.82, .12], [.55, .12]], '#cfe7ff'); R_(x, -.75, -.35, .5, .35, .05, '#cfe7ff'); E(x, -.5, .5, .17, .17, INK); E(x, .55, .5, .17, .17, INK); };
  P.vase = x => { x.fillStyle = LI; x.beginPath(); x.moveTo(-.25, -.45); x.quadraticCurveTo(-.7, .1, -.35, .85); x.lineTo(.35, .85); x.quadraticCurveTo(.7, .1, .25, -.45); x.closePath(); x.fill(); R_(x, -.3, -.55, .6, .14, .04, shade(LI, -.2)); MB.flower(x, 0, -.75, .25, CO, MA, 6, 0); };
  P.yoyo = x => { E(x, 0, .25, .55, .55, CO); E(x, 0, .25, .3, .3, MA); E(x, 0, .25, .08, .08, CR); Ln(x, [[0, .25], [0, -.95]], CR, .04); };
  P.yak = x => { E(x, 0, .2, .75, .5, BR); for (let i = 0; i < 6; i++) Ln(x, [[-.6 + i * .24, .5], [-.62 + i * .24, .8]], shade(BR, -.3), .08); E(x, .6, -.15, .25, .25, shade(BR, -.2)); Pl(x, [[.45, -.35], [.3, -.65], [.55, -.4]], CR); Pl(x, [[.75, -.35], [.9, -.65], [.65, -.4]], CR); E(x, .65, -.15, .04, .04, INK); };
  P.queen = x => { E(x, 0, .3, .45, .5, '#f3d3b0'); Pl(x, [[-.5, -.15], [-.55, -.7], [-.25, -.4], [0, -.8], [.25, -.4], [.55, -.7], [.5, -.15]], MA); E(x, 0, -.35, .07, .07, RO); eyes(x, 0, .22, .16, .05); Ln(x, [[-.1, .48], [0, .53], [.1, .48]], RO, .04); E(x, -.48, .3, .1, .35, BR); E(x, .48, .3, .1, .35, BR); };
  P.box = x => { Pl(x, [[-.7, -.3], [0, -.6], [.7, -.3], [0, 0]], '#e3c08f'); Pl(x, [[-.7, -.3], [0, 0], [0, .85], [-.7, .55]], '#c9a26c'); Pl(x, [[.7, -.3], [0, 0], [0, .85], [.7, .55]], '#b38a55'); Ln(x, [[-.35, -.45], [.35, -.15]], shade(BR, -.2), .05); };
  P.six = x => { R_(x, -.7, -.7, 1.4, 1.4, .25, CR); for (const [a, b] of [[-.35, -.4], [.35, -.4], [-.35, 0], [.35, 0], [-.35, .4], [.35, .4]]) E(x, a, b, .13, .13, INK); };
  P.lip = x => { x.fillStyle = CO; x.beginPath(); x.moveTo(-.8, 0); x.quadraticCurveTo(-.4, -.45, 0, -.2); x.quadraticCurveTo(.4, -.45, .8, 0); x.quadraticCurveTo(0, .6, -.8, 0); x.fill(); Ln(x, [[-.8, 0], [0, .05], [.8, 0]], shade(CO, -.35), .05); };
  P.wig = x => { for (let i = 0; i < 9; i++) E(x, -.6 + (i % 3) * .6 + (i > 2 && i < 6 ? .3 : 0) * 0, -.4 + Math.floor(i / 3) * .4, .35, .32, i % 2 ? MA : C.gold); E(x, 0, .25, .3, .35, '#f3d3b0'); };
  P.rug = x => { R_(x, -.85, -.45, 1.7, .9, .08, CO); R_(x, -.7, -.3, 1.4, .6, .05, MA); R_(x, -.5, -.15, 1, .3, .05, MI); for (let i = 0; i < 8; i++) { Ln(x, [[-.8 + i * .23, -.45], [-.8 + i * .23, -.6]], CR, .04); Ln(x, [[-.8 + i * .23, .45], [-.8 + i * .23, .6]], CR, .04); } };
  P.ship = x => { Pl(x, [[-.9, .15], [.9, .15], [.6, .7], [-.6, .7]], CO); R_(x, -.05, -.85, .08, 1, 0, BR); Pl(x, [[.03, -.8], [.7, .05], [.03, .05]], CR); Pl(x, [[-.05, -.6], [-.6, .05], [-.05, .05]], MA); for (let i = 0; i < 3; i++) E(x, -.4 + i * .4, .4, .08, .08, CR); };
  P.dish = x => { E(x, 0, .2, .9, .4, CR); E(x, 0, .12, .62, .25, '#e3d6bd'); E(x, -.2, .05, .2, .12, CO); E(x, .2, .05, .18, .1, GR); };
  P.shell = x => { x.fillStyle = RO; x.beginPath(); x.moveTo(0, .7); for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI; x.lineTo(Math.cos(a) * .8, -.1 + Math.sin(a) * .7); } x.closePath(); x.fill(); x.strokeStyle = shade(RO, -.3); x.lineWidth = .04; for (let i = 1; i < 8; i++) { const a = Math.PI + i / 8 * Math.PI; x.beginPath(); x.moveTo(0, .7); x.lineTo(Math.cos(a) * .75, -.1 + Math.sin(a) * .65); x.stroke(); } R_(x, -.2, .6, .4, .2, .05, shade(RO, -.2)); };
  P.sheep = x => { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; E(x, Math.cos(a) * .45, .1 + Math.sin(a) * .32, .3, .3, CR); } E(x, 0, .1, .5, .4, CR); E(x, .6, -.15, .22, .28, INK); E(x, .65, -.2, .04, .04, CR); Ln(x, [[-.3, .5], [-.3, .85]], INK, .08); Ln(x, [[.25, .5], [.25, .85]], INK, .08); };
  P.chick = x => { E(x, 0, .2, .55, .55, C.gold); E(x, 0, -.4, .35, .35, C.gold); Pl(x, [[-.1, -.38], [.1, -.38], [0, -.25]], CO); eyes(x, 0, -.48, .14, .05); Pl(x, [[-.7, .6], [-.4, .3], [-.1, .65], [.2, .3], [.45, .65], [.7, .3], [.7, .9], [-.7, .9]], CR); };
  P.chin = x => { E(x, 0, -.05, .6, .78, '#f3d3b0'); eyes(x, 0, -.25, .22, .06); Ln(x, [[-.2, .2], [0, .3], [.2, .2]], RO, .05); E(x, 0, .62, .22, .12, '#e6b98f'); Ln(x, [[.35, .7], [.75, .9]], MA, .06); Pl(x, [[.75, .9], [.9, .8], [.85, 1]], MA); };
  P.moth = x => { x.save(); x.scale(.01, .01); MB.drawMoth(x, 0, 5, 50, { col: C.lilac, glow: false }); x.restore(); }; // sprite is cached by pixel radius: draw it at R=50 in a 1/100 frame so it isn't built at 0.5 px
  P.bath = x => { R_(x, -.9, -.1, 1.8, .7, .3, CR); R_(x, -.95, -.15, 1.9, .14, .05, '#d6cdb8'); for (let i = 0; i < 6; i++) E(x, -.5 + i * .2, -.25 - (i % 2) * .12, .14, .14, '#dff1ff'); Ln(x, [[-.6, .6], [-.7, .85]], GY, .08); Ln(x, [[.6, .6], [.7, .85]], GY, .08); };
  P.rock = x => { Pl(x, [[-.8, .6], [-.6, -.1], [-.2, -.5], [.35, -.45], [.75, 0], [.85, .6]], GY); Pl(x, [[-.6, -.1], [-.2, -.5], [0, -.1]], shade(GY, .25)); E(x, -.3, .2, .1, .07, shade(GY, -.2)); };
  P.wing = x => { x.fillStyle = CR; x.beginPath(); x.moveTo(-.8, .5); x.quadraticCurveTo(-.6, -.6, .85, -.7); x.quadraticCurveTo(.5, -.3, .7, -.2); x.quadraticCurveTo(.3, 0, .5, .1); x.quadraticCurveTo(0, .3, .2, .45); x.quadraticCurveTo(-.3, .6, -.8, .5); x.fill(); x.strokeStyle = shade(CR, -.3); x.lineWidth = .04; x.stroke(); };
  P.tree = x => { R_(x, -.1, .3, .2, .6, .04, BR); E(x, 0, -.2, .65, .6, GR); E(x, -.35, .05, .35, .3, shade(GR, -.15)); E(x, .35, 0, .35, .3, shade(GR, -.15)); };
  // ---- 1.0 content expansion: 28 more paper-cut picture hints (same kit, same palette)
  P.bag = x => { R_(x, -.62, -.3, 1.24, 1.15, .14, CO); x.strokeStyle = shade(CO, -.25); x.lineWidth = .12; x.beginPath(); x.arc(0, -.3, .36, Math.PI, 0); x.stroke(); R_(x, -.62, .05, 1.24, .14, .02, shade(CO, .25)); E(x, 0, .45, .14, .14, MA); };
  P.cap = x => { x.fillStyle = MI; x.beginPath(); x.moveTo(-.7, .2); x.quadraticCurveTo(-.7, -.65, 0, -.65); x.quadraticCurveTo(.7, -.65, .7, .2); x.closePath(); x.fill(); Pl(x, [[.3, .1], [1, .2], [.95, .4], [.3, .38]], shade(MI, -.25)); R_(x, -.72, .12, 1.1, .2, .06, shade(MI, -.12)); E(x, 0, -.66, .1, .07, CO); Ln(x, [[0, -.6], [0, .1]], shade(MI, -.2), .04); };
  P.can = x => { R_(x, -.5, -.6, 1, 1.35, .08, GY); R_(x, -.5, -.3, 1, .7, 0, CO); E(x, 0, -.6, .5, .12, shade(GY, .3)); E(x, 0, -.6, .38, .08, shade(GY, -.15)); for (const yy of [-.42, .55]) Ln(x, [[-.48, yy], [.48, yy]], shade(GY, -.2), .04); E(x, 0, .05, .2, .2, CR); };
  P.pin = x => { Ln(x, [[0, .05], [0, .95]], GY, .07); E(x, 0, .02, .5, .14, shade(RO, -.2)); R_(x, -.22, -.6, .44, .6, .1, RO); E(x, 0, -.62, .45, .16, shade(RO, .2)); E(x, -.12, -.4, .06, .12, 'rgba(255,255,255,.55)'); };
  P.lid = x => { R_(x, -.7, .1, 1.4, .75, .12, LI); E(x, 0, .1, .7, .12, shade(LI, -.25)); x.save(); x.translate(.1, -.35); x.rotate(-.25); E(x, 0, 0, .8, .14, MA); E(x, 0, -.06, .7, .1, shade(MA, .2)); R_(x, -.12, -.3, .24, .2, .08, shade(MA, -.25)); x.restore(); Ln(x, [[-.9, .45], [-.7, .45]], LI, .1); Ln(x, [[.7, .45], [.9, .45]], LI, .1); };
  P.bib = x => { x.fillStyle = CR; x.beginPath(); x.moveTo(-.55, -.55); x.quadraticCurveTo(-.75, .2, -.4, .65); x.quadraticCurveTo(0, .95, .4, .65); x.quadraticCurveTo(.75, .2, .55, -.55); x.quadraticCurveTo(0, -.05, -.55, -.55); x.fill(); Ln(x, [[-.55, -.55], [-.75, -.85]], CO, .08); Ln(x, [[.55, -.55], [.75, -.85]], CO, .08); x.strokeStyle = CO; x.lineWidth = .05; x.setLineDash([.08, .07]); x.beginPath(); x.moveTo(-.5, -.35); x.quadraticCurveTo(-.65, .2, -.35, .55); x.quadraticCurveTo(0, .8, .35, .55); x.quadraticCurveTo(.65, .2, .5, -.35); x.stroke(); x.setLineDash([]); E(x, 0, .3, .17, .15, RO); E(x, -.07, .25, .03, .03, INK); E(x, .07, .25, .03, .03, INK); };
  P.mug = x => { R_(x, -.6, -.4, .95, 1.15, .16, MA); x.strokeStyle = MA; x.lineWidth = .14; x.beginPath(); x.arc(.38, .15, .27, -1.3, 1.3); x.stroke(); E(x, -.12, -.4, .47, .09, shade(MA, -.35)); E(x, -.12, .15, .16, .16, CR); for (const k of [-.35, -.1, .15]) Ln(x, [[k, -.55], [k + .08, -.72], [k, -.9]], 'rgba(255,255,255,.6)', .05); };
  P.hut = x => { R_(x, -.6, -.05, 1.2, .85, .06, '#d9b07a'); Pl(x, [[-.85, .05], [0, -.8], [.85, .05]], MA); for (let i = 0; i < 5; i++) Ln(x, [[-.6 + i * .3, -.05 + Math.abs(-.6 + i * .3) * .25 - .2], [-.7 + i * .35, .05]], shade(MA, -.25), .04); R_(x, -.2, .3, .4, .5, .18, BR); E(x, .35, .25, .1, .1, C.gold); };
  P.pen = x => { x.save(); x.rotate(-.7); R_(x, -.12, -.85, .24, 1.3, .08, LI); R_(x, -.13, -.85, .26, .32, .06, shade(LI, -.3)); Pl(x, [[-.12, .45], [.12, .45], [0, .85]], CR); E(x, 0, .8, .03, .06, INK); R_(x, .1, -.8, .05, .5, .02, GY); x.restore(); };
  P.ten = x => { x.fillStyle = MA; x.font = '900 1.25px Fredoka, Nunito, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('10', 0, -.1); for (let i = 0; i < 10; i++) E(x, -.72 + (i % 5) * .36, .62 + Math.floor(i / 5) * .26, .1, .1, i < 5 ? CO : MI); };
  P.jet = x => { E(x, 0, 0, .9, .18, CR); Pl(x, [[-.15, -.05], [.25, -.05], [-.25, -.75], [-.45, -.75]], LI); Pl(x, [[-.15, .05], [.25, .05], [-.25, .75], [-.45, .75]], LI); Pl(x, [[-.65, -.05], [-.75, -.4], [-.9, -.4], [-.85, 0]], CO); for (let i = 0; i < 4; i++) E(x, .15 + i * .15, -.04, .04, .04, '#6aa3d9'); E(x, .75, -.03, .1, .07, '#6aa3d9'); };
  P.pup = x => { E(x, -.55, -.15, .22, .45, BR, .3); E(x, .55, -.15, .22, .45, BR, -.3); E(x, 0, 0, .55, .52, '#e8c99a'); E(x, .2, -.2, .17, .15, CR); eyes(x, 0, -.08, .22, .07); E(x, 0, .18, .12, .09, INK); Ln(x, [[-.1, .32], [0, .38], [.1, .32]], INK, .04); E(x, .05, .48, .07, .1, RO); };
  P.shop = x => { R_(x, -.8, -.25, 1.6, 1.05, .04, CR); for (let i = 0; i < 6; i++) Pl(x, [[-.9 + i * .3, -.6], [-.6 + i * .3, -.6], [-.6 + i * .3, -.2], [-.75 + i * .3, -.05], [-.9 + i * .3, -.2]], i % 2 ? CR : CO); R_(x, -.9, -.75, 1.8, .18, .04, shade(CO, -.2)); R_(x, -.65, .1, .7, .4, .04, '#cfe7ff'); R_(x, .2, .1, .4, .7, .04, BR); E(x, .52, .45, .04, .04, C.gold); };
  P.shed = x => { R_(x, -.7, -.15, 1.4, .95, .02, '#c98a5a'); Pl(x, [[-.85, -.1], [0, -.75], [.85, -.1]], shade(CO, -.15)); for (let i = 1; i < 6; i++) Ln(x, [[-.7 + i * .233, -.1], [-.7 + i * .233, .8]], shade('#c98a5a', -.2), .03); R_(x, -.25, .15, .5, .65, .03, shade('#c98a5a', -.3)); Ln(x, [[-.25, .15], [.25, .8]], shade('#c98a5a', .2), .05); Ln(x, [[.25, .15], [-.25, .8]], shade('#c98a5a', .2), .05); };
  P.chest = x => { R_(x, -.8, -.1, 1.6, .85, .06, BR); x.fillStyle = shade(BR, .1); x.beginPath(); x.moveTo(-.8, -.1); x.quadraticCurveTo(0, -.85, .8, -.1); x.closePath(); x.fill(); for (const k of [-.55, .55]) R_(x, k - .07, -.45, .14, 1.2, .02, MA); R_(x, -.82, -.14, 1.64, .1, .02, MA); R_(x, -.13, -.05, .26, .3, .05, C.gold); E(x, 0, .1, .04, .05, INK); for (const [a, b] of [[-.3, -.25], [.25, -.3]]) { E(x, a, b, .06, .06, C.gold); } };
  P.bench = x => { R_(x, -.9, -.45, 1.8, .16, .04, BR); R_(x, -.9, -.18, 1.8, .16, .04, BR); R_(x, -.95, .12, 1.9, .2, .05, shade(BR, .15)); for (const k of [-.7, .62]) { R_(x, k, .3, .1, .55, .02, INK); R_(x, k, -.5, .08, .65, .02, shade(BR, -.35)); } };
  P.teeth = x => { E(x, 0, 0, .85, .55, RO); E(x, 0, .08, .7, .38, '#7a2a4a'); for (let i = 0; i < 5; i++) R_(x, -.55 + i * .22, -.28, .2, .26, .06, '#fffaf0'); for (let i = 0; i < 4; i++) R_(x, -.44 + i * .22, .22, .2, .22, .06, '#fffaf0'); E(x, 0, .38, .3, .08, shade(RO, .1)); };
  P.cash = x => { x.save(); x.rotate(-.15); R_(x, -.85, -.55, 1.5, .8, .08, GR); R_(x, -.75, -.45, 1.3, .6, .05, shade(GR, .25)); E(x, -.1, -.15, .2, .22, GR); x.fillStyle = shade(GR, -.35); x.font = '900 .3px Fredoka, Nunito, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('$', -.1, -.13); x.restore(); for (const [a, b] of [[.45, .55], [.7, .35], [.2, .7]]) { E(x, a, b, .2, .2, C.gold); E(x, a, b, .13, .13, shade(C.gold, -.12)); } };
  P.lock = x => { x.strokeStyle = GY; x.lineWidth = .16; x.beginPath(); x.moveTo(-.35, -.05); x.lineTo(-.35, -.4); x.arc(0, -.4, .35, Math.PI, 0); x.lineTo(.35, -.05); x.stroke(); R_(x, -.6, -.1, 1.2, .95, .14, MA); E(x, 0, .25, .1, .1, INK); R_(x, -.04, .25, .08, .25, .02, INK); };
  P.sack = x => { x.fillStyle = '#d9b07a'; x.beginPath(); x.moveTo(-.3, -.5); x.quadraticCurveTo(-.85, .1, -.65, .7); x.quadraticCurveTo(0, .95, .65, .7); x.quadraticCurveTo(.85, .1, .3, -.5); x.closePath(); x.fill(); Pl(x, [[-.3, -.5], [-.45, -.85], [0, -.65], [.45, -.85], [.3, -.5]], '#d9b07a'); R_(x, -.35, -.58, .7, .12, .05, CO); E(x, -.2, .2, .06, .04, shade('#d9b07a', -.2)); E(x, .25, .4, .06, .04, shade('#d9b07a', -.2)); };
  P.quilt = x => { const cs = [CO, MI, MA, LI, RO, CR]; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) R_(x, -.8 + c * .54, -.8 + r * .54, .52, .52, .05, cs[(r * 3 + c) % 6]); x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = .03; x.setLineDash([.06, .06]); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { x.strokeRect(-.76 + c * .54, -.76 + r * .54, .44, .44); } x.setLineDash([]); };
  P.stick = x => { x.save(); x.rotate(-.6); R_(x, -.07, -.9, .14, 1.8, .07, BR); Ln(x, [[0, -.2], [.3, -.45]], BR, .09); E(x, .38, -.52, .14, .08, GR, -.6); x.restore(); };
  P.frog = x => { E(x, 0, .25, .75, .5, GR); E(x, -.35, -.25, .2, .2, GR); E(x, .35, -.25, .2, .2, GR); E(x, -.35, -.27, .12, .12, '#fffaf0'); E(x, .35, -.27, .12, .12, '#fffaf0'); E(x, -.33, -.27, .06, .06, INK); E(x, .37, -.27, .06, .06, INK); Ln(x, [[-.35, .25], [0, .38], [.35, .25]], shade(GR, -.4), .05); E(x, -.6, .7, .22, .1, shade(GR, -.15)); E(x, .6, .7, .22, .1, shade(GR, -.15)); E(x, -.4, .25, .07, .05, RO); E(x, .4, .25, .07, .05, RO); };
  P.crab = x => { for (const s of [-1, 1]) { for (let i = 0; i < 3; i++) Ln(x, [[s * .4, .2 + i * .12], [s * .75, .35 + i * .18], [s * .85, .6 + i * .12]], CO, .07); Ln(x, [[s * .35, -.05], [s * .6, -.4]], CO, .08); E(x, s * .66, -.55, .2, .15, CO, s * .4); Pl(x, [[s * .6, -.6], [s * .82, -.82], [s * .78, -.55]], '#16123f'); } E(x, 0, .15, .55, .38, CO); Ln(x, [[-.15, -.15], [-.18, -.4]], CO, .05); Ln(x, [[.15, -.15], [.18, -.4]], CO, .05); E(x, -.18, -.42, .07, .07, INK); E(x, .18, -.42, .07, .07, INK); Ln(x, [[-.15, .25], [0, .32], [.15, .25]], INK, .04); };
  P.flag = x => { R_(x, -.65, -.9, .1, 1.8, .05, BR); x.fillStyle = CO; x.beginPath(); x.moveTo(-.55, -.85); x.quadraticCurveTo(-.05, -1, .25, -.8); x.quadraticCurveTo(.55, -.65, .85, -.8); x.lineTo(.85, -.05); x.quadraticCurveTo(.55, .1, .25, -.05); x.quadraticCurveTo(-.05, -.25, -.55, -.1); x.closePath(); x.fill(); x.fillStyle = MA; star5(x, .15, -.45, .2, .09); x.fill(); E(x, -.6, -.92, .1, .1, C.gold); };
  P.hand = x => { const sk = '#f3d3b0'; R_(x, -.45, -.1, .9, .85, .3, sk); [[-.42, -.55, .17], [-.15, -.8, .18], [.13, -.8, .18], [.38, -.6, .17]].forEach(([a, b, w]) => R_(x, a - w / 2, b, w, .9, w / 2, sk)); x.save(); x.translate(-.55, .05); x.rotate(-.7); R_(x, -.09, -.35, .18, .55, .09, sk); x.restore(); Ln(x, [[-.2, .35], [.2, .35]], shade(sk, -.15), .03); };
  P.lamp = x => { Pl(x, [[-.45, -.75], [.45, -.75], [.7, -.05], [-.7, -.05]], MA); R_(x, -.06, -.05, .12, .75, .02, BR); E(x, 0, .78, .45, .1, BR); E(x, 0, .02, .3, .08, 'rgba(255,240,180,.85)'); R_(x, -.7, -.12, 1.4, .08, .03, shade(MA, -.25)); };
  P.sled = x => { R_(x, -.75, -.25, 1.4, .25, .08, CO); for (const k of [-.45, .35]) Ln(x, [[k, 0], [k, .3]], GY, .06); x.strokeStyle = GY; x.lineWidth = .08; x.lineCap = 'round'; x.beginPath(); x.moveTo(-.8, .3); x.lineTo(.7, .3); x.quadraticCurveTo(.95, .3, .9, .05); x.stroke(); E(x, -.3, .62, .5, .06, 'rgba(255,255,255,.55)'); E(x, .3, .7, .45, .05, 'rgba(255,255,255,.4)'); };
  MB.PICS = P;
  MB.hasPic = (k) => !!P[k];
  MB.drawPic = function (ctx, key, x, y, size) {
    const fn = P[key]; if (!fn) return false; const px = Math.max(16, Math.round(size)), ck = key + '|' + px;
    let c = PICC[ck]; if (!c) { const G = window.HXGAME, s = Math.min(3, (G && G.view ? G.view.dpr * G.view.scale : 2)); c = canvas(px * s * 1.25, px * s * 1.25); const z = c.getContext('2d'); z.translate(c.width / 2, c.height / 2); z.scale(px * s / 2, px * s / 2);
      z.shadowColor = 'rgba(5,3,20,.5)'; z.shadowBlur = .06 * px * s / 2; z.shadowOffsetY = .05 * px * s / 2; z.shadowOffsetX = 0; // paper-cut lift (blur in device px: pre-scale)
      try { fn(z); } catch (e) {} PICC[ck] = c; }
    ctx.drawImage(c, x - size * .625, y - size * .625, size * 1.25, size * 1.25); return true;
  };
})(window);
