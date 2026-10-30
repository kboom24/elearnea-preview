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
  const LOOK = { cat: ['hat', 'cot', 'cap', 'can'], duck: ['dock', 'luck', 'deck'], frog: ['fog', 'flag', 'from'], bear: ['pear', 'beat', 'bean'], pear: ['bear', 'peak', 'near'],
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
      <div class="sa-bg" aria-hidden="true"><i class="sa-hill a"></i><i class="sa-hill b"></i>${scene === 'stage' ? '<i class="sa-curtain l"></i><i class="sa-curtain r"></i><i class="sa-lights"></i>' : '<i class="sa-road"></i>'}</div>
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
    const lineHtml = (l) => l.notes ? '<span class="notes">♪ ♫ ♪</span>' : l.w.map((w, k) => `<span class="w${/^[A-Z]$/.test(w[0]) ? ' ltr' : ''}${S.keys.has(nw(w[0])) ? ' key' : ''}" data-k="${k}">${w[0]}</span>`).join(' ');
    function lyrics(t) {
      let i = -1; for (let k = 0; k < S.lines.length; k++) if (S.lines[k].t - .35 <= t) i = k; else break;
      if (i !== li) { li = i; const a = S.lines[i], b = S.lines[i + 1];
        cur.innerHTML = a && t < a.e + 2.5 ? lineHtml(a) : ''; nxt.innerHTML = b ? lineHtml(b) : ''; lineEls = [...cur.querySelectorAll('.w')]; bounce(cur, 'in'); }
      const l = S.lines[li]; if (!l || l.notes) return;
      for (const el of lineEls) { const w = l.w[+el.dataset.k], on = t >= w[1];
        if (on && !el.classList.contains('on')) { el.classList.add('on'); sungWord(w[0]); if (sync) sync.log.push({ w: w[0], s: w[1], ct: audio.currentTime, t }); }
        el.classList.toggle('now', on && t < Math.max(w[2], w[1] + .25)); } }
    // a word is sung: matching shelf chips glow (word labels light up when spoken)
    function sungWord(raw) { const w = nw(raw); if (!w) return; shelf.querySelectorAll(`.sa-chip[data-w="${w}"]`).forEach(c => bounce(c, 'sing')); }

    // ---------------------------------------------------------------- beat (Wick and the scene bob on the beat)
    let bi = 0; function beat(t) { const B = S.beats; if (bi > 0 && B[bi - 1] > t + .05) bi = 0; let hit = false; while (bi < B.length && B[bi] <= t) { bi++; hit = true; }
      if (hit) { bounce(wick, 'bt'); root.firstElementChild.style.setProperty('--beat', bi % 2 ? 1 : 0); } }

    // ---------------------------------------------------------------- moments
    const choices = () => little ? 2 : mode === 'pictures' ? 2 + L.levelIndex(cfg.skill, 2) : mode === 'letters' ? 3 : 3 + L.levelIndex(cfg.skill, 2);
    function distractors(e, n) { const w = e.word;
      if (e.kind && KIND[e.kind]) return rng.shuffle(KIND[e.kind].filter(x => x !== w)).slice(0, n);
      const pool = rng.shuffle(S.pool.filter(x => x !== w)); // other pictured words from this song
      if (mode === 'words' && LOOK[w]) return [...rng.shuffle(LOOK[w].slice()), ...pool].slice(0, n); // reading: look-alike words first
      return pool.slice(0, n); }
    function startPick(e) { const n = choices(), opts = rng.shuffle([e.word, ...distractors(e, n - 1)]); let miss = 0;
      const wordsOnly = mode === 'words' && !e.kind;
      play.innerHTML = `<div class="sa-pick" data-n="${opts.length}">${opts.map(w => `<button class="sa-opt${wordsOnly ? ' word' : ''}" data-w="${w}" aria-label="${label(w)}">${wordsOnly ? '' : `<span class="pc">${pic(w)}</span>`}<b class="lbl">${label(w)}</b></button>`).join('')}</div>`;
      const btns = [...play.querySelectorAll('.sa-opt')], right = btns.find(b => b.dataset.w === e.word); if (QA) right.dataset.ok = '1';
      btns.forEach((b, k) => { b.style.setProperty('--k', k); b.onclick = () => { if (e.done) return; El.sfx.tap();
        if (b === right) { e.done = true; e.first = miss === 0; yes(b); if (wordsOnly) b.insertAdjacentHTML('afterbegin', `<span class="pc">${pic(e.word)}</span>`); T(() => finish(e, true), 650); return; }
        miss++; soft(b); if (miss >= 2 || little) right.classList.add('hint'); }; });
      e.ui = { right }; }
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
      tbtn.forEach(b => { b.onclick = () => { if (e.done || e.built || b.disabled) return;
        if (b.dataset.c === word[next]) { place(b, false); if (e.built) { e.first = miss === 0; yes(play.querySelector('.sa-tgt')); } return; }
        miss++; soft(b); if (miss >= 2) { const r = mark(); if (r) r.classList.add('hint'); } }; });
      mark(); e.ui = { slots, wrap: play.querySelector('.sa-spell'), sung: 0,
        sing(k) { const s = slots[k]; if (s) { s.classList.add('sung'); bounce(s, 'pop'); } if (!e.built && next <= k) { const r = mark(); if (r) r.classList.add('hint'); } },
        fill() { while (next < n) { const b = tbtn.find(x => !x.disabled && x.dataset.c === word[next]); place(b, true); } } }; }
    // roll call at the end of a song: shelf chips light up as their names are sung
    function roll(e, k) { const c = shelf.querySelector(`.sa-chip[data-w="${e.words[k]}"]`); if (c) bounce(c, 'sing'); }
    function finish(e, byTap) { if (e.over) return; e.over = true; clearHints();
      if (e.type === 'spell') { if (!e.built) { e.ui.fill(); e.first = false; } else if (e.first == null) e.first = false; }
      const ok = e.type === 'spell' ? e.built && e.first : !!e.done && e.first;
      if (!byTap && e.type === 'pick' && !e.done) { e.first = false; if (e.ui.right) e.ui.right.classList.add('hint', 'model'); }
      host.emit('mastery', { item: e.type === 'spell' ? 'spell ' + e.word : e.word, correct: !!(e.done || e.built), firstTry: !!ok }); if (ok) first++; done++;
      host.emit('progress', { done, total });
      chip(e.word, ok); const out = play.firstElementChild; if (out) { out.classList.add('out'); T(() => { if (play.firstElementChild === out) play.innerHTML = ''; }, byTap ? 450 : 900); } }
    function clearHints() { play.querySelectorAll('.hint').forEach(b => b.classList.remove('hint')); }
    function chip(w, star) { if (shelf.querySelector(`.sa-chip[data-w="${w}"]`)) { bounce(shelf.querySelector(`.sa-chip[data-w="${w}"]`), 'sing'); return; }
      const c = document.createElement('button'); c.className = 'sa-chip' + (star ? ' star' : ''); c.dataset.w = w; c.setAttribute('aria-label', label(w));
      c.innerHTML = `<span class="pc">${pic(w)}</span><b class="lbl">${label(w)}</b>`; c.onclick = () => chipTap(c); shelf.appendChild(c); bounce(c, 'join');
      shelf.scrollLeft = shelf.scrollWidth; }
    // shelf chip: during the song it just bounces (no voice over the music); stopped: Bella reads it, its label lights while she speaks
    let speaking = null;
    function chipTap(c) { bounce(c, 'sing'); if (audio && !audio.paused && !ended) return; const w = c.dataset.w;
      if (speaking) speaking.classList.remove('say'); speaking = c; c.classList.add('say');
      host.sayThen(w.length === 1 ? SL.letter(w) : SL.word(w), { rate: 1 }, () => { c.classList.remove('say'); if (speaking === c) speaking = null; }, 0); }
    function yes(b) { if (sfxOn()) El.sfx.right(); b.classList.add('yes'); bounce(b, 'boing'); sparkle(b); bounce(wick, 'cheer'); }
    function soft(b) { bounce(b, 'wiggle'); const c = El.audio && El.audio(); if (!c) return; const t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(420, t); o.frequency.linearRampToValueAtTime(360, t + .25);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.06, t + .03); g.gain.exponentialRampToValueAtTime(.0008, t + .3); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + .35); }
    function sparkle(b) { const r = b.getBoundingClientRect(), rr = root.getBoundingClientRect(); for (let i = 0; i < 10; i++) { const s = document.createElement('i'); s.className = 'll-spark'; const a = i / 10 * Math.PI * 2, d = 50 + (i % 3) * 20;
      s.style.left = (r.left - rr.left + r.width / 2) + 'px'; s.style.top = (r.top - rr.top + r.height / 2) + 'px'; s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px'); s.style.background = ['#F5B841', '#7CC4A4', '#F08A7E', '#9B8AD1', '#F6EBD9'][i % 5];
      root.appendChild(s); setTimeout(() => s.remove(), 900); } }
    function moments(t) {
      for (const e of S.events) {
        if (e.type === 'roll') { e.k = e.k || 0; while (e.k < e.times.length && e.times[e.k] <= t) roll(e, e.k++); continue; }
        if (e.over) continue;
        if (!e.on && t >= e.open) { e.on = true; if (e.type === 'pick') startPick(e); else startSpell(e); if (sync) sync.events.push({ type: e.type, word: e.word, open: e.open, ct: audio.currentTime }); }
        if (e.on && e.type === 'spell') while (e.ui.sung < e.letters.length && e.letters[e.ui.sung] <= t) e.ui.sing(e.ui.sung++);
        if (e.on && e.type === 'pick' && little && !e.done && !e.hinted && e.t && t >= e.t + 1.4) { e.hinted = true; e.ui.right.classList.add('hint'); } // Little Lanterns: the answer glows soon after it's sung
        if (e.on && t >= e.close) finish(e, false);
        if (e.on && !e.over) break; // one moment at a time
      } }

    // ---------------------------------------------------------------- loop, start, pause, end
    function tick() { if (!alive || !audio) return; const t = now(); lyrics(t); beat(t); moments(t); raf = requestAnimationFrame(tick); }
    function begin() { if (!alive) return; card.classList.remove('on'); pauseB.classList.remove('off'); started = true; const p = audio.play(); if (p && p.catch) p.catch(() => showCard('start')); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
    function showCard(kind) { card.classList.add('on'); card.dataset.kind = kind; }
    function pause() { if (!started || ended || audio.paused) return; audio.pause(); cancelAnimationFrame(raf); pauseB.classList.add('off'); showCard('paused'); host.say(SL.paused, { rate: 1 }); }
    function resume() { host.say(''); begin(); }
    function finale() { if (ended) return; ended = true; cancelAnimationFrame(raf); for (const e of S.events) if (e.type !== 'roll' && !e.over) { if (!e.on) { e.on = true; e.type === 'pick' ? startPick(e) : startSpell(e); } finish(e, false); }
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
      S.keys = new Set(S.events.flatMap(e => e.word ? [e.word] : e.words || []));
      total = S.events.filter(e => e.type !== 'roll').length; host.emit('progress', { done: 0, total });
      $('#saTitle').textContent = S.title;
      audio = new Audio(); audio.preload = 'auto'; let ext = 'mp3'; try { if (audio.canPlayType('audio/ogg; codecs="opus"') === 'probably') ext = 'opus'; } catch (e) {}
      audio.src = El.url(S.src + '.' + ext); audio.muted = !El.store.load().set.sound;
      audio.onerror = () => { if (/\.opus$/.test(audio.src)) { audio.src = El.url(S.src + '.mp3'); } };
      audio.onended = () => finale();
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
