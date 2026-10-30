/* Lantern Barn (Little Lanterns, ages 0-4): listening and sound discrimination before letters.
   Modes (catalog config.mode):
   - tiny:      under-2 play-together peekaboo. One huge barn door; every tap opens it, an animal pops out and "says" its sound.
   - animals:   hear an animal sound, tap who made it (2 choices, 3 once first-try success is high).
   - loudquiet: hear a sound, tap loud or quiet: 8 loud/quiet pairs (lion/kitten, thunder/rain, ...), a new pair every round, contrast gets subtler.
   - clap:      syllable clapping. Wick claps a word on the drum, then the child claps it (counts the beats).
   No fail states and no timers: a miss replays the sound with a gentle hint; a second miss shows the answer.
   Contract: start(config, host) -> {stop}; host.emit('progress'|'mastery'); host.end(results). Sounds: assets/js/sfx-animals.js (recorded CC0 sounds: assets/sfx/animals, assets/sfx/loudquiet; synthesized clap drum). */
El.defineGame({
  id: 'lantern-barn',
  start(cfg, host) {
    const mode = cfg.mode || 'animals', L = host.learn, rng = host.rng, LN = El.LittleLines;
    const barn = `<svg viewBox="0 0 400 180" preserveAspectRatio="none"><path d="M0 180V96q60-40 130-14t140-6q70-24 130 8v96z" fill="#2F5B4E"/><path d="M0 180v-46q90-30 200-4t200-6v56z" fill="#3F7A63"/>
</svg><svg class="lb-barn" viewBox="0 0 100 90"><path d="M8 40 50 8l42 32v48H8z" fill="#A8372F"/><path d="M8 40 50 8l42 32" fill="none" stroke="#F6EBD9" stroke-width="4" stroke-linejoin="round"/><rect x="36" y="54" width="28" height="34" fill="#6A2A24"/><path d="M36 54l28 34M64 54 36 88" stroke="#F6EBD9" stroke-width="3"/><circle cx="50" cy="34" r="7" fill="#F5B841"/></svg>`;
    const tips = { tiny: 'Say the sound together, then let your child try it back: "Moo!" Name the animal and point at it.', animals: 'After each sound, make it yourself and ask "Who says that?"', loudquiet: 'Try it in real life: clap loudly, then quietly, and ask which was which.', clap: 'Clap along together. Try your child\'s name too!' };
    const kit = El.Little.setup(host, cfg, { scene: 'barn', bg: barn, tip: mode === 'tiny' ? tips.tiny : null });
    const say = kit.say, T = kit.T;
    const sfx = (id, o) => El.animal.play(id, o) || 0;
    // the recorded sounds this mode needs, decoded once; the barn waits for them (max 2.5 s; loud/quiet: 6 s, it has 16 files)
    const ready = Promise.race([El.animal.load(mode === 'loudquiet' ? El.animal.LQ : null), new Promise(r => setTimeout(r, mode === 'loudquiet' ? 6000 : 2500))]);
    Promise.all([El.Little.data(), ready]).then(([D]) => { if (!kit.alive) return;
      const A = {}; D.animals.forEach(a => { A[a.id] = a; });
      if (mode === 'tiny') return tiny(D, A);
      if (mode === 'loudquiet') return loudquiet(D);
      if (mode === 'clap') return clap(D);
      return animals(D, A);
    });

    // under 2: peekaboo barn door (cause and effect), 6 taps
    function tiny(D, A) {
      const order = rng.shuffle(D.animals.map(a => a.id)).slice(0, 6); let k = 0;
      const door = `<div class="lb-door"><div class="lb-leaf l"></div><div class="lb-leaf r"></div><div class="lb-peek"></div></div>`;
      const b = kit.single(door, 'Barn door'); const peek = b.querySelector('.lb-peek');
      kit.speak(LN.barn.knock);
      host.emit('progress', { done: 0, total: order.length });
      let busy = false;
      b.onclick = () => { if (busy || k >= order.length) return; busy = true; const a = A[order[k]];
        peek.innerHTML = El.pic(a.id) + kit.word(a.name); peek.classList.add('has-word'); b.classList.add('open'); kit.yes(b);
        // the animal's sound, then Bella names it ("The pig says oink!"); the door closes only after her line has ended (+ 300 ms)
        T(() => { const d = sfx(a.id); T(() => say(LN.barn.says(a), () => { k++; host.emit('progress', { done: k, total: order.length });
          T(() => { b.classList.remove('open', 'yes'); busy = false; if (k >= order.length) T(() => host.end({ total: order.length, done: order.length, firstTry: order.length }), 500); }, 400); }, 300, false, [peek.querySelector('.ll-word')]), Math.max(850, d * 1000 + 250)); }, 250); };
    }

    // who says that?
    function animals(D, A) {
      const pool = D.animals.map(a => a.id), plan = L.pick(cfg.skill, pool, cfg.rounds || 5, rng);
      kit.run(plan, (id, i, finish) => { const a = A[id], n = El.Little.nChoices(L, cfg.skill, 2, 3);
        const list = rng.shuffle([id, ...El.Little.others(rng, pool, n - 1, [id])]); let miss = 0;
        kit.labels('reveal', x => A[x].name); // identify-by-sound round: names appear on tap and with the answer, never before
        const btns = kit.options(list, x => El.pic(x), x => A[x].name); const right = btns.find(b => b._it === id); kit.mark(right);
        // the cue stops as soon as the right animal is picked (no animal sound or question over the praise)
        const cue = () => say(LN.barn.listen, () => { if (kit.praising) return; const d = sfx(id); T(() => say(LN.barn.who(a)), d * 1000 + 250); });
        kit.cue(cue);
        // right: its sound, then the praise; the next animal comes only after the praise line has ended (kit.run / kit.praise)
        btns.forEach(b => { b.onclick = () => { if (b === right) { kit.lock(); kit.yes(b); const d = sfx(id); finish(miss === 0, { say: LN.barn.yes(a), delay: Math.max(500, d * 1000 + 200) }); return; }
          if (kit.praising) return; const o = A[b._it]; miss++; kit.soft(b); const d = sfx(o.id);
          if (miss === 1) T(() => say(LN.barn.that(o), () => T(cue, 300)), Math.max(600, d * 1000 + 200));
          else { kit.hint(right); T(() => say(LN.barn.hereA(a)), Math.max(600, d * 1000 + 200)); } }; });
      });
    }

    // loud or quiet? (content/early.json "loudquiet": 8 loud/quiet pairs, e.g. lion/kitten, thunder/rain; sounds: assets/sfx/loudquiet + animals)
    // Every round is a new pair (least recently heard first, remembered across plays; never the same pair twice in a row), picture sides
    // are shuffled, and the contrast gets subtler over the lesson:
    //   first third   "things": a loud thing vs a quiet thing, each at its own level (loud 1.0, quiet 0.12 = about -18 dB)
    //   middle third  "same":   ONE sound, played loud (1.0) or quiet (0.14); pictures: the same thing big + waves vs small + "shh"
    //   last third    subtler:  things/same alternating, quiet at 0.32 (about -10 dB)
    function loudquiet(D) {
      const B = LN.barn, total = cfg.rounds || 6, plan = L.pick(cfg.skill, ['loud', 'quiet'], total, rng);
      const ok = (m) => El.animal.canPlay(m.sfx); // decoded recording (or a synthesized stand-in); a pair whose file failed to load is skipped
      const pairs = (D.loudquiet || []).filter(p => ok(p.loud) && ok(p.quiet)), order = lqOrder(pairs.length ? pairs : D.loudquiet, total);
      const stage = (i) => { const t = i / Math.max(1, total - 1); return t < 1 / 3 - 1e-9 ? { kind: 'things', q: .12 } : t < 2 / 3 - 1e-9 ? { kind: 'same', q: .14 } : { kind: i % 2 ? 'same' : 'things', q: .32 }; };
      const fx = { loud: '<svg class="lq-fx" viewBox="0 0 120 120" aria-hidden="true"><path d="M14 44q-8 16 0 32M4 36q-12 24 0 48M106 44q8 16 0 32M116 36q12 24 0 48"/></svg>',
        quiet: '<svg class="lq-fx" viewBox="0 0 120 120" aria-hidden="true"><circle cx="96" cy="26" r="3"/><circle cx="104" cy="18" r="2.2"/><circle cx="110" cy="11" r="1.6"/></svg>' };
      const art = (it) => `<span class="lq lq-${it.style}">${El.pic(it.m.id)}${fx[it.style]}</span>`;
      const cap = (t) => t[0].toUpperCase() + t.slice(1);
      kit.run(plan, (id, i, finish) => { let miss = 0; const loud = id === 'loud', pr = order[i], st = stage(i);
        const m = st.kind === 'things' ? (loud ? pr.loud : pr.quiet) : (rng.next() < .5 ? pr.loud : pr.quiet), gain = loud ? 1 : st.q;
        const items = st.kind === 'things' ? [{ m: pr.loud, style: 'loud', right: loud }, { m: pr.quiet, style: 'quiet', right: !loud }]
          : [{ m, style: 'loud', right: loud }, { m, style: 'quiet', right: !loud }];
        const btns = kit.options(rng.shuffle(items), art, it => st.kind === 'things' ? `${cap(it.m.name)}: ${it.style}` : `${cap(it.style)} ${it.m.name}`);
        Object.assign(kit.opts.dataset, { pair: pr.id, kind: st.kind, level: String(gain) }); // QA: which pair / round type / quiet level
        const right = btns.find(b => b._it.right); kit.mark(right);
        const ask = st.kind === 'things' ? B.lqAsk[i % B.lqAsk.length] : B.lqWas(m), praise = st.kind === 'things' ? B.lqThing(m, loud) : B.lqSame(m, loud);
        const sound = () => { if (kit.praising) return; const d = sfx(m.sfx, { gain }); T(() => { if (!kit.praising) say(ask); }, d * 1000 + 350); };
        kit.cue(() => say(B.lqListen[i % B.lqListen.length], sound));
        btns.forEach(b => { b.onclick = () => { if (kit.praising) return; if (b === right) { kit.lock(); kit.yes(b); finish(miss === 0, { say: praise, delay: 400 }); return; }
          miss++; kit.soft(b); if (miss === 1) T(() => say(B.again, () => T(sound, 300)), 500); else { kit.hint(right); T(() => say(LN.common.here), 500); } }; });
      }, { repeats: true }); // loud, loud, quiet... is fine (the pair changes every round); alternating would be guessable
    }
    // pair order for a lesson: least recently heard pairs first (localStorage, last 8 shown), shuffled within ties; no pair twice in a row
    function lqOrder(pairs, n) { const K = 'elearnea:lq-recent'; let recent = []; try { recent = JSON.parse(localStorage.getItem(K) || '[]'); } catch (e) {}
      const age = (p) => { const k = recent.indexOf(p.id); return k < 0 ? -1 : k; }; // -1: not heard lately; bigger index = heard more recently
      const out = []; let pool = [];
      while (out.length < n) { if (!pool.length) pool = rng.shuffle(pairs.slice()).sort((a, b) => age(a) - age(b));
        let k = 0; if (out.length && pool[0].id === out[out.length - 1].id && pool.length > 1) k = 1; out.push(pool.splice(k, 1)[0]); }
      try { const r = recent.filter(id => !out.some(p => p.id === id)).concat(out.map(p => p.id)); localStorage.setItem(K, JSON.stringify([...new Set(r.reverse())].reverse().slice(-8))); } catch (e) {}
      return out; }

    // clap the syllables
    function clap(D) {
      const C = {}; D.claps.forEach(c => { C[c.id] = c; });
      // easier words (1-2 beats) first while the engine's difficulty is low
      const lvl = L.levelIndex(cfg.skill, 3), pool = D.claps.filter(c => c.n <= lvl + 1 || c.n <= 2).map(c => c.id), plan = L.pick(cfg.skill, pool, cfg.rounds || 5, rng);
      kit.run(plan, (id, i, finish) => { const c = C[id]; let taps = 0, idle = null, demo = false, miss = 0, done = false;
        kit.show.innerHTML = `<div class="ll-model has-word">${El.pic(c.id)}${kit.word(c.word)}</div><div class="lb-dots" id="lbDots"></div>`;
        const mw = kit.show.querySelector('.ll-word'); // the word glows while Bella says it ("Let's clap... banana!")
        const dots = kit.show.querySelector('#lbDots');
        const paint = (k, cls) => { dots.innerHTML = Array.from({ length: Math.max(k, 1) }, (_, j) => `<i class="${j < k ? cls || 'on' : ''}"></i>`).join(''); };
        const drum = kit.single(El.pic('drum'), 'Drum'); drum.classList.remove('huge'); drum.classList.add('lb-drum'); drum.dataset.n = c.n;
        const hit = () => { sfx('drum', { gain: .7 }); drum.classList.remove('boing'); void drum.offsetWidth; drum.classList.add('boing'); };
        // mt: only the newest model run continues (Wick's "hear it again" restarts it; voice onend now also fires when a line is interrupted)
        let mt = 0; const model = (then) => { const my = ++mt; demo = true; drum.dataset.turn = ''; paint(0); say(LN.barn.clap(c), () => { if (my !== mt) return; let k = 0; const beat = () => { if (my !== mt) return; if (k >= c.n) { demo = false; T(then, 500); return; } k++; paint(k, 'demo'); sfx('drum', { gain: .7 }); drum.classList.remove('boing'); void drum.offsetWidth; drum.classList.add('boing'); T(beat, 650); }; T(beat, 350); }, 0, false, [mw]); };
        const turn = () => { taps = 0; paint(0); drum.dataset.turn = '1'; say(LN.barn.turn(c), null, 0, false, [mw]); };
        const claps = LN.barn.claps(c);
        const judge = () => { if (done) return; if (taps === c.n) { done = true; drum.onclick = null; drum.dataset.turn = ''; kit.yes(drum); paint(c.n, 'on'); finish(miss === 0, { say: LN.barn.claps(c), delay: 300 }); return; }
          miss++; kit.soft(drum); if (miss === 1) T(() => say(LN.barn.together, () => model(turn)), 300);
          else { done = true; drum.onclick = null; drum.dataset.turn = ''; finish(false, { after: (end) => T(() => model(() => say(LN.barn.claps(c), end)), 300) }); } };
        kit.cue(() => model(turn));
        drum.onclick = () => { if (demo || done) return; taps++; hit(); paint(taps, 'on'); clearTimeout(idle); idle = T(judge, 1500); };
      });
    }
    return { stop: () => kit.stop() };
  }
});
