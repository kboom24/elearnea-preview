/* Mothabet adapter: the Mothabet game runs in a same-origin frame (play/mothabet/game/) behind the shared game contract.
   One source of truth for learning: El.Learn. The frame posts its stage's word pool; this adapter picks the round with
   host.learn.pick(skill, pool, 10) at host.learn.difficulty(skill), and each word's first attempt becomes host.emit('mastery'),
   which El.Learn records (Leitner box + difficulty). Round end -> host.end, which shows Elearnea's results card (Again / Path).
   Lesson config: {band, stageId, stage}. stageId (e.g. 's1') wins; stage (index) is the fallback. ?qa=1 on the play page is
   forwarded so the frame's QA hook exists only in QA runs. Protocol: see play/mothabet/game/bridge.js and docs/MOTHABET-INTEGRATION.md. */
const MIN3 = 5; // fewest attempted words for 3 stars
El.defineGame({
  id: 'mothabet',
  start(cfg, host) {
    const f = document.createElement('iframe'); f.title = 'Mothabet'; f.allow = 'autoplay';
    const qp = new URLSearchParams({ lesson: '1', band: cfg.band || 's', stage: String(cfg.stage | 0) });
    if (cfg.stageId) qp.set('stageId', cfg.stageId);
    if (new URLSearchParams(location.search).get('qa') === '1') qp.set('qa', '1');
    f.src = El.url('play/mothabet/game/index.html') + '?' + qp.toString();
    host.root.innerHTML = ''; host.root.appendChild(f);
    let ended = false, total = 10;
    const soundOn = () => { const s = El.store.load().set; return !!(s.sound || s.voice); }; // same rule as El.ui.soundBtn
    const send = (m) => { try { f.contentWindow.postMessage(Object.assign({ el: 1, src: 'elearnea' }, m), location.origin); } catch (er) {} };
    const onMsg = (e) => { if (e.origin !== location.origin || e.source !== f.contentWindow || !e.data || e.data.el !== 1 || e.data.src !== 'mothabet') return; const m = e.data;
      if (m.type === 'ready') { try { f.contentWindow.focus(); } catch (er) {} send({ type: 'sound', on: soundOn() });
        if (m.lesson && Array.isArray(m.pool) && m.pool.length) { const words = host.learn.pick(cfg.skill, m.pool.slice(), Math.min(10, m.pool.length), host.rng); total = words.length;
          send({ type: 'start', words, d: host.learn.difficulty(cfg.skill) }); host.emit('progress', { done: 0, total }); } }
      else if (m.type === 'word' && !ended) host.emit('mastery', { item: String(m.item), correct: !!m.correct, firstTry: !!m.firstTry });
      else if (m.type === 'progress' && !ended) host.emit('progress', { done: m.done | 0, total: m.total | 0 || total });
      // total = words ATTEMPTED (never-reached words are neither recorded nor counted); 0 attempted -> host.end shows an empty card, no record
      else if (m.type === 'results' && m.mode === 'lesson' && !ended) { ended = true; const n = Math.max(0, m.total | 0), ft = Math.min(n, m.firstTry | 0);
        // Mothabet star rule: El.Learn.starsFor over attempted words, but 3 stars need at least MIN3 attempted words (fewer -> max 2).
        // Passed as res.stars, so the results card and lessonDone (path stars, dashboard) use the same number. 0 attempted -> no record.
        const stars = n ? Math.min(host.learn.starsFor(Math.round(100 * ft / n), n, n), n >= MIN3 ? 3 : 2) : 0;
        host.end({ total: n, done: n, firstTry: ft, planned: m.planned | 0, stars: n ? stars : undefined }); } };
    const onSound = (e) => send({ type: 'sound', on: !!(e.detail && e.detail.on) });
    addEventListener('message', onMsg); addEventListener('el:sound', onSound);
    return { stop() { ended = true; removeEventListener('message', onMsg); removeEventListener('el:sound', onSound); } };
  }
});
