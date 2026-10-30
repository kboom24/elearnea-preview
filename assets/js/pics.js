/* Elearnea picture library for the Little Lanterns (0-4) games: original paper-cut style SVG art drawn in code (no image files).
   Layered flat shapes, a darker "under-layer" offset for each cut piece, felt texture + soft drop shadow from CSS (.pic).
   El.pic(name, {color}) -> '<svg ...>' (viewBox 0 0 120 120). Palette: #1E1B4B #F5B841 #7CC4A4 #F08A7E #9B8AD1 #F6EBD9 (+ warm browns). */
(function () {
  'use strict';
  const INK = '#2A2152', CREAM = '#F6EBD9', GOLD = '#F5B841', TEAL = '#7CC4A4', CORAL = '#F08A7E', LAV = '#9B8AD1', BROWN = '#B5733A', BROWN_D = '#8E5427', PINK = '#F4A9A0';
  // cut piece: a darker copy 3px lower (the paper edge), then the piece
  const cut = (svg, dark) => (dark ? svg.replace(/fill="[^"]*"/, `fill="${dark}"`).replace(/^<(\w+)/, '<$1 transform="translate(0 3)"') : '') + svg;
  const E = (cx, cy, rx, ry, f, ex) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}"${ex || ''}/>`;
  const C = (cx, cy, r, f, ex) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}"${ex || ''}/>`;
  const P = (d, f, ex) => `<path d="${d}" fill="${f}"${ex || ''}/>`;
  const R = (x, y, w, h, rx, f, ex) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"${ex || ''}/>`;
  const eye = (x, y, r) => { r = r || 4.5; return C(x, y, r, INK) + C(x + r * .35, y - r * .35, r * .38, '#fff'); };
  const cheek = (x, y) => E(x, y, 5, 3.2, CORAL, ' opacity=".55"');
  const smile = (x, y, w) => `<path d="M${x - w} ${y}q${w} ${w * .8} ${w * 2} 0" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`;
  const line = (d, c, w) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w || 3}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const star5 = (cx, cy, R1, R2) => { let d = ''; for (let i = 0; i < 10; i++) { const r = i % 2 ? R2 : R1, a = -Math.PI / 2 + i * Math.PI / 5; d += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1); } return d + 'Z'; };
  const A = {
    cow: () => cut(E(24, 44, 15, 8, '#E9DCC4', ' transform="rotate(-20 24 44)"'), '#C9B994') + cut(E(96, 44, 15, 8, '#E9DCC4', ' transform="rotate(20 96 44)"'), '#C9B994')
      + cut(P('M36 30c-6-10-2-18 4-20-1 7 1 12 6 16z', GOLD), '#C98A1C') + cut(P('M84 30c6-10 2-18-4-20 1 7-1 12-6 16z', GOLD), '#C98A1C')
      + cut(E(60, 58, 32, 36, CREAM), '#D9C6A5') + P('M34 46c4-16 18-20 26-14-2 10-14 16-24 18z', BROWN_D) + P('M84 64c6 4 6 12 2 16-6-2-8-10-2-16z', BROWN_D)
      + cut(E(60, 82, 25, 16, PINK), '#D98378') + E(51, 82, 3.4, 4.5, '#C25F54') + E(69, 82, 3.4, 4.5, '#C25F54') + eye(47, 56) + eye(73, 56),
    duck: () => cut(E(64, 82, 38, 24, GOLD), '#C98A1C') + cut(P('M92 70c10-8 16-6 18-2-4 4-10 8-18 8z', GOLD), '#C98A1C') + cut(E(70, 82, 18, 11, '#FFD36E', ' transform="rotate(-12 70 82)"'))
      + cut(C(44, 46, 22, GOLD), '#C98A1C') + cut(P('M18 48c-8 0-12 4-12 6 6 3 14 3 20-1z', '#F0975A'), '#C2672E') + eye(40, 41) + cheek(48, 52),
    cat: () => cut(P('M28 48 24 14l26 18z', '#B9ABE3'), '#8E7FC4') + cut(P('M92 48l4-34-26 18z', '#B9ABE3'), '#8E7FC4') + P('M31 40 29 22l13 10z', PINK) + P('M89 40l2-18-13 10z', PINK)
      + cut(E(60, 64, 38, 34, '#B9ABE3'), '#8E7FC4') + P('M44 36c4 6 4 10 2 14M60 32v14M76 36c-4 6-4 10-2 14', 'none', ` stroke="${LAV}" stroke-width="4" stroke-linecap="round"`)
      + eye(46, 62, 5) + eye(74, 62, 5) + P('M55 74h10l-5 6z', CORAL) + line('M60 80v4M60 84c-3 4-8 4-10 0M60 84c3 4 8 4 10 0', INK, 2.6)
      + line('M38 78 18 74M38 84 18 88M82 78l20-4M82 84l20 4', '#F6EBD9', 2.2) + cheek(40, 74) + cheek(80, 74),
    dog: () => cut(P('M26 34c-14 4-16 30-8 42 8 2 14-10 16-20z', BROWN_D), '#6A3D1B') + cut(P('M94 34c14 4 16 30 8 42-8 2-14-10-16-20z', BROWN_D), '#6A3D1B')
      + cut(E(60, 60, 34, 36, BROWN), BROWN_D) + cut(E(60, 80, 20, 15, CREAM), '#D9C6A5') + E(60, 72, 8, 6, INK) + C(58, 70, 2, '#fff') + line('M60 78v6M60 84c-3 3-7 3-9 0M60 84c3 3 7 3 9 0', INK, 2.6)
      + eye(47, 54) + eye(73, 54) + E(73, 52, 9, 8, CREAM, ' opacity=".45"') + P('M66 92c0 8 8 8 8 0z', CORAL),
    sheep: () => [[60, 30, 16], [38, 38, 15], [82, 38, 15], [28, 60, 15], [92, 60, 15], [36, 82, 15], [84, 82, 15], [60, 90, 16], [60, 58, 26]].map(([x, y, r]) => cut(C(x, y, r, CREAM), '#D9C6A5')).join('')
      + cut(E(32, 54, 12, 6, '#5B4E7A', ' transform="rotate(-25 32 54)"')) + cut(E(88, 54, 12, 6, '#5B4E7A', ' transform="rotate(25 88 54)"')) + cut(E(60, 62, 17, 22, '#5B4E7A'), '#3B2F5A')
      + eye(53, 58, 3.6) + eye(67, 58, 3.6) + E(60, 74, 5, 3, PINK) + [[52, 38, 8], [60, 34, 8], [68, 38, 8]].map(([x, y, r]) => C(x, y, r, '#fff')).join(''),
    pig: () => cut(P('M30 44 26 18l22 14z', PINK), '#D98378') + cut(P('M90 44l4-26-22 14z', PINK), '#D98378') + cut(E(60, 62, 38, 34, '#F7B8AE'), '#D98378')
      + cut(E(60, 72, 17, 12, CORAL), '#C25F54') + E(54, 72, 3.5, 5, '#A8372F') + E(66, 72, 3.5, 5, '#A8372F') + eye(44, 54) + eye(76, 54) + cheek(34, 74) + cheek(86, 74) + smile(60, 88, 6),
    frog: () => cut(E(60, 74, 44, 30, TEAL), '#4E9479') + cut(C(36, 40, 16, TEAL), '#4E9479') + cut(C(84, 40, 16, TEAL), '#4E9479') + C(36, 40, 10, '#fff') + C(84, 40, 10, '#fff') + eye(37, 41, 5.5) + eye(83, 41, 5.5)
      + cut(E(60, 86, 26, 12, '#B8E3C9')) + line('M36 70q24 18 48 0', INK, 3.6) + cheek(30, 72) + cheek(90, 72),
    bird: () => cut(P('M90 70l22-14-4 24z', '#3A7BA6'), '#2A5B7E') + cut(C(58, 66, 34, '#5DA9D6'), '#3A7BA6') + cut(P('M44 70c10-4 26-2 32 12-12 6-26 2-32-12z', '#3A7BA6')) + cut(E(48, 80, 16, 11, '#BFE0F2'))
      + P('M56 34c-2-8 4-12 8-12-2 4 0 8 2 12z', '#3A7BA6') + cut(P('M22 58l-12 6 12 6z', GOLD), '#C98A1C') + eye(40, 56) + cheek(46, 66),
    owl: () => cut(P('M28 30 32 14l14 12zM92 30l-4-16-14 12z', BROWN_D), '#6A3D1B') + cut(E(60, 66, 38, 44, BROWN), BROWN_D) + cut(E(60, 82, 24, 26, '#E8CFA2'), '#C9A877')
      + [[50, 76], [60, 72], [70, 76], [55, 88], [65, 88], [60, 100]].map(([x, y]) => P(`M${x - 4} ${y}q4 5 8 0`, 'none', ` stroke="#C9A877" stroke-width="2.4"`)).join('')
      + cut(C(44, 48, 15, GOLD), '#C98A1C') + cut(C(76, 48, 15, GOLD), '#C98A1C') + C(44, 48, 10, '#fff') + C(76, 48, 10, '#fff') + eye(44, 49, 6) + eye(76, 49, 6) + cut(P('M55 60h10l-5 10z', '#F0975A'), '#C2672E'),
    elephant: () => cut(E(26, 54, 22, 28, '#B7B0D6'), '#8F87B8') + cut(E(94, 54, 22, 28, '#B7B0D6'), '#8F87B8') + E(28, 54, 13, 18, PINK, ' opacity=".7"') + E(92, 54, 13, 18, PINK, ' opacity=".7"')
      + cut(E(60, 54, 28, 30, '#A9A3C9'), '#8F87B8') + cut(P('M52 66c0 18-2 30 6 38 6 6 14 2 12-4-6 2-8-4-8-12V66z', '#A9A3C9'), '#8F87B8') + eye(48, 50) + eye(72, 50) + cheek(44, 64) + cheek(76, 64)
      + line('M54 84h8M54 94h8', '#8F87B8', 2.4),
    mouse: () => cut(C(36, 40, 20, '#C9C2DA'), '#9F97B8') + cut(C(84, 40, 20, '#C9C2DA'), '#9F97B8') + C(36, 40, 12, PINK) + C(84, 40, 12, PINK) + line('M84 92c16 4 24 14 26 24', '#9F97B8', 4)
      + cut(E(60, 72, 28, 26, '#C9C2DA'), '#9F97B8') + eye(50, 68, 4) + eye(70, 68, 4) + C(60, 80, 4.5, CORAL) + line('M48 84 28 82M48 88 30 92M72 84l20-2M72 88l18 4', INK, 1.6),
    // loud / quiet pairs (Lantern Barn loudquiet): lion/kitten, big drum (drum)/little bell, fire truck/bicycle, thunder/rain, cow/chick,
    // trumpet/flute, dog/puppy, elephant/mouse
    lion: () => Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return cut(C(60 + 38 * Math.cos(a), 62 + 36 * Math.sin(a), 15, '#E0873E'), '#B5662A'); }).join('')
      + cut(C(40, 38, 9, GOLD), '#C98A1C') + cut(C(80, 38, 9, GOLD), '#C98A1C') + C(40, 38, 4.5, CORAL, ' opacity=".7"') + C(80, 38, 4.5, CORAL, ' opacity=".7"')
      + cut(E(60, 64, 30, 28, '#F5C76A'), '#C98A1C') + cut(E(60, 78, 14, 10, CREAM), '#D9C6A5') + P('M53 70h14l-7 7z', BROWN_D)
      + line('M60 77v4M60 81c-3 4-8 4-10 0M60 81c3 4 8 4 10 0', INK, 2.6) + eye(49, 58) + eye(71, 58) + cheek(42, 72) + cheek(78, 72),
    kitten: () => cut(P('M32 50 30 20l22 16z', '#F6C79A'), '#D9A06A') + cut(P('M88 50l2-30-22 16z', '#F6C79A'), '#D9A06A') + P('M35 42 34 28l10 8z', PINK) + P('M85 42l1-14-10 8z', PINK)
      + cut(E(60, 68, 34, 30, '#F6C79A'), '#D9A06A') + P('M50 40c3 5 3 9 1 12M60 38v12M70 40c-3 5-3 9-1 12', 'none', ` stroke="#E0A060" stroke-width="3.4" stroke-linecap="round"`)
      + eye(47, 64, 6.5) + eye(73, 64, 6.5) + P('M56 75h8l-4 5z', CORAL) + line('M60 80c-2 3-6 3-8 0M60 80c2 3 6 3 8 0', INK, 2.2)
      + line('M40 78 22 75M40 83 23 87M80 78l18-3M80 83l17 4', CREAM, 2) + cheek(40, 76) + cheek(80, 76),
    bell: () => line('M60 22a7 7 0 1 1 0.1 0', BROWN_D, 4) + cut(P('M60 26c-20 0-30 18-30 42v12l-8 10h76l-8-10V68c0-24-10-42-30-42z', GOLD), '#C98A1C')
      + E(46, 54, 5, 12, '#fff', ' opacity=".45" transform="rotate(15 46 54)"') + cut(C(60, 98, 8, BROWN), BROWN_D) + cut(P('M60 30l-12-8v14zM60 30l12-8v14z', CORAL), '#C25F54') + C(60, 30, 4, CORAL),
    firetruck: () => cut(R(6, 50, 80, 40, 6, '#E0584F'), '#A8372F') + cut(P('M78 34h20c6 0 10 6 12 12l4 12v24a8 8 0 0 1-8 8H78z', '#E0584F'), '#A8372F')
      + R(86, 42, 18, 16, 3, '#BFE0F2') + R(6, 72, 108, 6, 2, CREAM) + line('M12 44h60M12 44v-6M72 44v-6M12 38h60M22 38v6M32 38v6M42 38v6M52 38v6M62 38v6', '#D9D4E8', 3)
      + cut(R(84, 26, 14, 8, 3, '#5DA9D6'), '#3A7BA6') + cut(C(28, 92, 12, INK), '#000') + C(28, 92, 5, '#C9C2DA') + cut(C(92, 92, 12, INK), '#000') + C(92, 92, 5, '#C9C2DA') + C(110, 76, 4, GOLD),
    bicycle: () => `<circle cx="30" cy="80" r="21" fill="none" stroke="${INK}" stroke-width="6"/><circle cx="90" cy="80" r="21" fill="none" stroke="${INK}" stroke-width="6"/>`
      + C(30, 80, 4, '#C9C2DA') + C(90, 80, 4, '#C9C2DA') + line('M30 80 50 52h32L90 80M50 52l10 28H30M60 80 82 52', TEAL, 5) + line('M82 52 78 36h12', INK, 4.4) + line('M44 46h14', BROWN_D, 6)
      + cut(C(92, 30, 7, GOLD), '#C98A1C') + C(60, 80, 5, CORAL),
    thunder: () => cut(C(38, 50, 20, '#8C84B8'), '#6E5FAA') + cut(C(62, 38, 26, '#8C84B8'), '#6E5FAA') + cut(C(86, 52, 18, '#8C84B8'), '#6E5FAA') + cut(R(22, 50, 80, 22, 11, '#8C84B8'), '#6E5FAA')
      + cut(P('M64 60 46 90h14l-8 26 28-36H66l10-20z', GOLD), '#C98A1C') + eye(52, 54, 3.6) + eye(70, 54, 3.6),
    rain: () => cut(C(40, 40, 18, '#E3F1FA'), '#A9CDE3') + cut(C(62, 30, 22, '#E3F1FA'), '#A9CDE3') + cut(C(84, 42, 16, '#E3F1FA'), '#A9CDE3') + cut(R(24, 40, 76, 20, 10, '#E3F1FA'), '#A9CDE3')
      + [[38, 70], [60, 80], [82, 70], [48, 96], [72, 98]].map(([x, y]) => cut(P(`M${x} ${y}c-5 8-7 12-7 15a7 7 0 0 0 14 0c0-3-2-7-7-15z`, '#5DA9D6'), '#3A7BA6')).join('') + eye(54, 42, 3) + eye(70, 42, 3) + smile(62, 50, 4),
    chick: () => line('M48 100v10M44 110h8M72 100v10M68 110h8', '#F0975A', 3.4) + cut(C(60, 68, 34, '#FFD95A'), '#C98A1C') + cut(P('M56 36c-2-8 2-12 6-12-1 4 1 8 2 12z', '#FFD95A'), '#C98A1C')
      + cut(E(86, 74, 10, 16, '#F5C341', ' transform="rotate(-20 86 74)"')) + cut(E(34, 74, 10, 16, '#F5C341', ' transform="rotate(20 34 74)"')) + eye(50, 60, 5) + eye(70, 60, 5)
      + cut(P('M54 70h12l-6 8z', '#F0975A'), '#C2672E') + cheek(42, 72) + cheek(78, 72),
    trumpet: () => line('M28 70c0 14 8 20 22 20h26c8 0 10-6 10-12', '#C98A1C', 6) + cut(R(14, 56, 70, 12, 6, GOLD), '#C98A1C') + cut(P('M78 62c14 0 26-12 34-22v56c-8-10-20-22-34-22z', GOLD), '#C98A1C')
      + cut(R(6, 57, 12, 10, 3, '#C98A1C')) + [40, 52, 64].map(x => cut(R(x, 40, 7, 18, 3, '#E8CFA2'), '#C9A877')).join('') + E(98, 54, 4, 10, '#fff', ' opacity=".45"')
      + C(30, 30, 5, LAV) + line('M35 30V12l8 4', LAV, 2.6),
    flute: () => `<g transform="rotate(-24 60 62)">` + cut(R(6, 56, 108, 12, 6, '#D9D4E8'), '#A9A3C9') + [30, 44, 58, 72, 86].map(x => C(x, 62, 2.6, INK)).join('') + R(18, 56, 4, 12, 1, '#A9A3C9') + R(96, 56, 4, 12, 1, '#A9A3C9') + `</g>`
      + C(86, 30, 5, LAV) + line('M91 30V14l8 4', LAV, 2.6) + C(28, 96, 4, TEAL) + line('M32 96V82l6 3', TEAL, 2.2),
    puppy: () => cut(P('M32 42c-12 2-14 26-6 36 8 2 12-10 14-18z', '#C9935A'), '#9C6A36') + cut(P('M88 42c12 2 14 26 6 36-8 2-12-10-14-18z', '#C9935A'), '#9C6A36')
      + cut(E(60, 64, 30, 30, '#F2D6A8'), '#D9B27A') + E(72, 50, 9, 8, '#E8BE86') + cut(E(60, 80, 15, 11, CREAM), '#D9C6A5') + E(60, 74, 6, 4.5, INK)
      + line('M44 62q5 4 10 0M66 62q5 4 10 0', INK, 2.8) + line('M60 79v3M60 82c-2 3-5 3-7 0M60 82c2 3 5 3 7 0', INK, 2.2) + cheek(42, 74) + cheek(78, 74)
      + `<text x="92" y="30" font-family="sans-serif" font-weight="700" font-size="14" fill="${LAV}">z</text><text x="102" y="20" font-family="sans-serif" font-weight="700" font-size="10" fill="${LAV}">z</text>`,
    fish: () => cut(P('M84 60l26-22v44z', '#F0975A'), '#C2672E') + cut(E(54, 60, 38, 26, CORAL), '#C25F54') + P('M44 36c6 10 6 38 0 48M60 36c6 10 6 38 0 48', 'none', ` stroke="#F7B8AE" stroke-width="5" stroke-linecap="round"`)
      + cut(P('M50 34c8-12 22-12 30-4-10 0-20 2-30 4z', '#F0975A')) + eye(30, 54, 5) + smile(28, 68, 4),
    ball: () => cut(C(60, 62, 42, CORAL), '#C25F54') + P('M60 20a42 42 0 0 1 0 84c-14-10-22-26-22-42s8-32 22-42z', GOLD) + P('M60 20c14 10 22 26 22 42s-8 32-22 42a42 42 0 0 0 0-84z', TEAL) + E(46, 42, 9, 6, '#fff', ' opacity=".45" transform="rotate(-30 46 42)"'),
    apple: () => cut(P('M60 38c-10-8-40-8-42 22-2 28 18 44 32 44 4 0 6-2 10-2s6 2 10 2c14 0 34-16 32-44-2-30-32-30-42-22z', '#E0584F'), '#A8372F') + line('M60 38c0-10 2-16 6-20', BROWN_D, 5)
      + cut(P('M64 26c8-12 22-12 26-8-6 10-18 12-26 8z', TEAL), '#4E9479') + E(38, 56, 7, 12, '#fff', ' opacity=".35" transform="rotate(20 38 56)"'),
    banana: () => cut(P('M20 34c6 40 34 62 78 56 6-1 8-6 4-8-34 4-58-14-70-50-2-6-12-6-12 2z', '#FFD95A'), '#C98A1C') + P('M26 40c10 30 34 46 66 46', 'none', ` stroke="#E6B640" stroke-width="3" stroke-linecap="round"`)
      + cut(P('M20 34l-4-10 8-2 4 8z', BROWN_D)) + P('M98 88l8 0 0 6-6 0z', BROWN_D),
    cup: () => cut(P('M84 54h8a14 14 0 0 1 0 28h-8', 'none', ` stroke="#4E9479" stroke-width="8"`)) + cut(P('M26 46h60l-6 50a8 8 0 0 1-8 7H40a8 8 0 0 1-8-7z', TEAL), '#4E9479')
      + R(28, 58, 56, 8, 4, CREAM, ' opacity=".6"') + line('M46 36c-4-6 4-10 0-16M60 36c-4-6 4-10 0-16M74 36c-4-6 4-10 0-16', CREAM, 3.4),
    shoe: () => cut(P('M14 78c0-14 6-30 14-34 8 6 20 8 28 2 8 10 22 14 40 18 10 2 14 8 14 14v6H14z', CORAL), '#C25F54') + cut(R(10, 84, 102, 14, 7, CREAM), '#D9C6A5')
      + line('M40 54l10 6M46 48l10 6M52 44l8 6', '#fff', 3.4) + C(28, 60, 4, GOLD),
    hat: () => cut(E(60, 82, 52, 14, GOLD), '#C98A1C') + cut(P('M30 80c0-30 10-46 30-46s30 16 30 46z', GOLD), '#C98A1C') + R(30, 66, 60, 10, 4, CORAL) + C(84, 62, 7, LAV) + C(90, 70, 5, '#B9ABE3'),
    car: () => cut(P('M12 78c0-10 6-16 16-18l12-18c3-4 8-6 12-6h22c5 0 9 2 12 6l12 18c8 1 14 8 14 18v8H12z', CORAL), '#C25F54') + P('M42 44h14v16H32zM62 44h12l10 16H62z', '#BFE0F2')
      + cut(C(36, 88, 12, INK), '#000') + C(36, 88, 5, '#C9C2DA') + cut(C(86, 88, 12, INK), '#000') + C(86, 88, 5, '#C9C2DA') + C(104, 70, 4, GOLD),
    tree: () => cut(R(52, 68, 16, 40, 5, BROWN), BROWN_D) + cut(C(60, 44, 28, '#5FAE8C'), '#3F7A63') + cut(C(36, 58, 20, TEAL), '#4E9479') + cut(C(84, 58, 20, TEAL), '#4E9479') + cut(C(60, 64, 20, '#8FD3B4'), '#4E9479')
      + C(44, 46, 4, '#E0584F') + C(76, 50, 4, '#E0584F') + C(64, 30, 4, '#E0584F'),
    sun: () => Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5; return cut(P(`M${60 + 34 * Math.cos(a - .14)} ${60 + 34 * Math.sin(a - .14)}L${60 + 54 * Math.cos(a)} ${60 + 54 * Math.sin(a)}L${60 + 34 * Math.cos(a + .14)} ${60 + 34 * Math.sin(a + .14)}z`, '#F0975A')); }).join('')
      + cut(C(60, 60, 32, GOLD), '#C98A1C') + eye(50, 56, 4) + eye(70, 56, 4) + smile(60, 68, 7) + cheek(44, 66) + cheek(76, 66),
    moon: () => cut(P('M74 14a46 46 0 1 0 32 66A38 38 0 0 1 74 14z', CREAM), '#D9C6A5') + C(42, 46, 5, '#E8D9BD') + C(56, 84, 7, '#E8D9BD') + C(34, 72, 4, '#E8D9BD') + eye(60, 56, 3.6) + smile(62, 68, 5),
    star: () => cut(P(star5(60, 62, 50, 22), GOLD), '#C98A1C') + eye(52, 60, 3.8) + eye(68, 60, 3.8) + smile(60, 70, 5),
    flower: () => cut(P('M58 70c-2 16-2 30 2 44h6c-4-14-4-28-2-44z', '#4E9479')) + cut(P('M62 96c10-14 24-16 30-12-8 10-20 14-30 12z', TEAL), '#4E9479')
      + Array.from({ length: 6 }, (_, i) => { const a = i * Math.PI / 3; return cut(C(60 + 20 * Math.cos(a), 46 + 20 * Math.sin(a), 15, CORAL), '#C25F54'); }).join('') + cut(C(60, 46, 13, GOLD), '#C98A1C') + eye(55, 44, 3) + eye(65, 44, 3) + smile(60, 50, 3.5),
    bee: () => cut(E(40, 40, 16, 22, '#fff', ' opacity=".8" transform="rotate(-25 40 40)"')) + cut(E(76, 38, 16, 22, '#fff', ' opacity=".8" transform="rotate(25 76 38)"'))
      + cut(E(58, 70, 36, 26, GOLD), '#C98A1C') + P('M50 46c-6 14-6 34 0 48h10c-6-14-6-34 0-48zM74 48c-5 14-5 30 0 44h8c-4-12-4-30 0-42z', INK) + cut(P('M92 70l14-4-12 10z', INK)) + eye(34, 66, 4.5) + smile(32, 78, 4) + line('M30 48c-4-8-10-10-14-8M38 46c0-8-4-14-8-14', INK, 2.6),
    spoon: () => cut(E(60, 34, 22, 28, '#D9D4E8'), '#A9A3C9') + E(54, 28, 7, 12, '#fff', ' opacity=".6"') + cut(R(54, 58, 12, 56, 6, '#D9D4E8'), '#A9A3C9'),
    log: () => cut(R(14, 44, 86, 44, 22, BROWN), BROWN_D) + cut(E(96, 66, 16, 22, '#E8CFA2'), '#C9A877') + `<ellipse cx="96" cy="66" rx="10" ry="14" fill="none" stroke="${BROWN}" stroke-width="2.6"/><ellipse cx="96" cy="66" rx="4" ry="6" fill="none" stroke="${BROWN}" stroke-width="2.6"/>`
      + line('M24 56h34M30 70h40M22 80h30', BROWN_D, 3) + cut(P('M40 44c-2-10 4-16 10-16-2 6 0 10 2 16z', TEAL)),
    rabbit: () => cut(E(46, 30, 9, 26, CREAM, ' transform="rotate(-10 46 30)"'), '#D9C6A5') + cut(E(74, 30, 9, 26, CREAM, ' transform="rotate(10 74 30)"'), '#D9C6A5') + E(46, 30, 4, 18, PINK, ' transform="rotate(-10 46 30)"') + E(74, 30, 4, 18, PINK, ' transform="rotate(10 74 30)"')
      + cut(E(60, 72, 32, 30, CREAM), '#D9C6A5') + eye(48, 68) + eye(72, 68) + P('M56 78h8l-4 5z', CORAL) + line('M60 83v4', INK, 2.4) + cheek(42, 82) + cheek(78, 82) + R(55, 87, 10, 7, 2, '#fff'),
    butterfly: () => cut(P('M58 58C40 20 6 24 10 46c3 16 24 20 48 12z', LAV), '#6E5FAA') + cut(P('M62 58C80 20 114 24 110 46c-3 16-24 20-48 12z', LAV), '#6E5FAA')
      + cut(P('M58 62c-24-4-42 8-38 24 4 12 26 10 38-24z', CORAL), '#C25F54') + cut(P('M62 62c24-4 42 8 38 24-4 12-26 10-38-24z', CORAL), '#C25F54')
      + C(34, 42, 7, GOLD) + C(86, 42, 7, GOLD) + C(38, 80, 5, CREAM) + C(82, 80, 5, CREAM) + cut(E(60, 62, 5, 26, INK)) + line('M58 38c-4-10-10-14-14-14M62 38c4-10 10-14 14-14', INK, 2.6),
    umbrella: () => cut(P('M10 60a50 46 0 0 1 100 0c-6-6-14-6-20 0-6-6-14-6-20 0-6-6-14-6-20 0-6-6-14-6-20 0-6-6-14-6-20 0z', CORAL), '#C25F54')
      + P('M50 16c-10 10-14 26-10 44M70 16c10 10 14 26 10 44', 'none', ` stroke="#C25F54" stroke-width="3"`) + P('M60 14c-4 14-4 30 0 46', 'none', ` stroke="#C25F54" stroke-width="3"`)
      + line('M60 60v36c0 10-14 10-14 0', INK, 6) + C(60, 12, 4, GOLD),
    balloon: (o) => { const f = (o && o.color) || CORAL, d = (o && o.dark) || '#C25F54'; return line('M60 92c-6 8 6 14 0 26', '#D9C6A5', 2.4) + cut(E(60, 50, 34, 40, f), d) + cut(P('M54 92h12l-6-6z', f), d) + E(46, 34, 7, 12, '#fff', ' opacity=".45" transform="rotate(25 46 34)"'); },
    drum: () => cut(P('M18 46v38c0 12 18 20 42 20s42-8 42-20V46z', '#E0584F'), '#A8372F') + P('M18 54l14 40M46 60l14 44M74 60l-14 44M102 54 88 94M46 60 32 94M74 60l14 34', 'none', ` stroke="${GOLD}" stroke-width="3.4"`)
      + cut(E(60, 46, 42, 14, CREAM), '#D9C6A5') + line('M84 22 66 42M36 22l18 20', BROWN, 5) + C(84, 22, 5, GOLD) + C(36, 22, 5, GOLD),
    // shapes (colored felt shapes; o.color)
    circle: (o) => cut(C(60, 60, 44, (o && o.color) || CORAL), (o && o.dark) || '#C25F54'),
    square: (o) => cut(R(18, 18, 84, 84, 10, (o && o.color) || TEAL), (o && o.dark) || '#4E9479'),
    triangle: (o) => cut(P('M60 12 110 100H10z', (o && o.color) || GOLD, ' stroke-linejoin="round"'), (o && o.dark) || '#C98A1C'),
    starShape: (o) => cut(P(star5(60, 62, 52, 23), (o && o.color) || LAV), (o && o.dark) || '#6E5FAA'),
    heart: (o) => cut(P('M60 104C22 78 8 58 12 38c4-20 30-28 48-6 18-22 44-14 48 6 4 20-10 40-48 66z', (o && o.color) || CORAL), (o && o.dark) || '#C25F54')
  };
  const El = window.El = window.El || {};
  El.pics = A;
  El.pic = (name, o) => `<svg class="pic" viewBox="0 0 120 120" aria-hidden="true">${(A[name] || A.star)(o || {})}</svg>`;
})();
