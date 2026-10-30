/* Picture Garden (Little Lanterns, ages 0-4): vocabulary through pictures, colors, shapes, rhyme, and letter shapes as pictures.
   Modes (catalog config.mode):
   - tiny:    under-2 play-together. One huge picture; each tap names it ("Look! A ball!") and the next picture grows in.
   - words:   "Where is the cat?" tap the picture (2 choices, 3 once first-try success is high).
   - colors:  "Tap the red balloon!"
   - shapes:  "Find the circle!" (all shapes in one color, so shape is the only clue)
   - rhyme:   "Which one rhymes with cat? Hat, or sun?" (pictures named in the question; no reading)
   - letters: find the letter that looks the same as the big one. Visual matching only: no letter names or sounds needed.
   No fail states, no timers. Contract: start(config, host) -> {stop}; host.emit('progress'|'mastery'); host.end(results). */
El.defineGame({
  id: 'picture-garden',
  start(cfg, host) {
    const mode = cfg.mode || 'words', L = host.learn, rng = host.rng, LN = El.LittleLines, G = LN.garden;
    const garden = `<svg viewBox="0 0 400 180" preserveAspectRatio="none"><path d="M0 180V100q70-46 150-12t130-4q70-30 120 6v90z" fill="#2F5B4E"/><path d="M0 180v-50q100-34 210-6t190-4v60z" fill="#3F7A63"/>
      ${[[30, 150, '#F08A7E'], [70, 160, '#F5B841'], [340, 150, '#9B8AD1'], [372, 162, '#F08A7E'], [300, 166, '#F5B841']].map(([x, y, c]) => `<g><path d="M${x} ${y}v18" stroke="#7CC4A4" stroke-width="3"/><circle cx="${x}" cy="${y}" r="7" fill="${c}"/><circle cx="${x}" cy="${y}" r="2.6" fill="#F6EBD9"/></g>`).join('')}</svg>`;
    const kit = El.Little.setup(host, cfg, { scene: 'garden', bg: garden, tip: mode === 'tiny' ? 'Name each picture together and point to the real thing nearby: "Look, a ball! Where is your ball?"' : null });
    const say = kit.say, T = kit.T;
    El.Little.data().then(D => { if (!kit.alive) return;
      ({ tiny, words, colors, shapes, rhyme, letters }[mode] || words)(D); });

    // generic "tap the named one" round: ask(id) -> {cue, yes, that(otherId)}; second miss shows the answer
    function tapRound(plan, pool, render, label, lines, pre) {
      kit.run(plan, (id, i, finish) => { if (pre) pre(id); const n = El.Little.nChoices(L, cfg.skill, 2, 3), list = rng.shuffle([id, ...El.Little.others(rng, pool, n - 1, [id])]); let miss = 0;
        const btns = kit.options(list, render, label), right = btns.find(b => b._it === id), ln = lines(id); kit.mark(right);
        kit.speak(ln.cue);
        btns.forEach(b => { b.onclick = () => { if (b === right) { kit.lock(); kit.yes(b); T(() => say(ln.yes), 350); finish(miss === 0, { wait: 2300 }); return; }
          miss++; kit.soft(b); if (miss === 1) T(() => say([lines(b._it).that, ln.cue]), 350); else { kit.hint(right); T(() => say(ln.here), 350); } }; });
      });
    }
    function tiny(D) {
      const order = rng.shuffle(D.tinyWords.slice()).slice(0, 6), W = {}; D.words.forEach(w => { W[w.id] = w; }); let k = 0, busy = false;
      const b = kit.single(El.pic(order[0]), 'Picture'); kit.speak(G.tap); host.emit('progress', { done: 0, total: order.length });
      b.onclick = () => { if (busy) return; busy = true; const w = W[order[k]]; kit.yes(b);
        say(G.look(w), () => { k++; host.emit('progress', { done: k, total: order.length });
          if (k >= order.length) { T(() => host.end({ total: order.length, done: order.length, firstTry: order.length }), 500); return; }
          T(() => { b.classList.remove('yes'); b.classList.add('swap'); T(() => { b.innerHTML = El.pic(order[k]); b.classList.remove('swap'); busy = false; }, 260); }, 500); }); };
    }
    function words(D) { const W = {}; D.words.forEach(w => { W[w.id] = w; }); const pool = D.words.map(w => w.id);
      tapRound(L.pick(cfg.skill, pool, cfg.rounds || 6, rng), pool, x => El.pic(x), x => W[x].name,
        id => ({ cue: G.where(W[id]), yes: G.yesW(W[id]), that: G.thatW(W[id]), here: G.hereW(W[id]) })); }
    function colors(D) { const C = {}; D.colors.forEach(c => { C[c.id] = c; }); const pool = D.colors.map(c => c.id);
      tapRound(L.pick(cfg.skill, pool, cfg.rounds || 6, rng), pool, x => El.pic('balloon', { color: C[x].hex, dark: C[x].dark }), x => C[x].name + ' balloon',
        id => ({ cue: G.color(C[id]), yes: G.yesC(C[id]), that: G.thatC(C[id]), here: LN.common.here })); }
    function shapes(D) { const S = {}; D.shapes.forEach(s => { S[s.id] = s; }); const pool = D.shapes.map(s => s.id);
      // one color per question, so the shape is the only clue
      const pal = [['#F08A7E', '#C25F54'], ['#7CC4A4', '#4E9479'], ['#9B8AD1', '#6E5FAA'], ['#F5B841', '#C98A1C']]; let col = pal[0];
      tapRound(L.pick(cfg.skill, pool, cfg.rounds || 6, rng), pool, x => El.pic(x === 'star' ? 'starShape' : x, { color: col[0], dark: col[1] }), x => S[x].name,
        id => ({ cue: G.shape(S[id]), yes: G.yesS(S[id]), that: G.thatS(S[id]), here: LN.common.here }), () => { col = rng.pick(pal); });
    }
    function rhyme(D) { const R = {}; D.rhymes.forEach(r => { R[r.a] = r; }); const pool = D.rhymes.map(r => r.a), plan = L.pick(cfg.skill, pool, cfg.rounds || 5, rng);
      kit.run(plan, (a, i, finish) => { const r = R[a]; let miss = 0;
        kit.show.innerHTML = `<div class="ll-model">${El.pic(r.a)}</div>`;
        const btns = kit.options(rng.shuffle([r.b, r.c]), x => El.pic(x), x => x), right = btns.find(b => b._it === r.b); kit.mark(right);
        kit.speak(G.rhyme(r));
        kit.show.firstChild.onclick = () => kit.replay();
        btns.forEach(b => { b.onclick = () => { if (b === right) { kit.lock(); kit.yes(b); T(() => say(G.yesR(r)), 350); finish(miss === 0, { wait: 2900 }); return; }
          miss++; kit.soft(b); kit.hint(right); T(() => say(G.listenR(r)), 350); }; });
      });
    }
    function letters(D) { const easy = D.letters.easy, sim = D.letters.similar;
      const lvl = L.levelIndex(cfg.skill, 3), pool = lvl >= 2 ? easy.concat(sim.flat()) : easy, plan = L.pick(cfg.skill, pool, cfg.rounds || 6, rng);
      const tile = (ch) => `<span class="ll-letter">${ch}</span>`;
      kit.run(plan, (ch, i, finish) => { const n = El.Little.nChoices(L, cfg.skill, 2, 3); let miss = 0;
        const pair = sim.find(p => p.includes(ch)), lookalike = lvl >= 2 && pair ? pair.find(x => x !== ch) : null;
        const others = El.Little.others(rng, easy, n - 1 - (lookalike ? 1 : 0), [ch, lookalike]).concat(lookalike ? [lookalike] : []);
        kit.show.innerHTML = `<div class="ll-model">${tile(ch)}</div>`;
        const btns = kit.options(rng.shuffle([ch, ...others]), tile, () => 'Letter shape'), right = btns.find(b => b._it === ch); kit.mark(right);
        kit.speak(G.same);
        btns.forEach(b => { b.onclick = () => { if (b === right) { kit.lock(); kit.yes(b); T(() => say(G.match), 350); finish(miss === 0, { wait: 2000 }); return; }
          miss++; kit.soft(b); if (miss === 1) T(() => say(G.lookAgain), 350); else { kit.hint(right); T(() => say(LN.common.here), 350); } }; });
      });
    }
    return { stop: () => kit.stop() };
  }
});
