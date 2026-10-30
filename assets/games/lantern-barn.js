/* Lantern Barn (Little Lanterns, ages 0-4): listening and sound discrimination before letters.
   Modes (catalog config.mode):
   - tiny:      under-2 play-together peekaboo. One huge barn door; every tap opens it, an animal pops out and "says" its sound.
   - animals:   hear an animal sound, tap who made it (2 choices, 3 once first-try success is high).
   - loudquiet: hear a drum, tap the elephant (loud) or the mouse (quiet).
   - clap:      syllable clapping. Wick claps a word on the drum, then the child claps it (counts the beats).
   No fail states and no timers: a miss replays the sound with a gentle hint; a second miss shows the answer.
   Contract: start(config, host) -> {stop}; host.emit('progress'|'mastery'); host.end(results). Sounds: assets/js/sfx-animals.js (recorded CC0 animal sounds, synthesized drum). */
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
    El.animal.load(); // the recorded animal sounds (assets/sfx/animals), decoded once; the barn waits for them below (max 2.5 s)
    const ready = Promise.race([El.animal.load(), new Promise(r => setTimeout(r, 2500))]);
    Promise.all([El.Little.data(), ready]).then(([D]) => { if (!kit.alive) return;
      const A = {}; D.animals.forEach(a => { A[a.id] = a; });
      if (mode === 'tiny') return tiny(D, A);
      if (mode === 'loudquiet') return loudquiet();
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
        peek.innerHTML = El.pic(a.id); b.classList.add('open'); kit.yes(b);
        // the animal's sound, then Bella names it ("The pig says oink!"); the door closes only after her line has ended (+ 300 ms)
        T(() => { const d = sfx(a.id); T(() => say(LN.barn.says(a), () => { k++; host.emit('progress', { done: k, total: order.length });
          T(() => { b.classList.remove('open', 'yes'); busy = false; if (k >= order.length) T(() => host.end({ total: order.length, done: order.length, firstTry: order.length }), 500); }, 400); }, 300), Math.max(850, d * 1000 + 250)); }, 250); };
    }

    // who says that?
    function animals(D, A) {
      const pool = D.animals.map(a => a.id), plan = L.pick(cfg.skill, pool, cfg.rounds || 5, rng);
      kit.run(plan, (id, i, finish) => { const a = A[id], n = El.Little.nChoices(L, cfg.skill, 2, 3);
        const list = rng.shuffle([id, ...El.Little.others(rng, pool, n - 1, [id])]); let miss = 0;
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

    // loud or quiet?
    function loudquiet() {
      const plan = L.pick(cfg.skill, ['loud', 'quiet'], cfg.rounds || 6, rng);
      kit.run(plan, (id, i, finish) => { let miss = 0;
        const btns = kit.options(rng.shuffle(['elephant', 'mouse']), x => El.pic(x), x => x === 'elephant' ? 'Loud, like the elephant' : 'Quiet, like the mouse');
        const right = btns.find(b => b._it === (id === 'loud' ? 'elephant' : 'mouse')); kit.mark(right);
        const beat = () => { const g = id === 'loud' ? 1 : .12; sfx('drum', { gain: g }); T(() => sfx('drum', { gain: g }), 420); T(() => sfx('drum', { gain: g }), 840); };
        const cue = () => say(LN.barn.listen, () => { if (kit.praising) return; beat(); T(() => say(LN.barn.lq), 1500); });
        kit.cue(cue);
        btns.forEach(b => { b.onclick = () => { if (b === right) { kit.lock(); kit.yes(b); finish(miss === 0, { say: id === 'loud' ? LN.barn.loud : LN.barn.quiet, delay: 400 }); return; }
          miss++; kit.soft(b); if (miss === 1) T(() => say(LN.barn.again, () => T(cue, 300)), 500); else { kit.hint(right); T(() => say(LN.common.here), 500); } }; });
      });
    }

    // clap the syllables
    function clap(D) {
      const C = {}; D.claps.forEach(c => { C[c.id] = c; });
      // easier words (1-2 beats) first while the engine's difficulty is low
      const lvl = L.levelIndex(cfg.skill, 3), pool = D.claps.filter(c => c.n <= lvl + 1 || c.n <= 2).map(c => c.id), plan = L.pick(cfg.skill, pool, cfg.rounds || 5, rng);
      kit.run(plan, (id, i, finish) => { const c = C[id]; let taps = 0, idle = null, demo = false, miss = 0, done = false;
        kit.show.innerHTML = `<div class="ll-model">${El.pic(c.id)}</div><div class="lb-dots" id="lbDots"></div>`;
        const dots = kit.show.querySelector('#lbDots');
        const paint = (k, cls) => { dots.innerHTML = Array.from({ length: Math.max(k, 1) }, (_, j) => `<i class="${j < k ? cls || 'on' : ''}"></i>`).join(''); };
        const drum = kit.single(El.pic('drum'), 'Drum'); drum.classList.remove('huge'); drum.classList.add('lb-drum'); drum.dataset.n = c.n;
        const hit = () => { sfx('drum', { gain: .7 }); drum.classList.remove('boing'); void drum.offsetWidth; drum.classList.add('boing'); };
        // mt: only the newest model run continues (Wick's "hear it again" restarts it; voice onend now also fires when a line is interrupted)
        let mt = 0; const model = (then) => { const my = ++mt; demo = true; drum.dataset.turn = ''; paint(0); say(LN.barn.clap(c), () => { if (my !== mt) return; let k = 0; const beat = () => { if (my !== mt) return; if (k >= c.n) { demo = false; T(then, 500); return; } k++; paint(k, 'demo'); sfx('drum', { gain: .7 }); drum.classList.remove('boing'); void drum.offsetWidth; drum.classList.add('boing'); T(beat, 650); }; T(beat, 350); }); };
        const turn = () => { taps = 0; paint(0); drum.dataset.turn = '1'; say(LN.barn.turn(c)); };
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
