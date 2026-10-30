/* Moth Bridge picture words: original paper-cut SVG art drawn in code (same cut-paper style as assets/js/pics.js, which supplies
   cat, hat, dog, pig, cup, sun and log). Every picture is a thing a 5-year-old names without reading. viewBox 0 0 120 120.
   El.wordPic(word) -> '<svg class="pic">...' ; El.wordPics = the drawings (for QA and tiles). */
(function () {
  'use strict';
  const El = window.El;
  const INK = '#2A2152', CREAM = '#F6EBD9', GOLD = '#F5B841', TEAL = '#7CC4A4', CORAL = '#F08A7E', LAV = '#9B8AD1', BROWN = '#B5733A', BROWN_D = '#8E5427', PINK = '#F4A9A0', SKY = '#5DA9D6', GREY = '#8F88A8';
  const cut = (svg, dark) => (dark ? svg.replace(/fill="[^"]*"/, `fill="${dark}"`).replace(/^<(\w+)/, '<$1 transform="translate(0 3)"') : '') + svg;
  const E = (cx, cy, rx, ry, f, ex) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}"${ex || ''}/>`;
  const C = (cx, cy, r, f, ex) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}"${ex || ''}/>`;
  const P = (d, f, ex) => `<path d="${d}" fill="${f}"${ex || ''}/>`;
  const R = (x, y, w, h, rx, f, ex) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"${ex || ''}/>`;
  const line = (d, c, w) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w || 3}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const eye = (x, y, r) => { r = r || 4.5; return C(x, y, r, INK) + C(x + r * .35, y - r * .35, r * .38, '#fff'); };
  const cheek = (x, y) => E(x, y, 5, 3.2, CORAL, ' opacity=".55"');
  const A = {
    // animal bat: spread scalloped wings, round body, pointy ears
    bat: () => cut(P('M60 52C44 34 22 32 6 40c6 4 8 10 6 16 6-4 12-2 14 4 4-6 12-6 16 0 4-6 12-8 18-8z', '#5B4E7A'), '#3B2F5A') + cut(P('M60 52c16-18 38-20 54-12-6 4-8 10-6 16-6-4-12-2-14 4-4-6-12-6-16 0-4-6-12-8-18-8z', '#5B4E7A'), '#3B2F5A')
      + cut(P('M48 40l-2-16 10 9zM72 40l2-16-10 9z', '#6E6290')) + cut(E(60, 56, 15, 17, '#6E6290'), '#3B2F5A') + eye(54, 52, 3.8) + eye(66, 52, 3.8) + P('M56 62l2 4 2-4zM60 62l2 4 2-4z', '#fff') + cheek(50, 60) + cheek(70, 60),
    // rat: grey body, long curly tail, pink ears and nose
    rat: () => line('M26 84c-14 2-20-8-14-16 4-6 12-4 10 2', '#E8A39A', 4.5) + cut(E(58, 78, 34, 20, GREY), '#6E6890') + cut(P('M84 74c8-14 22-14 28-6-6 8-16 14-28 14z', GREY), '#6E6890')
      + cut(C(84, 58, 9, '#A9A2C2'), '#6E6890') + C(84, 58, 5, PINK) + C(111, 70, 4, CORAL) + eye(98, 66, 3.6) + line('M108 74l8 2M108 77l7 5', INK, 1.6) + E(42, 96, 7, 3, '#E8A39A') + E(70, 97, 7, 3, '#E8A39A'),
    // baseball cap: dome + brim + button
    cap: () => cut(P('M18 74c0-26 18-40 40-40 22 0 38 14 38 40z', '#5DA9D6'), '#3A7BA6') + cut(P('M78 70c12-2 26 2 34 10-10 4-26 4-38-2z', '#3A7BA6'), '#2A5B7E')
      + line('M57 36v38M38 44c4 10 6 20 6 30M76 44c-4 10-6 20-6 30', '#BFE0F2', 2.4) + cut(C(57, 34, 5, CORAL)) + R(18, 72, 62, 6, 3, CREAM, ' opacity=".7"'),
    // treasure map: folded paper, dashed path, red X
    map: () => cut(P('M14 30l28-8 36 8 28-8v68l-28 8-36-8-28 8z', '#F2DFB4'), '#C9AF7C') + P('M42 22v68M78 30v68', 'none', ` stroke="#D9C38F" stroke-width="2.4"`)
      + P('M30 58c6-10 18-12 26 2', 'none', ` stroke="${TEAL}" stroke-width="7" stroke-linecap="round" opacity=".7"`) + line('M24 80c10-6 18 2 28-6s18-18 30-8 10 0 14-6', '#B5733A', 3) + P('M24 80', 'none') + `<path d="M24 80c10-6 18 2 28-6s18-18 30-8" fill="none" stroke="#fff" stroke-width="0"/>`
      + line('M84 46l12 12M96 46 84 58', '#D9473F', 5),
    // shopping bag with handles
    bag: () => line('M44 44c0-20 32-20 32 0', BROWN_D, 6) + cut(P('M24 44h72l6 58a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6z', CORAL), '#C25F54') + C(44, 54, 4, '#C25F54') + C(76, 54, 4, '#C25F54') + cut(P('M48 74l12-10 12 10-12 12z', GOLD)),
    // tin can: cylinder with label stripe
    can: () => cut(R(30, 26, 60, 78, 8, '#C9C2DA'), '#8F88A8') + cut(E(60, 26, 30, 8, '#E6E1F0'), '#8F88A8') + E(60, 26, 22, 5, '#B2AACB') + cut(R(30, 48, 60, 34, 2, CORAL), '#C25F54') + C(60, 65, 9, GOLD) + line('M32 90h56M32 40h56', '#A9A2C2', 2),
    // electric fan: cage circle, three petals, stand
    fan: () => cut(R(54, 70, 12, 26, 4, '#8F88A8'), '#6E6890') + cut(E(60, 102, 26, 8, '#8F88A8'), '#6E6890') + cut(C(60, 50, 36, '#BFE0F2'), '#8FB8D4')
      + [0, 120, 240].map(a => P('M60 50c-4-18 4-28 14-26 6 8 0 20-14 26z', SKY, ` transform="rotate(${a} 60 50)"`)).join('') + C(60, 50, 7, CORAL) + line('M60 14v72M24 50h72M35 25l50 50M85 25 35 75', '#fff', 1.2),
    // jam jar: glass jar, red jam, gingham lid, strawberry label
    jam: () => cut(P('M32 46c0-6 4-8 10-8h36c6 0 10 2 10 8v50c0 8-6 12-14 12H46c-8 0-14-4-14-12z', '#D9473F'), '#A8372F') + R(37, 52, 7, 44, 3.5, '#fff', ' opacity=".35"')
      + cut(P('M24 40c0-12 16-18 36-18s36 6 36 18c-4 4-8 2-12 5-4-3-8 0-12-2-4 3-8 1-12-1-4 3-8 1-12-1-4 2-8 4-12 0-4 1-8 3-12-1z', CORAL), '#C25F54') + [[38, 30], [54, 27], [70, 28], [84, 33], [46, 38], [62, 37], [78, 39]].map(([x, y]) => C(x, y, 2.6, '#fff')).join('')
      + line('M30 42c20 6 40 6 60 0', GOLD, 4) + cut(C(60, 74, 15, CREAM)) + P('M53 70c0-5 14-5 14 0 0 9-7 13-7 13s-7-4-7-13z', '#D9473F') + P('M54 68l6-6 6 6z', '#5FAE8C') + C(57, 73, 1.2, GOLD) + C(63, 73, 1.2, GOLD) + C(60, 77, 1.2, GOLD),
    // frying pan: round pan, long handle, an egg
    pan: () => cut(R(84, 56, 34, 12, 6, BROWN_D), '#6A3D1B') + cut(C(52, 62, 40, '#5B4E7A'), '#3B2F5A') + C(52, 62, 32, '#7A6E9E') + cut(P('M36 58c0-12 22-16 30-6 8 8 2 22-12 22-12 0-18-6-18-16z', '#fff')) + cut(C(52, 62, 9, GOLD), '#C98A1C'),
    // leg: a kid's leg with shorts edge, knee and sneaker
    leg: () => cut(R(40, 6, 40, 22, 6, SKY), '#3A7BA6') + cut(P('M46 26h26v52c0 6 2 10 8 12H46z', '#E9B48A'), '#C98C62') + E(58, 52, 8, 5, '#D99E74', ' opacity=".7"') + cut(P('M40 88c0-4 6-6 12-6h22c12 0 26 4 30 12v8H40z', CORAL), '#C25F54') + cut(R(38, 100, 68, 8, 4, CREAM), '#D9C6A5') + line('M58 88l6-4M66 90l6-4', '#fff', 2.6),
    // spider web with a smiling spider
    web: () => [0, 30, 60, 90, 120, 150].map(a => line(`M60 60L${60 + 52 * Math.cos(a * Math.PI / 180)} ${60 + 52 * Math.sin(a * Math.PI / 180)}M60 60L${60 - 52 * Math.cos(a * Math.PI / 180)} ${60 - 52 * Math.sin(a * Math.PI / 180)}`, '#8F88A8', 2.4)).join('')
      + [14, 26, 38, 50].map(r => `<polygon points="${Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180; return (60 + r * Math.cos(a)).toFixed(1) + ',' + (60 + r * Math.sin(a)).toFixed(1); }).join(' ')}" fill="none" stroke="#8F88A8" stroke-width="2.2"/>`).join('')
      + line('M78 20v18', '#8F88A8', 2) + line('M70 44l-8-4M70 50l-9 1M86 44l8-4M86 50l9 1M72 56l-6 6M84 56l6 6', INK, 2.6) + cut(C(78, 48, 9, INK), '#000') + C(75, 46, 2.2, '#fff') + C(81, 46, 2.2, '#fff'),
    // curly wig on a stand
    wig: () => cut(R(54, 86, 12, 20, 3, BROWN_D)) + cut(E(60, 106, 22, 6, BROWN_D), '#6A3D1B') + cut(E(60, 66, 22, 24, '#F2DFB4'), '#C9AF7C')
      + [[38, 40], [50, 30], [64, 28], [78, 34], [88, 46], [34, 56], [90, 62], [32, 72], [92, 78], [44, 50], [76, 48]].map(([x, y]) => cut(C(x, y, 12, '#F08A7E'), '#C25F54')).join(''),
    // push pin
    pin: () => line('M60 70v40', '#8F88A8', 5) + cut(P('M40 70h40l-6-12H46z', '#D9473F'), '#A8372F') + cut(R(48, 28, 24, 32, 6, '#D9473F'), '#A8372F') + cut(E(60, 26, 22, 9, '#E86A5F'), '#A8372F') + R(52, 32, 5, 22, 2.5, '#fff', ' opacity=".5"'),
    // lips: a big smiling mouth
    lip: () => cut(P('M10 60c14-22 30-26 40-16 6-6 14-6 20 0 10-10 26-6 40 16-18 26-82 26-100 0z', '#D9473F'), '#A8372F') + P('M10 60c30 6 70 6 100 0', 'none', ` stroke="#A8372F" stroke-width="4" stroke-linecap="round"`) + E(44, 50, 8, 3, '#fff', ' opacity=".45"'),
    // mop in a bucket
    mop: () => cut(R(56, 4, 8, 70, 4, BROWN), BROWN_D) + [36, 44, 52, 60, 68, 76, 84].map((x, i) => cut(P(`M60 70Q${x} 84 ${x + (i - 3) * 2} 100`, 'none', ` stroke="#B9ABE3" stroke-width="8" stroke-linecap="round"`))).join('') + cut(R(46, 64, 28, 10, 4, TEAL), '#4E9479') + E(60, 106, 34, 6, SKY, ' opacity=".5"'),
    // cooking pot with lid and steam
    pot: () => line('M44 22c-4-6 4-10 0-16M60 22c-4-6 4-10 0-16M76 22c-4-6 4-10 0-16', CREAM, 3.2) + cut(P('M22 52h76v34c0 12-10 20-22 20H44c-12 0-22-8-22-20z', TEAL), '#4E9479') + cut(R(10, 54, 14, 8, 4, '#4E9479')) + cut(R(96, 54, 14, 8, 4, '#4E9479'))
      + cut(P('M18 50c0-10 20-16 42-16s42 6 42 16z', '#8FD3B4'), '#4E9479') + cut(C(60, 32, 6, BROWN_D)) + R(28, 66, 64, 6, 3, CREAM, ' opacity=".55"'),
    // spinning top
    top: () => line('M60 6v20', BROWN_D, 7) + cut(P('M16 50c0-14 20-24 44-24s44 10 44 24c0 14-30 40-44 62-14-22-44-48-44-62z', CORAL), '#C25F54') + P('M18 54c20 10 64 10 84 0', 'none', ` stroke="${GOLD}" stroke-width="8"`) + P('M30 72c16 8 44 8 60 0', 'none', ` stroke="${LAV}" stroke-width="6"`) + E(60, 40, 22, 6, '#fff', ' opacity=".35"'),
    // ladybug
    bug: () => line('M50 28c-4-10-10-14-16-14M70 28c4-10 10-14 16-14', INK, 3) + C(34, 14, 4, INK) + C(86, 14, 4, INK) + cut(C(60, 40, 16, INK), '#000') + eye(54, 38, 3.4) + eye(66, 38, 3.4)
      + cut(E(60, 72, 40, 36, '#D9473F'), '#A8372F') + line('M60 38v70', INK, 3) + [[42, 62, 7], [78, 62, 7], [46, 86, 6], [74, 86, 6], [60, 98, 4]].map(([x, y, r]) => C(x, y, r, INK)).join(''),
    // school bus
    bus: () => cut(P('M8 40c0-8 6-14 14-14h70c10 0 16 6 18 14l4 18v30H8z', GOLD), '#C98A1C') + [16, 38, 60].map(x => R(x, 34, 18, 18, 4, '#BFE0F2')).join('') + R(84, 34, 18, 22, 4, '#BFE0F2')
      + R(8, 62, 106, 6, 0, INK, ' opacity=".7"') + cut(C(30, 90, 11, INK), '#000') + C(30, 90, 4.5, '#C9C2DA') + cut(C(90, 90, 11, INK), '#000') + C(90, 90, 4.5, '#C9C2DA') + C(110, 74, 4, CREAM),
    // mug with a heart
    mug: () => cut(P('M84 46h10a16 16 0 0 1 0 32H84', 'none', ` stroke="#6E6290" stroke-width="9"`)) + cut(R(22, 34, 64, 72, 12, LAV), '#6E6290') + R(22, 34, 64, 10, 5, '#B9ABE3') + P('M54 66c-6-8-18-2-12 8l12 12 12-12c6-10-6-16-12-8z', CORAL)
      + line('M40 26c-4-6 4-10 0-16M56 26c-4-6 4-10 0-16', CREAM, 3.2),
    // striped rug with fringe
    rug: () => [20, 30, 40, 50, 60, 70, 80, 90, 100].map(x => line(`M${x} 28v-10M${x} 92v10`, '#C25F54', 3)).join('') + cut(R(12, 28, 96, 64, 6, CORAL), '#C25F54')
      + R(12, 40, 96, 8, 0, GOLD) + R(12, 72, 96, 8, 0, GOLD) + P('M60 50l12 10-12 10-12-10z', TEAL) + C(30, 60, 5, LAV) + C(90, 60, 5, LAV)
  };
  El.wordPics = A;
  // pictures from the shared library where it already has the word (one look across the app)
  const SHARED = ['cat', 'hat', 'dog', 'pig', 'cup', 'sun', 'log'];
  El.wordPic = (w) => SHARED.includes(w) && El.pic ? El.pic(w) : `<svg class="pic" viewBox="0 0 120 120" aria-hidden="true">${(A[w] || (() => ''))()}</svg>`;
  El.wordPicMissing = (w) => !SHARED.includes(w) && !A[w];
})();
