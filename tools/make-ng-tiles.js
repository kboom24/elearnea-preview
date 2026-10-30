#!/usr/bin/env node
/* Writes the Wick's Night Garden path tiles (assets/img/tile-night-garden.svg + one per lesson, tile-ng-*.svg) from the game's own
   paper-cut art (assets/games/night-garden-art.js over assets/js/pics.js). Re-run after art changes. */
const fs = require('fs'), path = require('path'), vm = require('vm'); const APP = path.resolve(__dirname, '..');
const ctx = { window: { El: {} } }; ctx.window.window = ctx.window; vm.createContext(ctx);
for (const f of ['assets/js/pics.js', 'assets/games/night-garden-art.js']) vm.runInContext(fs.readFileSync(path.join(APP, f), 'utf8'), ctx);
const N = ctx.window.NGA; const inner = (name, o) => N.pic(name, o).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const g = (name, x, y, s, o) => `<g transform="translate(${x} ${y}) scale(${s})" filter="url(#sh)">${inner(name, o)}</g>`;
const defs = `<filter id="felt"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .5 0"/></filter><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="3" flood-color="#14113A" flood-opacity=".45"/></filter><radialGradient id="glow" cx="50%" cy="48%" r="58%"><stop offset="0" stop-color="#F5B841" stop-opacity=".42"/><stop offset="1" stop-color="#F5B841" stop-opacity="0"/></radialGradient>`;
const stars = [[40, 46], [300, 36], [326, 112], [64, 132], [250, 70], [150, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#FFE6A8"/>`).join('');
const moon = `<circle cx="300" cy="64" r="26" fill="#F6EBD9"/><circle cx="312" cy="56" r="22" fill="#2A2566"/>`;
const hills = `<path d="M0 262q90-56 180-18t180-22v138H0z" fill="#2F5B4E"/><path d="M0 298q100-40 200-10t160-12v84H0z" fill="#3F7A63"/>`;
const frame = (bg, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" width="360" height="360"><defs>${defs}</defs><rect width="360" height="360" rx="44" fill="${bg}"/><rect width="360" height="360" rx="44" fill="url(#glow)"/>${stars}${moon}${hills}${body}<rect width="360" height="360" rx="44" filter="url(#felt)" opacity=".16"/><rect x="10" y="10" width="340" height="340" rx="36" fill="none" stroke="#F6EBD9" stroke-opacity=".5" stroke-width="4" stroke-dasharray="12 10"/></svg>`;
const sun = { petal: '#F5B841', petalD: '#C98A1C', fruit: 'seedhead' };
const T = {
  'tile-night-garden': frame('#1E1B4B', g('bloom', 18, 120, 1.5, sun) + g('moth', 190, 70, 1.05) + g('fox', 170, 170, 1.35)),
  'tile-ng-sort': frame('#1E1B4B', g('fox', 22, 130, 1.25) + g('rock', 196, 168, 1.15) + g('moth', 120, 34, .9)),
  'tile-ng-needs': frame('#2A2566', g('bloom', 30, 118, 1.45) + g('water', 196, 66, .95) + g('light', 214, 176, .95)),
  'tile-ng-cycle': frame('#1E1B4B', g('sseed', 6, 196, .95, sun) + g('sprout', 104, 176, 1.05, sun) + g('bloom', 198, 104, 1.4, sun)),
  'tile-ng-homes': frame('#2A2566', g('hollow', 130, 70, 1.9) + g('owl', 156, 100, .9) + g('rabbit', 18, 196, 1.05))
};
for (const [n, svg] of Object.entries(T)) fs.writeFileSync(path.join(APP, 'assets/img', n + '.svg'), svg);
console.log('night garden tiles written:', Object.keys(T).join(', '));
