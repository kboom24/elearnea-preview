/* Elearnea offline support: network-first with cache fallback (always fresh online, works offline after one visit). Same-origin only. */
const V = 'elearnea-preview-v13';
const CORE = ['./', 'map/', 'realm/reading/', 'realm/math/', 'realm/logic/', 'play/lily-pad/', 'play/firefly-count/', 'play/clocktower-gears/', 'play/wicks-path/', 'play/mothabet/', 'grown-ups/', 'waitlist/', 'waitlist/config.js', 'content/catalog.json', 'voice/index.json', 'voice/voice.js', 'voice/voice-then.js', 'assets/js/dash.js', 'assets/css/dash.css',
  'assets/css/el.css', 'assets/css/realm.css', 'assets/css/play.css', 'assets/js/el.js', 'assets/js/realm.js', 'assets/js/play.js',
  'assets/games/lily-pad.js', 'assets/games/lily-pad.css', 'assets/games/firefly-count.js', 'assets/games/firefly-count.css', 'assets/games/clocktower-gears.js', 'assets/games/clocktower-gears.css', 'assets/games/mothabet.js', 'assets/games/mothabet.css',
  'play/mothabet/game/index.html', 'play/mothabet/game/el-consent.js', 'play/mothabet/game/hexan.js', 'play/mothabet/game/words.js', 'play/mothabet/game/learn.js', 'play/mothabet/game/art.js', 'play/mothabet/game/voice.js', 'play/mothabet/game/social-safe.js', 'play/mothabet/game/bridge.js', 'play/mothabet/game/game.js',
  'assets/img/wick-sm.webp', 'assets/img/tile-lily.webp', 'assets/img/tile-firefly.webp', 'assets/img/tile-clocktower.webp', 'assets/img/tile-mothabet.webp',
  'play/lantern-barn/', 'play/picture-garden/', 'play/glow-jars/', 'content/early.json', 'assets/js/pics.js', 'assets/js/sfx-animals.js', 'assets/games/little-lines.js', 'assets/games/little.js', 'assets/games/little.css',
  'assets/games/lantern-barn.js', 'assets/games/lantern-barn.css', 'assets/games/picture-garden.js', 'assets/games/picture-garden.css', 'assets/games/glow-jars.js', 'assets/games/glow-jars.css', 'assets/img/tile-barn.svg', 'assets/img/tile-garden.svg', 'assets/img/tile-jars.svg',
  'assets/games/wicks-path-lines.js', 'assets/games/wicks-path.js', 'assets/games/wicks-path.css', 'assets/img/tile-wicks-path.svg',
  ...['cow', 'duck', 'cat', 'dog', 'sheep', 'pig', 'frog', 'bird', 'owl'].flatMap(a => ['mp3', 'opus'].map(x => `assets/sfx/animals/${a}.${x}`))];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()).catch(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('elearnea-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith(new URL('./', location).pathname)) return;
  const net = () => fetch(e.request).then(r => { if (r.status === 200) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; });
  e.respondWith(net().catch(() => caches.match(e.request, { ignoreSearch: true })));
});
