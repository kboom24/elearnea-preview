/* Glow Jars (Little Lanterns, ages 0-4): early math before numerals.
   Modes (catalog config.mode):
   - tiny:     under-2 play-together. One huge jar; each tap lets one firefly out and Wick counts it (one, two, three).
   - match:    find the jar with the same number of fireflies as the big one (1-3, up to 4 when ready). One-to-one matching.
   - subitize: "Which jar has two fireflies?" small sets (1-3) seen at a glance, in dice-like patterns.
   - more:     "Which jar has more?" The gap between the jars shrinks as first-try success rises (4 vs 1 -> 3 vs 2).
   No numerals on screen, no fail states, no timers: a miss starts a count-along, a second miss shows the answer.
   Contract: start(config, host) -> {stop}; host.emit('progress'|'mastery'); host.end(results). */
El.defineGame({
  id: 'glow-jars',
  start(cfg, host) {
    const mode = cfg.mode || 'subitize', L = host.learn, rng = host.rng, LN = El.LittleLines, J = LN.jars, C = LN.common;
    const meadow = `<svg viewBox="0 0 400 180" preserveAspectRatio="none"><path d="M0 180V110q20-40 30 0 12-50 24 0 10-34 22 2 14-46 26 0 10-30 22 4 16-52 30-2 10-28 24 4 12-44 26 0 12-34 24 2 14-48 28-2 10-30 22 4 14-40 28 0 12-36 24 2 10-26 20 6V180z" fill="#2F5B4E"/><path d="M0 180v-40q30-30 50 4 30-34 60 0 30-30 60 2 30-34 60 0 30-30 60 2 30-30 60 0 30-26 50 2v32z" fill="#3F7A63"/></svg><div class="gj-moon"></div>`;
    const kit = El.Little.setup(host, cfg, { scene: 'jars', bg: meadow, tip: mode === 'tiny' ? 'Count out loud together as each firefly flies out. Hold up one finger for each one.' : null });
    const say = kit.say, T = kit.T;
    // dice-like layouts (subitizing patterns) in jar coordinates
    const POS = { 1: [[60, 92]], 2: [[44, 76], [76, 108]], 3: [[42, 108], [60, 76], [78, 108]], 4: [[44, 76], [76, 76], [44, 108], [76, 108]], 5: [[42, 72], [78, 72], [60, 92], [42, 112], [78, 112]] };
    const jar = (n, uid) => `<svg class="gj-jar" viewBox="0 0 120 150" aria-hidden="true"><defs><radialGradient id="gj${uid}" cx="50%" cy="60%" r="55%"><stop offset="0" stop-color="#FFE9A0" stop-opacity=".9"/><stop offset="1" stop-color="#F5B841" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="60" cy="96" rx="64" ry="60" fill="url(#gj${uid})" opacity="${Math.min(1, .25 + n * .18).toFixed(2)}"/>
      <path d="M26 38h68v8c10 6 14 16 14 28v52c0 12-8 20-20 20H32c-12 0-20-8-20-20V74c0-12 4-22 14-28z" fill="rgba(200,220,255,.18)" stroke="#F6EBD9" stroke-width="4.5"/>
      <path d="M22 20h76a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V24a4 4 0 0 1 4-4z" fill="#8E5427" stroke="#5C3416" stroke-width="3"/>
      <path d="M24 64c-3 10-3 40 0 60" stroke="rgba(255,255,255,.5)" stroke-width="5" fill="none" stroke-linecap="round"/>
      ${(POS[n] || []).map(([x, y], i) => `<g class="gj-ff" data-i="${i}" transform="translate(${x} ${y})"><circle r="15" fill="#F5B841" opacity=".35"/><ellipse cx="-7" cy="-9" rx="5" ry="8" fill="#F6EBD9" opacity=".85" transform="rotate(-25 -7 -9)"/><ellipse cx="7" cy="-9" rx="5" ry="8" fill="#F6EBD9" opacity=".85" transform="rotate(25 7 -9)"/><circle r="8.5" fill="#FFE28A"/><circle r="4" fill="#FFFBE0"/></g>`).join('')}</svg>`;
    let uid = 0; const J1 = (n) => jar(n, ++uid);
    // light each firefly in turn and count aloud (no time pressure; just a count-along)
    function countAlong(el, n, then) { const ffs = el.querySelectorAll('.gj-ff'); let k = 0;
      const step = () => { ffs.forEach(f => f.classList.remove('hl')); if (k >= n) { if (then) T(then, 350); return; } ffs[k].classList.add('hl'); host.sfx.step(k); say(C.n(k + 1)); k++; T(step, 750); }; step(); }
    function answerRound(plan, build) {
      kit.run(plan, (item, i, finish) => { const q = build(item); let miss = 0;
        kit.show.innerHTML = q.model != null ? `<div class="ll-model gj-model">${J1(q.model)}</div>` : '';
        const btns = kit.options(q.list, n => J1(n), n => 'Jar'), right = btns.find(b => b._it === q.right); kit.mark(right);
        kit.speak(q.cue);
        btns.forEach(b => { b.onclick = () => { if (b === right) { kit.lock(); kit.yes(b); finish(miss === 0, { say: q.yes, delay: 350 }); return; }
          miss++; kit.soft(b);
          if (miss === 1) T(() => say(C.countTogether, () => q.recount(b, () => say(q.cue))), 350); else { kit.hint(right); T(() => say(q.here), 350); } }; });
      });
    }
    El.Little.data().then(() => { if (!kit.alive) return;
      if (mode === 'tiny') return tiny();
      if (mode === 'match') { const top = 3 + L.levelIndex(cfg.skill, 2), pool = Array.from({ length: top }, (_, k) => String(k + 1));
        return answerRound(L.pick(cfg.skill, pool, cfg.rounds || 6, rng), (id) => { const n = +id, k = El.Little.nChoices(L, cfg.skill, 2, 3);
          const list = rng.shuffle([n, ...El.Little.others(rng, Array.from({ length: top }, (_, j) => j + 1), k - 1, [n])]);
          return { model: n, list, right: n, cue: J.matches, yes: C.yesN(n), here: C.here, recount: (b, then) => countAlong(kit.show, n, then) }; }); }
      if (mode === 'more') { const lvl = L.levelIndex(cfg.skill, 3), pairs = [[[1, 4], [1, 5], [2, 5]], [[1, 3], [2, 4], [3, 5]], [[2, 3], [3, 4], [4, 5]]][lvl].map(p => p.join('v'));
        return answerRound(L.pick(cfg.skill, pairs, cfg.rounds || 6, rng), (id) => { const [a, b] = id.split('v').map(Number), list = rng.shuffle([a, b]);
          return { model: null, list, right: b, cue: J.more, yes: J.yesMore, here: J.thisMore,
            recount: (btn, then) => { const els = [...kit.opts.children]; countAlong(els[0], els[0]._it, () => countAlong(els[1], els[1]._it, then)); } }; }); }
      // subitize 1-3
      const pool = ['1', '2', '3'];
      return answerRound(L.pick(cfg.skill, pool, cfg.rounds || 6, rng), (id) => { const n = +id, k = El.Little.nChoices(L, cfg.skill, 2, 3);
        const list = rng.shuffle([n, ...El.Little.others(rng, [1, 2, 3], k - 1, [n])]);
        return { model: null, list, right: n, cue: J.which(n), yes: C.yesN(n), here: C.here, recount: (b, then) => countAlong(b, b._it, then) }; });
    });

    function tiny() { const total = 6; let k = 0, left = 3, busy = false;
      const b = kit.single(J1(3), 'Jar'); kit.speak(J.tap); host.emit('progress', { done: 0, total });
      b.onclick = () => { if (busy || k >= total) return; busy = true; const ffs = b.querySelectorAll('.gj-ff:not(.out)'); const f = ffs[0]; if (f) f.classList.add('out');
        const n = 4 - left; left--; k++; host.sfx.step(n - 1); kit.yes(b); host.emit('progress', { done: k, total });
        say(C.n(n), () => { if (left > 0) { busy = false; return; }
          T(() => say(J.bye, () => { if (k >= total) { T(() => host.end({ total, done: total, firstTry: total }), 400); return; } T(() => { b.innerHTML = J1(3); left = 3; b.classList.remove('yes'); busy = false; }, 500); }), 300); }); };
    }
    return { stop: () => kit.stop() };
  }
});
