# Elearnea preview (phase 1)
Noindex preview of Elearnea, a storybook world of learning games for kids 4-9. Static site (no build step), deployed with GitHub Pages.
- `index.html` landing · `map/` world hub · `realm/<id>/` lesson paths · `play/<game>/` game host pages · `grown-ups/` gated parent area (stub)
- `content/catalog.json` content catalog: subject > realm > skill > lesson > game, grade + standards tags
- `assets/js/el.js` core: storage, learning engine (from Mothabet learn.js), on-device voice (from Mothabet voice.js), game host contract
- `assets/games/*` game modules (`lily-pad`, `firefly-count`, `mothabet` adapter); `play/mothabet/game/` kid-safe Mothabet copy, the one Mothabet source (see `docs/MOTHABET-INTEGRATION.md`; the seed and `tools/sync-mothabet.sh` are retired)
All pages: `noindex, nofollow`; `robots.txt` disallows all. No third-party requests.
