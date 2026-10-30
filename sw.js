/* Elearnea offline support: network-first with cache fallback (always fresh online, works offline after one visit). Same-origin only. */
const V = 'elearnea-preview-v4';
const CORE = ['./', 'map/', 'realm/reading/', 'realm/math/', 'play/lily-pad/', 'play/firefly-count/', 'play/clocktower-gears/', 'play/mothabet/', 'grown-ups/', 'waitlist/', 'waitlist/config.js', 'content/catalog.json', 'voice/index.json', 'voice/voice.js', 'assets/js/dash.js', 'assets/css/dash.css',
  'assets/css/el.css', 'assets/css/realm.css', 'assets/css/play.css', 'assets/js/el.js', 'assets/js/realm.js', 'assets/js/play.js',
  'assets/games/lily-pad.js', 'assets/games/lily-pad.css', 'assets/games/firefly-count.js', 'assets/games/firefly-count.css', 'assets/games/clocktower-gears.js', 'assets/games/clocktower-gears.css', 'assets/games/mothabet.js', 'assets/games/mothabet.css',
  'play/mothabet/game/index.html', 'play/mothabet/game/el-consent.js', 'play/mothabet/game/hexan.js', 'play/mothabet/game/words.js', 'play/mothabet/game/learn.js', 'play/mothabet/game/art.js', 'play/mothabet/game/voice.js', 'play/mothabet/game/social-safe.js', 'play/mothabet/game/bridge.js', 'play/mothabet/game/game.js',
  'assets/img/wick-sm.webp', 'assets/img/tile-lily.webp', 'assets/img/tile-firefly.webp', 'assets/img/tile-clocktower.webp', 'assets/img/tile-mothabet.webp'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()).catch(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('elearnea-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith(new URL('./', location).pathname)) return;
  const net = () => fetch(e.request).then(r => { if (r.status === 200) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; });
  e.respondWith(net().catch(() => caches.match(e.request, { ignoreSearch: true })));
});
