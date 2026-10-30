# Elearnea preview (phase 1)
Noindex preview of Elearnea, a storybook world of learning games for kids 4-9, plus Little Lanterns (ages 0-4, play-together for under 2). Static site (no build step), deployed with GitHub Pages.
- `index.html` landing · `map/` world hub · `realm/<id>/` lesson paths · `play/<game>/` game host pages · `grown-ups/` gated parent area (stub)
- `content/catalog.json` content catalog: subject > realm > skill > lesson > game, grade + standards tags
- `assets/js/el.js` core: storage, learning engine (from Mothabet learn.js), on-device voice (from Mothabet voice.js), game host contract
- `assets/games/*` game modules (`lily-pad`, `firefly-count`, `clocktower-gears`, `mothabet` adapter); `play/mothabet/game/` kid-safe Mothabet copy, the one Mothabet source (see `docs/MOTHABET-INTEGRATION.md`; the seed and `tools/sync-mothabet.sh` are retired)
- Little Lanterns (0-4): `assets/games/little.js` kit, `little-lines.js` (every spoken line), `lantern-barn`, `picture-garden`, `glow-jars`; data in `content/early.json`; art `assets/js/pics.js`; synthesized animal sounds `assets/js/sfx-animals.js`; age band in `El.band()` (set in grown-ups or with the map's lantern switch)
All pages: `noindex, nofollow`; `robots.txt` disallows all. No third-party requests.
