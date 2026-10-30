/* Wick's Night Garden art: original paper-cut SVG drawn in code (no image files, no clip-art). Same cut-paper language as
   assets/js/pics.js (a darker under-layer 3px lower for every cut piece, felt texture from CSS) and the charter palette.
   NGA.pic(name, o) -> '<svg class="pic" viewBox="0 0 120 120">'; names not drawn here fall back to El.pics (pics.js). */
(function () {
  'use strict';
  const INK = '#2A2152', CREAM = '#F6EBD9', GOLD = '#F5B841', TEAL = '#7CC4A4', TEAL_D = '#4E9479', CORAL = '#F08A7E', LAV = '#9B8AD1', BROWN = '#B5733A', BROWN_D = '#8E5427', PINK = '#F4A9A0', LEAF = '#5FAE8C', LEAF_D = '#3F7A63', SKY = '#5DA9D6', SKY_D = '#3A7BA6';
  const cut = (svg, dark) => (dark ? `<g transform="translate(0 3)">${svg.replace(/fill="[^"]*"/, `fill="${dark}"`)}</g>` : '') + svg; // under-layer in its own group, so pieces with a transform keep it
  const E = (cx, cy, rx, ry, f, ex) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}"${ex || ''}/>`;
  const C = (cx, cy, r, f, ex) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}"${ex || ''}/>`;
  const P = (d, f, ex) => `<path d="${d}" fill="${f}"${ex || ''}/>`;
  const R = (x, y, w, h, rx, f, ex) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"${ex || ''}/>`;
  const line = (d, c, w) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w || 3}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const eye = (x, y, r) => { r = r || 4.5; return C(x, y, r, INK) + C(x + r * .35, y - r * .35, r * .38, '#fff'); };
  const cheek = (x, y) => E(x, y, 5, 3.2, CORAL, ' opacity=".55"');
  const smile = (x, y, w) => `<path d="M${x - w} ${y}q${w} ${w * .8} ${w * 2} 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  const soil = (y) => cut(P(`M14 ${y}q46-12 92 0v${112 - y}H14z`, BROWN_D), '#6A3D1B') + line(`M28 ${y + 8}h8M58 ${y + 12}h10M84 ${y + 7}h8`, '#6A3D1B', 3);
  const leaf = (x, y, s, rot, c, d) => cut(P(`M0 0c${8 * s} ${-10 * s} ${22 * s} ${-10 * s} ${28 * s} 0c${-6 * s} ${10 * s} ${-20 * s} ${10 * s} ${-28 * s} 0z`, c || TEAL, ` transform="translate(${x} ${y}) rotate(${rot})"`), d || TEAL_D);
  const flowerHead = (x, y, r, pc, pd, center, n) => Array.from({ length: n || 7 }, (_, i) => { const a = i * Math.PI * 2 / (n || 7); return cut(E((x + r * Math.cos(a)).toFixed(1), (y + r * Math.sin(a)).toFixed(1), r * .62, r * .42, pc, ` transform="rotate(${(a * 180 / Math.PI).toFixed(0)} ${(x + r * Math.cos(a)).toFixed(1)} ${(y + r * Math.sin(a)).toFixed(1)})"`), pd); }).join('') + cut(C(x, y, r * .62, center || BROWN_D), '#5E3A24');
  const A = {
    // ---- animals & things not in pics.js
    fox: () => cut(P('M28 46 22 12l28 20z', '#E8833A'), '#B85E22') + cut(P('M92 46l6-34-28 20z', '#E8833A'), '#B85E22') + P('M31 38 28 20l14 10z', '#5E3A24') + P('M89 38l3-18-14 10z', '#5E3A24')
      + cut(P('M60 30c22 0 36 16 36 34 0 18-18 34-36 40-18-6-36-22-36-40 0-18 14-34 36-34z', '#E8833A'), '#B85E22')
      + P('M60 104c-10-4-22-14-26-28 8 4 18 4 26 0 8 4 18 4 26 0-4 14-16 24-26 28z', CREAM) + eye(47, 60) + eye(73, 60) + E(60, 82, 6, 4.5, INK) + cheek(40, 74) + cheek(80, 74),
    moth: () => cut(P('M58 56C44 24 10 22 12 46c2 16 24 22 46 14z', LAV), '#6E5FAA') + cut(P('M62 56c14-32 48-34 46-10-2 16-24 22-46 14z', LAV), '#6E5FAA')
      + cut(P('M58 64c-22 0-36 12-30 26 6 10 24 6 30-26z', '#C9BFEA'), '#8E7FC4') + cut(P('M62 64c22 0 36 12 30 26-6 10-24 6-30-26z', '#C9BFEA'), '#8E7FC4')
      + C(32, 44, 8, CREAM, ' opacity=".8"') + C(88, 44, 8, CREAM, ' opacity=".8"') + C(32, 44, 4, GOLD) + C(88, 44, 4, GOLD) + cut(E(60, 62, 7, 24, '#E8D9BD'), '#C9B994') + eye(55, 46, 3) + eye(65, 46, 3)
      + line('M57 40c-6-10-14-14-20-12M63 40c6-10 14-14 20-12', INK, 2.4),
    rock: () => cut(P('M16 92c-4-22 8-44 30-52 14-6 34-4 46 8 14 12 18 30 12 44z', '#9A93B8'), '#6E668F') + P('M34 58c10-8 22-10 32-6', 'none', ' stroke="#C9C2DA" stroke-width="4" stroke-linecap="round"') + C(76, 74, 4, '#7E77A0') + C(44, 80, 3, '#7E77A0') + C(62, 86, 2.5, '#7E77A0'),
    seed: () => cut(E(60, 66, 22, 30, '#C98A4A', ' transform="rotate(20 60 66)"'), BROWN_D) + P('M50 46c6 12 10 26 8 42', 'none', ' stroke="#8E5427" stroke-width="3" stroke-linecap="round"') + E(52, 54, 5, 9, '#fff', ' opacity=".3" transform="rotate(20 52 54)"'),
    grass: () => [[20, -18], [34, -6], [48, 8], [62, -10], [76, 4], [90, 14], [100, -4]].map(([x, r], i) => cut(P(`M${x - 6} 104c0-30 4-52 ${6 + (r / 3)} -${62 + (i % 3) * 8}c2 24 6 44 6 62z`, i % 2 ? LEAF : TEAL), i % 2 ? LEAF_D : TEAL_D)).join('') + soil(100),
    mushroom: () => cut(P('M48 70h24l4 34H44z', CREAM), '#D9C6A5') + cut(P('M14 72c0-30 22-46 46-46s46 16 46 46z', CORAL), '#C25F54') + C(40, 52, 6, CREAM) + C(64, 42, 7, CREAM) + C(84, 58, 5, CREAM) + soil(102),
    robot: () => cut(R(34, 18, 52, 40, 10, '#A9A3C9'), '#8F87B8') + line('M60 18V8', INK, 3) + C(60, 7, 4, CORAL) + R(42, 28, 36, 18, 6, INK) + C(52, 37, 4, GOLD) + C(68, 37, 4, GOLD)
      + cut(R(30, 62, 60, 34, 8, SKY), SKY_D) + R(46, 70, 28, 10, 4, GOLD) + cut(R(36, 96, 14, 16, 4, '#8F87B8')) + cut(R(70, 96, 14, 16, 4, '#8F87B8')) + cut(R(14, 66, 14, 26, 6, '#A9A3C9')) + cut(R(92, 66, 14, 26, 6, '#A9A3C9')),
    spider: () => [-50, -20, 20, 50].map(a => line(`M60 64 ${60 - 42 * Math.cos(a * Math.PI / 180)} ${64 + 30 * Math.sin(a * Math.PI / 180)} l-8 14`, INK, 5) + line(`M60 64 ${60 + 42 * Math.cos(a * Math.PI / 180)} ${64 + 30 * Math.sin(a * Math.PI / 180)} l8 14`, INK, 5)).join('')
      + cut(E(60, 72, 20, 18, '#4A3F7A'), '#2A2152') + cut(C(60, 50, 14, '#5B4E9A'), '#2A2152') + C(54, 48, 4.5, '#fff') + C(66, 48, 4.5, '#fff') + C(55, 49, 2.4, INK) + C(67, 49, 2.4, INK) + smile(60, 56, 4),
    beaver: () => cut(E(88, 92, 26, 12, '#6A3D1B', ' transform="rotate(-20 88 92)"')) + line('M74 88l26-10M78 96l24-10', '#4E2A12', 2) + cut(C(38, 36, 9, BROWN_D), '#6A3D1B') + cut(C(82, 36, 9, BROWN_D), '#6A3D1B')
      + cut(E(60, 66, 34, 36, BROWN), BROWN_D) + cut(E(60, 76, 18, 13, '#D9A066'), '#B5733A') + E(60, 68, 6, 4.5, INK) + R(54, 80, 12, 10, 2, '#fff') + line('M60 80v10', '#D9C6A5', 1.5) + eye(47, 56) + eye(73, 56),
    carrot: () => cut(P('M56 30c-6-12-2-22 4-24 0 8 2 14 4 20 4-8 10-14 18-12-4 6-10 12-18 16z', TEAL), TEAL_D) + cut(P('M44 34c8-6 24-6 30 2 2 28-8 56-16 76-8-20-18-50-14-78z', '#F0975A'), '#C2672E') + line('M50 50h8M54 66h8M56 82h6', '#C2672E', 2.6),
    nectar: () => flowerHead(60, 56, 22, '#F7C6CF', '#D98A99', GOLD, 6) + C(60, 56, 6, '#FFE28A') + line('M60 78v30', TEAL_D, 5) + leaf(62, 96, 1, -30),
    berries: () => line('M60 20c-4 14-14 24-26 30M60 20c6 16 18 24 28 28M60 20v40', BROWN_D, 4) + leaf(60, 22, .9, -60) + [[34, 58], [48, 70], [30, 78], [74, 64], [88, 54], [82, 80], [58, 88]].map(([x, y]) => cut(C(x, y, 12, '#8E5BC9'), '#5E3A8F') + C(x - 4, y - 4, 3, '#fff', ' opacity=".5"')).join(''),
    // ---- needs (lesson 2 choices)
    water: () => cut(P('M60 10c16 26 32 44 32 64a32 32 0 0 1-64 0c0-20 16-38 32-64z', SKY), SKY_D) + P('M44 70c0 12 6 20 16 22', 'none', ' stroke="#BFE0F2" stroke-width="6" stroke-linecap="round"') + eye(50, 70, 3.6) + eye(70, 70, 3.6) + smile(60, 80, 5),
    light: () => C(60, 60, 50, '#F5B841', ' opacity=".22"') + line('M42 22h36M46 22a14 12 0 0 1 28 0', '#3B2F1E', 5) + cut(R(34, 28, 52, 10, 5, '#3B2F1E')) + cut(R(38, 38, 44, 50, 12, '#FFE28A'), '#C98A1C') + C(60, 63, 12, '#FFF6D6') + cut(R(34, 88, 52, 10, 5, '#3B2F1E')),
    food: (o) => A[(o && o.food) || 'berries'](o),
    air: () => line('M14 44h52c12 0 16-16 4-18-6-1-10 4-8 9', '#D9EEF8', 7) + line('M14 64h72c14 0 18 18 4 20-6 1-10-4-8-9', '#BFE0F2', 7) + line('M24 84h34c10 0 12 12 3 13', '#D9EEF8', 6) + C(98, 34, 5, '#fff', ' opacity=".7"'),
    shelter: () => cut(P('M10 62 60 20l50 42z', CORAL), '#C25F54') + cut(R(22, 60, 76, 46, 4, '#E8CFA2'), '#C9A877') + R(48, 74, 24, 32, 12, '#5E3A24') + C(66, 90, 2.5, GOLD) + line('M30 70h12M78 70h12', '#C9A877', 3),
    // ---- homes (lesson 4 choices)
    hollow: () => cut(P('M30 112c4-30 6-70 2-104h56c-4 34-2 74 2 104z', BROWN), BROWN_D) + line('M44 20c2 20 0 40 4 60M78 30c-2 18 0 34-2 56', BROWN_D, 3) + cut(E(60, 56, 15, 19, '#3B1F1A'), '#2A140E') + E(60, 60, 10, 13, '#1E1B4B') + leaf(84, 18, 1, -20) + leaf(14, 20, 1, 10, LEAF, LEAF_D),
    pond: () => cut(E(60, 76, 52, 26, SKY), SKY_D) + E(60, 74, 40, 18, '#7FC1E6') + E(48, 70, 12, 3, '#fff', ' opacity=".5"') + cut(E(86, 76, 13, 6, TEAL), TEAL_D) + P('M86 76l-8-6', 'none', ` stroke="${SKY}" stroke-width="3"`) + [[18, 54], [26, 46], [100, 50]].map(([x, y]) => line(`M${x} ${y + 24}c-2-10 0-18 2-24`, LEAF_D, 4) + cut(E(x + 2, y, 3.5, 9, BROWN_D))).join(''),
    hive: () => line('M60 6v12', BROWN_D, 4) + [[60, 30, 22], [60, 50, 32], [60, 72, 36], [60, 92, 28]].map(([x, y, rx], i) => cut(E(x, y, rx, 12, i % 2 ? '#F5B841' : '#FFD36E'), '#C98A1C')).join('') + cut(E(60, 84, 9, 10, '#5E3A24')) + C(92, 30, 5, GOLD) + E(88, 26, 4, 3, '#fff', ' opacity=".8"'),
    burrow: () => cut(P('M6 66q54-34 108 0v48H6z', LEAF), LEAF_D) + cut(E(60, 92, 26, 20, '#3B1F1A'), '#2A140E') + E(60, 96, 18, 13, '#1E1B4B') + P('M18 112c10-14 20-16 30-12M72 104c12-6 22-4 30 8', 'none', ` stroke="${BROWN_D}" stroke-width="3"`) + [[26, 58], [94, 58]].map(([x, y]) => line(`M${x} ${y}l-4-10M${x} ${y}l4-12M${x} ${y}l8-6`, TEAL_D, 3)).join(''),
    nest: () => line('M4 86h112', BROWN_D, 7) + cut(P('M18 62c4 30 24 40 42 40s38-10 42-40z', '#C98A4A'), BROWN_D) + [0, 1, 2, 3, 4].map(i => line(`M${20 + i * 4} ${66 + i * 6}q40 ${10 - i * 3} ${80 - i * 8} 0`, i % 2 ? '#8E5427' : '#E8CFA2', 2.6)).join('') + cut(E(48, 60, 9, 11, '#BFE0F2'), '#8FB8D0') + cut(E(68, 60, 9, 11, '#BFE0F2'), '#8FB8D0'),
    den: () => cut(P('M2 112c6-56 34-86 58-86s52 30 58 86z', '#8C6A45'), '#5E3A24') + cut(P('M28 112c2-30 16-48 32-48s30 18 32 48z', '#3B1F1A')) + P('M38 112c2-22 10-34 22-34s20 12 22 34z', '#1E1B4B') + line('M20 64q10-8 18-4M84 52q10-4 16 4', '#C9A877', 3) + [[16, 40], [102, 36]].map(([x, y]) => cut(C(x, y, 9, LEAF), LEAF_D)).join(''),
    web: () => line('M60 8V112M8 60h104M22 22l76 76M98 22 22 98', '#E8E4F4', 2.4) + [16, 30, 44].map(r => `<polygon points="${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return (60 + r * Math.cos(a)).toFixed(1) + ',' + (60 + r * Math.sin(a)).toFixed(1); }).join(' ')}" fill="none" stroke="#E8E4F4" stroke-width="2.4"/>`).join('') + C(78, 42, 3, '#BFE0F2') + C(44, 80, 2.5, '#BFE0F2'),
    lodge: () => cut(E(60, 98, 56, 12, SKY), SKY_D) + cut(P('M14 98c4-40 22-62 46-62s42 22 46 62z', '#8E5427'), '#5E3A24') + [[24, 80, 40], [40, 60, -20], [62, 50, 15], [78, 70, -35], [30, 92, -10], [86, 88, 25], [56, 76, 5]].map(([x, y, r]) => R(x - 16, y - 3, 32, 6, 3, '#C98A4A', ` transform="rotate(${r} ${x} ${y})"`)).join('') + E(60, 99, 12, 5, '#1E1B4B'),
    // ---- life-cycle stages (lesson 3): o = plant {petal, petalD, fruit}
    sseed: (o) => soil(84) + cut(E(60, 70, 14, 18, '#C98A4A', ' transform="rotate(20 60 70)"'), BROWN_D) + E(55, 63, 3.5, 6, '#fff', ' opacity=".35"'),
    sprout: () => soil(84) + cut(E(60, 90, 12, 8, '#C98A4A'), BROWN_D) + line('M60 88c0-14 2-24 0-34', LEAF_D, 5) + leaf(60, 56, .8, -150) + leaf(60, 56, .8, -30),
    splant: () => soil(92) + line('M60 96c0-30 2-50 0-70', LEAF_D, 6) + leaf(60, 78, 1.1, -160) + leaf(60, 64, 1.1, -20) + leaf(60, 46, .9, -155) + leaf(60, 34, .8, -30),
    bud: (o) => soil(98) + line('M60 100c0-30 2-56 0-74', LEAF_D, 6) + leaf(60, 84, 1.1, -160) + leaf(60, 70, 1.1, -20) + leaf(60, 54, .9, -155) + cut(E(60, 22, 11, 16, (o && o.petal) || CORAL), (o && o.petalD) || '#C25F54') + P('M49 26c4 6 8 10 11 12 3-2 7-6 11-12-2 12-6 16-11 16s-9-4-11-16z', TEAL),
    bloom: (o) => soil(100) + line('M60 104c0-30 2-50 0-64', LEAF_D, 6) + leaf(60, 90, 1.1, -160) + leaf(60, 76, 1.1, -20) + leaf(60, 62, .9, -155) + flowerHead(60, 32, 18, (o && o.petal) || CORAL, (o && o.petalD) || '#C25F54', o && o.fruit === 'seedhead' ? BROWN_D : GOLD) + eye(55, 31, 2.6) + eye(65, 31, 2.6),
    fruit: (o) => { const f = (o && o.fruit) || 'apple', base = soil(100) + line('M60 104c0-30 2-46 0-58', LEAF_D, 6) + leaf(60, 92, 1.1, -160) + leaf(60, 78, 1.1, -20);
      if (f === 'seedhead') return base + cut(C(60, 40, 26, BROWN_D), '#5E3A24') + Array.from({ length: 14 }, (_, i) => C(60 + 15 * Math.cos(i * 2.4) * (i % 2 ? .5 : 1), 40 + 15 * Math.sin(i * 2.4) * (i % 2 ? .5 : 1), 3, '#E8CFA2')).join('') + Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return E(60 + 30 * Math.cos(a), 40 + 30 * Math.sin(a), 6, 3.5, GOLD, ` transform="rotate(${i * 45} ${60 + 30 * Math.cos(a)} ${40 + 30 * Math.sin(a)})"`); }).join('');
      if (f === 'pumpkin') return soil(100) + line('M30 96c10-10 30-8 40-4', LEAF_D, 4) + leaf(28, 82, 1.1, -150) + cut(E(64, 74, 36, 26, '#F7A23B'), '#C2672E') + line('M50 52c-6 14-6 30 0 44M78 52c6 14 6 30 0 44M64 50v48', '#C2672E', 3) + cut(R(60, 40, 8, 12, 3, LEAF_D));
      if (f === 'pod') return base + line('M60 46c-14 4-18 20-14 40', LEAF_D, 3) + cut(P('M44 44c-8 14-6 36 4 48 4-14 4-34-4-48z', '#8FD3B4'), TEAL_D) + cut(P('M74 40c10 12 10 34 0 48-6-14-6-34 0-48z', '#8FD3B4'), TEAL_D) + [56, 66, 76].map(y => C(48, y, 3, LEAF_D)).join('') + [52, 62, 72].map(y => C(74, y, 3, LEAF_D)).join('');
      if (f === 'poppyhead') return base + cut(P('M42 30c0-14 8-20 18-20s18 6 18 20c0 14-8 22-18 22s-18-8-18-22z', '#9FC9A8'), '#6E9A78') + cut(R(42, 8, 36, 7, 3.5, '#6E9A78')) + C(52, 40, 2.5, INK) + C(64, 44, 2.5, INK) + C(60, 32, 2.5, INK);
      return base + line('M60 46c0-10 10-14 20-12', BROWN_D, 4) + cut(P('M60 40c-8-6-30-6-32 16-2 20 14 32 24 32 3 0 5-2 8-2s5 2 8 2c10 0 26-12 24-32-2-22-24-22-32-16z', '#E0584F'), '#A8372F') + E(42, 54, 5, 9, '#fff', ' opacity=".35"') + leaf(64, 36, .8, -40); },
    // ---- lesson 2 scene cues
    sproutDark: () => A.sprout()
  };
  const pics = () => (window.El && window.El.pics) || {};
  const NGA = window.NGA = {
    has: (n) => !!(A[n] || pics()[n]),
    pic(name, o) { const f = A[name] || pics()[name] || pics().star; return `<svg class="pic" viewBox="0 0 120 120" aria-hidden="true">${f(o || {})}</svg>`; },
    stagePic: (stage) => ({ seed: 'sseed', sprout: 'sprout', plant: 'splant', bud: 'bud', flower: 'bloom', fruit: 'fruit' })[stage]
  };
})();
