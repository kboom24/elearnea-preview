/* Mothabet adapter: the copied Mothabet game runs in a same-origin frame (play/mothabet/game/) behind the same game contract.
   config {band, stage} deep-links a stage; the frame posts its round results, which become mastery + end(results) here. */
El.defineGame({
  id: 'mothabet',
  start(cfg, host) {
    const f = document.createElement('iframe'); f.title = 'Mothabet'; f.allow = 'autoplay';
    f.src = El.url('play/mothabet/game/index.html') + `?band=${encodeURIComponent(cfg.band || 's')}&stage=${cfg.stage | 0}`;
    host.root.innerHTML = ''; host.root.appendChild(f);
    const onMsg = (e) => { if (e.origin !== location.origin || e.source !== f.contentWindow || !e.data || e.data.el !== 1) return; const m = e.data;
      if (m.type === 'ready') { try { f.contentWindow.focus(); } catch (er) {} }
      if (m.type === 'results' && m.mode === 'stage') { host.emit('mastery', { item: m.stageId || ('stage' + m.stage), correct: m.stars > 0, firstTry: m.words > 0 && m.perfect >= Math.ceil(m.words * .8) });
        host.end({ total: m.words, done: m.words, firstTry: m.perfect, stars: m.stars, embedded: true }); } };
    addEventListener('message', onMsg);
    return { stop() { removeEventListener('message', onMsg); } };
  }
});
