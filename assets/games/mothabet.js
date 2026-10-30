/* Mothabet adapter: the Mothabet game runs in a same-origin frame (play/mothabet/game/) behind the shared game contract.
   One source of truth for learning: El.Learn. The frame posts its stage's word pool; this adapter picks the round with
   host.learn.pick(skill, pool, 10) at host.learn.difficulty(skill), and each word's first attempt becomes host.emit('mastery'),
   which El.Learn records (Leitner box + difficulty). Round end -> host.end, which shows Elearnea's results card (Again / Path).
   Lesson config: {band, stageId, stage}. stageId (e.g. 's1') wins; stage (index) is the fallback. ?qa=1 on the play page is
   forwarded so the frame's QA hook exists only in QA runs. Protocol: see play/mothabet/game/bridge.js and docs/MOTHABET-INTEGRATION.md. */
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
    const send = (m) => { try { f.contentWindow.postMessage(Object.assign({ el: 1, src: 'elearnea' }, m), location.origin); } catch (er) {} };
    const onMsg = (e) => { if (e.origin !== location.origin || e.source !== f.contentWindow || !e.data || e.data.el !== 1 || e.data.src !== 'mothabet') return; const m = e.data;
      if (m.type === 'ready') { try { f.contentWindow.focus(); } catch (er) {}
        if (m.lesson && Array.isArray(m.pool) && m.pool.length) { const words = host.learn.pick(cfg.skill, m.pool.slice(), Math.min(10, m.pool.length), host.rng); total = words.length;
          send({ type: 'start', words, d: host.learn.difficulty(cfg.skill) }); host.emit('progress', { done: 0, total }); } }
      else if (m.type === 'word' && !ended) host.emit('mastery', { item: String(m.item), correct: !!m.correct, firstTry: !!m.firstTry });
      else if (m.type === 'progress' && !ended) host.emit('progress', { done: m.done | 0, total: m.total | 0 || total });
      else if (m.type === 'results' && m.mode === 'lesson' && !ended) { ended = true; host.end({ total: m.total | 0 || total, done: m.words | 0, firstTry: m.firstTry | 0 }); } };
    addEventListener('message', onMsg);
    return { stop() { ended = true; removeEventListener('message', onMsg); } };
  }
});
