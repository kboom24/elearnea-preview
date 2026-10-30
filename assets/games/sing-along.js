/* Sing-along games, synced to Hexan's songs (content/songs.json): Zoo Parade (song "Read It, Sing It!") and Word Stage (song "Read It").
   The music plays as-is; the game runs on the music's own clock (audio.currentTime, smoothed between updates), so nothing drifts:
   - karaoke lyrics: each word lights up as it is sung; song words that are on the page (cards, the shelf) light up too
   - "pick" moments: when the song sings a word, the child taps its picture (Explorers 'words' lessons: the printed word itself)
   - "spell" moments: a few seconds before the song spells a word ("D-U-C-K"), the child builds it from letter tiles; each slot glows
     as the song sings that letter, and anything not placed by the end is placed for them (the answer is modelled, never a fail)
   - collected words march onto the shelf; when the song names them again they light up; after the song, tapping one = Bella reads it
   The music never stops for feedback: right = chime + sparkle, miss = soft wiggle (2nd miss: the answer glows). Bella speaks only
   before the music, while paused and after the song (assets/games/sing-lines.js), so no line is ever cut and nothing talks over the song.
   Replays vary: shuffled cards and tiles, distractors drawn fresh each time, 2-4 choices from El.Learn's difficulty (~80% first try).
   Contract: El.defineGame({id, start(cfg, host) -> {stop}}); host.emit('progress'|'mastery'); host.end({total, done, firstTry}).
   cfg: { song, mode: 'pictures' | 'letters' | 'words', little } (catalog lesson config). QA hooks only with ?qa=1 (window.__sing, data-ok). */
(function () {
  'use strict';
  const El = window.El, QA = /[?&]qa=1(&|$)/.test(location.search);
  let SONGS = null; const songs = () => SONGS || (SONGS = fetch(El.url('content/songs.json'), { cache: 'no-cache' }).then(r => r.json()));
  const nw = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '');
  // look-alike words for the 'words' (reading) lessons: same letters in other places, so the child has to read, not guess
  const LOOK = { cat: ['hat', 'cot', 'cap', 'can'], duck: ['dock', 'luck', 'deck'], frog: ['fog', 'flag', 'from', 'log'], bear: ['pear', 'beat', 'bean'], pear: ['bear', 'peak', 'near'],
    panda: ['pants', 'candy', 'handy'], red: ['bed', 'rod', 'rid'], book: ['look', 'cook', 'boot'], mouse: ['house', 'moose', 'mouth'], fox: ['box', 'fix', 'fog'], six: ['sit', 'fix', 'mix'],
    blue: ['glue', 'clue', 'blur'], pig: ['wig', 'big', 'pin'], dog: ['dig', 'log', 'dot'], dot: ['dog', 'hot', 'pot'], sun: ['run', 'bun', 'sum'], map: ['mop', 'cap', 'mat'] };
  const KIND = { color: ['red', 'blue', 'yellow', 'green'], number: ['two', 'three', 'four', 'five', 'six'], letter: ['a', 'b', 'm', 's', 't'] };
  const ABC = 'abcdefghijklmnoprstuw';
  El.SingAlong = {
    make(id, scene) { return El.defineGame({ id, start(cfg, host) { return run(id, scene, cfg, host); } }); }
  };

  function run(gameId, scene, cfg, host) {
    const SL = El.SingLines, L = host.learn, rng = host.rng, mode = cfg.mode || 'pictures', little = !!cfg.little, root = host.root;
    let alive = true, S = null, audio = null, raf = 0, started = false, ended = false, total = 0, done = 0, first = 0, timers = [];
    const T = (fn, ms) => { const h = setTimeout(() => { if (alive) fn(); }, ms); timers.push(h); return h; };
    if (little) document.body.classList.add('little'); // Little Lanterns: 96 px top bar + results buttons (play.css)
    root.innerHTML = `<div class="sa sa-${scene}${little ? ' little' : ''}" data-mode="${mode}">
      <div class="sa-bg" aria-hidden="true"><i class="sa-hill a"></i><i class="sa-hill b"></i>${scene === 'stage' ? '<i class="sa-curtain l"></i><i class="sa-curtain r"></i><i class="sa-lights"></i>' : '<i class="sa-road"></i>'}<div class="sa-parade" id="saParade"></div></div>
      <div class="sa-lyr" id="saLyr" aria-live="off"><div class="sa-line cur" id="saCur"></div><div class="sa-line nxt" id="saNxt"></div></div>
      <div class="sa-wick" id="saWick" aria-hidden="true"><img src="${El.url('assets/img/wick-sm.webp')}" alt=""></div>
      <div class="sa-play" id="saPlay"></div>
      <div class="sa-foot"><button class="sa-pause" id="saPause" aria-label="Pause"><span class="bars"><i></i><i></i></span><svg class="tri" viewBox="0 0 52 52" aria-hidden="true"><path d="M18 12v28l22-14z" fill="currentColor"/></svg></button><div class="sa-shelf" id="saShelf" aria-label="Your words"></div></div>
      <div class="sa-card on" id="saStart"><div class="paper"><div class="sa-title" id="saTitle"></div><img class="sa-wbig" src="${El.url('assets/img/wick-sm.webp')}" alt="">
        <button class="sa-big" id="saGo" aria-label="Play the song"><svg viewBox="0 0 52 52" aria-hidden="true"><path d="M18 12v28l22-14z" fill="currentColor"/></svg></button><div class="sa-sub" id="saSub"></div></div></div></div>`;
    const $ = (s) => root.querySelector(s), play = $('#saPlay'), shelf = $('#saShelf'), cur = $('#saCur'), nxt = $('#saNxt'), card = $('#saStart'), wick = $('#saWick'), pauseB = $('#saPause');
    const bounce = (el, c) => { if (!el) return; el.classList.remove(c); void el.offsetWidth; el.classList.add(c); };
    const pic = (w) => (KIND.letter.includes(w) ? `<b class="sa-ltr">${w.toUpperCase()}</b>` : El.songPic(w));
    const label = (w) => (KIND.letter.includes(w) ? w.toUpperCase() : w);
    const sfxOn = () => El.store.load().set.sound;
    const intro = () => [SL.title[gameId], ...SL.how[little ? 'little' : mode], SL.go];

    // ---------------------------------------------------------------- music clock
    let lastCt = -1, lastAt = 0;
    const now = () => { const ct = audio.currentTime; const p = performance.now(); if (ct !== lastCt) { lastCt = ct; lastAt = p; }
      return audio.paused ? ct : ct + Math.min(.25, (p - lastAt) / 1000) * (audio.playbackRate || 1); };
    const sync = QA ? (window.__sing = { log: [], events: [], t: () => (audio ? now() : 0), audio: () => audio, song: () => S }) : null;

    // ---------------------------------------------------------------- lyrics (karaoke)
    let li = -2, lineEls = [];
    // spelled letters ("D-", "U-", "C-", "K!") are letter boxes; a word cut by a hyphen or dash joins the next one with no space
    const isLtr = (s) => /^[^A-Za-z]*[A-Z][^A-Za-z]*$/.test(s);
    const lineHtml = (l) => l.notes ? '<span class="notes">♪ ♫ ♪</span>' : l.w.map((w, k) => `<span class="w${isLtr(w[0]) ? ' ltr' : ''}${S.keys.has(nw(w[0])) ? ' key' : ''}" data-k="${k}">${w[0]}</span>${k < l.w.length - 1 ? (/[-—]$/.test(w[0]) ? '' : ' ') : ''}`).join('');
    function lyrics(t) {
      let i = -1; for (let k = 0; k < S.lines.length; k++) if (S.lines[k].t - .35 <= t) i = k; else break;
      if (i !== li) { li = i; const a = S.lines[i], b = S.lines[i + 1];
        cur.innerHTML = a && t < a.e + 2.5 ? lineHtml(a) : ''; nxt.innerHTML = b ? lineHtml(b) : ''; lineEls = [...cur.querySelectorAll('.w')]; bounce(cur, 'in'); }
      const l = S.lines[li]; if (!l || l.notes) return;
      for (const el of lineEls) { const w = l.w[+el.dataset.k], on = t >= w[1];
        if (on && !el.classList.contains('on')) { el.classList.add('on'); sungWord(w[0]); if (sync) sync.log.push({ w: w[0], s: w[1], ct: audio.currentTime, t }); }
        el.classList.toggle('now', on && t < Math.max(w[2], w[1] + .25)); } }
    // a word is sung: matching shelf chips glow (word labels light up when spoken)
    function sungWord(raw) { const w = nw(raw); if (!w) return; root.querySelectorAll(`.sa-chip[data-w="${w}"], .sa-walker[data-w="${w}"]`).forEach(c => bounce(c, 'sing')); }

    // ---------------------------------------------------------------- beat (Wick and the scene bob on the beat)
    let bi = 0; function beat(t) { const B = S.beats; if (bi > 0 && B[bi - 1] > t + .05) bi = 0; let hit = false; while (bi < B.length && B[bi] <= t) { bi++; hit = true; }
      if (hit) { bounce(wick, 'bt'); root.firstElementChild.style.setProperty('--beat', bi % 2 ? 1 : 0); } }

    // ---------------------------------------------------------------- moments (one after another for the whole song: content/songs.json events)
    // scored: pick (tap the picture you hear), read (read the printed word, tap its picture), spell (build the word as it's sung), sound (tap the letter that
    // makes the sound). Practice (no score, no fail): track (tap each word as it's sung: print goes left to right, one word at a time), flip (turn the
    // upside-down word the right way up), roll (outro roll call), stars (catch your words), beat (tap the drum on the beat where there are no words).
    // A moment stays on screen until the next one opens; a missed tap only makes the answer glow (then it is modelled), never a fail.
    const hasPic = (w) => !!(El.songPic.has(w) || (El.pics && El.pics[w]));
    const scoredN = (e) => (e.type === 'pick' || e.type === 'read' || e.type === 'spell') ? 1 : e.type === 'sound' ? e.items.length : 0;
    const choices = () => little ? 2 : mode === 'pictures' ? 2 + L.levelIndex(cfg.skill, 2) : mode === 'letters' ? 3 : 3 + L.levelIndex(cfg.skill, 2);
    const PRAISE = ['Yes!', 'Great!', 'Super!', 'You got it!', 'Wow!', 'Yay!', 'Nice!', 'Ta-da!'];
    let lastPraise = '';
    function cheer(el) { const p = rng.shuffle(PRAISE.filter(x => x !== lastPraise))[0]; lastPraise = p; const r = el.getBoundingClientRect(), rr = root.getBoundingClientRect();
      const s = document.createElement('b'); s.className = 'sa-cheer'; s.textContent = p; s.style.left = (r.left - rr.left + r.width / 2) + 'px'; s.style.top = (r.top - rr.top) + 'px'; s.style.setProperty('--r', (rng.next() * 16 - 8) + 'deg');
      root.appendChild(s); setTimeout(() => s.remove(), 1100); }
    function scoreUnit(item, correct, firstTry, chipW) { host.emit('mastery', { item, correct: !!correct, firstTry: !!firstTry }); if (firstTry) first++; done++; host.emit('progress', { done, total }); if (chipW) chip(chipW, !!firstTry); }
    function distractors(e, n, wantPic) { const w = e.word;
      if (e.kind && KIND[e.kind]) return rng.shuffle(KIND[e.kind].filter(x => x !== w)).slice(0, n);
      const sung = new Set(curLineWords()); // never offer another word the song is singing right now (e.g. hat in "Cat has a hat")
      const pool = rng.shuffle(S.pool.filter(x => x !== w && !sung.has(x))); // other pictured words from this song
      if (wantPic) return [...rng.shuffle((LOOK[w] || []).filter(x => hasPic(x))), ...rng.shuffle(S.pool.filter(x => x !== w))].filter((x, i, a) => a.indexOf(x) === i).slice(0, n); // reading: a look-alike picture first (cat / hat)
      if (mode === 'words' && LOOK[w]) return [...rng.shuffle(LOOK[w].slice()), ...pool].slice(0, n); // reading: look-alike words first
      return pool.slice(0, n); }
    function curLineWords() { const out = []; for (const l of S.lines) if (l.w && l.t - 4 <= now() && l.e + 1 >= now()) l.w.forEach(w => out.push(nw(w[0]))); return out; }
    function opts(e, wantPic) { const n = choices(); return rng.shuffle([e.word, ...distractors(e, n - 1, wantPic)]); }
    function optBtn(w, showPic, showLbl) { return `<button class="sa-opt${showPic ? '' : ' word'}" data-w="${w}" aria-label="${label(w)}">${showPic ? `<span class="pc">${pic(w)}</span>` : ''}${KIND.letter.includes(w) ? '' : `<b class="lbl${showLbl ? '' : ' hid'}">${label(w)}</b>`}</button>`; }
    // tap the right card: shared by pick + read
    function wireOpts(e, right, btns, onRight) { let miss = 0; if (QA) right.dataset.ok = '1';
      btns.forEach((b, k) => { b.style.setProperty('--k', k); b.onclick = () => { if (e.done) { bounce(b, 'boing'); return; } El.sfx.tap();
        if (b === right) { e.done = true; yes(b); cheer(b); b.querySelector('.lbl.hid') && b.querySelector('.lbl.hid').classList.remove('hid'); btns.forEach(x => { if (x !== b) x.classList.add('gone'); });
          if (onRight) onRight(b); scoreUnit(e.type === 'read' ? 'read ' + e.word : e.word, true, miss === 0, e.word); e.scored = true; return; }
        miss++; soft(b); if (miss >= 2 || little) right.classList.add('hint'); }; }); }
    const H = {
      pick: { start(e) { const wordsOnly = mode === 'words' && !e.kind, o = opts(e);
          play.innerHTML = `<div class="sa-pick" data-n="${o.length}">${o.map(w => optBtn(w, !wordsOnly, true)).join('')}</div>`;
          const btns = [...play.querySelectorAll('.sa-opt')], right = btns.find(b => b.dataset.w === e.word);
          wireOpts(e, right, btns, (b) => { if (wordsOnly) b.insertAdjacentHTML('afterbegin', `<span class="pc">${pic(e.word)}</span>`); if (e.sfx && sfxOn() && El.animal) El.animal.play(e.sfx, { gain: .6 }); });
          e.ui = { right }; },
        update(e, t) { if (!e.done && !e.hinted && e.t && t >= e.t + (little ? 1.4 : 2.4)) { e.hinted = true; e.ui.right.classList.add('hint'); } // missed: the answer glows
          if (e.deco && !e.decoOn && t >= e.deco.t) { e.decoOn = true; const d = document.createElement('span'); d.className = 'sa-deco'; d.dataset.w = e.deco.pic; d.innerHTML = `${pic(e.deco.pic)}<b class="lbl">${e.deco.pic}</b>`; e.ui.right.appendChild(d); bounce(e.ui.right, 'boing'); } },
        close(e) { if (!e.scored) { e.scored = true; scoreUnit(e.word, false, false, e.word); } } },
      read: { start(e) { const showLbl = mode !== 'words', o = opts(e, true);
          play.innerHTML = `<div class="sa-read"><div class="sa-book" aria-label="${e.word}"><i class="pg l"></i><i class="pg r"></i><b class="rw">${e.word}</b></div><div class="sa-pick" data-n="${o.length}">${o.map(w => optBtn(w, true, showLbl)).join('')}</div></div>`;
          const btns = [...play.querySelectorAll('.sa-opt')], right = btns.find(b => b.dataset.w === e.word);
          wireOpts(e, right, btns, () => { bounce(play.querySelector('.sa-book'), 'boing'); }); e.ui = { right }; },
        update(e, t) { if (!e.sungOn && t >= e.t) { e.sungOn = true; bounce(play.querySelector('.sa-book'), 'sing'); }
          if (!e.done && !e.hinted && t >= e.t + (little ? 1.4 : 2.2)) { e.hinted = true; e.ui.right.classList.add('hint'); } },
        close(e) { if (!e.scored) { e.scored = true; scoreUnit('read ' + e.word, false, false, e.word); } } },
      spell: { start: startSpell, update(e, t) { while (e.ui.sung < e.letters.length && e.letters[e.ui.sung] <= t) e.ui.sing(e.ui.sung++);
          if (e.sneeze && !e.sneezed && t >= e.sneeze) { e.sneezed = true; scoreSpell(e); sneeze(e); }
          if (e.sneezed && e.ui.catchIdle && t - e.ui.catchIdle > 2.5) { e.ui.catchIdle = t; const r = e.ui.catchNext(); if (r) r.classList.add('hint'); } },
        close(e) { scoreSpell(e); if (e.sneezed) e.ui.catchFill(); } },
      sound: { start(e) { const ls = e.items.map(x => x.l), extra = little ? [] : rng.shuffle(['m', 's', 't'].filter(x => !ls.includes(x))).slice(0, 1);
          play.innerHTML = `<div class="sa-sound"><div class="sa-say" aria-hidden="true"><span class="mouth"></span><b class="snd"></b></div><div class="sa-ltrs">${rng.shuffle([...ls, ...extra]).map((c, k) => `<button class="sa-lt" data-c="${c}" style="--k:${k}" aria-label="${c.toUpperCase()}"><b>${c.toUpperCase()}</b><i>${c}</i></button>`).join('')}</div></div>`;
          e.k = -1; e.ui = { btns: [...play.querySelectorAll('.sa-lt')], say: play.querySelector('.sa-say') };
          e.ui.btns.forEach(b => { b.onclick = () => { El.sfx.tap(); const it = e.items[e.k]; if (!it || it.done) { bounce(b, 'boing'); return; }
            if (b.dataset.c === it.l) { it.done = true; it.scored = true; yes(b); cheer(b); scoreUnit('sound ' + it.l, true, !it.miss, it.l); if (QA) delete b.dataset.ok; return; }
            it.miss = (it.miss || 0) + 1; soft(b); if (it.miss >= 2 || little) e.ui.btns.find(x => x.dataset.c === it.l).classList.add('hint'); }; }); },
        update(e, t) { let k = -1; e.items.forEach((it, i) => { if (t >= it.t - .1) k = i; });
          if (k !== e.k) { if (e.k >= 0) soundMiss(e, e.items[e.k]); e.k = k; e.ui.btns.forEach(b => { b.classList.remove('hint', 'cur'); if (QA) delete b.dataset.ok; });
            const r = e.ui.btns.find(b => b.dataset.c === e.items[k].l); if (QA && r) r.dataset.ok = '1'; e.ui.say.querySelector('.snd').textContent = ''; }
          const it = e.items[e.k]; if (!it) return;
          if (!it.sndOn && t >= it.snd) { it.sndOn = true; const s = e.ui.say.querySelector('.snd'); s.textContent = `“${{ a: 'ah', b: 'buh', m: 'mmm', s: 'sss', t: 'tuh' }[it.l]}!”`; bounce(e.ui.say, 'boing'); }
          if (!it.done && !it.hinted && t >= it.snd + (little ? .6 : 1.2)) { it.hinted = true; const r = e.ui.btns.find(b => b.dataset.c === it.l); if (r) r.classList.add('hint'); } },
        close(e) { e.items.forEach(it => soundMiss(e, it)); } },
      flip: { start(e) { play.innerHTML = `<div class="sa-flips">${e.words.map((x, k) => `<button class="sa-flip wait" data-k="${k}" aria-label="${x.w}">${hasPic(x.w) ? `<span class="pc">${pic(x.w)}</span>` : ''}<b class="lbl">${x.w}</b></button>`).join('')}</div>`;
          e.ui = { cards: [...play.querySelectorAll('.sa-flip')] };
          e.ui.cards.forEach((c, k) => { c.onclick = () => { El.sfx.tap(); if (c.classList.contains('wait')) return; if (c.classList.contains('up')) { bounce(c, 'boing'); return; } flipUp(e, k, true); }; }); },
        update(e, t) { e.words.forEach((x, k) => { const c = e.ui.cards[k]; if (c.classList.contains('wait') && t >= x.t - .4) { c.classList.remove('wait'); bounce(c, 'pop'); if (QA) c.dataset.ok = '1'; }
          const nextT = e.words[k + 1] ? e.words[k + 1].t - .5 : e.close - .5; if (!c.classList.contains('wait') && !c.classList.contains('up') && t >= nextT) flipUp(e, k, false); }); },
        close() {} },
      track: { start(e) { const n = e.words.length;
          play.innerHTML = `<div class="sa-track th-${e.theme || 'bubble'}" data-n="${n}">${e.words.map((w, k) => { const c = clean(w[0]), b = nw(w[0]);
            return `<button class="sa-word" data-k="${k}" aria-label="${c}" style="--k:${k}">${hasPic(b) && b.length > 2 ? `<span class="pc">${pic(b)}</span>` : ''}<b>${c}</b></button>`; }).join('')}</div>`;
          e.ui = { ws: [...play.querySelectorAll('.sa-word')] };
          e.ui.ws.forEach((b, k) => { b.onclick = () => { const w = e.words[k]; if (b.classList.contains('got')) { bounce(b, 'boing'); return; }
            if (now() >= w[1] - .15) { b.classList.add('got'); if (sfxOn()) El.sfx.step(k); sparkle(b, 6); if (QA) delete b.dataset.ok; if (k === e.words.length - 1 || rng.next() < .25) cheer(b); }
            else bounce(b, 'wiggle'); }; }); }, // a word that isn't sung yet just wiggles ("wait for it")
        update(e, t) { e.ui.ws.forEach((b, k) => { const w = e.words[k], on = t >= w[1], nowW = on && t < Math.max(w[2], w[1] + .3);
          b.classList.toggle('sung', on); b.classList.toggle('now', nowW); if (QA) { if (on && !b.classList.contains('got')) b.dataset.ok = '1'; else delete b.dataset.ok; } }); },
        close() {} },
      roll: { start(e) { play.innerHTML = `<div class="sa-roll">${e.words.map((w, k) => `<button class="sa-rc" data-k="${k}" aria-label="${w}"><span class="pc">${pic(w)}</span><b class="lbl">${w}</b></button>`).join('')}</div>`;
          e.ui = { cs: [...play.querySelectorAll('.sa-rc')] };
          e.ui.cs.forEach((c, k) => { c.onclick = () => { if (now() < e.times[k] - .2 || c.classList.contains('got')) { bounce(c, 'wiggle'); return; } El.sfx.tap(); c.classList.add('got'); yes(c); if (k === e.words.length - 1) cheer(c); if (QA) delete c.dataset.ok; }; }); },
        update(e, t) { e.k = e.k || 0; while (e.k < e.times.length && e.times[e.k] <= t) { const c = e.ui.cs[e.k]; c.classList.add('lit'); bounce(c, 'pop'); if (QA) c.dataset.ok = '1'; roll(e, e.k++); } },
        close() {} },
      stars: { start(e) { const ws = [...shelf.querySelectorAll('.sa-chip')].map(c => c.dataset.w).filter(w => w.length > 1); const list = (ws.length ? ws : S.pool).slice(0, 6);
          play.innerHTML = `<div class="sa-stars">${list.map((w, k) => `<button class="sa-star" data-w="${w}" style="--k:${k}" aria-label="${w}"><span class="pc">${pic(w)}</span><b class="lbl">${w}</b></button>`).join('')}</div>`;
          play.querySelectorAll('.sa-star').forEach(b => { if (QA) b.dataset.ok = '1'; b.onclick = () => { El.sfx.tap(); if (b.classList.contains('got')) { bounce(b, 'boing'); return; } b.classList.add('got'); sparkle(b, 10); cheer(b);
            shelf.querySelectorAll(`.sa-chip[data-w="${b.dataset.w}"]`).forEach(c => bounce(c, 'sing')); if (QA) delete b.dataset.ok; }; }); },
        update() {}, close() {} },
      beat: { start(e) { play.innerHTML = `<div class="sa-beat"><button class="sa-drum" aria-label="drum"><span class="pc">${pic('drum')}</span><b class="lbl">drum</b></button><div class="sa-hits" aria-hidden="true"></div></div>`;
          const d = play.querySelector('.sa-drum'), hits = play.querySelector('.sa-hits'); e.hits = 0; if (QA) d.dataset.ok = '1';
          d.onclick = () => { const t = now(), B = S.beats; let best = 9; for (const b of B) { const x = Math.abs(b - t); if (x < best) best = x; if (b > t + 1) break; }
            if (sfxOn() && El.animal) El.animal.play('drum', { gain: .35 }); bounce(d, 'boing');
            if (best < .16) { e.hits++; hits.insertAdjacentHTML('beforeend', '<i>★</i>'); if (hits.children.length > 8) hits.firstElementChild.remove(); if (e.hits % 4 === 0) cheer(d); } }; },
        update(e, t) { const B = S.beats; e.bi = e.bi || 0; let hit = false; while (e.bi < B.length && B[e.bi] <= t) { e.bi++; hit = true; } if (hit) bounce(play.querySelector('.sa-drum'), 'bt'); },
        close() {} }
    };
    const clean = (s) => String(s).replace(/[“”"!?,.—]/g, '').replace(/-$/, '');
    function soundMiss(e, it) { if (it.scored) return; it.scored = true; const r = e.ui.btns.find(b => b.dataset.c === it.l); if (r) r.classList.add('hint', 'model'); scoreUnit('sound ' + it.l, false, false, it.l); }
    function flipUp(e, k, byTap) { const c = e.ui.cards[k]; c.classList.add('up'); if (QA) delete c.dataset.ok; bounce(c, 'boing');
      if (byTap) { yes(c); cheer(c); if (e.words[k].w === 'owl' && sfxOn() && El.animal) El.animal.play('owl', { gain: .5 }); } }
    function startSpell(e) { const word = e.word, n = word.length, extra = little || mode === 'pictures' ? 0 : mode === 'letters' ? 1 : 2;
      const pool = ABC.split('').filter(c => !word.includes(c)), tiles = rng.shuffle([...word.split(''), ...rng.shuffle(pool).slice(0, extra)]);
      const showLbl = mode !== 'words', ghost = mode === 'pictures' || little;
      play.innerHTML = `<div class="sa-spell" data-n="${n}"><div class="sa-tgt"><span class="pc">${pic(word)}</span>${showLbl ? `<b class="lbl">${word}</b>` : ''}</div>
        <div class="sa-slots">${word.split('').map((c, k) => `<span class="sa-slot" data-k="${k}">${ghost ? `<i class="gh">${c}</i>` : ''}<b></b></span>`).join('')}</div>
        <div class="sa-tiles" data-n="${tiles.length}">${tiles.map((c, k) => `<button class="sa-tile" data-c="${c}" aria-label="${c.toUpperCase()}" style="--k:${k}">${c}</button>`).join('')}</div></div>`;
      const slots = [...play.querySelectorAll('.sa-slot')], tbtn = [...play.querySelectorAll('.sa-tile')]; let next = 0, miss = 0;
      const mark = () => { tbtn.forEach(b => { b.classList.remove('hint'); if (QA) delete b.dataset.ok; }); const r = tbtn.find(b => !b.disabled && b.dataset.c === word[next]); if (r && QA) r.dataset.ok = '1'; return r; };
      const place = (b, auto) => { const s = slots[next]; s.querySelector('b').textContent = word[next]; s.classList.add(auto ? 'auto' : 'fill'); bounce(s, 'pop');
        if (b) { b.disabled = true; b.classList.add('used'); } if (!auto && sfxOn()) El.sfx.step(next); next++; if (next >= n) { e.built = true; e.ui.wrap.classList.add('built'); } mark(); };
      tbtn.forEach(b => { b.onclick = () => { if (e.scored || e.built || b.disabled) return;
        if (b.dataset.c === word[next]) { place(b, false); if (e.built) { e.first = miss === 0; const tg = play.querySelector('.sa-tgt'); yes(tg); cheer(tg); } return; }
        miss++; soft(b); if (miss >= 2) { const r = mark(); if (r) r.classList.add('hint'); } }; });
      mark(); e.ui = { slots, wrap: play.querySelector('.sa-spell'), sung: 0,
        sing(k) { const s = slots[k]; if (s) { s.classList.add('sung'); bounce(s, 'pop'); } if (!e.built && next <= k) { const r = mark(); if (r) r.classList.add('hint'); } },
        fill() { while (next < n) { const b = tbtn.find(x => !x.disabled && x.dataset.c === word[next]); place(b, true); } } }; }
    function scoreSpell(e) { if (e.scored) return; e.scored = true; if (!e.built) { e.ui.fill(); e.first = false; } else if (e.first == null) e.first = false;
      scoreUnit('spell ' + e.word, true, e.built && e.first, e.word); }
    // "Then sneezes the letters, Achoo!": the built word's letters fly all over; the child catches them in order to build it again (practice, no score)
    function sneeze(e) { const wrap = e.ui.wrap, word = e.word; wrap.classList.add('achoo'); play.classList.add('catching'); bounce(wrap.querySelector('.sa-tgt'), 'sneeze');
      e.ui.slots.forEach(s => { s.classList.remove('fill', 'auto', 'sung'); s.querySelector('b').textContent = ''; if (!s.querySelector('.gh')) s.insertAdjacentHTML('afterbegin', `<i class="gh">${word[+s.dataset.k]}</i>`); });
      wrap.classList.remove('built'); const tl = wrap.querySelector('.sa-tiles'); if (tl) tl.remove();
      const sp = document.createElement('div'); sp.className = 'sa-catch'; const order = rng.shuffle(word.split('').map((c, k) => ({ c, k })));
      // scatter spots: across the floor under the word (two staggered rows), so the letters never cover the panda, the slots or each other
      sp.innerHTML = order.map((o, i) => `<button class="sa-tile flying" data-c="${o.c}" aria-label="${o.c.toUpperCase()}" style="--x:${(((i + .5) / order.length) * 100).toFixed(1)}%;--y:${i % 2 ? 88 : 70}%;--k:${i}">${o.c}</button>`).join('');
      play.appendChild(sp); let next = 0; const btns = [...sp.querySelectorAll('.sa-tile')];
      const nextBtn = () => { btns.forEach(b => { b.classList.remove('hint'); if (QA) delete b.dataset.ok; }); const r = btns.find(b => !b.disabled && b.dataset.c === word[next]); if (r && QA) r.dataset.ok = '1'; return r; };
      const put = (b, auto) => { const s = e.ui.slots[next]; s.querySelector('b').textContent = word[next]; s.classList.add(auto ? 'auto' : 'fill'); bounce(s, 'pop'); if (b) { b.disabled = true; b.classList.add('used'); }
        if (!auto && sfxOn()) El.sfx.step(next); next++; if (next >= word.length) { wrap.classList.add('built'); e.ui.catchIdle = 0; if (!auto) { const tg = wrap.querySelector('.sa-tgt'); yes(tg); cheer(tg); } } nextBtn(); };
      btns.forEach(b => { b.onclick = () => { if (b.disabled || next >= word.length) return; e.ui.catchIdle = now();
        if (b.dataset.c === word[next]) put(b, false); else { soft(b); } }; });
      e.ui.catchIdle = now(); e.ui.catchNext = nextBtn; e.ui.catchFill = () => { while (next < word.length) put(btns.find(x => !x.disabled && x.dataset.c === word[next]), true); }; nextBtn(); }
    // roll call at the end of a song: shelf chips light up as their names are sung
    function roll(e, k) { root.querySelectorAll(`.sa-chip[data-w="${e.words[k]}"], .sa-walker[data-w="${e.words[k]}"]`).forEach(c => bounce(c, 'sing')); }
    function chip(w, star) { const old = shelf.querySelector(`.sa-chip[data-w="${w}"]`); if (old) { if (star) old.classList.add('star'); bounce(old, 'sing'); return; }
      const c = document.createElement('button'); c.className = 'sa-chip' + (star ? ' star' : ''); c.dataset.w = w; c.setAttribute('aria-label', label(w));
      c.innerHTML = `<span class="pc">${pic(w)}</span>${KIND.letter.includes(w) ? '' : `<b class="lbl">${label(w)}</b>`}`; c.onclick = () => chipTap(c); shelf.appendChild(c); bounce(c, 'join');
      // and it joins the parade (zoo: marches along the road; stage: dances in the band), bobbing on the beat
      const pr = $('#saParade'), wk = document.createElement('i'); wk.className = 'sa-walker'; wk.dataset.w = w; wk.style.setProperty('--k', pr.children.length); wk.innerHTML = pic(w); pr.appendChild(wk);
      shelf.scrollLeft = shelf.scrollWidth; }
    // shelf chip: during the song it just bounces (no voice over the music); stopped: Bella reads it, its label lights while she speaks
    let speaking = null;
    function chipTap(c) { bounce(c, 'sing'); if (audio && !audio.paused && !ended) return; const w = c.dataset.w;
      if (speaking) speaking.classList.remove('say'); speaking = c; c.classList.add('say');
      host.sayThen(w.length === 1 ? SL.letter(w) : SL.word(w), { rate: 1 }, () => { c.classList.remove('say'); if (speaking === c) speaking = null; }, 0); }
    function yes(b) { if (sfxOn()) El.sfx.right(); b.classList.add('yes'); bounce(b, 'boing'); sparkle(b); bounce(wick, 'cheer'); }
    function soft(b) { bounce(b, 'wiggle'); const c = El.audio && El.audio(); if (!c) return; const t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(420, t); o.frequency.linearRampToValueAtTime(360, t + .25);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.06, t + .03); g.gain.exponentialRampToValueAtTime(.0008, t + .3); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + .35); }
    function sparkle(b, n) { n = n || 10; const r = b.getBoundingClientRect(), rr = root.getBoundingClientRect(); for (let i = 0; i < n; i++) { const s = document.createElement('i'); s.className = 'll-spark'; const a = i / n * Math.PI * 2, d = 50 + (i % 3) * 20;
      s.style.left = (r.left - rr.left + r.width / 2) + 'px'; s.style.top = (r.top - rr.top + r.height / 2) + 'px'; s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px'); s.style.background = ['#F5B841', '#7CC4A4', '#F08A7E', '#9B8AD1', '#F6EBD9'][(i + rng.int(0, 4)) % 5];
      root.appendChild(s); setTimeout(() => s.remove(), 900); } }
    function openM(e) { e.on = true; play.classList.remove('catching'); play.innerHTML = ''; H[e.type].start(e); if (play.firstElementChild) play.firstElementChild.dataset.type = e.type; if (sync) sync.events.push({ type: e.type, word: e.word, open: e.open, ct: audio.currentTime }); }
    function closeM(e) { e.closed = true; H[e.type].close(e); }
    function moments(t) {
      for (const e of S.events) if (e.type === 'roll' && e.open == null) { e.k = e.k || 0; while (e.k < e.times.length && e.times[e.k] <= t) roll(e, e.k++); } // passive roll call (shelf only)
      for (const e of S.events) {
        if (e.closed || (e.type === 'roll' && e.open == null)) continue;
        if (!e.on) { if (t < e.open) break; openM(e); }
        H[e.type].update(e, t);
        if (t >= e.close) { closeM(e); continue; }
        break; // one moment at a time
      } }

    // ---------------------------------------------------------------- loop, start, pause, end
    let warned = false;
    function tick() { if (!alive || !audio) return; const t = now();
      try { lyrics(t); beat(t); moments(t); } catch (err) { if (!warned) { warned = true; (QA ? console.error : console.warn)('sing-along tick', err); } } // the song never loses its game because of one bad frame
      raf = requestAnimationFrame(tick); }
    let userPaused = false;
    function begin() { if (!alive) return; card.classList.remove('on'); pauseB.classList.remove('off'); started = true; userPaused = false; const p = audio.play(); if (p && p.catch) p.catch(() => showCard('start')); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
    function showCard(kind) { card.classList.add('on'); card.dataset.kind = kind; }
    function pause() { if (!started || ended || audio.paused) return; userPaused = true; audio.pause(); cancelAnimationFrame(raf); pauseB.classList.add('off'); showCard('paused'); host.say(SL.paused, { rate: 1 }); }
    function resume() { host.say(''); begin(); }
    function finale() { if (ended) return; ended = true; cancelAnimationFrame(raf);
      for (const e of S.events) if (!(e.type === 'roll' && e.open == null) && !e.closed && scoredN(e)) { if (!e.on) openM(e); closeM(e); }
      cur.innerHTML = ''; nxt.innerHTML = ''; root.firstElementChild.classList.add('fin');
      [...shelf.children].forEach((c, k) => T(() => bounce(c, 'sing'), 200 + k * 260));
      host.sayThen([SL.end, SL.tapWord], { rate: 1 }, () => T(() => host.end({ total, done: total, firstTry: first }), 900), 300); }
    const onVis = () => { if (document.hidden) pause(); };
    const onSound = () => { if (audio) audio.muted = !El.store.load().set.sound; };
    document.addEventListener('visibilitychange', onVis); window.addEventListener('el:sound', onSound);

    songs().then(D => { if (!alive) return; const src = D.songs[cfg.song]; if (!src) { console.warn('sing-along: unknown song', cfg.song); return; }
      // fresh copy of the song's moments for this play (state lives on the copies)
      S = Object.assign({}, src, { events: src.events.map(e => Object.assign({}, e)) });
      S.pool = [...new Set(S.events.filter(e => e.word && !e.kind).map(e => e.word))];
      S.keys = new Set(S.events.flatMap(e => e.word ? [e.word] : e.type === 'track' ? [] : (e.words || []).map(x => x.w || x)));
      total = S.events.reduce((n, e) => n + scoredN(e), 0); host.emit('progress', { done: 0, total });
      $('#saTitle').textContent = S.title;
      if (El.animal) El.animal.load(['duck', 'owl']); // recorded quack + hoot ready before their moments
      audio = new Audio(); audio.preload = 'auto'; let ext = 'mp3'; try { if (audio.canPlayType('audio/ogg; codecs="opus"') === 'probably') ext = 'opus'; } catch (e) {}
      audio.src = El.url(S.src + '.' + ext); audio.muted = !El.store.load().set.sound;
      audio.onerror = () => { if (/\.opus$/.test(audio.src)) { audio.src = El.url(S.src + '.mp3'); } };
      audio.onended = () => finale();
      // the music stopped by itself (phone call, another app took the audio): show the pause card so the game and song stay together
      audio.onpause = () => { if (started && !ended && !userPaused && alive && !audio.ended) { userPaused = true; cancelAnimationFrame(raf); pauseB.classList.add('off'); showCard('paused'); } };
      if (sync) sync.audio = () => audio;
      const go = $('#saGo');
      go.onclick = () => { El.sfx.tap();
        if (card.dataset.kind === 'paused') { resume(); return; }
        if (card.dataset.kind === 'start') { begin(); return; } // play() was refused once: this tap starts the music directly
        card.dataset.kind = 'intro'; go.disabled = true; bounce(wick, 'cheer');
        // unlock the music element inside this tap (iOS), then let Bella explain (her line ends before the music starts)
        audio.muted = true; const p = audio.play(); const back = () => { audio.pause(); audio.currentTime = 0; audio.muted = !El.store.load().set.sound; };
        if (p && p.then) p.then(back, () => {}); else back();
        host.sayThen(intro(), { rate: 1 }, () => { go.disabled = false; begin(); }, 250); };
      const wb = $('.sa-wbig'); wb.onclick = () => { bounce(wb, 'cheer'); if (card.dataset.kind !== 'intro') host.say(intro().slice(0, -1), { rate: 1 }); }; // tap Wick on the card: hear how to play again
      pauseB.onclick = () => (audio.paused ? (started && !ended ? resume() : null) : pause());
    });
    return { stop() { alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('el:sound', onSound);
      if (audio) { try { audio.onended = null; audio.pause(); audio.removeAttribute('src'); audio.load(); } catch (e) {} } host.say(''); } };
  }
})();
