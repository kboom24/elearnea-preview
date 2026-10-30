/* Extra pictures for the sing-along games (Zoo Parade, Word Stage): same paper-cut SVG style as assets/js/pics.js (original art drawn in code).
   El.songPic(name) -> '<svg class="pic">' ; falls back to El.pic for every picture pics.js already has (cat, duck, frog, owl, mouse, pig, dog, sun...).
   Colors (red, blue, yellow, green) are felt paint blobs; numbers (two..six) are a numeral card with that many dots. */
(function () {
  'use strict';
  const El = window.El;
  const INK = '#2A2152', CREAM = '#F6EBD9', GOLD = '#F5B841', TEAL = '#7CC4A4', CORAL = '#F08A7E', LAV = '#9B8AD1', BROWN = '#B5733A', BROWN_D = '#8E5427', PINK = '#F4A9A0';
  const sh = (svg, dark) => (dark ? svg.replace(/fill="[^"]*"/, `fill="${dark}"`).replace(/^<(\w+)/, '<$1 transform="translate(0 3)"') : '') + svg;
  const E = (cx, cy, rx, ry, f, ex) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}"${ex || ''}/>`;
  const C = (cx, cy, r, f, ex) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}"${ex || ''}/>`;
  const P = (d, f, ex) => `<path d="${d}" fill="${f}"${ex || ''}/>`;
  const R = (x, y, w, h, rx, f, ex) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"${ex || ''}/>`;
  const eye = (x, y, r) => { r = r || 4.5; return C(x, y, r, INK) + C(x + r * .35, y - r * .35, r * .38, '#fff'); };
  const cheek = (x, y) => E(x, y, 5, 3.2, CORAL, ' opacity=".55"');
  const line = (d, c, w) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w || 3}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const blob = (f, d) => sh(P('M60 14c16 0 22 12 34 14s18 16 12 30 4 26-10 38-26 6-38 8-28 0-36-14-16-20-10-36 4-24 18-30 12-18 26-24z', f), d) + E(44, 40, 12, 7, '#fff', ' opacity=".35" transform="rotate(-25 44 40)"');
  const NUM = { two: 2, three: 3, four: 4, five: 5, six: 6 };
  const num = (n) => sh(R(16, 16, 88, 88, 18, CREAM), '#D9C6A5') + `<text x="60" y="64" text-anchor="middle" font-family="Fredoka, Baloo 2, system-ui, sans-serif" font-weight="700" font-size="46" fill="${INK}">${n}</text>`
    + Array.from({ length: n }, (_, i) => C(60 - (n - 1) * 6.5 + i * 13, 88, 4.6, CORAL)).join('');
  const S = {
    bear: () => sh(C(30, 32, 14, BROWN), BROWN_D) + sh(C(90, 32, 14, BROWN), BROWN_D) + C(30, 32, 7, '#E8CFA2') + C(90, 32, 7, '#E8CFA2')
      + sh(E(60, 66, 40, 38, BROWN), BROWN_D) + sh(E(60, 80, 20, 15, '#E8CFA2'), '#C9A877') + E(60, 73, 8, 5.5, INK) + line('M60 78v5M60 83c-4 4-9 3-10 0M60 83c4 4 9 3 10 0', INK, 2.6)
      + eye(44, 58, 5) + eye(76, 58, 5) + cheek(38, 74) + cheek(82, 74),
    panda: () => sh(C(30, 30, 14, INK), '#120E33') + sh(C(90, 30, 14, INK), '#120E33') + sh(E(60, 66, 42, 38, '#FBF6EC'), '#D9C6A5')
      + E(42, 60, 11, 14, INK, ' transform="rotate(20 42 60)"') + E(78, 60, 11, 14, INK, ' transform="rotate(-20 78 60)"') + C(43, 58, 4, '#fff') + C(77, 58, 4, '#fff') + C(44, 57, 1.6, INK) + C(78, 57, 1.6, INK)
      + E(60, 78, 7, 5, INK) + line('M60 82v4M60 86c-4 4-8 3-9 0M60 86c4 4 8 3 9 0', INK, 2.6) + cheek(34, 80) + cheek(86, 80),
    fox: () => sh(P('M30 52 22 16l28 22zM90 52l8-36-28 22z', '#E8813A'), '#B85E22') + P('M32 44 28 24l14 12zM88 44l4-20-14 12z', '#3B2F1E')
      + sh(P('M60 30c22 0 38 16 38 34 0 10-8 18-18 24L60 102 40 88c-10-6-18-14-18-24 0-18 16-34 38-34z', '#E8813A'), '#B85E22')
      + P('M60 102 40 88c-8-5-14-11-16-18 10 0 20 4 26 10l10 6 10-6c6-6 16-10 26-10-2 7-8 13-16 18z', CREAM) + C(60, 92, 5, INK) + eye(46, 62, 5) + eye(74, 62, 5),
    book: () => sh(P('M14 34c16-6 32-6 46 4v62c-14-10-30-10-46-4z', CORAL), '#C25F54') + sh(P('M106 34c-16-6-32-6-46 4v62c14-10 30-10 46-4z', LAV), '#7A69B5')
      + P('M20 40c12-4 26-4 36 3v50c-10-6-24-7-36-3z', CREAM) + P('M100 40c-12-4-26-4-36 3v50c10-6 24-7 36-3z', CREAM)
      + line('M26 52c8-2 16-2 24 2M26 62c8-2 16-2 24 2M26 72c8-2 16-2 24 2M70 54c8-4 16-4 24-2M70 64c8-4 16-4 24-2M70 74c8-4 16-4 24-2', '#C9B994', 3),
    pear: () => sh(P('M60 30c10 0 14 10 14 20 0 8 16 14 16 32 0 16-14 26-30 26S30 98 30 82c0-18 16-24 16-32 0-10 4-20 14-20z', '#B7D36B'), '#8FA846')
      + E(48, 80, 7, 12, '#fff', ' opacity=".3" transform="rotate(15 48 80)"') + line('M60 30c0-8 2-14 6-18', BROWN_D, 4) + sh(P('M66 20c8-8 18-6 22-2-6 6-14 8-22 2z', TEAL), '#4E9A78'),
    map: () => sh(P('M12 28l30-10 36 10 30-10v74l-30 10-36-10-30 10z', CREAM), '#D9C6A5') + P('M42 18v74l36 10V28z', '#EADBC0')
      + line('M22 74c10-8 18 4 28-6s16-16 26-8 14 4 22-6', CORAL, 3.4) + P('M88 44l6-6M94 44l-6-6', 'none', ` stroke="${CORAL}" stroke-width="4" stroke-linecap="round"`) + sh(P('M24 40c4-6 12-6 14 0-2 6-10 8-14 0z', TEAL), '#4E9A78') + C(28, 76, 5, GOLD),
    dot: () => sh(C(60, 60, 34, CORAL), '#C25F54') + E(48, 46, 10, 6, '#fff', ' opacity=".4" transform="rotate(-30 48 46)"'),
    sock: () => sh(P('M42 14h34v52c0 8 4 14 12 20 10 8 8 24-6 24-8 0-14-4-22-10L44 92c-8-6-12-14-12-24V14z', CORAL), '#C25F54') + R(40, 14, 38, 14, 4, CREAM) + line('M44 46h32M44 56h32', '#fff', 4),
    red: () => blob('#E2574C', '#B23A31'), blue: () => blob('#5DA9D6', '#3A7FAB'), yellow: () => blob('#F5C842', '#C99A1C'), green: () => blob('#7CC47A', '#4E9A50')
  };
  const pic = (name) => { if (S[name]) return `<svg class="pic" viewBox="0 0 120 120" aria-hidden="true">${S[name]()}</svg>`;
    if (NUM[name]) return `<svg class="pic" viewBox="0 0 120 120" aria-hidden="true">${num(NUM[name])}</svg>`;
    return El.pic(name); };
  El.songPic = pic;
  El.songPic.has = (name) => !!(S[name] || NUM[name]);
})();
